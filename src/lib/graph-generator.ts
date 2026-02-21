import { KnowledgeGraph, KnowledgeConcept, KnowledgeRelation } from "@/types";

const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "is", "are", "was", "were", "be", "been",
  "being", "have", "has", "had", "do", "does", "did", "will", "would",
  "could", "should", "may", "might", "shall", "can", "need", "dare",
  "ought", "used", "it", "its", "this", "that", "these", "those",
  "i", "me", "my", "we", "our", "you", "your", "he", "him", "his",
  "she", "her", "they", "them", "their", "what", "which", "who",
  "when", "where", "how", "not", "no", "nor", "as", "if", "then",
  "than", "too", "very", "just", "about", "above", "after", "again",
  "all", "also", "am", "any", "because", "before", "between", "both",
  "each", "few", "more", "most", "other", "over", "own", "same",
  "so", "some", "such", "up", "out", "only", "into", "through",
  "during", "here", "there", "once", "further", "while", "however",
  "although", "though", "since", "until", "unless", "whether",
  "either", "neither", "yet", "still", "already", "often", "never",
  "always", "sometimes", "usually", "many", "much", "well",
  "even", "also", "back", "get", "go", "make", "like", "see",
  "know", "take", "come", "think", "look", "want", "give", "use",
  "find", "tell", "ask", "work", "seem", "feel", "try", "leave",
  "call", "one", "two", "three", "new", "first", "last", "long",
  "great", "little", "right", "old", "big", "high", "small",
  "large", "good", "bad", "different", "important", "said",
  "may", "must", "now", "people", "way", "time", "part",
  "made", "set", "per", "end", "put", "say", "show", "let",
  "include", "includes", "including", "based", "using", "common",
  "type", "types", "involves", "requires", "allows", "performs",
  "well", "known", "used", "called", "given", "without",
]);

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "core-concept": ["definition", "fundamental", "principle", "theory", "concept", "framework", "key", "refers"],
  "process": ["process", "method", "step", "procedure", "algorithm", "workflow", "phase", "technique"],
  "entity": ["system", "component", "structure", "model", "architecture", "module", "layer", "network"],
  "property": ["property", "attribute", "characteristic", "feature", "quality", "aspect", "metric"],
  "example": ["example", "case", "instance", "illustration", "scenario", "application", "such as"],
};

function classifyConcept(term: string, context: string): string {
  const lowerContext = context.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => lowerContext.includes(kw))) {
      return category;
    }
  }
  return "core-concept";
}

function generateSocraticQuestion(term: string, context: string): string {
  const questions = [
    `What would happen if ${term} didn't exist in this context?`,
    `How does ${term} relate to the broader system described here?`,
    `Can you explain ${term} in your own words without looking at the source?`,
    `What assumptions does the concept of ${term} rely on?`,
    `If you had to teach ${term} to someone, what analogy would you use?`,
    `What are the boundary conditions or edge cases of ${term}?`,
    `How might ${term} evolve or change in the future?`,
    `What's the most counterintuitive aspect of ${term}?`,
  ];
  const hash = term.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return questions[hash % questions.length];
}

function extractSentences(text: string): string[] {
  return text
    .replace(/\n+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .filter((s) => s.trim().length > 20);
}

function extractNGrams(text: string, n: number): string[] {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));

  const ngrams: string[] = [];
  for (let i = 0; i <= words.length - n; i++) {
    ngrams.push(words.slice(i, i + n).join(" "));
  }
  return ngrams;
}

function findContextForTerm(term: string, sentences: string[]): string {
  const lowerTerm = term.toLowerCase();
  for (const sentence of sentences) {
    if (sentence.toLowerCase().includes(lowerTerm)) {
      return sentence.trim().slice(0, 300);
    }
  }
  return sentences[0]?.trim().slice(0, 300) || "";
}

export function generateKnowledgeGraph(text: string, filename: string): KnowledgeGraph {
  const sentences = extractSentences(text);
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 50);

  const unigramFreq = new Map<string, number>();
  const bigramFreq = new Map<string, number>();

  for (const para of paragraphs) {
    const unigrams = extractNGrams(para, 1);
    const bigrams = extractNGrams(para, 2);

    for (const term of unigrams) {
      unigramFreq.set(term, (unigramFreq.get(term) || 0) + 1);
    }
    for (const term of bigrams) {
      bigramFreq.set(term, (bigramFreq.get(term) || 0) + 1);
    }
  }

  const normalizedText = text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ");
  const selectedBigrams = [...bigramFreq.entries()]
    .filter(([bigram, freq]) => {
      if (freq < 2) return false;
      return normalizedText.includes(bigram);
    })
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);

  const bigramWords = new Set<string>();
  for (const [bigram] of selectedBigrams) {
    for (const word of bigram.split(" ")) {
      bigramWords.add(word);
    }
  }

  const selectedUnigrams = [...unigramFreq.entries()]
    .filter(([term, freq]) => freq >= 3 && term.length > 3 && !bigramWords.has(term))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const allTerms = [
    ...selectedBigrams.map(([term]) => term),
    ...selectedUnigrams.map(([term]) => term),
  ].slice(0, 18);

  const titleCase = (s: string) =>
    s
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

  const concepts: KnowledgeConcept[] = allTerms.map((term, i) => {
    const context = findContextForTerm(term, sentences);
    const category = classifyConcept(term, context);
    const freq = bigramFreq.get(term) || unigramFreq.get(term) || 0;
    return {
      id: `node-${i}`,
      label: titleCase(term),
      description: `Key concept extracted from the document with ${freq} occurrences.`,
      context,
      mastery: 0,
      category,
      socraticQuestion: generateSocraticQuestion(titleCase(term), context),
    };
  });

  const relations: KnowledgeRelation[] = [];
  const addedEdges = new Set<string>();

  for (const para of paragraphs) {
    const lowerPara = para.toLowerCase();
    const presentTerms = allTerms.filter((t) => lowerPara.includes(t));

    for (let i = 0; i < presentTerms.length; i++) {
      for (let j = i + 1; j < presentTerms.length; j++) {
        const sourceIdx = allTerms.indexOf(presentTerms[i]);
        const targetIdx = allTerms.indexOf(presentTerms[j]);
        const edgeKey = `${Math.min(sourceIdx, targetIdx)}-${Math.max(sourceIdx, targetIdx)}`;

        if (!addedEdges.has(edgeKey) && relations.length < 30) {
          addedEdges.add(edgeKey);
          relations.push({
            source: `node-${sourceIdx}`,
            target: `node-${targetIdx}`,
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
