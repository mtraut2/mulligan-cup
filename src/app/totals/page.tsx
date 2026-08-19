"use client";

import { calculateRound, calculateWeekend, PlayerWeekendSummary } from "@/lib/calc";
import { formatMoney, formatSignedMoney } from "@/lib/format";
import { useAppData } from "@/lib/store/AppDataContext";
import { groupScoresByPlayer, toCourseDef, toGameConfig, toPlayerDef } from "@/lib/supabase/mappers";
import { useMemo } from "react";

export default function TotalsPage() {
  const { loading, error, players, rounds, holes, holeScores, gameConfig } = useAppData();

  const sortedRounds = useMemo(
    () => [...rounds].sort((a, b) => a.round_number - b.round_number),
    [rounds]
  );

  const { weekend, pot } = useMemo(() => {
    if (!gameConfig || players.length === 0 || sortedRounds.length === 0) {
      return { weekend: [] as PlayerWeekendSummary[], pot: 0 };
    }
    const config = toGameConfig(gameConfig);
    const playerDefs = players.map(toPlayerDef);

    const roundSummariesByRound = sortedRounds.map((round) => {
      const course = toCourseDef(round, holes);
      const scoresByPlayer = groupScoresByPlayer(
        holeScores.filter((s) => s.round_id === round.id)
      );
      return calculateRound({ players: playerDefs, course, scoresByPlayer, config });
    });

    const weekendSummaries = calculateWeekend(
      playerDefs.map((p) => p.id),
      roundSummariesByRound,
      config
    ).sort((a, b) => a.place - b.place);

    const totalMoneyOwed = weekendSummaries.reduce((sum, w) => sum + w.totalMoneyOwed, 0);
    const potTotal = config.buyIn * playerDefs.length + totalMoneyOwed;

    return { weekend: weekendSummaries, pot: potTotal };
  }, [gameConfig, players, sortedRounds, holes, holeScores]);

  const playerName = (id: string) => players.find((p) => p.id === id)?.name ?? "—";

  if (loading) return <div className="p-4 text-center text-neutral-500">Loading…</div>;
  if (error) return <div className="p-4 text-center text-red-600">{error}</div>;

  if (gameConfig && gameConfig.totals_visible === false) {
    return (
      <div className="flex flex-col gap-3 p-3 md:p-6">
        <h1 className="px-1 text-lg font-bold">Weekend Totals</h1>
        <div className="flex flex-col items-center gap-2 rounded-xl border border-neutral-200 p-8 text-center">
          <span className="text-3xl">🏆</span>
          <p className="text-sm text-neutral-500">
            The winner will be revealed at the closing dinner! 🤫
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-3 md:p-6">
      <h1 className="px-1 text-lg font-bold">Weekend Totals</h1>

      <div className="rounded-xl bg-green-700 p-4 text-white md:max-w-sm">
        <p className="text-xs uppercase tracking-wide text-green-100">Total Pot</p>
        <p className="text-3xl font-bold">{formatMoney(pot)}</p>
        <p className="mt-1 text-xs text-green-100">
          {formatMoney(gameConfig?.buy_in ?? 0)} buy-in × {players.length} players + money owed
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-neutral-200">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-xs uppercase text-neutral-500">
            <tr>
              <th className="px-2 py-2 md:px-4 md:py-3">Place</th>
              <th className="px-2 py-2 md:px-4 md:py-3">Player</th>
              <th className="px-2 py-2 text-right md:px-4 md:py-3">Rounds</th>
              <th className="px-2 py-2 text-right md:px-4 md:py-3">Points</th>
              <th className="px-2 py-2 text-right md:px-4 md:py-3">Owed</th>
              <th className="px-2 py-2 text-right md:px-4 md:py-3">Payout</th>
              <th className="px-2 py-2 text-right md:px-4 md:py-3">Net</th>
            </tr>
          </thead>
          <tbody>
            {weekend.map((w) => (
              <tr key={w.playerId} className="border-t border-neutral-100 hover:bg-neutral-50">
                <td className="px-2 py-2 font-medium md:px-4 md:py-3">
                  {w.tied ? "T-" : ""}
                  {w.place}
                </td>
                <td className="px-2 py-2 md:px-4 md:py-3">{playerName(w.playerId)}</td>
                <td className="px-2 py-2 text-right md:px-4 md:py-3">{w.roundsPlayed}/3</td>
                <td className="px-2 py-2 text-right font-semibold md:px-4 md:py-3">
                  {w.totalPoints}
                </td>
                <td className="px-2 py-2 text-right md:px-4 md:py-3">
                  {formatMoney(w.totalMoneyOwed)}
                </td>
                <td className="px-2 py-2 text-right md:px-4 md:py-3">{formatMoney(w.payout)}</td>
                <td
                  className={`px-2 py-2 text-right font-semibold md:px-4 md:py-3 ${
                    w.netEarnings >= 0 ? "text-green-700" : "text-red-600"
                  }`}
                >
                  {formatSignedMoney(w.netEarnings)}
                </td>
              </tr>
            ))}
            {weekend.length === 0 && (
              <tr>
                <td colSpan={7} className="px-2 py-6 text-center text-neutral-400">
                  No data yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="px-1 text-xs text-neutral-400">
        1st place gets 50% of the pot, 2nd gets 30%, 3rd gets 20%. Net = payout − buy-in − money
        owed.
      </p>
    </div>
  );
}
