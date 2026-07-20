import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from 'react';
import { storage } from '../lib/storage';
import {
  createBattle,
  beginBattle as beginBattleFn,
  recordRound as recordRoundFn,
  drawPosition,
} from '../lib/scoring';
import {
  activateTournamentMatch,
  createTournament as createTournamentFn,
  findTournamentMatch,
  getNextTournamentMatch,
  recordTournamentGame as recordTournamentGameFn,
} from '../lib/tournament';
import {
  activateLeagueMatch,
  createLeague as createLeagueFn,
  findLeagueMatch,
  getNextLeagueMatch,
  normalizeLeagueSchedule,
  recordLeagueGame as recordLeagueGameFn,
} from '../lib/league';

const AppContext = createContext(null);

/** Access the global app state & actions. Must be used inside <AppProvider>. */
export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within <AppProvider>');
  return ctx;
}

let _counter = 0;
function uid(prefix) {
  _counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${_counter.toString(36)}`;
}

/** Convert a battle into a history record. */
function buildHistoryEntry(battle) {
  return {
    id: battle.id,
    playerA: { ...battle.playerA },
    playerB: { ...battle.playerB },
    scoreA: battle.scoreA,
    scoreB: battle.scoreB,
    winner: battle.winner,
    rounds: battle.rounds.map((r) => ({ ...r })),
    firstPlayer: battle.firstPlayer,
    createdAt: battle.createdAt,
    finishedAt: battle.finishedAt,
    tournament: battle.tournament ? { ...battle.tournament } : null,
    league: battle.league ? { ...battle.league } : null,
  };
}

function createTournamentBattle(tournament, match) {
  const playerA = tournament.players.find((player) => player.id === match.playerAId);
  const playerB = tournament.players.find((player) => player.id === match.playerBId);
  const battle = createBattle(
    { name: playerA?.name || '玩家 A' },
    { name: playerB?.name || '玩家 B' }
  );
  battle.firstPlayer = drawPosition();
  battle.tournament = {
    tournamentId: tournament.id,
    matchId: match.id,
    gameNumber: match.games.length + 1,
  };
  return battle;
}

function createLeagueBattle(league, match) {
  const playerA = league.players.find((player) => player.id === match.playerAId);
  const playerB = league.players.find((player) => player.id === match.playerBId);
  const battle = createBattle(
    { name: playerA?.name || '玩家 A' },
    { name: playerB?.name || '玩家 B' }
  );
  battle.firstPlayer = drawPosition();
  battle.league = {
    leagueId: league.id,
    matchId: match.id,
    gameNumber: match.games.length + 1,
  };
  return battle;
}

export function AppProvider({ children }) {
  const [teams, setTeams] = useState(() => storage.loadTeams());
  const [history, setHistory] = useState(() => storage.loadHistory());
  const [battle, setBattle] = useState(() => storage.loadBattle());
  const [tournament, setTournament] = useState(() => storage.loadTournament());
  const [league, setLeague] = useState(() => normalizeLeagueSchedule(storage.loadLeague()));

  // Persist everything to localStorage.
  useEffect(() => storage.saveTeams(teams), [teams]);
  useEffect(() => storage.saveHistory(history), [history]);
  useEffect(() => {
    if (battle) storage.saveBattle(battle);
    else storage.clearBattle();
  }, [battle]);
  useEffect(() => {
    if (tournament) storage.saveTournament(tournament);
    else storage.clearTournament();
  }, [tournament]);
  useEffect(() => {
    if (league) storage.saveLeague(league);
    else storage.clearLeague();
  }, [league]);

  // Guard so each finished battle is added to history exactly once.
  // Seed the guard with ids already persisted in history so a page reload
  // (which re-hydrates both `battle` and `history` from localStorage) does not
  // re-append an already-recorded finished battle.
  const historyGuard = useRef(new Set((history || []).map((h) => h.id)));
  useEffect(() => {
    if (
      battle &&
      battle.status === 'finished' &&
      !historyGuard.current.has(battle.id)
    ) {
      historyGuard.current.add(battle.id);
      setHistory((prev) => [buildHistoryEntry(battle), ...prev]);
    }
  }, [battle]);

  // -------------------------------------------------------------------------
  // Team & combo actions
  // -------------------------------------------------------------------------
  const addTeam = useCallback((name) => {
    setTeams((prev) => [
      ...prev,
      { id: uid('team'), name: name || '新战队', createdAt: Date.now(), combos: [] },
    ]);
  }, []);

  const updateTeam = useCallback((teamId, patch) => {
    setTeams((prev) =>
      prev.map((t) => (t.id === teamId ? { ...t, ...patch } : t))
    );
  }, []);

  const deleteTeam = useCallback((teamId) => {
    setTeams((prev) => prev.filter((t) => t.id !== teamId));
  }, []);

  const addCombo = useCallback((teamId, combo) => {
    setTeams((prev) =>
      prev.map((t) =>
        t.id === teamId
          ? { ...t, combos: [...(t.combos || []), { id: uid('combo'), ...combo }] }
          : t
      )
    );
  }, []);

  const updateCombo = useCallback((teamId, comboId, patch) => {
    setTeams((prev) =>
      prev.map((t) =>
        t.id === teamId
          ? {
              ...t,
              combos: (t.combos || []).map((c) =>
                c.id === comboId ? { ...c, ...patch } : c
              ),
            }
          : t
      )
    );
  }, []);

  const deleteCombo = useCallback((teamId, comboId) => {
    setTeams((prev) =>
      prev.map((t) =>
        t.id === teamId
          ? { ...t, combos: (t.combos || []).filter((c) => c.id !== comboId) }
          : t
      )
    );
  }, []);

  // -------------------------------------------------------------------------
  // Battle actions
  // -------------------------------------------------------------------------
  const startBattle = useCallback((playerA, playerB) => {
    setBattle(createBattle(playerA, playerB));
  }, []);

  const setFirstPlayer = useCallback((side) => {
    setBattle((prev) => (prev ? { ...prev, firstPlayer: side } : prev));
  }, []);

  const randomizePosition = useCallback(() => {
    setBattle((prev) => (prev ? { ...prev, firstPlayer: drawPosition() } : prev));
  }, []);

  const beginBattle = useCallback(() => {
    setBattle((prev) => beginBattleFn(prev));
  }, []);

  const recordRound = useCallback((winner, finishType) => {
    setBattle((prev) => recordRoundFn(prev, winner, finishType));
  }, []);

  const rematch = useCallback(() => {
    setBattle((prev) => {
      if (!prev) return null;
      const nb = createBattle(prev.playerA, prev.playerB);
      nb.firstPlayer = prev.firstPlayer;
      return nb;
    });
  }, []);

  const resetBattle = useCallback(() => {
    setBattle(null);
  }, []);

  // -------------------------------------------------------------------------
  // Tournament actions
  // -------------------------------------------------------------------------
  const createTournament = useCallback((names, format) => {
    const nextTournament = createTournamentFn(names, format);
    setTournament(nextTournament);
    setLeague(null);
    setBattle(null);
  }, []);

  const startNextTournamentMatch = useCallback(() => {
    if (!tournament || tournament.status !== 'ongoing') return;
    const nextMatch = getNextTournamentMatch(tournament);
    if (!nextMatch) return;
    const activated = tournament.currentMatchId
      ? tournament
      : activateTournamentMatch(tournament, nextMatch.id);
    const activeMatch = findTournamentMatch(activated, nextMatch.id);
    setTournament(activated);
    setBattle(createTournamentBattle(activated, activeMatch));
  }, [tournament]);

  const restartTournamentGame = useCallback(() => {
    if (!tournament?.currentMatchId) return;
    const match = findTournamentMatch(tournament, tournament.currentMatchId);
    if (match) setBattle(createTournamentBattle(tournament, match));
  }, [tournament]);

  const completeTournamentGame = useCallback(() => {
    if (!tournament || !battle?.tournament || battle.status !== 'finished') return;
    const updated = recordTournamentGameFn(tournament, battle);
    const updatedMatch = findTournamentMatch(updated, battle.tournament.matchId);
    setTournament(updated);

    if (updated.status === 'ongoing' && updatedMatch?.status === 'active') {
      setBattle(createTournamentBattle(updated, updatedMatch));
    } else {
      setBattle(null);
    }
  }, [battle, tournament]);

  const resetTournament = useCallback(() => {
    setTournament(null);
    setBattle((current) => (current?.tournament ? null : current));
  }, []);

  // -------------------------------------------------------------------------
  // Points league actions
  // -------------------------------------------------------------------------
  const createLeague = useCallback((names, options) => {
    const nextLeague = createLeagueFn(names, options);
    setLeague(nextLeague);
    setTournament(null);
    setBattle(null);
  }, []);

  const startNextLeagueMatch = useCallback(() => {
    if (!league || league.status !== 'ongoing') return;
    const nextMatch = getNextLeagueMatch(league);
    if (!nextMatch) return;
    const activated = league.currentMatchId
      ? league
      : activateLeagueMatch(league, nextMatch.id);
    const activeMatch = findLeagueMatch(activated, nextMatch.id);
    setLeague(activated);
    setBattle(createLeagueBattle(activated, activeMatch));
  }, [league]);

  const restartLeagueGame = useCallback(() => {
    if (!league?.currentMatchId) return;
    const match = findLeagueMatch(league, league.currentMatchId);
    if (match) setBattle(createLeagueBattle(league, match));
  }, [league]);

  const completeLeagueGame = useCallback(() => {
    if (!league || !battle?.league || battle.status !== 'finished') return;
    const updated = recordLeagueGameFn(league, battle);
    const updatedMatch = findLeagueMatch(updated, battle.league.matchId);
    setLeague(updated);

    if (updated.status === 'ongoing' && updatedMatch?.status === 'active') {
      setBattle(createLeagueBattle(updated, updatedMatch));
    } else {
      setBattle(null);
    }
  }, [battle, league]);

  const resetLeague = useCallback(() => {
    setLeague(null);
    setBattle((current) => (current?.league ? null : current));
  }, []);

  // -------------------------------------------------------------------------
  // Derived selectors
  // -------------------------------------------------------------------------
  const allCombos = useMemo(
    () =>
      teams.flatMap((t) =>
        (t.combos || []).map((c) => ({ ...c, teamId: t.id, teamName: t.name }))
      ),
    [teams]
  );

  const getComboById = useCallback(
    (id) => allCombos.find((c) => c.id === id) || null,
    [allCombos]
  );

  const value = useMemo(
    () => ({
      teams,
      history,
      battle,
      tournament,
      league,
      allCombos,
      getComboById,
      // team/combo
      addTeam,
      updateTeam,
      deleteTeam,
      addCombo,
      updateCombo,
      deleteCombo,
      // battle
      startBattle,
      setFirstPlayer,
      randomizePosition,
      beginBattle,
      recordRound,
      rematch,
      resetBattle,
      // tournament
      createTournament,
      startNextTournamentMatch,
      restartTournamentGame,
      completeTournamentGame,
      resetTournament,
      // points league
      createLeague,
      startNextLeagueMatch,
      restartLeagueGame,
      completeLeagueGame,
      resetLeague,
    }),
    [
      teams,
      history,
      battle,
      tournament,
      league,
      allCombos,
      getComboById,
      addTeam,
      updateTeam,
      deleteTeam,
      addCombo,
      updateCombo,
      deleteCombo,
      startBattle,
      setFirstPlayer,
      randomizePosition,
      beginBattle,
      recordRound,
      rematch,
      resetBattle,
      createTournament,
      startNextTournamentMatch,
      restartTournamentGame,
      completeTournamentGame,
      resetTournament,
      createLeague,
      startNextLeagueMatch,
      restartLeagueGame,
      completeLeagueGame,
      resetLeague,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
