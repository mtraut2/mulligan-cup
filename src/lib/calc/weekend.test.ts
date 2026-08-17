import { describe, expect, it } from "vitest";
import { calculateWeekend } from "./weekend";
import { DEFAULT_GAME_CONFIG, PlayerRoundSummary } from "./types";

function fakeRoundSummary(
  playerId: string,
  totalPoints: number,
  moneyOwed: number,
  holesEntered = 18
): PlayerRoundSummary {
  return {
    playerId,
    courseHandicap: 0,
    playingHandicap: 0,
    holesEntered,
    totalScore: 0,
    netScore: 0,
    holeOutcomes: [],
    golfPoints: 0,
    golfPointsBreakdown: [],
    moneyOwed,
    moneyOwedBreakdown: [],
    placementPoints: 0,
    totalPoints,
    place: 1,
    tied: false,
  };
}

describe("calculateWeekend — tie split", () => {
  it("splits payout evenly when weekend total points tie", () => {
    const playerIds = ["alice", "bob", "carol"];
    const rounds = [
      [
        fakeRoundSummary("alice", 30, 5),
        fakeRoundSummary("bob", 25, 2),
        fakeRoundSummary("carol", 20, 3),
      ],
      [
        fakeRoundSummary("alice", 20, 3),
        fakeRoundSummary("bob", 25, 4),
        fakeRoundSummary("carol", 30, 1),
      ],
      [
        fakeRoundSummary("alice", 25, 2),
        fakeRoundSummary("bob", 20, 5),
        fakeRoundSummary("carol", 25, 3),
      ],
    ];

    const result = calculateWeekend(playerIds, rounds, DEFAULT_GAME_CONFIG);
    const byId = Object.fromEntries(result.map((r) => [r.playerId, r]));

    // alice = 75, carol = 75, bob = 70
    expect(byId.alice.totalPoints).toBe(75);
    expect(byId.carol.totalPoints).toBe(75);
    expect(byId.bob.totalPoints).toBe(70);

    // pot = 50*3 buy-ins + (10+11+7) money owed = 150 + 28 = 178
    // rank1 = 89, rank2 = 53.4 -> tied avg = 71.2; bob gets rank3 = 35.6
    expect(byId.alice.payout).toBeCloseTo(71.2);
    expect(byId.carol.payout).toBeCloseTo(71.2);
    expect(byId.alice.tied).toBe(true);
    expect(byId.carol.tied).toBe(true);
    expect(byId.bob.payout).toBeCloseTo(35.6);
    expect(byId.bob.tied).toBe(false);
    expect(byId.bob.place).toBe(3);

    expect(byId.alice.netEarnings).toBeCloseTo(71.2 - (50 + 10));
    expect(byId.carol.netEarnings).toBeCloseTo(71.2 - (50 + 7));
    expect(byId.bob.netEarnings).toBeCloseTo(35.6 - (50 + 11));
  });
});
