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
  MarkerType,
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

interface Vec {
  x: number;
  y: number;
}

function forceDirectedLayout(graph: KnowledgeGraphType): Map<string, Vec> {
  const positions = new Map<string, Vec>();
  const count = graph.concepts.length;
  const centerX = 600;
  const centerY = 450;

  for (let i = 0; i < count; i++) {
    const angle = (2 * Math.PI * i) / count;
    const radius = 350;
    positions.set(graph.concepts[i].id, {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    });
  }

  const adjacency = new Map<string, { target: string; strength: number }[]>();
  for (const c of graph.concepts) {
    adjacency.set(c.id, []);
  }
  for (const rel of graph.relations) {
    adjacency.get(rel.source)?.push({ target: rel.target, strength: rel.strength });
    adjacency.get(rel.target)?.push({ target: rel.source, strength: rel.strength });
  }

  const iterations = 300;
  const repulsionStrength = 80000;
  const attractionBase = 0.0008;
  const idealEdgeLength = 200;
  const damping = 0.92;
  const velocities = new Map<string, Vec>();
  for (const c of graph.concepts) {
    velocities.set(c.id, { x: 0, y: 0 });
  }

  for (let iter = 0; iter < iterations; iter++) {
    const temp = 1 - iter / iterations;

    for (let i = 0; i < count; i++) {
      const idA = graph.concepts[i].id;
      const posA = positions.get(idA)!;
      const velA = velocities.get(idA)!;

      for (let j = i + 1; j < count; j++) {
        const idB = graph.concepts[j].id;
        const posB = positions.get(idB)!;

        let dx = posA.x - posB.x;
        let dy = posA.y - posB.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;

        const force = (repulsionStrength * temp) / (dist * dist);
        dx = (dx / dist) * force;
        dy = (dy / dist) * force;

        velA.x += dx;
        velA.y += dy;
        const velB = velocities.get(idB)!;
        velB.x -= dx;
        velB.y -= dy;
      }
    }

    for (const rel of graph.relations) {
      const posA = positions.get(rel.source)!;
      const posB = positions.get(rel.target)!;

      let dx = posB.x - posA.x;
      let dy = posB.y - posA.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;

      const strengthMult = rel.strength / 5;
      const displacement = dist - idealEdgeLength / strengthMult;
      const force = attractionBase * displacement * strengthMult * temp;

      dx = (dx / dist) * force;
      dy = (dy / dist) * force;

      velocities.get(rel.source)!.x += dx;
      velocities.get(rel.source)!.y += dy;
      velocities.get(rel.target)!.x -= dx;
      velocities.get(rel.target)!.y -= dy;
    }

    for (const c of graph.concepts) {
      const vel = velocities.get(c.id)!;
      const pos = positions.get(c.id)!;

      vel.x *= damping;
      vel.y *= damping;

      const maxVel = 10 * temp + 0.5;
      const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y);
      if (speed > maxVel) {
        vel.x = (vel.x / speed) * maxVel;
        vel.y = (vel.y / speed) * maxVel;
      }

      pos.x += vel.x;
      pos.y += vel.y;
    }
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const pos of positions.values()) {
    minX = Math.min(minX, pos.x);
    minY = Math.min(minY, pos.y);
    maxX = Math.max(maxX, pos.x);
    maxY = Math.max(maxY, pos.y);
  }

  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  const targetWidth = 1200;
  const targetHeight = 800;
  const padding = 100;

  for (const pos of positions.values()) {
    pos.x = padding + ((pos.x - minX) / rangeX) * targetWidth;
    pos.y = padding + ((pos.y - minY) / rangeY) * targetHeight;
  }

  return positions;
}

function buildLayout(graph: KnowledgeGraphType, selectedNodeId: string | null) {
  const positions = forceDirectedLayout(graph);

  const nodes: Node[] = graph.concepts.map((concept) => {
    const pos = positions.get(concept.id)!;
    return {
      id: concept.id,
      type: "concept",
      position: { x: pos.x, y: pos.y },
      data: {
        label: concept.label,
        category: concept.category,
        isSelected: concept.id === selectedNodeId,
        mastery: concept.mastery,
      },
    };
  });

  const maxStrength = Math.max(...graph.relations.map((r) => r.strength), 1);

  const edges: Edge[] = graph.relations.map((rel, i) => {
    const normalizedStrength = rel.strength / maxStrength;
    const opacity = 0.1 + normalizedStrength * 0.4;
    const width = 1 + normalizedStrength * 2.5;

    return {
      id: `edge-${i}`,
      source: rel.source,
      target: rel.target,
      type: "default",
      animated: rel.strength >= 7,
      label: rel.label,
      labelStyle: {
        fill: `rgba(199, 210, 254, ${0.3 + normalizedStrength * 0.4})`,
        fontSize: 10,
        fontWeight: rel.strength >= 7 ? 500 : 400,
      },
      labelBgStyle: {
        fill: "rgba(10, 10, 10, 0.8)",
        fillOpacity: 0.8,
      },
      labelBgPadding: [4, 2] as [number, number],
      labelBgBorderRadius: 4,
      style: {
        stroke: `rgba(99, 102, 241, ${opacity})`,
        strokeWidth: width,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: `rgba(99, 102, 241, ${opacity})`,
        width: 12,
        height: 12,
      },
    };
  });

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
