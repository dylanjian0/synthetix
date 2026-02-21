"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  Brain,
  FileText,
  HelpCircle,
  ImageIcon,
  Loader2,
  CheckCircle2,
  Send,
  RotateCcw,
} from "lucide-react";
import { MasteryRing } from "./mastery-ring";
import { Separator } from "@/components/ui/separator";
import type { KnowledgeConcept } from "@/types";

interface GradeResult {
  score: number;
  feedback: string;
  learned: boolean;
}

interface NodeDetailSidebarProps {
  concept: KnowledgeConcept | null;
  onClose: () => void;
  onMasteryUpdate: (nodeId: string, mastery: number) => void;
}

function ScoreBar({ score }: { score: number }) {
  const color =
    score >= 85
      ? "from-emerald-500 to-emerald-400"
      : score >= 70
        ? "from-indigo-500 to-indigo-400"
        : score >= 50
          ? "from-amber-500 to-amber-400"
          : "from-red-500 to-red-400";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-white/40">Score</span>
        <span className="text-sm font-bold text-white/90">{score}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className={`h-full rounded-full bg-gradient-to-r ${color}`}
        />
      </div>
    </div>
  );
}

export function NodeDetailSidebar({
  concept,
  onClose,
  onMasteryUpdate,
}: NodeDetailSidebarProps) {
  const [answerMode, setAnswerMode] = useState(false);
  const [answer, setAnswer] = useState("");
  const [isGrading, setIsGrading] = useState(false);
  const [gradeResult, setGradeResult] = useState<GradeResult | null>(null);

  const resetAnswerState = () => {
    setAnswerMode(false);
    setAnswer("");
    setGradeResult(null);
  };

  const handleSubmitAnswer = async () => {
    if (!concept || !answer.trim()) return;

    setIsGrading(true);
    try {
      const response = await fetch("/api/grade-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answer: answer.trim(),
          context: concept.context,
          conceptLabel: concept.label,
          question: concept.socraticQuestion,
        }),
      });

      if (!response.ok) throw new Error("Grading failed");

      const result: GradeResult = await response.json();
      setGradeResult(result);

      if (result.score > concept.mastery) {
        onMasteryUpdate(concept.id, result.score);
      }
    } catch {
      console.error("Grading error");
    } finally {
      setIsGrading(false);
    }
  };

  const handleRetry = () => {
    setAnswer("");
    setGradeResult(null);
  };

  const masteryLabel =
    concept?.mastery === 0
      ? "Not started"
      : (concept?.mastery ?? 0) < 50
        ? "Learning"
        : (concept?.mastery ?? 0) < 85
          ? "Progressing"
          : "Learned";

  return (
    <AnimatePresence
      mode="wait"
      onExitComplete={resetAnswerState}
    >
      {concept && (
        <motion.aside
          key={concept.id}
          initial={{ x: 420, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 420, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed right-0 top-0 z-50 flex h-screen w-[400px] flex-col
            border-l border-white/[0.06] bg-[#0a0a0a]/95 backdrop-blur-xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-6 pb-4">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                  concept.mastery >= 85
                    ? "bg-emerald-500/15"
                    : "bg-indigo-500/15"
                }`}
              >
                {concept.mastery >= 85 ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                ) : (
                  <Brain className="h-4 w-4 text-indigo-400" />
                )}
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white">{concept.label}</h2>
                <span className="text-[11px] font-medium uppercase tracking-wider text-white/30">
                  {concept.mastery >= 85 ? "learned" : concept.category.replace("-", " ")}
                </span>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-lg
                border border-white/[0.06] bg-white/[0.03] text-white/40
                transition-colors hover:bg-white/[0.06] hover:text-white/60"
            >
              <X className="h-3.5 w-3.5" />
            </motion.button>
          </div>

          <Separator className="bg-white/[0.06]" />

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            {/* Mastery Section */}
            <section>
              <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-white/30">
                <span>Mastery</span>
              </div>
              <div
                className={`flex items-center gap-4 rounded-xl border p-4 ${
                  concept.mastery >= 85
                    ? "border-emerald-500/20 bg-emerald-500/[0.04]"
                    : "border-white/[0.06] bg-white/[0.02]"
                }`}
              >
                <MasteryRing
                  progress={concept.mastery}
                  learned={concept.mastery >= 85}
                />
                <div>
                  <p
                    className={`text-sm font-medium ${
                      concept.mastery >= 85 ? "text-emerald-300" : "text-white/80"
                    }`}
                  >
                    {masteryLabel}
                  </p>
                  <p className="text-[12px] text-white/30">
                    {concept.mastery >= 85
                      ? "You've mastered this concept"
                      : "Answer Socratic questions to increase mastery"}
                  </p>
                </div>
              </div>
            </section>

            {/* Context Section */}
            <section>
              <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-white/30">
                <FileText className="h-3 w-3" />
                <span>Context</span>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                <p className="text-[13px] leading-relaxed text-white/60">
                  &ldquo;{concept.context}&rdquo;
                </p>
              </div>
            </section>

            {/* AI Memory Image */}
            <section>
              <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-white/30">
                <ImageIcon className="h-3 w-3" />
                <span>AI Memory Image</span>
              </div>
              <div
                className="flex h-64 w-64 items-center justify-center rounded-2xl
                  border border-white/[0.06] bg-gradient-to-br from-indigo-500/[0.06] to-purple-500/[0.04]"
              >
                <div className="text-center">
                  <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.04]">
                    <ImageIcon className="h-5 w-5 text-white/20" />
                  </div>
                  <p className="text-[11px] text-white/20">AI-generated mnemonic</p>
                  <p className="text-[10px] text-white/10">Coming soon</p>
                </div>
              </div>
            </section>

            {/* Socratic Question */}
            <section>
              <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-white/30">
                <HelpCircle className="h-3 w-3" />
                <span>Socratic Question</span>
              </div>
              <div className="relative overflow-hidden rounded-xl p-[1px]">
                <div
                  className="absolute inset-0 rounded-xl"
                  style={{
                    background:
                      concept.mastery >= 85
                        ? "linear-gradient(135deg, rgba(16,185,129,0.4), rgba(52,211,153,0.3), rgba(110,231,183,0.2))"
                        : "linear-gradient(135deg, rgba(99,102,241,0.4), rgba(168,85,247,0.4), rgba(236,72,153,0.3))",
                  }}
                />
                <div className="relative rounded-xl bg-[#0a0a0a] p-4">
                  <p className="text-[13px] leading-relaxed text-white/70">
                    {concept.socraticQuestion}
                  </p>

                  <AnimatePresence mode="wait">
                    {!answerMode && !gradeResult && (
                      <motion.button
                        key="start"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setAnswerMode(true)}
                        className={`mt-3 w-full rounded-lg px-3 py-2 text-[12px] font-medium transition-colors ${
                          concept.mastery >= 85
                            ? "bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
                            : "bg-indigo-500/15 text-indigo-300 hover:bg-indigo-500/25"
                        }`}
                      >
                        {concept.mastery >= 85 ? "Answer Again" : "Reflect & Answer"}
                      </motion.button>
                    )}

                    {answerMode && !gradeResult && (
                      <motion.div
                        key="answer"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="mt-3 space-y-2"
                      >
                        <textarea
                          value={answer}
                          onChange={(e) => setAnswer(e.target.value)}
                          placeholder="Type your answer here... Explain the concept in your own words."
                          rows={4}
                          autoFocus
                          className="w-full resize-none rounded-lg border border-white/[0.08]
                            bg-white/[0.03] px-3 py-2.5 text-[13px] leading-relaxed
                            text-white/80 placeholder:text-white/20
                            focus:border-indigo-500/30 focus:outline-none focus:ring-1
                            focus:ring-indigo-500/20"
                        />
                        <div className="flex gap-2">
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setAnswerMode(false)}
                            className="flex-1 rounded-lg border border-white/[0.06]
                              bg-white/[0.02] px-3 py-2 text-[12px] font-medium
                              text-white/40 transition-colors hover:bg-white/[0.04]"
                          >
                            Cancel
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleSubmitAnswer}
                            disabled={!answer.trim() || isGrading}
                            className="flex flex-1 items-center justify-center gap-1.5
                              rounded-lg bg-indigo-500/20 px-3 py-2 text-[12px]
                              font-medium text-indigo-300 transition-colors
                              hover:bg-indigo-500/30 disabled:opacity-40
                              disabled:cursor-not-allowed"
                          >
                            {isGrading ? (
                              <>
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Grading...
                              </>
                            ) : (
                              <>
                                <Send className="h-3 w-3" />
                                Submit
                              </>
                            )}
                          </motion.button>
                        </div>
                      </motion.div>
                    )}

                    {gradeResult && (
                      <motion.div
                        key="result"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-4 space-y-3"
                      >
                        <ScoreBar score={gradeResult.score} />

                        {gradeResult.learned && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.3 }}
                            className="flex items-center gap-2 rounded-lg
                              border border-emerald-500/20 bg-emerald-500/[0.06] p-3"
                          >
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                            <p className="text-[12px] font-medium text-emerald-300">
                              Concept marked as learned!
                            </p>
                          </motion.div>
                        )}

                        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                          <p className="text-[12px] leading-relaxed text-white/50">
                            {gradeResult.feedback}
                          </p>
                        </div>

                        <div className="rounded-lg border border-white/[0.04] bg-white/[0.01] p-3">
                          <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-white/20">
                            Your answer
                          </p>
                          <p className="text-[12px] leading-relaxed text-white/40">
                            {answer}
                          </p>
                        </div>

                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={handleRetry}
                          className="flex w-full items-center justify-center gap-1.5
                            rounded-lg border border-white/[0.06] bg-white/[0.02]
                            px-3 py-2 text-[12px] font-medium text-white/50
                            transition-colors hover:bg-white/[0.04] hover:text-white/70"
                        >
                          <RotateCcw className="h-3 w-3" />
                          Try Again
                        </motion.button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </section>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
