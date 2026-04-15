export function getTeamBirdiePlayerHoles({ birdieSummary, playersById }) {
  const holes = birdieSummary?.holes || [];

  const teamA = {};
  const teamB = {};

  holes.forEach((entry) => {
    const hole = entry.hole;

    (entry.teamAPlayers || []).forEach((playerId) => {
      const name = playersById?.[playerId]?.name || playerId;
      if (!teamA[name]) teamA[name] = [];
      teamA[name].push(hole);
    });

    (entry.teamBPlayers || []).forEach((playerId) => {
      const name = playersById?.[playerId]?.name || playerId;
      if (!teamB[name]) teamB[name] = [];
      teamB[name].push(hole);
    });
  });

  return { teamA, teamB };
}