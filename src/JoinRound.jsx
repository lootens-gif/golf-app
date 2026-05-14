import { useState, useEffect } from "react";
import { fetchRound, subscribeToRound, unsubscribeFromRound } from "./lib/roundSync";
import ResultsScreen from "./screens/ResultsScreen";
import {
  getActivePlayers,
  buildLeaderboard,
  scoreRound,
  buildBirdieResults,
} from "./engine/scoringEngine";

export default function JoinRound({ onBack }) {
  const [code, setCode] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | joined | error
  const [errorMsg, setErrorMsg] = useState("");
  const [roundData, setRoundData] = useState(null);
  const [channel, setChannel] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    return () => {
      if (channel) unsubscribeFromRound(channel);
    };
  }, [channel]);

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

      // Subscribe to live updates
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
            placeholder="GOLF-1234"
            style={{
              flex: 1,
              padding: "10px 12px",
              fontSize: 18,
              letterSpacing: 2,
              border: "2px solid #ccc",
              borderRadius: 8,
              textTransform: "uppercase",
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

  if (status === "joined" && roundData) {
    // Reconstruct computed results from round data
    const players = roundData.allPlayers || [];
    const scores = roundData.scores || {};
    const course = roundData.course || {};
    const matches = roundData.matches || [];
    const teamGames = roundData.teamGames || [];
    const handicapMode = roundData.handicapMode || "relative";
    const teamGameUnitAmount = roundData.teamGameUnitAmount || 5;
    const noPar3TeamGame = !!roundData.noPar3TeamGame;

    const activePlayers = getActivePlayers(players, roundData.mode || "5p");
    const birdieResults = buildBirdieResults(matches, activePlayers, players, scores, course, handicapMode);

    // Build match results
    const matchResults = matches.map((match) => ({
      match,
      result: null, // simplified for read-only view
    }));

    const leaderboard = buildLeaderboard(players, scores, matches, teamGames, course, handicapMode);

    const computedResults = scoreRound(roundData, {
      players,
      scores,
      course,
      matches,
      matchResults: [],
      teamGames,
      teamGameResults: [],
      teamGameUnitAmount,
      pressTrigger: roundData.pressTrigger || 1,
      birdiesEnabled: roundData.birdiesEnabled || false,
      birdieBetAmount: roundData.birdieBetAmount || 0,
      getTeamGameSelection: () => null,
      mode: roundData.mode || "5p",
      birdieResults,
      noPar3TeamGame,
    });

    return (
      <div style={{ padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
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

        <div style={{ display: "inline-block", padding: "4px 10px", background: "#e8f5e9", borderRadius: 12, fontSize: 12, color: "#137333", marginBottom: 16 }}>
          🟢 Live — updates automatically
        </div>

        <ResultsScreen
          players={activePlayers}
          leaderboard={leaderboard}
          computedResults={computedResults}
          scores={scores}
          course={course}
          matches={matches}
          matchResults={matchResults}
          birdieResults={birdieResults}
          teamGames={teamGames}
          teamGameResults={[]}
          getTeamGameSelection={() => null}
          handicapMode={handicapMode}
          teamGameUnitAmount={teamGameUnitAmount}
          noPar3TeamGame={noPar3TeamGame}
          enableTeamGame={!!roundData.enableTeamGame}
        />
      </div>
    );
  }

  return null;
}
