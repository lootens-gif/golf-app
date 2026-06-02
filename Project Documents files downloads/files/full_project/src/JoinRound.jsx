import { useState, useEffect, useMemo, useRef } from "react";
import { fetchRound, subscribeToRound, unsubscribeFromRound } from "./lib/roundSync";
import ResultsScreen from "./screens/ResultsScreen";
import {
  getActivePlayers,
  playIndividualMatch,
  playPressMatch,
  scoreRound,
  buildBirdieResults,
  buildLeaderboard,
  settleSkinsRound,
} from "./engine/scoringEngine";

// Inlined from App.jsx
function getTeamGameRange(teamGames, index) {
  if (!teamGames || !teamGames[index]) return { start: 1, end: 6 };
  const start = teamGames.slice(0, index).reduce((sum, game) => sum + (Number(game.holes) || 6), 0) + 1;
  const end = start + (Number(teamGames[index].holes) || 6) - 1;
  return { start, end };
}

function normalizeTeam(arr) {
  return (arr || []).filter(Boolean);
}

function getTeamGameSelectionFromData(teamGames, index) {
  const game = teamGames?.[index];
  if (!game) return null;
  return game.teams || game.selection || null;
}

function buildTeamGameResults(teamGames, scores, players, course, handicapMode, mode, noPar3TeamGame) {
  return teamGames.map((game, index) => {
    const { start, end } = getTeamGameRange(teamGames, index);
    const selected = getTeamGameSelectionFromData(teamGames, index);
    const trigger = game.pressTrigger ?? 1;

    if (!selected) {
      return { index, start, end, duplicateError: true, matches: [] };
    }

    const context = { players, course, scores, handicapMode, noPar3TeamGame };
    const team1 = normalizeTeam(selected.team1);
    const team2 = normalizeTeam(selected.team2);
    const team3 = normalizeTeam(selected.team3);
    const team4 = normalizeTeam(selected.team4);
    const teamMatches = [];

    const addMatch = (label, teamA, teamB) => {
      if (teamA.length >= 1 && teamB.length >= 1) {
        teamMatches.push({
          label,
          result: playPressMatch({ teamA, teamB, start, end, trigger, context }),
        });
      }
    };

    if (mode === "5p") {
      addMatch("Team 1 vs Team 2", team1, team2);
      addMatch("Team 1 vs Team 3", team1, team3);
      addMatch("Team 1 vs Team 4", team1, team4);
    } else if (mode === "4p") {
      addMatch("Team 1 vs Team 2", team1, team2);
    } else {
      addMatch("Team 1 vs Team 2", team1, team2);
      addMatch("Team 1 vs Team 3", team1, team3);
    }

    return { index, start, end, matches: teamMatches };
  });
}

