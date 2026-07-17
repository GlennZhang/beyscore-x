// ============================================================================
// Unit tests for src/lib/storage.js — localStorage read/write wrappers.
// Uses the jsdom environment's real localStorage.
// Run with: npm test
// ============================================================================
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { storage } from './storage';

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('teams', () => {
  it('returns [] when nothing stored', () => {
    expect(storage.loadTeams()).toEqual([]);
  });

  it('round-trips teams through save/load', () => {
    const teams = [{ id: 't1', name: 'Team A', combos: [] }];
    storage.saveTeams(teams);
    expect(storage.loadTeams()).toEqual(teams);
  });
});

describe('history', () => {
  it('returns [] when nothing stored', () => {
    expect(storage.loadHistory()).toEqual([]);
  });

  it('round-trips history through save/load', () => {
    const history = [{ id: 'h1', winner: 'A', scoreA: 4, scoreB: 2 }];
    storage.saveHistory(history);
    expect(storage.loadHistory()).toEqual(history);
  });
});

describe('battle', () => {
  it('returns null when nothing stored', () => {
    expect(storage.loadBattle()).toBeNull();
  });

  it('round-trips a battle through save/load', () => {
    const battle = { id: 'b1', status: 'ongoing', scoreA: 2, scoreB: 1, rounds: [] };
    storage.saveBattle(battle);
    expect(storage.loadBattle()).toEqual(battle);
  });

  it('clearBattle removes the stored battle', () => {
    storage.saveBattle({ id: 'b1' });
    expect(storage.loadBattle()).not.toBeNull();
    storage.clearBattle();
    expect(storage.loadBattle()).toBeNull();
  });
});

describe('resilience', () => {
  it('falls back to default when stored JSON is corrupt', () => {
    localStorage.setItem('beyscorex.teams.v1', '{not valid json');
    expect(storage.loadTeams()).toEqual([]); // fallback []
    expect(console.warn).toHaveBeenCalled();
  });

  it('falls back to null for corrupt battle JSON', () => {
    localStorage.setItem('beyscorex.battle.v1', '???');
    expect(storage.loadBattle()).toBeNull();
  });
});
