/**
 * WolfHoleCard.test.js
 * Run with: npm test -- --testPathPattern=WolfHoleCard
 *
 * Actually renders and clicks through the component — unlike the engine
 * tests, this catches real runtime/rendering issues, not just math.
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

describe('WolfHoleCard — partner selection', () => {
  test('tapping a partner selects them and shows the Pack Wolf summary', () => {
    render(<Harness />);
    fireEvent.click(screen.getByText('P2'));
    expect(screen.getByText(/Pack Wolf · Wolf \+ P2 vs\. the other 3/)).toBeInTheDocument();
  });

  test('tapping the same partner again deselects — back to Lone Wolf', () => {
    render(<Harness />);
    fireEvent.click(screen.getByText('P2'));
    fireEvent.click(screen.getByText('P2'));
    expect(screen.getByText(/Lone Wolf · 1v4/)).toBeInTheDocument();
  });

  test('no partner selected defaults to Lone Wolf summary', () => {
    render(<Harness />);
    expect(screen.getByText(/Lone Wolf · 1v4/)).toBeInTheDocument();
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
    expect(screen.getByText(/P2 shucked · playing alone vs\. everyone else · 2x/)).toBeInTheDocument();
  });
});

describe('WolfHoleCard — Blind Lone Wolf', () => {
  test('declaring Blind Lone Wolf clears any partner selection and hides partner picker', () => {
    render(<Harness />);
    fireEvent.click(screen.getByText('P2')); // pick a partner first
    fireEvent.click(screen.getByText(/Declare Blind Lone Wolf/));
    expect(screen.getByText(/Blind Lone Wolf · 1v4 · 3x/)).toBeInTheDocument();
    expect(screen.queryByText('P2')).not.toBeInTheDocument(); // partner picker hidden
  });

  test('undoing the Blind Lone Wolf declaration brings back the partner picker', () => {
    render(<Harness />);
    fireEvent.click(screen.getByText(/Declare Blind Lone Wolf/));
    fireEvent.click(screen.getByText(/tap to undo/));
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
  test('priority order: blind > shuck > pack > lone', () => {
    expect(getWolfFormat({ blindDeclared: true, shucked: true, partnerId: 'x' })).toBe('blind');
    expect(getWolfFormat({ blindDeclared: false, shucked: true, partnerId: 'x' })).toBe('shuck');
    expect(getWolfFormat({ blindDeclared: false, shucked: false, partnerId: 'x' })).toBe('pack');
    expect(getWolfFormat({ blindDeclared: false, shucked: false, partnerId: null })).toBe('lone');
  });
});
