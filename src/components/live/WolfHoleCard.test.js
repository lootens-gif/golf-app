/**
 * WolfHoleCard.test.js
 * Run with: npm test -- --testPathPattern=WolfHoleCard
 *
 * REWRITTEN for the 3-tier solo system confirmed by Harrison: Wolf
 * (default, no declaration) / Lone Wolf (declared after own shot) /
 * Blind Wolf (declared before own shot) — replacing the old 2-tier
 * lone/blind system. Actually renders and clicks through the component.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import WolfHoleCard, { getWolfFormat, isWolfHoleConfirmed } from './WolfHoleCard';

const PLAYERS = [
  { id: 'W', name: 'Wolf' },
  { id: 'P2', name: 'P2' },
  { id: 'P3', name: 'P3' },
  { id: 'P4', name: 'P4' },
  { id: 'P5', name: 'P5' },
];

function Harness({ initialHoles = {}, hammerEnabled = false, currentHole = 1 }) {
  const [wolfHoles, setWolfHoles] = require('react').useState(initialHoles);
  const onUpdateWolfHole = (hole, updates) => {
    setWolfHoles((prev) => ({ ...prev, [hole]: { ...prev[hole], ...updates } }));
  };
  return (
    <WolfHoleCard
      currentHole={currentHole}
      players={PLAYERS}
      wolfHoles={wolfHoles}
      onUpdateWolfHole={onUpdateWolfHole}
      hammerEnabled={hammerEnabled}
    />
  );
}

describe('WolfHoleCard — basic rendering', () => {
  test('shows the correct Wolf for hole 1 (rotation index 0)', () => {
    render(<Harness />);
    expect(screen.getByText('Hole 1 — Wolf')).toBeInTheDocument();
    expect(screen.getByText('Wolf')).toBeInTheDocument(); // player named "Wolf" is up on hole 1
  });

  test('shows the correct Wolf for hole 2 (rotation index 1)', () => {
    render(<Harness currentHole={2} />);
    expect(screen.getByText('Hole 2 — Wolf')).toBeInTheDocument();
  });

  test('shows a guard message with fewer than 5 players', () => {
    function Bad() {
      return (
        <WolfHoleCard
          currentHole={1}
          players={PLAYERS.slice(0, 4)}
          wolfHoles={{}}
          onUpdateWolfHole={() => {}}
        />
      );
    }
    render(<Bad />);
    expect(screen.getByText(/needs exactly 5 active players/i)).toBeInTheDocument();
  });
});

describe('WolfHoleCard — partner selection (default "Wolf" tier)', () => {
  test('tapping a partner selects them and shows the Pack Wolf summary', () => {
    render(<Harness />);
    fireEvent.click(screen.getByText('P2'));
    expect(screen.getByText(/Pack Wolf · Wolf \+ P2 vs\. the other 3/)).toBeInTheDocument();
  });

  test('tapping the same partner again deselects — back to default Wolf summary', () => {
    render(<Harness />);
    fireEvent.click(screen.getByText('P2'));
    fireEvent.click(screen.getByText('P2'));
    expect(screen.getByText(/Wolf — Solo Wolf · 1v4/)).toBeInTheDocument();
  });

  test('no partner selected defaults to the base Wolf summary (no early declaration)', () => {
    render(<Harness />);
    expect(screen.getByText(/Wolf — Solo Wolf · 1v4/)).toBeInTheDocument();
  });
});

describe('WolfHoleCard — shuck', () => {
  test('shuck toggle only appears after a partner is picked', () => {
    render(<Harness />);
    expect(screen.queryByText(/shucked/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('P2'));
    expect(screen.getByText('P2 shucked')).toBeInTheDocument();
  });

  test('flipping the shuck toggle switches the summary to reflect the Wolf being left alone, not the shucker', () => {
    render(<Harness />);
    fireEvent.click(screen.getByText('P2'));
    fireEvent.click(screen.getByText('P2 shucked'));
    expect(screen.getByText(/P2 shucked \S+ · Wolf plays alone vs\. everyone, 1v4/)).toBeInTheDocument();
  });
});

describe('WolfHoleCard — Lone Wolf (declared after own shot, 2x tier)', () => {
  test('declaring Lone Wolf clears any partner selection and hides the partner picker', () => {
    render(<Harness />);
    fireEvent.click(screen.getByText('P2')); // pick a partner first
    fireEvent.click(screen.getByText('Lone Wolf'));
    expect(screen.getByText(/Wolf — Lone Wolf · 1v4/)).toBeInTheDocument();
    expect(screen.queryByText('P2')).not.toBeInTheDocument();
  });

  test('undoing the Lone Wolf declaration brings back the partner picker', () => {
    render(<Harness />);
    fireEvent.click(screen.getByText('Lone Wolf'));
    fireEvent.click(screen.getByText('✓ Lone Wolf'));
    expect(screen.getByText('P2')).toBeInTheDocument();
  });

  test('Lone Wolf and Blind Wolf are mutually exclusive — picking one clears the other', () => {
    render(<Harness />);
    fireEvent.click(screen.getByText('Lone Wolf'));
    expect(screen.getByText(/Lone Wolf · 1v4/)).toBeInTheDocument();
    fireEvent.click(screen.getByText('Blind Wolf'));
    expect(screen.getByText(/Wolf — Blind Wolf · 1v4/)).toBeInTheDocument();
    expect(screen.queryByText(/Wolf — Lone Wolf/)).not.toBeInTheDocument();
  });
});

describe('WolfHoleCard — Blind Wolf (declared before own shot, 3x tier)', () => {
  test('declaring Blind Wolf clears any partner selection and hides the partner picker', () => {
    render(<Harness />);
    fireEvent.click(screen.getByText('P2'));
    fireEvent.click(screen.getByText('Blind Wolf'));
    expect(screen.getByText(/Wolf — Blind Wolf · 1v4/)).toBeInTheDocument();
    expect(screen.queryByText('P2')).not.toBeInTheDocument();
  });

  test('undoing the Blind Wolf declaration brings back the partner picker', () => {
    render(<Harness />);
    fireEvent.click(screen.getByText('Blind Wolf'));
    fireEvent.click(screen.getByText('✓ Blind Wolf'));
    expect(screen.getByText('P2')).toBeInTheDocument();
  });

  test('shows a clear "tap to undo" hint once active, so an accidental tap is easy to reverse', () => {
    render(<Harness />);
    fireEvent.click(screen.getByText('Blind Wolf'));
    expect(screen.getAllByText('tap to undo').length).toBeGreaterThan(0);
  });
});

describe('WolfHoleCard — Hammer entry', () => {
  test('hammer section is hidden entirely when hammerEnabled is false', () => {
    render(<Harness hammerEnabled={false} />);
    expect(screen.queryByText('Hammer')).not.toBeInTheDocument();
  });

  test('tapping 2x selects it, and the resolution question appears', () => {
    render(<Harness hammerEnabled />);
    fireEvent.click(screen.getByText('2x'));
    expect(screen.getByText('How did it end?')).toBeInTheDocument();
    expect(screen.getByText('Played out')).toBeInTheDocument();
  });

  test('More reveals 8x/16x/32x', () => {
    render(<Harness hammerEnabled />);
    expect(screen.queryByText('8x')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('More'));
    expect(screen.getByText('8x')).toBeInTheDocument();
    expect(screen.getByText('16x')).toBeInTheDocument();
    expect(screen.getByText('32x')).toBeInTheDocument();
  });

  test('selecting Rejected reveals the concede buttons', () => {
    render(<Harness hammerEnabled />);
    fireEvent.click(screen.getByText('2x'));
    fireEvent.click(screen.getByText('Rejected'));
    expect(screen.getByText(/Wolf conceded/)).toBeInTheDocument();
    expect(screen.getByText('Opponents conceded')).toBeInTheDocument();
  });
});

describe('getWolfFormat', () => {
  test('priority order: blindWolf > loneWolf > shuck > pack > solo', () => {
    expect(getWolfFormat({ blindWolfDeclared: true, loneWolfDeclared: true, shucked: true, partnerId: 'x' })).toBe('blindWolf');
    expect(getWolfFormat({ blindWolfDeclared: false, loneWolfDeclared: true, shucked: true, partnerId: 'x' })).toBe('loneWolf');
    expect(getWolfFormat({ blindWolfDeclared: false, loneWolfDeclared: false, shucked: true, partnerId: 'x' })).toBe('shuck');
    expect(getWolfFormat({ blindWolfDeclared: false, loneWolfDeclared: false, shucked: false, partnerId: 'x' })).toBe('pack');
    expect(getWolfFormat({ blindWolfDeclared: false, loneWolfDeclared: false, shucked: false, partnerId: null })).toBe('solo');
  });
});

describe('WolfHoleCard — light hard block (confirmation)', () => {
  test('an untouched hole shows the unconfirmed "confirm Solo Wolf" prompt', () => {
    render(<Harness />);
    expect(screen.getByText('No partner — confirm Solo Wolf')).toBeInTheDocument();
    expect(isWolfHoleConfirmed({}, 1)).toBe(false);
  });

  test('tapping the explicit solo-confirm button marks the hole confirmed', () => {
    let latestHoles;
    function TrackedHarness() {
      const [wolfHoles, setWolfHoles] = require('react').useState({});
      latestHoles = wolfHoles;
      const onUpdateWolfHole = (hole, updates) => setWolfHoles((prev) => ({ ...prev, [hole]: { ...prev[hole], ...updates } }));
      return <WolfHoleCard currentHole={1} players={PLAYERS} wolfHoles={wolfHoles} onUpdateWolfHole={onUpdateWolfHole} />;
    }
    render(<TrackedHarness />);
    fireEvent.click(screen.getByText('No partner — confirm Solo Wolf'));
    expect(isWolfHoleConfirmed(latestHoles, 1)).toBe(true);
  });

  test('picking a partner marks the hole confirmed too, no separate button needed', () => {
    let latestHoles;
    function TrackedHarness() {
      const [wolfHoles, setWolfHoles] = require('react').useState({});
      latestHoles = wolfHoles;
      const onUpdateWolfHole = (hole, updates) => setWolfHoles((prev) => ({ ...prev, [hole]: { ...prev[hole], ...updates } }));
      return <WolfHoleCard currentHole={1} players={PLAYERS} wolfHoles={wolfHoles} onUpdateWolfHole={onUpdateWolfHole} />;
    }
    render(<TrackedHarness />);
    fireEvent.click(screen.getByText('P2'));
    expect(isWolfHoleConfirmed(latestHoles, 1)).toBe(true);
  });

  test('declaring Lone Wolf or Blind Wolf marks the hole confirmed', () => {
    let latestHoles;
    function TrackedHarness() {
      const [wolfHoles, setWolfHoles] = require('react').useState({});
      latestHoles = wolfHoles;
      const onUpdateWolfHole = (hole, updates) => setWolfHoles((prev) => ({ ...prev, [hole]: { ...prev[hole], ...updates } }));
      return <WolfHoleCard currentHole={1} players={PLAYERS} wolfHoles={wolfHoles} onUpdateWolfHole={onUpdateWolfHole} />;
    }
    render(<TrackedHarness />);
    fireEvent.click(screen.getByText('Blind Wolf'));
    expect(isWolfHoleConfirmed(latestHoles, 1)).toBe(true);
  });

  test('undoing a declaration resets confirmation — a fresh decision is required again', () => {
    let latestHoles;
    function TrackedHarness() {
      const [wolfHoles, setWolfHoles] = require('react').useState({});
      latestHoles = wolfHoles;
      const onUpdateWolfHole = (hole, updates) => setWolfHoles((prev) => ({ ...prev, [hole]: { ...prev[hole], ...updates } }));
      return <WolfHoleCard currentHole={1} players={PLAYERS} wolfHoles={wolfHoles} onUpdateWolfHole={onUpdateWolfHole} />;
    }
    render(<TrackedHarness />);
    fireEvent.click(screen.getByText('Blind Wolf'));
    expect(isWolfHoleConfirmed(latestHoles, 1)).toBe(true);
    fireEvent.click(screen.getByText('✓ Blind Wolf'));
    expect(isWolfHoleConfirmed(latestHoles, 1)).toBe(false);
  });
});

describe('WolfHoleCard — Super Wolf mode', () => {
  test('shows the standings snapshot, ranked worst to first, with a wolf marker on the worst', () => {
    render(
      <WolfHoleCard
        currentHole={16}
        players={PLAYERS}
        wolfHoles={{}}
        onUpdateWolfHole={() => {}}
        isSuperWolf
        overrideWolfId="P4"
        rankedStandings={[
          { playerId: 'P4', standing: -40 },
          { playerId: 'P2', standing: -10 },
          { playerId: 'W', standing: 5 },
          { playerId: 'P3', standing: 15 },
          { playerId: 'P5', standing: 30 },
        ]}
      />
    );
    expect(screen.getByText(/Super Wolf/)).toBeInTheDocument();
    expect(screen.getByText(/-\$40\.00/)).toBeInTheDocument();
    expect(screen.getByText(/\+\$30\.00/)).toBeInTheDocument();
  });

  test('the assigned Super Wolf (not the rotation player) shows as Wolf in the header', () => {
    render(
      <WolfHoleCard
        currentHole={16} // rotation would normally give hole 16 to player index 0 (W)
        players={PLAYERS}
        wolfHoles={{}}
        onUpdateWolfHole={() => {}}
        isSuperWolf
        overrideWolfId="P4"
        rankedStandings={[{ playerId: 'P4', standing: -40 }]}
      />
    );
    expect(screen.getByText('Hole 16 — Wolf')).toBeInTheDocument();
    // "P4" appears both in the standings row and the header — getAllByText handles that
    expect(screen.getAllByText('P4').length).toBeGreaterThan(0);
  });

  test('the "Full down" preset sends the exact real number, cents and all — no rounding, unlike Standard/Custom', () => {
    const onChange = jest.fn();
    render(
      <WolfHoleCard
        currentHole={17} players={PLAYERS} wolfHoles={{}} onUpdateWolfHole={() => {}}
        isSuperWolf overrideWolfId="P2"
        rankedStandings={[{ playerId: 'P2', standing: -47.5 }]}
        superWolfBetAmount={null} onChangeSuperWolfBetAmount={onChange}
      />
    );
    expect(screen.getByText(/Full down.*\$47\.50/)).toBeInTheDocument();
    fireEvent.click(screen.getByText(/Full down/));
    expect(onChange).toHaveBeenCalledWith(17, '47.5'); // exact, not rounded to 48
  });

  test('the "Half down" preset also preserves real cents, not whole dollars', () => {
    const onChange = jest.fn();
    render(
      <WolfHoleCard
        currentHole={17} players={PLAYERS} wolfHoles={{}} onUpdateWolfHole={() => {}}
        isSuperWolf overrideWolfId="P2"
        rankedStandings={[{ playerId: 'P2', standing: -47.5 }]}
        superWolfBetAmount={null} onChangeSuperWolfBetAmount={onChange}
      />
    );
    expect(screen.getByText(/Half down.*\$23\.75/)).toBeInTheDocument();
    fireEvent.click(screen.getByText(/Half down/));
    expect(onChange).toHaveBeenCalledWith(17, '23.75');
  });

  test('a stale value that happens to divide evenly (e.g. $990 from earlier testing, with a $5 base) does NOT get read as "198x Standard" — tapping Standard starts fresh at 1x', () => {
    const onChange = jest.fn();
    render(
      <WolfHoleCard
        currentHole={17} players={PLAYERS} wolfHoles={{}} onUpdateWolfHole={() => {}}
        isSuperWolf overrideWolfId="P2"
        rankedStandings={[{ playerId: 'P2', standing: -20 }]}
        superWolfBetAmount="990" onChangeSuperWolfBetAmount={onChange}
        teamGameUnitAmount={5}
      />
    );
    // The button itself must not display an absurd multiple
    expect(screen.queryByText(/198x/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByText(/^Standard/));
    expect(onChange).toHaveBeenLastCalledWith(17, '5'); // fresh 1x, not 199x
  });

  test('Standard cycles 1x → 2x → 3x → back to 1x on repeated taps', () => {
    const onChange = jest.fn();
    const { rerender } = render(
      <WolfHoleCard
        currentHole={17} players={PLAYERS} wolfHoles={{}} onUpdateWolfHole={() => {}}
        isSuperWolf overrideWolfId="P2"
        rankedStandings={[{ playerId: 'P2', standing: -20 }]}
        superWolfBetAmount={null} onChangeSuperWolfBetAmount={onChange}
        teamGameUnitAmount={10}
      />
    );
    fireEvent.click(screen.getByText(/Standard/));
    expect(onChange).toHaveBeenLastCalledWith(17, '10'); // 1x

    rerender(
      <WolfHoleCard
        currentHole={17} players={PLAYERS} wolfHoles={{}} onUpdateWolfHole={() => {}}
        isSuperWolf overrideWolfId="P2"
        rankedStandings={[{ playerId: 'P2', standing: -20 }]}
        superWolfBetAmount="10" onChangeSuperWolfBetAmount={onChange}
        teamGameUnitAmount={10}
      />
    );
    fireEvent.click(screen.getByText(/Standard/));
    expect(onChange).toHaveBeenLastCalledWith(17, '20'); // 2x

    rerender(
      <WolfHoleCard
        currentHole={17} players={PLAYERS} wolfHoles={{}} onUpdateWolfHole={() => {}}
        isSuperWolf overrideWolfId="P2"
        rankedStandings={[{ playerId: 'P2', standing: -20 }]}
        superWolfBetAmount="20" onChangeSuperWolfBetAmount={onChange}
        teamGameUnitAmount={10}
      />
    );
    fireEvent.click(screen.getByText(/Standard/));
    expect(onChange).toHaveBeenLastCalledWith(17, '30'); // 3x

    rerender(
      <WolfHoleCard
        currentHole={17} players={PLAYERS} wolfHoles={{}} onUpdateWolfHole={() => {}}
        isSuperWolf overrideWolfId="P2"
        rankedStandings={[{ playerId: 'P2', standing: -20 }]}
        superWolfBetAmount="30" onChangeSuperWolfBetAmount={onChange}
        teamGameUnitAmount={10}
      />
    );
    fireEvent.click(screen.getByText(/Standard/));
    expect(onChange).toHaveBeenLastCalledWith(17, '10'); // wraps back to 1x
  });

  test('Custom opens a digit keypad, never the native decimal keyboard, and only ever builds whole numbers', () => {
    const onChange = jest.fn();
    render(
      <WolfHoleCard
        currentHole={17} players={PLAYERS} wolfHoles={{}} onUpdateWolfHole={() => {}}
        isSuperWolf overrideWolfId="P2"
        rankedStandings={[{ playerId: 'P2', standing: -20 }]}
        superWolfBetAmount={null} onChangeSuperWolfBetAmount={onChange}
      />
    );
    fireEvent.click(screen.getByText('Custom'));
    fireEvent.click(screen.getByText('4'));
    expect(onChange).toHaveBeenLastCalledWith(17, '4');
    // No decimal point button exists anywhere in the keypad — a fractional
    // bet amount is now structurally impossible, not just discouraged.
    expect(screen.queryByText('.')).not.toBeInTheDocument();
  });

  test('opening Custom after a preset was already tapped clears the value instead of requiring a backspace first', () => {
    const onChange = jest.fn();
    const { rerender } = render(
      <WolfHoleCard
        currentHole={17} players={PLAYERS} wolfHoles={{}} onUpdateWolfHole={() => {}}
        isSuperWolf overrideWolfId="P2"
        rankedStandings={[{ playerId: 'P2', standing: -20 }]}
        superWolfBetAmount={null} onChangeSuperWolfBetAmount={onChange}
        teamGameUnitAmount={25}
      />
    );
    fireEvent.click(screen.getByText(/Standard/)); // stores "25"
    expect(onChange).toHaveBeenLastCalledWith(17, '25');

    rerender(
      <WolfHoleCard
        currentHole={17} players={PLAYERS} wolfHoles={{}} onUpdateWolfHole={() => {}}
        isSuperWolf overrideWolfId="P2"
        rankedStandings={[{ playerId: 'P2', standing: -20 }]}
        superWolfBetAmount="25" onChangeSuperWolfBetAmount={onChange}
        teamGameUnitAmount={25}
      />
    );
    fireEvent.click(screen.getByText('Custom')); // opening should clear it
    expect(onChange).toHaveBeenLastCalledWith(17, '');
  });

  test('a hole 1-15 render (isSuperWolf false) shows no standings snapshot or bet input', () => {
    render(<Harness currentHole={5} />);
    expect(screen.queryByText(/Super Wolf/)).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText('e.g. 25')).not.toBeInTheDocument();
  });

  test('shows a clear message instead of crashing when Super Wolf has no assignment yet', () => {
    render(
      <WolfHoleCard
        currentHole={16}
        players={PLAYERS}
        wolfHoles={{}}
        onUpdateWolfHole={() => {}}
        isSuperWolf
        overrideWolfId={null}
        rankedStandings={null}
      />
    );
    expect(screen.getByText(/Can't assign Super Wolf yet/)).toBeInTheDocument();
  });

  test('Standard hitting order mode shows a computed, read-only list — no tapping needed', () => {
    render(
      <WolfHoleCard
        currentHole={16} players={PLAYERS} wolfHoles={{}} onUpdateWolfHole={() => {}}
        isSuperWolf overrideWolfId="W" rankedStandings={[{ playerId: 'W', standing: -40 }]}
        hittingOrderMode="standard"
      />
    );
    expect(screen.getByText(/Hitting order/)).toBeInTheDocument();
    expect(screen.getByText(/1\. P2.*2\. P3.*3\. P4.*4\. P5/)).toBeInTheDocument();
  });

  test('Rank By Deficit mode orders the other 4 by who\'s down the most, worst first', () => {
    render(
      <WolfHoleCard
        currentHole={16} players={PLAYERS} wolfHoles={{}} onUpdateWolfHole={() => {}}
        isSuperWolf overrideWolfId="W"
        rankedStandings={[
          { playerId: 'W', standing: -40 },
          { playerId: 'P4', standing: -30 },
          { playerId: 'P2', standing: -10 },
          { playerId: 'P3', standing: 5 },
          { playerId: 'P5', standing: 20 },
        ]}
        hittingOrderMode="rank_by_deficit"
      />
    );
    expect(screen.getByText(/1\. P4.*2\. P2.*3\. P3.*4\. P5/)).toBeInTheDocument();
  });

  test('Wolf Controls mode lets the Scorekeeper tap in the order one at a time, showing position numbers', () => {
    const onUpdateWolfHole = jest.fn();
    render(
      <WolfHoleCard
        currentHole={16} players={PLAYERS} wolfHoles={{}} onUpdateWolfHole={onUpdateWolfHole}
        isSuperWolf overrideWolfId="W" rankedStandings={[{ playerId: 'W', standing: -40 }]}
        hittingOrderMode="wolf_controls"
      />
    );
    expect(screen.getByText(/Tap in the order Super Wolf calls out/)).toBeInTheDocument();
    // "P3" also appears in the ordinary partner picker further down the
    // same card — the hitting-order button is the first match in DOM order.
    fireEvent.click(screen.getAllByText('P3')[0]);
    expect(onUpdateWolfHole).toHaveBeenLastCalledWith(16, { superWolfManualOrder: ['P3'] });
  });

  test('Wolf Controls: tapping an already-tapped player removes them, so a mistake is easy to undo', () => {
    const onUpdateWolfHole = jest.fn();
    render(
      <WolfHoleCard
        currentHole={16} players={PLAYERS}
        wolfHoles={{ 16: { superWolfManualOrder: ['P3', 'P2'] } }}
        onUpdateWolfHole={onUpdateWolfHole}
        isSuperWolf overrideWolfId="W" rankedStandings={[{ playerId: 'W', standing: -40 }]}
        hittingOrderMode="wolf_controls"
      />
    );
    expect(screen.getByText(/1\. P3/)).toBeInTheDocument();
    expect(screen.getByText(/2\. P2/)).toBeInTheDocument();
    fireEvent.click(screen.getByText(/1\. P3/));
    expect(onUpdateWolfHole).toHaveBeenLastCalledWith(16, { superWolfManualOrder: ['P2'] });
  });
});
