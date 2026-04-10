export default function SettingsPanel({
  mode,
  setMode,
  birdieMode,
  setBirdieMode,
  grossBirdieAdvantage,
  setGrossBirdieAdvantage,
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
        Birdies (Team Games):
        <select
          value={birdieMode}
          onChange={(e) => setBirdieMode(e.target.value)}
        >
          <option value="off">Off</option>
          <option value="team">Team</option>
         
        </select>
      </label>

      <label style={{ marginLeft: 12 }}>
        Gross Birdie Wins:
        <input
          type="checkbox"
          checked={grossBirdieAdvantage}
          onChange={(e) => setGrossBirdieAdvantage(e.target.checked)}
        />
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