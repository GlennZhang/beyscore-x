import React, { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  Paper,
  Stack,
  Step,
  StepLabel,
  Stepper,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import LeaderboardIcon from '@mui/icons-material/Leaderboard';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ScheduleIcon from '@mui/icons-material/Schedule';

import { useApp } from '../context/AppContext';
import {
  LEAGUE_FORMAT,
  LEAGUE_PAIRING,
  findLeagueMatch,
  getLeagueStandings,
  getNextLeagueMatch,
  leagueScheduleSummary,
  leagueRoundLabel,
} from '../lib/league';

const GREEN = '#35E63B';
const FONT = '"Orbitron", "Chakra Petch", sans-serif';

function Counter({ label, value, min, max, onChange, suffix = '' }) {
  return (
    <Paper sx={{ p: 2, textAlign: 'center' }}>
      <Typography color="text.secondary">{label}</Typography>
      <Stack direction="row" justifyContent="center" alignItems="center" spacing={2.5} sx={{ mt: 2 }}>
        <Button aria-label={`减少${label}`} variant="outlined" disabled={value <= min} onClick={() => onChange(value - 1)} sx={{ minWidth: 56, minHeight: 48 }}>−</Button>
        <Typography aria-label={`${value}${suffix}`} sx={{ minWidth: 80, fontFamily: FONT, fontSize: '2.8rem', fontWeight: 900, color: GREEN, lineHeight: 1 }}>{value}</Typography>
        <Button aria-label={`增加${label}`} variant="outlined" disabled={value >= max} onClick={() => onChange(value + 1)} sx={{ minWidth: 56, minHeight: 48 }}>＋</Button>
      </Stack>
    </Paper>
  );
}

function LeagueSetup({ onBack }) {
  const { createLeague } = useApp();
  const [step, setStep] = useState(0);
  const [count, setCount] = useState(4);
  const [names, setNames] = useState(() => Array.from({ length: 4 }, (_, index) => `玩家 ${index + 1}`));
  const [pairing, setPairing] = useState(LEAGUE_PAIRING.ROUND_ROBIN);
  const [cycles, setCycles] = useState(1);
  const [format, setFormat] = useState(LEAGUE_FORMAT.SINGLE);
  const [winnerPoints, setWinnerPoints] = useState(1);
  const [error, setError] = useState('');

  const resizeNames = (nextCount) => {
    setCount(nextCount);
    setNames((current) => Array.from(
      { length: nextCount },
      (_, index) => current[index] || `玩家 ${index + 1}`
    ));
  };

  const validateNames = () => {
    const cleaned = names.map((name) => name.trim());
    if (cleaned.some((name) => !name)) return '所有参赛者都需要填写姓名。';
    if (new Set(cleaned.map((name) => name.toLocaleLowerCase())).size !== cleaned.length) {
      return '参赛者姓名不能重复。';
    }
    return '';
  };

  const next = () => {
    if (step === 1) {
      const message = validateNames();
      if (message) {
        setError(message);
        return;
      }
    }
    setError('');
    setStep((value) => Math.min(2, value + 1));
  };

  const submit = () => {
    const message = validateNames();
    if (message) {
      setError(message);
      setStep(1);
      return;
    }
    createLeague(names.map((name) => name.trim()), { pairing, cycles, format, winnerPoints });
  };

  const schedule = leagueScheduleSummary(count, pairing, cycles);

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <IconButton aria-label="返回比赛模式" onClick={step === 0 ? onBack : () => setStep((value) => value - 1)}>
          <ArrowBackIcon />
        </IconButton>
        <Box>
          <Typography sx={{ fontFamily: FONT, fontWeight: 900, fontSize: '1.35rem' }}>创建积分赛</Typography>
          <Typography variant="body2" color="text.secondary">循环赛或瑞士轮 · 3–10 人</Typography>
        </Box>
      </Stack>

      <Stepper activeStep={step} alternativeLabel sx={{ mb: 3 }}>
        {['人数', '姓名', '规则'].map((label) => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
      </Stepper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {step === 0 && (
        <Box>
          <Counter label="参赛人数" value={count} min={3} max={10} onChange={resizeNames} suffix=" 位参赛者" />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, textAlign: 'center' }}>
            积分赛至少 3 人，最多 10 人。
          </Typography>
        </Box>
      )}

      {step === 1 && (
        <Stack spacing={1.5}>
          {names.map((name, index) => (
            <TextField
              key={index}
              label={`参赛者 ${index + 1}`}
              value={name}
              inputProps={{ maxLength: 24 }}
              onChange={(event) => setNames((current) => current.map((value, i) => i === index ? event.target.value : value))}
              fullWidth
            />
          ))}
        </Stack>
      )}

      {step === 2 && (
        <Stack spacing={2}>
          <Box>
            <Typography fontWeight={800} sx={{ mb: 1 }}>配对方式</Typography>
            <ToggleButtonGroup exclusive fullWidth value={pairing} onChange={(event, value) => value && setPairing(value)} aria-label="积分赛配对方式">
              <ToggleButton value={LEAGUE_PAIRING.ROUND_ROBIN} sx={{ minHeight: 84 }}><Box><strong>循环赛</strong><br /><small>每轮所有人互相比赛</small></Box></ToggleButton>
              <ToggleButton value={LEAGUE_PAIRING.SWISS} sx={{ minHeight: 84 }}><Box><strong>瑞士轮</strong><br /><small>按相近积分动态配对</small></Box></ToggleButton>
            </ToggleButtonGroup>
          </Box>

          <Box>
            <Typography fontWeight={800} sx={{ mb: 1 }}>比赛周期</Typography>
            <ToggleButtonGroup exclusive fullWidth value={cycles} onChange={(event, value) => value && setCycles(value)} aria-label="比赛周期数">
              {[1, 2, 3].map((value) => (
                <ToggleButton key={value} value={value} sx={{ minHeight: 62 }}>
                  {value} 个周期
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>

          <Box>
            <Typography fontWeight={800} sx={{ mb: 1 }}>比赛方式</Typography>
            <ToggleButtonGroup exclusive fullWidth value={format} onChange={(event, value) => value && setFormat(value)} aria-label="积分赛比赛方式">
              <ToggleButton value={LEAGUE_FORMAT.SINGLE} sx={{ minHeight: 76 }}><Box><strong>单场</strong><br /><small>先到 4 分</small></Box></ToggleButton>
              <ToggleButton value={LEAGUE_FORMAT.BEST_OF_3} sx={{ minHeight: 76 }}><Box><strong>三场两胜</strong><br /><small>每小场先到 4 分</small></Box></ToggleButton>
            </ToggleButtonGroup>
          </Box>

          <Box>
            <Typography fontWeight={800} sx={{ mb: 1 }}>每场获胜积分</Typography>
            <ToggleButtonGroup exclusive fullWidth value={winnerPoints} onChange={(event, value) => value && setWinnerPoints(value)} aria-label="获胜积分">
              {[1, 2, 3].map((value) => <ToggleButton key={value} value={value} sx={{ minHeight: 56 }}>{value} 分</ToggleButton>)}
            </ToggleButtonGroup>
          </Box>

          <Paper sx={{ p: 2, bgcolor: '#172A19', border: `1px solid ${GREEN}` }}>
            <Typography fontWeight={800}>
              {count} 人 · {cycles} 个比赛周期 · 预计 {schedule.estimatedMatches} 场对阵
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: .5 }}>
              {pairing === LEAGUE_PAIRING.ROUND_ROBIN
                ? `每个周期内任意两位选手都会比赛一次，共 ${schedule.totalRounds} 个完整循环。`
                : `系统自动换算为 ${schedule.totalRounds} 个瑞士小轮（每周期 ${schedule.roundsPerCycle} 小轮）；奇数人数候赛不加分且轮流候赛。`}
            </Typography>
          </Paper>
        </Stack>
      )}

      <Button fullWidth size="large" variant="contained" onClick={step === 2 ? submit : next} sx={{ mt: 3, minHeight: 52, bgcolor: GREEN, color: '#101411', '&:hover': { bgcolor: '#48F04E' } }}>
        {step === 2 ? '创建积分赛' : '下一步'}
      </Button>
    </Box>
  );
}

function LeagueMatchCard({ match, players }) {
  const name = (id) => players.get(id)?.name || '待定';
  const winner = match.winnerId;
  const row = (id, wins) => (
    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ py: .65 }}>
      <Typography noWrap sx={{ maxWidth: 180, fontWeight: winner === id ? 900 : 600, color: winner === id ? GREEN : '#F2F2F2' }}>{name(id)}</Typography>
      <Typography sx={{ fontFamily: FONT, color: winner === id ? GREEN : '#AEB3B7' }}>{wins}</Typography>
    </Stack>
  );
  return (
    <Paper sx={{ p: 1.5, border: match.status === 'active' ? `2px solid ${GREEN}` : '1px solid #35383B', bgcolor: '#1A1C1E' }}>
      {row(match.playerAId, match.gameWinsA)}
      <Divider />
      {row(match.playerBId, match.gameWinsB)}
      <Stack direction="row" justifyContent="space-between" sx={{ mt: 1 }}>
        <Typography variant="caption" color="text.secondary">{match.status === 'completed' ? '已结束' : match.status === 'active' ? '进行中' : '待比赛'}</Typography>
        {match.games.length > 0 && <Typography variant="caption" color="text.secondary">{match.games.length} 小场</Typography>}
      </Stack>
    </Paper>
  );
}

