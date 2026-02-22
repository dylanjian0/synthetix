"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { motion } from "framer-motion";
import {
  BookOpen,
  CheckCircle2,
  Cog,
  Layers,
  Lightbulb,
  Sparkles,
} from "lucide-react";

const categoryIcons: Record<string, React.ReactNode> = {
  "core-concept": <Lightbulb className="h-3.5 w-3.5" />,
  process: <Cog className="h-3.5 w-3.5" />,
  entity: <Layers className="h-3.5 w-3.5" />,
  property: <Sparkles className="h-3.5 w-3.5" />,
  example: <BookOpen className="h-3.5 w-3.5" />,
};

interface ConceptNodeData {
  label: string;
  category: string;
  isSelected: boolean;
  mastery: number;
  [key: string]: unknown;
}

function ConceptNode({ data }: NodeProps & { data: ConceptNodeData }) {
  const learned = data.mastery >= 85;
  const icon = learned
    ? <CheckCircle2 className="h-3.5 w-3.5" />
    : (categoryIcons[data.category] || categoryIcons["core-concept"]);

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      whileHover={{ scale: 1.08 }}
      className={`
        group relative cursor-pointer rounded-xl border px-4 py-2.5
        transition-all duration-300
        ${
          learned
            ? "border-emerald-500/40 bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.15)]"
            : data.isSelected
              ? "border-indigo-500/60 bg-indigo-500/15 shadow-[0_0_24px_rgba(99,102,241,0.3)]"
              : "border-white/[0.08] bg-white/[0.04] hover:border-indigo-500/30 hover:bg-white/[0.06]"
        }
      `}
    >
      <Handle
        type="target"
        position={Position.Top}
        className={`!h-1.5 !w-1.5 !border-0 ${
          learned ? "!bg-emerald-500/50" : "!bg-indigo-500/50"
        }`}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="target-left"
        className={`!h-1.5 !w-1.5 !border-0 ${
          learned ? "!bg-emerald-500/50" : "!bg-indigo-500/50"
        }`}
      />
      <div className="flex items-center gap-2">
        <div
          className={`flex h-6 w-6 items-center justify-center rounded-md ${
            learned
              ? "bg-emerald-500/20 text-emerald-400"
              : data.isSelected
                ? "bg-indigo-500/30 text-indigo-300"
                : "bg-white/[0.06] text-white/40 group-hover:text-indigo-400"
          }`}
        >
          {icon}
        </div>
        <span
          className={`text-[13px] font-medium ${
            learned
              ? "text-emerald-200"
              : data.isSelected
                ? "text-white"
                : "text-white/70"
          }`}
        >
          {data.label}
        </span>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className={`!h-1.5 !w-1.5 !border-0 ${
          learned ? "!bg-emerald-500/50" : "!bg-indigo-500/50"
        }`}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="source-right"
        className={`!h-1.5 !w-1.5 !border-0 ${
          learned ? "!bg-emerald-500/50" : "!bg-indigo-500/50"
        }`}
      />
    </motion.div>
  );
}

export default memo(ConceptNode);
