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
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import BoltIcon from '@mui/icons-material/Bolt';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import LeaderboardIcon from '@mui/icons-material/Leaderboard';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';

import { useApp } from '../context/AppContext';
import {
  TOURNAMENT_FORMAT,
  findTournamentMatch,
  getNextTournamentMatch,
  getTournamentStandings,
  tournamentRoundLabel,
} from '../lib/tournament';

const GREEN = '#35E63B';
const FONT = '"Orbitron", "Chakra Petch", sans-serif';

function ModeCard({ title, subtitle, icon, onClick, accent = false }) {
  return (
    <Paper
      component="button"
      type="button"
      onClick={onClick}
      sx={{
        width: '100%',
        minHeight: 150,
        p: 2.5,
        border: `2px solid ${accent ? GREEN : '#3D4145'}`,
        bgcolor: accent ? '#173D1B' : '#1B1D1F',
        color: '#fff',
        textAlign: 'left',
        cursor: 'pointer',
        touchAction: 'manipulation',
        clipPath: 'polygon(0 0, 93% 0, 100% 22%, 100% 100%, 7% 100%, 0 78%)',
        '&:active': { transform: 'scale(.985)' },
      }}
    >
      <Box sx={{ color: GREEN, mb: 1 }}>{icon}</Box>
      <Typography sx={{ fontFamily: FONT, fontWeight: 900, fontSize: '1.35rem' }}>
        {title}
      </Typography>
      <Typography sx={{ mt: .75, color: '#C6CACD', lineHeight: 1.45 }}>
        {subtitle}
      </Typography>
    </Paper>
  );
}

export function BattleModeSelector({ onQuick, onTournament, onLeague }) {
  return (
    <Box sx={{ pt: 1 }}>
      <Typography sx={{ fontFamily: FONT, fontWeight: 900, fontSize: '1.6rem' }}>
        比赛模式
      </Typography>
      <Typography sx={{ color: 'text.secondary', mt: .5, mb: 2.5 }}>
        选择快速双人计分、单败淘汰赛，或 3–10 人积分赛。
      </Typography>
      <Stack spacing={2}>
        <ModeCard
          title="快速比赛"
          subtitle="原有双人模式，双方准备后直接进行先到 4 分的比赛。"
          icon={<BoltIcon fontSize="large" />}
          onClick={onQuick}
        />
        <ModeCard
          title="淘汰赛"
          subtitle="随机对阵、自动轮空与晋级，可选择单场制或三场两胜制。"
          icon={<AccountTreeIcon fontSize="large" />}
          onClick={onTournament}
          accent
        />
        <ModeCard
          title="积分赛"
          subtitle="支持循环赛与瑞士轮、自选轮数和胜者积分，自动生成实时统计榜。"
          icon={<LeaderboardIcon fontSize="large" />}
          onClick={onLeague}
        />
      </Stack>
    </Box>
  );
}

