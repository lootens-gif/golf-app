import { useLayoutEffect, useRef } from "react";

export default function ScoreEntryCard({
  currentHole,
  course,
  players,
  scores,
  setScore,
  onSaveHole,
}) {
  const scoreInputRefs = useRef({});
  const saveHoleButtonRef = useRef(null);

  useLayoutEffect(() => {
    const firstPlayer = players?.[0];
    if (!firstPlayer) return;

    const el = scoreInputRefs.current[firstPlayer.id];

    if (el) {
        el.focus();
        el.select?.();
    }
  }, [currentHole, players]);

  if (currentHole > 18) {
  return (
    <div style={{ border: "1px solid gray", padding: 12, marginBottom: 12 }}>
      <h3 style={{ marginTop: 0 }}>Round Complete</h3>
      <div>All 18 holes have been entered.</div>
    </div>
  );
}

if (currentHole > 18) {
  return (
    <div style={{ border: "1px solid gray", padding: 12, marginBottom: 12 }}>
      <h3 style={{ marginTop: 0 }}>Round Complete</h3>
      <div>All 18 holes have been entered.</div>
    </div>
  );
}

  const allScoresEntered = players.every(
    (player) => scores[currentHole]?.[player.id] != null
  );

  return (
    <div style={{ border: "1px solid gray", padding: 12, marginBottom: 12 }}>
      <h3 style={{ marginTop: 0 }}>
        Hole {currentHole} • Par {course.pars?.[currentHole - 1] ?? "-"} • HCP{" "}
        {course.hcp?.[currentHole - 1] ?? "-"}
      </h3>

      <div style={{ display: "grid", gap: 10 }}>
        {players.map((player, playerIndex) => (
          <div
            key={player.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
            }}
          >
            <label htmlFor={`score-${currentHole}-${player.id}`}>
              {player.name}
            </label>

            <input
              ref={(el) => {
                scoreInputRefs.current[player.id] = el;
              }}
              id={`score-${currentHole}-${player.id}`}
              type="tel"
              inputMode="numeric"
              value={scores[currentHole]?.[player.id] ?? ""}
              onFocus={(e) => e.target.select()}
              onChange={(e) => {
                const rawValue = e.target.value;
                const value = rawValue.slice(-1);

                if (value !== "" && !/^[1-9]$/.test(value)) return;

                setScore(currentHole, player.id, value);

                if (value !== "") {
                  if (playerIndex < players.length - 1) {
                    const nextPlayer = players[playerIndex + 1];

                    setTimeout(() => {
                      scoreInputRefs.current[nextPlayer.id]?.focus();
                    }, 0);
                  } else {
                    setTimeout(() => {
                      saveHoleButtonRef.current?.focus();
                    }, 0);
                  }
                }
              }}
              style={{
                width: 80,
                padding: 8,
                fontSize: 18,
                textAlign: "center",
              }}
            />
          </div>
        ))}
      </div>

      <button
        ref={saveHoleButtonRef}
        disabled={!allScoresEntered}
        onClick={onSaveHole}
        style={{
          width: "100%",
          padding: 12,
          fontSize: 16,
          fontWeight: "bold",
          marginTop: 12,
          opacity: allScoresEntered ? 1 : 0.5,
        }}
      >
        Save Hole {currentHole}
      </button>
    </div>
  );
}