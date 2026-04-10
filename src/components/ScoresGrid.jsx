export default function ScoresGrid({ players, scores, onSetScore }) {
  return (
    <div>
      <h3>Scores</h3>
      {Array.from({ length: 18 }, (_, i) => i + 1).map((hole) => (
        <div key={hole}>
          Hole {hole}{" "}
          {players.map((player) => (
            <input
              key={player.id}
              type="number"
              placeholder={player.name}
              value={scores[hole]?.[player.id] ?? ""}
              onChange={(e) => onSetScore(hole, player.id, e.target.value)}
              style={{ width: 56 }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}