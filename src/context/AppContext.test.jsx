// ============================================================================
// Tests for src/context/AppContext.jsx — global state, persistence &
// history aggregation. Driven via React Testing Library's renderHook.
//
// These tests caught a real source bug: `historyGuard` is an in-memory
// useRef(Set) that resets on every full page reload, so a finished battle
// persisted in localStorage gets re-added to history on each reload,
// duplicating history/leaderboard entries.
// ============================================================================
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { AppProvider, useApp } from './AppContext';
import { FINISH, WIN_SCORE } from '../lib/scoring';

function finishBattle(actions, winner = 'A', finish = FINISH.SPIN) {
  act(() => actions.startBattle({ name: 'A' }, { name: 'B' }));
  act(() => actions.beginBattle());
  // Play enough rounds (each finish awards >=1 point) to reach WIN_SCORE.
  for (let i = 0; i < WIN_SCORE; i += 1) {
    act(() => actions.recordRound(winner, finish));
    if (i < WIN_SCORE - 1) act(() => actions.beginBattle());
  }
}

describe('AppContext — history aggregation', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => cleanup());

  it('records a finished battle into history exactly once (in-session)', () => {
    const { result } = renderHook(() => useApp(), { wrapper: AppProvider });
    finishBattle(result.current);
    expect(result.current.history).toHaveLength(1);
    expect(result.current.history[0].winner).toBe('A');
  });

  it('does NOT duplicate a finished battle in history across a page reload', () => {
    // Session 1: play & finish a battle. It is persisted to localStorage.
    const { result, unmount } = renderHook(() => useApp(), { wrapper: AppProvider });
    finishBattle(result.current);
    expect(result.current.history).toHaveLength(1);
    unmount(); // simulate navigating away / browser closed

    // Session 2: a fresh page load re-hydrates battle + history from localStorage.
    const { result: r2 } = renderHook(() => useApp(), { wrapper: AppProvider });

    // EXPECTED (per spec): the finished battle is already in history, so it must
    // NOT be added again. The `historyGuard` resets on reload, so the current
    // implementation re-adds it -> length becomes 2 (BUG).
    expect(r2.current.history).toHaveLength(1);
  });
});
