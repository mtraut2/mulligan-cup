import { describe, expect, it } from "vitest";
import { calculateRound } from "./round";
import { CourseDef, DEFAULT_GAME_CONFIG, HoleScoreInput, PlayerDef } from "./types";

// 18 holes, all par 4, hole handicap rank == hole number. Rating == par and
// slope == 113 so Course Handicap equals raw handicap exactly, keeping the
// hand-computed arithmetic simple.
const course: CourseDef = {
  courseName: "Test Course",
  courseRating: 72,
  slopeRating: 113,
  coursePar: 72,
  holes: Array.from({ length: 18 }, (_, i) => ({
    holeNumber: i + 1,
    holeHandicap: i + 1,
    holePar: 4,
  })),
};

function flatScores(score: number, holeCount = 18): HoleScoreInput[] {
  return Array.from({ length: holeCount }, (_, i) => ({
    holeNumber: i + 1,
    score,
    putts: 2, // neutral: no zero/one-putt bonus, no three-putt charge
    lostBalls: 0,
    ladiesTees: 0,
  }));
}

describe("calculateRound — full hand-computed round", () => {
  const players: PlayerDef[] = [
    { id: "scratch", name: "Scratch (0)", handicap: 0 },
    { id: "mid", name: "Mid (9)", handicap: 9 },
    { id: "high", name: "High (18)", handicap: 18 },
  ];

  const scoresByPlayer: Record<string, HoleScoreInput[]> = {
    scratch: flatScores(4), // pars every hole, no strokes
    mid: flatScores(5), // strokes on holes 1-9 (rank<=9) turn 5 -> par; 10-18 stay bogey
    high: flatScores(6), // stroke every hole turns 6 -> bogey every hole
  };

  const summaries = calculateRound({
    players,
    course,
    scoresByPlayer,
    config: DEFAULT_GAME_CONFIG,
  });
  const byId = Object.fromEntries(summaries.map((s) => [s.playerId, s]));

  it("computes course and playing handicaps", () => {
    expect(byId.scratch.courseHandicap).toBe(0);
    expect(byId.mid.courseHandicap).toBe(9);
    expect(byId.high.courseHandicap).toBe(18);
    expect(byId.scratch.playingHandicap).toBe(0);
    expect(byId.mid.playingHandicap).toBe(9);
    expect(byId.high.playingHandicap).toBe(18);
  });

  it("computes total and net scores", () => {
    expect(byId.scratch.totalScore).toBe(72);
    expect(byId.scratch.netScore).toBe(72);

    expect(byId.mid.totalScore).toBe(90);
    expect(byId.mid.netScore).toBe(81); // 90 - 9

    expect(byId.high.totalScore).toBe(108);
    expect(byId.high.netScore).toBe(90); // 108 - 18
  });

  it("classifies hole outcomes per player", () => {
    expect(byId.scratch.holeOutcomes.every((h) => h.outcome === "par")).toBe(
      true
    );
    expect(
      byId.mid.holeOutcomes.slice(0, 9).every((h) => h.outcome === "par")
    ).toBe(true);
    expect(
      byId.mid.holeOutcomes.slice(9).every((h) => h.outcome === "bogey")
    ).toBe(true);
    expect(byId.high.holeOutcomes.every((h) => h.outcome === "bogey")).toBe(
      true
    );
  });

  it("computes golf points from the breakdown", () => {
    expect(byId.scratch.golfPoints).toBe(18 * 2); // 18 pars x 2pts = 36
    expect(byId.mid.golfPoints).toBe(9 * 2 + 9 * 1); // 27
    expect(byId.high.golfPoints).toBe(18 * 1); // 18
    expect(byId.scratch.moneyOwed).toBe(0);
    expect(byId.mid.moneyOwed).toBe(0);
    expect(byId.high.moneyOwed).toBe(0);
  });

  it("ranks by net score and assigns placement + total points", () => {
    expect(byId.scratch.place).toBe(1);
    expect(byId.mid.place).toBe(2);
    expect(byId.high.place).toBe(3);
    expect(byId.scratch.placementPoints).toBe(16);
    expect(byId.mid.placementPoints).toBe(14);
    expect(byId.high.placementPoints).toBe(12);
    expect(byId.scratch.totalPoints).toBe(36 + 16);
    expect(byId.mid.totalPoints).toBe(27 + 14);
    expect(byId.high.totalPoints).toBe(18 + 12);
    expect(summaries.every((s) => !s.tied)).toBe(true);
  });
});

