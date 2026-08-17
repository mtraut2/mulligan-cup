import { HoleOutcomeType } from "./types";

/**
 * Classifies a hole outcome from the net (post-handicap) score vs. hole par.
 * Only eagle/birdie/par/bogey earn Golf Points, and only triplePlus incurs
 * Money Owed — a double bogey (diff of +2) intentionally earns neither,
 * matching the spec's tables exactly.
 */
export function classifyHoleOutcome(
  netHoleScore: number,
  holePar: number
): HoleOutcomeType {
  const diff = netHoleScore - holePar;
  if (diff <= -2) return "eagle";
  if (diff === -1) return "birdie";
  if (diff === 0) return "par";
  if (diff === 1) return "bogey";
  if (diff === 2) return "doubleBogey";
  return "triplePlus";
}
