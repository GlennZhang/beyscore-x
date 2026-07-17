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
  };
}

export function AppProvider({ children }) {
  const [teams, setTeams] = useState(() => storage.loadTeams());
  const [history, setHistory] = useState(() => storage.loadHistory());
  const [battle, setBattle] = useState(() => storage.loadBattle());

  // Persist everything to localStorage.
  useEffect(() => storage.saveTeams(teams), [teams]);
  useEffect(() => storage.saveHistory(history), [history]);
  useEffect(() => {
    if (battle) storage.saveBattle(battle);
    else storage.clearBattle();
  }, [battle]);

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
    }),
    [
      teams,
      history,
      battle,
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
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
