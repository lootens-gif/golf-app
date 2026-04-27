export default function HoleResultCard({
  lastHoleSaved,
  buildRealHoleResultLines,
}) {
  if (!lastHoleSaved) return null;

  const result = buildRealHoleResultLines(lastHoleSaved);

  const holeLines = Array.isArray(result)
    ? result
    : result?.holeLines || [];

  const matchLines = Array.isArray(result)
    ? []
    : result?.matchLines || [];

  const birdieLines = Array.isArray(result)
    ? []
    : result?.birdieLines || [];

  return (
    <div style={{ border: "1px solid gray", padding: 12, marginBottom: 12 }}>
      <h3 style={{ marginTop: 0 }}>Hole {lastHoleSaved} Result</h3>

      {holeLines.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          {holeLines.map((line, index) => (
            <div key={`hole-${index}`}>{line}</div>
          ))}
        </div>
      )}

      {matchLines.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <strong>Match Status</strong>
          {matchLines.map((line, index) => (
            <div key={`match-${index}`}>{line}</div>
          ))}
        </div>
      )}

      {birdieLines.length > 0 && (
        <div>
          <strong>Birdies</strong>
          {birdieLines.map((line, index) => (
            <div key={`birdie-${index}`}>{line}</div>
          ))}
        </div>
      )}
    </div>
  );
}