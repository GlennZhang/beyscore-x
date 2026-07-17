// ============================================================================
// Unit tests for src/lib/scoring.js — pure scoring & battle-state logic.
// Run with: npm test
//
// Updated for the "Battle Mode" rule set:
//   WIN_SCORE = 4
//   SPIN +1, OVER +2, BURST +2, XTREME +3, DRAW 0, LAUNCH_FAIL (opponent) +1
// ============================================================================
import { describe, it, expect, beforeEach } from 'vitest';
import {
  WIN_SCORE,
  FINISH,
  FINISH_META,
  createBattle,
  beginBattle,
  drawPosition,
  recordRound,
  shouldReorganize,
  battleSummary,
} from './scoring';

// Helper: build a battle that is ready to score (ongoing).
function startBattle(playerA, playerB) {
  return beginBattle(createBattle(playerA, playerB));
}

// Play a full sequence of (winner, finishType) pairs and return the final battle.
function playRounds(battle, rounds) {
  return rounds.reduce((b, [winner, finishType]) => {
    const ongoing = b.status === 'ready' ? beginBattle(b) : b;
    return recordRound(ongoing, winner, finishType);
  }, battle);
}

describe('constants & finish metadata', () => {
  it('WIN_SCORE equals the official first-to-4 target', () => {
    expect(WIN_SCORE).toBe(4);
  });

  it('exposes all six finish types', () => {
    expect(FINISH.SPIN).toBe('spin');
    expect(FINISH.OVER).toBe('over');
    expect(FINISH.BURST).toBe('burst');
    expect(FINISH.XTREME).toBe('xtreme');
    expect(FINISH.DRAW).toBe('draw');
    expect(FINISH.LAUNCH_FAIL).toBe('launch_fail');
  });

  it('each finish awards its own point value (SPIN 1, OVER 2, BURST 2, XTREME 3, DRAW 0)', () => {
    expect(FINISH_META[FINISH.SPIN].points).toBe(1);
    expect(FINISH_META[FINISH.OVER].points).toBe(2);
    expect(FINISH_META[FINISH.BURST].points).toBe(2);
    expect(FINISH_META[FINISH.XTREME].points).toBe(3);
    expect(FINISH_META[FINISH.LAUNCH_FAIL].points).toBe(1);
    expect(FINISH_META[FINISH.DRAW].points).toBe(0);
  });
});

describe('createBattle', () => {
  it('initialises a ready battle with zero scores and no rounds', () => {
    const b = createBattle();
    expect(b.status).toBe('ready');
    expect(b.scoreA).toBe(0);
    expect(b.scoreB).toBe(0);
    expect(b.rounds).toEqual([]);
    expect(b.winner).toBeNull();
    expect(b.firstPlayer).toBeNull();
  });

  it('falls back to default player names when omitted', () => {
    const b = createBattle();
    expect(b.playerA.name).toBe('玩家 A');
    expect(b.playerB.name).toBe('玩家 B');
  });

  it('uses provided names and comboIds', () => {
    const b = createBattle({ name: 'Alice', comboId: 'c1' }, { name: 'Bob', comboId: 'c2' });
    expect(b.playerA).toEqual({ name: 'Alice', comboId: 'c1' });
    expect(b.playerB).toEqual({ name: 'Bob', comboId: 'c2' });
  });

  it('assigns a unique id', () => {
    expect(createBattle().id).not.toBe(createBattle().id);
  });
});

describe('beginBattle', () => {
  it('transitions ready -> ongoing', () => {
    const b = beginBattle(createBattle());
    expect(b.status).toBe('ongoing');
  });

  it('is a no-op on null or non-ready battles', () => {
    const ready = createBattle();
    const ongoing = beginBattle(ready);
    expect(beginBattle(ongoing)).toBe(ongoing); // finished/ongoing unchanged & same ref
    expect(beginBattle(null)).toBeNull();
  });

  it('does not mutate the input object', () => {
    const input = createBattle();
    const out = beginBattle(input);
    expect(input.status).toBe('ready');
    expect(out).not.toBe(input);
  });
});

describe('recordRound — scoring of each finish type', () => {
  it('Spin Finish gives the winner +1', () => {
    const b = playRounds(startBattle(), [['A', FINISH.SPIN]]);
    expect(b.scoreA).toBe(1);
    expect(b.scoreB).toBe(0);
  });

  it('Over gives +2, Burst gives +2, Xtreme gives +3', () => {
    let b = startBattle();
    b = recordRound(b, 'B', FINISH.OVER);
    expect(b.scoreB).toBe(2);
    b = beginBattle(b);
    b = recordRound(b, 'A', FINISH.BURST);
    expect(b.scoreA).toBe(2);
    b = beginBattle(b);
    b = recordRound(b, 'B', FINISH.XTREME);
    expect(b.scoreB).toBe(5);
  });

  it('Draw awards no points to either side', () => {
    const b = playRounds(startBattle(), [['draw', FINISH.DRAW]]);
    expect(b.scoreA).toBe(0);
    expect(b.scoreB).toBe(0);
  });

  it('Launch Fail makes the OPPONENT score (A fails -> B +1)', () => {
    const b = recordRound(startBattle(), 'B', FINISH.LAUNCH_FAIL);
    expect(b.scoreB).toBe(1);
    expect(b.scoreA).toBe(0);
  });

  it('Launch Fail: B fails -> A +1', () => {
    const b = recordRound(startBattle(), 'A', FINISH.LAUNCH_FAIL);
    expect(b.scoreA).toBe(1);
    expect(b.scoreB).toBe(0);
  });
});