export default function JoinRound({ onBack, onJoinSuccess }) {
  const [code, setCode] = useState("");
  const [status, setStatus] = useState("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [roundData, setRoundData] = useState(null);
  const [channel, setChannel] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [joinedCode, setJoinedCode] = useState(null);
  const currentCodeRef = useRef(null);

  useEffect(() => {
    return () => {
      if (channel) unsubscribeFromRound(channel);
    };
  }, [channel]);

  // 30-second polling — starts after joining, restarts if code changes
  useEffect(() => {
    if (!joinedCode) return;
    const interval = setInterval(() => {
      fetchRound(joinedCode)
        .then(result => {
          if (result?.data) {
            setRoundData(result.data);
            setLastUpdated(result.updated_at);
          }
        })
        .catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, [joinedCode]);

  // Re-fetch when tab becomes visible again (fixes iOS Safari dropping subscription)
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "visible" && currentCodeRef.current) {
        fetchRound(currentCodeRef.current)
          .then(result => {
            if (result?.data) {
              setRoundData(result.data);
              setLastUpdated(result.updated_at);
            }
          })
          .catch(() => {});
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  async function joinRound() {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setStatus("loading");
    setErrorMsg("");

    try {
      const result = await fetchRound(trimmed);
      setRoundData(result.data);
      setLastUpdated(result.updated_at);
      setStatus("joined");
      currentCodeRef.current = trimmed;
      setJoinedCode(trimmed);
      setJoinedCode(trimmed);

      // Notify App so it can load the round and set isJoiner
      if (onJoinSuccess) {
        onJoinSuccess(trimmed, result.data);
      }

      const ch = subscribeToRound(trimmed, (newData) => {
        setRoundData(newData);
        setLastUpdated(new Date().toISOString());
      });
      setChannel(ch);
    } catch (err) {
      setStatus("error");
      setErrorMsg("Round not found. Check the code and try again.");
    }
  }

  const computed = useMemo(() => {
    if (!roundData) return null;

    const players = roundData.allPlayers || [];
    const scores = roundData.scores || {};
    const course = roundData.course || {};
    const matches = roundData.matches || [];
    const teamGames = roundData.teamGames || [];
    const handicapMode = roundData.handicapMode || "relative";
    const teamGameUnitAmount = Number(roundData.teamGameUnitAmount) || 5;
    const noPar3TeamGame = !!roundData.noPar3TeamGame;
    const mode = roundData.mode || "5p";
    const pressTrigger = Number(roundData.pressTrigger) || 1;
    const birdiesEnabled = !!roundData.birdiesEnabled;
    const birdieBetAmount = Number(roundData.birdieBetAmount) || 0;
    const enableTeamGame = !!roundData.enableTeamGame;
    const activePlayers = getActivePlayers(players, mode);

        const skinsEnabled = !!roundData.skinsEnabled;
    const skinsConfig = {
      skinsType: roundData.skinsType || "perSkin",
      skinsGross: !!roundData.skinsGross,
      skinValueAmount: Number(roundData.skinValueAmount) || 2,
      skinCarryover: !!roundData.skinCarryover,
      skinBirdie: !!roundData.skinBirdie,
      skinBirdieDoubleCarryover: !!roundData.skinBirdieDoubleCarryover,
      potType: roundData.potType || "perSkin",
      potDonation: Number(roundData.potDonation) || 0,
      potBaseUnit: Number(roundData.potBaseUnit) || 0,
      players: activePlayers,
    };
    const skinsResults = skinsEnabled && activePlayers.length
      ? (() => { try { return settleSkinsRound({ players: activePlayers, scores, course, handicapMode, skinsConfig }); } catch { return null; } })()
      : null;

    const context = { players, course, scores, handicapMode, pressTrigger };

    const matchResults = matches.map((match) => ({
      match,
      result: playIndividualMatch(match, context),
    }));

    const teamGameResults = buildTeamGameResults(
      teamGames, scores, players, course, handicapMode, mode, noPar3TeamGame
    );

    const getTeamGameSelection = (index) =>
      getTeamGameSelectionFromData(teamGames, index);

    const birdieResults = buildBirdieResults({
      matches,
      matchResults,
      teamGames: enableTeamGame ? teamGames : [],
      teamGameResults: enableTeamGame ? teamGameResults : [],
      scores,
      course,
      getTeamGameSelection,
      birdiesEnabled: roundData.birdiesEnabled || false,
      birdieBetAmount: Number(roundData.birdieBetAmount) || 0,
      toyRule: !!roundData.toyRule,
      players,
      handicapMode,
    });

    const computedResults = scoreRound(roundData, {
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

    return {
      activePlayers,
      matchResults,
      teamGameResults,
      getTeamGameSelection,
      birdieResults,
      computedResults,
      leaderboard: buildLeaderboard(computedResults?.playerLedger || [], { players }),
      scores,
      course,
      matches,
      teamGames,
      handicapMode,
      teamGameUnitAmount,
      noPar3TeamGame,
      enableTeamGame,
      skinsEnabled,
      skinsResults,
      skinsConfig,
    };
  }, [roundData]);

  if (status === "idle" || status === "loading" || status === "error") {
    return (
      <div style={{ padding: 24, maxWidth: 400, margin: "0 auto" }}>
        <h2>Join Live Round</h2>
        <p style={{ color: "#555", fontSize: 14 }}>
          Enter the code shared by the score keeper to see live results.
        </p>
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="1234"
            style={{
              flex: 1, padding: "10px 12px", fontSize: 18,
              letterSpacing: 2, border: "2px solid #ccc",
              borderRadius: 8, textTransform: "uppercase",
            }}
            onKeyDown={(e) => e.key === "Enter" && joinRound()}
          />
          <button
            onClick={joinRound}
            disabled={status === "loading" || !code.trim()}
            style={{ padding: "10px 20px", fontSize: 16 }}
          >
            {status === "loading" ? "..." : "Join"}
          </button>
        </div>
        {status === "error" && (
          <div style={{ color: "#b3261e", marginBottom: 12 }}>{errorMsg}</div>
        )}
        <button onClick={onBack} style={{ fontSize: 13, color: "#666" }}>
          ← Back
        </button>
      </div>
    );
  }

  if (status === "joined" && computed) {
    return (
      <div style={{ padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div>
            <span style={{ fontWeight: 700, fontSize: 16 }}>Live: {code.toUpperCase()}</span>
            {lastUpdated && (
              <span style={{ fontSize: 11, color: "#888", marginLeft: 8 }}>
                Updated {new Date(lastUpdated).toLocaleTimeString()}
              </span>
            )}
          </div>
          <button onClick={onBack} style={{ fontSize: 13 }}>✕ Leave</button>
        </div>
        <div style={{
          display: "inline-block", padding: "4px 10px",
          background: "#e8f5e9", borderRadius: 12,
          fontSize: 12, color: "#137333", marginBottom: 16
        }}>
          🟢 Live — updates automatically
        </div>
        <ResultsScreen
          players={computed.activePlayers}
          leaderboard={computed.leaderboard}
          computedResults={computed.computedResults}
          scores={computed.scores}
          course={computed.course}
          matches={computed.matches}
          matchResults={computed.matchResults}
          birdieResults={computed.birdieResults}
          teamGames={computed.teamGames}
          teamGameResults={computed.teamGameResults}
          getTeamGameSelection={computed.getTeamGameSelection}
          handicapMode={computed.handicapMode}
          teamGameUnitAmount={computed.teamGameUnitAmount}
          noPar3TeamGame={computed.noPar3TeamGame}
          enableTeamGame={computed.enableTeamGame}
          skinsEnabled={computed.skinsEnabled}
          skinsResults={computed.skinsResults}
          skinsConfig={computed.skinsConfig}
          isJoiner={true}
          onRefresh={() => {
            if (joinedCode) fetchRound(joinedCode).then(r => { if (r?.data) { setRoundData(r.data); setLastUpdated(r.updated_at); } }).catch(() => {});
          }}
        />
      </div>
    );
  }

  return null;
}
