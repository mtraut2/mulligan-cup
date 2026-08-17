/**
 * Default Placement Points pattern for a field of `n` players: 1st-4th match
 * the spec's original tiers (16/14/12/10), then descends by 1 per place
 * starting at 9, floored at 1. These are starting values only — every field
 * is admin-editable in Setup, and this same function is the fallback
 * `calculateRound` uses for any rank beyond what's currently saved, so the
 * two never disagree.
 */
export function placementPointDefaultForRank(rank: number): number {
  if (rank === 1) return 16;
  if (rank === 2) return 14;
  if (rank === 3) return 12;
  if (rank === 4) return 10;
  return Math.max(1, 14 - rank);
}

export function defaultPlacementPoints(n: number): number[] {
  return Array.from({ length: n }, (_, i) => placementPointDefaultForRank(i + 1));
}
