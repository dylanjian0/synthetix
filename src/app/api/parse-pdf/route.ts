import { NextRequest } from "next/server";
import { extractText } from "unpdf";
import { generateKnowledgeGraphStream } from "@/lib/graph-generator";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return new Response(
        JSON.stringify({ error: "No file provided" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return new Response(
        JSON.stringify({ error: "Only PDF files are supported" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);
    const { text: pages } = await extractText(uint8);
    const text = pages.join("\n\n");

    if (!text || text.trim().length < 50) {
      return new Response(
        JSON.stringify({ error: "PDF appears to be empty or contains too little text" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ progress: 2, stage: "Extracting text..." })}\n\n`)
          );

          const generator = generateKnowledgeGraphStream(text, file.name);

          for await (const update of generator) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(update)}\n\n`)
            );
          }

          controller.close();
        } catch (error) {
          console.error("Stream error:", error);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: "Failed to generate knowledge graph" })}\n\n`
            )
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("PDF parsing error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to parse PDF. The file may be corrupted or password-protected." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
