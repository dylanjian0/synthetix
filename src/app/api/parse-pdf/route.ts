import { NextRequest, NextResponse } from "next/server";
import { extractText } from "unpdf";
import { generateKnowledgeGraph } from "@/lib/graph-generator";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "Only PDF files are supported" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);
    const { text: pages } = await extractText(uint8);
    const text = pages.join("\n\n");

    if (!text || text.trim().length < 50) {
      return NextResponse.json(
        { error: "PDF appears to be empty or contains too little text" },
        { status: 400 }
      );
    }

    const graph = generateKnowledgeGraph(text, file.name);

    return NextResponse.json({ graph });
  } catch (error) {
    console.error("PDF parsing error:", error);
    return NextResponse.json(
      { error: "Failed to parse PDF. The file may be corrupted or password-protected." },
      { status: 500 }
    );
  }
}
