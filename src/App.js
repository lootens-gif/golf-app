import { useState } from "react";

const defaultPlayers = [
  { name: "P1", hcp: 10 },
  { name: "P2", hcp: 8 },
  { name: "P3", hcp: 12 },
  { name: "P4", hcp: 5 },
  { name: "P5", hcp: 15 },
];

export default function App() {

  // ======================
  // MODE
  // ======================
  const [mode, setMode] = useState("5p");
  const players =
    mode === "3p" ? defaultPlayers.slice(0, 3) :
    mode === "4p" ? defaultPlayers.slice(0, 4) :
    defaultPlayers;

  // ======================
  // COURSE INPUTS
  // ======================
  const [course, setCourse] = useState({
    pars: Array(18).fill(4),
    hcp: Array.from({ length: 18 }, (_, i) => i + 1)
  });

  // ======================
  // SCORES
  // ======================
  const [scores, setScores] = useState({});

  const setScore = (h, p, v) => {
    setScores(prev => ({
      ...prev,
      [h]: { ...prev[h], [p]: Number(v) }
    }));
  };

  // ======================
  // SETTINGS
  // ======================
  const [bet, setBet] = useState(1);
  const [birdieMode, setBirdieMode] = useState("off");
  const [grossBirdieAdvantage, setGrossBirdieAdvantage] = useState(false);

  // ======================
  // NET SCORING
  // ======================
  const getNet = (player, hole) => {
    const p = players.find(x => x.name === player);
    const low = Math.min(...players.map(x => x.hcp));
    const diff = p.hcp - low;

    let strokes = Math.floor(diff / 18);
    if (course.hcp[hole - 1] <= diff % 18) strokes++;

    return (scores[hole]?.[player] || 0) - strokes;
  };

  const isBirdie = (player, hole) => {
    const score = scores[hole]?.[player];
    const par = course.pars[hole - 1];
    return score && score < par;
  };

  const getBirdies = (team, hole) => {
    if (birdieMode === "off") return 0;
    return team.reduce((sum, p) => sum + (isBirdie(p, hole) ? 1 : 0), 0);
  };

  // ======================
  // WHEEL
  // ======================
  const [wheelGroups] = useState([6, 6, 6]);
  const [wheelTeams, setWheelTeams] = useState({});
  const [pressTrigger, setPressTrigger] = useState({});

  const getRange = (w) => {
    let start = wheelGroups.slice(0, w).reduce((a, b) => a + b, 0) + 1;
    return { start, end: start + wheelGroups[w] - 1 };
  };

  const playPressMatch = (A, B, start, end, w) => {
    let bets = [{ score: 0, history: [] }];

    for (let h = start; h <= end; h++) {

      let a = A.reduce((s, p) => s + getNet(p, h), 0);
      let b = B.reduce((s, p) => s + getNet(p, h), 0);

      let hole = 0;
      if (a < b) hole = 1;
      if (b < a) hole = -1;

      // gross birdie override
      if (grossBirdieAdvantage) {
        const gA = A.some(p => isBirdie(p, h));
        const gB = B.some(p => isBirdie(p, h));
        if (gA && !gB) hole = 1;
        if (gB && !gA) hole = -1;
      }

      // birdies
      hole += getBirdies(A, h);
      hole -= getBirdies(B, h);

      bets.forEach(bet => {
        bet.score += hole;
        bet.history.push(hole);
      });

      const trigger = pressTrigger[w] || 1;

      bets.forEach(bet => {
        if (Math.abs(bet.score) === trigger) {
          bets.push({ score: 0, history: [] });
        }
      });
    }

    return bets;
  };

  // ======================
  // MATCHES
  // ======================
  const [matches, setMatches] = useState([]);

  const addMatch = () => {
    setMatches([
      ...matches,
      { p1: players[0].name, p2: players[1].name, type: "standard", bet: 10 }
    ]);
  };

  const playIndividual = (m) => {
    let holes = [];
    let running = 0;

    for (let h = 1; h <= 18; h++) {
      let a = getNet(m.p1, h);
      let b = getNet(m.p2, h);

      let res = 0;
      if (a < b) res = 1;
      if (b < a) res = -1;

      if (grossBirdieAdvantage) {
        const gA = isBirdie(m.p1, h);
        const gB = isBirdie(m.p2, h);
        if (gA && !gB) res = 1;
        if (gB && !gA) res = -1;
      }

      res += getBirdies([m.p1], h);
      res -= getBirdies([m.p2], h);

      holes.push(res);
      running += res;
    }

    if (m.type === "standard" || m.type === "stroke") {
      return { total: running * m.bet, holes };
    }

    // LONG / SHORT
    let longScore = 0;
    let winnerHole = null;

    for (let i = 0; i < holes.length; i++) {
      longScore += holes[i];
      let remaining = 18 - (i + 1);

      if (Math.abs(longScore) > remaining) {
        winnerHole = i + 1;
        break;
      }
    }

    if (!winnerHole) {
      return { total: longScore * m.bet, holes };
    }

    let longResult = (longScore > 0 ? 1 : -1) * m.bet;

    let shortScore = 0;
    for (let h = winnerHole; h < 18; h++) {
      shortScore += holes[h];
    }

    let shortResult =
      shortScore === 0 ? 0 :
      (shortScore > 0 ? 1 : -1) * (m.bet / 2);

    return {
      total: longResult + shortResult,
      long: longResult,
      short: shortResult,
      winnerHole,
      holes
    };
  };

  // ======================
  // LEADERBOARD
  // ======================
  let leaderboard = {};
  players.forEach(p => leaderboard[p.name] = 0);

  matches.forEach(m => {
    const res = playIndividual(m);
    leaderboard[m.p1] -= res.total / 2;
    leaderboard[m.p2] += res.total / 2;
  });

  // ======================
  // UI
  // ======================
  return (
    <div style={{ padding: 10 }}>

      <h2>Golf Betting App</h2>

      {/* SETTINGS */}
      <div>
        Birdies:
        <select onChange={e => setBirdieMode(e.target.value)}>
          <option value="off">Off</option>
          <option value="team">Team</option>
          <option value="individual">Individual</option>
        </select>

        Gross Birdie Wins:
        <input type="checkbox"
          onChange={e => setGrossBirdieAdvantage(e.target.checked)} />
      </div>

      {/* COURSE INPUT */}
      <h3>Course</h3>
      {course.pars.map((p, i) => (
        <div key={i}>
          Hole {i + 1}
          Par:
          <input value={course.pars[i]}
            onChange={e => {
              const pars = [...course.pars];
              pars[i] = Number(e.target.value);
              setCourse({ ...course, pars });
            }} />
          HCP:
          <input value={course.hcp[i]}
            onChange={e => {
              const hcp = [...course.hcp];
              hcp[i] = Number(e.target.value);
              setCourse({ ...course, hcp });
            }} />
        </div>
      ))}

      {/* MATCHES */}
      <button onClick={addMatch}>Add Match</button>

      {matches.map((m, i) => {
        const res = playIndividual(m);

        return (
          <div key={i} style={{ border: "1px solid gray", margin: 5, padding: 5 }}>
            {m.p1} vs {m.p2}

            <select onChange={e => m.type = e.target.value}>
              <option value="standard">Standard</option>
              <option value="stroke">Stroke</option>
              <option value="longshort">Long/Short</option>
            </select>

            <div style={{ display: "flex" }}>
              {res.holes.map((h, idx) => (
                <div key={idx}
                  style={{
                    width: 18,
                    background: h > 0 ? "green" : h < 0 ? "red" : "#ccc"
                  }}>
                  {h}
                </div>
              ))}
            </div>

            <div>
              Total: ${res.total}
              {res.long !== undefined && (
                <div>Long: {res.long} Short: {res.short}</div>
              )}
            </div>
          </div>
        );
      })}

      {/* SCORES */}
      {[...Array(18)].map((_, i) => {
        const h = i + 1;
        return (
          <div key={h}>
            Hole {h}
            {players.map(p => (
              <input key={p.name}
                type="number"
                placeholder={p.name}
                onChange={e => setScore(h, p.name, e.target.value)}
                style={{ width: 50 }}
              />
            ))}
          </div>
        );
      })}

    </div>
  );
}