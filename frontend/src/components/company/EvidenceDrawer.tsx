"use client";
import { motion } from "framer-motion";
import type { Signal } from "@/lib/types";
import { CLASSIFICATION_COLOURS, getConfidenceColor, getConfidenceLabel } from "@/lib/classifications";

interface EvidenceDrawerProps { signals: Signal[]; onClose: () => void; }

export function EvidenceDrawer({ signals, onClose }: EvidenceDrawerProps) {
  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      className="border-t border-border overflow-hidden"
    >
      <div className="p-4 max-h-80 overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Signal History</h4>
          <button onClick={onClose} className="font-mono text-xs text-muted-foreground hover:text-foreground">CLOSE</button>
        </div>
        {signals.length === 0 ? (
          <p className="text-sm text-muted-foreground font-sans">No signals recorded yet.</p>
        ) : (
          <div className="space-y-3">
            {signals.map((signal) => (
              <div key={signal.id} className="flex gap-3 text-sm">
                <span className="font-mono text-xs text-muted-foreground shrink-0 w-20">{signal.signal_date}</span>
                <span
                  className="font-mono text-xs uppercase shrink-0 w-24"
                  style={{ color: CLASSIFICATION_COLOURS[signal.classification] ?? "#6b7280" }}
                >
                  {signal.classification.replace("_", " ")}
                </span>
                <div className="flex-1 min-w-0">
                  {signal.excerpt && (
                    <p className="font-serif italic text-card-foreground text-xs">&ldquo;{signal.excerpt}&rdquo;</p>
                  )}
                  <span
                    className="font-mono text-[0.65rem] inline-flex items-center gap-1"
                    style={{ color: getConfidenceColor(signal.confidence) }}
                    title={getConfidenceLabel(signal.confidence)}
                  >
                    <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getConfidenceColor(signal.confidence) }} />
                    {signal.confidence}/10 {getConfidenceLabel(signal.confidence).toLowerCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
