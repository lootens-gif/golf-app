import { useEffect, useMemo, useRef, useState } from "react";
import { defaultPlayers } from "./data/defaultPlayers";
import {
  getActivePlayers,
  playIndividualMatch,
  buildLeaderboard,
  playPressMatch,
  scoreRound,
  buildBirdieResults,
} from "./engine/scoringEngine";
import ScoresGrid from "./components/ScoresGrid";
import DebugPanel from "./components/DebugPanel";
import SettlementSection from "./components/SettlementSection";
import SetupScreen from "./screens/SetupScreen";

const STORAGE_KEY = "golf-betting-round-setup-v5";
const LAST_ROUND_KEY = "golf-betting-last-round-v1";
const SAVED_ROUNDS_KEY = "golf-betting-saved-rounds-v1";
const LAST_NINE_POINT_PLAYERS_KEY = "golf-betting-last-nine-point-players-v1";

function createDefaultCourse() {
  return {
    name: "My Course",
    pars: Array(18).fill(4),
    hcp: Array.from({ length: 18 }, (_, i) => i + 1),
  };
}

function createDefaultAllPlayers() {
  return defaultPlayers.map((player) => ({ ...player }));
}

function getTeamGameRange(teamGames, index) {
  const start =
    teamGames.slice(0, index).reduce((sum, game) => sum + game.holes, 0) + 1;
  const end = start + teamGames[index].holes - 1;
  return { start, end };
}



function createEmptyRound() {
  return {
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
    players: [],
    mainGame: null,
    sideMatches: [],
    holeScores: {},
    results: {
      mainGameResult: null,
      sideMatchResults: [],
      sideBetResults: [],
      playerLedger: [],
      tabs: [],
    },
  };
}

