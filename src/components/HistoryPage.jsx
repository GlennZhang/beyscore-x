import React, { useMemo, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  Chip,
  Stack,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import HistoryIcon from '@mui/icons-material/History';
import BarChartIcon from '@mui/icons-material/BarChart';

import { useApp } from '../context/AppContext';
import { FINISH_META, WIN_SCORE } from '../lib/scoring';

function fmtDateTime(ts) {
  const d = new Date(ts);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Aggregate player win/loss records from history. */
function computeLeaderboard(history) {
  const map = new Map();
  history.forEach((h) => {
    ['A', 'B'].forEach((side) => {
      const name = side === 'A' ? h.playerA.name : h.playerB.name;
      if (!name) return;
      const won = h.winner === side;
      const rec =
        map.get(name) || { name, wins: 0, losses: 0, battles: 0 };
      rec.battles += 1;
      if (won) rec.wins += 1;
      else rec.losses += 1;
      map.set(name, rec);
    });
  });
  const arr = Array.from(map.values()).map((r) => ({
    ...r,
    winRate: r.battles ? r.wins / r.battles : 0,
  }));
  arr.sort((a, b) => b.wins - a.wins || b.winRate - a.winRate);
  return arr;
}

/** Aggregate finish-type distribution across all history rounds. */
function computeFinishStats(history) {
  const counts = {};
  let total = 0;
  history.forEach((h) => {
    (h.rounds || []).forEach((r) => {
      counts[r.finishType] = (counts[r.finishType] || 0) + 1;
      total += 1;
    });
  });
  return { counts, total };
}

function HistoryList({ history }) {
  if (history.length === 0) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }} elevation={1}>
        <Typography color="grey.500">还没有对战记录，去「对战」里打完一局吧。</Typography>
      </Paper>
    );
  }
  return (
    <Stack spacing={1.5}>
      {history.map((h) => {
        const winnerName =
          h.winner === 'A' ? h.playerA.name : h.winner === 'B' ? h.playerB.name : '平局';
        return (
          <Accordion key={h.id} disableGutters elevation={2}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ width: '100%' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="subtitle2" fontWeight={700}>
                    {h.playerA.name} <Box component="span" color="grey.500">{h.scoreA}</Box>
                    {' : '}
                    <Box component="span" color="grey.500">{h.scoreB}</Box> {h.playerB.name}
                  </Typography>
                  <Chip
                    size="small"
                    color={h.winner ? 'secondary' : 'default'}
                    label={h.winner ? `${winnerName} 胜` : '平局'}
                  />
                </Box>
                <Typography variant="caption" color="grey.500">
                  {fmtDateTime(h.finishedAt || h.createdAt)} · 共 {h.rounds.length} 局
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <List dense>
                {h.rounds.map((r) => {
                  const meta = FINISH_META[r.finishType];
                  const who =
                    r.winner === 'A' ? 'A 得分' : r.winner === 'B' ? 'B 得分' : '平局';
                  return (
                    <ListItem key={r.index} divider>
                      <ListItemText
                        primary={`第 ${r.index} 局 · ${who}`}
                        secondary={`${meta.label} · ${meta.zh}`}
                      />
                      <Chip
                        size="small"
                        label={meta.zh}
                        sx={{ bgcolor: meta.color, color: '#1A1A1A' }}
                      />
                    </ListItem>
                  );
                })}
              </List>
            </AccordionDetails>
          </Accordion>
        );
      })}
    </Stack>
  );
}

function Leaderboard({ board }) {
  if (board.length === 0) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }} elevation={1}>
        <Typography color="grey.500">暂无数据。</Typography>
      </Paper>
    );
  }
  return (
    <Stack spacing={1}>
      {board.map((r, i) => (
        <Paper key={r.name} sx={{ p: 1.5 }} elevation={1}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar
              sx={{
                width: 36,
                height: 36,
                bgcolor: i === 0 ? 'secondary.main' : 'primary.main',
                fontWeight: 800,
              }}
            >
              {i + 1}
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle2" fontWeight={700}>
                {r.name}
              </Typography>
              <Typography variant="caption" color="grey.500">
                {r.wins} 胜 / {r.losses} 负 · 胜率 {(r.winRate * 100).toFixed(0)}%
              </Typography>
              <LinearProgress
                variant="determinate"
                value={r.winRate * 100}
                sx={{ mt: 0.5, height: 6, borderRadius: 3 }}
                color={i === 0 ? 'secondary' : 'primary'}
              />
            </Box>
            {i === 0 && <EmojiEventsIcon color="secondary" />}
          </Box>
        </Paper>
      ))}
    </Stack>
  );
}

