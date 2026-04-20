export default function SettingsPanel({
  mode,
  setMode,
  birdieMode,
  setBirdieMode,
  birdieAmount,
  setBirdieAmount,
  handicapMode,
  setHandicapMode,
}) {
  return (
    <div>
      <h3>Settings</h3>

      <label>
        Players:
        <select value={mode} onChange={(e) => setMode(e.target.value)}>
          <option value="3p">3 Players</option>
          <option value="4p">4 Players</option>
          <option value="5p">5 Players</option>
        </select>
      </label>

            <label style={{ marginLeft: 12 }}>
        Birdie Side Bet:
        <input
          type="checkbox"
          checked={birdieMode}
          onChange={(e) => setBirdieMode(e.target.checked)}
          style={{ marginLeft: 6 }}
        />
      </label>

      {birdieMode && (
        <label style={{ marginLeft: 12 }}>
          Birdie Amount:
          <input
            type="number"
            min="0"
            step="1"
            value={birdieAmount}
            onChange={(e) => setBirdieAmount(Number(e.target.value) || 0)}
            style={{ marginLeft: 6, width: 70 }}
          />
        </label>
      )}

      {birdieMode && (
        <div style={{ marginLeft: 12, marginTop: 4, fontSize: 12, color: "#666" }}>
          Gross birdies only.
        </div>
      )}

      <label style={{ marginLeft: 12 }}>
        Handicap Mode:
        <select
          value={handicapMode}
          onChange={(e) => setHandicapMode(e.target.value)}
        >
          <option value="relative">From Lowest Player</option>
          <option value="full">Full Handicap</option>
        </select>
      </label>
    </div>
  );
}