/**
 * Ranks items with a comparator, assigning each item a value from
 * `valueAtRank(rank)` (1-indexed). Items the comparator treats as fully
 * equal (returns 0) share the average of the values across the rank slots
 * they jointly occupy — this implements the spec's "split the placement
 * points difference evenly between tied players" rule generically, so it
 * can also be reused for weekend payout ranking.
 */
export function rankWithTies<T>(
  items: T[],
  compare: (a: T, b: T) => number,
  valueAtRank: (rank: number) => number
): { item: T; rank: number; tied: boolean; value: number }[] {
  const sorted = [...items].sort(compare);
  const results: { item: T; rank: number; tied: boolean; value: number }[] = [];

  let i = 0;
  let rank = 1;
  while (i < sorted.length) {
    let j = i;
    while (j + 1 < sorted.length && compare(sorted[j], sorted[j + 1]) === 0) {
      j++;
    }
    const groupSize = j - i + 1;
    const slots = Array.from({ length: groupSize }, (_, k) => rank + k);
    const avgValue =
      slots.reduce((sum, r) => sum + valueAtRank(r), 0) / groupSize;

    for (let k = i; k <= j; k++) {
      results.push({
        item: sorted[k],
        rank,
        tied: groupSize > 1,
        value: avgValue,
      });
    }

    rank += groupSize;
    i = j + 1;
  }

  return results;
}
