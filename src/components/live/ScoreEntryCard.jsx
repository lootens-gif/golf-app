import { useEffect, useState } from "react";

export default function ScoreEntryCard({
  currentHole,
  course,
  players,
  scores,
  setScore,
  onSaveHole,
}) {
  const [activePlayerId, setActivePlayerId] = useState(players?.[0]?.id ?? null);

  useEffect(() => {
    setActivePlayerId(players?.[0]?.id ?? null);
  }, [currentHole, players]);

  if (currentHole > 18) {
    return (
      <div style={{ border: "1px solid gray", padding: 12, marginBottom: 12 }}>
        <h3 style={{ marginTop: 0 }}>Round Complete</h3>
        <div>All 18 holes have been entered.</div>
      </div>
    );
  }

  const activePlayerIndex = players.findIndex((p) => p.id === activePlayerId);
  const activePlayer = players[activePlayerIndex];

  const allScoresEntered = players.every(
    (player) => scores[currentHole]?.[player.id] != null
  );

  function moveToNextPlayer() {
  if (!players.length) return;

  const nextIndex = (activePlayerIndex + 1) % players.length;
  setActivePlayerId(players[nextIndex].id);
}

function moveToPrevPlayer() {
  if (!players.length) return;

  const prevIndex =
    activePlayerIndex === 0 ? players.length - 1 : activePlayerIndex - 1;

  setActivePlayerId(players[prevIndex].id);
}

  function handleKeypadScore(value) {
    if (!activePlayer) return;

    setScore(currentHole, activePlayer.id, String(value));
    moveToNextPlayer();
  }

  return (
    <div style={{ border: "1px solid gray", padding: 12, marginBottom: 12 }}>
      <h3 style={{ marginTop: 0 }}>
        Hole {currentHole} • Par {course.pars?.[currentHole - 1] ?? "-"} • HCP{" "}
        {course.hcp?.[currentHole - 1] ?? "-"}
      </h3>

      <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
        {players.map((player) => {
          const isActive = player.id === activePlayerId;
          const score = scores[currentHole]?.[player.id] ?? "";

          return (
            <button
              key={player.id}
              type="button"
              onClick={() => setActivePlayerId(player.id)}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: 12,
                border: isActive ? "2px solid #1a73e8" : "1px solid #ccc",
                borderRadius: 6,
                background: isActive ? "#e8f0fe" : "#fff",
                fontSize: 16,
              }}
            >
              <span>{player.name}</span>
              <strong style={{ fontSize: 22 }}>{score || "-"}</strong>
            </button>
          );
        })}
      </div>

      <div
        style={{
          marginBottom: 8,
          fontWeight: "bold",
          fontSize: 16,
        }}
      >
        Enter score for: {activePlayer?.name ?? "-"}
      </div>

          <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 8,
        }}
      >
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <button
            key={num}
            type="button"
            onClick={() => handleKeypadScore(num)}
            style={{
              padding: 16,
              fontSize: 20,
              fontWeight: "bold",
            }}
          >
            {num}
          </button>
        ))}
      </div>

      <button
        disabled={!allScoresEntered}
        onClick={onSaveHole}
        style={{
          width: "100%",
          padding: 14,
          fontSize: 16,
          fontWeight: "bold",
          marginTop: 12,
          opacity: allScoresEntered ? 1 : 0.5,
        }}
      >
        Save Hole {currentHole}
      </button>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
          marginTop: 8,
          width: "100%",
        }}
      >
        <button
          type="button"
          onClick={moveToPrevPlayer}
          style={{
            padding: 12,
            fontSize: 14,
          }}
        >
          Prev Player
        </button>

        <button
          type="button"
          onClick={moveToNextPlayer}
          style={{
            padding: 12,
            fontSize: 14,
          }}
        >
          Next Player
        </button>
      </div>

    </div>
  );
}