import { CourseDef, GameConfig, HoleScoreInput, PlayerDef } from "@/lib/calc";
import { GameConfigRow, HoleRow, HoleScoreRow, PlayerRow, RoundRow } from "./types";

export function toPlayerDef(row: PlayerRow): PlayerDef {
  return { id: row.id, name: row.name, handicap: row.handicap };
}

export function toCourseDef(round: RoundRow, holes: HoleRow[]): CourseDef {
  return {
    courseName: round.course_name,
    courseRating: round.course_rating,
    slopeRating: round.slope_rating,
    coursePar: round.course_par,
    holes: holes
      .filter((h) => h.round_id === round.id)
      .sort((a, b) => a.hole_number - b.hole_number)
      .map((h) => ({
        holeNumber: h.hole_number,
        holeHandicap: h.hole_handicap,
        holePar: h.hole_par,
      })),
  };
}

export function toGameConfig(row: GameConfigRow): GameConfig {
  return {
    golfPoints: {
      zeroPutt: row.golf_zero_putt,
      onePutt: row.golf_one_putt,
      eagle: row.golf_eagle,
      birdie: row.golf_birdie,
      par: row.golf_par,
      bogey: row.golf_bogey,
    },
    moneyOwed: {
      threePutt: row.money_three_putt,
      lostBall: row.money_lost_ball,
      ladiesTee: row.money_ladies_tee,
      triplePlus: row.money_triple_plus,
    },
    placementPoints: {
      first: row.placement_first,
      second: row.placement_second,
      third: row.placement_third,
      fourthPlus: row.placement_fourth_plus,
    },
    buyIn: row.buy_in,
  };
}

export function groupScoresByPlayer(
  scores: HoleScoreRow[]
): Record<string, HoleScoreInput[]> {
  const byPlayer: Record<string, HoleScoreInput[]> = {};
  for (const s of scores) {
    if (!byPlayer[s.player_id]) byPlayer[s.player_id] = [];
    byPlayer[s.player_id].push({
      holeNumber: s.hole_number,
      score: s.score,
      putts: s.putts,
      lostBalls: s.lost_balls,
      ladiesTees: s.ladies_tees,
    });
  }
  return byPlayer;
}
