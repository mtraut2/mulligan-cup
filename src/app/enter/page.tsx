"use client";

import {
  classifyHoleOutcome,
  courseHandicap,
  HOLE_OUTCOME_LABELS,
  HOLE_OUTCOME_STYLES,
  strokesForHole,
} from "@/lib/calc";
import { useAppData } from "@/lib/store/AppDataContext";
import { roundLabel, toCourseDef } from "@/lib/supabase/mappers";
import { upsertHoleScore } from "@/lib/supabase/data";
import { useEffect, useMemo, useState } from "react";

const ALL_PLAYERS = "all";

export default function EnterPage() {
  const { loading, error, players, rounds, holes, groups, groupMembers, holeScores } =
    useAppData();

  const [roundId, setRoundId] = useState<string | null>(null);
  const [groupFilter, setGroupFilter] = useState<string>(ALL_PLAYERS);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [holeNumber, setHoleNumber] = useState(1);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const sortedRounds = useMemo(
    () => [...rounds].sort((a, b) => a.round_number - b.round_number),
    [rounds]
  );

  // Default to the first round once rounds load.
  useEffect(() => {
    if (!roundId && sortedRounds.length > 0) {
      setRoundId(sortedRounds[0].id);
    }
  }, [roundId, sortedRounds]);

  const roundGroups = useMemo(
    () => groups.filter((g) => g.round_id === roundId).sort((a, b) => a.label.localeCompare(b.label)),
    [groups, roundId]
  );

  // Reset the group filter if it no longer applies to the selected round.
  useEffect(() => {
    if (groupFilter !== ALL_PLAYERS && !roundGroups.some((g) => g.id === groupFilter)) {
      setGroupFilter(ALL_PLAYERS);
    }
  }, [roundGroups, groupFilter]);

  const visiblePlayers = useMemo(() => {
    if (groupFilter === ALL_PLAYERS) {
      return [...players].sort((a, b) => a.name.localeCompare(b.name));
    }
    const memberIds = new Set(
      groupMembers.filter((m) => m.group_id === groupFilter).map((m) => m.player_id)
    );
    return players.filter((p) => memberIds.has(p.id)).sort((a, b) => a.name.localeCompare(b.name));
  }, [players, groupMembers, groupFilter]);

  // Default/clear the selected player when the visible list changes.
  useEffect(() => {
    if (playerId && !visiblePlayers.some((p) => p.id === playerId)) {
      setPlayerId(null);
    }
    if (!playerId && visiblePlayers.length > 0) {
      setPlayerId(visiblePlayers[0].id);
    }
  }, [visiblePlayers, playerId]);

  const round = sortedRounds.find((r) => r.id === roundId) ?? null;
  const course = round ? toCourseDef(round, holes) : null;
  const player = players.find((p) => p.id === playerId) ?? null;
  const hole = course?.holes.find((h) => h.holeNumber === holeNumber) ?? null;

  const ch =
    player && course
      ? courseHandicap(player.handicap, course.slopeRating, course.courseRating, course.coursePar)
      : 0;
  const strokes = hole ? strokesForHole(ch, hole.holeHandicap) : 0;

  const playerHoleScores = useMemo(
    () => holeScores.filter((s) => s.round_id === roundId && s.player_id === playerId),
    [holeScores, roundId, playerId]
  );
  const existing = playerHoleScores.find((s) => s.hole_number === holeNumber) ?? null;
  const filledHoleNumbers = new Set(playerHoleScores.map((s) => s.hole_number));

  const [form, setForm] = useState({ score: "", putts: "", lostBalls: "0", ladiesTees: "0" });

  useEffect(() => {
    setForm({
      score: existing ? String(existing.score) : "",
      putts: existing ? String(existing.putts) : "",
      lostBalls: existing ? String(existing.lost_balls) : "0",
      ladiesTees: existing ? String(existing.ladies_tees) : "0",
    });
    setSaveError(null);
  }, [existing?.id, roundId, playerId, holeNumber]); // eslint-disable-line react-hooks/exhaustive-deps

  const scoreNum = Number(form.score);
  const hasValidScore = form.score !== "" && scoreNum > 0;
  const netHoleScore = hasValidScore ? scoreNum - strokes : null;
  const outcome =
    hasValidScore && hole && netHoleScore !== null
      ? classifyHoleOutcome(netHoleScore, hole.holePar)
      : null;

  async function handleSave() {
    if (!roundId || !playerId || !hasValidScore || form.putts === "") return;
    setSaving(true);
    setSaveError(null);
    try {
      await upsertHoleScore({
        round_id: roundId,
        player_id: playerId,
        hole_number: holeNumber,
        score: scoreNum,
        putts: Number(form.putts),
        lost_balls: Number(form.lostBalls || 0),
        ladies_tees: Number(form.ladiesTees || 0),
      });
      if (holeNumber < 18) setHoleNumber(holeNumber + 1);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="p-4 text-center text-neutral-500">Loading…</div>;
  }
  if (error) {
    return <div className="p-4 text-center text-red-600">{error}</div>;
  }
  if (sortedRounds.length === 0) {
    return (
      <div className="p-4 text-center text-neutral-500">
        No rounds set up yet. Add courses in Setup first.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-3">
      <h1 className="px-1 text-lg font-bold">Enter Scores</h1>

      {/* Round selector */}
      <div className="flex gap-1 rounded-lg bg-neutral-100 p-1">
        {sortedRounds.map((r) => (
          <button
            key={r.id}
            onClick={() => setRoundId(r.id)}
            className={`flex-1 rounded-md py-1.5 text-sm font-medium ${
              r.id === roundId ? "bg-white shadow text-green-700" : "text-neutral-600"
            }`}
          >
            {roundLabel(r)}
          </button>
        ))}
      </div>

      {/* Group filter */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setGroupFilter(ALL_PLAYERS)}
          className={`whitespace-nowrap rounded-full border px-3 py-1 text-sm ${
            groupFilter === ALL_PLAYERS
              ? "border-green-600 bg-green-600 text-white"
              : "border-neutral-300 text-neutral-600"
          }`}
        >
          All Players
        </button>
        {roundGroups.map((g) => (
          <button
            key={g.id}
            onClick={() => setGroupFilter(g.id)}
            className={`whitespace-nowrap rounded-full border px-3 py-1 text-sm ${
              groupFilter === g.id
                ? "border-green-600 bg-green-600 text-white"
                : "border-neutral-300 text-neutral-600"
            }`}
          >
            {g.label}
          </button>
        ))}
      </div>

      {/* Player selector */}
      <select
        value={playerId ?? ""}
        onChange={(e) => setPlayerId(e.target.value)}
        className="rounded-lg border border-neutral-300 p-2.5 text-base"
      >
        {visiblePlayers.length === 0 && <option value="">No players</option>}
        {visiblePlayers.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>

      {/* Hole navigator */}
      <div className="grid grid-cols-6 gap-1.5">
        {Array.from({ length: 18 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            onClick={() => setHoleNumber(n)}
            className={`relative rounded-md py-2 text-sm font-medium ${
              n === holeNumber
                ? "bg-green-700 text-white"
                : filledHoleNumbers.has(n)
                ? "bg-green-100 text-green-800"
                : "bg-neutral-100 text-neutral-500"
            }`}
          >
            {n}
          </button>
        ))}
      </div>

      {player && hole && (
        <div className="flex flex-col gap-3 rounded-xl border border-neutral-200 p-3">
          <div className="flex items-center justify-between text-sm text-neutral-500">
            <span>
              Hole {holeNumber} · Par {hole.holePar} · Hcp Rank {hole.holeHandicap}
            </span>
            <span>{player.name}</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-sm">
              Score
              <input
                type="number"
                inputMode="numeric"
                min={1}
                value={form.score}
                onChange={(e) => setForm((f) => ({ ...f, score: e.target.value }))}
                className="rounded-lg border border-neutral-300 p-2.5 text-lg"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Putts
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={form.putts}
                onChange={(e) => setForm((f) => ({ ...f, putts: e.target.value }))}
                className="rounded-lg border border-neutral-300 p-2.5 text-lg"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Lost Balls
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={form.lostBalls}
                onChange={(e) => setForm((f) => ({ ...f, lostBalls: e.target.value }))}
                className="rounded-lg border border-neutral-300 p-2.5 text-lg"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Ladies Tees
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={form.ladiesTees}
                onChange={(e) => setForm((f) => ({ ...f, ladiesTees: e.target.value }))}
                className="rounded-lg border border-neutral-300 p-2.5 text-lg"
              />
            </label>
          </div>

          <div className="flex min-h-8 items-center gap-2">
            {outcome ? (
              <>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${HOLE_OUTCOME_STYLES[outcome]}`}
                >
                  {HOLE_OUTCOME_LABELS[outcome]}
                </span>
                <span className="text-xs text-neutral-500">
                  {strokes > 0 ? `${strokes} stroke${strokes > 1 ? "s" : ""} applied` : "No strokes"}
                </span>
              </>
            ) : (
              <span className="text-xs text-neutral-400">Enter a score to see the outcome</span>
            )}
          </div>

          {saveError && <p className="text-sm text-red-600">{saveError}</p>}

          <button
            onClick={handleSave}
            disabled={!hasValidScore || form.putts === "" || saving}
            className="rounded-lg bg-green-700 py-3 text-base font-semibold text-white disabled:bg-neutral-300"
          >
            {saving ? "Saving…" : holeNumber < 18 ? "Save & Next Hole" : "Save"}
          </button>
        </div>
      )}
    </div>
  );
}
