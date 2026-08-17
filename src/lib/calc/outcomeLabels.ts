import { HoleOutcomeType } from "./types";

export const HOLE_OUTCOME_LABELS: Record<HoleOutcomeType, string> = {
  eagle: "Eagle",
  birdie: "Birdie",
  par: "Par",
  bogey: "Bogey",
  doubleBogey: "Double Bogey",
  triplePlus: "Triple+",
};

export const HOLE_OUTCOME_STYLES: Record<HoleOutcomeType, string> = {
  eagle: "bg-purple-100 text-purple-800",
  birdie: "bg-blue-100 text-blue-800",
  par: "bg-green-100 text-green-800",
  bogey: "bg-yellow-100 text-yellow-800",
  doubleBogey: "bg-orange-100 text-orange-800",
  triplePlus: "bg-red-100 text-red-800",
};
