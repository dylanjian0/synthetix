import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const GRADING_PROMPT = `You are a fair educator grading a student's answer to a question about a topic they are studying.

You will be given:
- The topic label
- Context from the source material
- The question asked
- The student's answer

Grade the answer on a scale of 0-100 based on:
- Accuracy: Does the answer correctly address the question?
- Understanding: Does it demonstrate they grasp the core concept?
- Relevance: Is the answer on-topic and appropriate?

IMPORTANT: Short answers are acceptable if they are correct and answer the question. Do not penalize brevity if the answer demonstrates understanding. A concise, accurate answer should score well (75-90). Reserve low scores for answers that are incorrect, off-topic, or show fundamental misunderstanding.

Return valid JSON with this exact structure:
{
  "score": <number 0-100>,
  "feedback": "<2-3 sentences of specific, constructive feedback>"
}

Be encouraging. If the answer is correct but brief, acknowledge correctness and gently suggest areas for deeper exploration. No markdown — just JSON.`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { answer, context, conceptLabel, question } = body;

    if (!answer || !context || !conceptLabel || !question) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (typeof answer !== "string" || answer.trim().length === 0) {
      return NextResponse.json(
        { error: "Answer cannot be empty" },
        { status: 400 }
      );
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: GRADING_PROMPT },
        {
          role: "user",
          content: `Topic: ${conceptLabel}\n\nContext from source material:\n${context}\n\nQuestion: ${question}\n\nStudent's answer:\n${answer.trim()}`,
        },
      ],
      temperature: 0.2,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("OpenAI returned an empty response");
    }

    const result: { score: number; feedback: string } = JSON.parse(content);
    const score = Math.max(0, Math.min(100, Math.round(result.score)));

    return NextResponse.json({
      score,
      feedback: result.feedback,
      learned: score >= 85,
    });
  } catch (error) {
    console.error("Grading error:", error);
    return NextResponse.json(
      { error: "Failed to grade answer" },
      { status: 500 }
    );
  }
}