function Stats({ history, board, finishStats }) {
  const totalBattles = history.length;
  const totalRounds = history.reduce((s, h) => s + (h.rounds?.length || 0), 0);
  const totalPlayers = board.length;
  const maxFinish = Math.max(1, ...Object.values(finishStats.counts));

  return (
    <Box>
      <Stack direction="row" spacing={1.5} sx={{ mb: 2 }}>
        <Paper sx={{ p: 1.5, flex: 1, textAlign: 'center' }} elevation={1}>
          <Typography variant="h6" fontWeight={900}>{totalBattles}</Typography>
          <Typography variant="caption" color="grey.500">总对战</Typography>
        </Paper>
        <Paper sx={{ p: 1.5, flex: 1, textAlign: 'center' }} elevation={1}>
          <Typography variant="h6" fontWeight={900}>{totalRounds}</Typography>
          <Typography variant="caption" color="grey.500">总回合</Typography>
        </Paper>
        <Paper sx={{ p: 1.5, flex: 1, textAlign: 'center' }} elevation={1}>
          <Typography variant="h6" fontWeight={900}>{totalPlayers}</Typography>
          <Typography variant="caption" color="grey.500">参战玩家</Typography>
        </Paper>
      </Stack>

      <Typography variant="subtitle1" fontWeight={700} gutterBottom>
        终结方式分布（共 {finishStats.total} 次）
      </Typography>
      {finishStats.total === 0 ? (
        <Typography variant="body2" color="grey.500">暂无数据。</Typography>
      ) : (
        <Stack spacing={1}>
          {Object.entries(finishStats.counts).map(([type, count]) => {
            const meta = FINISH_META[type];
            const pct = Math.round((count / finishStats.total) * 100);
            const widthPct = Math.round((count / maxFinish) * 100);
            return (
              <Box key={type}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">
                    {meta.label} · {meta.zh}
                  </Typography>
                  <Typography variant="body2" color="grey.400">
                    {count}（{pct}%）
                  </Typography>
                </Box>
                <Box
                  sx={{
                    height: 6,
                    borderRadius: 3,
                    bgcolor: 'rgba(255,255,255,0.08)',
                    overflow: 'hidden',
                  }}
                >
                  <Box
                    sx={{
                      height: '100%',
                      borderRadius: 3,
                      width: `${widthPct}%`,
                      background: meta.color,
                    }}
                  />
                </Box>
              </Box>
            );
          })}
        </Stack>
      )}
      <Typography variant="caption" color="grey.600" sx={{ display: 'block', mt: 2 }}>
        胜利规则：先到 {WIN_SCORE} 分即获胜。
      </Typography>
    </Box>
  );
}

/** History & statistics page. */
export default function HistoryPage() {
  const { history } = useApp();
  const [tab, setTab] = useState(0);

  const board = useMemo(() => computeLeaderboard(history), [history]);
  const finishStats = useMemo(() => computeFinishStats(history), [history]);

  const tabs = [
    { key: 'list', label: '历史', icon: <HistoryIcon /> },
    { key: 'board', label: '排行榜', icon: <EmojiEventsIcon /> },
    { key: 'stats', label: '统计', icon: <BarChartIcon /> },
  ];

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        对战历史
      </Typography>
      <Tabs
        value={tab}
        onChange={(e, v) => setTab(v)}
        variant="fullWidth"
        textColor="primary"
        indicatorColor="primary"
        sx={{ mb: 2 }}
      >
        {tabs.map((t, i) => (
          <Tab key={t.key} icon={t.icon} label={t.label} />
        ))}
      </Tabs>

      {tab === 0 && <HistoryList history={history} />}
      {tab === 1 && <Leaderboard board={board} />}
      {tab === 2 && (
        <Stats history={history} board={board} finishStats={finishStats} />
      )}
    </Box>
  );
}
