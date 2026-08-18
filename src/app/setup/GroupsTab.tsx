"use client";

import { useAppData } from "@/lib/store/AppDataContext";
import {
  addGroupMember,
  copyGroupsToRound,
  createGroup,
  deleteGroup,
  removeGroupMember,
  updateGroupLabel,
} from "@/lib/supabase/data";
import { roundLabel } from "@/lib/supabase/mappers";
import { useMemo, useState } from "react";

export function GroupsTab({ locked }: { locked: boolean }) {
  const { rounds, groups, groupMembers, players } = useAppData();
  const sortedRounds = useMemo(
    () => [...rounds].sort((a, b) => a.round_number - b.round_number),
    [rounds]
  );
  const [roundId, setRoundId] = useState<string | null>(null);
  const activeRoundId = roundId ?? sortedRounds[0]?.id ?? null;
  const round = sortedRounds.find((r) => r.id === activeRoundId) ?? null;
  const [busy, setBusy] = useState(false);

  const roundGroups = useMemo(
    () =>
      groups
        .filter((g) => g.round_id === activeRoundId)
        .sort((a, b) => a.label.localeCompare(b.label)),
    [groups, activeRoundId]
  );

  const previousRound = round
    ? sortedRounds.find((r) => r.round_number === round.round_number - 1)
    : null;

  async function handleAddGroup() {
    if (!activeRoundId) return;
    const nextLabel = `Group ${roundGroups.length + 1}`;
    await createGroup(activeRoundId, nextLabel);
  }

  async function handleCopyPrevious() {
    if (!previousRound || !activeRoundId) return;
    setBusy(true);
    try {
      await copyGroupsToRound(previousRound.id, activeRoundId);
    } finally {
      setBusy(false);
    }
  }

  const sortedPlayers = [...players].sort((a, b) => a.name.localeCompare(b.name));

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

      {!locked && (
        <div className="flex gap-2 md:max-w-sm">
          <button
            onClick={handleAddGroup}
            className="flex-1 rounded-lg border border-green-700 py-2 text-sm font-semibold text-green-700"
          >
            + Add Group
          </button>
          {previousRound && (
            <button
              onClick={handleCopyPrevious}
              disabled={busy}
              className="flex-1 rounded-lg border border-neutral-300 py-2 text-sm font-medium text-neutral-600"
            >
              Copy {roundLabel(previousRound)}
            </button>
          )}
        </div>
      )}

      <div className="flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:gap-4 xl:grid-cols-3">
        {roundGroups.map((g) => {
          const memberIds = new Set(
            groupMembers.filter((m) => m.group_id === g.id).map((m) => m.player_id)
          );
          return (
            <div key={g.id} className="rounded-xl border border-neutral-200 p-3">
              <div className="mb-2 flex items-center gap-2">
                <input
                  disabled={locked}
                  defaultValue={g.label}
                  onBlur={(e) => {
                    if (e.target.value.trim() && e.target.value !== g.label) {
                      updateGroupLabel(g.id, e.target.value.trim());
                    }
                  }}
                  className="flex-1 rounded-lg border border-neutral-300 p-2 text-sm font-semibold disabled:bg-neutral-100 disabled:text-neutral-400"
                />
                {!locked && (
                  <button
                    onClick={() => deleteGroup(g.id)}
                    className="text-xs text-red-500 underline"
                  >
                    Delete
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {sortedPlayers.map((p) => {
                  const active = memberIds.has(p.id);
                  return (
                    <button
                      key={p.id}
                      disabled={locked}
                      onClick={() =>
                        active ? removeGroupMember(g.id, p.id) : addGroupMember(g.id, p.id)
                      }
                      className={`rounded-full border px-2.5 py-1 text-xs disabled:pointer-events-none ${
                        active
                          ? "border-green-600 bg-green-600 text-white"
                          : "border-neutral-300 text-neutral-500"
                      }`}
                    >
                      {p.name}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
        {roundGroups.length === 0 && (
          <p className="text-sm text-neutral-400">No groups yet for this round.</p>
        )}
      </div>
    </div>
  );
}
