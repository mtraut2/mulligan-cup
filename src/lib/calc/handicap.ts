/**
 * Course Handicap = Handicap x (Slope / 113) + (Rating - Par), rounded to the
 * nearest whole stroke (standard USGA practice — stroke allocation and hole
 * handicap ranks are both integers, so a fractional Course Handicap has no
 * meaningful stroke-allocation interpretation).
 */
export function courseHandicap(
  handicap: number,
  slopeRating: number,
  courseRating: number,
  coursePar: number
): number {
  const raw = handicap * (slopeRating / 113) + (courseRating - coursePar);
  return Math.round(raw);
}

/**
 * Playing Handicap = Course Handicap - the lowest Course Handicap among all
 * players in that round. The player with the best Course Handicap that round
 * gets a Playing Handicap of 0.
 */
export function playingHandicaps(
  courseHandicapsByPlayer: Record<string, number>
): Record<string, number> {
  const values = Object.values(courseHandicapsByPlayer);
  if (values.length === 0) return {};
  const min = Math.min(...values);
  const result: Record<string, number> = {};
  for (const [playerId, ch] of Object.entries(courseHandicapsByPlayer)) {
    result[playerId] = ch - min;
  }
  return result;
}

/**
 * Strokes received on a given hole: a Course Handicap of 18 gives one stroke
 * on every hole, 36 gives two on every hole, and anything in between gives
 * the base number of strokes to every hole plus one extra stroke on the N
 * hardest holes (by hole handicap rank), where N is the remainder.
 * Negative (plus) Course Handicaps are clamped to 0 strokes — this app does
 * not model giving strokes back to the course.
 */
export function strokesForHole(
  courseHandicapValue: number,
  holeHandicapRank: number
): number {
  const effective = Math.max(0, courseHandicapValue);
  const base = Math.floor(effective / 18);
  const remainder = effective % 18;
  return base + (remainder >= holeHandicapRank ? 1 : 0);
}
