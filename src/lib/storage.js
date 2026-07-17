// ============================================================================
// localStorage read/write wrappers for Beyscore X.
// All persistence flows through this module so the rest of the app never
// touches localStorage directly.
// ============================================================================

const KEYS = {
  TEAMS: 'beyscorex.teams.v1',
  HISTORY: 'beyscorex.history.v1',
  BATTLE: 'beyscorex.battle.v1',
};

/**
 * Read a JSON value from localStorage.
 * @param {string} key
 * @param {*} fallback
 * @returns {*}
 */
function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === undefined) return fallback;
    return JSON.parse(raw);
  } catch (err) {
    console.warn('[storage] read failed for', key, err);
    return fallback;
  }
}

/**
 * Write a JSON-serialisable value to localStorage.
 * @param {string} key
 * @param {*} value
 */
function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn('[storage] write failed for', key, err);
  }
}

/**
 * Remove a key from localStorage.
 * @param {string} key
 */
function remove(key) {
  try {
    localStorage.removeItem(key);
  } catch (err) {
    console.warn('[storage] remove failed for', key, err);
  }
}

export const storage = {
  loadTeams: () => read(KEYS.TEAMS, []),
  saveTeams: (teams) => write(KEYS.TEAMS, teams),

  loadHistory: () => read(KEYS.HISTORY, []),
  saveHistory: (history) => write(KEYS.HISTORY, history),

  loadBattle: () => read(KEYS.BATTLE, null),
  saveBattle: (battle) => write(KEYS.BATTLE, battle),
  clearBattle: () => remove(KEYS.BATTLE),
};
