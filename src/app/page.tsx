"use client";

import { useState, useCallback } from "react";
import { KnowledgeGraphCanvas } from "@/components/knowledge-graph";
import { Ingestor } from "@/components/ingestor";
import { NodeDetailSidebar } from "@/components/node-detail-sidebar";
import type { KnowledgeGraph, KnowledgeConcept } from "@/types";

interface ProgressState {
  progress: number;
  stage: string;
}

export default function Home() {
  const [graph, setGraph] = useState<KnowledgeGraph | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressState, setProgressState] = useState<ProgressState>({ progress: 0, stage: "" });

  const selectedConcept: KnowledgeConcept | null =
    graph?.concepts.find((c) => c.id === selectedNodeId) ?? null;

  const learnedCount = graph?.concepts.filter((c) => c.mastery >= 85).length ?? 0;

  const handleFileUpload = useCallback(async (file: File) => {
    setIsProcessing(true);
    setGraph(null);
    setSelectedNodeId(null);
    setProgressState({ progress: 0, stage: "Starting..." });

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/parse-pdf", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to process PDF");
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Failed to read response stream");
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.error) {
                throw new Error(data.error);
              }

              if (data.progress !== undefined) {
                setProgressState({ progress: data.progress, stage: data.stage || "" });
              }

              if (data.graph) {
                setGraph(data.graph);
              }
            } catch (parseError) {
              console.error("Failed to parse SSE data:", parseError);
            }
          }
        }
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert(error instanceof Error ? error.message : "Failed to process PDF");
    } finally {
      setIsProcessing(false);
      setProgressState({ progress: 0, stage: "" });
    }
  }, []);

  const handleMasteryUpdate = useCallback(
    (nodeId: string, mastery: number) => {
      setGraph((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          concepts: prev.concepts.map((c) =>
            c.id === nodeId ? { ...c, mastery: Math.max(c.mastery, mastery) } : c
          ),
        };
      });
    },
    []
  );

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[#0a0a0a]">
      {/* Logo */}
      <div className="fixed left-6 top-6 z-50 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/15">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="h-4 w-4 text-indigo-400"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" />
            <line x1="12" y1="22" x2="12" y2="15.5" />
            <polyline points="22 8.5 12 15.5 2 8.5" />
          </svg>
        </div>
        <span className="text-sm font-semibold tracking-tight text-white/70">
          Synthetix
        </span>
      </div>

      {/* Graph Title */}
      {graph && (
        <div className="fixed right-6 bottom-6 z-50 text-right">
          <p className="text-[11px] font-medium uppercase tracking-wider text-white/20">
            Knowledge Graph
          </p>
          <p className="text-sm font-medium text-white/50">{graph.title}</p>
          <p className="text-[11px] text-white/20">
            {graph.concepts.length} concepts · {graph.relations.length} connections
            {learnedCount > 0 && (
              <span className="text-emerald-400/60">
                {" "}· {learnedCount} learned
              </span>
            )}
          </p>
        </div>
      )}

      <KnowledgeGraphCanvas
        graph={graph}
        selectedNodeId={selectedNodeId}
        onNodeSelect={setSelectedNodeId}
      />

      <Ingestor
        onFileUpload={handleFileUpload}
        isProcessing={isProcessing}
        progress={progressState.progress}
        stage={progressState.stage}
      />

      <NodeDetailSidebar
        concept={selectedConcept}
        onClose={() => setSelectedNodeId(null)}
        onMasteryUpdate={handleMasteryUpdate}
      />
    </main>
  );
}
