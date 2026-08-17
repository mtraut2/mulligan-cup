import { describe, expect, it } from "vitest";
import { rankWithTies } from "./ranking";

interface Item {
  id: string;
  v: number;
}

const valueAtRank = (rank: number) =>
  rank === 1 ? 100 : rank === 2 ? 90 : 80;

describe("rankWithTies", () => {
  it("assigns distinct ranks and values when nothing is tied", () => {
    const items: Item[] = [
      { id: "a", v: 3 },
      { id: "b", v: 1 },
      { id: "c", v: 2 },
    ];
    const result = rankWithTies(
      items,
      (a, b) => a.v - b.v,
      valueAtRank
    );
    const byId = Object.fromEntries(result.map((r) => [r.item.id, r]));
    expect(byId.b).toMatchObject({ rank: 1, value: 100, tied: false });
    expect(byId.c).toMatchObject({ rank: 2, value: 90, tied: false });
    expect(byId.a).toMatchObject({ rank: 3, value: 80, tied: false });
  });

  it("splits the value evenly across the slots a tied group occupies", () => {
    const items: Item[] = [
      { id: "a", v: 1 },
      { id: "b", v: 1 },
      { id: "c", v: 2 },
    ];
    const result = rankWithTies(
      items,
      (a, b) => a.v - b.v,
      valueAtRank
    );
    const byId = Object.fromEntries(result.map((r) => [r.item.id, r]));
    // a and b tie for ranks 1 & 2 -> average of 100 and 90
    expect(byId.a).toMatchObject({ rank: 1, value: 95, tied: true });
    expect(byId.b).toMatchObject({ rank: 1, value: 95, tied: true });
    // c takes rank 3
    expect(byId.c).toMatchObject({ rank: 3, value: 80, tied: false });
  });

  it("handles a 3-way tie by averaging across all three slots", () => {
    const items: Item[] = [
      { id: "a", v: 5 },
      { id: "b", v: 5 },
      { id: "c", v: 5 },
    ];
    const result = rankWithTies(
      items,
      (a, b) => a.v - b.v,
      valueAtRank
    );
    // average of 100, 90, 80 = 90
    expect(result.every((r) => r.value === 90 && r.tied)).toBe(true);
  });
});