function TournamentSetup({ onBack }) {
  const { createTournament } = useApp();
  const [step, setStep] = useState(0);
  const [count, setCount] = useState(4);
  const [names, setNames] = useState(() => Array.from({ length: 4 }, (_, i) => `玩家 ${i + 1}`));
  const [format, setFormat] = useState(TOURNAMENT_FORMAT.SINGLE);
  const [error, setError] = useState('');

  const resizeNames = (nextCount) => {
    setCount(nextCount);
    setNames((current) =>
      Array.from({ length: nextCount }, (_, index) => current[index] || `玩家 ${index + 1}`)
    );
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
    createTournament(names.map((name) => name.trim()), format);
  };

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <IconButton aria-label="返回比赛模式" onClick={step === 0 ? onBack : () => setStep((v) => v - 1)}>
          <ArrowBackIcon />
        </IconButton>
        <Box>
          <Typography sx={{ fontFamily: FONT, fontWeight: 900, fontSize: '1.35rem' }}>
            创建淘汰赛
          </Typography>
          <Typography variant="body2" color="text.secondary">
            随机单败赛程
          </Typography>
        </Box>
      </Stack>

      <Stepper activeStep={step} alternativeLabel sx={{ mb: 3 }}>
        {['人数', '姓名', '赛制'].map((label) => (
          <Step key={label}><StepLabel>{label}</StepLabel></Step>
        ))}
      </Stepper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {step === 0 && (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="text.secondary">参赛人数</Typography>
          <Stack direction="row" justifyContent="center" alignItems="center" spacing={3} sx={{ my: 3 }}>
            <Button aria-label="减少参赛人数" variant="outlined" disabled={count <= 2} onClick={() => resizeNames(count - 1)} sx={{ minWidth: 56, minHeight: 48 }}>−</Button>
            <Typography aria-label={`${count} 位参赛者`} sx={{ fontFamily: FONT, fontSize: '3.5rem', fontWeight: 900, color: GREEN, lineHeight: 1 }}>{count}</Typography>
            <Button aria-label="增加参赛人数" variant="outlined" disabled={count >= 10} onClick={() => resizeNames(count + 1)} sx={{ minWidth: 56, minHeight: 48 }}>＋</Button>
          </Stack>
          <Typography variant="body2" color="text.secondary">支持 2 到 10 人；非 2、4、8 人时自动安排轮空。</Typography>
        </Paper>
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
        <Box>
          <ToggleButtonGroup
            exclusive
            fullWidth
            value={format}
            onChange={(event, value) => value && setFormat(value)}
            aria-label="淘汰赛赛制"
          >
            <ToggleButton value={TOURNAMENT_FORMAT.SINGLE} sx={{ minHeight: 96 }}>
              <Box><strong>单场制</strong><br /><small>先到 4 分者晋级</small></Box>
            </ToggleButton>
            <ToggleButton value={TOURNAMENT_FORMAT.BEST_OF_3} sx={{ minHeight: 96 }}>
              <Box><strong>三场两胜</strong><br /><small>每小场先到 4 分</small></Box>
            </ToggleButton>
          </ToggleButtonGroup>
          <Paper sx={{ mt: 2, p: 2, bgcolor: '#172A19', border: `1px solid ${GREEN}` }}>
            <Typography fontWeight={800}>{count} 位参赛者</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: .5 }}>
              系统将随机打乱姓名并生成单败赛程；优先避免选手连续出场。
            </Typography>
          </Paper>
        </Box>
      )}

      <Button fullWidth size="large" variant="contained" onClick={step === 2 ? submit : next} sx={{ mt: 3, minHeight: 52, bgcolor: GREEN, color: '#101411', '&:hover': { bgcolor: '#48F04E' } }}>
        {step === 2 ? '随机抽签并创建赛程' : '下一步'}
      </Button>
    </Box>
  );
}

function MatchCard({ match, players }) {
  const name = (id) => players.get(id)?.name || '待定';
  const winner = match.winnerId;
  const line = (id, wins) => (
    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ py: .65 }}>
      <Typography noWrap sx={{ maxWidth: 145, fontWeight: winner === id ? 900 : 600, color: winner === id ? GREEN : '#F2F2F2' }}>
        {name(id)}
      </Typography>
      <Typography sx={{ fontFamily: FONT, color: winner === id ? GREEN : '#AEB3B7' }}>{wins}</Typography>
    </Stack>
  );

  return (
    <Paper sx={{ p: 1.5, minWidth: 210, border: match.status === 'active' ? `2px solid ${GREEN}` : '1px solid #35383B', bgcolor: '#1A1C1E' }}>
      {line(match.playerAId, match.gameWinsA)}
      <Divider />
      {line(match.playerBId, match.gameWinsB)}
      <Stack direction="row" justifyContent="space-between" sx={{ mt: 1 }}>
        <Typography variant="caption" color="text.secondary">
          {match.status === 'bye' ? '轮空晋级' : match.status === 'completed' ? '已结束' : match.status === 'active' ? '进行中' : '待比赛'}
        </Typography>
        {match.games.length > 0 && <Typography variant="caption" color="text.secondary">{match.games.length} 小场</Typography>}
      </Stack>
    </Paper>
  );
}

