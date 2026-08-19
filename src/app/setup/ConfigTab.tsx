"use client";

import { placementPointDefaultForRank } from "@/lib/calc";
import { useAppData } from "@/lib/store/AppDataContext";
import { updateGameConfig } from "@/lib/supabase/data";
import { GameConfigRow } from "@/lib/supabase/types";
import { useEffect, useState } from "react";

type NumericField = Exclude<
  keyof GameConfigRow,
  "id" | "updated_at" | "admin_passcode" | "placement_points" | "totals_visible"
>;

const GOLF_FIELDS: { key: NumericField; label: string }[] = [
  { key: "golf_eagle", label: "Eagle" },
  { key: "golf_birdie", label: "Birdie" },
  { key: "golf_par", label: "Par" },
  { key: "golf_bogey", label: "Bogey" },
  { key: "golf_zero_putt", label: "Zero Putts" },
  { key: "golf_one_putt", label: "One Putt" },
];
const MONEY_FIELDS: { key: NumericField; label: string }[] = [
  { key: "money_three_putt", label: "Three Putts" },
  { key: "money_lost_ball", label: "Lost Ball" },
  { key: "money_ladies_tee", label: "Ladies Tee" },
  { key: "money_triple_plus", label: "Triple Bogey+" },
];

function ordinal(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

export function ConfigTab({ locked }: { locked: boolean }) {
  const { gameConfig, players } = useAppData();
  const [form, setForm] = useState<Record<string, string>>({});
  const [placements, setPlacements] = useState<string[]>([]);
  const [passcode, setPasscode] = useState("");
  const [totalsVisible, setTotalsVisible] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!gameConfig) return;
    const next: Record<string, string> = {};
    for (const f of [...GOLF_FIELDS, ...MONEY_FIELDS]) {
      next[f.key] = String(gameConfig[f.key]);
    }
    next.buy_in = String(gameConfig.buy_in);
    setForm(next);
    setPasscode(gameConfig.admin_passcode);
    setTotalsVisible(gameConfig.totals_visible ?? true);

    const saved = gameConfig.placement_points ?? [];
    const resized = Array.from({ length: players.length }, (_, i) =>
      saved[i] ?? placementPointDefaultForRank(i + 1)
    );
    setPlacements(resized.map(String));
  }, [gameConfig, players.length]);

  function updatePlacement(index: number, value: string) {
    setPlacements((prev) => prev.map((v, i) => (i === index ? value : v)));
  }

  async function handleSave() {
    setSaving(true);
    setSaveMsg(null);
    try {
      const updates: Partial<Omit<GameConfigRow, "id" | "updated_at">> = {
        admin_passcode: passcode,
        placement_points: placements.map(Number),
        totals_visible: totalsVisible,
      };
      for (const f of [...GOLF_FIELDS, ...MONEY_FIELDS]) {
        (updates as Record<string, number>)[f.key] = Number(form[f.key]);
      }
      updates.buy_in = Number(form.buy_in);
      await updateGameConfig(updates);
      setSaveMsg("Saved");
    } catch (e) {
      setSaveMsg(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (!gameConfig) return null;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:gap-8">
      <section className="lg:flex-1">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-green-700">Points</h2>

        <div className="mb-4">
          <h3 className="mb-1 text-sm font-semibold">Golf Points</h3>
          <div className="grid grid-cols-2 gap-2">
            {GOLF_FIELDS.map((f) => (
              <label key={f.key} className="flex items-center justify-between gap-2 text-sm">
                {f.label}
                <input
                  disabled={locked}
                  type="number"
                  step="0.5"
                  value={form[f.key] ?? ""}
                  onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                  className="w-16 rounded-lg border border-neutral-300 p-1.5 text-right disabled:bg-neutral-100 disabled:text-neutral-400"
                />
              </label>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-1 flex items-baseline justify-between">
            <h3 className="text-sm font-semibold">Placement Points</h3>
            {placements.length > 0 && (
              <span className="text-[11px] text-neutral-400">default — edit as needed</span>
            )}
          </div>
          {players.length === 0 ? (
            <p className="text-xs text-neutral-400">
              Add players in the Players tab to configure placement points.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {placements.map((value, i) => (
                <label key={i} className="flex items-center justify-between gap-2 text-sm">
                  {ordinal(i + 1)} Place
                  <input
                    disabled={locked}
                    type="number"
                    step="1"
                    value={value}
                    onChange={(e) => updatePlacement(i, e.target.value)}
                    className="w-16 rounded-lg border border-neutral-300 p-1.5 text-right disabled:bg-neutral-100 disabled:text-neutral-400"
                  />
                </label>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="lg:flex-1">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-green-700">Money</h2>

        <div className="mb-4">
          <h3 className="mb-1 text-sm font-semibold">Buy-in</h3>
          <label className="flex items-center justify-between gap-2 text-sm">
            Per player, for the weekend
            <span className="flex items-center gap-1">
              <span className="text-neutral-400">$</span>
              <input
                disabled={locked}
                type="number"
                step="1"
                value={form.buy_in ?? ""}
                onChange={(e) => setForm((prev) => ({ ...prev, buy_in: e.target.value }))}
                className="w-16 rounded-lg border border-neutral-300 p-1.5 text-right disabled:bg-neutral-100 disabled:text-neutral-400"
              />
            </span>
          </label>
        </div>

        <div>
          <h3 className="mb-1 text-sm font-semibold">Money Owed</h3>
          <div className="grid grid-cols-2 gap-2">
            {MONEY_FIELDS.map((f) => (
              <label key={f.key} className="flex items-center justify-between gap-2 text-sm">
                {f.label}
                <span className="flex items-center gap-1">
                  <span className="text-neutral-400">$</span>
                  <input
                    disabled={locked}
                    type="number"
                    step="0.5"
                    value={form[f.key] ?? ""}
                    onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                    className="w-16 rounded-lg border border-neutral-300 p-1.5 text-right disabled:bg-neutral-100 disabled:text-neutral-400"
                  />
                </span>
              </label>
            ))}
          </div>
        </div>
      </section>
      </div>

      <div className="lg:max-w-md">
        <h2 className="mb-1 text-sm font-semibold">Results Visibility</h2>
        <label className="flex items-center justify-between gap-2 rounded-lg border border-neutral-200 p-2.5 text-sm">
          <span className="text-neutral-600">
            {totalsVisible
              ? "Everyone can see every group's live scores on Enter Scores, full Round results, and Totals."
              : "Enter Scores is limited to each player's own group; Round results and Totals are hidden. Turn this on for the reveal."}
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={totalsVisible}
            disabled={locked}
            onClick={() => setTotalsVisible((v) => !v)}
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
              totalsVisible ? "bg-green-700" : "bg-neutral-300"
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                totalsVisible ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
        </label>
      </div>

      <div className="lg:max-w-md">
        <h2 className="mb-1 text-sm font-semibold">Admin Passcode</h2>
        {locked ? (
          <p className="rounded-lg border border-neutral-200 bg-neutral-100 p-2 text-sm text-neutral-400">
            🔒 Hidden while locked — unlock to view or edit.
          </p>
        ) : (
          <input
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 p-2 text-sm"
          />
        )}
      </div>

      {saveMsg && (
        <p className={`text-sm ${saveMsg === "Saved" ? "text-green-700" : "text-red-600"}`}>
          {saveMsg}
        </p>
      )}
      {!locked && (
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-green-700 py-3 text-base font-semibold text-white disabled:bg-neutral-300"
        >
          {saving ? "Saving…" : "Save Scoring Rules"}
        </button>
      )}
    </div>
  );
}
