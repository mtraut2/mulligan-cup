"use client";

import { supabase } from "@/lib/supabase/client";
import {
  fetchAllGroupMembers,
  fetchAllGroups,
  fetchAllHoleScores,
  fetchAllHoles,
  fetchGameConfig,
  fetchPlayers,
  fetchRounds,
} from "@/lib/supabase/data";
import {
  GameConfigRow,
  GroupMemberRow,
  GroupRow,
  HoleRow,
  HoleScoreRow,
  PlayerRow,
  RoundRow,
} from "@/lib/supabase/types";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

interface AppDataState {
  loading: boolean;
  error: string | null;
  players: PlayerRow[];
  rounds: RoundRow[];
  holes: HoleRow[];
  groups: GroupRow[];
  groupMembers: GroupMemberRow[];
  holeScores: HoleScoreRow[];
  gameConfig: GameConfigRow | null;
  refetchAll: () => Promise<void>;
}

const AppDataContext = createContext<AppDataState | null>(null);

function applyRowChange<T extends { id: string }>(
  prev: T[],
  payload: RealtimePostgresChangesPayload<T>
): T[] {
  if (payload.eventType === "DELETE") {
    const oldId = (payload.old as Partial<T>).id;
    return prev.filter((row) => row.id !== oldId);
  }
  const newRow = payload.new as T;
  const idx = prev.findIndex((row) => row.id === newRow.id);
  if (idx === -1) return [...prev, newRow];
  const copy = [...prev];
  copy[idx] = newRow;
  return copy;
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [rounds, setRounds] = useState<RoundRow[]>([]);
  const [holes, setHoles] = useState<HoleRow[]>([]);
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [groupMembers, setGroupMembers] = useState<GroupMemberRow[]>([]);
  const [holeScores, setHoleScores] = useState<HoleScoreRow[]>([]);
  const [gameConfig, setGameConfig] = useState<GameConfigRow | null>(null);

  const refetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, r, h, g, gm, hs, gc] = await Promise.all([
        fetchPlayers(),
        fetchRounds(),
        fetchAllHoles(),
        fetchAllGroups(),
        fetchAllGroupMembers(),
        fetchAllHoleScores(),
        fetchGameConfig(),
      ]);
      setPlayers(p);
      setRounds(r);
      setHoles(h);
      setGroups(g);
      setGroupMembers(gm);
      setHoleScores(hs);
      setGameConfig(gc);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load app data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetchAll();
  }, [refetchAll]);

  useEffect(() => {
    const channel = supabase
      .channel("app-data-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "players" },
        (payload) => setPlayers((prev) => applyRowChange(prev, payload as never))
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rounds" },
        (payload) => setRounds((prev) => applyRowChange(prev, payload as never))
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "holes" },
        (payload) => setHoles((prev) => applyRowChange(prev, payload as never))
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "groups" },
        (payload) => setGroups((prev) => applyRowChange(prev, payload as never))
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "group_members" },
        (payload) =>
          setGroupMembers((prev) => applyRowChange(prev, payload as never))
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "hole_scores" },
        (payload) =>
          setHoleScores((prev) => applyRowChange(prev, payload as never))
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "game_config" },
        (payload) => {
          if (payload.eventType !== "DELETE") {
            setGameConfig(payload.new as GameConfigRow);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <AppDataContext.Provider
      value={{
        loading,
        error,
        players,
        rounds,
        holes,
        groups,
        groupMembers,
        holeScores,
        gameConfig,
        refetchAll,
      }}
    >
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData(): AppDataState {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData must be used within AppDataProvider");
  return ctx;
}
