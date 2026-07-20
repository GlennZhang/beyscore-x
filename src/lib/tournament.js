export const TOURNAMENT_FORMAT = {
  SINGLE: 'single',
  BEST_OF_3: 'best_of_3',
};

let tournamentCounter = 0;

function uid(prefix) {
  tournamentCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${tournamentCounter.toString(36)}`;
}

function shuffle(items, rng = Math.random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function nextPowerOfTwo(value) {
  let size = 2;
  while (size < value) size *= 2;
  return size;
}

export function gamesRequired(format) {
  return format === TOURNAMENT_FORMAT.BEST_OF_3 ? 2 : 1;
}

function createMatch(roundNumber, slot, playerAId, playerBId) {
  const isBye = Boolean(playerAId) !== Boolean(playerBId);
  return {
    id: uid(`match-r${roundNumber}`),
    roundNumber,
    slot,
    playerAId: playerAId || null,
    playerBId: playerBId || null,
    status: isBye ? 'bye' : 'pending',
    winnerId: isBye ? (playerAId || playerBId) : null,
    games: [],
    gameWinsA: 0,
    gameWinsB: 0,
    completedAt: isBye ? Date.now() : null,
  };
}

function currentRound(tournament) {
  return tournament.rounds[tournament.rounds.length - 1] || null;
}

function advanceRoundIfReady(tournament) {
  const round = currentRound(tournament);
  if (!round || round.matches.some((match) => !['bye', 'completed'].includes(match.status))) {
    return tournament;
  }

  const winners = round.matches.map((match) => match.winnerId).filter(Boolean);
  if (winners.length === 1) {
    return {
      ...tournament,
      status: 'finished',
      championId: winners[0],
      currentMatchId: null,
      finishedAt: Date.now(),
    };
  }

  const roundNumber = round.number + 1;
  const matches = [];
  for (let i = 0; i < winners.length; i += 2) {
    matches.push(createMatch(roundNumber, i / 2, winners[i], winners[i + 1]));
  }

  return {
    ...tournament,
    rounds: [
      ...tournament.rounds,
      {
        number: roundNumber,
        capacity: winners.length,
        matches,
      },
    ],
  };
}

export function createTournament(names, format = TOURNAMENT_FORMAT.SINGLE, rng = Math.random) {
  if (!Array.isArray(names) || names.length < 2 || names.length > 10) {
    throw new Error('Tournament requires 2 to 10 players.');
  }

  const cleaned = names.map((name) => String(name || '').trim());
  if (cleaned.some((name) => !name)) throw new Error('Every player needs a name.');
  if (new Set(cleaned.map((name) => name.toLocaleLowerCase())).size !== cleaned.length) {
    throw new Error('Player names must be unique.');
  }

  const players = cleaned.map((name) => ({ id: uid('player'), name }));
  const seeded = shuffle(players, rng);
  const bracketSize = nextPowerOfTwo(players.length);
  const matchCount = bracketSize / 2;
  const byeCount = bracketSize - players.length;
  const matches = [];
  let cursor = 0;

  for (let slot = 0; slot < matchCount; slot += 1) {
    if (slot < byeCount) {
      matches.push(createMatch(1, slot, seeded[cursor].id, null));
      cursor += 1;
    } else {
      matches.push(
        createMatch(1, slot, seeded[cursor].id, seeded[cursor + 1].id)
      );
      cursor += 2;
    }
  }

  return {
    id: uid('tournament'),
    format,
    requiredGameWins: gamesRequired(format),
    players,
    rounds: [{ number: 1, capacity: bracketSize, matches }],
    status: 'ongoing',
    currentMatchId: null,
    championId: null,
    lastCompletedMatchPlayerIds: [],
    createdAt: Date.now(),
    finishedAt: null,
  };
}

export function findTournamentMatch(tournament, matchId) {
  for (const round of tournament?.rounds || []) {
    const match = round.matches.find((candidate) => candidate.id === matchId);
    if (match) return match;
  }
  return null;
}

export function getActiveTournamentMatch(tournament) {
  return tournament?.currentMatchId
    ? findTournamentMatch(tournament, tournament.currentMatchId)
    : null;
}

export function getNextTournamentMatch(tournament) {
  if (!tournament || tournament.status !== 'ongoing') return null;
  const active = getActiveTournamentMatch(tournament);
  if (active) return active;

  const round = currentRound(tournament);
  const pending = round?.matches.filter((match) => match.status === 'pending') || [];
  if (!pending.length) return null;

  const rested = pending.find(
    (match) =>
      !tournament.lastCompletedMatchPlayerIds.includes(match.playerAId) &&
      !tournament.lastCompletedMatchPlayerIds.includes(match.playerBId)
  );
  return rested || pending[0];
}

export function activateTournamentMatch(tournament, matchId) {
  const target = findTournamentMatch(tournament, matchId);
  if (!target || target.status !== 'pending' || tournament.currentMatchId) return tournament;

  return {
    ...tournament,
    currentMatchId: matchId,
    rounds: tournament.rounds.map((round) => ({
      ...round,
      matches: round.matches.map((match) =>
        match.id === matchId ? { ...match, status: 'active', startedAt: Date.now() } : match
      ),
    })),
  };
}

export function recordTournamentGame(tournament, battle) {
  const matchId = battle?.tournament?.matchId || tournament?.currentMatchId;
  const match = findTournamentMatch(tournament, matchId);
  if (!match || match.status !== 'active' || battle?.status !== 'finished') return tournament;

  const winnerId = battle.winner === 'A' ? match.playerAId : match.playerBId;
  const gameWinsA = match.gameWinsA + (winnerId === match.playerAId ? 1 : 0);
  const gameWinsB = match.gameWinsB + (winnerId === match.playerBId ? 1 : 0);
  const matchFinished =
    gameWinsA >= tournament.requiredGameWins ||
    gameWinsB >= tournament.requiredGameWins;
  const game = {
    number: match.games.length + 1,
    winnerId,
    scoreA: battle.scoreA,
    scoreB: battle.scoreB,
    rounds: (battle.rounds || []).map((round) => ({ ...round })),
    finishedAt: battle.finishedAt || Date.now(),
  };

  let updated = {
    ...tournament,
    currentMatchId: matchFinished ? null : matchId,
    lastCompletedMatchPlayerIds: matchFinished
      ? [match.playerAId, match.playerBId]
      : tournament.lastCompletedMatchPlayerIds,
    rounds: tournament.rounds.map((round) => ({
      ...round,
      matches: round.matches.map((candidate) =>
        candidate.id === matchId
          ? {
              ...candidate,
              games: [...candidate.games, game],
              gameWinsA,
              gameWinsB,
              status: matchFinished ? 'completed' : 'active',
              winnerId: matchFinished ? winnerId : null,
              completedAt: matchFinished ? Date.now() : null,
            }
          : candidate
      ),
    })),
  };

  if (matchFinished) updated = advanceRoundIfReady(updated);
  return updated;
}

export function getTournamentStandings(tournament) {
  const stats = new Map(
    (tournament?.players || []).map((player) => [
      player.id,
      {
        playerId: player.id,
        name: player.name,
        matchesPlayed: 0,
        matchWins: 0,
        matchLosses: 0,
        gameWins: 0,
        gameLosses: 0,
        pointsFor: 0,
        pointsAgainst: 0,
      },
    ])
  );

  for (const round of tournament?.rounds || []) {
    for (const match of round.matches) {
      const playerA = stats.get(match.playerAId);
      const playerB = stats.get(match.playerBId);
      for (const game of match.games) {
        if (playerA) {
          playerA.pointsFor += game.scoreA;
          playerA.pointsAgainst += game.scoreB;
          if (game.winnerId === match.playerAId) playerA.gameWins += 1;
          else playerA.gameLosses += 1;
        }
        if (playerB) {
          playerB.pointsFor += game.scoreB;
          playerB.pointsAgainst += game.scoreA;
          if (game.winnerId === match.playerBId) playerB.gameWins += 1;
          else playerB.gameLosses += 1;
        }
      }

      if (match.status === 'completed') {
        if (playerA) {
          playerA.matchesPlayed += 1;
          if (match.winnerId === match.playerAId) playerA.matchWins += 1;
          else playerA.matchLosses += 1;
        }
        if (playerB) {
          playerB.matchesPlayed += 1;
          if (match.winnerId === match.playerBId) playerB.matchWins += 1;
          else playerB.matchLosses += 1;
        }
      }
    }
  }

  return [...stats.values()].sort((a, b) => {
    if (a.playerId === tournament?.championId) return -1;
    if (b.playerId === tournament?.championId) return 1;
    return (
      b.matchWins - a.matchWins ||
      b.gameWins - a.gameWins ||
      b.pointsFor - b.pointsAgainst - (a.pointsFor - a.pointsAgainst) ||
      a.name.localeCompare(b.name)
    );
  });
}

export function tournamentRoundLabel(round) {
  if (round.capacity === 2) return '决赛';
  if (round.capacity === 4) return '半决赛';
  if (round.capacity === 8) return '四分之一决赛';
  return `${round.capacity} 强赛`;
}