export default function App() {
  const [mode, setMode] = useState("5p");
  const [allPlayers, setAllPlayers] = useState(createDefaultAllPlayers());
  const [course, setCourse] = useState(createDefaultCourse());
  const [scores, setScores] = useState({});
  const [handicapMode, setHandicapMode] = useState("relative");
  const [matches, setMatches] = useState([]);
  const [showDebug, setShowDebug] = useState(false);
  const [debugGameIndex] = useState(0);
  const [debugMatchKey] = useState("team2");
  const [savedRoundName, setSavedRoundName] = useState("");
  const [savedRounds, setSavedRounds] = useState([]);
  const [selectedSavedRoundId, setSelectedSavedRoundId] = useState("");
  const [round] = useState(createEmptyRound());
  const [screen, setScreen] = useState("setup");
  const [currentHole, setCurrentHole] = useState(1);
  const [showMatchDetails, setShowMatchDetails] = useState({});
  const [showScorecardEdit, setShowScorecardEdit] = useState(false);
  const [lastHoleSaved, setLastHoleSaved] = useState(null);
  const scoreInputRefs = useRef({});
  const saveHoleButtonRef = useRef(null);
  const [focusGameIndex, setFocusGameIndex] = useState(null);



  function createDefaultTeamGame(index = 0) {
  return {
    id: `team-game-${Date.now()}-${index}`,
    holes: 6,
    pressTrigger: 1,
    birdieEnabled: false,
    birdieBet: 0,
    teams: {},
  };
}

  const [teamGames, setTeamGames] = useState([
    createDefaultTeamGame(1),
    createDefaultTeamGame(2),
    createDefaultTeamGame(3),
  ]);

  const [teamGameUnitAmount, setTeamGameUnitAmount] = useState(1);
  const [setupMessage, setSetupMessage] = useState("");

  const players = useMemo(
    () => getActivePlayers(allPlayers, mode),
    [allPlayers, mode]
  );
  
  

  const activePlayerIds = useMemo(
    () => new Set(players.map((p) => p.id)),
    [players]
  );

useEffect(() => {
  const firstPlayer = players?.[0];
  if (!firstPlayer) return;

  const el = scoreInputRefs.current[firstPlayer.id];
  if (el) {
    setTimeout(() => {
      el.focus();
      el.select?.();
    }, 0);
  }
}, [currentHole, screen, players]);

  const context = useMemo(
    () => ({
      players,
      course,
      scores,      
      handicapMode,
    }),
    [
      players,
      course,
      scores,
      handicapMode,
    ]
  );


  function handleModeChange(nextMode) {
    setMode(nextMode);
    setSetupMessage("Mode updated.");
  }

  function handlePlayerChange(index, field, value) {
    setAllPlayers((prev) =>
      prev.map((player, i) => {
        if (i !== index) return player;

        if (field === "hcp") {
            if (value === "") {
                return {
                    ...player,
                    hcp: "",
    };
  }

            const num = Number(value);
            return {
                ...player,
                hcp: Number.isFinite(num) ? num : "",
  };
}

        return {
          ...player,
          [field]: value,
        };
      })
    );

    setSetupMessage(
      field === "hcp" ? "Handicap updated." : "Player name updated."
    );
  }

  function normalizeTeam(team) {
    return (team || []).filter(Boolean);
  }

function getTeamGameSelection(index) {
  const game = teamGames[index];

  return sanitizeGameSelection(
    game?.teams || getDefaultTeamSelection(),
    mode
  );
}
  
function getDebugMatchup() {
  if (!["4p", "5p"].includes(mode)) {
    return null;
  }

  const selected = getTeamGameSelection(debugGameIndex);
  if (!selected) return null;

  const team1 = normalizeTeam(selected.team1 || []);
  const team2 = normalizeTeam(selected.team2 || []);
  const team3 = normalizeTeam(selected.team3 || []);
  const team4 = normalizeTeam(selected.team4 || []);

  const game = teamGames[debugGameIndex];
  if (!game) return null;

  const { start, end } = getTeamGameRange(teamGames, debugGameIndex);

  if (debugMatchKey === "team2") {
    return {
      title: `Game ${debugGameIndex + 1}: Team 1 vs Team 2`,
      teamA: team1,
      teamB: team2,
      teamALabel: "Team 1",
      teamBLabel: "Team 2",
      start,
      end,
    };
  }

  if (debugMatchKey === "team3") {
    return {
      title: `Game ${debugGameIndex + 1}: Team 1 vs Team 3`,
      teamA: team1,
      teamB: team3,
      teamALabel: "Team 1",
      teamBLabel: "Team 3",
      start,
      end,
    };
  }

  if (debugMatchKey === "team4") {
    return {
      title: `Game ${debugGameIndex + 1}: Team 1 vs Team 4`,
      teamA: team1,
      teamB: team4,
      teamALabel: "Team 1",
      teamBLabel: "Team 4",
      start,
      end,
    };
  }

  return null;
}

  

function applyPreset(preset) {
  if (preset === "6-6-6") {
    setTeamGames([
      { ...createDefaultTeamGame(1), holes: 6 },
      { ...createDefaultTeamGame(2), holes: 6 },
      { ...createDefaultTeamGame(3), holes: 6 },
    ]);
    return;
  }

  if (preset === "9-9") {
    setTeamGames([
      { ...createDefaultTeamGame(1), holes: 9 },
      { ...createDefaultTeamGame(2), holes: 9 },
    ]);
  }
}
  
  function getDefaultTeamSelection() {
    const ids = players.map((p) => p.id);

    if (mode === "3p") {
      return {
        team1: [ids[0] || "", ids[1] || ""],
        team2: [ids[2] || ""],
      };
    }

    if (mode === "4p") {
      return {
        team1: [ids[0] || "", ids[1] || ""],
        team2: [ids[2] || "", ids[3] || ""],
      };
    }

    return {
      team1: [ids[0] || "", ids[1] || ""],
      team2: [ids[2] || "", ids[3] || ""],
      team3: [ids[2] || "", ids[4] || ""],
      team4: [ids[4] || "", ids[3] || ""],
    };
  }

  function getTeamValues(selection, teamKey, slots) {
    const existing = selection?.[teamKey] || [];
    return Array.from({ length: slots }, (_, i) => existing[i] || "");
  }

  function dedupePreserveOrder(values) {
    const seen = new Set();

    return values.map((value) => {
      if (!value || !activePlayerIds.has(value) || seen.has(value)) return "";
      seen.add(value);
      return value;
    });
  }

  function sanitizeGameSelection(selection, currentMode) {
    const safeSelection = selection || getDefaultTeamSelection();

    if (currentMode === "3p") {
      const team1 = dedupePreserveOrder(getTeamValues(safeSelection, "team1", 2));
      const team1Set = new Set(team1.filter(Boolean));
      const rawTeam2 = getTeamValues(safeSelection, "team2", 1).map((id) =>
        team1Set.has(id) ? "" : id
      );

      return {
        team1,
        team2: dedupePreserveOrder(rawTeam2),
      };
    }

    if (currentMode === "4p") {
      const team1 = dedupePreserveOrder(getTeamValues(safeSelection, "team1", 2));
      const team1Set = new Set(team1.filter(Boolean));
      const rawTeam2 = getTeamValues(safeSelection, "team2", 2).map((id) =>
        team1Set.has(id) ? "" : id
      );

      return {
        team1,
        team2: dedupePreserveOrder(rawTeam2),
      };
    }

    const team1 = dedupePreserveOrder(getTeamValues(safeSelection, "team1", 2));
    const team1Set = new Set(team1.filter(Boolean));

    const sanitizeAgainstTeam1 = (teamKey) =>
      dedupePreserveOrder(
        getTeamValues(safeSelection, teamKey, 2).map((id) =>
          team1Set.has(id) ? "" : id
        )
      );

    return {
      team1,
      team2: sanitizeAgainstTeam1("team2"),
      team3: sanitizeAgainstTeam1("team3"),
      team4: sanitizeAgainstTeam1("team4"),
    };
  }

  function hasDuplicateSelections(selection, currentMode) {
    const hasDupesWithinTeam = (team) => {
      const clean = (team || []).filter(Boolean);
      return new Set(clean).size !== clean.length;
    };

    if (currentMode === "3p") {
      const team1 = (selection.team1 || []).filter(Boolean);
      const team2 = (selection.team2 || []).filter(Boolean);

      if (hasDupesWithinTeam(team1) || hasDupesWithinTeam(team2)) {
        return true;
      }

      const all = [...team1, ...team2];
      return new Set(all).size !== all.length;
    }

    if (currentMode === "4p") {
      const team1 = (selection.team1 || []).filter(Boolean);
      const team2 = (selection.team2 || []).filter(Boolean);

      if (hasDupesWithinTeam(team1) || hasDupesWithinTeam(team2)) {
        return true;
      }

      const all = [...team1, ...team2];
      return new Set(all).size !== all.length;
    }

    const team1 = (selection.team1 || []).filter(Boolean);
    const team2 = (selection.team2 || []).filter(Boolean);
    const team3 = (selection.team3 || []).filter(Boolean);
    const team4 = (selection.team4 || []).filter(Boolean);

    if (
      hasDupesWithinTeam(team1) ||
      hasDupesWithinTeam(team2) ||
      hasDupesWithinTeam(team3) ||
      hasDupesWithinTeam(team4)
    ) {
      return true;
    }

    const teamKey = (team) => [...team].sort().join("|");
    const keys = [team1, team2, team3, team4]
      .filter((team) => team.length > 0)
      .map(teamKey);

    return new Set(keys).size !== keys.length;
  }



  function updateTeamGameTeam(index, teamKey, slotIndex, value) {
  const current = getTeamGameSelection(index);
  const nextTeam = [...(current[teamKey] || [])];
  nextTeam[slotIndex] = value;

  let nextSelection = {
    ...current,
    [teamKey]: nextTeam,
  };

  // 🔥 AUTO-BUILD TEAMS

  // ===== 5 PLAYER =====
  if (mode === "5p" && teamKey === "team1") {
    const team1 = nextSelection.team1 || [];

    if (team1.filter(Boolean).length === 2) {
      const team1Set = new Set(team1);

      const remaining = players
        .map((p) => p.id)
        .filter((id) => !team1Set.has(id));

      if (remaining.length === 3) {
        const [p3, p4, p5] = remaining;

        nextSelection.team2 = [p3, p4];
        nextSelection.team3 = [p3, p5];
        nextSelection.team4 = [p4, p5];
      }
    }
  }

  // ===== 4 PLAYER =====
  if (mode === "4p" && teamKey === "team1") {
    const team1 = nextSelection.team1 || [];

    if (team1.filter(Boolean).length === 2) {
      const team1Set = new Set(team1);

      const remaining = players
        .map((p) => p.id)
        .filter((id) => !team1Set.has(id));

      if (remaining.length === 2) {
        nextSelection.team2 = remaining;
      }
    }
  }

  // ===== 3 PLAYER =====
  if (mode === "3p" && teamKey === "team1") {
    const team1 = nextSelection.team1 || [];

    if (team1.filter(Boolean).length === 2) {
      const team1Set = new Set(team1);

      const remaining = players
        .map((p) => p.id)
        .filter((id) => !team1Set.has(id));

      if (remaining.length === 1) {
        nextSelection.team2 = [remaining[0]];
      }
    }
  }

  nextSelection = sanitizeGameSelection(nextSelection, mode);

  if (hasDuplicateSelections(nextSelection, mode)) {
    setSetupMessage("Duplicate players in team selections are not allowed.");
    return;
  }

  setTeamGames((prev) =>
    prev.map((game, i) =>
      i === index
        ? {
            ...game,
            teams: nextSelection,
          }
        : game
    )
  );
}

  function getAvailablePlayersForTeam(gameIndex, teamKey, slotIndex) {
    const selection = getTeamGameSelection(gameIndex);

    if (mode === "3p") {
      if (teamKey === "team1") {
        const otherSelected = (selection.team1 || []).filter(
          (value, idx) => idx !== slotIndex && value
        );
        const blocked = new Set(otherSelected);

        return players.filter(
          (player) =>
            !blocked.has(player.id) ||
            player.id === (selection.team1?.[slotIndex] || "")
        );
      }

      const team1Set = new Set((selection.team1 || []).filter(Boolean));
      return players.filter(
        (player) =>
          !team1Set.has(player.id) ||
          player.id === (selection.team2?.[0] || "")
      );
    }

    if (mode === "4p") {
      if (teamKey === "team1") {
        const otherSelected = (selection.team1 || []).filter(
          (value, idx) => idx !== slotIndex && value
        );
        const blocked = new Set(otherSelected);

        return players.filter(
          (player) =>
            !blocked.has(player.id) ||
            player.id === (selection.team1?.[slotIndex] || "")
        );
      }

      const team1Set = new Set((selection.team1 || []).filter(Boolean));
      const sameTeamOthers = (selection.team2 || []).filter(
        (value, idx) => idx !== slotIndex && value
      );
      const blocked = new Set([...team1Set, ...sameTeamOthers]);

      return players.filter(
        (player) =>
          !blocked.has(player.id) ||
          player.id === (selection.team2?.[slotIndex] || "")
      );
    }

    if (teamKey === "team1") {
      const otherSelected = (selection.team1 || []).filter(
        (value, idx) => idx !== slotIndex && value
      );
      const blocked = new Set(otherSelected);

      return players.filter(
        (player) =>
          !blocked.has(player.id) ||
          player.id === (selection.team1?.[slotIndex] || "")
      );
    }

    const team1Set = new Set((selection.team1 || []).filter(Boolean));
    const sameTeamOthers = (selection[teamKey] || []).filter(
      (value, idx) => idx !== slotIndex && value
    );
    const blocked = new Set([...team1Set, ...sameTeamOthers]);

    return players.filter(
      (player) =>
        !blocked.has(player.id) ||
        player.id === (selection[teamKey]?.[slotIndex] || "")
    );
  }

  function renderPlayerSelect(gameIndex, teamKey, slotIndex) {
    const selection = getTeamGameSelection(gameIndex);
    const value = selection[teamKey]?.[slotIndex] || "";
    const options = getAvailablePlayersForTeam(gameIndex, teamKey, slotIndex);

    return (
      <select
        key={`${teamKey}-${slotIndex}`}
        value={value}
        onChange={(e) =>
          updateTeamGameTeam(gameIndex, teamKey, slotIndex, e.target.value)
        }
      >
        <option value="">Select</option>
        {options.map((player) => (
          <option key={player.id} value={player.id}>
            {player.name}
          </option>
        ))}
      </select>
    );
  }

  function renderTeamSelectors(gameIndex) {
    if (mode === "5p") {
      return (
        <>
          <div style={{ marginTop: 8 }}>
            <strong>Team 1</strong>
            <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
              {[0, 1].map((slotIndex) =>
                renderPlayerSelect(gameIndex, "team1", slotIndex)
              )}
            </div>
          </div>

          <div style={{ marginTop: 8 }}>
            <strong>Team 2</strong>
            <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
              {[0, 1].map((slotIndex) =>
                renderPlayerSelect(gameIndex, "team2", slotIndex)
              )}
            </div>
          </div>

          <div style={{ marginTop: 8 }}>
            <strong>Team 3</strong>
            <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
              {[0, 1].map((slotIndex) =>
                renderPlayerSelect(gameIndex, "team3", slotIndex)
              )}
            </div>
          </div>

          <div style={{ marginTop: 8 }}>
            <strong>Team 4</strong>
            <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
              {[0, 1].map((slotIndex) =>
                renderPlayerSelect(gameIndex, "team4", slotIndex)
              )}
            </div>
          </div>
        </>
      );
    }

    if (mode === "4p") {
      return (
        <>
          <div style={{ marginTop: 8 }}>
            <strong>Team 1</strong>
            <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
              {[0, 1].map((slotIndex) =>
                renderPlayerSelect(gameIndex, "team1", slotIndex)
              )}
            </div>
          </div>

          <div style={{ marginTop: 8 }}>
            <strong>Team 2</strong>
            <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
              {[0, 1].map((slotIndex) =>
                renderPlayerSelect(gameIndex, "team2", slotIndex)
              )}
            </div>
          </div>
        </>
      );
    }

    return (
      <>
        <div style={{ marginTop: 8 }}>
          <strong>Team 1 (2 players)</strong>
          <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
            {[0, 1].map((slotIndex) =>
              renderPlayerSelect(gameIndex, "team1", slotIndex)
            )}
          </div>
        </div>

        <div style={{ marginTop: 8 }}>
          <strong>Team 2 (1 player)</strong>
          <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
            {renderPlayerSelect(gameIndex, "team2", 0)}
          </div>
        </div>
      </>
    );
  }

function addMatch() {
  if (players.length < 2) return;

  setMatches((prev) => [
    ...prev,
    {
      id: crypto.randomUUID(),
      p1Id: players[0].id,
      p2Id: players[1].id,
      type: "standard",
      bet: 10,
      birdieEnabled: false,
      birdieBet: 5,
      strokeScoring: "net",
      strokePayoutMode: "winloss",
      strokeFront: true,
      strokeBack: true,
      strokeTotal: true,
    },
  ]);
}

function addNinePointMatch() {
  if (players.length < 3) return;

  let defaultIds = [players[0]?.id, players[1]?.id, players[2]?.id].filter(Boolean);

  try {
    const saved = JSON.parse(
      localStorage.getItem(LAST_NINE_POINT_PLAYERS_KEY) || "null"
    );

    if (
      Array.isArray(saved) &&
      saved.length === 3 &&
      saved.every((id) => players.some((p) => p.id === id))
    ) {
      defaultIds = saved;
    }
  } catch {
    // ignore localStorage issues
  }

  setMatches((prev) => [
    ...prev,
    {
      id: crypto.randomUUID(),
      gameType: "ninePoint",
      p1Id: defaultIds[0],
      p2Id: defaultIds[1],
      p3Id: defaultIds[2],
      blitzEnabled: true,
      bet: 1,
      birdieEnabled: false,
      birdieBet: 1,
    },
  ]);
}

  function updateMatch(id, patch) {
  setMatches((prev) => {
    const next = prev.map((m) => (m.id === id ? { ...m, ...patch } : m));

    const updated = next.find((m) => m.id === id);

    if (updated?.gameType === "ninePoint") {
      const trio = [updated.p1Id, updated.p2Id, updated.p3Id];

      if (trio.every(Boolean) && new Set(trio).size === 3) {
        localStorage.setItem(
          LAST_NINE_POINT_PLAYERS_KEY,
          JSON.stringify(trio)
        );
      }
    }

    return next;
  });
}

  function removeMatch(id) {
    setMatches((prev) => prev.filter((m) => m.id !== id));
  }

  const matchResults = useMemo(() => {
    return matches.map((match) => ({
      match,
      result: playIndividualMatch(match, context),
    }));
  }, [matches, context]);



  const debugMatchup = getDebugMatchup();

  const teamGameResults = teamGames.map((game, index) => {
  const { start, end } = getTeamGameRange(teamGames, index);
  const selected = getTeamGameSelection(index);
  const trigger = game.pressTrigger ?? 1;

  if (hasDuplicateSelections(selected, mode)) {
    return {
      index,
      start,
      end,
      duplicateError: true,
      matches: [],
    };
  }

  if (mode === "5p") {
    const team1 = normalizeTeam(selected.team1 || []);
    const team2 = normalizeTeam(selected.team2 || []);
    const team3 = normalizeTeam(selected.team3 || []);
    const team4 = normalizeTeam(selected.team4 || []);

    const teamMatches = [];

    if (team1.length === 2 && team2.length === 2) {
      teamMatches.push({
        label: "Team 1 vs Team 2",
        result: playPressMatch({
          teamA: team1,
          teamB: team2,
          start,
          end,
          trigger,
          context,
        }),
        
      });
    }

    if (team1.length === 2 && team3.length === 2) {
      teamMatches.push({
        label: "Team 1 vs Team 3",
        result: playPressMatch({
          teamA: team1,
          teamB: team3,
          start,
          end,
          trigger,
          context,
        }),
        
      });
    }

    if (team1.length === 2 && team4.length === 2) {
      teamMatches.push({
        label: "Team 1 vs Team 4",
        result: playPressMatch({
          teamA: team1,
          teamB: team4,
          start,
          end,
          trigger,
          context,
        }),
      });
    }

    return {
      index,
      start,
      end,
      duplicateError: false,
      matches: teamMatches,
    };
  }

  if (mode === "4p") {
    const team1 = normalizeTeam(selected.team1 || []);
    const team2 = normalizeTeam(selected.team2 || []);

    const teamMatches = [];
    if (team1.length === 2 && team2.length === 2) {
      teamMatches.push({
        label: "Team 1 vs Team 2",
        result: playPressMatch({
          teamA: team1,
          teamB: team2,
          start,
          end,
          trigger,
          context,
        }),
      });
    }

    return {
      index,
      start,
      end,
      duplicateError: false,
      matches: teamMatches,
    };
  }

  const team1 = normalizeTeam(selected.team1 || []);
  const team2 = normalizeTeam(selected.team2 || []);

  const teamMatches = [];
  if (team1.length === 2 && team2.length === 1) {
    teamMatches.push({
      label: "Team 1 vs Team 2",
      result: playPressMatch({
        teamA: team1,
        teamB: team2,
        start,
        end,
        trigger,
        context,
      }),
    });
  }

  return {
    index,
    start,
    end,
    duplicateError: false,
    matches: teamMatches,
  };
});


console.log("teamGameResults sample", teamGameResults?.[0]);
console.log("teamGameResults first match", teamGameResults?.[0]?.matches?.[0]);
console.log(
  "teamGameResults first match result[0]",
  teamGameResults?.[0]?.matches?.[0]?.result?.[0]
);


console.log("teamGame selection 0", getTeamGameSelection(0));
console.log(
  "teamGame selection 0 full",
  JSON.stringify(getTeamGameSelection(0), null, 2)
);

console.log(
  "teamGame first match full JSON",
  JSON.stringify(teamGameResults?.[0]?.matches?.[0], null, 2)
);

console.log(
  "teamGame first game full JSON",
  JSON.stringify(teamGameResults?.[0], null, 2)
);



console.log("scores full JSON", JSON.stringify(scores, null, 2));
console.log("score keys", Object.keys(scores || {}));

const firstScoreKey = Object.keys(scores || {})[0];
console.log("first score key", firstScoreKey);
console.log(
  "first score entry",
  JSON.stringify(firstScoreKey ? scores[firstScoreKey] : null, null, 2)
);
console.log("course shape sample", JSON.stringify(course?.holes?.[0] || course, null, 2));
console.log("mode", mode);

const birdieResults = buildBirdieResults({
  matches,
  matchResults,
  teamGames,
  teamGameResults,
  scores,
  course,
  getTeamGameSelection,
});

console.log("BIRDIE RESULTS DEBUG", birdieResults);

const computedResults = scoreRound(round, {
  players,
  scores,
  course,
  matches,
  matchResults,
  teamGames,
  teamGameResults,
  teamGameUnitAmount,
  getTeamGameSelection,
  mode,
  birdieResults,
});

const leaderboard = useMemo(() => {
  return buildLeaderboard(computedResults.playerLedger, { players });
}, [computedResults, players]);

  function saveSetup() {
    try {
      const setup = {
        mode,
        allPlayers,
        course,
        handicapMode,
        teamGameUnitAmount,
        teamGames,
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(setup));
      setSetupMessage("Setup saved.");
    } catch (error) {
      setSetupMessage("Could not save setup.");
    }
  }

  function loadSetup() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setSetupMessage("No saved setup found.");
        return;
      }

      const setup = JSON.parse(raw);

      if (setup.mode) setMode(setup.mode);
      if (Array.isArray(setup.allPlayers)) setAllPlayers(setup.allPlayers);
      if (setup.course) setCourse(setup.course);      
      if (setup.handicapMode) setHandicapMode(setup.handicapMode);
      if (typeof setup.teamGameUnitAmount === "number") {
        setTeamGameUnitAmount(setup.teamGameUnitAmount);
      }
      if (Array.isArray(setup.teamGames)) {
        setTeamGames(
  setup.teamGames.map((game, index) => ({
    id: game.id || `team-game-${Date.now()}-${index}`,
    holes: Number(game.holes) || 6,
    pressTrigger: Number(game.pressTrigger) || 1,
    birdieEnabled: !!game.birdieEnabled,
    birdieBet: Number(game.birdieBet) || 0,
    teams: game.teams || {},
  }))
);
      } else {
        setTeamGames([
          createDefaultTeamGame(1),
          createDefaultTeamGame(2),
          createDefaultTeamGame(3),
        ]);
      }

      setScores({});
      setMatches([]);
      setSetupMessage("Setup loaded. Round data reset.");
    } catch (error) {
      setSetupMessage("Could not load setup.");
    }
  }

