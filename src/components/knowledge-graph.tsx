"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeMouseHandler,
  BackgroundVariant,
  ConnectionLineType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { motion, AnimatePresence } from "framer-motion";
import { Hexagon } from "lucide-react";
import ConceptNode from "./custom-node";
import type { KnowledgeGraph as KnowledgeGraphType } from "@/types";

interface KnowledgeGraphProps {
  graph: KnowledgeGraphType | null;
  selectedNodeId: string | null;
  onNodeSelect: (nodeId: string | null) => void;
}

const nodeTypes = { concept: ConceptNode };

function buildLayout(graph: KnowledgeGraphType, selectedNodeId: string | null) {
  const count = graph.concepts.length;
  const centerX = 600;
  const centerY = 400;

  const nodes: Node[] = graph.concepts.map((concept, i) => {
    const rings = Math.ceil(count / 6);
    const ring = Math.floor(i / 6);
    const indexInRing = i % 6;
    const nodesInThisRing = Math.min(6, count - ring * 6);
    const angle = (2 * Math.PI * indexInRing) / nodesInThisRing - Math.PI / 2;
    const radius = 180 + ring * 160;

    const x = i === 0 && count > 1 ? centerX : centerX + radius * Math.cos(angle);
    const y = i === 0 && count > 1 ? centerY : centerY + radius * Math.sin(angle);

    return {
      id: concept.id,
      type: "concept",
      position: { x, y },
      data: {
        label: concept.label,
        category: concept.category,
        isSelected: concept.id === selectedNodeId,
        mastery: concept.mastery,
      },
    };
  });

  const edges: Edge[] = graph.relations.map((rel, i) => ({
    id: `edge-${i}`,
    source: rel.source,
    target: rel.target,
    type: "default",
    animated: true,
    style: {
      stroke: "rgba(99, 102, 241, 0.2)",
      strokeWidth: 1.5,
    },
    label: undefined,
  }));

  return { nodes, edges };
}

export function KnowledgeGraphCanvas({
  graph,
  selectedNodeId,
  onNodeSelect,
}: KnowledgeGraphProps) {
  const layout = useMemo(
    () => (graph ? buildLayout(graph, selectedNodeId) : null),
    [graph, selectedNodeId]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(layout?.nodes || []);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layout?.edges || []);

  useEffect(() => {
    if (layout) {
      setNodes(layout.nodes);
      setEdges(layout.edges);
    }
  }, [layout, setNodes, setEdges]);

  const onNodeClick: NodeMouseHandler = useCallback(
    (_, node) => {
      onNodeSelect(node.id);
    },
    [onNodeSelect]
  );

  const onPaneClick = useCallback(() => {
    onNodeSelect(null);
  }, [onNodeSelect]);

  return (
    <div className="h-screen w-screen bg-[#0a0a0a]">
      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/[0.03] blur-[120px]" />
      </div>

      {graph ? (
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          connectionLineType={ConnectionLineType.SmoothStep}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          minZoom={0.3}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
          className="!bg-transparent"
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={24}
            size={1}
            color="rgba(255,255,255,0.03)"
          />
          <Controls
            className="!rounded-xl !border !border-white/[0.06] !bg-[#0a0a0a]/80 !shadow-xl
              [&>button]:!border-white/[0.06] [&>button]:!bg-transparent [&>button]:!text-white/40
              [&>button:hover]:!bg-white/[0.04] [&>button:hover]:!text-white/60"
          />
          <MiniMap
            nodeColor={(node) =>
              (node.data?.mastery as number) >= 85
                ? "rgba(16, 185, 129, 0.6)"
                : node.data?.isSelected
                  ? "rgba(99, 102, 241, 0.6)"
                  : "rgba(255, 255, 255, 0.15)"
            }
            maskColor="rgba(0, 0, 0, 0.85)"
            className="!rounded-xl !border !border-white/[0.06] !bg-[#0a0a0a]/80"
            pannable
            zoomable
          />
        </ReactFlow>
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
              className="text-center"
            >
              <motion.div
                animate={{
                  rotate: [0, 5, -5, 0],
                  scale: [1, 1.05, 1],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="mx-auto mb-6 flex h-20 w-20 items-center justify-center
                  rounded-2xl border border-white/[0.06] bg-white/[0.02]"
              >
                <Hexagon className="h-10 w-10 text-indigo-500/40" />
              </motion.div>
              <h2 className="mb-2 text-lg font-semibold text-white/50">
                The Nexus awaits
              </h2>
              <p className="max-w-xs text-sm text-white/20">
                Upload a PDF above to generate your interactive knowledge graph
              </p>
            </motion.div>
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
