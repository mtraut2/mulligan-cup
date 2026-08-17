import { defaultPlacementPoints } from "./placementDefaults";

export type HoleOutcomeType =
  | "eagle"
  | "birdie"
  | "par"
  | "bogey"
  | "doubleBogey"
  | "triplePlus";

export interface HoleDef {
  holeNumber: number; // 1-18
  holeHandicap: number; // 1-18 difficulty rank, 1 = hardest
  holePar: number;
}

export interface CourseDef {
  courseName: string;
  courseRating: number;
  slopeRating: number;
  coursePar: number;
  holes: HoleDef[];
}

export interface PlayerDef {
  id: string;
  name: string;
  handicap: number;
}

export interface HoleScoreInput {
  holeNumber: number; // 1-18
  score: number; // raw strokes taken
  putts: number;
  lostBalls: number;
  ladiesTees: number;
}

export interface GameConfig {
  golfPoints: {
    zeroPutt: number;
    onePutt: number;
    eagle: number;
    birdie: number;
    par: number;
    bogey: number;
  };
  moneyOwed: {
    threePutt: number;
    lostBall: number;
    ladiesTee: number;
    triplePlus: number;
  };
  /** Ordered by place — index 0 is 1st place's points, index 1 is 2nd, etc. */
  placementPointsByPlace: number[];
  buyIn: number;
}

export const DEFAULT_GAME_CONFIG: GameConfig = {
  golfPoints: {
    zeroPutt: 3,
    onePutt: 1,
    eagle: 4,
    birdie: 3,
    par: 2,
    bogey: 1,
  },
  moneyOwed: {
    threePutt: 1,
    lostBall: 1,
    ladiesTee: 5,
    triplePlus: 1,
  },
  placementPointsByPlace: defaultPlacementPoints(15),
  buyIn: 50,
};

export interface HoleOutcomeDetail {
  holeNumber: number;
  rawScore: number;
  strokesReceived: number;
  netHoleScore: number;
  outcome: HoleOutcomeType;
}

export interface ScoringBreakdownLine {
  category: string;
  count: number;
  valueEach: number;
  subtotal: number;
}

export interface PlayerRoundSummary {
  playerId: string;
  courseHandicap: number;
  playingHandicap: number;
  holesEntered: number;
  totalScore: number;
  netScore: number;
  holeOutcomes: HoleOutcomeDetail[];
  golfPoints: number;
  golfPointsBreakdown: ScoringBreakdownLine[];
  moneyOwed: number;
  moneyOwedBreakdown: ScoringBreakdownLine[];
  placementPoints: number;
  totalPoints: number;
  place: number;
  tied: boolean;
}

export interface PlayerWeekendSummary {
  playerId: string;
  roundsPlayed: number;
  totalPoints: number;
  totalMoneyOwed: number;
  place: number;
  tied: boolean;
  payout: number;
  netEarnings: number;
}
