"use client";

import { useAppData } from "@/lib/store/AppDataContext";
import { updateGameConfig } from "@/lib/supabase/data";
import { GameConfigRow } from "@/lib/supabase/types";
import { useEffect, useState } from "react";

type NumericField = Exclude<keyof GameConfigRow, "id" | "updated_at" | "admin_passcode">;

const FIELDS: { key: NumericField; label: string; prefix?: string }[] = [
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
const PLACEMENT_FIELDS: { key: NumericField; label: string }[] = [
  { key: "placement_first", label: "1st Place" },
  { key: "placement_second", label: "2nd Place" },
  { key: "placement_third", label: "3rd Place" },
  { key: "placement_fourth_plus", label: "4th+ Place" },
];

export function ConfigTab() {
  const { gameConfig } = useAppData();
  const [form, setForm] = useState<Record<string, string>>({});
  const [passcode, setPasscode] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!gameConfig) return;
    const next: Record<string, string> = {};
    for (const f of [...FIELDS, ...MONEY_FIELDS, ...PLACEMENT_FIELDS]) {
      next[f.key] = String(gameConfig[f.key]);
    }
    next.buy_in = String(gameConfig.buy_in);
    setForm(next);
    setPasscode(gameConfig.admin_passcode);
  }, [gameConfig]);

  function renderGroup(title: string, fields: { key: NumericField; label: string }[], unit: string) {
    return (
      <div>
        <h2 className="mb-1 text-sm font-semibold">{title}</h2>
        <div className="grid grid-cols-2 gap-2">
          {fields.map((f) => (
            <label key={f.key} className="flex items-center justify-between gap-2 text-sm">
              {f.label}
              <input
                type="number"
                step="0.5"
                value={form[f.key] ?? ""}
                onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                className="w-16 rounded-lg border border-neutral-300 p-1.5 text-right"
              />
            </label>
          ))}
        </div>
        <p className="mt-0.5 text-[11px] text-neutral-400">Values in {unit}</p>
      </div>
    );
  }

  async function handleSave() {
    setSaving(true);
    setSaveMsg(null);
    try {
      const updates: Partial<Omit<GameConfigRow, "id" | "updated_at">> = { admin_passcode: passcode };
      for (const f of [...FIELDS, ...MONEY_FIELDS, ...PLACEMENT_FIELDS]) {
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
    <div className="flex flex-col gap-4">
      {renderGroup("Golf Points", FIELDS, "points")}
      {renderGroup("Money Owed", MONEY_FIELDS, "$")}
      {renderGroup("Placement Points", PLACEMENT_FIELDS, "points")}

      <div>
        <h2 className="mb-1 text-sm font-semibold">Buy-in</h2>
        <label className="flex items-center justify-between gap-2 text-sm">
          Per player, for the weekend
          <input
            type="number"
            step="1"
            value={form.buy_in ?? ""}
            onChange={(e) => setForm((prev) => ({ ...prev, buy_in: e.target.value }))}
            className="w-16 rounded-lg border border-neutral-300 p-1.5 text-right"
          />
        </label>
      </div>

      <div>
        <h2 className="mb-1 text-sm font-semibold">Admin Passcode</h2>
        <input
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          className="w-full rounded-lg border border-neutral-300 p-2 text-sm"
        />
      </div>

      {saveMsg && (
        <p className={`text-sm ${saveMsg === "Saved" ? "text-green-700" : "text-red-600"}`}>
          {saveMsg}
        </p>
      )}
      <button
        onClick={handleSave}
        disabled={saving}
        className="rounded-lg bg-green-700 py-3 text-base font-semibold text-white disabled:bg-neutral-300"
      >
        {saving ? "Saving…" : "Save Scoring Rules"}
      </button>
    </div>
  );
}
