export default function SettingsPanel({
  mode,
  setMode,
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