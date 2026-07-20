import { describe, expect, it } from 'vitest';
import {
  TOURNAMENT_FORMAT,
  activateTournamentMatch,
  createTournament,
  findTournamentMatch,
  getNextTournamentMatch,
  getTournamentStandings,
  recordTournamentGame,
} from './tournament';

const fixedRng = () => 0.5;

function finishedBattle(tournament, match, winner = 'A', scoreA = 4, scoreB = 2) {
  return {
    status: 'finished',
    winner,
    scoreA,
    scoreB,
    rounds: [],
    finishedAt: 10,
    tournament: { tournamentId: tournament.id, matchId: match.id },
  };
}

describe('single elimination tournament', () => {
  it('creates randomized brackets with byes for non-power-of-two player counts', () => {
    const tournament = createTournament(
      ['A', 'B', 'C', 'D', 'E'],
      TOURNAMENT_FORMAT.SINGLE,
      fixedRng
    );
    const matches = tournament.rounds[0].matches;

    expect(matches).toHaveLength(4);
    expect(matches.filter((match) => match.status === 'bye')).toHaveLength(3);
    expect(matches.filter((match) => match.status === 'pending')).toHaveLength(1);
  });

  it('supports ten players and rejects counts outside the 2–10 range', () => {
    const names = Array.from({ length: 10 }, (_, index) => `Player ${index + 1}`);
    const tournament = createTournament(names, TOURNAMENT_FORMAT.SINGLE, fixedRng);
    expect(tournament.rounds[0].matches).toHaveLength(8);
    expect(tournament.rounds[0].matches.filter((match) => match.status === 'bye')).toHaveLength(6);
    expect(() => createTournament([...names, 'Player 11'])).toThrow(/2 to 10/);
  });

  it('advances winners until a champion is produced', () => {
    let tournament = createTournament(['A', 'B'], TOURNAMENT_FORMAT.SINGLE, fixedRng);
    let match = getNextTournamentMatch(tournament);
    tournament = activateTournamentMatch(tournament, match.id);
    tournament = recordTournamentGame(tournament, finishedBattle(tournament, match));

    expect(tournament.status).toBe('finished');
    expect(tournament.championId).toBe(match.playerAId);
  });

  it('requires two game wins in a best-of-three match', () => {
    let tournament = createTournament(['A', 'B'], TOURNAMENT_FORMAT.BEST_OF_3, fixedRng);
    const match = getNextTournamentMatch(tournament);
    tournament = activateTournamentMatch(tournament, match.id);
    tournament = recordTournamentGame(tournament, finishedBattle(tournament, match));

    expect(findTournamentMatch(tournament, match.id).status).toBe('active');
    expect(findTournamentMatch(tournament, match.id).gameWinsA).toBe(1);

    tournament = recordTournamentGame(tournament, finishedBattle(tournament, match));
    expect(tournament.status).toBe('finished');
    expect(findTournamentMatch(tournament, match.id).gameWinsA).toBe(2);
  });

  it('prefers a next match whose players did not play the previous match', () => {
    let tournament = createTournament(
      ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
      TOURNAMENT_FORMAT.SINGLE,
      fixedRng
    );
    const first = getNextTournamentMatch(tournament);
    tournament = activateTournamentMatch(tournament, first.id);
    tournament = recordTournamentGame(tournament, finishedBattle(tournament, first));
    const next = getNextTournamentMatch(tournament);

    expect([next.playerAId, next.playerBId]).not.toContain(first.playerAId);
    expect([next.playerAId, next.playerBId]).not.toContain(first.playerBId);
  });

  it('derives match, game and cumulative point statistics', () => {
    let tournament = createTournament(['A', 'B'], TOURNAMENT_FORMAT.SINGLE, fixedRng);
    const match = getNextTournamentMatch(tournament);
    tournament = activateTournamentMatch(tournament, match.id);
    tournament = recordTournamentGame(
      tournament,
      finishedBattle(tournament, match, 'A', 5, 3)
    );
    const standings = getTournamentStandings(tournament);

    expect(standings[0]).toMatchObject({
      playerId: match.playerAId,
      matchWins: 1,
      gameWins: 1,
      pointsFor: 5,
      pointsAgainst: 3,
    });
    expect(standings[1]).toMatchObject({ matchLosses: 1, gameLosses: 1 });
  });
});
