export interface KnowledgeConcept {
  id: string;
  label: string;
  description: string;
  context: string;
  mastery: number;
  category: string;
  socraticQuestion: string;
}

export interface KnowledgeRelation {
  source: string;
  target: string;
  label: string;
}

export interface KnowledgeGraph {
  concepts: KnowledgeConcept[];
  relations: KnowledgeRelation[];
  title: string;
}
