export function getRunningStrokeDiffs({
  p1Id,
  p2Id,
  players,
  course,
  scores,
  handicapMode,
  strokeScoring,
  getStrokeValueForHole,
}) {
  const diffs = [];
  let running = 0;

  for (let hole = 1; hole <= 18; hole++) {
    const a = getStrokeValueForHole(
      p1Id,
      hole,
      players,
      course,
      scores,
      handicapMode,
      strokeScoring
    );

    const b = getStrokeValueForHole(
      p2Id,
      hole,
      players,
      course,
      scores,
      handicapMode,
      strokeScoring
    );

    if (a === null || b === null || a === undefined || b === undefined) {
      diffs.push(null);
      continue;
    }

    running += b - a;
    diffs.push(running);
  }

  return diffs;
}