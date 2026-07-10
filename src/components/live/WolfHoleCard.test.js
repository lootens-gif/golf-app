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
import WolfHoleCard, { getWolfFormat } from './WolfHoleCard';

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
    expect(screen.getByText(/Wolf — Wolf · 1v4/)).toBeInTheDocument();
  });

  test('no partner selected defaults to the base Wolf summary (no early declaration)', () => {
    render(<Harness />);
    expect(screen.getByText(/Wolf — Wolf · 1v4/)).toBeInTheDocument();
  });
});

describe('WolfHoleCard — shuck', () => {
  test('shuck toggle only appears after a partner is picked', () => {
    render(<Harness />);
    expect(screen.queryByText(/shucked/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('P2'));
    expect(screen.getByText('P2 shucked')).toBeInTheDocument();
  });

  test('flipping the shuck toggle switches the summary to the Shucker format', () => {
    render(<Harness />);
    fireEvent.click(screen.getByText('P2'));
    fireEvent.click(screen.getByText('P2 shucked'));
    expect(screen.getByText(/P2 shucked · playing alone vs\. everyone else/)).toBeInTheDocument();
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
