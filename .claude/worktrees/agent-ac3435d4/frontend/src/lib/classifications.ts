/** Colour map for signal classifications — used in EvidenceTable, EvidenceDrawer, SignalFeed */
export const CLASSIFICATION_COLOURS: Record<string, string> = {
  reinforced: "#22c55e",
  stated: "#22c55e",
  softened: "#d97706",
  reframed: "#3b82f6",
  absent: "#dc2626",
  achieved: "#059669",
  retired_transparent: "#6b7280",
  retired_silent: "#dc2626",
};

/**
 * Confidence score colour mapping — editorial quality indicator.
 * Scores reflect evidence quality, not editorial judgment:
 *   9-10: Research-grade (structured data + direct quotes)
 *   7-8:  Strong evidence (clear source, some context)
 *   5-6:  Moderate evidence (inference required)
 *   1-4:  Weak evidence (absence-based or unverified)
 */
export function getConfidenceColor(confidence: number): string {
  if (confidence >= 9) return "#059669";  // emerald-600 — research-grade
  if (confidence >= 7) return "#22c55e";  // green-500 — strong
  if (confidence >= 5) return "#d97706";  // amber-600 — moderate
  return "#dc2626";                        // red-600 — weak
}

export function getConfidenceLabel(confidence: number): string {
  if (confidence >= 9) return "Research-grade";
  if (confidence >= 7) return "Strong";
  if (confidence >= 5) return "Moderate";
  return "Weak";
}