function loadLastRound() {
  try {
    const raw = localStorage.getItem(LAST_ROUND_KEY);
    if (!raw) {
      setSetupMessage("No saved round found.");
      return;
    }

    const round = JSON.parse(raw);


    if (round.mode) setMode(round.mode);
    if (Array.isArray(round.allPlayers)) setAllPlayers(round.allPlayers);
    if (round.course) setCourse(round.course);
    if (round.scores) setScores(round.scores);    
    if (round.handicapMode) setHandicapMode(round.handicapMode);
    if (typeof round.teamGameUnitAmount === "number") {
      setTeamGameUnitAmount(round.teamGameUnitAmount);
    }
    
    if (Array.isArray(round.teamGames)) {
      setTeamGames(
        round.teamGames.map((game, index) => ({
          id: game.id || `team-game-${Date.now()}-${index}`,
          holes: Number(game.holes) || 6,
          pressTrigger: Number(game.pressTrigger) || 1,
          teams: game.teams || {},
        }))
      );
    }
    if (Array.isArray(round.matches)) {
      setMatches(round.matches);
    }

    setSetupMessage("Last round loaded.");
  } catch (error) {
    setSetupMessage("Could not load last round.");
  }
}

function saveLastRound() {
  try {
    const round = {
      mode,
      allPlayers,
      course,
      scores,
      handicapMode,
      teamGameUnitAmount,
      teamGames,
      matches,
    };

    localStorage.setItem(LAST_ROUND_KEY, JSON.stringify(round));
    setSetupMessage("Last round saved.");
  } catch (error) {
    setSetupMessage("Could not save last round.");
  }
}

 function buildCurrentRoundSnapshot() {
  return {
    mode,
    allPlayers,
    course,
    scores,
    handicapMode,
    teamGameUnitAmount,
    teamGames,
    matches,
  };
}

