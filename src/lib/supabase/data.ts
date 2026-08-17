import { supabase } from "./client";
import {
  GameConfigRow,
  GroupMemberRow,
  GroupRow,
  HoleRow,
  HoleScoreRow,
  PlayerRow,
  RoundRow,
} from "./types";

// ---------------------------------------------------------------------
// Players
// ---------------------------------------------------------------------
export async function fetchPlayers(): Promise<PlayerRow[]> {
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .order("name");
  if (error) throw error;
  return data;
}

export async function upsertPlayer(player: {
  id?: string;
  name: string;
  handicap: number;
}): Promise<PlayerRow> {
  const { data, error } = await supabase
    .from("players")
    .upsert(player)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deletePlayer(id: string): Promise<void> {
  const { error } = await supabase.from("players").delete().eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------
// Rounds + holes
// ---------------------------------------------------------------------
export async function fetchRounds(): Promise<RoundRow[]> {
  const { data, error } = await supabase
    .from("rounds")
    .select("*")
    .order("round_number");
  if (error) throw error;
  return data;
}

export async function fetchHoles(roundId: string): Promise<HoleRow[]> {
  const { data, error } = await supabase
    .from("holes")
    .select("*")
    .eq("round_id", roundId)
    .order("hole_number");
  if (error) throw error;
  return data;
}

export async function fetchAllHoles(): Promise<HoleRow[]> {
  const { data, error } = await supabase.from("holes").select("*");
  if (error) throw error;
  return data;
}

export async function updateRound(
  id: string,
  updates: Partial<
    Pick<RoundRow, "course_name" | "course_rating" | "slope_rating" | "course_par">
  >
): Promise<void> {
  const { error } = await supabase.from("rounds").update(updates).eq("id", id);
  if (error) throw error;
}

export async function upsertHole(hole: {
  round_id: string;
  hole_number: number;
  hole_handicap: number;
  hole_par: number;
}): Promise<void> {
  const { error } = await supabase
    .from("holes")
    .upsert(hole, { onConflict: "round_id,hole_number" });
  if (error) throw error;
}

// ---------------------------------------------------------------------
// Groups / carts
// ---------------------------------------------------------------------
export async function fetchGroups(roundId: string): Promise<GroupRow[]> {
  const { data, error } = await supabase
    .from("groups")
    .select("*")
    .eq("round_id", roundId)
    .order("label");
  if (error) throw error;
  return data;
}

export async function fetchAllGroups(): Promise<GroupRow[]> {
  const { data, error } = await supabase.from("groups").select("*");
  if (error) throw error;
  return data;
}

export async function fetchAllGroupMembers(): Promise<GroupMemberRow[]> {
  const { data, error } = await supabase.from("group_members").select("*");
  if (error) throw error;
  return data;
}

export async function fetchGroupMembers(
  groupIds: string[]
): Promise<GroupMemberRow[]> {
  if (groupIds.length === 0) return [];
  const { data, error } = await supabase
    .from("group_members")
    .select("*")
    .in("group_id", groupIds);
  if (error) throw error;
  return data;
}

export async function createGroup(
  roundId: string,
  label: string
): Promise<GroupRow> {
  const { data, error } = await supabase
    .from("groups")
    .insert({ round_id: roundId, label })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteGroup(groupId: string): Promise<void> {
  const { error } = await supabase.from("groups").delete().eq("id", groupId);
  if (error) throw error;
}

export async function updateGroupLabel(groupId: string, label: string): Promise<void> {
  const { error } = await supabase.from("groups").update({ label }).eq("id", groupId);
  if (error) throw error;
}

export async function addGroupMember(groupId: string, playerId: string): Promise<void> {
  const { error } = await supabase
    .from("group_members")
    .upsert(
      { group_id: groupId, player_id: playerId },
      { onConflict: "group_id,player_id" }
    );
  if (error) throw error;
}

export async function removeGroupMember(groupId: string, playerId: string): Promise<void> {
  const { error } = await supabase
    .from("group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("player_id", playerId);
  if (error) throw error;
}

export async function setGroupMembers(
  groupId: string,
  playerIds: string[]
): Promise<void> {
  const { error: deleteError } = await supabase
    .from("group_members")
    .delete()
    .eq("group_id", groupId);
  if (deleteError) throw deleteError;

  if (playerIds.length === 0) return;
  const { error: insertError } = await supabase
    .from("group_members")
    .insert(playerIds.map((player_id) => ({ group_id: groupId, player_id })));
  if (insertError) throw insertError;
}

/** Copies all of `fromRoundId`'s groups (and their members) onto `toRoundId`. */
export async function copyGroupsToRound(
  fromRoundId: string,
  toRoundId: string
): Promise<void> {
  const sourceGroups = await fetchGroups(fromRoundId);
  const sourceMembers = await fetchGroupMembers(sourceGroups.map((g) => g.id));

  for (const group of sourceGroups) {
    const newGroup = await createGroup(toRoundId, group.label);
    const memberIds = sourceMembers
      .filter((m) => m.group_id === group.id)
      .map((m) => m.player_id);
    if (memberIds.length > 0) {
      await setGroupMembers(newGroup.id, memberIds);
    }
  }
}

// ---------------------------------------------------------------------
// Hole Play Data
// ---------------------------------------------------------------------
export async function fetchHoleScores(roundId: string): Promise<HoleScoreRow[]> {
  const { data, error } = await supabase
    .from("hole_scores")
    .select("*")
    .eq("round_id", roundId);
  if (error) throw error;
  return data;
}

export async function fetchAllHoleScores(): Promise<HoleScoreRow[]> {
  const { data, error } = await supabase.from("hole_scores").select("*");
  if (error) throw error;
  return data;
}

export async function upsertHoleScore(entry: {
  round_id: string;
  player_id: string;
  hole_number: number;
  score: number;
  putts: number;
  lost_balls: number;
  ladies_tees: number;
}): Promise<void> {
  const { error } = await supabase
    .from("hole_scores")
    .upsert(entry, { onConflict: "round_id,player_id,hole_number" });
  if (error) throw error;
}

// ---------------------------------------------------------------------
// Game config
// ---------------------------------------------------------------------
export async function fetchGameConfig(): Promise<GameConfigRow> {
  const { data, error } = await supabase
    .from("game_config")
    .select("*")
    .eq("id", 1)
    .single();
  if (error) throw error;
  return data;
}

export async function updateGameConfig(
  updates: Partial<Omit<GameConfigRow, "id" | "updated_at">>
): Promise<void> {
  const { error } = await supabase
    .from("game_config")
    .update(updates)
    .eq("id", 1);
  if (error) throw error;
}
