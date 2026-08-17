import { describe, expect, it } from "vitest";
import { calculateRound } from "./round";
import { calculateWeekend } from "./weekend";
import { CourseDef, DEFAULT_GAME_CONFIG, HoleScoreInput, PlayerDef } from "./types";

// Same simplified course as round.test.ts: 18 holes, all par 4, hole
// handicap rank == hole number, rating == par, slope 113 (Course Handicap
// == raw handicap).
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

function flatScores(score: number): HoleScoreInput[] {
  return Array.from({ length: 18 }, (_, i) => ({
    holeNumber: i + 1,
    score,
    putts: 2,
    lostBalls: 0,
    ladiesTees: 0,
  }));
}

const players: PlayerDef[] = [
  { id: "scratch", name: "Scratch (0)", handicap: 0 },
  { id: "mid", name: "Mid (9)", handicap: 9 },
  { id: "high", name: "High (18)", handicap: 18 },
];

describe("full round -> weekend -> payout chain", () => {
  it("hand-computed 3-round weekend produces the expected final payouts", () => {
    // Round 1: scratch pars everything, mid gets strokes on 1-9, high strokes everywhere.
    const round1 = calculateRound({
      players,
      course,
      scoresByPlayer: {
        scratch: flatScores(4),
        mid: flatScores(5),
        high: flatScores(6),
      },
      config: DEFAULT_GAME_CONFIG,
    });

    // Round 2: mid plays great, high plays steady, scratch collapses.
    const round2 = calculateRound({
      players,
      course,
      scoresByPlayer: {
        scratch: flatScores(6), // no strokes -> double bogey every hole (0 pts, no money)
        mid: flatScores(4), // strokes on 1-9 -> birdie x9, par x9
        high: flatScores(5), // stroke every hole -> par every hole
      },
      config: DEFAULT_GAME_CONFIG,
    });

    // Round 3: high plays great, scratch plays steady, mid fades.
    const round3 = calculateRound({
      players,
      course,
      scoresByPlayer: {
        scratch: flatScores(4), // par every hole
        mid: flatScores(5), // strokes 1-9 -> par x9, bogey x9
        high: flatScores(4), // stroke every hole -> birdie every hole
      },
      config: DEFAULT_GAME_CONFIG,
    });

    const round1ById = Object.fromEntries(round1.map((s) => [s.playerId, s]));
    const round2ById = Object.fromEntries(round2.map((s) => [s.playerId, s]));
    const round3ById = Object.fromEntries(round3.map((s) => [s.playerId, s]));

    expect(round1ById.scratch.totalPoints).toBe(52); // 36 golf + 16 placement
    expect(round1ById.mid.totalPoints).toBe(41); // 27 golf + 14 placement
    expect(round1ById.high.totalPoints).toBe(30); // 18 golf + 12 placement

    expect(round2ById.mid.totalPoints).toBe(61); // 45 golf + 16 placement
    expect(round2ById.high.totalPoints).toBe(50); // 36 golf + 14 placement
    expect(round2ById.scratch.totalPoints).toBe(12); // 0 golf (double bogeys) + 12 placement

    // high: stroke every hole -> birdie x18 -> 54 golf + 16 placement (1st)
    // scratch: no stroke -> par x18 -> 36 golf + 14 placement (2nd)
    // mid: strokes 1-9 -> par x9, bogey x9 -> 27 golf + 12 placement (3rd)
    expect(round3ById.high.totalPoints).toBe(70);
    expect(round3ById.scratch.totalPoints).toBe(50);
    expect(round3ById.mid.totalPoints).toBe(39);

    const weekend = calculateWeekend(
      players.map((p) => p.id),
      [round1, round2, round3],
      DEFAULT_GAME_CONFIG
    );
    const byId = Object.fromEntries(weekend.map((w) => [w.playerId, w]));

    // scratch: 52+12+50=114, mid: 41+61+39=141, high: 30+50+70=150
    expect(byId.scratch.totalPoints).toBe(114);
    expect(byId.mid.totalPoints).toBe(141);
    expect(byId.high.totalPoints).toBe(150);

    // No money owed anywhere in this scenario -> pot is buy-ins only.
    expect(byId.scratch.totalMoneyOwed).toBe(0);
    expect(byId.mid.totalMoneyOwed).toBe(0);
    expect(byId.high.totalMoneyOwed).toBe(0);

    // pot = $50 x 3 players = $150; with only 3 players, 3rd place still
    // earns a share (only 4th-and-lower gets nothing).
    expect(byId.high.place).toBe(1);
    expect(byId.mid.place).toBe(2);
    expect(byId.scratch.place).toBe(3);

    expect(byId.high.payout).toBeCloseTo(75); // 50% of 150
    expect(byId.mid.payout).toBeCloseTo(45); // 30% of 150
    expect(byId.scratch.payout).toBeCloseTo(30); // 20% of 150

    expect(byId.high.netEarnings).toBeCloseTo(75 - 50);
    expect(byId.mid.netEarnings).toBeCloseTo(45 - 50);
    expect(byId.scratch.netEarnings).toBeCloseTo(30 - 50);

    expect(byId.scratch.roundsPlayed).toBe(3);
    expect(byId.mid.roundsPlayed).toBe(3);
    expect(byId.high.roundsPlayed).toBe(3);
  });
});
