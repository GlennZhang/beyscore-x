import { TOURNAMENT_FORMAT, gamesRequired } from './tournament';

export { TOURNAMENT_FORMAT as LEAGUE_FORMAT };

export const LEAGUE_PAIRING = {
  ROUND_ROBIN: 'round_robin',
  SWISS: 'swiss',
};

export function swissRoundsPerCycle(playerCount) {
  if (!Number.isInteger(playerCount) || playerCount < 3 || playerCount > 10) {
    throw new Error('Swiss cycle requires 3 to 10 players.');
  }
  if (playerCount % 2 === 1) return playerCount;
  return playerCount <= 8 ? 3 : 4;
}

export function leagueScheduleSummary(playerCount, pairing, cycles = 1) {
  if (!Number.isInteger(cycles) || cycles < 1 || cycles > 3) {
    throw new Error('Competition cycles must be 1 to 3.');
  }
  if (pairing === LEAGUE_PAIRING.ROUND_ROBIN) {
    return {
      cycles,
      roundsPerCycle: 1,
      totalRounds: cycles,
      estimatedMatches: (playerCount * (playerCount - 1) / 2) * cycles,
    };
  }
  if (pairing !== LEAGUE_PAIRING.SWISS) throw new Error('Unknown pairing method.');
  const roundsPerCycle = swissRoundsPerCycle(playerCount);
  const totalRounds = roundsPerCycle * cycles;
  return {
    cycles,
    roundsPerCycle,
    totalRounds,
    estimatedMatches: Math.floor(playerCount / 2) * totalRounds,
  };
}

export function normalizeLeagueSchedule(league) {
  if (!league || league.cycles) return league;
  const playerCount = league.players?.length || 0;
  if (playerCount < 3) return league;

  if (league.pairing === LEAGUE_PAIRING.ROUND_ROBIN) {
    const cycles = Math.max(1, league.totalRounds || league.rounds?.length || 1);
    return {
      ...league,
      cycles,
      roundsPerCycle: 1,
      totalRounds: cycles,
      estimatedMatches: (playerCount * (playerCount - 1) / 2) * cycles,
    };
  }

  const roundsPerCycle = swissRoundsPerCycle(playerCount);
  const legacyRounds = Math.max(1, league.totalRounds || league.rounds?.length || 1);
  const cycles = Math.min(3, Math.max(1, Math.ceil(legacyRounds / roundsPerCycle)));
  const totalRounds = Math.max(league.rounds?.length || 0, roundsPerCycle * cycles);
  return {
    ...league,
    cycles,
    roundsPerCycle,
    totalRounds,
    estimatedMatches: Math.floor(playerCount / 2) * totalRounds,
  };
}

let leagueCounter = 0;

