"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileText, Loader2, Link2, X } from "lucide-react";

interface IngestorProps {
  onFileUpload: (file: File) => void;
  isProcessing: boolean;
}

export function Ingestor({ onFileUpload, isProcessing }: IngestorProps) {
  const [activeTab, setActiveTab] = useState<"pdf" | "youtube">("pdf");
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file && file.type === "application/pdf") {
        setFileName(file.name);
        onFileUpload(file);
      }
    },
    [onFileUpload]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        setFileName(file.name);
        onFileUpload(file);
      }
    },
    [onFileUpload]
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
        <div className="flex items-center gap-1 border-b border-white/[0.06] px-3 pt-3 pb-0">
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
                  <div className="flex items-center justify-center gap-3 py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-indigo-400" />
                    <div>
                      <p className="text-sm font-medium text-white/80">Generating knowledge graph...</p>
                      <p className="text-[11px] text-white/30">Analyzing {fileName}</p>
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
