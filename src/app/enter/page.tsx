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
import { PlayerRow } from "@/lib/supabase/types";
import { useEffect, useMemo, useRef, useState } from "react";

const ALL_PLAYERS = "all";

type FieldKey = "score" | "putts" | "lostBalls" | "ladiesTees";
interface EntryForm {
  score: string;
  putts: string;
  lostBalls: string;
  ladiesTees: string;
}
const EMPTY_FORM: EntryForm = { score: "", putts: "", lostBalls: "", ladiesTees: "" };
const FIELD_ORDER: FieldKey[] = ["score", "putts", "lostBalls", "ladiesTees"];
const FIELD_LABELS: Record<FieldKey, string> = {
  score: "Score",
  putts: "Putts",
  lostBalls: "Lost Balls",
  ladiesTees: "Ladies Tees",
};

function isBlank(f: EntryForm): boolean {
  return f.score === "" && f.putts === "" && f.lostBalls === "" && f.ladiesTees === "";
}
function isComplete(f: EntryForm): boolean {
  return f.score !== "" && f.putts !== "" && f.lostBalls !== "" && f.ladiesTees !== "";
}
function missingFields(f: EntryForm): FieldKey[] {
  return FIELD_ORDER.filter((k) => f[k] === "");
}

export default function EnterPage() {
  const { loading, error, players, rounds, holes, groups, groupMembers, holeScores } =
    useAppData();

  const [roundId, setRoundId] = useState<string | null>(null);
  const [groupFilter, setGroupFilter] = useState<string>(ALL_PLAYERS);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [holeNumber, setHoleNumber] = useState(1);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Locally-staged, not-yet-saved field values, keyed by `${roundId}:${playerId}:${holeNumber}`.
  const [staged, setStaged] = useState<Record<string, EntryForm>>({});
  // Holes that have already auto-advanced once for a given round+group, so re-saving an
  // edit to an already-complete hole doesn't advance again.
  const [advancedHoles, setAdvancedHoles] = useState<Set<string>>(new Set());

  const scoreRef = useRef<HTMLInputElement>(null);
  const puttsRef = useRef<HTMLInputElement>(null);
  const lostBallsRef = useRef<HTMLInputElement>(null);
  const ladiesTeesRef = useRef<HTMLInputElement>(null);
  const fieldRefs: Record<FieldKey, React.RefObject<HTMLInputElement>> = {
    score: scoreRef,
    putts: puttsRef,
    lostBalls: lostBallsRef,
    ladiesTees: ladiesTeesRef,
  };

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

  // A specific cart/group is selected -> "group entry" (staged, all-players Save).
  // "All Players" is selected -> a single player entering just their own score.
  const isGroupMode = groupFilter !== ALL_PLAYERS;

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

  const roundScores = useMemo(
    () => holeScores.filter((s) => s.round_id === roundId),
    [holeScores, roundId]
  );
  const scoreLookup = useMemo(() => {
    const m = new Map<string, (typeof roundScores)[number]>();
    for (const s of roundScores) m.set(`${s.player_id}:${s.hole_number}`, s);
    return m;
  }, [roundScores]);

  function formKey(pid: string, hn: number): string {
    return `${roundId}:${pid}:${hn}`;
  }

  function effectiveForm(pid: string, hn: number): EntryForm {
    const key = formKey(pid, hn);
    if (staged[key]) return staged[key];
    const existing = scoreLookup.get(`${pid}:${hn}`);
    if (existing) {
      return {
        score: String(existing.score),
        putts: String(existing.putts),
        lostBalls: String(existing.lost_balls),
        ladiesTees: String(existing.ladies_tees),
      };
    }
    return EMPTY_FORM;
  }

  const playerHoleScores = useMemo(
    () => roundScores.filter((s) => s.player_id === playerId),
    [roundScores, playerId]
  );
  const filledHoleNumbers = new Set(playerHoleScores.map((s) => s.hole_number));

  const currentForm = playerId ? effectiveForm(playerId, holeNumber) : EMPTY_FORM;

  const scoreNum = Number(currentForm.score);
  const hasValidScore = currentForm.score !== "" && scoreNum > 0;
  const strokes =
    player && course && hole
      ? strokesForHole(
          courseHandicap(player.handicap, course.slopeRating, course.courseRating, course.coursePar),
          hole.holeHandicap
        )
      : 0;
  const netHoleScore = hasValidScore ? scoreNum - strokes : null;
  const outcome =
    hasValidScore && hole && netHoleScore !== null
      ? classifyHoleOutcome(netHoleScore, hole.holePar)
      : null;

  function updateField(key: FieldKey, rawValue: string) {
    if (!playerId) return;
    const digits = rawValue.replace(/[^0-9]/g, "");
    const key_ = formKey(playerId, holeNumber);
    const base = effectiveForm(playerId, holeNumber);
    const next: EntryForm = { ...base, [key]: digits };
    setStaged((prev) => ({ ...prev, [key_]: next }));
    setSaveError(null);

    // Single-digit auto-advance within this player's row (PIN-style). A field that already
    // has 2+ digits stops auto-advancing so the scorer can finish typing a 2-digit value.
    if (digits.length === 1) {
      const idx = FIELD_ORDER.indexOf(key);
      const next_ = FIELD_ORDER[idx + 1];
      if (next_) fieldRefs[next_].current?.focus();
    }
  }

  function handleFieldFocus(e: React.FocusEvent<HTMLInputElement>) {
    const el = e.target;
    // Give the on-screen keyboard time to animate in before scrolling the field into view,
    // so the active field stays visible above it without a jarring scroll jump.
    setTimeout(() => {
      el.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 150);
  }

  function gotoPlayer(delta: number) {
    if (visiblePlayers.length === 0) return;
    const idx = visiblePlayers.findIndex((p) => p.id === playerId);
    const nextIdx = (idx + delta + visiblePlayers.length) % visiblePlayers.length;
    setPlayerId(visiblePlayers[nextIdx].id);
    setSaveError(null);
  }

  async function handleSingleSave() {
    if (!roundId || !playerId) return;
    const f = effectiveForm(playerId, holeNumber);
    const missing = missingFields(f);
    if (missing.length > 0 || Number(f.score) <= 0) {
      setSaveError(
        `Missing: ${(missing.length > 0 ? missing : (["score"] as FieldKey[]))
          .map((k) => FIELD_LABELS[k])
          .join(", ")}`
      );
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      await upsertHoleScore({
        round_id: roundId,
        player_id: playerId,
        hole_number: holeNumber,
        score: Number(f.score),
        putts: Number(f.putts),
        lost_balls: Number(f.lostBalls),
        ladies_tees: Number(f.ladiesTees),
      });
      if (holeNumber < 18) setHoleNumber(holeNumber + 1);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleGroupSave() {
    if (!roundId) return;
    setSaveError(null);

    const invalid: { player: PlayerRow; missing: FieldKey[] }[] = [];
    const toSave: { player: PlayerRow; form: EntryForm }[] = [];

    for (const p of visiblePlayers) {
      const f = effectiveForm(p.id, holeNumber);
      if (isBlank(f)) continue;
      const missing = missingFields(f);
      if (missing.length > 0) {
        invalid.push({ player: p, missing });
      } else {
        toSave.push({ player: p, form: f });
      }
    }

    if (invalid.length > 0) {
      setSaveError(
        invalid
          .map((i) => `${i.player.name}: missing ${i.missing.map((k) => FIELD_LABELS[k]).join(", ")}`)
          .join(" · ")
      );
      return;
    }
    if (toSave.length === 0) return;

    setSaving(true);
    try {
      await Promise.all(
        toSave.map(({ player: p, form: f }) =>
          upsertHoleScore({
            round_id: roundId,
            player_id: p.id,
            hole_number: holeNumber,
            score: Number(f.score),
            putts: Number(f.putts),
            lost_balls: Number(f.lostBalls),
            ladies_tees: Number(f.ladiesTees),
          })
        )
      );

      const allComplete =
        visiblePlayers.length > 0 &&
        visiblePlayers.every((p) => isComplete(effectiveForm(p.id, holeNumber)));
      const advanceKey = `${roundId}:${groupFilter}:${holeNumber}`;
      if (allComplete && !advancedHoles.has(advanceKey)) {
        setAdvancedHoles((prev) => new Set(prev).add(advanceKey));
        if (holeNumber < 18) setHoleNumber(holeNumber + 1);
      }
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

  const singleSaveDisabled = saving || !isComplete(currentForm) || !hasValidScore;

  return (
    <div className="flex flex-col gap-3 p-3 md:mx-auto md:w-full md:max-w-lg md:rounded-2xl md:border md:border-neutral-200 md:bg-white md:p-6 md:shadow-sm lg:mt-6">
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

      {/* Player switcher */}
      <div className="sticky top-0 z-10 -mx-3 bg-white px-3 pb-2 pt-1 md:-mx-6 md:px-6">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => gotoPlayer(-1)}
            disabled={visiblePlayers.length < 2}
            aria-label="Previous player"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xl text-neutral-600 disabled:opacity-30"
          >
            ‹
          </button>
          <span className="flex-1 truncate text-center text-2xl font-bold text-neutral-900">
            {player ? player.name : "No players"}
          </span>
          <button
            type="button"
            onClick={() => gotoPlayer(1)}
            disabled={visiblePlayers.length < 2}
            aria-label="Next player"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xl text-neutral-600 disabled:opacity-30"
          >
            ›
          </button>
        </div>

        {isGroupMode && visiblePlayers.length > 0 && (
          <div className="mt-2 flex justify-center gap-1.5">
            {visiblePlayers.map((p) => {
              const f = effectiveForm(p.id, holeNumber);
              const status = isBlank(f) ? "empty" : isComplete(f) ? "complete" : "partial";
              const active = p.id === playerId;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPlayerId(p.id)}
                  title={p.name}
                  aria-label={p.name}
                  className={`h-2.5 w-2.5 rounded-full ${
                    status === "complete"
                      ? "bg-green-600"
                      : status === "partial"
                      ? "bg-amber-500"
                      : "bg-neutral-300"
                  } ${active ? "ring-2 ring-offset-1 ring-neutral-400" : ""}`}
                />
              );
            })}
          </div>
        )}
      </div>

      {player && hole && (
        <div className="flex flex-col gap-3 rounded-xl border border-neutral-200 p-3">
          <div className="flex items-center justify-between text-sm text-neutral-500">
            <span>
              Hole {holeNumber} · Par {hole.holePar} · Hcp Rank {hole.holeHandicap}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-sm">
              Score
              <input
                ref={scoreRef}
                type="number"
                inputMode="numeric"
                min={1}
                value={currentForm.score}
                onChange={(e) => updateField("score", e.target.value)}
                onFocus={handleFieldFocus}
                className="rounded-lg border border-neutral-300 p-2.5 text-lg"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Putts
              <input
                ref={puttsRef}
                type="number"
                inputMode="numeric"
                min={0}
                value={currentForm.putts}
                onChange={(e) => updateField("putts", e.target.value)}
                onFocus={handleFieldFocus}
                className="rounded-lg border border-neutral-300 p-2.5 text-lg"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Lost Balls
              <input
                ref={lostBallsRef}
                type="number"
                inputMode="numeric"
                min={0}
                value={currentForm.lostBalls}
                onChange={(e) => updateField("lostBalls", e.target.value)}
                onFocus={handleFieldFocus}
                className="rounded-lg border border-neutral-300 p-2.5 text-lg"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Ladies Tees
              <input
                ref={ladiesTeesRef}
                type="number"
                inputMode="numeric"
                min={0}
                value={currentForm.ladiesTees}
                onChange={(e) => updateField("ladiesTees", e.target.value)}
                onFocus={handleFieldFocus}
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

          {isGroupMode ? (
            <>
              <button
                onClick={handleGroupSave}
                disabled={saving}
                className="rounded-lg bg-green-700 py-3 text-base font-semibold text-white disabled:bg-neutral-300"
              >
                {saving ? "Saving…" : "Save"}
              </button>
              <p className="text-center text-[11px] text-neutral-400">
                Saves everyone&apos;s entered scores for this hole. Moves to the next hole once
                the whole group is complete.
              </p>
            </>
          ) : (
            <button
              onClick={handleSingleSave}
              disabled={singleSaveDisabled}
              className="rounded-lg bg-green-700 py-3 text-base font-semibold text-white disabled:bg-neutral-300"
            >
              {saving ? "Saving…" : holeNumber < 18 ? "Save & Next Hole" : "Save"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