function BracketView({ tournament }) {
  const players = useMemo(() => new Map(tournament.players.map((player) => [player.id, player])), [tournament.players]);
  return (
    <Box sx={{ overflowX: 'auto', pb: 1, WebkitOverflowScrolling: 'touch' }}>
      <Box sx={{ display: 'grid', gridAutoFlow: 'column', gridAutoColumns: 'minmax(220px, 1fr)', gap: 2, minWidth: 'max-content' }}>
        {tournament.rounds.map((round) => (
          <Box key={round.number} sx={{ minWidth: 220 }}>
            <Typography sx={{ fontFamily: FONT, fontWeight: 900, color: GREEN, mb: 1.25 }}>
              {tournamentRoundLabel(round)}
            </Typography>
            <Stack spacing={1.5} justifyContent="space-around" sx={{ minHeight: 120 }}>
              {round.matches.map((match) => <MatchCard key={match.id} match={match} players={players} />)}
            </Stack>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

function StandingsView({ tournament }) {
  const standings = getTournamentStandings(tournament);
  return (
    <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
      <Table size="small" aria-label="淘汰赛统计榜" sx={{ minWidth: 620 }}>
        <TableHead>
          <TableRow>
            <TableCell>排名</TableCell><TableCell>选手</TableCell><TableCell align="center">比赛胜负</TableCell><TableCell align="center">小场胜负</TableCell><TableCell align="center">累计得分</TableCell><TableCell align="center">净胜分</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {standings.map((row, index) => (
            <TableRow key={row.playerId} sx={{ '& td': { color: row.playerId === tournament.championId ? GREEN : 'inherit' } }}>
              <TableCell>{row.playerId === tournament.championId ? '冠军' : index + 1}</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>{row.name}</TableCell>
              <TableCell align="center">{row.matchWins}–{row.matchLosses}</TableCell>
              <TableCell align="center">{row.gameWins}–{row.gameLosses}</TableCell>
              <TableCell align="center">{row.pointsFor}–{row.pointsAgainst}</TableCell>
              <TableCell align="center">{row.pointsFor - row.pointsAgainst >= 0 ? '+' : ''}{row.pointsFor - row.pointsAgainst}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function TournamentDashboard() {
  const { tournament, startNextTournamentMatch, resetTournament } = useApp();
  const [tab, setTab] = useState(0);
  const nextMatch = getNextTournamentMatch(tournament);
  const players = useMemo(() => new Map(tournament.players.map((player) => [player.id, player])), [tournament.players]);
  const playerName = (id) => players.get(id)?.name || '待定';
  const champion = players.get(tournament.championId);

  const abandon = () => {
    if (window.confirm('确定结束并清除当前淘汰赛吗？')) resetTournament();
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
        <Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <AccountTreeIcon sx={{ color: GREEN }} />
            <Typography sx={{ fontFamily: FONT, fontWeight: 900, fontSize: '1.4rem' }}>淘汰赛</Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: .5 }}>
            {tournament.players.length} 人 · {tournament.format === TOURNAMENT_FORMAT.BEST_OF_3 ? '三场两胜制' : '单场制'}
          </Typography>
        </Box>
        <IconButton aria-label="清除淘汰赛" onClick={abandon}><DeleteOutlineIcon /></IconButton>
      </Stack>

      {tournament.status === 'finished' ? (
        <Paper sx={{ p: 3, mb: 2, textAlign: 'center', bgcolor: '#173D1B', border: `2px solid ${GREEN}` }}>
          <EmojiEventsIcon sx={{ color: GREEN, fontSize: 52 }} />
          <Typography color="text.secondary">冠军</Typography>
          <Typography sx={{ fontFamily: FONT, fontWeight: 900, fontSize: '2rem', color: GREEN }}>{champion?.name}</Typography>
        </Paper>
      ) : nextMatch ? (
        <Paper sx={{ p: 2.5, mb: 2, border: `2px solid ${GREEN}`, bgcolor: '#171A18' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="overline" sx={{ color: GREEN, letterSpacing: 2 }}>下一场</Typography>
              <Typography sx={{ fontWeight: 900, fontSize: '1.25rem' }}>
                {playerName(nextMatch.playerAId)} <Box component="span" sx={{ color: 'text.secondary', mx: .75 }}>VS</Box> {playerName(nextMatch.playerBId)}
              </Typography>
              {tournament.requiredGameWins > 1 && (
                <Typography sx={{ mt: .5, color: 'text.secondary' }}>小场 {nextMatch.gameWinsA}–{nextMatch.gameWinsB} · 第 {nextMatch.games.length + 1} 场</Typography>
              )}
            </Box>
            <Chip label={tournamentRoundLabel(tournament.rounds.at(-1))} sx={{ bgcolor: '#263029' }} />
          </Stack>
          <Button fullWidth size="large" variant="contained" startIcon={<PlayArrowIcon />} onClick={startNextTournamentMatch} sx={{ mt: 2, minHeight: 52, bgcolor: GREEN, color: '#101411', '&:hover': { bgcolor: '#48F04E' } }}>
            {nextMatch.status === 'active' ? '继续当前对局' : '开始下一场'}
          </Button>
        </Paper>
      ) : null}

      <Tabs value={tab} onChange={(event, value) => setTab(value)} variant="fullWidth" sx={{ mb: 2 }}>
        <Tab icon={<AccountTreeIcon />} iconPosition="start" label="赛程" />
        <Tab icon={<LeaderboardIcon />} iconPosition="start" label="统计榜" />
      </Tabs>
      {tab === 0 ? <BracketView tournament={tournament} /> : <StandingsView tournament={tournament} />}
    </Box>
  );
}

export function TournamentGameResult({ battle, tournament, onContinue }) {
  const match = findTournamentMatch(tournament, battle.tournament.matchId);
  const projectedWinsA = match.gameWinsA + (battle.winner === 'A' ? 1 : 0);
  const projectedWinsB = match.gameWinsB + (battle.winner === 'B' ? 1 : 0);
  const matchFinished = projectedWinsA >= tournament.requiredGameWins || projectedWinsB >= tournament.requiredGameWins;
  const winnerName = battle.winner === 'A' ? battle.playerA.name : battle.playerB.name;

  return (
    <Box sx={{ textAlign: 'center', pt: 2 }}>
      <Typography sx={{ color: GREEN, fontFamily: FONT, fontWeight: 900 }}>{matchFinished ? 'MATCH WINNER' : `GAME ${match.games.length + 1} WINNER`}</Typography>
      <Typography sx={{ fontFamily: FONT, fontWeight: 900, fontSize: 'clamp(2rem, 9vw, 4rem)', my: 1 }}>{winnerName}</Typography>
      <Typography sx={{ fontFamily: FONT, fontSize: '1.4rem', color: 'text.secondary' }}>本场 {battle.scoreA}–{battle.scoreB}</Typography>
      {tournament.requiredGameWins > 1 && <Typography sx={{ fontFamily: FONT, fontSize: '2.4rem', color: GREEN, my: 2 }}>{projectedWinsA}–{projectedWinsB}</Typography>}
      <Button fullWidth size="large" variant="contained" onClick={onContinue} sx={{ minHeight: 54, mt: 2, bgcolor: GREEN, color: '#101411', '&:hover': { bgcolor: '#48F04E' } }}>
        {matchFinished ? '确认结果并返回赛程' : '确认并进入下一小场'}
      </Button>
    </Box>
  );
}

export function tournamentSeriesLabel(tournament, battle) {
  if (!tournament || !battle?.tournament) return '';
  const match = findTournamentMatch(tournament, battle.tournament.matchId);
  if (!match) return '';
  return tournament.requiredGameWins > 1
    ? `淘汰赛 · 小场 ${match.gameWinsA}–${match.gameWinsB} · GAME ${match.games.length + 1}`
    : `淘汰赛 · ${tournamentRoundLabel(tournament.rounds.find((round) => round.matches.some((item) => item.id === match.id)))}`;
}

export default function TournamentPage({ onBack }) {
  const { tournament } = useApp();
  return tournament ? <TournamentDashboard /> : <TournamentSetup onBack={onBack} />;
}
