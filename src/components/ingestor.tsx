"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileText, Link2, X, Sparkles, Settings2, ChevronDown } from "lucide-react";

interface IngestorProps {
  onFileUpload: (file: File, topicCount: number | null) => void;
  isProcessing: boolean;
  progress: number;
  stage: string;
}

export function Ingestor({ onFileUpload, isProcessing, progress, stage }: IngestorProps) {
  const [activeTab, setActiveTab] = useState<"pdf" | "youtube">("pdf");
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [topicMode, setTopicMode] = useState<"auto" | "custom">("auto");
  const [customTopicCount, setCustomTopicCount] = useState(15);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getTopicCount = () => (topicMode === "auto" ? null : customTopicCount);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file && file.type === "application/pdf") {
        setFileName(file.name);
        onFileUpload(file, getTopicCount());
      }
    },
    [onFileUpload, topicMode, customTopicCount]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        setFileName(file.name);
        onFileUpload(file, getTopicCount());
      }
    },
    [onFileUpload, topicMode, customTopicCount]
  );

  return (
    <motion.div
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="fixed left-1/2 top-6 z-40 -translate-x-1/2"
    >
      <div
        className="w-[560px] rounded-2xl border border-white/[0.08]
          bg-[#0a0a0a]/80 shadow-2xl shadow-black/40 backdrop-blur-2xl"
      >
        {/* Tab Switcher */}
        <div className="flex items-center justify-between border-b border-white/[0.06] px-3 pt-3 pb-0">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab("pdf")}
              className={`relative rounded-t-lg px-4 py-2 text-[12px] font-medium transition-colors
                ${activeTab === "pdf" ? "text-white" : "text-white/30 hover:text-white/50"}`}
            >
              <div className="flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                Upload PDF
              </div>
              {activeTab === "pdf" && (
                <motion.div
                  layoutId="tab-indicator"
                  className="absolute bottom-0 left-0 right-0 h-[2px] bg-indigo-500"
                />
              )}
            </button>
            <button
              onClick={() => setActiveTab("youtube")}
              className={`relative rounded-t-lg px-4 py-2 text-[12px] font-medium transition-colors
                ${activeTab === "youtube" ? "text-white" : "text-white/30 hover:text-white/50"}`}
            >
              <div className="flex items-center gap-1.5">
                <Link2 className="h-3.5 w-3.5" />
                YouTube URL
              </div>
              {activeTab === "youtube" && (
                <motion.div
                  layoutId="tab-indicator"
                  className="absolute bottom-0 left-0 right-0 h-[2px] bg-indigo-500"
                />
              )}
            </button>
          </div>

          {activeTab === "pdf" && !isProcessing && (
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] transition-colors
                ${showSettings ? "bg-white/[0.06] text-white/60" : "text-white/30 hover:text-white/50"}`}
            >
              <Settings2 className="h-3 w-3" />
              Settings
              <ChevronDown
                className={`h-3 w-3 transition-transform ${showSettings ? "rotate-180" : ""}`}
              />
            </button>
          )}
        </div>

        {/* Settings Panel */}
        <AnimatePresence>
          {showSettings && activeTab === "pdf" && !isProcessing && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-b border-white/[0.06]"
            >
              <div className="px-4 py-3">
                <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-white/30">
                  Number of Topics
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setTopicMode("auto")}
                    className={`flex-1 rounded-lg border px-3 py-2 text-[12px] font-medium transition-all
                      ${
                        topicMode === "auto"
                          ? "border-indigo-500/50 bg-indigo-500/10 text-indigo-300"
                          : "border-white/[0.08] text-white/40 hover:border-white/[0.15] hover:text-white/60"
                      }`}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <Sparkles className="h-3 w-3" />
                      Auto (AI decides)
                    </div>
                    <p className="mt-0.5 text-[10px] opacity-60">8-25 topics based on content</p>
                  </button>
                  <button
                    onClick={() => setTopicMode("custom")}
                    className={`flex-1 rounded-lg border px-3 py-2 text-[12px] font-medium transition-all
                      ${
                        topicMode === "custom"
                          ? "border-indigo-500/50 bg-indigo-500/10 text-indigo-300"
                          : "border-white/[0.08] text-white/40 hover:border-white/[0.15] hover:text-white/60"
                      }`}
                  >
                    Custom
                    <p className="mt-0.5 text-[10px] opacity-60">Choose 3-30 topics</p>
                  </button>
                </div>

                {topicMode === "custom" && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3"
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={3}
                        max={30}
                        value={customTopicCount}
                        onChange={(e) => setCustomTopicCount(parseInt(e.target.value, 10))}
                        className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-white/[0.08]
                          [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5
                          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full
                          [&::-webkit-slider-thumb]:bg-indigo-400 [&::-webkit-slider-thumb]:shadow-lg"
                      />
                      <div className="flex h-8 w-12 items-center justify-center rounded-lg bg-white/[0.06] text-sm font-medium text-white/70">
                        {customTopicCount}
                      </div>
                    </div>
                    <div className="mt-1 flex justify-between text-[10px] text-white/20">
                      <span>3 (focused)</span>
                      <span>30 (comprehensive)</span>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content */}
        <div className="p-4">
          <AnimatePresence mode="wait">
            {activeTab === "pdf" ? (
              <motion.div
                key="pdf"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                {isProcessing ? (
                  <div className="py-6">
                    <div className="flex items-center justify-center gap-3 mb-4">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      >
                        <Sparkles className="h-5 w-5 text-indigo-400" />
                      </motion.div>
                      <div>
                        <p className="text-sm font-medium text-white/80">
                          {stage || "Generating knowledge graph..."}
                        </p>
                        <p className="text-[11px] text-white/30">
                          {fileName}
                        </p>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
                      <motion.div
                        className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-indigo-500 to-indigo-400"
                        initial={{ width: "0%" }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                      />
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                        animate={{ x: ["-100%", "100%"] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                      />
                    </div>

                    {/* Progress percentage */}
                    <div className="mt-2 flex justify-between text-[11px] text-white/30">
                      <span>{progress}%</span>
                      <span>
                        {progress < 10
                          ? "Initializing..."
                          : progress < 50
                            ? "Analyzing document..."
                            : progress < 90
                              ? "Generating topics..."
                              : progress < 100
                                ? "Building graph..."
                                : "Complete!"}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`group flex cursor-pointer flex-col items-center justify-center
                      rounded-xl border border-dashed py-6 transition-all duration-300
                      ${
                        isDragging
                          ? "border-indigo-500/50 bg-indigo-500/[0.06]"
                          : "border-white/[0.08] hover:border-indigo-500/30 hover:bg-white/[0.02]"
                      }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <motion.div
                      animate={isDragging ? { scale: 1.1 } : { scale: 1 }}
                      className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl
                        bg-indigo-500/10 text-indigo-400 transition-colors group-hover:bg-indigo-500/15"
                    >
                      <Upload className="h-5 w-5" />
                    </motion.div>
                    <p className="text-[13px] font-medium text-white/60">
                      {fileName ? fileName : "Drop a PDF here or click to browse"}
                    </p>
                    <p className="mt-1 text-[11px] text-white/25">
                      PDF files up to 50MB
                    </p>
                    {fileName && !isProcessing && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setFileName(null);
                        }}
                        className="mt-2 flex items-center gap-1 text-[11px] text-white/30 hover:text-white/50"
                      >
                        <X className="h-3 w-3" />
                        Clear
                      </button>
                    )}
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="youtube"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="Paste a YouTube URL..."
                    disabled
                    className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.03]
                      px-4 py-2.5 text-[13px] text-white/60 placeholder:text-white/20
                      focus:border-indigo-500/30 focus:outline-none disabled:opacity-50"
                  />
                  <button
                    disabled
                    className="rounded-xl bg-white/[0.05] px-4 py-2.5 text-[12px]
                      font-medium text-white/30"
                  >
                    Coming soon
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