describe("calculateRound — placement tie-break", () => {
  // Minimal 2-hole "course" (rating == par so Course Handicap == handicap)
  // just to exercise the tie-break rule in isolation.
  const tieCourse: CourseDef = {
    courseName: "Tie Course",
    courseRating: 8,
    slopeRating: 113,
    coursePar: 8,
    holes: [
      { holeNumber: 1, holeHandicap: 1, holePar: 4 },
      { holeNumber: 2, holeHandicap: 2, holePar: 4 },
    ],
  };

  it("splits placement points evenly when both net score and golf points tie", () => {
    const players: PlayerDef[] = [
      { id: "d", name: "D", handicap: 0 },
      { id: "e", name: "E", handicap: 0 },
    ];
    const scoresByPlayer: Record<string, HoleScoreInput[]> = {
      d: flatScores(4, 2),
      e: flatScores(4, 2),
    };
    const summaries = calculateRound({
      players,
      course: tieCourse,
      scoresByPlayer,
      config: DEFAULT_GAME_CONFIG,
    });
    const byId = Object.fromEntries(summaries.map((s) => [s.playerId, s]));
    expect(byId.d.netScore).toBe(byId.e.netScore);
    expect(byId.d.golfPoints).toBe(byId.e.golfPoints);
    // tied for 1st/2nd -> average of 16 and 14
    expect(byId.d.placementPoints).toBe(15);
    expect(byId.e.placementPoints).toBe(15);
    expect(byId.d.tied).toBe(true);
    expect(byId.e.tied).toBe(true);
    expect(byId.d.place).toBe(1);
    expect(byId.e.place).toBe(1);
  });

  it("breaks a net-score tie by golf points without averaging", () => {
    const players: PlayerDef[] = [
      { id: "i", name: "I", handicap: 0 },
      { id: "j", name: "J", handicap: 0 },
    ];
    const scoresByPlayer: Record<string, HoleScoreInput[]> = {
      i: [
        { holeNumber: 1, score: 4, putts: 2, lostBalls: 0, ladiesTees: 0 },
        { holeNumber: 2, score: 4, putts: 2, lostBalls: 0, ladiesTees: 0 },
      ],
      j: [
        { holeNumber: 1, score: 4, putts: 0, lostBalls: 0, ladiesTees: 0 }, // zero-putt bonus
        { holeNumber: 2, score: 4, putts: 2, lostBalls: 0, ladiesTees: 0 },
      ],
    };
    const summaries = calculateRound({
      players,
      course: tieCourse,
      scoresByPlayer,
      config: DEFAULT_GAME_CONFIG,
    });
    const byId = Object.fromEntries(summaries.map((s) => [s.playerId, s]));
    expect(byId.i.netScore).toBe(byId.j.netScore); // both par-par, same net score
    expect(byId.j.golfPoints).toBeGreaterThan(byId.i.golfPoints); // j has the zero-putt bonus
    expect(byId.j.place).toBe(1);
    expect(byId.i.place).toBe(2);
    expect(byId.j.placementPoints).toBe(16);
    expect(byId.i.placementPoints).toBe(14);
    expect(byId.j.tied).toBe(false);
    expect(byId.i.tied).toBe(false);
  });
});

describe("calculateRound — money owed", () => {
  it("charges three-putts, lost balls, ladies tees, and triple-bogey+", () => {
    const players: PlayerDef[] = [{ id: "p", name: "P", handicap: 0 }];
    const scoresByPlayer: Record<string, HoleScoreInput[]> = {
      p: [
        { holeNumber: 1, score: 7, putts: 3, lostBalls: 1, ladiesTees: 1 }, // par4 -> +3 triple+, 3-putt, 1 lost ball, 1 ladies tee
      ],
    };
    const oneHoleCourse: CourseDef = {
      courseName: "One Hole",
      courseRating: 4,
      slopeRating: 113,
      coursePar: 4,
      holes: [{ holeNumber: 1, holeHandicap: 1, holePar: 4 }],
    };
    const [summary] = calculateRound({
      players,
      course: oneHoleCourse,
      scoresByPlayer,
      config: DEFAULT_GAME_CONFIG,
    });
    expect(summary.moneyOwed).toBe(1 + 1 + 5 + 1); // threePutt + lostBall + ladiesTee + triplePlus
  });
});

describe("calculateRound — untouched round", () => {
  it("does not rank or award placement points to a player with zero holes entered", () => {
    // Regression test: a high-handicap player with 0 holes entered has
    // totalScore 0, which nets to a large *negative* net score (0 minus
    // their positive playing handicap) — without an explicit guard this
    // ranks them 1st in a round they haven't played at all.
    const players: PlayerDef[] = [
      { id: "scratch", name: "Scratch (0)", handicap: 0 },
      { id: "high", name: "High (18)", handicap: 18 },
    ];
    const scoresByPlayer: Record<string, HoleScoreInput[]> = {
      scratch: flatScores(4),
      high: [], // hasn't entered anything this round
    };
    const summaries = calculateRound({
      players,
      course,
      scoresByPlayer,
      config: DEFAULT_GAME_CONFIG,
    });
    const byId = Object.fromEntries(summaries.map((s) => [s.playerId, s]));

    expect(byId.high.holesEntered).toBe(0);
    expect(byId.high.placementPoints).toBe(0);
    expect(byId.high.totalPoints).toBe(0);
    expect(byId.high.place).toBe(2); // ranked after the one active player
    expect(byId.scratch.place).toBe(1);
    expect(byId.scratch.placementPoints).toBe(16);
  });
});