describe('recordRound — round bookkeeping', () => {
  it('appends rounds with sequential index and correct fields (incl. points)', () => {
    let b = startBattle();
    b = recordRound(b, 'A', FINISH.SPIN);
    expect(b.status).toBe('ready');
    b = beginBattle(b);
    b = recordRound(b, 'draw', FINISH.DRAW);
    expect(b.rounds).toHaveLength(2);
    expect(b.rounds[0]).toMatchObject({ index: 1, winner: 'A', finishType: 'spin', points: 1 });
    expect(b.rounds[1]).toMatchObject({ index: 2, winner: 'draw', finishType: 'draw', points: 0 });
    expect(b.status).toBe('ready');
  });

  it('does not mutate the previous battle object (immutability)', () => {
    const b0 = startBattle();
    const b1 = recordRound(b0, 'A', FINISH.SPIN);
    expect(b0.rounds).toHaveLength(0);
    expect(b0.scoreA).toBe(0);
    expect(b1.rounds).toHaveLength(1);
  });

  it('ignores rounds when battle is not ongoing', () => {
    const ready = createBattle();
    expect(recordRound(ready, 'A', FINISH.SPIN)).toBe(ready);
    const finished = { ...startBattle(), status: 'finished', scoreA: 4 };
    expect(recordRound(finished, 'A', FINISH.SPIN)).toBe(finished);
  });
});

describe('win condition & boundaries', () => {
  it('A reaches exactly 4 points and wins', () => {
    const b = playRounds(startBattle(), [
      ['A', FINISH.OVER],
      ['A', FINISH.OVER],
    ]);
    expect(b.scoreA).toBe(4);
    expect(b.status).toBe('finished');
    expect(b.winner).toBe('A');
    expect(b.finishedAt).not.toBeNull();
  });

  it('starts from 0-0 and B can win 4-0 with four SPINs', () => {
    const b = playRounds(
      startBattle(),
      Array.from({ length: 4 }, () => ['B', FINISH.SPIN])
    );
    expect(b.scoreA).toBe(0);
    expect(b.scoreB).toBe(4);
    expect(b.winner).toBe('B');
  });

  it('does NOT keep scoring once finished', () => {
    let b = playRounds(startBattle(), [
      ['A', FINISH.XTREME],
      ['A', FINISH.SPIN],
    ]);
    expect(b.scoreA).toBe(4);
    expect(b.status).toBe('finished');
    // Attempting more rounds must be ignored.
    b = recordRound(b, 'A', FINISH.SPIN);
    b = recordRound(b, 'B', FINISH.BURST);
    expect(b.scoreA).toBe(4);
    expect(b.scoreB).toBe(0);
    expect(b.rounds).toHaveLength(2);
  });

  it('a tie at 3-3 returns to ready and the next scoring finish decides the match', () => {
    let b = playRounds(startBattle(), [
      ['A', FINISH.XTREME],
      ['B', FINISH.XTREME],
    ]);
    expect(b.status).toBe('ready');
    expect(b.scoreA).toBe(3);
    expect(b.scoreB).toBe(3);
    b = recordRound(beginBattle(b), 'A', FINISH.SPIN);
    expect(b.status).toBe('finished');
    expect(b.winner).toBe('A');
  });
});

describe('drawPosition', () => {
  it('always returns a legal value ("A" or "B")', () => {
    const seen = new Set();
    for (let i = 0; i < 500; i += 1) {
      const v = drawPosition();
      expect(v === 'A' || v === 'B').toBe(true);
      seen.add(v);
    }
    // With 500 samples both sides should appear at least once.
    expect(seen.has('A')).toBe(true);
    expect(seen.has('B')).toBe(true);
  });
});

describe('shouldReorganize', () => {
  it('is false at 0 rounds and before every multiple of 3', () => {
    [0, 1, 2, 4, 5, 7, 8].forEach((n) => expect(shouldReorganize(n)).toBe(false));
  });

  it('triggers on every 3rd round (3, 6, 9, ...)', () => {
    [3, 6, 9, 12].forEach((n) => expect(shouldReorganize(n)).toBe(true));
  });
});

describe('battleSummary', () => {
  beforeEach(() => {
    // ensure deterministic timing is not required
  });

  it('returns zero rounds and empty distribution for a fresh battle', () => {
    const b = startBattle();
    const s = battleSummary(b);
    expect(s.totalRounds).toBe(0);
    expect(s.finishCounts).toEqual({});
  });

  it('counts total rounds and the finish-type distribution', () => {
    const b = playRounds(startBattle(), [
      ['A', FINISH.SPIN],
      ['A', FINISH.SPIN],
      ['B', FINISH.OVER],
      ['draw', FINISH.DRAW],
      ['B', FINISH.LAUNCH_FAIL],
    ]);
    const s = battleSummary(b);
    expect(s.totalRounds).toBe(5);
    expect(s.finishCounts[FINISH.SPIN]).toBe(2);
    expect(s.finishCounts[FINISH.OVER]).toBe(1);
    expect(s.finishCounts[FINISH.DRAW]).toBe(1);
    expect(s.finishCounts[FINISH.LAUNCH_FAIL]).toBe(1);
  });

  it('is safe when battle is null/undefined', () => {
    expect(battleSummary(null)).toEqual({ totalRounds: 0, finishCounts: {} });
    expect(battleSummary(undefined)).toEqual({ totalRounds: 0, finishCounts: {} });
  });

  it('winner is correctly determined on the battle object', () => {
    const b = playRounds(startBattle(), [
      ['A', FINISH.XTREME],
      ['A', FINISH.SPIN],
    ]);
    expect(b.winner).toBe('A');
    expect(b.status).toBe('finished');
    expect(b.scoreA).toBe(4);
  });
});
