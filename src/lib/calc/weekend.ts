import { rankWithTies } from "./ranking";
import { GameConfig, PlayerRoundSummary, PlayerWeekendSummary } from "./types";

function payoutValueAtRank(rank: number, pot: number): number {
  if (rank === 1) return pot * 0.5;
  if (rank === 2) return pot * 0.3;
  if (rank === 3) return pot * 0.2;
  return 0;
}

/**
 * Rolls up per-round summaries into weekend totals, ranks players by total
 * weekend points (highest wins), and computes payouts/net earnings.
 *
 * The spec doesn't define a tie-break for weekend Total Points (only for
 * within-round Net Score ties) — players fully tied on weekend Total Points
 * split the payout difference evenly across the rank slots they occupy,
 * mirroring the round-level tie-break's "split evenly" approach.
 */
export function calculateWeekend(
  playerIds: string[],
  roundSummariesByRound: PlayerRoundSummary[][],
  config: GameConfig
): PlayerWeekendSummary[] {
  const totals = playerIds.map((playerId) => {
    let totalPoints = 0;
    let totalMoneyOwed = 0;
    let roundsPlayed = 0;

    for (const roundSummaries of roundSummariesByRound) {
      const summary = roundSummaries.find((s) => s.playerId === playerId);
      if (summary) {
        totalPoints += summary.totalPoints;
        totalMoneyOwed += summary.moneyOwed;
        if (summary.holesEntered > 0) roundsPlayed += 1;
      }
    }

    return { playerId, totalPoints, totalMoneyOwed, roundsPlayed };
  });

  const pot =
    config.buyIn * playerIds.length +
    totals.reduce((sum, t) => sum + t.totalMoneyOwed, 0);

  const ranked = rankWithTies(
    totals,
    (a, b) => b.totalPoints - a.totalPoints,
    (rank) => payoutValueAtRank(rank, pot)
  );

  return ranked.map((r) => ({
    playerId: r.item.playerId,
    roundsPlayed: r.item.roundsPlayed,
    totalPoints: r.item.totalPoints,
    totalMoneyOwed: r.item.totalMoneyOwed,
    place: r.rank,
    tied: r.tied,
    payout: r.value,
    netEarnings: r.value - (config.buyIn + r.item.totalMoneyOwed),
  }));
}
