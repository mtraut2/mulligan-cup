import { describe, expect, it } from "vitest";
import { courseHandicap, playingHandicaps, strokesForHole } from "./handicap";

describe("courseHandicap", () => {
  it("equals raw handicap when slope is 113 and rating equals par", () => {
    expect(courseHandicap(10, 113, 72, 72)).toBe(10);
  });

  it("applies the USGA formula and rounds to the nearest whole stroke", () => {
    // 15.4 * (125/113) + (71.2 - 72) = 16.2354... -> rounds to 16
    expect(courseHandicap(15.4, 125, 71.2, 72)).toBe(16);
  });
});

describe("playingHandicaps", () => {
  it("subtracts the lowest course handicap so that player gets 0", () => {
    expect(playingHandicaps({ A: 10, B: 5, C: 12 })).toEqual({
      A: 5,
      B: 0,
      C: 7,
    });
  });

  it("handles an empty input", () => {
    expect(playingHandicaps({})).toEqual({});
  });
});

describe("strokesForHole", () => {
  it("gives one stroke on the 5 hardest holes for Course Handicap 5", () => {
    const strokes = Array.from({ length: 18 }, (_, i) =>
      strokesForHole(5, i + 1)
    );
    expect(strokes).toEqual([
      1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    ]);
  });

  it("gives one stroke on every hole for Course Handicap 18", () => {
    const strokes = Array.from({ length: 18 }, (_, i) =>
      strokesForHole(18, i + 1)
    );
    expect(strokes.every((s) => s === 1)).toBe(true);
  });

  it("gives two strokes on the 5 hardest holes and one elsewhere for Course Handicap 23", () => {
    const strokes = Array.from({ length: 18 }, (_, i) =>
      strokesForHole(23, i + 1)
    );
    expect(strokes.slice(0, 5)).toEqual([2, 2, 2, 2, 2]);
    expect(strokes.slice(5)).toEqual(Array(13).fill(1));
  });

  it("gives two strokes on every hole for Course Handicap 36", () => {
    const strokes = Array.from({ length: 18 }, (_, i) =>
      strokesForHole(36, i + 1)
    );
    expect(strokes.every((s) => s === 2)).toBe(true);
  });

  it("clamps negative (plus) course handicaps to zero strokes", () => {
    expect(strokesForHole(-2, 1)).toBe(0);
    expect(strokesForHole(-2, 18)).toBe(0);
  });
});
