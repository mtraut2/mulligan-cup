import { courseHandicap, playingHandicaps, strokesForHole } from "./handicap";
import { classifyHoleOutcome } from "./holeOutcome";
import { rankWithTies } from "./ranking";
import {
  CourseDef,
  GameConfig,
  HoleOutcomeDetail,
  HoleScoreInput,
  PlayerDef,
  PlayerRoundSummary,
  ScoringBreakdownLine,
} from "./types";

function placementValueAtRank(
  rank: number,
  values: GameConfig["placementPoints"]
): number {
  if (rank === 1) return values.first;
  if (rank === 2) return values.second;
  if (rank === 3) return values.third;
  return values.fourthPlus;
}

/**
 * Computes every player's full round summary (handicaps, hole outcomes,
 * Golf Points, Money Owed, and placement) from raw per-hole entries. Players
 * may have fewer than 18 holes entered (live, in-progress scoring) — totals
 * reflect whatever has been entered so far.
 */
export function calculateRound(params: {
  players: PlayerDef[];
  course: CourseDef;
  scoresByPlayer: Record<string, HoleScoreInput[]>;
  config: GameConfig;
}): PlayerRoundSummary[] {
  const { players, course, scoresByPlayer, config } = params;
  const holesByNumber = new Map(course.holes.map((h) => [h.holeNumber, h]));

  const courseHandicapsByPlayer: Record<string, number> = {};
  for (const player of players) {
    courseHandicapsByPlayer[player.id] = courseHandicap(
      player.handicap,
      course.slopeRating,
      course.courseRating,
      course.coursePar
    );
  }
  const playingHandicapsByPlayer = playingHandicaps(courseHandicapsByPlayer);

  const preliminary = players.map((player) => {
    const scores = scoresByPlayer[player.id] ?? [];
    const ch = courseHandicapsByPlayer[player.id];

    const holeOutcomes: HoleOutcomeDetail[] = [];
    let totalScore = 0;
    const counts = {
      eagle: 0,
      birdie: 0,
      par: 0,
      bogey: 0,
      doubleBogey: 0,
      triplePlus: 0,
      zeroPutt: 0,
      onePutt: 0,
      threePutt: 0,
      lostBalls: 0,
      ladiesTees: 0,
    };

    for (const entry of scores) {
      const hole = holesByNumber.get(entry.holeNumber);
      if (!hole) continue;

      const strokesReceived = strokesForHole(ch, hole.holeHandicap);
      const netHoleScore = entry.score - strokesReceived;
      const outcome = classifyHoleOutcome(netHoleScore, hole.holePar);

      holeOutcomes.push({
        holeNumber: entry.holeNumber,
        rawScore: entry.score,
        strokesReceived,
        netHoleScore,
        outcome,
      });

      totalScore += entry.score;
      counts[outcome] += 1;
      if (entry.putts === 0) counts.zeroPutt += 1;
      else if (entry.putts === 1) counts.onePutt += 1;
      else if (entry.putts >= 3) counts.threePutt += 1;
      counts.lostBalls += entry.lostBalls;
      counts.ladiesTees += entry.ladiesTees;
    }

    holeOutcomes.sort((a, b) => a.holeNumber - b.holeNumber);

    const golfPointsBreakdown: ScoringBreakdownLine[] = [
      { category: "Eagles", count: counts.eagle, valueEach: config.golfPoints.eagle, subtotal: counts.eagle * config.golfPoints.eagle },
      { category: "Birdies", count: counts.birdie, valueEach: config.golfPoints.birdie, subtotal: counts.birdie * config.golfPoints.birdie },
      { category: "Pars", count: counts.par, valueEach: config.golfPoints.par, subtotal: counts.par * config.golfPoints.par },
      { category: "Bogeys", count: counts.bogey, valueEach: config.golfPoints.bogey, subtotal: counts.bogey * config.golfPoints.bogey },
      { category: "Zero Putts", count: counts.zeroPutt, valueEach: config.golfPoints.zeroPutt, subtotal: counts.zeroPutt * config.golfPoints.zeroPutt },
      { category: "One Putts", count: counts.onePutt, valueEach: config.golfPoints.onePutt, subtotal: counts.onePutt * config.golfPoints.onePutt },
    ];
    const golfPoints = golfPointsBreakdown.reduce((sum, l) => sum + l.subtotal, 0);

    const moneyOwedBreakdown: ScoringBreakdownLine[] = [
      { category: "Three Putts", count: counts.threePutt, valueEach: config.moneyOwed.threePutt, subtotal: counts.threePutt * config.moneyOwed.threePutt },
      { category: "Lost Balls", count: counts.lostBalls, valueEach: config.moneyOwed.lostBall, subtotal: counts.lostBalls * config.moneyOwed.lostBall },
      { category: "Ladies Tees", count: counts.ladiesTees, valueEach: config.moneyOwed.ladiesTee, subtotal: counts.ladiesTees * config.moneyOwed.ladiesTee },
      { category: "Triple Bogey+", count: counts.triplePlus, valueEach: config.moneyOwed.triplePlus, subtotal: counts.triplePlus * config.moneyOwed.triplePlus },
    ];
    const moneyOwed = moneyOwedBreakdown.reduce((sum, l) => sum + l.subtotal, 0);

    const playingHandicap = playingHandicapsByPlayer[player.id];
    const netScore = totalScore - playingHandicap;

    return {
      playerId: player.id,
      courseHandicap: ch,
      playingHandicap,
      holesEntered: scores.length,
      totalScore,
      netScore,
      holeOutcomes,
      golfPoints,
      golfPointsBreakdown,
      moneyOwed,
      moneyOwedBreakdown,
    };
  });

  const ranked = rankWithTies(
    preliminary,
    (a, b) => a.netScore - b.netScore || b.golfPoints - a.golfPoints,
    (rank) => placementValueAtRank(rank, config.placementPoints)
  );

  const byPlayerId = new Map(ranked.map((r) => [r.item.playerId, r]));

  return preliminary.map((p) => {
    const r = byPlayerId.get(p.playerId)!;
    return {
      ...p,
      placementPoints: r.value,
      totalPoints: p.golfPoints + r.value,
      place: r.rank,
      tied: r.tied,
    };
  });
}