function saveNamedRound() {
  const trimmedName = savedRoundName.trim();

  if (!trimmedName) {
    setSetupMessage("Enter a round name first.");
    return;
  }

  try {
    const round = {
      id: crypto.randomUUID(),
      name: trimmedName,
      savedAt: new Date().toISOString(),
      data: buildCurrentRoundSnapshot(),
    };

    const nextRounds = [round, ...savedRounds];
    setSavedRounds(nextRounds);
    localStorage.setItem(SAVED_ROUNDS_KEY, JSON.stringify(nextRounds));
    setSelectedSavedRoundId(round.id);
    setSetupMessage("Named round saved.");
  } catch (error) {
    setSetupMessage("Could not save named round.");
  }
}

function loadNamedRound() {
  if (!selectedSavedRoundId) {
    setSetupMessage("Select a saved round first.");
    return;
  }

  const selectedRound = savedRounds.find(
    (round) => round.id === selectedSavedRoundId
  );

  if (!selectedRound || !selectedRound.data) {
    setSetupMessage("Saved round not found.");
    return;
  }

  const round = selectedRound.data;

  try {
    if (round.mode) setMode(round.mode);
    if (Array.isArray(round.allPlayers)) setAllPlayers(round.allPlayers);
    if (round.course) setCourse(round.course);
    if (round.scores) setScores(round.scores);  
    if (round.handicapMode) setHandicapMode(round.handicapMode);
    if (typeof round.teamGameUnitAmount === "number") {
      setTeamGameUnitAmount(round.teamGameUnitAmount);
    }
    if (Array.isArray(round.teamGames)) {
      setTeamGames(
        round.teamGames.map((game, index) => ({
          id: game.id || `team-game-${Date.now()}-${index}`,
          holes: Number(game.holes) || 6,
          pressTrigger: Number(game.pressTrigger) || 1,
          teams: game.teams || {},
        }))
      );
    }
    if (Array.isArray(round.matches)) {
      setMatches(round.matches);
    }

    setSetupMessage("Named round loaded.");
  } catch (error) {
    setSetupMessage("Could not load named round.");
  }
}

