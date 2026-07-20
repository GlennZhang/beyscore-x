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
import { TOURNAMENT_FORMAT, findTournamentMatch } from '../lib/tournament';
import { LEAGUE_PAIRING, findLeagueMatch } from '../lib/league';

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

describe('AppContext — tournament integration', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => cleanup());

  const finishCurrentGame = (actions) => {
    act(() => actions.beginBattle());
    for (let i = 0; i < WIN_SCORE; i += 1) {
      act(() => actions.recordRound('A', FINISH.SPIN));
      if (i < WIN_SCORE - 1) act(() => actions.beginBattle());
    }
  };

  it('runs two first-to-four games before completing a best-of-three match', () => {
    const { result } = renderHook(() => useApp(), { wrapper: AppProvider });
    act(() => result.current.createTournament(['A', 'B'], TOURNAMENT_FORMAT.BEST_OF_3));
    act(() => result.current.startNextTournamentMatch());

    const matchId = result.current.tournament.currentMatchId;
    expect(result.current.battle.tournament.gameNumber).toBe(1);
    finishCurrentGame(result.current);
    act(() => result.current.completeTournamentGame());

    expect(findTournamentMatch(result.current.tournament, matchId).gameWinsA).toBe(1);
    expect(result.current.battle.status).toBe('ready');
    expect(result.current.battle.tournament.gameNumber).toBe(2);

    finishCurrentGame(result.current);
    act(() => result.current.completeTournamentGame());

    expect(result.current.tournament.status).toBe('finished');
    expect(result.current.battle).toBeNull();
    expect(result.current.history).toHaveLength(2);
  });
});

describe('AppContext — points league integration', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => cleanup());

  const finishCurrentGame = (actions) => {
    act(() => actions.beginBattle());
    for (let index = 0; index < WIN_SCORE; index += 1) {
      act(() => actions.recordRound('A', FINISH.SPIN));
      if (index < WIN_SCORE - 1) act(() => actions.beginBattle());
    }
  };

  it('records a completed league match, awards points and returns to the schedule', () => {
    const { result } = renderHook(() => useApp(), { wrapper: AppProvider });
    act(() => result.current.createLeague(['A', 'B', 'C'], {
      pairing: LEAGUE_PAIRING.ROUND_ROBIN,
      rounds: 1,
      winnerPoints: 2,
    }));
    act(() => result.current.startNextLeagueMatch());

    const matchId = result.current.league.currentMatchId;
    expect(result.current.battle.league.gameNumber).toBe(1);
    finishCurrentGame(result.current);
    act(() => result.current.completeLeagueGame());

    expect(findLeagueMatch(result.current.league, matchId).status).toBe('completed');
    expect(result.current.league.status).toBe('ongoing');
    expect(result.current.battle).toBeNull();
    expect(result.current.history).toHaveLength(1);
  });
});
