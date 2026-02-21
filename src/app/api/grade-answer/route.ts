import { NextRequest, NextResponse } from "next/server";

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

function extractKeyTerms(text: string): Set<string> {
  const stopWords = new Set([
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "is", "are", "was", "were", "be", "been",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "can", "it", "its", "this", "that", "these",
    "those", "not", "no", "all", "also", "any", "some", "such", "than",
    "too", "very", "just", "about", "more", "most", "other", "each",
    "how", "what", "which", "who", "when", "where", "there", "here",
    "then", "so", "if", "as", "into", "through", "during", "before",
    "after", "above", "below", "between", "out", "up", "down", "over",
    "under", "again", "further", "once", "both", "few", "many", "much",
    "own", "same", "only", "even", "back", "well", "also", "use", "used",
    "using", "make", "made", "like", "get", "got", "way",
  ]);

  const words = tokenize(text);
  return new Set(words.filter((w) => !stopWords.has(w) && w.length > 3));
}

function computeScore(
  answer: string,
  context: string,
  conceptLabel: string,
  question: string
): { score: number; feedback: string } {
  const answerTokens = tokenize(answer);

  if (answerTokens.length < 3) {
    return {
      score: 5,
      feedback: "Your answer is too brief. Try to elaborate more on the concept and its significance.",
    };
  }

  const contextTerms = extractKeyTerms(context);
  const questionTerms = extractKeyTerms(question);
  const labelTerms = extractKeyTerms(conceptLabel);
  const allKeyTerms = new Set([...contextTerms, ...questionTerms, ...labelTerms]);

  const answerTerms = extractKeyTerms(answer);

  let keyTermHits = 0;
  for (const term of allKeyTerms) {
    if (answerTerms.has(term)) keyTermHits++;
  }
  const keyTermCoverage = allKeyTerms.size > 0 ? keyTermHits / allKeyTerms.size : 0;

  const mentionsLabel = answer.toLowerCase().includes(conceptLabel.toLowerCase());

  const contextBigrams = new Set<string>();
  const contextWords = tokenize(context);
  for (let i = 0; i < contextWords.length - 1; i++) {
    contextBigrams.add(`${contextWords[i]} ${contextWords[i + 1]}`);
  }
  const answerWords = tokenize(answer);
  let bigramHits = 0;
  for (let i = 0; i < answerWords.length - 1; i++) {
    if (contextBigrams.has(`${answerWords[i]} ${answerWords[i + 1]}`)) {
      bigramHits++;
    }
  }
  const bigramOverlap = contextBigrams.size > 0 ? Math.min(bigramHits / (contextBigrams.size * 0.3), 1) : 0;

  const lengthScore = Math.min(answerTokens.length / 20, 1);

  const hasExplanation =
    answer.toLowerCase().includes("because") ||
    answer.toLowerCase().includes("means") ||
    answer.toLowerCase().includes("refers to") ||
    answer.toLowerCase().includes("involves") ||
    answer.toLowerCase().includes("allows") ||
    answer.toLowerCase().includes("enables") ||
    answer.toLowerCase().includes("for example") ||
    answer.toLowerCase().includes("such as") ||
    answer.toLowerCase().includes("in other words") ||
    answer.toLowerCase().includes("therefore") ||
    answer.toLowerCase().includes("this is");

  let rawScore =
    keyTermCoverage * 40 +
    bigramOverlap * 20 +
    (mentionsLabel ? 10 : 0) +
    lengthScore * 15 +
    (hasExplanation ? 15 : 0);

  rawScore = Math.round(Math.max(5, Math.min(100, rawScore)));

  let feedback: string;
  if (rawScore >= 85) {
    feedback = "Excellent understanding! You've demonstrated strong mastery of this concept with clear, detailed reasoning.";
  } else if (rawScore >= 70) {
    feedback = "Good grasp of the concept. Try to include more specific details from the source material and explain the relationships between ideas.";
  } else if (rawScore >= 50) {
    feedback = "You're on the right track. Consider expanding your answer with more key terms, examples, and deeper explanation of how this concept works.";
  } else if (rawScore >= 30) {
    feedback = "Your answer touches on some aspects but is missing important details. Re-read the context and try to address the question more directly.";
  } else {
    feedback = "Try to engage more deeply with the concept. Review the context provided and think about what makes this concept important and how it connects to related ideas.";
  }

  return { score: rawScore, feedback };
}

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

    const { score, feedback } = computeScore(
      answer.trim(),
      context,
      conceptLabel,
      question
    );

    return NextResponse.json({
      score,
      feedback,
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
