import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { defaultPlayers } from "./data/defaultPlayers";
import { shareRound, generateRoundCode } from "./lib/roundSync";
import {
  getActivePlayers,
  getHandicapStrokes,
  getRawScore,
  getTeamNetScore,
  computeHoleResult,
  playIndividualMatch,
  buildLeaderboard,
  playPressMatch,
  scoreRound,
  buildBirdieResults,
} from "./engine/scoringEngine";
import ScoresGrid from "./components/ScoresGrid";
import ScoreEntryCard from "./components/live/ScoreEntryCard";
import SetupScreen from "./screens/SetupScreen";
import ResultsScreen from "./screens/ResultsScreen";
import HoleResultCard from "./components/live/HoleResultCard";

const STORAGE_KEY = "golf-betting-round-setup-v5";
const LAST_ROUND_KEY = "golf-betting-last-round-v1";
const AUTO_ROUND_KEY = "golf-betting-auto-round-v1";
const SAVED_ROUNDS_KEY = "golf-betting-saved-rounds-v1";
const LAST_NINE_POINT_PLAYERS_KEY = "golf-betting-last-nine-point-players-v1";

function safeReadJsonStorage(key, fallbackValue = null) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallbackValue;
    const parsed = JSON.parse(raw);
    return parsed ?? fallbackValue;
  } catch (error) {
    console.error(`Bad localStorage data for ${key}:`, error);
    try {
      localStorage.removeItem(key);
    } catch (removeError) {
      console.error(`Could not remove bad localStorage data for ${key}:`, removeError);
    }
    return fallbackValue;
  }
}

function safeWriteJsonStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Could not write localStorage data for ${key}:`, error);
    return false;
  }
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isUsableRoundSnapshot(value) {
  return (
    isPlainObject(value) &&
    Array.isArray(value.allPlayers) &&
    isPlainObject(value.course) &&
    isPlainObject(value.scores) &&
    Array.isArray(value.teamGames) &&
    Array.isArray(value.matches)
  );
}

function createDefaultCourse() {
  return {
    name: "Westwood",
    pars: [5,4,3,4,4,5,4,3,4,4,4,5,4,4,3,4,3,5],
    hcp: [12,2,16,8,14,10,4,18,6,11,1,5,13,3,15,7,17,9],
  };
}

function createDefaultAllPlayers() {
  return defaultPlayers.map((player) => ({ ...player }));
}

function getTeamGameRange(teamGames, index) {
  if (!teamGames || !teamGames[index]) return { start: 1, end: 6 };
  const start =
    teamGames.slice(0, index).reduce((sum, game) => sum + (game.holes || 6), 0) + 1;
  const end = start + (teamGames[index].holes || 6) - 1;
  return { start, end };
}

function getPlayerDisplayName(players, playerId) {
  return players.find((player) => player.id === playerId)?.name || playerId;
}



function getBestBallPlayer(teamIds, hole, players, course, scores, handicapMode) {
  let best = null;

  teamIds.forEach((playerId) => {
    const net = getTeamNetScore(
      [playerId],
      hole,
      players,
      course,
      scores,
      handicapMode
    );

    if (net === null) return;

    if (!best || net < best.net) {
      best = {
        playerId,
        name: getPlayerDisplayName(players, playerId),
        net,
      };
    }
  });

  return best;
}

function formatScoreWithStrokeDots(playerId, hole, players, course, scores, handicapMode) {
  const gross = getRawScore(scores, hole, playerId);

  if (gross === null || gross === undefined) {
    return "-";
  }

  const strokes = getHandicapStrokes(playerId, hole, players, course, handicapMode);
  return `${gross}${"•".repeat(strokes)}`;
}

function getBestBallScoreDisplay(teamIds, hole, players, course, scores, handicapMode) {
  const best = getBestBallPlayer(
    teamIds,
    hole,
    players,
    course,
    scores,
    handicapMode
  );

  if (!best) return "-";

  return formatScoreWithStrokeDots(
    best.playerId,
    hole,
    players,
    course,
    scores,
    handicapMode
  );
}

function formatTeamHoleResult(result, teamAName, teamBName) {
  const teamAAbbrev = teamAName
    .split(" / ")
    .map((name) => name[0])
    .join("/");

  const teamBAbbrev = teamBName
    .split(" / ")
    .map((name) => name[0])
    .join("/");

  if (result > 0) return teamAAbbrev;
  if (result < 0) return teamBAbbrev;
  if (result === 0) return "Push";
  return "-";
}

function formatRunningUnits(value) {
  const units = Number(value || 0);

  if (units > 0) return `+${units}`;
  if (units < 0) return `${units}`;
  return "Even";
}

function getBetStatusesForHole(bets = [], hole) {
  return bets
    .filter((bet) => {
      const startHole = Number(bet.startHole || 0);
      return startHole && hole >= startHole;
    })
    .map((bet) => {
      const startHole = Number(bet.startHole || 0);
      const resultsThroughHole = (bet.history || []).slice(
        0,
        hole - startHole + 1
      );

      return resultsThroughHole.reduce(
        (sum, value) => sum + Number(value || 0),
        0
      );
    });
}

function getNetActiveBetCountForHole(bets = [], hole) {
  return getBetStatusesForHole(bets, hole).reduce((total, status) => {
    if (status > 0) return total + 1;
    if (status < 0) return total - 1;
    return total;
  }, 0);
}

function CompletedTeamGameScorecard({
  start,
  end,
  matchup,
  teamA,
  teamB,
  teamAName,
  teamBName,
  players,
  course,
  scores,
  handicapMode,
}) {
  const holes = Array.from(
    { length: Number(end || 0) - Number(start || 0) + 1 },
    (_, i) => Number(start) + i
  );

  const rows = holes.map((hole) => {
    const holeResult = computeHoleResult({
      hole,
      teamA,
      teamB,
      players,
      course,
      scores,
      handicapMode,
    });
    const runningValue = getNetActiveBetCountForHole(matchup?.result || [], hole);

    return {
      hole,
      teamAValue: getBestBallScoreDisplay(teamA, hole, players, course, scores, handicapMode),
      teamBValue: getBestBallScoreDisplay(teamB, hole, players, course, scores, handicapMode),
      result: formatTeamHoleResult(holeResult, teamAName, teamBName),
      running: formatRunningUnits(runningValue),
      resultValue: holeResult,
      runningValue,
    };
  });

  const cellStyle = {
    border: "1px solid #ddd",
    padding: "5px 4px",
    textAlign: "center",
    minWidth: 44,
    fontSize: 11,
    whiteSpace: "nowrap",
  };

  const labelCellStyle = {
    ...cellStyle,
    position: "sticky",
    left: 0,
    background: "#fff",
    zIndex: 1,
    textAlign: "left",
    minWidth: 86,
    fontWeight: 700,
  };

  return (
    <div
      style={{
        border: "1px solid #ddd",
        borderRadius: 6,
        marginTop: 10,
        marginBottom: 10,
        overflowX: "auto",
      }}
    >
      <div style={{ padding: 8, fontSize: 13, background: "#f7f7f7" }}>
        <strong>Scorecard View</strong>
        <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>
          Gross score shown. Dot means stroke received.
        </div>
      </div>

      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <tbody>
          <tr>
            <td style={labelCellStyle}>Hole</td>
            {rows.map((row) => (
              <td key={`hole-${row.hole}`} style={cellStyle}>
                {row.hole}
              </td>
            ))}
          </tr>

          <tr>
            <td style={labelCellStyle}>{teamAName}</td>
            {rows.map((row) => (
              <td key={`team-a-${row.hole}`} style={cellStyle}>
                {row.teamAValue}
              </td>
            ))}
          </tr>

          <tr>
            <td style={labelCellStyle}>{teamBName}</td>
            {rows.map((row) => (
              <td key={`team-b-${row.hole}`} style={cellStyle}>
                {row.teamBValue}
              </td>
            ))}
          </tr>

          <tr>
  <td style={labelCellStyle}>Result</td>
  {rows.map((row) => (
    <td
      key={`result-${row.hole}`}
      style={{
        ...cellStyle,
        background:
          row.resultValue > 0
            ? "#e6f4ea"
            : row.resultValue < 0
              ? "#fde8e8"
              : "#f3f4f6",
        fontWeight: 700,
      }}
    >
      {row.result}
    </td>
  ))}
</tr>

        <tr>
  <td style={labelCellStyle}>Running</td>
  {rows.map((row) => (
    <td
      key={`running-${row.hole}`}
      style={{
        ...cellStyle,
        color:
          row.runningValue > 0
            ? "#137333"
            : row.runningValue < 0
              ? "#b3261e"
              : "#555",
        fontWeight: 700,
      }}
    >
      {row.running}
    </td>
  ))}
</tr>  
        </tbody>
      </table>
    </div>
  );
}

function createId(prefix = "id") {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function createEmptyRound() {
  return {
    id: createId("round"),
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
  const [savedRoundName, setSavedRoundName] = useState("");
  const [savedRounds, setSavedRounds] = useState([]);
  const [selectedSavedRoundId, setSelectedSavedRoundId] = useState("");
  const [round] = useState(createEmptyRound());
  const [screen, setScreen] = useState("setup");
  const [currentHole, setCurrentHole] = useState(1);
  const [showScorecardEdit, setShowScorecardEdit] = useState(false);
  const [lastHoleSaved, setLastHoleSaved] = useState(null);
  const [focusGameTarget, setFocusGameTarget] = useState(null);
  const [pendingNextGameIndex, setPendingNextGameIndex] = useState(null);
  const [showProjectedSettlement, setShowProjectedSettlement] = useState(false);

  const [expandedGame, setExpandedGame] = useState(null);
  const [saveMessage, setSaveMessage] = useState(null);
  const [enableTeamGame, setEnableTeamGame] = useState(true);
  const [noPar3TeamGame, setNoPar3TeamGame] = useState(false);
  const [autoRestoreComplete, setAutoRestoreComplete] = useState(false);
  const scoreEntryRef = useRef(null);

  // Multiplayer / cloud sync
  const [roundName, setRoundName] = useState("");
  const [roundCode, setRoundCode] = useState(null);
  const [syncMessage, setSyncMessage] = useState("");


  function createDefaultTeamGame(index = 0) {
    return {
      id: `team-game-${Date.now()}-${index}`,
      holes: 6,
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
  const [pressTrigger, setPressTrigger] = useState(1);
  const [birdiesEnabled, setBirdiesEnabled] = useState(false);
  const [birdieBetAmount, setBirdieBetAmount] = useState(1);
  const [toyRule, setToyRule] = useState(false);
  const [setupMessage, setSetupMessage] = useState("");

  const players = useMemo(
    () => getActivePlayers(allPlayers, mode),
    [allPlayers, mode]
  );
  
  

  const activePlayerIds = useMemo(
    () => new Set(players.map((p) => p.id)),
    [players]
  );

  const context = useMemo(
    () => ({
      players,
      course,
      scores,      
      handicapMode,
      noPar3TeamGame,
    }),
    [
      players,
      course,
      scores,
      handicapMode,
      noPar3TeamGame,
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

function getPlayerNameById(playerId) {
  return players.find((player) => player.id === playerId)?.name || "";
}

function getTeamDisplayName(team = []) {
  const names = team.filter(Boolean).map(getPlayerNameById);
  return names.length ? names.join(" / ") : "Not selected";
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
      style={{
        fontSize: 16,
        padding: 8,
        minWidth: 140,
        borderRadius: 6,
        border: "1px solid #bbb",
        background: "#fff",
      }}
    >
      <option value="">Select player</option>
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
  const selection = getTeamGameSelection(gameIndex);

  return (
    <>
      <div
        style={{
          marginTop: 10,
          padding: 10,
          background: "#f7f7f7",
          border: "1px solid #ddd",
          borderRadius: 6,
        }}
      >
        <strong>5-Player Team Game</strong>
        <div style={{ fontSize: 13, marginTop: 4 }}>
          Pick the wheel team. The app builds the three opponent pairs.
        </div>
      </div>

      <div style={{ marginTop: 10 }}>
        <strong>Wheel Team</strong>
        <div style={{ fontSize: 13, color: "#555", marginTop: 2 }}>
          Pick 2 players
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
          {[0, 1].map((slotIndex) =>
            renderPlayerSelect(gameIndex, "team1", slotIndex)
          )}
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <strong>Opponent Pair 1</strong>
        <div style={{ fontSize: 13, color: "#555", marginTop: 2 }}>
          {getTeamDisplayName(selection.team2)}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
          {[0, 1].map((slotIndex) =>
            renderPlayerSelect(gameIndex, "team2", slotIndex)
          )}
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <strong>Opponent Pair 2</strong>
        <div style={{ fontSize: 13, color: "#555", marginTop: 2 }}>
          {getTeamDisplayName(selection.team3)}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
          {[0, 1].map((slotIndex) =>
            renderPlayerSelect(gameIndex, "team3", slotIndex)
          )}
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <strong>Opponent Pair 3</strong>
        <div style={{ fontSize: 13, color: "#555", marginTop: 2 }}>
          {getTeamDisplayName(selection.team4)}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
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
      id: createId("match"),
      p1Id: players[0].id,
      p2Id: players[1].id,
      type: "standard",
      bet: 10,
      birdieEnabled: false,
      birdieBet: 5,
      toyRule: false,
      noPar3Strokes: false,
      matchPlayFront: true,
matchPlayBack: true,
matchPlayTotal: true,
strokeScoring: "net",
strokePayoutMode: "winloss",
strokeFront: true,
strokeBack: true,
strokeTotal: true,
    },
  ]);
}

function addNinePointMatch() {
    if (mode !== "3p") return;
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
      id: createId("nine-point"),
      gameType: "ninePoint",
      p1Id: defaultIds[0],
      p2Id: defaultIds[1],
      p3Id: defaultIds[2],
      blitzEnabled: false,
      bet: 1,
      birdieEnabled: false,
      birdieBet: 1,
      toyRule: false,
      noPar3Strokes: false,
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

  function  removeMatch(id) {
    setMatches((prev) => prev.filter((m) => m.id !== id));
  }

  const matchResults = useMemo(() => {
    return matches.map((match) => ({
      match,
      result: playIndividualMatch(match, context),
    }));
  }, [matches, context]);




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
  teamGames: enableTeamGame ? teamGames : [],
  teamGameResults: enableTeamGame ? teamGameResults : [],
  scores,
  course,
  getTeamGameSelection,
  birdiesEnabled: enableTeamGame ? birdiesEnabled : false,
  birdieBetAmount,
  toyRule,
  players,
  handicapMode,
});



const computedResults = scoreRound(round, {
  players,
  scores,
  course,
  matches,
  matchResults,
  teamGames,
  teamGameResults,
  teamGameUnitAmount,
  pressTrigger,
  birdiesEnabled,
  birdieBetAmount,
  getTeamGameSelection,
  mode,
  birdieResults,
  noPar3TeamGame,
});

const leaderboard = useMemo(() => {
  return buildLeaderboard(computedResults.playerLedger, { players });
}, [computedResults, players]);

const activePlayers = useMemo(() => {
  if (enableTeamGame) return players;

  const activePlayerIds = new Set();

  matches.forEach((match) => {
    if (match.p1Id) activePlayerIds.add(match.p1Id);
    if (match.p2Id) activePlayerIds.add(match.p2Id);
    if (match.p3Id) activePlayerIds.add(match.p3Id);
  });

  return players.filter((player) => activePlayerIds.has(player.id));
}, [enableTeamGame, players, matches]);

const roundSummaryRows = activePlayers.map((player) => {
  let netTotal = 0;

  const gameTotals = teamGames.map((game, gameIndex) => {
    const gameResult = teamGameResults.find(
      (result) => result.index === gameIndex
    );

    const selection = getTeamGameSelection(gameIndex);
    let total = 0;

    (gameResult?.matches || []).forEach((matchup) => {
      const parts = matchup.label.split(" ");
      const teamAKey = `team${parts[1] || ""}`.toLowerCase();
      const teamBKey = `team${parts[4] || ""}`.toLowerCase();

      const teamAPlayers = selection?.[teamAKey] || [];
      const teamBPlayers = selection?.[teamBKey] || [];

      const units = (matchup.result || []).reduce((sum, item) => {
        const score = item.score || 0;
        if (score > 0) return sum + 1;
        if (score < 0) return sum - 1;
        return sum;
      }, 0);

      if (teamAPlayers.includes(player.id)) total += units;
      if (teamBPlayers.includes(player.id)) total -= units;
    });

    netTotal += total;

    return total;
  });

  return {
    playerId: player.id,
    name: player.name,
    gameTotals,
    netTotal,
  };
});

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

setPressTrigger(Number(round.pressTrigger || 1));
setBirdiesEnabled(!!round.birdiesEnabled);
setBirdieBetAmount(Number(round.birdieBetAmount || 1));
    
    if (Array.isArray(round.teamGames)) {
      setTeamGames(
        round.teamGames.map((game, index) => ({
          id: game.id || `team-game-${Date.now()}-${index}`,
          holes: Number(game.holes) || 6,
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
  pressTrigger,
  birdiesEnabled,
  birdieBetAmount,
  toyRule,
  teamGames,
  matches,
};

    localStorage.setItem(LAST_ROUND_KEY, JSON.stringify(round));
    setSetupMessage("Last round saved.");
  } catch (error) {
    setSetupMessage("Could not save last round.");
  }
}

const buildCurrentRoundSnapshot = useCallback(() => {
    return {
    savedAt: new Date().toISOString(),
    mode,
    allPlayers,
    course,
    scores,
    handicapMode,
    enableTeamGame,
    noPar3TeamGame,
    teamGameUnitAmount,
    pressTrigger,
    birdiesEnabled,
    birdieBetAmount,
    toyRule,
    teamGames,
    matches,
    screen,
    currentHole,
    lastHoleSaved,
  };
}, [
  mode,
  allPlayers,
  course,
  scores,
  handicapMode,
  enableTeamGame,
  noPar3TeamGame,
  teamGameUnitAmount,
  pressTrigger,
  birdiesEnabled,
  birdieBetAmount,
  toyRule,
  teamGames,
  matches,
  screen,
  currentHole,
  lastHoleSaved,
]);

function applyRoundSnapshot(round, successMessage = "Round loaded.") {
  if (!isUsableRoundSnapshot(round)) {
    setSetupMessage("Saved round data was not usable and was ignored.");
    return false;
  }

  if (round.mode) setMode(round.mode);
  if (Array.isArray(round.allPlayers)) setAllPlayers(round.allPlayers);
  if (round.course) setCourse(round.course);
  if (round.scores) setScores(round.scores);
  if (round.handicapMode) setHandicapMode(round.handicapMode);
  if (typeof round.enableTeamGame === "boolean") setEnableTeamGame(round.enableTeamGame);
  setNoPar3TeamGame(!!round.noPar3TeamGame);
  if (typeof round.teamGameUnitAmount === "number") setTeamGameUnitAmount(round.teamGameUnitAmount);

  setPressTrigger(Number(round.pressTrigger || 1));
  setBirdiesEnabled(!!round.birdiesEnabled);
  setToyRule(!!round.toyRule);
  setBirdieBetAmount(Number(round.birdieBetAmount || 1));

  setTeamGames(
    round.teamGames.map((game, index) => ({
      id: game.id || `team-game-${Date.now()}-${index}`,
      holes: Number(game.holes) || 6,
      pressTrigger: Number(game.pressTrigger) || 1,
      birdieEnabled: !!game.birdieEnabled,
      birdieBet: Number(game.birdieBet) || 0,
      teams: game.teams || {},
    }))
  );

  setMatches(round.matches);
  setCurrentHole(Number(round.currentHole || 1));
  setLastHoleSaved(round.lastHoleSaved ?? null);
  setPendingNextGameIndex(null);
  setFocusGameTarget(null);
  setShowProjectedSettlement(false);

  if (["setup", "live", "results"].includes(round.screen)) {
    setScreen(round.screen);
  }

  setSetupMessage(successMessage);
  return true;
}

function saveNamedRound() {
  const trimmedName = savedRoundName.trim();

  if (!trimmedName) {
    setSetupMessage("Enter a round name first.");
    return;
  }

  try {
    const round = {
      id: createId("saved-round"),
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

setPressTrigger(Number(round.pressTrigger || 1));
setBirdiesEnabled(!!round.birdiesEnabled);
setBirdieBetAmount(Number(round.birdieBetAmount || 1));
    
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

function exportSavedRounds() {
  try {
    const exportData = {
      exportedAt: new Date().toISOString(),
      savedRounds,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `golf-saved-rounds-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);

    setSetupMessage("Saved rounds exported.");
  } catch (error) {
    setSetupMessage("Could not export saved rounds.");
  }
}

