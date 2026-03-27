export const TIER_COLOURS = {
  Exemplary:   "#16a34a",
  Solid:       "#65a30d",
  Watchlist:   "#d97706",
  Drifting:    "#ea580c",
  Compromised: "#dc2626",
} as const;

export type AccountabilityTier = keyof typeof TIER_COLOURS;

export function tierColour(tier: AccountabilityTier | null | undefined): string {
  if (!tier) return "#94a3b8"; // muted fallback
  return TIER_COLOURS[tier];
}