function uid(prefix) {
  leagueCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${leagueCounter.toString(36)}`;
}

function shuffle(items, rng = Math.random) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function cleanNames(names) {
  if (!Array.isArray(names) || names.length < 3 || names.length > 10) {
    throw new Error('League requires 3 to 10 players.');
  }
  const cleaned = names.map((name) => String(name || '').trim());
  if (cleaned.some((name) => !name)) throw new Error('Every player needs a name.');
  if (new Set(cleaned.map((name) => name.toLocaleLowerCase())).size !== cleaned.length) {
    throw new Error('Player names must be unique.');
  }
  return cleaned;
}

function createMatch(roundNumber, slot, playerAId, playerBId) {
  return {
    id: uid(`league-match-r${roundNumber}`),
    roundNumber,
    slot,
    playerAId,
    playerBId,
    status: 'pending',
    winnerId: null,
    games: [],
    gameWinsA: 0,
    gameWinsB: 0,
    startedAt: null,
    completedAt: null,
  };
}

function allPairs(playerIds, roundNumber, rng) {
  const shuffled = shuffle(playerIds, rng);
  const pairs = [];
  for (let left = 0; left < shuffled.length; left += 1) {
    for (let right = left + 1; right < shuffled.length; right += 1) {
      pairs.push([shuffled[left], shuffled[right]]);
    }
  }
  return shuffle(pairs, rng).map(([playerAId, playerBId], slot) =>
    createMatch(roundNumber, slot, playerAId, playerBId)
  );
}

function completedOpponentMap(league) {
  const opponents = new Map(league.players.map((player) => [player.id, new Set()]));
  for (const round of league.rounds) {
    for (const match of round.matches) {
      if (match.status !== 'completed') continue;
      opponents.get(match.playerAId)?.add(match.playerBId);
      opponents.get(match.playerBId)?.add(match.playerAId);
    }
  }
  return opponents;
}

function standingKey(row) {
  return [row.totalPoints, row.matchWins, row.gameDifferential, row.scoreDifferential];
}

function compareStanding(a, b) {
  return (
    b.totalPoints - a.totalPoints ||
    b.matchWins - a.matchWins ||
    b.gameDifferential - a.gameDifferential ||
    b.scoreDifferential - a.scoreDifferential ||
    a.name.localeCompare(b.name)
  );
}

function chooseWaitingPlayer(league, standings, rng) {
  if (league.players.length % 2 === 0) return null;
  const previous = league.previousWaitingPlayerId;
  const eligible = standings.filter((row) => row.playerId !== previous);
  const fewestWaits = Math.min(...eligible.map((row) => row.waits));
  const pool = eligible.filter((row) => row.waits === fewestWaits);
  const lowestPoints = Math.min(...pool.map((row) => row.totalPoints));
  const finalists = pool.filter((row) => row.totalPoints === lowestPoints);
  return finalists[Math.floor(rng() * finalists.length)]?.playerId || eligible.at(-1)?.playerId;
}

function swissPairingCost(aId, bId, rows, opponents) {
  const a = rows.get(aId);
  const b = rows.get(bId);
  const rematchPenalty = opponents.get(aId)?.has(bId) ? 100000 : 0;
  return (
    rematchPenalty +
    Math.abs(a.totalPoints - b.totalPoints) * 100 +
    Math.abs(a.matchWins - b.matchWins) * 10 +
    Math.abs(a.gameDifferential - b.gameDifferential)
  );
}

function bestSwissPairs(playerIds, standings, opponents) {
  const rows = new Map(standings.map((row) => [row.playerId, row]));
  let best = null;

  function search(remaining, pairs, cost) {
    if (!remaining.length) {
      if (!best || cost < best.cost) best = { pairs, cost };
      return;
    }
    if (best && cost >= best.cost) return;

    const [first, ...rest] = remaining;
    const candidates = rest
      .map((opponentId, index) => ({
        opponentId,
        index,
        cost: swissPairingCost(first, opponentId, rows, opponents),
      }))
      .sort((a, b) => a.cost - b.cost);

    for (const candidate of candidates) {
      const next = rest.filter((_, index) => index !== candidate.index);
      search(next, [...pairs, [first, candidate.opponentId]], cost + candidate.cost);
    }
  }

  search(playerIds, [], 0);
  return best?.pairs || [];
}

function createSwissRound(league, roundNumber, rng = Math.random) {
  const standings = getLeagueStandings(league);
  const waitingPlayerId = chooseWaitingPlayer(league, standings, rng);
  const waitingPriority = league.waitingPriorityPlayerId;
  const ordered = standings
    .filter((row) => row.playerId !== waitingPlayerId)
    .sort((a, b) => {
      if (a.playerId === waitingPriority) return -1;
      if (b.playerId === waitingPriority) return 1;
      return compareStanding(a, b);
    })
    .map((row) => row.playerId);
  const opponents = completedOpponentMap(league);
  const pairs = bestSwissPairs(ordered, standings, opponents);

  return {
    number: roundNumber,
    status: 'pending',
    waitingPlayerId,
    matches: pairs.map(([playerAId, playerBId], slot) =>
      createMatch(roundNumber, slot, playerAId, playerBId)
    ),
  };
}

export function createLeague(
  names,
  {
    pairing = LEAGUE_PAIRING.ROUND_ROBIN,
    rounds,
    cycles = rounds ?? 1,
    format = TOURNAMENT_FORMAT.SINGLE,
    winnerPoints = 1,
  } = {},
  rng = Math.random
) {
  const cleaned = cleanNames(names);
  if (!Object.values(LEAGUE_PAIRING).includes(pairing)) throw new Error('Unknown pairing method.');
  if (![1, 2, 3].includes(winnerPoints)) throw new Error('Winner points must be 1, 2 or 3.');

  const schedule = leagueScheduleSummary(cleaned.length, pairing, cycles);

  const players = cleaned.map((name) => ({ id: uid('league-player'), name }));
  const base = {
    id: uid('league'),
    pairing,
    format,
    requiredGameWins: gamesRequired(format),
    winnerPoints,
    cycles: schedule.cycles,
    roundsPerCycle: schedule.roundsPerCycle,
    totalRounds: schedule.totalRounds,
    estimatedMatches: schedule.estimatedMatches,
    players,
    rounds: [],
    status: 'ongoing',
    currentMatchId: null,
    lastCompletedMatchPlayerIds: [],
    previousWaitingPlayerId: null,
    waitingPriorityPlayerId: null,
    createdAt: Date.now(),
    finishedAt: null,
  };

  if (pairing === LEAGUE_PAIRING.ROUND_ROBIN) {
    base.rounds = Array.from({ length: schedule.totalRounds }, (_, index) => ({
      number: index + 1,
      status: index === 0 ? 'pending' : 'locked',
      waitingPlayerId: null,
      matches: allPairs(players.map((player) => player.id), index + 1, rng),
    }));
  } else {
    base.rounds = [createSwissRound(base, 1, rng)];
    base.previousWaitingPlayerId = base.rounds[0].waitingPlayerId;
    base.waitingPriorityPlayerId = base.rounds[0].waitingPlayerId;
  }
  return base;
}

export function findLeagueMatch(league, matchId) {
  for (const round of league?.rounds || []) {
    const match = round.matches.find((candidate) => candidate.id === matchId);
    if (match) return match;
  }
  return null;
}

export function getActiveLeagueMatch(league) {
  return league?.currentMatchId ? findLeagueMatch(league, league.currentMatchId) : null;
}

function currentPlayableRound(league) {
  return league?.rounds.find((round) => round.status !== 'completed') || null;
}

export function getNextLeagueMatch(league) {
  if (!league || league.status !== 'ongoing') return null;
  const active = getActiveLeagueMatch(league);
  if (active) return active;
  const round = currentPlayableRound(league);
  const pending = round?.matches.filter((match) => match.status === 'pending') || [];
  if (!pending.length) return null;
  const rested = pending.find(
    (match) =>
      !league.lastCompletedMatchPlayerIds.includes(match.playerAId) &&
      !league.lastCompletedMatchPlayerIds.includes(match.playerBId)
  );
  return rested || pending[0];
}

export function activateLeagueMatch(league, matchId) {
  if (league.currentMatchId) return league;
  const target = findLeagueMatch(league, matchId);
  const round = league.rounds.find((candidate) => candidate.matches.some((match) => match.id === matchId));
  if (!target || target.status !== 'pending' || round?.status === 'locked') return league;
  return {
    ...league,
    currentMatchId: matchId,
    rounds: league.rounds.map((item) => ({
      ...item,
      status: item.number === round.number ? 'active' : item.status,
      matches: item.matches.map((match) =>
        match.id === matchId ? { ...match, status: 'active', startedAt: Date.now() } : match
      ),
    })),
  };
}

function advanceLeague(league, rng = Math.random) {
  const activeRound = league.rounds.find((round) => round.status !== 'completed');
  if (!activeRound || activeRound.matches.some((match) => match.status !== 'completed')) return league;

  let updated = {
    ...league,
    rounds: league.rounds.map((round) =>
      round.number === activeRound.number ? { ...round, status: 'completed' } : round
    ),
  };

  if (activeRound.number >= league.totalRounds) {
    return { ...updated, status: 'finished', currentMatchId: null, finishedAt: Date.now() };
  }

  if (league.pairing === LEAGUE_PAIRING.ROUND_ROBIN) {
    updated.rounds = updated.rounds.map((round) =>
      round.number === activeRound.number + 1 ? { ...round, status: 'pending' } : round
    );
    return updated;
  }

  const nextRound = createSwissRound(updated, activeRound.number + 1, rng);
  return {
    ...updated,
    rounds: [...updated.rounds, nextRound],
    previousWaitingPlayerId: nextRound.waitingPlayerId,
    waitingPriorityPlayerId: nextRound.waitingPlayerId,
  };
}

export function recordLeagueGame(league, battle, rng = Math.random) {
  const matchId = battle?.league?.matchId || league?.currentMatchId;
  const match = findLeagueMatch(league, matchId);
  if (!match || match.status !== 'active' || battle?.status !== 'finished') return league;

  const winnerId = battle.winner === 'A' ? match.playerAId : match.playerBId;
  const gameWinsA = match.gameWinsA + (winnerId === match.playerAId ? 1 : 0);
  const gameWinsB = match.gameWinsB + (winnerId === match.playerBId ? 1 : 0);
  const matchFinished =
    gameWinsA >= league.requiredGameWins || gameWinsB >= league.requiredGameWins;
  const game = {
    number: match.games.length + 1,
    winnerId,
    scoreA: battle.scoreA,
    scoreB: battle.scoreB,
    rounds: (battle.rounds || []).map((round) => ({ ...round })),
    finishedAt: battle.finishedAt || Date.now(),
  };

  let updated = {
    ...league,
    currentMatchId: matchFinished ? null : matchId,
    lastCompletedMatchPlayerIds: matchFinished
      ? [match.playerAId, match.playerBId]
      : league.lastCompletedMatchPlayerIds,
    waitingPriorityPlayerId: matchFinished && league.waitingPriorityPlayerId &&
      [match.playerAId, match.playerBId].includes(league.waitingPriorityPlayerId)
      ? null
      : league.waitingPriorityPlayerId,
    rounds: league.rounds.map((round) => ({
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

  if (matchFinished) updated = advanceLeague(updated, rng);
  return updated;
}

export function getLeagueStandings(league) {
  const stats = new Map(
    (league?.players || []).map((player) => [
      player.id,
      {
        playerId: player.id,
        name: player.name,
        rank: 0,
        totalPoints: 0,
        matchesPlayed: 0,
        matchWins: 0,
        matchLosses: 0,
        gameWins: 0,
        gameLosses: 0,
        gameDifferential: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        scoreDifferential: 0,
        waits: 0,
      },
    ])
  );

  for (const round of league?.rounds || []) {
    if (round.waitingPlayerId) {
      const waiting = stats.get(round.waitingPlayerId);
      if (waiting) waiting.waits += 1;
    }
    for (const match of round.matches) {
      const playerA = stats.get(match.playerAId);
      const playerB = stats.get(match.playerBId);
      for (const game of match.games) {
        playerA.pointsFor += game.scoreA;
        playerA.pointsAgainst += game.scoreB;
        playerB.pointsFor += game.scoreB;
        playerB.pointsAgainst += game.scoreA;
        if (game.winnerId === match.playerAId) {
          playerA.gameWins += 1;
          playerB.gameLosses += 1;
        } else {
          playerB.gameWins += 1;
          playerA.gameLosses += 1;
        }
      }
      if (match.status === 'completed') {
        playerA.matchesPlayed += 1;
        playerB.matchesPlayed += 1;
        if (match.winnerId === match.playerAId) {
          playerA.matchWins += 1;
          playerA.totalPoints += league.winnerPoints;
          playerB.matchLosses += 1;
        } else {
          playerB.matchWins += 1;
          playerB.totalPoints += league.winnerPoints;
          playerA.matchLosses += 1;
        }
      }
    }
  }

  const sorted = [...stats.values()]
    .map((row) => ({
      ...row,
      gameDifferential: row.gameWins - row.gameLosses,
      scoreDifferential: row.pointsFor - row.pointsAgainst,
    }))
    .sort(compareStanding);

  let previousKey = null;
  let previousRank = 0;
  return sorted.map((row, index) => {
    const key = standingKey(row).join('|');
    const rank = key === previousKey ? previousRank : index + 1;
    previousKey = key;
    previousRank = rank;
    return { ...row, rank };
  });
}

export function leagueRoundLabel(league, round) {
  if (league?.pairing === LEAGUE_PAIRING.ROUND_ROBIN) return `周期 ${round.number}`;
  const roundsPerCycle = league?.roundsPerCycle || swissRoundsPerCycle(league?.players?.length || 3);
  const cycle = Math.ceil(round.number / roundsPerCycle);
  const smallRound = ((round.number - 1) % roundsPerCycle) + 1;
  return `周期 ${cycle} · 小轮 ${smallRound}/${roundsPerCycle}`;
}
