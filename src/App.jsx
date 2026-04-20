import { useEffect, useMemo, useState } from "react";
import { defaultPlayers } from "./data/defaultPlayers";
import {
  getActivePlayers,
  playIndividualMatch,
  buildLeaderboard,
  playPressMatch,
  getBirdieSideBetResult,
  scoreRound,
} from "./engine/scoringEngine";
import SettingsPanel from "./components/SettingsPanel";
import PlayerSetupPanel from "./components/PlayerSetupPanel";
import CourseEditor from "./components/CourseEditor";
import ScoresGrid from "./components/ScoresGrid";
import MatchList from "./components/MatchList";
import DebugPanel from "./components/DebugPanel";
import SettlementSection from "./components/SettlementSection";

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

function formatBetScore(score) {
  if (score === 0) return "Tie";
  if (score > 0) return `${score} up`;
  return `${Math.abs(score)} down`;
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
  const [birdieMode, setBirdieMode] = useState("off");
  const [handicapMode, setHandicapMode] = useState("relative");
  const [matches, setMatches] = useState([]);
  const [showDebug, setShowDebug] = useState(false);
  const [debugGameIndex, setDebugGameIndex] = useState(0);
  const [debugMatchKey, setDebugMatchKey] = useState("team2");
  const [savedRoundName, setSavedRoundName] = useState("");
  const [savedRounds, setSavedRounds] = useState([]);
  const [selectedSavedRoundId, setSelectedSavedRoundId] = useState("");
  const [round] = useState(createEmptyRound());
  function createDefaultTeamGame(index = 0) {
    return {
      id: `team-game-${Date.now()}-${index}`,
      holes: 6,
      pressTrigger: 1,
      teams: {},
    };
  }

  const [teamGames, setTeamGames] = useState([
    createDefaultTeamGame(1),
    createDefaultTeamGame(2),
    createDefaultTeamGame(3),
  ]);

  const [teamGameUnitAmount, setTeamGameUnitAmount] = useState(1);
  const [birdieUnitAmount, setBirdieUnitAmount] = useState(1);
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
      birdieMode,
      
      handicapMode,
      birdieUnitAmount,
    }),
    [
      players,
      course,
      scores,
      birdieMode,
      handicapMode,
      birdieUnitAmount,
    ]
  );

  function resetRoundData() {
    setScores({});
    setMatches([]);
    setTeamGames([
      createDefaultTeamGame(1),
      createDefaultTeamGame(2),
      createDefaultTeamGame(3),
    ]);
  }

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

  function getTeamGameSettlement(result, unitAmount = 1) {
  const wins = result.filter((bet) => bet.score > 0).length;
  const losses = result.filter((bet) => bet.score < 0).length;
  const pushes = result.filter((bet) => bet.score === 0).length;
  const netUnits = wins - losses;
  const netDollars = netUnits * unitAmount;

  return {
    wins,
    losses,
    pushes,
    netUnits,
    netDollars,
  };
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


  const leaderboard = useMemo(() => {
    return buildLeaderboard(matches, context);
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
        birdieSummary: getBirdieSideBetResult({
          teamA: team1,
          teamB: team2,
          start,
          end,
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
        birdieSummary: getBirdieSideBetResult({
          teamA: team1,
          teamB: team3,
          start,
          end,
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
        birdieSummary: getBirdieSideBetResult({
          teamA: team1,
          teamB: team4,
          start,
          end,
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
        birdieSummary: getBirdieSideBetResult({
          teamA: team1,
          teamB: team2,
          start,
          end,
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
      birdieSummary: getBirdieSideBetResult({
        teamA: team1,
        teamB: team2,
        start,
        end,
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

console.log(
  "teamGameResults first match birdieSummary",
  teamGameResults?.[0]?.matches?.[0]?.birdieSummary
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
});

  function saveSetup() {
    try {
      const setup = {
        mode,
        allPlayers,
        course,
        birdieMode,
        handicapMode,
        teamGameUnitAmount,
        birdieUnitAmount,
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
      if (setup.birdieMode) setBirdieMode(setup.birdieMode);
      
      if (setup.handicapMode) setHandicapMode(setup.handicapMode);
      if (typeof setup.teamGameUnitAmount === "number") {
        setTeamGameUnitAmount(setup.teamGameUnitAmount);
      }
      if (typeof setup.birdieUnitAmount === "number") {
        setBirdieUnitAmount(setup.birdieUnitAmount);
      }
      if (Array.isArray(setup.teamGames)) {
        setTeamGames(
          setup.teamGames.map((game, index) => ({
            id: game.id || `team-game-${Date.now()}-${index}`,
            holes: Number(game.holes) || 6,
            pressTrigger: Number(game.pressTrigger) || 1,
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
    if (round.birdieMode) setBirdieMode(round.birdieMode);
    
    if (round.handicapMode) setHandicapMode(round.handicapMode);
    if (typeof round.teamGameUnitAmount === "number") {
      setTeamGameUnitAmount(round.teamGameUnitAmount);
    }
    if (typeof round.birdieUnitAmount === "number") {
      setBirdieUnitAmount(round.birdieUnitAmount);
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
      birdieMode,
      handicapMode,
      teamGameUnitAmount,
      birdieUnitAmount,
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
    birdieMode,
    handicapMode,
    teamGameUnitAmount,
    birdieUnitAmount,
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
    if (round.birdieMode) setBirdieMode(round.birdieMode);
  
    if (round.handicapMode) setHandicapMode(round.handicapMode);
    if (typeof round.teamGameUnitAmount === "number") {
      setTeamGameUnitAmount(round.teamGameUnitAmount);
    }
    if (typeof round.birdieUnitAmount === "number") {
      setBirdieUnitAmount(round.birdieUnitAmount);
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
    setBirdieMode("off");
    setHandicapMode("relative");
    setTeamGameUnitAmount(1);
    setBirdieUnitAmount(1);
    resetRoundData();
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

  return (
    <div style={{ padding: 12 }}>
      <h2>Golf Betting App</h2>

      <SettingsPanel
        mode={mode}
        setMode={handleModeChange}
        birdieMode={birdieMode}
        setBirdieMode={setBirdieMode}
        handicapMode={handicapMode}
        setHandicapMode={setHandicapMode}
      />

      <PlayerSetupPanel
        mode={mode}
        players={players}
        onPlayerChange={handlePlayerChange}
        onSaveSetup={saveSetup}
        onLoadSetup={loadSetup}
        onResetSetup={resetSetup}
      />

<div style={{ marginBottom: 12 }}>
  <button onClick={saveLastRound} style={{ marginRight: 8 }}>
    Save Last Round
  </button>

  <button onClick={loadLastRound}>
    Load Last Round
  </button>
</div>

<div style={{ border: "1px solid gray", padding: 10, marginBottom: 12 }}>
  <h3 style={{ marginTop: 0 }}>Saved Test Rounds</h3>

  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
    <input
      type="text"
      value={savedRoundName}
      onChange={(e) => setSavedRoundName(e.target.value)}
      placeholder="Enter round name"
      style={{ minWidth: 220 }}
    />

    <button onClick={saveNamedRound}>Save Named Round</button>
  </div>

  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
    <select
      value={selectedSavedRoundId}
      onChange={(e) => setSelectedSavedRoundId(e.target.value)}
      style={{ minWidth: 260 }}
    >
      <option value="">Select saved round</option>
      {savedRounds.map((round) => (
        <option key={round.id} value={round.id}>
          {round.name}
        </option>
      ))}
    </select>

    <button onClick={loadNamedRound}>Load Named Round</button>
    <button onClick={deleteNamedRound}>Delete Named Round</button>
  </div>
</div>

      {setupMessage && (
        <div style={{ marginBottom: 12, color: "green" }}>
          {setupMessage}
        </div>
      )}

      <div style={{ border: "1px solid gray", padding: 10, marginBottom: 12 }}>
        <h3>Course Setup</h3>

        <div style={{ marginBottom: 10 }}>
          <label>
            Course Name:
         <input
            type="text"
            value={course.name || ""}
            onFocus={(e) => e.target.select()}
            onChange={(e) => updateCourseName(e.target.value)}
            style={{ marginLeft: 6 }}
/>   
          </label>
        </div>

        <CourseEditor
          course={course}
          onParChange={updateCoursePar}
          onHcpChange={updateCourseHcp}
        />
      </div>

      <div style={{ border: "1px solid gray", padding: 10, marginBottom: 12 }}>
        <h3>Team Game & Birdie Betting</h3>

        <div style={{ marginBottom: 8 }}>
          <label>
            Team Game Unit Amount:
            <input
              type="number"
              value={teamGameUnitAmount}
              onChange={(e) => setTeamGameUnitAmount(Number(e.target.value) || 1)}
              style={{ width: 80, marginLeft: 6 }}
            />
          </label>
        </div>

        <div>
          <label>
            Team Game Birdie Unit Amount:
            <input
              type="number"
              value={birdieUnitAmount}
              onChange={(e) => setBirdieUnitAmount(Number(e.target.value) || 1)}
              style={{ width: 80, marginLeft: 6 }}
            />
          </label>
        </div>
      </div>

      <h3>Team Game Selector</h3>

      <div style={{ marginBottom: 12 }}>
        <strong>Game Hole Setup</strong>

<strong>Game Hole Setup</strong>

<div style={{ marginTop: 8, marginBottom: 10 }}>
  <button onClick={() => applyPreset("6-6-6")}>
    6 / 6 / 6
  </button>

  <button
    onClick={() => applyPreset("9-9")}
    style={{ marginLeft: 8 }}
  >
    9 / 9
  </button>
</div>

        <div style={{ marginTop: 8, marginBottom: 8 }}>
          <button
            onClick={() =>
              setTeamGames((prev) => [
                ...prev,
                createDefaultTeamGame(prev.length + 1),
              ])
            }
          >
            Add Team Game
          </button>
        </div>

        {totalHoles !== 18 && (
          <div style={{ color: "red", marginBottom: 10 }}>
            Total holes must equal 18 (currently {totalHoles})
          </div>
        )}
      </div>

      {teamGames.map((game, index) => {
        const { start, end } = getTeamGameRange(teamGames, index);
        const duplicateError = hasDuplicateSelections(
          getTeamGameSelection(index),
          mode
        );

        return (
          <div
            key={game.id}
            style={{ border: "1px solid gray", margin: 6, padding: 10 }}
          >
            <div>
              <strong>
                Game {index + 1}: Holes {start}-{end}
              </strong>
            </div>

            <div
              style={{
                marginTop: 8,
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <label>
                Holes:
                <input
                  type="number"
                  min={1}
                  max={18}
                  value={game.holes ?? 1}
                  onChange={(e) => {
                    const value = Number(e.target.value) || 1;
                    setTeamGames((prev) =>
                      prev.map((g, i) =>
                        i === index ? { ...g, holes: value } : g
                      )
                    );
                  }}
                  style={{ width: 60, marginLeft: 6 }}
                />
              </label>

              <label>
                Press Trigger:
                <input
                  type="number"
                  min={1}
                  value={game.pressTrigger ?? 1}
                  onChange={(e) => {
                    const value = Number(e.target.value) || 1;
                    setTeamGames((prev) =>
                      prev.map((g, i) =>
                        i === index ? { ...g, pressTrigger: value } : g
                      )
                    );
                  }}
                  style={{ width: 60, marginLeft: 6 }}
                />
              </label>

              {teamGames.length > 1 && (
                <button
                  onClick={() =>
                    setTeamGames((prev) => prev.filter((_, i) => i !== index))
                  }
                >
                  Remove Game
                </button>
              )}
            </div>

            <div style={{ marginTop: 6 }}>
              {mode === "5p" &&
                "Select Team 1, Team 2, Team 3, and Team 4. Team 1 plays 3 team matches against Teams 2, 3, and 4."}
              {mode === "4p" &&
                "Select Team 1 and Team 2. One 2v2 match is played for this game."}
              {mode === "3p" &&
                "Select Team 1 as 2 players and Team 2 as 1 player. One 2v1 match is played for this game."}
            </div>

            {renderTeamSelectors(index)}

            {duplicateError && (
              <div style={{ marginTop: 8, color: "red" }}>
                Duplicate players in this game are not allowed.
              </div>
            )}
          </div>
        );
      })}

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

  {showDebug && (
    <div style={{ marginTop: 10, display: "flex", gap: 12, flexWrap: "wrap" }}>
      <label>
        Team Game:
        <select
          value={debugGameIndex}
          onChange={(e) => setDebugGameIndex(Number(e.target.value))}
          style={{ marginLeft: 6 }}
        >
          {teamGames.map((game, index) => (
            <option key={game.id} value={index}>
              Game {index + 1}
            </option>
          ))}
        </select>
      </label>

      <label>
        Matchup:
        <select
          value={debugMatchKey}
          onChange={(e) => setDebugMatchKey(e.target.value)}
          style={{ marginLeft: 6 }}
        >
          <option value="team2">Team 1 vs Team 2</option>
          <option value="team3">Team 1 vs Team 3</option>
          <option value="team4">Team 1 vs Team 4</option>
        </select>
      </label>
    </div>
  )}
</div>

      <h3>Team Game Results</h3>
      {teamGameResults.map((game) => (
        <div
          key={game.index}
          style={{ border: "1px solid gray", margin: 6, padding: 10 }}
        >
          <div>
            <strong>
              Game {game.index + 1}: Holes {game.start}-{game.end}
            </strong>
          </div>

          {game.duplicateError ? (
            <div style={{ marginTop: 6, color: "red" }}>
              Fix duplicate player selections before results can be calculated.
            </div>
          ) : game.matches.length === 0 ? (
            <div style={{ marginTop: 6 }}>No valid team matches selected yet.</div>
          ) : (
            game.matches.map((match, idx) => {
              const settlement = getTeamGameSettlement(
                match.result,
                teamGameUnitAmount
              );

              return (
                <div
                  key={idx}
                  style={{
                    border: "1px solid #ccc",
                    marginTop: 8,
                    padding: 8,
                  }}
                >
                  <div style={{ marginBottom: 6 }}>
                    <strong>{match.label}</strong>
                  </div>

                  <div style={{ marginBottom: 4 }}>
                    Trigger: {teamGames[game.index]?.pressTrigger ?? 1} downs
                  </div>

                  {match.result.map((bet, betIndex) => (
                    <div key={betIndex}>
                      {bet.label} = {formatBetScore(bet.score)}
                    </div>
                  ))}

                  <div
                    style={{
                      marginTop: 8,
                      borderTop: "1px solid #ddd",
                      paddingTop: 8,
                    }}
                  >
                    <div>Wins: {settlement.wins}</div>
                    <div>Losses: {settlement.losses}</div>
                    <div>Pushes: {settlement.pushes}</div>
                    <div>
                      <strong>Net Units: {settlement.netUnits}</strong>
                    </div>
                    <div>
                      <strong>Net Dollars: ${settlement.netDollars}</strong>
                    </div>
                  </div>

                  {match.birdieSummary?.enabled && (
  <div
    style={{
      marginTop: 8,
      borderTop: "1px solid #ddd",
      paddingTop: 8,
    }}
  >
    <div>
      <strong>Birdie Side Bet</strong>
    </div>
    <div>Net Birdie Units: {match.birdieSummary.units}</div>
    <div>Birdie Payout: ${match.birdieSummary.dollars}</div>

    <div style={{ marginTop: 8 }}>
      <strong>Team A Birdies</strong>
      {match.birdieSummary.holes?.some(
        (entry) => (entry.teamAPlayers || []).length > 0
      ) ? (
        Object.entries(
          (match.birdieSummary.holes || []).reduce((acc, entry) => {
            (entry.teamAPlayers || []).forEach((playerId) => {
              const player = players.find((p) => p.id === playerId);
              const name = player?.name || playerId;
              if (!acc[name]) acc[name] = [];
              acc[name].push(entry.hole);
            });
            return acc;
          }, {})
        ).map(([name, holes]) => (
          <div key={name}>
            {name}: {holes.join(", ")}
          </div>
        ))
      ) : (
        <div>-</div>
      )}
    </div>

    <div style={{ marginTop: 8 }}>
      <strong>Team B Birdies</strong>
      {match.birdieSummary.holes?.some(
        (entry) => (entry.teamBPlayers || []).length > 0
      ) ? (
        Object.entries(
          (match.birdieSummary.holes || []).reduce((acc, entry) => {
            (entry.teamBPlayers || []).forEach((playerId) => {
              const player = players.find((p) => p.id === playerId);
              const name = player?.name || playerId;
              if (!acc[name]) acc[name] = [];
              acc[name].push(entry.hole);
            });
            return acc;
          }, {})
        ).map(([name, holes]) => (
          <div key={name}>
            {name}: {holes.join(", ")}
          </div>
        ))
      ) : (
        <div>-</div>
      )}
    </div>
  </div>
)}
                </div>
              );
            })
          )}
        </div>
      ))}

<div style={{ marginBottom: 12 }}>
  <button onClick={addMatch}>Add Match</button>

  <button
    onClick={addNinePointMatch}
    style={{ marginLeft: 8 }}
  >
    Add 9 Point Match
  </button>
</div>

      <MatchList
        players={players}
        matches={matches}
        results={matchResults}
        onAddMatch={addMatch}
        onUpdateMatch={updateMatch}
        onRemoveMatch={removeMatch}
      />

      <ScoresGrid players={players} scores={scores} onSetScore={setScore} />

      <h3>Leaderboard</h3>
      <div>
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
    </div>
  );
}