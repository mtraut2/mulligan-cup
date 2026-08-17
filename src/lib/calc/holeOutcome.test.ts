import { describe, expect, it } from "vitest";
import { classifyHoleOutcome } from "./holeOutcome";

describe("classifyHoleOutcome", () => {
  const par = 4;

  it("classifies eagle for -2 or better", () => {
    expect(classifyHoleOutcome(par - 2, par)).toBe("eagle");
    expect(classifyHoleOutcome(par - 3, par)).toBe("eagle"); // albatross also counts as eagle
  });

  it("classifies birdie for -1", () => {
    expect(classifyHoleOutcome(par - 1, par)).toBe("birdie");
  });

  it("classifies par for 0", () => {
    expect(classifyHoleOutcome(par, par)).toBe("par");
  });

  it("classifies bogey for +1", () => {
    expect(classifyHoleOutcome(par + 1, par)).toBe("bogey");
  });

  it("classifies double bogey for +2 (no points, no money owed category)", () => {
    expect(classifyHoleOutcome(par + 2, par)).toBe("doubleBogey");
  });

  it("classifies triplePlus for +3 or worse", () => {
    expect(classifyHoleOutcome(par + 3, par)).toBe("triplePlus");
    expect(classifyHoleOutcome(par + 6, par)).toBe("triplePlus");
  });
});
