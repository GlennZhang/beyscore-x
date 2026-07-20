import { describe, expect, it } from 'vitest';
import {
  LEAGUE_FORMAT,
  LEAGUE_PAIRING,
  activateLeagueMatch,
  createLeague,
  findLeagueMatch,
  getLeagueStandings,
  getNextLeagueMatch,
  leagueScheduleSummary,
  normalizeLeagueSchedule,
  recordLeagueGame,
  swissRoundsPerCycle,
} from './league';

const fixedRng = () => 0.5;

function finishedBattle(league, match, winner = 'A', scoreA = 4, scoreB = 2) {
  return {
    status: 'finished',
    winner,
    scoreA,
    scoreB,
    rounds: [],
    finishedAt: 10,
    league: { leagueId: league.id, matchId: match.id },
  };
}

function completeMatch(league, winner = 'A') {
  const match = getNextLeagueMatch(league);
  let updated = activateLeagueMatch(league, match.id);
  const winsNeeded = updated.requiredGameWins;
  for (let index = 0; index < winsNeeded; index += 1) {
    updated = recordLeagueGame(updated, finishedBattle(updated, match, winner), fixedRng);
  }
  return updated;
}

describe('points league', () => {
  it('automatically converts competition cycles into Swiss small rounds', () => {
    expect(swissRoundsPerCycle(3)).toBe(3);
    expect(swissRoundsPerCycle(5)).toBe(5);
    expect(swissRoundsPerCycle(4)).toBe(3);
    expect(swissRoundsPerCycle(8)).toBe(3);
    expect(swissRoundsPerCycle(10)).toBe(4);
    expect(leagueScheduleSummary(3, LEAGUE_PAIRING.SWISS, 2)).toEqual({
      cycles: 2,
      roundsPerCycle: 3,
      totalRounds: 6,
      estimatedMatches: 6,
    });
  });

  it('requires 3–10 unique named players', () => {
    expect(() => createLeague(['A', 'B'])).toThrow(/3 to 10/);
    expect(() => createLeague(Array.from({ length: 11 }, (_, i) => `P${i}`))).toThrow(/3 to 10/);
    expect(() => createLeague(['A', 'B', 'a'])).toThrow(/unique/);
  });

  it('creates every pairing once per round-robin cycle without bye matches', () => {
    const league = createLeague(['A', 'B', 'C'], {
      pairing: LEAGUE_PAIRING.ROUND_ROBIN,
      rounds: 2,
    }, fixedRng);

    expect(league.rounds).toHaveLength(2);
    expect(league.rounds[0].matches).toHaveLength(3);
    expect(league.rounds[1].matches).toHaveLength(3);
    expect(league.rounds.flatMap((round) => round.matches).every((match) => match.playerAId && match.playerBId)).toBe(true);
  });

  it('awards the configured winner points and ranks by the confirmed tie-breakers', () => {
    let league = createLeague(['A', 'B', 'C'], {
      pairing: LEAGUE_PAIRING.ROUND_ROBIN,
      winnerPoints: 3,
    }, fixedRng);
    const first = getNextLeagueMatch(league);
    league = activateLeagueMatch(league, first.id);
    league = recordLeagueGame(league, finishedBattle(league, first, 'A', 4, 1), fixedRng);

    const standings = getLeagueStandings(league);
    expect(standings[0]).toMatchObject({ playerId: first.playerAId, totalPoints: 3, matchWins: 1, scoreDifferential: 3, rank: 1 });
    expect(standings.find((row) => row.playerId === first.playerBId)).toMatchObject({ totalPoints: 0, matchLosses: 1 });
  });

  it('shares rank when every ranking criterion is exactly tied', () => {
    const league = createLeague(['A', 'B', 'C'], {}, fixedRng);
    expect(getLeagueStandings(league).map((row) => row.rank)).toEqual([1, 1, 1]);
  });

  it('supports best-of-three matches where each game is first to four', () => {
    let league = createLeague(['A', 'B', 'C'], {
      format: LEAGUE_FORMAT.BEST_OF_3,
    }, fixedRng);
    const match = getNextLeagueMatch(league);
    league = activateLeagueMatch(league, match.id);
    league = recordLeagueGame(league, finishedBattle(league, match), fixedRng);
    expect(findLeagueMatch(league, match.id).status).toBe('active');
    league = recordLeagueGame(league, finishedBattle(league, match), fixedRng);
    expect(findLeagueMatch(league, match.id).status).toBe('completed');
  });

  it('gives odd Swiss fields a no-points wait and never waits the same player twice in a row', () => {
    let league = createLeague(['A', 'B', 'C', 'D', 'E'], {
      pairing: LEAGUE_PAIRING.SWISS,
      rounds: 2,
    }, fixedRng);
    const firstWaiter = league.rounds[0].waitingPlayerId;
    expect(league.rounds[0].matches).toHaveLength(2);
    while (league.rounds.length === 1) league = completeMatch(league);
    const secondWaiter = league.rounds[1].waitingPlayerId;

    expect(secondWaiter).not.toBe(firstWaiter);
    expect(getLeagueStandings(league).find((row) => row.playerId === firstWaiter).totalPoints).toBe(0);
  });

  it('plays all three pairings before a one-cycle, three-player Swiss event finishes', () => {
    let league = createLeague(['A', 'B', 'C'], {
      pairing: LEAGUE_PAIRING.SWISS,
      cycles: 1,
    }, fixedRng);
    expect(league.totalRounds).toBe(3);
    expect(league.estimatedMatches).toBe(3);

    while (league.status === 'ongoing') league = completeMatch(league);

    const matches = league.rounds.flatMap((round) => round.matches);
    const pairs = matches.map((match) => [match.playerAId, match.playerBId].sort().join('|'));
    expect(matches).toHaveLength(3);
    expect(new Set(pairs)).toHaveLength(3);
    expect(getLeagueStandings(league).map((row) => row.waits).sort()).toEqual([1, 1, 1]);
  });

  it('avoids Swiss rematches when another pairing is available', () => {
    let league = createLeague(['A', 'B', 'C', 'D'], {
      pairing: LEAGUE_PAIRING.SWISS,
      rounds: 2,
    }, fixedRng);
    const firstRoundPairs = league.rounds[0].matches.map((match) => new Set([match.playerAId, match.playerBId]));
    while (league.rounds.length === 1) league = completeMatch(league);

    for (const match of league.rounds[1].matches) {
      expect(firstRoundPairs.some((pair) => pair.has(match.playerAId) && pair.has(match.playerBId))).toBe(false);
    }
  });

  it('finishes after the automatically calculated Swiss cycle', () => {
    let league = createLeague(['A', 'B', 'C', 'D'], {
      pairing: LEAGUE_PAIRING.SWISS,
      rounds: 1,
    }, fixedRng);
    while (league.status === 'ongoing') league = completeMatch(league);
    expect(league.status).toBe('finished');
    expect(league.rounds).toHaveLength(3);
  });

  it('upgrades a persisted legacy Swiss event to a complete cycle', () => {
    const legacy = createLeague(['A', 'B', 'C'], {
      pairing: LEAGUE_PAIRING.SWISS,
      cycles: 1,
    }, fixedRng);
    delete legacy.cycles;
    delete legacy.roundsPerCycle;
    legacy.totalRounds = 1;
    const upgraded = normalizeLeagueSchedule(legacy);
    expect(upgraded).toMatchObject({ cycles: 1, roundsPerCycle: 3, totalRounds: 3, estimatedMatches: 3 });
  });
});
