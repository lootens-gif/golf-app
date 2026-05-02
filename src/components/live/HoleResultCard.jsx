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
    <div className="app-card" style={{ marginBottom: 12 }}>
      <h3 style={{ marginTop: 0 }}>Hole {lastHoleSaved} Result</h3>

      {holeLines.length > 0 && (
        <div style={{ marginTop: 6, marginBottom: 10, lineHeight: 1.4 }}>
  {holeLines.map((line, index) => (
    <div key={`hole-${index}`}>{line}</div>
  ))}
</div>
      )}

      {matchLines.length > 0 && (
        <div style={{ marginTop: 10, marginBottom: 10 }}>
  <strong>Match Status</strong>
  {matchLines.map((line, index) => (
    <div key={`match-${index}`} style={{ marginTop: 4 }}>
      {line}
    </div>
  ))}
</div>
      )}

      {birdieLines.length > 0 && (
        <div style={{ marginTop: 10 }}>
  <strong>Birdies</strong>
          {birdieLines.map((line, index) => (
            <div key={`birdie-${index}`}>{line}</div>
          ))}
        </div>
      )}
    </div>
  );
}