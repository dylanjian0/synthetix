import { KnowledgeGraph, KnowledgeConcept, KnowledgeRelation } from "@/types";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface AIConcept {
  label: string;
  description: string;
  context: string;
  category: string;
  socraticQuestion: string;
}

interface AIRelationship {
  source: string;
  target: string;
  label: string;
  strength: number;
}

function buildSystemPrompt(topicCount: number | null): string {
  const topicInstruction = topicCount
    ? `Identify exactly ${topicCount} meaningful, distinct topics/concepts from the document.`
    : `Identify between 2 and 60 meaningful, distinct topics/concepts from the document. It is critical that you choose the number that is most appropriate for this specific document — a short, focused article might need only 3-8 topics; a textbook chapter might need 15-25; a comprehensive document might warrant 30-50. Do not pad with filler topics or omit important concepts. Let the document's actual content and scope dictate the count.`;

  const countInstruction = topicCount
    ? `Return exactly ${topicCount} concepts.`
    : `Return the number of concepts (between 2 and 60) that best matches the document's scope. Prioritize appropriateness over hitting any particular number.`;

  return `You are an expert educator and knowledge graph builder. Given the full text of a document, you must:

1. ${topicInstruction} These should be real conceptual topics — not random phrases or filler words. Choose topics that a student would need to understand to master this material.

2. For each topic, provide:
   - label: A concise name (2-5 words)
   - description: A one-sentence explanation of this topic as it appears in the document
   - context: The most relevant sentence or passage (verbatim from the document) that explains this topic
   - category: One of "core-concept", "process", "entity", "property", or "example"
   - socraticQuestion: A thought-provoking question that tests deep understanding (not just recall) of this topic. The question should push the student to think critically, make connections, or apply the concept.

3. Separately, provide a "relationships" array describing how topics connect to each other. Each relationship has:
   - source: The exact label of the source topic
   - target: The exact label of the target topic
   - label: A short phrase (2-5 words) describing HOW they relate (e.g. "is a type of", "depends on", "contrasts with", "builds upon", "is applied in", "enables")
   - strength: An integer from 1-10 indicating how closely related they are (10 = inseparable, 1 = loosely related)

   A topic can have relationships with many other topics. Include all meaningful relationships. Only include relationships that genuinely exist in the document's content.

Return valid JSON with this exact structure:
{
  "concepts": [
    {
      "label": "...",
      "description": "...",
      "context": "...",
      "category": "...",
      "socraticQuestion": "..."
    }
  ],
  "relationships": [
    {
      "source": "...",
      "target": "...",
      "label": "...",
      "strength": 8
    }
  ]
}

${countInstruction} No markdown, no explanation — just the JSON object.`;
}

const ESTIMATED_OUTPUT_CHARS = 9000;

export interface GenerateOptions {
  topicCount: number | null;
}

export async function* generateKnowledgeGraphStream(
  text: string,
  filename: string,
  options: GenerateOptions = { topicCount: null }
): AsyncGenerator<{ progress: number; stage: string; graph?: KnowledgeGraph }> {
  const truncated = text.slice(0, 30000);
  const systemPrompt = buildSystemPrompt(options.topicCount);

  yield { progress: 5, stage: "Connecting to AI..." };

  const stream = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Here is the document text:\n\n${truncated}`,
      },
    ],
    temperature: 0.3,
    response_format: { type: "json_object" },
    stream: true,
  });

  let content = "";
  let lastYieldedProgress = 5;

  const estimatedChars = options.topicCount
    ? Math.max(4000, options.topicCount * 500)
    : ESTIMATED_OUTPUT_CHARS;

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content || "";
    content += delta;

    const rawProgress = Math.min(95, (content.length / estimatedChars) * 90 + 5);
    const progress = Math.round(rawProgress);

    if (progress > lastYieldedProgress + 2) {
      lastYieldedProgress = progress;
      yield { progress, stage: "Generating knowledge graph..." };
    }
  }

  yield { progress: 97, stage: "Building graph layout..." };

  if (!content) {
    throw new Error("OpenAI returned an empty response");
  }

  const parsed: { concepts: AIConcept[]; relationships: AIRelationship[] } =
    JSON.parse(content);

  if (!parsed.concepts || parsed.concepts.length === 0) {
    throw new Error("OpenAI returned no concepts");
  }

  const maxConcepts = options.topicCount ?? 60;
  const concepts: KnowledgeConcept[] = parsed.concepts
    .slice(0, maxConcepts)
    .map((c, i) => ({
      id: `node-${i}`,
      label: c.label,
      description: c.description,
      context: c.context.slice(0, 500),
      mastery: 0,
      category: c.category || "core-concept",
      socraticQuestion: c.socraticQuestion,
    }));

  const labelToId = new Map<string, string>();
  for (const c of concepts) {
    labelToId.set(c.label.toLowerCase(), c.id);
  }

  const relations: KnowledgeRelation[] = [];
  const addedEdges = new Set<string>();

  for (const rel of parsed.relationships || []) {
    const sourceId = labelToId.get(rel.source.toLowerCase());
    const targetId = labelToId.get(rel.target.toLowerCase());

    if (sourceId && targetId && sourceId !== targetId) {
      const edgeKey = [sourceId, targetId].sort().join("-");
      if (!addedEdges.has(edgeKey)) {
        addedEdges.add(edgeKey);
        relations.push({
          source: sourceId,
          target: targetId,
          label: rel.label,
          strength: Math.max(1, Math.min(10, rel.strength || 5)),
        });
      }
    }
  }

  if (concepts.length > 1 && relations.length === 0) {
    for (let i = 1; i < concepts.length; i++) {
      relations.push({
        source: concepts[0].id,
        target: concepts[i].id,
        label: "relates to",
        strength: 5,
      });
    }
  }

  const title = filename.replace(/\.pdf$/i, "").replace(/[-_]/g, " ");
  const graph: KnowledgeGraph = { concepts, relations, title };

  yield { progress: 100, stage: "Complete!", graph };
}