function deleteNamedRound() {
  if (!selectedSavedRoundId) {
    setSetupMessage("Select a saved round first.");
    return;
  }

  try {
    const nextRounds = savedRounds.filter(
      (round) => round.id !== selectedSavedRoundId
    );

    setSavedRounds(nextRounds);
    localStorage.setItem(SAVED_ROUNDS_KEY, JSON.stringify(nextRounds));
    setSelectedSavedRoundId("");
    setSetupMessage("Named round deleted.");
  } catch (error) {
    setSetupMessage("Could not delete named round.");
  }
}

function resetSetup() {
  setMode("5p");
  setAllPlayers(createDefaultAllPlayers());
  setCourse(createDefaultCourse());
  setHandicapMode("relative");
  setTeamGameUnitAmount(1);
  setScores({});
  setMatches([]);
  setTeamGames([
    createDefaultTeamGame(1),
    createDefaultTeamGame(2),
    createDefaultTeamGame(3),
  ]);
  setSetupMessage("Setup reset.");
}

  function setScore(hole, playerId, value) {
    const next = value === "" ? null : Number(value);
    if (value !== "" && !Number.isFinite(next)) return;

    setScores((prev) => ({
      ...prev,
      [hole]: {
        ...prev[hole],
        [playerId]: next,
      },
    }));
  }

  function updateCoursePar(index, value) {
   if (value === "") {
    setCourse((prev) => {
      const pars = [...prev.pars];
      pars[index] = "";
      return { ...prev, pars };
    });
    return;
  }

  const num = Number(value);
  if (!Number.isFinite(num)) return;

  const clamped = Math.min(6, Math.max(3, num));

  setCourse((prev) => {
    const pars = [...prev.pars];
    pars[index] = clamped;
    return { ...prev, pars };
  });
}

  function updateCourseHcp(index, value) {
   if (value === "") {
    setCourse((prev) => {
      const hcp = [...prev.hcp];
      hcp[index] = "";
      return { ...prev, hcp };
    });
    return;
  }

  const num = Number(value);
  if (!Number.isFinite(num)) return;

  const clamped = Math.min(18, Math.max(1, num));

  setCourse((prev) => {
    const hcp = [...prev.hcp];
    hcp[index] = clamped;
    return { ...prev, hcp };
  });
}

  function updateCourseName(value) {
    setCourse((prev) => ({
      ...prev,
      name: value,
    }));
  }

  const totalHoles = teamGames.reduce(
    (sum, game) => sum + (Number(game.holes) || 0),
    0
  );

