"use client";

import { calculateRound, PlayerRoundSummary } from "@/lib/calc";
import { useAppData } from "@/lib/store/AppDataContext";
import { groupScoresByPlayer, toCourseDef, toGameConfig, toPlayerDef } from "@/lib/supabase/mappers";
import { Fragment, useMemo, useState } from "react";

export default function RoundPage() {
  const { loading, error, players, rounds, holes, holeScores, gameConfig } = useAppData();
  const [roundId, setRoundId] = useState<string | null>(null);
  const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null);

  const sortedRounds = useMemo(
    () => [...rounds].sort((a, b) => a.round_number - b.round_number),
    [rounds]
  );
  const activeRoundId = roundId ?? sortedRounds[0]?.id ?? null;
  const round = sortedRounds.find((r) => r.id === activeRoundId) ?? null;

  const summaries: PlayerRoundSummary[] = useMemo(() => {
    if (!round || !gameConfig || players.length === 0) return [];
    const course = toCourseDef(round, holes);
    const scoresByPlayer = groupScoresByPlayer(
      holeScores.filter((s) => s.round_id === round.id)
    );
    return calculateRound({
      players: players.map(toPlayerDef),
      course,
      scoresByPlayer,
      config: toGameConfig(gameConfig),
    })
      .filter((s) => s.holesEntered > 0)
      .sort((a, b) => a.place - b.place);
  }, [round, holes, holeScores, players, gameConfig]);

  const notStartedCount = players.length - summaries.length;

  const playerName = (id: string) => players.find((p) => p.id === id)?.name ?? "—";

  if (loading) return <div className="p-4 text-center text-neutral-500">Loading…</div>;
  if (error) return <div className="p-4 text-center text-red-600">{error}</div>;
  if (sortedRounds.length === 0) {
    return <div className="p-4 text-center text-neutral-500">No rounds set up yet.</div>;
  }

  return (
    <div className="flex flex-col gap-3 p-3">
      <h1 className="px-1 text-lg font-bold">Round Summary</h1>

      <div className="flex gap-1 rounded-lg bg-neutral-100 p-1">
        {sortedRounds.map((r) => (
          <button
            key={r.id}
            onClick={() => setRoundId(r.id)}
            className={`flex-1 rounded-md py-1.5 text-sm font-medium ${
              r.id === activeRoundId ? "bg-white shadow text-green-700" : "text-neutral-600"
            }`}
          >
            Round {r.round_number}
          </button>
        ))}
      </div>

      {round && (
        <p className="px-1 text-sm text-neutral-500">
          {round.course_name} · Par {round.course_par}
          {notStartedCount > 0 && summaries.length > 0 && (
            <span className="text-neutral-400">
              {" "}
              · {notStartedCount} player{notStartedCount > 1 ? "s" : ""} not started
            </span>
          )}
        </p>
      )}

      <div className="overflow-hidden rounded-xl border border-neutral-200">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-xs uppercase text-neutral-500">
            <tr>
              <th className="px-2 py-2">Place</th>
              <th className="px-2 py-2">Player</th>
              <th className="px-2 py-2 text-right">Net</th>
              <th className="px-2 py-2 text-right">Golf</th>
              <th className="px-2 py-2 text-right">Place Pts</th>
              <th className="px-2 py-2 text-right">Total</th>
              <th className="px-2 py-2 text-right">Owed</th>
            </tr>
          </thead>
          <tbody>
            {summaries.map((s) => (
              <Fragment key={s.playerId}>
                <tr
                  onClick={() =>
                    setExpandedPlayerId(expandedPlayerId === s.playerId ? null : s.playerId)
                  }
                  className="cursor-pointer border-t border-neutral-100 active:bg-neutral-50"
                >
                  <td className="px-2 py-2 font-medium">
                    {s.tied ? "T-" : ""}
                    {s.place}
                  </td>
                  <td className="px-2 py-2">{playerName(s.playerId)}</td>
                  <td className="px-2 py-2 text-right">{s.netScore}</td>
                  <td className="px-2 py-2 text-right">{s.golfPoints}</td>
                  <td className="px-2 py-2 text-right">{s.placementPoints}</td>
                  <td className="px-2 py-2 text-right font-semibold">{s.totalPoints}</td>
                  <td className="px-2 py-2 text-right">${s.moneyOwed}</td>
                </tr>
                {expandedPlayerId === s.playerId && (
                  <tr className="border-t border-neutral-100 bg-neutral-50">
                    <td colSpan={7} className="px-3 py-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <h3 className="mb-1 text-xs font-semibold uppercase text-neutral-500">
                            Golf Points
                          </h3>
                          <ul className="flex flex-col gap-0.5 text-xs">
                            {s.golfPointsBreakdown
                              .filter((l) => l.count > 0)
                              .map((l) => (
                                <li key={l.category} className="flex justify-between">
                                  <span>
                                    {l.category} ({l.count} × {l.valueEach})
                                  </span>
                                  <span className="font-medium">{l.subtotal}</span>
                                </li>
                              ))}
                            {s.golfPointsBreakdown.every((l) => l.count === 0) && (
                              <li className="text-neutral-400">None</li>
                            )}
                          </ul>
                        </div>
                        <div>
                          <h3 className="mb-1 text-xs font-semibold uppercase text-neutral-500">
                            Money Owed
                          </h3>
                          <ul className="flex flex-col gap-0.5 text-xs">
                            {s.moneyOwedBreakdown
                              .filter((l) => l.count > 0)
                              .map((l) => (
                                <li key={l.category} className="flex justify-between">
                                  <span>
                                    {l.category} ({l.count} × ${l.valueEach})
                                  </span>
                                  <span className="font-medium">${l.subtotal}</span>
                                </li>
                              ))}
                            {s.moneyOwedBreakdown.every((l) => l.count === 0) && (
                              <li className="text-neutral-400">None</li>
                            )}
                          </ul>
                        </div>
                      </div>
                      <p className="mt-2 text-[11px] text-neutral-400">
                        {s.holesEntered} of 18 holes entered · Course Hcp {s.courseHandicap} ·
                        Playing Hcp {s.playingHandicap}
                      </p>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {summaries.length === 0 && (
              <tr>
                <td colSpan={7} className="px-2 py-6 text-center text-neutral-400">
                  No scores entered yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
