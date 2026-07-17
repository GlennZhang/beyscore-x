// ============================================================================
// Beyscore X — scoring rules & battle state logic (pure functions).
// No React, no DOM, no localStorage. Easy to unit-test.
// ============================================================================

/**
 * Score required to win a battle ("Battle Mode" rule from the reference app).
 * Official Beyblade X standard: first side to reach 4 points wins.
 */
export const WIN_SCORE = 4;

/** Finish types. */
export const FINISH = {
  SPIN: 'spin', // Spin Finish: opponent stopped spinning, you kept going.
  OVER: 'over', // Over Finish: knocked opponent out of the arena.
  BURST: 'burst', // Burst Finish: opponent's ratchet separated.
  XTREME: 'xtreme', // Xtreme Finish: knocked opponent into the Xtreme zone.
  DRAW: 'draw', // Both stopped simultaneously — no points.
  LAUNCH_FAIL: 'launch_fail', // One side failed to launch — opponent gets the point.
};

/** Metadata for each finish type. `points` drives the actual score added. */
export const FINISH_META = {
  [FINISH.SPIN]: { label: 'Spin Finish', zh: '旋轉終結', points: 1, color: '#4CAF50' },
  [FINISH.OVER]: { label: 'Over Finish', zh: '飛出終結', points: 2, color: '#2196F3' },
  [FINISH.BURST]: { label: 'Burst Finish', zh: '爆裂終結', points: 2, color: '#E63946' },
  [FINISH.XTREME]: { label: 'Xtreme Finish', zh: '極限終結', points: 3, color: '#FFD23F' },
  [FINISH.DRAW]: { label: 'Draw', zh: '平手', points: 0, color: '#9E9E9E' },
  [FINISH.LAUNCH_FAIL]: { label: 'Launch Fail', zh: '發射失敗', points: 1, color: '#FF9800' },
};

let _counter = 0;

/** Generate a reasonably unique id. */
function uid(prefix) {
  _counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${_counter.toString(36)}`;
}

/**
 * Create a new battle in the "ready" state.
 * @param {{name?: string, comboId?: string|null}} playerA
 * @param {{name?: string, comboId?: string|null}} playerB
 * @returns {object} battle
 */
export function createBattle(playerA, playerB) {
  return {
    id: uid('battle'),
    playerA: { name: playerA?.name || '玩家 A', comboId: playerA?.comboId || null },
    playerB: { name: playerB?.name || '玩家 B', comboId: playerB?.comboId || null },
    scoreA: 0,
    scoreB: 0,
    rounds: [], // { index, winner, finishType, points, timestamp }
    status: 'ready', // 'ready' | 'ongoing' | 'finished'
    winner: null, // 'A' | 'B' | null
    firstPlayer: null, // 'A' | 'B' | null
    createdAt: Date.now(),
    finishedAt: null,
  };
}

/**
 * Randomly decide who goes first / takes position (Position Draw).
 * @returns {'A' | 'B'}
 */
export function drawPosition() {
  return Math.random() < 0.5 ? 'A' : 'B';
}

/**
 * Transition a "ready" battle into "ongoing".
 * @param {object} battle
 * @returns {object}
 */
export function beginBattle(battle) {
  if (!battle || battle.status !== 'ready') return battle;
  return { ...battle, status: 'ongoing' };
}

/**
 * Record the result of one round.
 * @param {object} battle current battle
 * @param {'A'|'B'|'draw'} winner side that earned the point (or 'draw')
 * @param {string} finishType one of FINISH.*
 * @returns {object} new battle (immutably updated)
 */
export function recordRound(battle, winner, finishType) {
  if (!battle || battle.status !== 'ongoing') return battle;
  const meta = FINISH_META[finishType] || FINISH_META[FINISH.DRAW];

  const round = {
    index: battle.rounds.length + 1,
    winner,
    finishType,
    points: winner === 'draw' ? 0 : meta.points,
    timestamp: Date.now(),
  };

  const rounds = [...battle.rounds, round];
  let scoreA = battle.scoreA;
  let scoreB = battle.scoreB;
  // Use the metadata points (NOT a hard-coded +1) so each finish type
  // contributes its own value (SPIN +1, OVER +2, BURST +2, XTREME +3, ...).
  const pts = meta.points;
  if (winner === 'A') scoreA += pts;
  else if (winner === 'B') scoreB += pts;

  const isOver = scoreA >= WIN_SCORE || scoreB >= WIN_SCORE;
  // Every launch is one round. Once its result is recorded, a non-finished
  // match returns to the ready screen for the next round.
  const status = isOver ? 'finished' : 'ready';
  const finalWinner = scoreA >= WIN_SCORE ? 'A' : scoreB >= WIN_SCORE ? 'B' : null;

  return {
    ...battle,
    rounds,
    scoreA,
    scoreB,
    status,
    winner: finalWinner,
    finishedAt: status === 'finished' ? Date.now() : battle.finishedAt,
  };
}

/**
 * Returns true when a re-organisation / re-position prompt should appear
 * (after every 3 rounds).
 * @param {number} roundCount
 * @returns {boolean}
 */
export function shouldReorganize(roundCount) {
  return roundCount > 0 && roundCount % 3 === 0;
}

/**
 * Summarise a finished (or in-progress) battle.
 * @param {object} battle
 * @returns {{ totalRounds: number, finishCounts: Record<string, number> }}
 */
export function battleSummary(battle) {
  const finishCounts = {};
  (battle?.rounds || []).forEach((r) => {
    finishCounts[r.finishType] = (finishCounts[r.finishType] || 0) + 1;
  });
  return { totalRounds: battle?.rounds?.length || 0, finishCounts };
}
