"use client";

import { useAppData } from "@/lib/store/AppDataContext";
import { deletePlayer, upsertPlayer } from "@/lib/supabase/data";
import { useMemo, useState } from "react";

export function PlayersTab({ locked }: { locked: boolean }) {
  const { players } = useAppData();
  const sortedPlayers = useMemo(
    () => [...players].sort((a, b) => a.name.localeCompare(b.name)),
    [players]
  );
  const [newName, setNewName] = useState("");
  const [newHandicap, setNewHandicap] = useState("");
  const [newPin, setNewPin] = useState("");
  const [adding, setAdding] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true);
    try {
      await upsertPlayer({
        name: newName.trim(),
        handicap: Number(newHandicap || 0),
        pin: newPin.trim() || null,
      });
      setNewName("");
      setNewHandicap("");
      setNewPin("");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-xl border border-neutral-200 p-3 lg:columns-2 lg:gap-6">
        {sortedPlayers.map((p) => (
          <div
            key={p.id}
            className="flex items-center gap-2 border-b border-neutral-100 pb-2 pt-2 first:pt-0 last:border-0 last:pb-0 lg:break-inside-avoid"
          >
            <input
              disabled={locked}
              defaultValue={p.name}
              onBlur={(e) => {
                if (e.target.value.trim() && e.target.value !== p.name) {
                  upsertPlayer({ id: p.id, name: e.target.value.trim(), handicap: p.handicap });
                }
              }}
              className="flex-1 rounded-lg border border-neutral-300 p-2 text-sm disabled:bg-neutral-100 disabled:text-neutral-400"
            />
            <input
              disabled={locked}
              type="number"
              step="0.1"
              defaultValue={p.handicap}
              onBlur={(e) => {
                const v = Number(e.target.value);
                if (!Number.isNaN(v) && v !== p.handicap) {
                  upsertPlayer({ id: p.id, name: p.name, handicap: v });
                }
              }}
              className="w-16 rounded-lg border border-neutral-300 p-2 text-sm disabled:bg-neutral-100 disabled:text-neutral-400"
            />
            {locked ? (
              <span className="w-16 rounded-lg border border-neutral-200 bg-neutral-100 p-2 text-center text-xs text-neutral-400">
                Hidden
              </span>
            ) : (
              <input
                defaultValue={p.pin ?? ""}
                placeholder="PIN"
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v !== (p.pin ?? "")) {
                    upsertPlayer({ id: p.id, name: p.name, handicap: p.handicap, pin: v || null });
                  }
                }}
                className="w-16 rounded-lg border border-neutral-300 p-2 text-center text-sm"
              />
            )}
            {!locked && (
              <button
                onClick={() => deletePlayer(p.id)}
                className="text-xs text-red-500 underline"
              >
                Remove
              </button>
            )}
          </div>
        ))}
        {sortedPlayers.length === 0 && (
          <p className="text-sm text-neutral-400">No players yet.</p>
        )}
      </div>

      {!locked && (
        <form onSubmit={handleAdd} className="flex items-center gap-2 md:max-w-sm">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Name"
            className="flex-1 rounded-lg border border-neutral-300 p-2 text-sm"
          />
          <input
            value={newHandicap}
            onChange={(e) => setNewHandicap(e.target.value)}
            type="number"
            step="0.1"
            placeholder="Hcp"
            className="w-16 rounded-lg border border-neutral-300 p-2 text-sm"
          />
          <input
            value={newPin}
            onChange={(e) => setNewPin(e.target.value)}
            placeholder="PIN"
            className="w-16 rounded-lg border border-neutral-300 p-2 text-center text-sm"
          />
          <button
            type="submit"
            disabled={adding}
            className="rounded-lg bg-green-700 px-3 py-2 text-sm font-semibold text-white disabled:bg-neutral-300"
          >
            Add
          </button>
        </form>
      )}
    </div>
  );
}
