export interface PlayerRow {
  id: string;
  name: string;
  handicap: number;
  pin: string | null;
  created_at: string;
}

export interface RoundRow {
  id: string;
  round_number: number;
  course_name: string;
  course_rating: number;
  slope_rating: number;
  course_par: number;
  created_at: string;
}

export interface HoleRow {
  id: string;
  round_id: string;
  hole_number: number;
  hole_handicap: number;
  hole_par: number;
}

export interface GroupRow {
  id: string;
  round_id: string;
  label: string;
  created_at: string;
}

export interface GroupMemberRow {
  id: string;
  group_id: string;
  player_id: string;
}

export interface HoleScoreRow {
  id: string;
  round_id: string;
  player_id: string;
  hole_number: number;
  score: number;
  putts: number;
  lost_balls: number;
  ladies_tees: number;
  updated_at: string;
}

export interface GameConfigRow {
  id: 1;
  golf_zero_putt: number;
  golf_one_putt: number;
  golf_eagle: number;
  golf_birdie: number;
  golf_par: number;
  golf_bogey: number;
  money_three_putt: number;
  money_lost_ball: number;
  money_ladies_tee: number;
  money_triple_plus: number;
  /** Ordered by place — index 0 is 1st place's points, index 1 is 2nd, etc. */
  placement_points: number[];
  buy_in: number;
  admin_passcode: string;
  totals_visible: boolean;
  updated_at: string;
}
