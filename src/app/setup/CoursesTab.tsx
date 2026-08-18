"use client";

import { useAppData } from "@/lib/store/AppDataContext";
import { updateRound, upsertHole } from "@/lib/supabase/data";
import { roundLabel } from "@/lib/supabase/mappers";
import { useEffect, useMemo, useState } from "react";

interface HoleForm {
  holeNumber: number;
  holeHandicap: string;
  holePar: string;
}

export function CoursesTab() {
  const { rounds, holes } = useAppData();
  const sortedRounds = useMemo(
    () => [...rounds].sort((a, b) => a.round_number - b.round_number),
    [rounds]
  );
  const [roundId, setRoundId] = useState<string | null>(null);
  const activeRoundId = roundId ?? sortedRounds[0]?.id ?? null;
  const round = sortedRounds.find((r) => r.id === activeRoundId) ?? null;

  const [courseForm, setCourseForm] = useState({
    courseName: "",
    courseRating: "",
    slopeRating: "",
    coursePar: "",
  });
  const [holeForms, setHoleForms] = useState<HoleForm[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!round) return;
    setCourseForm({
      courseName: round.course_name,
      courseRating: String(round.course_rating),
      slopeRating: String(round.slope_rating),
      coursePar: String(round.course_par),
    });
    const roundHoles = holes
      .filter((h) => h.round_id === round.id)
      .sort((a, b) => a.hole_number - b.hole_number);
    setHoleForms(
      Array.from({ length: 18 }, (_, i) => {
        const n = i + 1;
        const existing = roundHoles.find((h) => h.hole_number === n);
        return {
          holeNumber: n,
          holeHandicap: existing ? String(existing.hole_handicap) : "",
          holePar: existing ? String(existing.hole_par) : "",
        };
      })
    );
    setSaveMsg(null);
  }, [round?.id, holes]); // eslint-disable-line react-hooks/exhaustive-deps

  const handicapValues = holeForms.map((h) => h.holeHandicap).filter((v) => v !== "");
  const duplicateHandicaps = new Set(handicapValues).size !== handicapValues.length;

  function updateHoleForm(n: number, field: "holeHandicap" | "holePar", value: string) {
    setHoleForms((prev) =>
      prev.map((h) => (h.holeNumber === n ? { ...h, [field]: value } : h))
    );
  }

  async function handleSave() {
    if (!round) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      await updateRound(round.id, {
        course_name: courseForm.courseName,
        course_rating: Number(courseForm.courseRating),
        slope_rating: Number(courseForm.slopeRating),
        course_par: Number(courseForm.coursePar),
      });
      await Promise.all(
        holeForms
          .filter((h) => h.holeHandicap !== "" && h.holePar !== "")
          .map((h) =>
            upsertHole({
              round_id: round.id,
              hole_number: h.holeNumber,
              hole_handicap: Number(h.holeHandicap),
              hole_par: Number(h.holePar),
            })
          )
      );
      setSaveMsg("Saved");
    } catch (e) {
      setSaveMsg(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (!round) return <p className="text-sm text-neutral-500">No rounds yet.</p>;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-1 rounded-lg bg-neutral-100 p-1 md:max-w-sm">
        {sortedRounds.map((r) => (
          <button
            key={r.id}
            onClick={() => setRoundId(r.id)}
            className={`flex-1 rounded-md py-1.5 text-sm font-medium ${
              r.id === activeRoundId ? "bg-white shadow text-green-700" : "text-neutral-600"
            }`}
          >
            {roundLabel(r)}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="grid grid-cols-2 gap-2 lg:w-72 lg:shrink-0">
          <label className="col-span-2 flex flex-col gap-1 text-sm">
            Course Name
            <input
              value={courseForm.courseName}
              onChange={(e) => setCourseForm((f) => ({ ...f, courseName: e.target.value }))}
              className="rounded-lg border border-neutral-300 p-2 text-base"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Course Rating
            <input
              type="number"
              step="0.1"
              value={courseForm.courseRating}
              onChange={(e) => setCourseForm((f) => ({ ...f, courseRating: e.target.value }))}
              className="rounded-lg border border-neutral-300 p-2 text-base"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Slope Rating
            <input
              type="number"
              value={courseForm.slopeRating}
              onChange={(e) => setCourseForm((f) => ({ ...f, slopeRating: e.target.value }))}
              className="rounded-lg border border-neutral-300 p-2 text-base"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Par
            <input
              type="number"
              value={courseForm.coursePar}
              onChange={(e) => setCourseForm((f) => ({ ...f, coursePar: e.target.value }))}
              className="rounded-lg border border-neutral-300 p-2 text-base"
            />
          </label>
        </div>

        <div className="flex-1">
          <h2 className="mb-1 text-sm font-semibold">Holes</h2>
          {duplicateHandicaps && (
            <p className="mb-1 text-xs text-orange-600">
              Warning: hole handicap ranks should be unique 1-18.
            </p>
          )}
          <div className="flex flex-col gap-4 lg:flex-row lg:gap-8">
            {[holeForms.slice(0, 9), holeForms.slice(9)].map((column, colIdx) => (
              <div
                key={colIdx}
                className="grid grid-cols-[auto_1fr_1fr] gap-x-2 gap-y-1 text-sm lg:flex-1"
              >
                <div className="text-xs font-semibold uppercase text-neutral-400">Hole</div>
                <div className="text-xs font-semibold uppercase text-neutral-400">Hcp Rank</div>
                <div className="text-xs font-semibold uppercase text-neutral-400">Par</div>
                {column.map((h) => (
                  <div key={h.holeNumber} className="contents">
                    <div className="flex items-center py-0.5">{h.holeNumber}</div>
                    <input
                      type="number"
                      min={1}
                      max={18}
                      value={h.holeHandicap}
                      onChange={(e) => updateHoleForm(h.holeNumber, "holeHandicap", e.target.value)}
                      className="rounded border border-neutral-300 p-1"
                    />
                    <input
                      type="number"
                      min={3}
                      max={6}
                      value={h.holePar}
                      onChange={(e) => updateHoleForm(h.holeNumber, "holePar", e.target.value)}
                      className="rounded border border-neutral-300 p-1"
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {saveMsg && (
        <p className={`text-sm ${saveMsg === "Saved" ? "text-green-700" : "text-red-600"}`}>
          {saveMsg}
        </p>
      )}
      <button
        onClick={handleSave}
        disabled={saving}
        className="rounded-lg bg-green-700 py-3 text-base font-semibold text-white disabled:bg-neutral-300 lg:max-w-xs"
      >
        {saving ? "Saving…" : "Save Course"}
      </button>
    </div>
  );
}