function ScheduleView({ league }) {
  const players = useMemo(() => new Map(league.players.map((player) => [player.id, player])), [league.players]);
  return (
    <Stack spacing={2}>
      {league.rounds.map((round) => (
        <Box key={round.number}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
            <Typography sx={{ fontFamily: FONT, fontWeight: 900, color: round.status === 'locked' ? '#777' : GREEN }}>{leagueRoundLabel(league, round)}</Typography>
            {round.waitingPlayerId && <Chip size="small" label={`${players.get(round.waitingPlayerId)?.name} 候赛 · 0 分`} />}
          </Stack>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 1.25 }}>
            {round.matches.map((match) => <LeagueMatchCard key={match.id} match={match} players={players} />)}
          </Box>
        </Box>
      ))}
    </Stack>
  );
}

function LeagueStandings({ league }) {
  const standings = getLeagueStandings(league);
  return (
    <Box>
      <TableContainer component={Paper} sx={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <Table size="small" aria-label="积分赛统计榜" sx={{ minWidth: 760 }}>
          <TableHead><TableRow>
            <TableCell>排名</TableCell><TableCell>选手</TableCell><TableCell align="center">积分</TableCell><TableCell align="center">比赛胜负</TableCell><TableCell align="center">小场净胜</TableCell><TableCell align="center">累计得分</TableCell><TableCell align="center">净胜分</TableCell><TableCell align="center">候赛</TableCell>
          </TableRow></TableHead>
          <TableBody>
            {standings.map((row) => (
              <TableRow key={row.playerId} sx={{ '& td': { color: league.status === 'finished' && row.rank === 1 ? GREEN : 'inherit' } }}>
                <TableCell>{row.rank}</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>{row.name}</TableCell>
                <TableCell align="center" sx={{ fontFamily: FONT, fontWeight: 900 }}>{row.totalPoints}</TableCell>
                <TableCell align="center">{row.matchWins}–{row.matchLosses}</TableCell>
                <TableCell align="center">{row.gameDifferential >= 0 ? '+' : ''}{row.gameDifferential}</TableCell>
                <TableCell align="center">{row.pointsFor}–{row.pointsAgainst}</TableCell>
                <TableCell align="center">{row.scoreDifferential >= 0 ? '+' : ''}{row.scoreDifferential}</TableCell>
                <TableCell align="center">{row.waits}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
        排名顺序：总积分 → 比赛胜场 → 小场净胜 → 累计净胜分；完全相同则并列。
      </Typography>
    </Box>
  );
}

function LeagueDashboard() {
  const { league, startNextLeagueMatch, resetLeague } = useApp();
  const [tab, setTab] = useState(0);
  const nextMatch = getNextLeagueMatch(league);
  const players = useMemo(() => new Map(league.players.map((player) => [player.id, player])), [league.players]);
  const standings = getLeagueStandings(league);
  const leaders = standings.filter((row) => row.rank === 1);
  const playerName = (id) => players.get(id)?.name || '待定';
  const currentRound = league.rounds.find((round) => round.status !== 'completed') || league.rounds.at(-1);

  const abandon = () => {
    if (window.confirm('确定结束并清除当前积分赛吗？')) resetLeague();
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
        <Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <LeaderboardIcon sx={{ color: GREEN }} />
            <Typography sx={{ fontFamily: FONT, fontWeight: 900, fontSize: '1.4rem' }}>积分赛</Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: .5 }}>
            {league.players.length} 人 · {league.pairing === LEAGUE_PAIRING.ROUND_ROBIN ? '循环赛' : '瑞士轮'} · {league.cycles || league.totalRounds} 周期 · 胜者 +{league.winnerPoints} 分 · {league.format === LEAGUE_FORMAT.BEST_OF_3 ? '三场两胜' : '单场'}
          </Typography>
        </Box>
        <IconButton aria-label="清除积分赛" onClick={abandon}><DeleteOutlineIcon /></IconButton>
      </Stack>

      {league.status === 'finished' ? (
        <Paper sx={{ p: 3, mb: 2, textAlign: 'center', bgcolor: '#173D1B', border: `2px solid ${GREEN}` }}>
          <EmojiEventsIcon sx={{ color: GREEN, fontSize: 50 }} />
          <Typography color="text.secondary">积分赛第一名{leaders.length > 1 ? '（并列）' : ''}</Typography>
          <Typography sx={{ fontFamily: FONT, fontWeight: 900, fontSize: 'clamp(1.5rem, 7vw, 2.2rem)', color: GREEN }}>{leaders.map((row) => row.name).join(' · ')}</Typography>
        </Paper>
      ) : nextMatch ? (
        <Paper sx={{ p: 2.5, mb: 2, border: `2px solid ${GREEN}`, bgcolor: '#171A18' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="overline" sx={{ color: GREEN, letterSpacing: 2 }}>下一场</Typography>
              <Typography sx={{ fontWeight: 900, fontSize: '1.2rem' }}>
                {playerName(nextMatch.playerAId)} <Box component="span" sx={{ color: 'text.secondary', mx: .5 }}>VS</Box> {playerName(nextMatch.playerBId)}
              </Typography>
              {league.requiredGameWins > 1 && <Typography sx={{ mt: .5, color: 'text.secondary' }}>小场 {nextMatch.gameWinsA}–{nextMatch.gameWinsB} · GAME {nextMatch.games.length + 1}</Typography>}
            </Box>
            <Chip label={leagueRoundLabel(league, currentRound)} sx={{ bgcolor: '#263029', flexShrink: 0 }} />
          </Stack>
          <Button fullWidth size="large" variant="contained" startIcon={<PlayArrowIcon />} onClick={startNextLeagueMatch} sx={{ mt: 2, minHeight: 52, bgcolor: GREEN, color: '#101411', '&:hover': { bgcolor: '#48F04E' } }}>
            {nextMatch.status === 'active' ? '继续当前对局' : '开始下一场'}
          </Button>
        </Paper>
      ) : null}

      <Tabs value={tab} onChange={(event, value) => setTab(value)} variant="fullWidth" sx={{ mb: 2 }}>
        <Tab icon={<ScheduleIcon />} iconPosition="start" label="赛程" />
        <Tab icon={<LeaderboardIcon />} iconPosition="start" label="统计榜" />
      </Tabs>
      {tab === 0 ? <ScheduleView league={league} /> : <LeagueStandings league={league} />}
    </Box>
  );
}

export function LeagueGameResult({ battle, league, onContinue }) {
  const match = findLeagueMatch(league, battle.league.matchId);
  const projectedWinsA = match.gameWinsA + (battle.winner === 'A' ? 1 : 0);
  const projectedWinsB = match.gameWinsB + (battle.winner === 'B' ? 1 : 0);
  const matchFinished = projectedWinsA >= league.requiredGameWins || projectedWinsB >= league.requiredGameWins;
  const winnerName = battle.winner === 'A' ? battle.playerA.name : battle.playerB.name;
  return (
    <Box sx={{ textAlign: 'center', pt: 2 }}>
      <Typography sx={{ color: GREEN, fontFamily: FONT, fontWeight: 900 }}>{matchFinished ? `MATCH WINNER · +${league.winnerPoints} 分` : `GAME ${match.games.length + 1} WINNER`}</Typography>
      <Typography sx={{ fontFamily: FONT, fontWeight: 900, fontSize: 'clamp(2rem, 9vw, 4rem)', my: 1 }}>{winnerName}</Typography>
      <Typography sx={{ fontFamily: FONT, fontSize: '1.4rem', color: 'text.secondary' }}>本场 {battle.scoreA}–{battle.scoreB}</Typography>
      {league.requiredGameWins > 1 && <Typography sx={{ fontFamily: FONT, fontSize: '2.4rem', color: GREEN, my: 2 }}>{projectedWinsA}–{projectedWinsB}</Typography>}
      <Button fullWidth size="large" variant="contained" onClick={onContinue} sx={{ minHeight: 54, mt: 2, bgcolor: GREEN, color: '#101411', '&:hover': { bgcolor: '#48F04E' } }}>
        {matchFinished ? '确认结果并返回积分赛' : '确认并进入下一小场'}
      </Button>
    </Box>
  );
}

export function leagueSeriesLabel(league, battle) {
  if (!league || !battle?.league) return '';
  const match = findLeagueMatch(league, battle.league.matchId);
  const round = league.rounds.find((candidate) => candidate.matches.some((item) => item.id === match?.id));
  if (!match || !round) return '';
  const base = `积分赛 · ${leagueRoundLabel(league, round)}`;
  return league.requiredGameWins > 1
    ? `${base} · 小场 ${match.gameWinsA}–${match.gameWinsB} · GAME ${match.games.length + 1}`
    : `${base} · 胜者 +${league.winnerPoints} 分`;
}

export default function PointsLeaguePage({ onBack }) {
  const { league } = useApp();
  return league ? <LeagueDashboard /> : <LeagueSetup onBack={onBack} />;
}
