export function getBirdieHoleLists(result) {
  const holes = result?.birdieSummary?.holes || [];

  const p1BirdieHoles = [];
  const p2BirdieHoles = [];

  holes.forEach((entry) => {
    if ((entry.countA || 0) > (entry.countB || 0)) {
      p1BirdieHoles.push(entry.hole);
    } else if ((entry.countB || 0) > (entry.countA || 0)) {
      p2BirdieHoles.push(entry.hole);
    } else if ((entry.countA || 0) > 0 && (entry.countB || 0) > 0) {
      p1BirdieHoles.push(entry.hole);
      p2BirdieHoles.push(entry.hole);
    }
  });

  return {
    p1BirdieHoles,
    p2BirdieHoles,
  };
}