function importSavedRounds(event) {
  const file = event.target.files?.[0];

  if (!file) return;

  const reader = new FileReader();

  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);

      const importedRounds = Array.isArray(parsed)
        ? parsed
        : parsed.savedRounds;

      if (!Array.isArray(importedRounds)) {
        setSetupMessage("Import file does not contain saved rounds.");
        return;
      }

      const mergedRounds = [...importedRounds, ...savedRounds];

      const dedupedRounds = mergedRounds.filter(
        (round, index, arr) =>
          round?.id &&
          index === arr.findIndex((item) => item.id === round.id)
      );

      setSavedRounds(dedupedRounds);
      localStorage.setItem(SAVED_ROUNDS_KEY, JSON.stringify(dedupedRounds));

      setSetupMessage(`Imported ${importedRounds.length} saved rounds.`);
      event.target.value = "";
    } catch (error) {
      setSetupMessage("Could not import saved rounds.");
    }
  };

  reader.readAsText(file);
}

function resetSetup() {
  setMode("5p");
  setAllPlayers(createDefaultAllPlayers());
  setCourse(createDefaultCourse());
  setHandicapMode("relative");
  setTeamGameUnitAmount(1);
  setBirdiesEnabled(false);
  setBirdieBetAmount(1);
  setScores({});
  setMatches([]);
  setTeamGames([
    createDefaultTeamGame(1),
    createDefaultTeamGame(2),
    createDefaultTeamGame(3),
  ]);
  setCurrentHole(1);
  setLastHoleSaved(null);
  setFocusGameTarget(null);
  setScreen("setup");

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

useEffect(() => {
  const round = safeReadJsonStorage(AUTO_ROUND_KEY, null);

  if (round && isUsableRoundSnapshot(round)) {
    applyRoundSnapshot(round, "Autosaved round restored.");
  }

  setAutoRestoreComplete(true);
}, []);

useEffect(() => {
  if (!autoRestoreComplete) return;

  const timer = setTimeout(() => {
    safeWriteJsonStorage(AUTO_ROUND_KEY, buildCurrentRoundSnapshot());
  }, 250);

  return () => clearTimeout(timer);
}, [
  autoRestoreComplete,
  mode,
  allPlayers,
  course,
  scores,
  handicapMode,
  enableTeamGame,
  teamGameUnitAmount,
  pressTrigger,
  birdiesEnabled,
  birdieBetAmount,
  toyRule,
  teamGames,
  matches,
  screen,
  currentHole,
  lastHoleSaved,
  buildCurrentRoundSnapshot,
]);

// Helpers to get the current team selection for a game, ensuring it always has the correct shape

function startRound() {
if (enableTeamGame && teamGames.length > 0 && totalHoles !== 18) {
      setSetupMessage(`Team game holes must equal 18. Currently ${totalHoles}.`);
    alert(`Team game holes must equal 18. Currently ${totalHoles}.`);
    return;
  }

  // Round already complete: go back to Live so user can view/edit scorecard
  if (lastHoleSaved != null && lastHoleSaved >= 18) {
    setPendingNextGameIndex(null);
    setScreen("live");
    return;
  }

  const requiredHole = lastHoleSaved != null ? lastHoleSaved + 1 : 1;

  const requiredGameIndex = teamGames.findIndex((game, index) => {
    const range = getTeamGameRange(teamGames, index);
    return requiredHole >= range.start && requiredHole <= range.end;
  });

  const hasValidTeamGameForRequiredHole =
    requiredGameIndex >= 0 &&
    (() => {
      const selection = getTeamGameSelection(requiredGameIndex);
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
    })();

 if (enableTeamGame && !hasValidTeamGameForRequiredHole) {
  const gameLabel =
    requiredGameIndex >= 0 ? `Game ${requiredGameIndex + 1}` : "a game";

  setSetupMessage(`Set teams for ${gameLabel} before continuing.`);

  if (requiredGameIndex >= 0) {
    setFocusGameTarget({
      gameIndex: requiredGameIndex,
      nonce: Date.now(),
    });
  }

  alert(`Set teams for ${gameLabel} before continuing.`);

  if (requiredGameIndex >= 0) {
    setTimeout(() => {
      setFocusGameTarget({
        gameIndex: requiredGameIndex,
        nonce: Date.now(),
      });
    }, 0);
  }

  return;
}

if (!enableTeamGame) {
  if (matches.length === 0) {
    setSetupMessage("Add at least one 1v1 match before starting.");
    alert("Add at least one 1v1 match before starting.");
    return;
  }

  const invalidMatch = matches.find((match) => {
    if (match.gameType === "ninePoint") {
      const ids = [match.p1Id, match.p2Id, match.p3Id].filter(Boolean);
      return ids.length !== 3 || new Set(ids).size !== 3;
    }

    return !match.p1Id || !match.p2Id || match.p1Id === match.p2Id;
  });

  if (invalidMatch) {
    setSetupMessage("Finish selecting players for each match before starting.");
    alert("Finish selecting players for each match before starting.");
    return;
  }
}

  if (lastHoleSaved != null) {
    setCurrentHole(lastHoleSaved + 1);
  } else {
    setCurrentHole(1);
  }

  setPendingNextGameIndex(null);
  setScreen("live");

  // Generate round code if we don't have one yet
  const code = roundCode || generateRoundCode();
  if (!roundCode) setRoundCode(code);

  // Auto-generate round name if left blank
  const today = new Date();
  const monthDay = today.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const autoName = course?.name ? `${monthDay} - ${course.name}` : monthDay;
  const nameToUse = roundName.trim() || autoName;
  if (!roundName.trim()) setRoundName(nameToUse);

  // Push to Supabase (fire and forget)
  const snapshot = {
    savedAt: new Date().toISOString(),
    roundName: nameToUse,
    screen: "live",
    currentHole: lastHoleSaved != null ? lastHoleSaved + 1 : 1,
  };
  setSyncMessage("Saving…");
  shareRound(code, snapshot)
    .then(() => setSyncMessage(""))
    .catch(() => setSyncMessage("Save failed"));

  setTimeout(() => {
    scoreEntryRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, 0);
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

function buildRealHoleResultLines(holeNumber) {
  const holeLines = [];
  const matchLines = [];
  const birdieLines = [];

if (!enableTeamGame) {
  const holeScores = scores[holeNumber] || {};
  const playerName = (id) => players.find((p) => p.id === id)?.name || id;

  matches.forEach((match) => {
    if (match.gameType === "ninePoint") return;

        const matchEntry = matchResults.find((entry) => entry.match?.id === match.id);
    const holeResult = matchEntry?.result?.holes?.[holeNumber - 1];

    if (holeResult == null) return;

    const p1Name = playerName(match.p1Id);
    const p2Name = playerName(match.p2Id);

    if (holeResult > 0) {
      holeLines.push(`${p1Name} won hole vs ${p2Name}`);
    } else if (holeResult < 0) {
      holeLines.push(`${p2Name} won hole vs ${p1Name}`);
    } else {
      holeLines.push(`${p1Name} and ${p2Name} tied hole`);
    }

    if (match.birdieEnabled && Number(match.birdieBet || 0) > 0) {
      const par = Number(course.pars?.[holeNumber - 1]);
      const p1Score = Number(holeScores[match.p1Id]);
      const p2Score = Number(holeScores[match.p2Id]);

      if (Number.isFinite(par)) {
        if (Number.isFinite(p1Score) && p1Score <= par - 1) {
          birdieLines.push(`${p1Name} birdie +$${Number(match.birdieBet)}`);
        }

        if (Number.isFinite(p2Score) && p2Score <= par - 1) {
          birdieLines.push(`${p2Name} birdie +$${Number(match.birdieBet)}`);
        }
      }
    }
  });

    return {
    holeLines: holeLines.length ? holeLines : ["No completed 1v1 results for this hole."],
    matchLines: [],
    birdieLines,
  };
}

  const activeGameIndex = teamGames.findIndex((game, index) => {
    const range = getTeamGameRange(teamGames, index);
    return holeNumber >= range.start && holeNumber <= range.end;
  });

  if (activeGameIndex < 0) {
    return {
      holeLines: ["No active game found for this hole."],
      matchLines: [],
      birdieLines: [],
    };
  }

  const range = getTeamGameRange(teamGames, activeGameIndex);
  const selection = getTeamGameSelection(activeGameIndex);
  const holeScores = scores[holeNumber] || {};

  const playerName = (id) =>
    players.find((p) => p.id === id)?.name || id;

  const teamName = (ids = []) =>
    ids.filter(Boolean).map(playerName).join(" / ");

 const holeHcp = Number(course?.hcp?.[holeNumber - 1]);

const lowestPlayerHcp = Math.min(
  ...players.map((player) => Number(player.hcp || 0))
);

const strokesOnHole = (playerId) => {
  const player = players.find((p) => p.id === playerId);
  if (!player || !Number.isFinite(holeHcp)) return 0;

  const relativeHcp = Math.max(0, Number(player.hcp || 0) - lowestPlayerHcp);
  const fullRounds = Math.floor(relativeHcp / 18);
  const remainder = relativeHcp % 18;

  return fullRounds + (holeHcp <= remainder ? 1 : 0);
};

const teamBestScore = (ids = [], scoreMap = {}) => {
  const vals = ids
    .map((id) => {
      const gross = Number(scoreMap[id]);
      if (!Number.isFinite(gross)) return null;
      return gross - strokesOnHole(id);
    })
    .filter((v) => Number.isFinite(v));

  return vals.length ? Math.min(...vals) : null;
};

  const pluralBet = (n) => (n === 1 ? "bet" : "bets");

  const matchups =
    mode === "5p"
      ? [
          ["team1", "team2"],
          ["team1", "team3"],
          ["team1", "team4"],
        ]
      : [["team1", "team2"]];

// --- HOLE RESULT (GOLFER SUMMARY) ---
let wins = 0;
let losses = 0;
let ties = 0;

matchups.forEach(([a, b]) => {
  const A = selection?.[a] || [];
  const B = selection?.[b] || [];

  const scoreA = teamBestScore(A, holeScores);
  const scoreB = teamBestScore(B, holeScores);

  if (scoreA == null || scoreB == null) return;

  if (scoreA < scoreB) wins += 1;
  else if (scoreB < scoreA) losses += 1;
  else ties += 1;
});

const team1Name = teamName(selection?.team1 || []);

// build natural language summary
if (wins === 3) {
  holeLines.push(`${team1Name} won all 3`);
} else if (wins === 2 && ties === 1) {
  holeLines.push(`${team1Name} won 2, tied 1`);
} else if (wins === 1 && ties === 2) {
  holeLines.push(`${team1Name} won 1, tied 2`);
} else if (ties === 3) {
  holeLines.push(`${team1Name} tied all 3`);
} else if (losses === 3) {
  holeLines.push(`${team1Name} lost all 3`);
} else if (losses === 2 && ties === 1) {
  holeLines.push(`${team1Name} lost 2, tied 1`);
} else if (losses === 1 && ties === 2) {
  holeLines.push(`${team1Name} lost 1, tied 2`);
} else if (wins === 1 && losses === 1 && ties === 1) {
  holeLines.push(`Split: ${team1Name} won 1, lost 1, tied 1`);
} else if (wins === 2 && losses === 1) {
  holeLines.push(`Split: ${team1Name} won 2, lost 1`);
} else if (losses === 2 && wins === 1) {
  holeLines.push(`Split: ${team1Name} lost 2, won 1`);
}

// --- MATCH STATUS WITH PRESSES ---
matchups.forEach(([a, b]) => {
  const A = selection?.[a] || [];
  const B = selection?.[b] || [];

  if (A.filter(Boolean).length === 0 || B.filter(Boolean).length === 0) return;

  const pressResults = playPressMatch({
    teamA: A,
    teamB: B,
    start: range.start,
    end: holeNumber,
    trigger: teamGames[activeGameIndex]?.pressTrigger ?? 1,
    context,
  });

  const betScore = (pressResults || []).reduce((sum, bet) => {
    const score = Number(bet.score || 0);

    if (score > 0) return sum + 1;
    if (score < 0) return sum - 1;
    return sum;
  }, 0);

  if (betScore > 0) {
    matchLines.push(
      `${teamName(A)} ${betScore} ${pluralBet(betScore)} up vs ${teamName(B)}`
    );
  } else if (betScore < 0) {
    const absScore = Math.abs(betScore);
    matchLines.push(
      `${teamName(A)} ${absScore} ${pluralBet(absScore)} down to ${teamName(B)}`
    );
  } else {
    matchLines.push(`${teamName(A)} even vs ${teamName(B)}`);
  }
});

// --- BIRDIES ---
const par = Number(course.pars?.[holeNumber - 1]);
const bet = Number(birdieBetAmount || 0);
const enabled = !!birdiesEnabled && bet > 0;

if (enabled && Number.isFinite(par)) {
  const birdieNames = [];

  players.forEach((player) => {
    const score = Number(holeScores[player.id]);

    if (Number.isFinite(score) && score <= par - 1) {
      birdieNames.push(player.name);
    }
  });

  if (birdieNames.length > 0) {
    birdieLines.push(birdieNames.join(", "));
  }
}

  return { holeLines, matchLines, birdieLines };
}

 // ===== FINAL APP RETURN (DO NOT TOUCH INNER RETURNS ABOVE) =====
return (
  <div className="app-shell">
    <div
  style={{
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  }}
>
  <h2 style={{ margin: 0 }}>Golf Betting App</h2>

  <div style={{ display: "flex", gap: 8 }}>
    <button
      className="secondary-button"
      onClick={backToSetup}
      disabled={screen === "setup"}
    >
      Setup
    </button>

    <button
      className="secondary-button"
      onClick={goToLive}
      disabled={screen === "live"}
    >
      Live
    </button>

    <button
      className="secondary-button"
      onClick={goToResults}
      disabled={screen === "results"}
    >
      Results
    </button>
  </div>
</div>

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
    exportSavedRounds={exportSavedRounds}
    importSavedRounds={importSavedRounds}
    setupMessage={setupMessage}
    course={course}
    updateCourseName={updateCourseName}
    updateCoursePar={updateCoursePar}
    updateCourseHcp={updateCourseHcp}
    teamGameUnitAmount={teamGameUnitAmount}
    setTeamGameUnitAmount={setTeamGameUnitAmount}
    birdiesEnabled={birdiesEnabled}
    setBirdiesEnabled={setBirdiesEnabled}
    birdieBetAmount={birdieBetAmount}
    toyRule={toyRule}
    setToyRule={setToyRule}
    setBirdieBetAmount={setBirdieBetAmount}
    noPar3TeamGame={noPar3TeamGame}
    setNoPar3TeamGame={setNoPar3TeamGame}
    pressTrigger={pressTrigger}
    setPressTrigger={setPressTrigger}
    applyPreset={applyPreset}
    setTeamGames={setTeamGames}
    teamGames={teamGames}
    totalHoles={totalHoles}
    getTeamGameRange={getTeamGameRange}
    hasDuplicateSelections={hasDuplicateSelections}
    getTeamGameSelection={getTeamGameSelection}
    renderTeamSelectors={renderTeamSelectors}
    expandedGame={expandedGame}
    setExpandedGame={setExpandedGame}
    addMatch={addMatch}
    addNinePointMatch={addNinePointMatch}
    matches={matches}
    matchResults={matchResults}
    birdieResults={birdieResults}
    updateMatch={updateMatch}
    removeMatch={removeMatch}
    startRound={startRound}
    createDefaultTeamGame={createDefaultTeamGame}
    focusGameTarget={focusGameTarget}
    enableTeamGame={enableTeamGame}
    setEnableTeamGame={setEnableTeamGame}
    goToLive={goToLive}
    goToResults={goToResults}
    roundName={roundName}
    setRoundName={setRoundName}
   />
)}

    {screen === "live" && (
      <>
{pendingNextGameIndex == null && (
  <>
    {roundCode && (
      <div
        onClick={() => {
          navigator.clipboard?.writeText(roundCode);
          setSyncMessage("Copied!");
          setTimeout(() => setSyncMessage(""), 2000);
        }}
        style={{
          background: "#1a7a3c",
          borderRadius: 12,
          padding: "12px 16px",
          marginBottom: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        <div>
          <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", marginBottom: 2 }}>
            🟢 Live Round Code
          </div>
          <div style={{ color: "#fff", fontSize: 32, fontWeight: 800, letterSpacing: 6, lineHeight: 1 }}>
            {roundCode}
          </div>
          <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, marginTop: 4 }}>
            {roundName || ""} · Tap to copy
          </div>
        </div>
        <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 24 }}>
          {syncMessage === "Copied!" ? "✓" : "⎘"}
        </div>
      </div>
    )}

    {saveMessage && (
      <div
        style={{
          background: "#e6f4ea",
          border: "1px solid #b7e1cd",
          padding: 10,
          marginBottom: 8,
          borderRadius: 6,
          fontSize: 14,
          fontWeight: 500,
        }}
      >
        <div>
  <div>{saveMessage} ✓</div>
  <div style={{ fontSize: 12, fontWeight: 400, marginTop: 2 }}>
    Results updated below
  </div>
</div>
      </div>
    )}

  
  <div ref={scoreEntryRef}>
  <ScoreEntryCard
    currentHole={currentHole}
    course={course}
    players={activePlayers}
    scores={scores}
    setScore={setScore}
    onSaveHole={() => {
      const nextHole = currentHole + 1;

setLastHoleSaved(currentHole);
setSaveMessage(`Hole ${currentHole} saved`);

      if (currentHole >= 18) {
  setCurrentHole(19);
  return;
}

      const nextGameIndex = teamGames.findIndex((game, index) => {
        const range = getTeamGameRange(teamGames, index);
        return nextHole >= range.start && nextHole <= range.end;
      });

if (enableTeamGame && nextGameIndex >= 0) {
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
          setPendingNextGameIndex(nextGameIndex);
          return;
        }
      }

      setCurrentHole(nextHole);
      setTimeout(() => {
  setSaveMessage(null);
}, 2000);
    }}
    />
</div>
  </>
)}

<HoleResultCard
  lastHoleSaved={lastHoleSaved}
  buildRealHoleResultLines={buildRealHoleResultLines}
  matchResults={matchResults}
  players={players}
  mode={mode}
/>

{pendingNextGameIndex != null && (() => {
  const completedGameIndex = pendingNextGameIndex - 1;
  const completedGameResult = teamGameResults.find(
    (result) => result.index === completedGameIndex
  );
  const selection = getTeamGameSelection(completedGameIndex);
  const summary = {};

  players.forEach((player) => {
    summary[player.id] = 0;
  });

  (completedGameResult?.matches || []).forEach((matchup) => {
    const parts = matchup.label.split(" ");
    const teamAKey = `team${parts[1] || ""}`.toLowerCase();
    const teamBKey = `team${parts[4] || ""}`.toLowerCase();
    const teamAPlayers = selection?.[teamAKey] || [];
    const teamBPlayers = selection?.[teamBKey] || [];
    const units = (matchup.result || []).reduce((sum, item) => {
      const score = item.score || 0;
      if (score > 0) return sum + 1;
      if (score < 0) return sum - 1;
      return sum;
    }, 0);
    teamAPlayers.forEach((id) => { summary[id] = (summary[id] || 0) + units; });
    teamBPlayers.forEach((id) => { summary[id] = (summary[id] || 0) - units; });
  });

  const wheel = selection?.team1 || [];
  const team1Names = wheel
    .map((id) => players.find((p) => p.id === id)?.name || id)
    .join(" / ");
  const team1Total = wheel.reduce((sum, id) => sum + (summary[id] || 0), 0);
  const perPlayerRaw = wheel.length > 0 ? team1Total / wheel.length : 0;
  const perPlayer = perPlayerRaw > 0 ? `+${perPlayerRaw}` : `${perPlayerRaw}`;

  const otherPlayers = activePlayers.filter((p) => !wheel.includes(p.id));

  const birdieSummaryText = activePlayers
    .map((player) => {
      const birdieEntries = birdieResults.filter(
        (b) =>
          b.source === "match-birdie" &&
          b.playerId === player.id &&
          Number(b.amount) > 0
      );
      if (!birdieEntries.length) return null;
      const value = birdieEntries.reduce((sum, b) => sum + Number(b.amount), 0);
      return `${player.name} ${value > 0 ? "wins" : "loses"} ${Math.abs(value)}`;
    })
    .filter(Boolean)
    .join(", ");

  return (
    <div className="app-card">
      <h3 style={{ marginTop: 0 }}>
        Game {pendingNextGameIndex} Complete
      </h3>

      <div style={{ marginBottom: 8 }}>
        <div>
          <strong>
            {team1Names} {team1Total >= 0 ? "win" : "lose"} {Math.abs(team1Total)} bets ({perPlayer} each)
          </strong>
        </div>

        <div style={{ marginTop: 4 }}>
          {otherPlayers
            .map((player) => {
              const value = summary[player.id] || 0;
              if (value === 0) return `${player.name} even`;
              return `${player.name} ${value > 0 ? "wins" : "loses"} ${Math.abs(value)}`;
            })
            .join(", ")}
        </div>

        {birdieSummaryText && (
          <div style={{ marginTop: 4 }}>
            Birdies: {birdieSummaryText}
          </div>
        )}

        <div style={{ marginTop: 8 }}>
          Review the completed game before choosing teams for the next game.
        </div>

        {(completedGameResult?.matches || []).map((matchup, matchupIndex) => {
          const parts = matchup.label.split(" ");
          const teamAKey = `team${parts[1] || ""}`.toLowerCase();
          const teamBKey = `team${parts[4] || ""}`.toLowerCase();
          const teamA = selection?.[teamAKey] || [];
          const teamB = selection?.[teamBKey] || [];
          if (teamA.length === 0 || teamB.length === 0) return null;
          return (
            <CompletedTeamGameScorecard
              key={`${completedGameIndex}-${matchupIndex}`}
              start={completedGameResult.start}
              end={completedGameResult.end}
              matchup={matchup}
              teamA={teamA}
              teamB={teamB}
              teamAName={teamA.map(id => players.find(p => p.id === id)?.name || id).join(" / ")}
              teamBName={teamB.map(id => players.find(p => p.id === id)?.name || id).join(" / ")}
              players={players}
              course={course}
              scores={scores}
              handicapMode={handicapMode}
            />
          );
        })}

        <button
          onClick={() => setShowProjectedSettlement((prev) => !prev)}
          style={{ marginTop: 8, marginRight: 8 }}
        >
          {showProjectedSettlement ? "Hide Projected Settlement" : "Projected Settlement"}
        </button>

        {showProjectedSettlement && (
          <div style={{ marginTop: 8 }}>
            {activePlayers.map((player) => {
              const amount = leaderboard[player.id] ?? 0;
              return (
                <div key={player.id}>
                  {player.name}: ${amount}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <button
        onClick={() => {
          setFocusGameTarget({
            gameIndex: pendingNextGameIndex,
            nonce: Date.now(),
          });
          setScreen("setup");
          setShowProjectedSettlement(false);
        }}
      >
        Choose Teams for Game {pendingNextGameIndex + 1}
      </button>
    </div>
  );
})()}
{enableTeamGame && (
  <div className="app-card" style={{ marginBottom: 12 }}>
    <div style={{ fontWeight: "bold", marginBottom: 8 }}>Team Game Standing</div>
    {activePlayers.map((player) => {
      let netTotal = 0;
      teamGames.forEach((game, gameIndex) => {
        const gameResult = teamGameResults.find((r) => r.index === gameIndex);
        const selection = getTeamGameSelection(gameIndex);
        (gameResult?.matches || []).forEach((matchup) => {
          const parts = matchup.label.split(" ");
          const teamAKey = `team${parts[1] || ""}`.toLowerCase();
          const teamBKey = `team${parts[4] || ""}`.toLowerCase();
          const teamAPlayers = selection?.[teamAKey] || [];
          const teamBPlayers = selection?.[teamBKey] || [];
          const units = (matchup.result || []).reduce((sum, item) => {
            const score = item.score || 0;
            if (score > 0) return sum + 1;
            if (score < 0) return sum - 1;
            return sum;
          }, 0);
          if (teamAPlayers.includes(player.id)) netTotal += units;
          if (teamBPlayers.includes(player.id)) netTotal -= units;
        });
      });
      const color = netTotal > 0 ? "#137333" : netTotal < 0 ? "#b3261e" : "#666";
      const label = netTotal > 0 ? `+${netTotal} bets` : netTotal < 0 ? `${netTotal} bets` : "even";
      return (
        <div key={player.id} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span>{player.name}</span>
          <span style={{ fontWeight: "bold", color }}>{label}</span>
        </div>
      );
    })}
  </div>
)}

{/* ── MATCH STATUS ── */}
{matchResults.filter(({ result }) => result && result.gameType !== "ninePoint").length > 0 && (
  <div className="app-card" style={{ marginBottom: 12 }}>
    <div style={{ fontWeight: "bold", marginBottom: 8 }}>Match Status</div>
    {matchResults
      .filter(({ result }) => result && result.gameType !== "ninePoint")
      .map(({ match, result }) => {
        const p1 = players.find((p) => p.id === match.p1Id)?.name || "P1";
        const p2 = players.find((p) => p.id === match.p2Id)?.name || "P2";
        let statusLine = "";
        if (result.type === "standard" || result.type === "match_fbt") {
          const label = result.label || result.overallLabel || "";
          statusLine = label ? `${p1} vs ${p2}: ${label}` : `${p1} vs ${p2}`;
        } else if (result.type === "longshort") {
          statusLine = `${p1} vs ${p2}: Long ${result.longLabel || "-"} | Short ${result.shortLabel || "-"}`;
        } else {
          statusLine = `${p1} vs ${p2}: ${result.label || "-"}`;
        }
        return (
          <div key={match.id} style={{ marginBottom: 4, fontSize: 14 }}>
            {statusLine}
          </div>
        );
      })}
  </div>
)}

{/* ── 9-POINT STATUS ── */}
{matchResults.filter(({ match, result }) => match?.gameType === "ninePoint" && result?.totalsByPlayerId).length > 0 && (
  <div className="app-card" style={{ marginBottom: 12 }}>
    <div style={{ fontWeight: "bold", marginBottom: 8 }}>9-Point Standing</div>
    {matchResults
      .filter(({ match, result }) => match?.gameType === "ninePoint" && result?.totalsByPlayerId)
      .map(({ match, result }) => {
        const playerIds = [match.p1Id, match.p2Id, match.p3Id].filter(Boolean);
        const sorted = [...playerIds].sort(
          (a, b) => (result.totalsByPlayerId[b] ?? 0) - (result.totalsByPlayerId[a] ?? 0)
        );
        return (
          <div key={match.id}>
            {sorted.map((playerId) => {
              const pts = result.totalsByPlayerId[playerId] ?? 0;
              const name = players.find((p) => p.id === playerId)?.name || playerId;
              const color = pts > 0 ? "#137333" : pts < 0 ? "#b3261e" : "#666";
              return (
                <div key={playerId} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span>{name}</span>
                  <span style={{ fontWeight: "bold", color }}>{pts > 0 ? `+${pts}` : pts} pts</span>
                </div>
              );
            })}
          </div>
        );
      })}
  </div>
)}


{birdiesEnabled && (
  <div style={{ border: "1px solid #ccc", padding: 12, marginBottom: 12 }}>
    <h3 style={{ marginTop: 0 }}>Birdies (Gross Side Bet)</h3>

    {activePlayers.map((player) => {
  const birdieHoles = [];

  for (let hole = 1; hole <= 18; hole += 1) {
    const score = scores[hole]?.[player.id];
    const par = Number(course.pars?.[hole - 1]);

    if (
      birdiesEnabled &&
      score != null &&
      Number(score) <= par - 1
    ) {
      birdieHoles.push(hole);
    }
  }

  if (birdieHoles.length === 0) return null;

  return (
    <div key={player.id}>
      {player.name}: holes {birdieHoles.join(", ")}
    </div>
  );
})}
  </div>
)}

<div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
  <button className="secondary-button" onClick={backToSetup}>Edit Setup</button>
<button className="secondary-button" onClick={goToResults}>Final Results</button>
  <button
  className="secondary-button"
  onClick={() => setShowScorecardEdit((prev) => !prev)}
>
    {showScorecardEdit ? "Hide Scorecard" : "Edit Scorecard"}
  </button>
</div>

{showScorecardEdit && (
  <div className="app-card">
    <h3 style={{ marginTop: 0 }}>Edit Scorecard</h3>

    <ScoresGrid
      players={enableTeamGame ? players : activePlayers}
      scores={scores}
      onSetScore={setScore}
    />
  </div>
)}

    </>
  )}
{screen === "results" && (
  <ResultsScreen
    players={activePlayers}
    leaderboard={leaderboard}
    computedResults={computedResults}
    roundSummaryRows={roundSummaryRows}
    enableTeamGame={enableTeamGame}
    scores={scores}
    course={course}
    matches={matches}
    matchResults={matchResults}
    birdieResults={birdieResults}
    teamGames={teamGames}
    teamGameResults={teamGameResults}
    getTeamGameSelection={getTeamGameSelection}
    handicapMode={handicapMode}
    teamGameUnitAmount={teamGameUnitAmount}
    noPar3TeamGame={noPar3TeamGame}
    goToLive={goToLive}
    backToSetup={backToSetup}
  />
)}
  </div>
);
}