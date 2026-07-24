/**
 * PlayerSetupPanel.test.js
 *
 * Regression test for two Setup UX fixes made together:
 *
 * 1) The Name field used to auto-open a player's HCP keypad on ANY blur,
 *    as long as the name was non-empty — including a blur caused by
 *    tapping a totally unrelated control elsewhere on the page (reported:
 *    selecting Team Mode while a name field still had focus popped that
 *    player's keypad open unexpectedly), and including editing an
 *    ALREADY-named player just to fix a typo mid-round ("John" -> "Jon"),
 *    which shouldn't summon the keypad at all. Fix: only auto-open when
 *    the name was still a placeholder ("P1"/"P2"/blank) at the moment the
 *    field was focused and is now a real name — i.e. this is unambiguously
 *    a fresh name being entered, not a correction to an existing one.
 *    (Default players ship with sample HCP values already filled in, so
 *    "HCP is blank" was considered and rejected as the signal — it
 *    wouldn't distinguish these cases.)
 *
 * 2) The keypad's "Done" button used to just close with no follow-up,
 *    requiring a manual tap into the next field every time. Fix: Done now
 *    smart-advances — straight into the next active player's own HCP
 *    keypad if they already have a real name (the "type all names first"
 *    flow), or into their Name field if they don't yet (the "name, HCP,
 *    name, HCP" flow) — and just closes normally on the last active
 *    player, since there's nothing left to advance to.
 *
 * Run with: npm test -- --testPathPattern=PlayerSetupPanel
 */

import { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import PlayerSetupPanel from "./PlayerSetupPanel";

// PlayerSetupPanel is a controlled component — players/onPlayerChange are
// owned by the parent in the real app. This wrapper holds that state
// locally so the tests can exercise real typing/blur/click behavior the
// way the actual Setup screen does.
function Wrapper({ initialPlayers, mode = "5p" }) {
  const [players, setPlayers] = useState(initialPlayers);
  const handlePlayerChange = (index, field, value) => {
    setPlayers((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)));
  };
  return (
    <PlayerSetupPanel mode={mode} players={players} onPlayerChange={handlePlayerChange} onResetSetup={() => {}} />
  );
}

function defaultFivePlayers() {
  return [
    { id: "p1", name: "P1", hcp: 10 },
    { id: "p2", name: "P2", hcp: 8 },
    { id: "p3", name: "P3", hcp: 12 },
    { id: "p4", name: "P4", hcp: 5 },
    { id: "p5", name: "P5", hcp: 15 },
  ];
}

function nameInputs() {
  return screen.getAllByPlaceholderText("Name");
}

describe("PlayerSetupPanel — name-blur auto-open", () => {
  test("typing a real name over a placeholder ('P1') and blurring auto-opens that player's HCP keypad", () => {
    render(<Wrapper initialPlayers={defaultFivePlayers()} />);
    const input = nameInputs()[0];
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "Alice" } });
    fireEvent.blur(input);
    expect(screen.getByText("Alice HCP")).toBeInTheDocument();
  });

  test("does NOT auto-open when editing an already-named player (the 'John' -> 'Jon' correction case)", () => {
    const players = defaultFivePlayers();
    players[0] = { ...players[0], name: "John" };
    render(<Wrapper initialPlayers={players} />);
    const input = nameInputs()[0];
    fireEvent.focus(input); // captures "John" as the at-focus value
    fireEvent.change(input, { target: { value: "Jon" } });
    fireEvent.blur(input);
    expect(screen.queryByText("Jon HCP")).not.toBeInTheDocument();
  });

  test("does NOT auto-open on a blur that isn't caused by a real edit (e.g. tapping away from an untouched real name)", () => {
    const players = defaultFivePlayers();
    players[1] = { ...players[1], name: "Bob" };
    render(<Wrapper initialPlayers={players} />);
    const input = nameInputs()[1];
    fireEvent.focus(input);
    fireEvent.blur(input); // no change at all — simulates the reported Team Mode dropdown scenario
    expect(screen.queryByText("Bob HCP")).not.toBeInTheDocument();
  });
});

describe("PlayerSetupPanel — Done button smart-advance", () => {
  test("advances straight into the NEXT player's HCP keypad when that player already has a real name (all-names-first flow)", () => {
    const players = defaultFivePlayers();
    players[0] = { ...players[0], name: "Alice" };
    players[1] = { ...players[1], name: "Bob" };
    render(<Wrapper initialPlayers={players} />);

    // Open Alice's keypad directly (tap the HCP box) and hit Done.
    fireEvent.click(screen.getByText("10")); // Alice's current HCP display
    expect(screen.getByText("Alice HCP")).toBeInTheDocument();
    fireEvent.pointerDown(screen.getByText("Done"));

    // Bob already has a real name -> his keypad should now be open.
    expect(screen.getByText("Bob HCP")).toBeInTheDocument();
  });

  test("advances into the NEXT player's Name field when that player has no real name yet (name-then-HCP flow)", () => {
    const players = defaultFivePlayers();
    players[0] = { ...players[0], name: "Alice" }; // player 2 ("P2") still a placeholder
    render(<Wrapper initialPlayers={players} />);

    fireEvent.click(screen.getByText("10"));
    expect(screen.getByText("Alice HCP")).toBeInTheDocument();
    fireEvent.pointerDown(screen.getByText("Done"));

    // No keypad should have opened for player 2 (still unnamed)...
    expect(screen.queryByText("P2 HCP")).not.toBeInTheDocument();
    // ...instead focus should have landed on player 2's Name field.
    expect(document.activeElement).toBe(nameInputs()[1]);
  });

  test("on the LAST active player, Done just closes — nothing left to advance to", () => {
    const players = defaultFivePlayers();
    players[4] = { ...players[4], name: "Eve" };
    render(<Wrapper initialPlayers={players} />);

    fireEvent.click(screen.getByText("15")); // Eve's (player 5) HCP display
    expect(screen.getByText("Eve HCP")).toBeInTheDocument();
    fireEvent.pointerDown(screen.getByText("Done"));

    expect(screen.queryByText("Eve HCP")).not.toBeInTheDocument();
  });

  test("respects the active player count for the current mode — advancing past the last 3p player doesn't crash or reach into unused slots", () => {
    const players = defaultFivePlayers().slice(0, 3);
    players[2] = { ...players[2], name: "Carl" };
    render(<Wrapper initialPlayers={players} mode="3p" />);

    fireEvent.click(screen.getByText("12")); // Carl (player 3, last active in 3p mode)
    expect(screen.getByText("Carl HCP")).toBeInTheDocument();
    expect(() => fireEvent.pointerDown(screen.getByText("Done"))).not.toThrow();
    expect(screen.queryByText("Carl HCP")).not.toBeInTheDocument();
  });
});