useEffect(() => {
  if (!setupMessage) return;

  const timer = setTimeout(() => {
    setSetupMessage("");
  }, 2500);

  return () => clearTimeout(timer);
}, [setupMessage]);

useEffect(() => {
  try {
    const raw = localStorage.getItem(SAVED_ROUNDS_KEY);
    if (!raw) return;

    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      setSavedRounds(parsed);
    }
  } catch (error) {
    // ignore load failures
  }
}, []);

// Helpers to get the current team selection for a game, ensuring it always has the correct shape

function startRound() {
  if (teamGames.length > 0 && totalHoles !== 18) {
    setSetupMessage(`Team game holes must equal 18. Currently ${totalHoles}.`);
    alert(`Team game holes must equal 18. Currently ${totalHoles}.`);
    return;
  }

  const hasTeamGame =
    Array.isArray(teamGames) &&
    teamGames.length > 0 &&
    teamGames.some((game, index) => {
      const selection = getTeamGameSelection(index);

      if (!selection) return false;

      if (mode === "5p") {
        return (
          (selection.team1 || []).filter(Boolean).length === 2 &&
          (selection.team2 || []).filter(Boolean).length === 2 &&
          (selection.team3 || []).filter(Boolean).length === 2 &&
          (selection.team4 || []).filter(Boolean).length === 2
        );
      }

      if (mode === "4p") {
        return (
          (selection.team1 || []).filter(Boolean).length === 2 &&
          (selection.team2 || []).filter(Boolean).length === 2
        );
      }

      if (mode === "3p") {
        return (
          (selection.team1 || []).filter(Boolean).length === 2 &&
          (selection.team2 || []).filter(Boolean).length === 1
        );
      }

      return false;
    });

  const hasMatch =
    Array.isArray(matches) &&
    matches.some((match) => {
      if (match.gameType === "ninePoint") {
        return match.p1Id && match.p2Id && match.p3Id;
      }

      return match.p1Id && match.p2Id;
    });

  if (!hasTeamGame && !hasMatch) {
    setSetupMessage("Choose at least one valid game before starting.");
    alert("Choose at least one valid game before starting.");
    return;
  }

  if (lastHoleSaved != null) {
  setCurrentHole(lastHoleSaved + 1);
} else {
  setCurrentHole(1);
}
  setLastHoleSaved(null);
  setScreen("live");
}

function finishRound() {
  setScreen("results");
}

function backToSetup() {
  setScreen("setup");
}

function goToResults() {
  setScreen("results");
}

function goToLive() {
  setScreen("live");
}



function getLedgerEntryLabel(entry) {
  return (
    entry.label ||
    entry.description ||
    entry.game ||
    entry.gameType ||
    entry.type ||
    "Betting result"
  );
}

function getLedgerEntryPlayerName(entry) {
  const playerId =
    entry.playerId ||
    entry.toPlayerId ||
    entry.winnerId ||
    entry.player ||
    null;

  if (!playerId) return "";

  return players.find((p) => p.id === playerId)?.name || playerId;
}

function getLedgerEntryAmount(entry) {
  return (
    entry.amount ??
    entry.value ??
    entry.dollars ??
    entry.net ??
    entry.total ??
    0
  );
}

function buildRealHoleResultLines(holeNumber) {
  const lines = [];

  const holeScores = scores[holeNumber] || {};
  const scoredPlayers = players
    .map((player) => ({
      player,
      score: Number(holeScores[player.id]),
    }))
    .filter((entry) => Number.isFinite(entry.score));

  if (scoredPlayers.length < 2) {
    return ["No result yet."];
  }

  const bestScore = Math.min(...scoredPlayers.map((entry) => entry.score));
  const winners = scoredPlayers.filter((entry) => entry.score === bestScore);

  if (winners.length === 1) {
    lines.push(`${winners[0].player.name} wins hole`);
  } else {
    lines.push("Hole halved");
  }

  const par = Number(course.pars?.[holeNumber - 1]);
  const activeGame = teamGames.find((game, index) => {
    const range = getTeamGameRange(teamGames, index);
    return holeNumber >= range.start && holeNumber <= range.end;
  });

  const birdieBet = Number(activeGame?.birdieBet || 0);
  const birdiesEnabled = !!activeGame?.birdieEnabled && birdieBet > 0;

  if (Number.isFinite(par)) {
    const birdies = scoredPlayers.filter((entry) => entry.score === par - 1);

    birdies.forEach((entry) => {
      if (birdiesEnabled) {
        lines.push(`${entry.player.name} birdie (+$${birdieBet})`);
      } else {
        lines.push(`${entry.player.name} birdie`);
      }
    });
  }

  return lines;
}

 // ===== FINAL APP RETURN (DO NOT TOUCH INNER RETURNS ABOVE) =====
