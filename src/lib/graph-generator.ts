import { KnowledgeGraph, KnowledgeConcept, KnowledgeRelation } from "@/types";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface AIConcept {
  label: string;
  description: string;
  context: string;
  category: string;
  socraticQuestion: string;
  relatedTopics: string[];
}

const SYSTEM_PROMPT = `You are an expert educator and knowledge graph builder. Given the full text of a document, you must:

1. Identify exactly 18 meaningful, distinct topics/concepts from the document. These should be real conceptual topics — not random phrases or filler words. Choose topics that a student would need to understand to master this material.

2. For each topic, provide:
   - label: A concise name (2-5 words)
   - description: A one-sentence explanation of this topic as it appears in the document
   - context: The most relevant sentence or passage (verbatim from the document) that explains this topic
   - category: One of "core-concept", "process", "entity", "property", or "example"
   - socraticQuestion: A thought-provoking question that tests deep understanding (not just recall) of this topic. The question should push the student to think critically, make connections, or apply the concept.
   - relatedTopics: An array of labels (from your list of 18) that this topic is closely related to

Return valid JSON with this exact structure:
{
  "concepts": [
    {
      "label": "...",
      "description": "...",
      "context": "...",
      "category": "...",
      "socraticQuestion": "...",
      "relatedTopics": ["...", "..."]
    }
  ]
}

Return exactly 18 concepts. No markdown, no explanation — just the JSON object.`;

export async function generateKnowledgeGraph(
  text: string,
  filename: string
): Promise<KnowledgeGraph> {
  const truncated = text.slice(0, 30000);

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Here is the document text:\n\n${truncated}`,
      },
    ],
    temperature: 0.3,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI returned an empty response");
  }

  const parsed: { concepts: AIConcept[] } = JSON.parse(content);

  if (!parsed.concepts || parsed.concepts.length === 0) {
    throw new Error("OpenAI returned no concepts");
  }

  const concepts: KnowledgeConcept[] = parsed.concepts
    .slice(0, 18)
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

  for (let i = 0; i < parsed.concepts.length && i < 18; i++) {
    const aiConcept = parsed.concepts[i];
    const sourceId = `node-${i}`;

    for (const relatedLabel of aiConcept.relatedTopics || []) {
      const targetId = labelToId.get(relatedLabel.toLowerCase());
      if (targetId && targetId !== sourceId) {
        const edgeKey = [sourceId, targetId].sort().join("-");
        if (!addedEdges.has(edgeKey)) {
          addedEdges.add(edgeKey);
          relations.push({
            source: sourceId,
            target: targetId,
            label: "relates to",
          });
        }
      }
    }
  }

  if (concepts.length > 1 && relations.length === 0) {
    for (let i = 1; i < concepts.length; i++) {
      relations.push({
        source: concepts[0].id,
        target: concepts[i].id,
        label: "relates to",
      });
    }
  }

  const title = filename.replace(/\.pdf$/i, "").replace(/[-_]/g, " ");

  return { concepts, relations, title };
}