return (
  <div style={{ padding: 12 }}>
    <h2>Golf Betting App</h2>

    {screen === "setup" && (
  <SetupScreen
    mode={mode}
    handleModeChange={handleModeChange}
    handicapMode={handicapMode}
    setHandicapMode={setHandicapMode}
    players={players}
    handlePlayerChange={handlePlayerChange}
    saveSetup={saveSetup}
    loadSetup={loadSetup}
    resetSetup={resetSetup}
    saveLastRound={saveLastRound}
    loadLastRound={loadLastRound}
    savedRoundName={savedRoundName}
    setSavedRoundName={setSavedRoundName}
    saveNamedRound={saveNamedRound}
    savedRounds={savedRounds}
    selectedSavedRoundId={selectedSavedRoundId}
    setSelectedSavedRoundId={setSelectedSavedRoundId}
    loadNamedRound={loadNamedRound}
    deleteNamedRound={deleteNamedRound}
    setupMessage={setupMessage}
    course={course}
    updateCourseName={updateCourseName}
    updateCoursePar={updateCoursePar}
    updateCourseHcp={updateCourseHcp}
    teamGameUnitAmount={teamGameUnitAmount}
    setTeamGameUnitAmount={setTeamGameUnitAmount}
    applyPreset={applyPreset}
    setTeamGames={setTeamGames}
    teamGames={teamGames}
    totalHoles={totalHoles}
    getTeamGameRange={getTeamGameRange}
    hasDuplicateSelections={hasDuplicateSelections}
    getTeamGameSelection={getTeamGameSelection}
    renderTeamSelectors={renderTeamSelectors}
    addMatch={addMatch}
    addNinePointMatch={addNinePointMatch}
    matches={matches}
    matchResults={matchResults}
    updateMatch={updateMatch}
    removeMatch={removeMatch}
    startRound={startRound}
    createDefaultTeamGame={createDefaultTeamGame}
    focusGameIndex={focusGameIndex}
  />
)}

    {screen === "live" && (
      <>
        <div
          style={{
            position: "sticky",
            top: 0,
            background: "white",
            border: "1px solid #ccc",
            padding: 12,
            marginBottom: 12,
            zIndex: 10,
          }}
        >
          <div style={{ fontSize: 12, color: "#666" }}>Projected Settlement</div>
          <strong>
            {leaderboard && players.length > 0
              ? (() => {
                  const sorted = [...players].sort(
                    (a, b) => (leaderboard[b.id] ?? 0) - (leaderboard[a.id] ?? 0)
                  );
                  const top = sorted[0];
                  const amount = leaderboard[top.id] ?? 0;
                  return amount === 0 ? "Even" : `${top.name} ${amount > 0 ? "wins" : "owes"} $${Math.abs(amount)}`;
                })()
              : "Even"}
          </strong>
        </div>

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
        type="number"
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
          disabled={!players.every((player) => scores[currentHole]?.[player.id] != null)}
 onClick={() => {
  const nextHole = currentHole + 1;

  setLastHoleSaved(currentHole);

  if (currentHole >= 18) {
    finishRound();
    return;
  }

  const nextGameIndex = teamGames.findIndex((game, index) => {
    const range = getTeamGameRange(teamGames, index);
    return nextHole >= range.start && nextHole <= range.end;
  });

  if (nextGameIndex >= 0) {
    const selection = getTeamGameSelection(nextGameIndex);

    const hasValidTeams =
      mode === "5p"
        ? (selection.team1 || []).filter(Boolean).length === 2 &&
          (selection.team2 || []).filter(Boolean).length === 2 &&
          (selection.team3 || []).filter(Boolean).length === 2 &&
          (selection.team4 || []).filter(Boolean).length === 2
        : mode === "4p"
        ? (selection.team1 || []).filter(Boolean).length === 2 &&
          (selection.team2 || []).filter(Boolean).length === 2
        : (selection.team1 || []).filter(Boolean).length === 2 &&
          (selection.team2 || []).filter(Boolean).length === 1;

    if (!hasValidTeams) {
  setSetupMessage(`Set teams for Game ${nextGameIndex + 1} before continuing.`);
  setFocusGameIndex(nextGameIndex);
  setScreen("setup");
  return;
}
  }

  setCurrentHole(nextHole);
}}
  style={{
    width: "100%",
    padding: 12,
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 12,
    opacity: players.every((player) => scores[currentHole]?.[player.id] != null)
      ? 1
      : 0.5,
  }}
  
>
  Save Hole {currentHole}
</button>

        </div>

        {lastHoleSaved && (
  <div style={{ border: "1px solid #ccc", padding: 12, marginBottom: 12 }}>
    <h3 style={{ marginTop: 0 }}>Hole {lastHoleSaved} Result</h3>

    {buildRealHoleResultLines(lastHoleSaved).map((line, index) => (
      <div key={index}>{line}</div>
    ))}
  </div>
)}

<div style={{ border: "1px solid #ccc", padding: 12, marginBottom: 12 }}>
<h3 style={{ marginTop: 0 }}>Current Game</h3>
  {teamGames.map((game, index) => {
  const range = getTeamGameRange(teamGames, index);

const activeGameSelection = getTeamGameSelection(index);
const currentGameResult = teamGameResults.find(
  (result) => result.index === index
);

const matchupLines = [];

function teamName(teamIds = []) {
  return teamIds
    .filter(Boolean)
    .map((id) => players.find((p) => p.id === id)?.name || id)
    .join(" / ");
}

(currentGameResult?.matches || []).forEach((matchup) => {
  const parts = matchup.label.split(" ");
  const teamAKey = `team${parts[1] || ""}`.toLowerCase();
  const teamBKey = `team${parts[4] || ""}`.toLowerCase();

  const teamAPlayers = activeGameSelection?.[teamAKey] || [];
  const teamBPlayers = activeGameSelection?.[teamBKey] || [];

  const units = (matchup.result || []).reduce((sum, item) => {
    const score = item.score || 0;
    if (score > 0) return sum + 1;
    if (score < 0) return sum - 1;
    return sum;
  }, 0);

  let resultText = "Even";

  if (units > 0) {
    resultText = `${teamName(teamAPlayers)} won ${units}`;
  }

  if (units < 0) {
    resultText = `${teamName(teamBPlayers)} won ${Math.abs(units)}`;
  }

  matchupLines.push(
    `${teamName(teamAPlayers)} vs ${teamName(teamBPlayers)}: ${resultText}`
  );
});

let status = "Not started";

  let holesPlayed = 0;

  if (currentHole > range.end) {
    status = "Complete";
    holesPlayed = Number(game.holes) || 0;
  } else if (currentHole >= range.start && currentHole <= range.end) {
    status = "In progress";
holesPlayed = Math.max(0, currentHole - range.start);
  }

if (status === "Not started") return null;

const playerSummary = currentGameResult?.gameUnitTotals || {};

  return (
    <div key={game.id} style={{ marginBottom: 8 }}>
      <strong>
        Game {index + 1}: Holes {range.start}-{range.end}
      </strong>
      <div>{status}</div>
     {Object.entries(playerSummary)
  .filter(([, value]) => value !== 0)
  .sort((a, b) => b[1] - a[1])
  .map(([playerId, value]) => {
    const name = players.find((p) => p.id === playerId)?.name || playerId;

    return (
      <div key={playerId} style={{ fontSize: 13 }}>
        {name} {value > 0 ? `won ${Number(value.toFixed(2))}` : `lost ${Number(Math.abs(value).toFixed(2))}`}
      </div>
    );
  })}

<button
  onClick={() =>
    setShowMatchDetails((prev) => ({
      ...prev,
      [game.id]: !prev[game.id],
    }))
  }
  style={{ marginTop: 6 }}
>
  {showMatchDetails[game.id] ? "Hide match details" : "Show match details"}
</button>

{showMatchDetails[game.id] &&
  matchupLines.map((line, lineIndex) => (
    <div key={lineIndex} style={{ fontSize: 12, color: "#666" }}>
      {line}
    </div>
  ))}
      {status !== "Not started" && (
        <div style={{ fontSize: 12, color: "#666" }}>
          {holesPlayed} of {Number(game.holes) || 0} holes played
        </div>
      )}
    </div>
  );
})}

</div>

<div style={{ border: "1px solid #ccc", padding: 12, marginBottom: 12 }}>
  <h3 style={{ marginTop: 0 }}>Birdies (Gross Side Bet)</h3>

{players
  .map((player) => {
        let birdieTotal = 0;

    for (let hole = 1; hole <= 18; hole += 1) {
      const score = scores[hole]?.[player.id];
      const par = Number(course.pars?.[hole - 1]);

      if (score != null && Number(score) === par - 1) {
        const activeGame = teamGames.find((game, index) => {
          const range = getTeamGameRange(teamGames, index);
          return hole >= range.start && hole <= range.end;
        });

        if (activeGame?.birdieEnabled) {
          birdieTotal += Number(activeGame.birdieBet || 0);
        }
      }
    }

    if (birdieTotal === 0) return null;

return (
  <div key={player.id}>
    {player.name}: ${birdieTotal}
  </div>
);
  })}
</div>

        <div style={{ border: "1px solid gray", padding: 12, marginBottom: 12 }}>
<h3 style={{ marginTop: 0 }}>Final Settlement Preview</h3>
          <div style={{ fontSize: 12, color: "#666", marginBottom: 8 }}>
            Final settlement updates after games are completed.
          </div>
          {players.map((player) => (
            <div key={player.id}>
              {player.name}: ${leaderboard[player.id] ?? 0}
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
  <button onClick={backToSetup}>Edit Setup</button>
  <button onClick={goToResults}>View Results</button>
  <button onClick={() => setShowScorecardEdit((prev) => !prev)}>
    {showScorecardEdit ? "Hide Scorecard" : "Edit Scorecard"}
  </button>
</div>

{showScorecardEdit && (
  <div style={{ border: "1px solid gray", padding: 12, marginBottom: 12 }}>
    <h3 style={{ marginTop: 0 }}>Edit Scorecard</h3>

    <ScoresGrid
      players={players}
      scores={scores}
      onSetScore={setScore}
    />
  </div>
)}
      </>
    )}

    {screen === "results" && (
      <>
        <button onClick={goToLive} style={{ marginBottom: 12 }}>
          Back to Round
        </button>

        <h3>Final Results</h3>

        <div style={{ border: "1px solid gray", padding: 12, marginBottom: 12 }}>
          <h3 style={{ marginTop: 0 }}>Leaderboard</h3>
          {players.map((player) => (
            <div key={player.id}>
              {player.name}: ${leaderboard[player.id] ?? 0}
            </div>
          ))}
        </div>

        <SettlementSection
          playerLedger={computedResults.playerLedger}
          tabs={computedResults.tabs}
          players={players}
        />

        {showDebug && (
          <DebugPanel
            players={players}
            course={course}
            scores={scores}
            handicapMode={handicapMode}
            teamA={debugMatchup?.teamA || []}
            teamB={debugMatchup?.teamB || []}
            startHole={debugMatchup?.start || 1}
            endHole={debugMatchup?.end || 18}
            title={debugMatchup?.title || "Debug View"}
            teamALabel={debugMatchup?.teamALabel || "Team A"}
            teamBLabel={debugMatchup?.teamBLabel || "Team B"}
            computedResults={computedResults}
            teamGameResults={teamGameResults}
            getTeamGameSelection={getTeamGameSelection}
          />
        )}

        <div style={{ border: "1px solid gray", padding: 10, marginBottom: 12 }}>
          <h3 style={{ marginTop: 0 }}>Debug Tools</h3>

          <label>
            <input
              type="checkbox"
              checked={showDebug}
              onChange={(e) => setShowDebug(e.target.checked)}
            />
            Show Debug View
          </label>
        </div>
      </>
    )}
  </div>
);
}