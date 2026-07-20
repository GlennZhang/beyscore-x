import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  FormControlLabel,
  Switch,
  List,
  ListItem,
  ListItemText,
  Divider,
  Chip,
  Stack,
  Alert,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ReplayIcon from '@mui/icons-material/Replay';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';

import { useApp } from '../context/AppContext';
import {
  WIN_SCORE,
  FINISH,
  FINISH_META,
  battleSummary,
} from '../lib/scoring';
import Countdown from './Countdown';
import countdownAudioUrl from '../../data/bgm.MP3?url';
import TournamentPage, {
  BattleModeSelector,
  TournamentGameResult,
  tournamentSeriesLabel,
} from './TournamentPage';
import PointsLeaguePage, {
  LeagueGameResult,
  leagueSeriesLabel,
} from './PointsLeaguePage';

/** Tech / wide font used across the battle-mode UI. */
const FONT = '"Orbitron", "Chakra Petch", sans-serif';
const GREEN = '#35E63B';

function requestLandscapeOrientation() {
  try {
    const result = window.screen?.orientation?.lock?.('landscape');
    result?.catch?.(() => {
      // Safari browser tabs commonly reject orientation locking. CSS provides
      // a rotated landscape canvas there, while installed PWAs use the manifest.
    });
  } catch {
    // Orientation locking is a progressive enhancement only.
  }
}

function fmtTime(ts) {
  const d = new Date(ts);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}`;
}

// ---------------------------------------------------------------------------
// Small shared visual primitives
// ---------------------------------------------------------------------------

/** Gray trapezoid / polygon button (平手, 重賽, 返回, 離開...). */
function Trapezoid({ children, onClick, color = '#4a4a4a', sx = {} }) {
  return (
    <Box
      onClick={onClick}
      role="button"
      sx={{
        clipPath: 'polygon(12% 0, 88% 0, 100% 100%, 0 100%)',
        bgcolor: color,
        color: '#fff',
        fontWeight: 700,
        px: 4,
        py: 1,
        cursor: 'pointer',
        userSelect: 'none',
        textAlign: 'center',
        letterSpacing: 2,
        '&:active': { bgcolor: '#5a5a5a' },
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}

/** White trapezoid name tag with a green rim. */
function NameTag({ name, large = false }) {
  return (
    <Box
      sx={{
        display: 'inline-block',
        maxWidth: '100%',
        clipPath: 'polygon(8% 0, 92% 0, 100% 100%, 0 100%)',
        bgcolor: GREEN,
        p: '2px',
      }}
    >
      <Box
        sx={{
          clipPath: 'polygon(10% 0, 90% 0, 100% 100%, 0 100%)',
          bgcolor: '#fff',
          px: large ? { xs: 1.4, sm: 2.5 } : 1.5,
          py: large ? { xs: 0.7, sm: 1 } : 0.4,
        }}
      >
        <Typography
          noWrap
          sx={{
            color: '#1A1A1A',
            fontWeight: 800,
            fontSize: large ? 'clamp(.9rem, 3.2vmin, 2.2rem)' : 14,
            lineHeight: 1.2,
            maxWidth: large ? 'min(30vw, 320px)' : 150,
          }}
        >
          {name}
        </Typography>
      </Box>
    </Box>
  );
}

/** A CSS triangle (apex points down by default). */
function Tri({ size = 14, rotate = 0, color = '#fff' }) {
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-block',
        width: 0,
        height: 0,
        borderLeft: `${size}px solid transparent`,
        borderRight: `${size}px solid transparent`,
        borderTop: `${size}px solid ${color}`,
        transform: `rotate(${rotate}deg)`,
        lineHeight: 0,
      }}
    />
  );
}

/** "Z" slash icon used as the tap-to-ready hit area. */
function ZIcon({ color = '#fff' }) {
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" aria-hidden>
      <path
        d="M10 16 H46 L10 40 H46"
        stroke={color}
        strokeWidth="6"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Setup form (create a new battle)
// ---------------------------------------------------------------------------
function SetupForm({ onStart, onBack }) {
  const { teams, allCombos } = useApp();
  const [nameA, setNameA] = useState('');
  const [comboA, setComboA] = useState('');
  const [nameB, setNameB] = useState('');
  const [comboB, setComboB] = useState('');
  const [randomPos, setRandomPos] = useState(true);

  const comboName = (id) => allCombos.find((c) => c.id === id)?.name || '';
  const playerAName = nameA.trim() || comboName(comboA) || '玩家 A';
  const playerBName = nameB.trim() || comboName(comboB) || '玩家 B';

  const submit = () => {
    requestLandscapeOrientation();
    onStart(
      { name: playerAName, comboId: comboA || null },
      { name: playerBName, comboId: comboB || null },
      randomPos
    );
  };

  const renderPlayer = (label, name, setName, combo, setCombo) => (
    <Paper sx={{ p: 2 }} elevation={2}>
      <Typography variant="subtitle1" fontWeight={700} gutterBottom>
        {label}
      </Typography>
      <TextField
        fullWidth
        size="small"
        label="玩家名稱"
        placeholder="留空則用陀螺名"
        value={name}
        onChange={(e) => setName(e.target.value)}
        sx={{ mb: 1.5 }}
      />
      <FormControl fullWidth size="small">
        <InputLabel>選擇陀螺（可選）</InputLabel>
        <Select
          value={combo}
          label="選擇陀螺（可選）"
          onChange={(e) => setCombo(e.target.value)}
        >
          <MenuItem value="">自定義 / 不選擇</MenuItem>
          {teams.map((t) => (
            <Box key={t.id}>
              <Typography
                variant="caption"
                sx={{ px: 2, pt: 1, display: 'block', color: 'grey.500' }}
              >
                {t.name}
              </Typography>
              {(t.combos || []).map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}
                </MenuItem>
              ))}
            </Box>
          ))}
          {allCombos.length === 0 && (
            <MenuItem disabled value="">
              暫無陀螺，請先到「我的陀螺」添加
            </MenuItem>
          )}
        </Select>
      </FormControl>
    </Paper>
  );

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        新建對戰
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {renderPlayer('玩家 A', nameA, setNameA, comboA, setComboA)}
        {renderPlayer('玩家 B', nameB, setNameB, comboB, setComboB)}
      </Box>

      <FormControlLabel
        control={
          <Switch
            checked={randomPos}
            onChange={(e) => setRandomPos(e.target.checked)}
          />
        }
        label="開局隨機站位（Position Draw）"
        sx={{ mt: 2 }}
      />

      <Button
        fullWidth
        variant="contained"
        size="large"
        startIcon={<PlayArrowIcon />}
        onClick={submit}
        sx={{ mt: 2 }}
      >
        開始對戰
      </Button>
      {onBack && (
        <Button fullWidth onClick={onBack} sx={{ mt: 1 }}>
          返回比赛模式
        </Button>
      )}
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Ready confirm (雙端 Ready) — deep-green full-screen with X cross lines
// ---------------------------------------------------------------------------
export function ReadyConfirm({ battle, onBothReady, onBack, onLeave, seriesLabel = '' }) {
  const [readyA, setReadyA] = useState(false);
  const [readyB, setReadyB] = useState(false);
  const roundNo = battle.rounds.length + 1;

  const confirmSide = (side) => {
    requestLandscapeOrientation();
    if (side === 'A') {
      if (readyA) return;
      setReadyA(true);
      if (readyB) onBothReady && onBothReady();
      return;
    }

    if (readyB) return;
    setReadyB(true);
    if (readyA) onBothReady && onBothReady();
  };

  const renderSide = (side, ready, onTap) => {
    const isLeft = side === 'A';
    const name = isLeft ? battle.playerA.name : battle.playerB.name;
    const score = isLeft ? (battle.scoreA ?? 0) : (battle.scoreB ?? 0);

    return (
      <Box
        component="button"
        type="button"
        aria-label={`${name} ${ready ? 'ready' : 'tap to ready'}`}
        aria-pressed={ready}
        onClick={onTap}
        sx={{
          position: 'absolute',
          inset: 0,
          left: isLeft ? 0 : '50%',
          right: isLeft ? '50%' : 0,
          width: '50%',
          m: 0,
          p: 0,
          border: 0,
          bgcolor: ready ? '#FFFFFF' : '#236B28',
          cursor: ready ? 'default' : 'pointer',
          touchAction: 'manipulation',
          WebkitTapHighlightColor: 'transparent',
          overflow: 'hidden',
          color: ready ? '#111216' : '#FFFFFF',
          font: 'inherit',
          zIndex: 1,
          '&:focus-visible': {
            outline: `4px solid ${GREEN}`,
            outlineOffset: -6,
          },
        }}
      >
        {!ready && (
          <Box
            sx={{
              position: 'absolute',
              top: { xs: 'max(14px, env(safe-area-inset-top))', sm: 'max(32px, env(safe-area-inset-top))' },
              [isLeft ? 'left' : 'right']: {
                xs: `max(10px, env(safe-area-inset-${isLeft ? 'left' : 'right'}))`,
                sm: 42,
              },
              minWidth: 'clamp(118px, 28vw, 240px)',
              maxWidth: '68%',
              bgcolor: GREEN,
              pt: 0.8,
              [isLeft ? 'pr' : 'pl']: 1.2,
            }}
          >
            <Box
              sx={{
                bgcolor: '#FFFFFF',
                color: '#111216',
                px: { xs: 2, sm: 3 },
                py: { xs: 1, sm: 1.5 },
                clipPath: isLeft
                  ? 'polygon(0 0, 92% 0, 100% 100%, 0 100%)'
                  : 'polygon(8% 0, 100% 0, 100% 100%, 0 100%)',
                textAlign: isLeft ? 'left' : 'right',
              }}
            >
              <Typography
                noWrap
                sx={{
                  fontFamily: FONT,
                  fontWeight: 900,
                  fontSize: { xs: '1.35rem', sm: 'clamp(1.8rem, 3.2vw, 3.2rem)' },
                  lineHeight: 1,
                }}
              >
                {name}
              </Typography>
            </Box>
          </Box>
        )}

        {ready ? (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <Typography
              className="bey-ready-pop"
              sx={{
                fontFamily: FONT,
                fontWeight: 900,
                fontSize: 'clamp(2.1rem, 4.8vw, 5rem)',
                letterSpacing: '0.08em',
                whiteSpace: 'nowrap',
              }}
            >
              READY
            </Typography>
          </Box>
        ) : (
          <>
            <Box
              aria-label={`${name} score ${score} of ${WIN_SCORE}`}
              sx={{
                position: 'absolute',
                top: '53%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 'clamp(100px, 22vw, 360px)',
                height: 'clamp(120px, 50vh, 440px)',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              {score > 0 ? (
                <Typography
                  aria-hidden="true"
                  sx={{
                    fontFamily: FONT,
                    fontWeight: 900,
                    fontSize: 'clamp(8rem, 38vmin, 25rem)',
                    lineHeight: .8,
                    color: 'transparent',
                    WebkitTextStroke: `clamp(5px, .75vw, 12px) ${GREEN}`,
                  }}
                >
                  {score}
                </Typography>
              ) : (
                <Box
                  sx={{
                    width: 'clamp(92px, 17vw, 210px)',
                    aspectRatio: '1',
                    border: `clamp(5px, .7vw, 10px) solid ${GREEN}`,
                    borderRadius: '20%',
                    display: 'grid',
                    placeItems: 'center',
                    '& svg': { width: '72%', height: '72%' },
                  }}
                >
                  <ZIcon color={GREEN} />
                </Box>
              )}
            </Box>

            <Typography
              sx={{
                position: 'absolute',
                top: '52%',
                [isLeft ? 'left' : 'right']: '4.5%',
                writingMode: 'vertical-rl',
                transform: isLeft
                  ? 'translateY(-50%) rotate(180deg)'
                  : 'translateY(-50%)',
                color: '#FFFFFF',
                fontFamily: FONT,
                fontWeight: 700,
                letterSpacing: { xs: 2, sm: 5 },
                fontSize: 'clamp(.7rem, 1.5vw, 1.35rem)',
                whiteSpace: 'nowrap',
                borderInlineStart: '2px solid #FFFFFF',
                paddingInlineStart: 1,
              }}
            >
              TAP TO READY
            </Typography>

            <Box
              aria-label={`${name} score progress`}
              sx={{
                position: 'absolute',
                top: '51%',
                [isLeft ? 'right' : 'left']: '3.5%',
                transform: 'translateY(-50%)',
                display: 'flex',
                alignItems: 'center',
                gap: 'clamp(8px, 1.2vw, 22px)',
                flexDirection: isLeft ? 'row' : 'row-reverse',
              }}
            >
              <Box sx={{ display: 'grid', gap: 'clamp(4px, .7vh, 9px)' }}>
                {Array.from({ length: WIN_SCORE }, (_, index) => (
                  <Box
                    key={index}
                    data-filled={index >= WIN_SCORE - score ? 'true' : 'false'}
                    sx={{
                      width: 'clamp(28px, 4.7vw, 72px)',
                      height: 'clamp(10px, 2.2vh, 24px)',
                      border: `clamp(2px, .35vw, 5px) solid ${GREEN}`,
                      bgcolor: index >= WIN_SCORE - score ? GREEN : 'transparent',
                    }}
                  />
                ))}
              </Box>
              <Box
                sx={{
                  width: 0,
                  height: 0,
                  borderTop: 'clamp(22px, 5vh, 48px) solid transparent',
                  borderBottom: 'clamp(22px, 5vh, 48px) solid transparent',
                  [isLeft ? 'borderLeft' : 'borderRight']:
                    'clamp(18px, 3.6vw, 54px) solid #E9FFF1',
                }}
              />
            </Box>
          </>
        )}
      </Box>
    );
  };

  return (
    <Box
      className="battle-landscape-stage"
      sx={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100dvh',
        zIndex: 1500,
        bgcolor: '#171819',
        overflow: 'hidden',
      }}
    >
      {renderSide('A', readyA, () => confirmSide('A'))}
      {renderSide('B', readyB, () => confirmSide('B'))}

      {/* Black hourglass and the neon X form the fixed centre spine. */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          bgcolor: '#171819',
          clipPath: 'polygon(29% 0, 71% 0, 51.2% 50%, 71% 100%, 29% 100%, 48.8% 50%)',
          zIndex: 2,
          pointerEvents: 'none',
          '@media (min-aspect-ratio: 19/9), (max-height: 430px)': {
            clipPath: 'polygon(32% 0, 68% 0, 51.2% 50%, 68% 100%, 32% 100%, 48.8% 50%)',
          },
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: 'clamp(10px, 1.15vw, 22px)',
          height: '155vmax',
          bgcolor: GREEN,
          transform: 'translate(-50%, -50%) rotate(38deg)',
          zIndex: 3,
          pointerEvents: 'none',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: 'clamp(10px, 1.15vw, 22px)',
          height: '155vmax',
          bgcolor: GREEN,
          transform: 'translate(-50%, -50%) rotate(-38deg)',
          zIndex: 3,
          pointerEvents: 'none',
        }}
      />

      {/* Round, versus mark and controls always sit above the centre spine. */}
      <Box
        sx={{
          position: 'absolute',
          top: { xs: 'max(14px, env(safe-area-inset-top))', sm: 'max(36px, env(safe-area-inset-top))' },
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 4,
          pointerEvents: 'none',
          textAlign: 'center',
          '@media (orientation: landscape) and (max-height: 430px)': {
            top: 'max(9px, env(safe-area-inset-top))',
          },
        }}
      >
        <Typography aria-label={`ROUND ${roundNo}`} sx={{ fontFamily: FONT, fontWeight: 900, fontSize: 'clamp(2.2rem, 5.2vw, 5.5rem)', lineHeight: 1, whiteSpace: 'nowrap' }}>
          <Box component="span" sx={{ color: '#F1F1FA' }}>R</Box>
          <Box component="span" sx={{ color: GREEN }}>{roundNo}</Box>
        </Typography>
        <Typography sx={{ mt: { xs: 2, sm: 7 }, fontFamily: FONT, fontWeight: 700, fontSize: 'clamp(1.1rem, 2.4vw, 2.6rem)', color: '#F4F4F4', letterSpacing: '.12em', '@media (orientation: landscape) and (max-height: 430px)': { mt: 1.5 } }}>
          VS
        </Typography>
        {seriesLabel && (
          <Typography noWrap sx={{ mt: .7, maxWidth: '32vw', overflow: 'hidden', textOverflow: 'ellipsis', color: '#BFC3C7', fontFamily: FONT, fontSize: 'clamp(.45rem, 1.15vw, .8rem)', letterSpacing: '.05em' }}>
            {seriesLabel}
          </Typography>
        )}
      </Box>

      <Box
        sx={{
          position: 'absolute',
          zIndex: 5,
          left: '50%',
          bottom: { xs: 'max(10px, env(safe-area-inset-bottom))', sm: 'max(28px, env(safe-area-inset-bottom))' },
          transform: 'translateX(-50%)',
          width: 'clamp(190px, 23vw, 340px)',
          display: 'grid',
          gap: 1,
          '@media (orientation: landscape) and (max-height: 430px)': {
            bottom: 'max(7px, env(safe-area-inset-bottom))',
            gap: .5,
          },
        }}
      >
        <Trapezoid onClick={onBack} color="#979A9F" sx={{ color: '#111216', minHeight: 44, py: { xs: .7, sm: 1.2 }, touchAction: 'manipulation' }}>
          返回
        </Trapezoid>
        <Box onClick={onLeave} role="button" tabIndex={0} sx={{ bgcolor: '#242424', color: '#fff', textAlign: 'center', minHeight: 34, py: .45, cursor: 'pointer', fontWeight: 700, touchAction: 'manipulation' }}>
          離開
        </Box>
      </Box>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// In-battle scoring screen (局内计分界面)
// ---------------------------------------------------------------------------
function useStopwatch(active) {
  const [sec, setSec] = useState(0);
  useEffect(() => {
    if (!active) return undefined;
    const t = setInterval(() => setSec((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, [active]);
  const mm = String(Math.floor(sec / 60)).padStart(2, '0');
  const ss = String(sec % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

/** A single finish button (left = A, right = B). */
function FinishBtn({ type, side, onClick, disabled = false }) {
  const meta = FINISH_META[type];
  const pts = meta.points;
  const isXtreme = type === FINISH.XTREME;
  const isRight = side === 'B';
  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      aria-disabled={disabled}
      sx={{
        display: 'flex',
        flexDirection: isRight ? 'row-reverse' : 'row',
        alignItems: 'center',
        gap: 'clamp(4px, 1vw, 14px)',
        width: '100%',
        minWidth: 0,
        minHeight: 0,
        px: 'clamp(6px, 1.2vw, 18px)',
        py: 'clamp(3px, 1vh, 12px)',
        m: 0,
        bgcolor: '#0E0E0E',
        color: '#fff',
        border: `clamp(2px, .35vmin, 4px) solid ${GREEN}`,
        borderRadius: isXtreme ? '0 0 14px 0' : 0,
        cursor: disabled ? 'default' : 'pointer',
        pointerEvents: disabled ? 'none' : 'auto',
        opacity: disabled ? 0.5 : 1,
        touchAction: 'manipulation',
        userSelect: 'none',
        boxShadow: isXtreme ? '0 0 18px rgba(53,230,59,0.24)' : 'none',
        transition: 'transform .08s ease, background .15s ease',
        '&:active': { transform: 'scale(0.97)', bgcolor: '#1c1c1c' },
        '&:focus-visible': { outline: '3px solid #fff', outlineOffset: -5 },
      }}
    >
      <Box
        sx={{
          minWidth: 'clamp(32px, 5.5vw, 76px)',
          textAlign: 'center',
          color: GREEN,
          fontWeight: 900,
          fontSize: 'clamp(1rem, 4.8vmin, 2.8rem)',
          lineHeight: 1,
          px: 0.2,
          fontFamily: FONT,
        }}
      >
        +{pts}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0, textAlign: isRight ? 'right' : 'left' }}>
        <Typography sx={{ fontFamily: FONT, fontWeight: 900, fontSize: isXtreme ? 'clamp(.75rem, 3.4vmin, 2rem)' : 'clamp(.72rem, 2.8vmin, 1.55rem)', color: isXtreme ? GREEN : '#fff', lineHeight: 1, whiteSpace: 'nowrap' }}>
          {isXtreme ? 'XTREME' : meta.label.split(' ')[0].toUpperCase()}
        </Typography>
        <Typography sx={{ color: '#E7E7E7', letterSpacing: { xs: 0, sm: 1 }, fontSize: 'clamp(.52rem, 1.65vmin, .92rem)', lineHeight: 1.1, mt: .35 }}>
          FINISH
        </Typography>
      </Box>
    </Box>
  );
}

export function BattleScreen({ battle, onRecord, onRematch, onLeave, seriesLabel = '' }) {
  const roundNo = battle.rounds.length + 1;
  const [roundLocked, setRoundLocked] = useState(false);
  const roundLockedRef = useRef(false);
  const time = useStopwatch(battle.status === 'ongoing' && !roundLocked);

  const recordOnce = (winner, type) => {
    if (roundLockedRef.current) return;
    roundLockedRef.current = true;
    setRoundLocked(true);
    onRecord(winner, type);
  };

  const finishTypes = [FINISH.SPIN, FINISH.OVER, FINISH.BURST, FINISH.XTREME];

  const scorePanel = (score, side) => (
    <Box sx={{ minWidth: 0, height: '100%', display: 'grid', placeItems: 'center', alignContent: 'center', position: 'relative', zIndex: 1 }}>
      <Typography
        aria-label={`${side} score ${score}`}
        sx={{
          fontFamily: FONT,
          fontWeight: 900,
          fontSize: 'clamp(4.8rem, 39vmin, 14rem)',
          color: GREEN,
          lineHeight: .78,
          letterSpacing: '-.06em',
          textShadow: '0 0 20px rgba(53,230,59,.12)',
        }}
      >
        {score}
      </Typography>
      <Typography sx={{ mt: 'clamp(8px, 2vh, 18px)', color: '#C8C9E5', fontFamily: FONT, fontSize: 'clamp(.48rem, 1.7vmin, .9rem)', letterSpacing: '.38em' }}>
        SCORE
      </Typography>
    </Box>
  );

  return (
    <Box
      className="battle-landscape-stage"
      sx={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100dvh',
        zIndex: 1500,
        bgcolor: '#18191A',
        color: '#fff',
        overflow: 'hidden',
        display: 'grid',
        gridTemplateRows: 'clamp(58px, 18dvh, 118px) minmax(0, 1fr)',
        rowGap: 'clamp(4px, 1.2vh, 12px)',
        pt: 'max(6px, env(safe-area-inset-top))',
        pb: 'max(6px, env(safe-area-inset-bottom))',
        pl: 'max(8px, env(safe-area-inset-left))',
        pr: 'max(8px, env(safe-area-inset-right))',
        '&::before, &::after': {
          content: '""',
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: 'clamp(14px, 1.4vw, 28px)',
          height: '145vmax',
          bgcolor: '#202122',
          transformOrigin: 'center',
          pointerEvents: 'none',
        },
        '&::before': { transform: 'translate(-50%, -50%) rotate(38deg)' },
        '&::after': { transform: 'translate(-50%, -50%) rotate(-38deg)' },
      }}
    >
      <Box sx={{ zIndex: 1, minWidth: 0, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(92px, .48fr) minmax(0, 1fr)', alignItems: 'start', gap: 'clamp(6px, 2vw, 24px)' }}>
        <Box sx={{ minWidth: 0, overflow: 'hidden', justifySelf: 'start' }}>
          <NameTag name={battle.playerA.name} large />
        </Box>
        <Box sx={{ minWidth: 0, textAlign: 'center', alignSelf: 'start' }}>
          <Typography aria-label={`ROUND ${roundNo}`} sx={{ fontFamily: FONT, fontWeight: 900, fontSize: 'clamp(1.1rem, 6.5vmin, 4rem)', color: '#F3F3FA', whiteSpace: 'nowrap', lineHeight: .95 }}>
            <Box component="span">R</Box>
            <Box component="span" sx={{ color: GREEN }}>{roundNo}</Box>
          </Typography>
          <Typography sx={{ fontFamily: FONT, fontWeight: 700, fontSize: 'clamp(.65rem, 2.4vmin, 1.25rem)', color: '#BFC2F2', mt: .6, letterSpacing: '.12em' }}>
            {time}
          </Typography>
          {seriesLabel && (
            <Typography noWrap sx={{ mt: .25, color: '#AEB2B6', fontFamily: FONT, fontSize: 'clamp(.42rem, 1.25vmin, .68rem)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {seriesLabel}
            </Typography>
          )}
        </Box>
        <Box sx={{ minWidth: 0, overflow: 'hidden', justifySelf: 'end' }}>
          <NameTag name={battle.playerB.name} large />
        </Box>
      </Box>

      <Box
        sx={{
          zIndex: 1,
          minHeight: 0,
          display: 'grid',
          gridTemplateColumns: 'minmax(112px, 1.22fr) minmax(66px, .82fr) minmax(96px, .72fr) minmax(66px, .82fr) minmax(112px, 1.22fr)',
          gap: 'clamp(4px, 1vw, 14px)',
          '@media (min-width: 1000px)': {
            gridTemplateColumns: 'minmax(220px, 1.15fr) minmax(150px, .8fr) minmax(150px, .68fr) minmax(150px, .8fr) minmax(220px, 1.15fr)',
          },
        }}
      >
        <Box sx={{ minWidth: 0, minHeight: 0, display: 'grid', gridTemplateRows: 'repeat(4, minmax(0, 1fr))', gap: 'clamp(4px, 1vh, 10px)' }}>
          {finishTypes.map((type) => (
            <FinishBtn key={type} side="A" disabled={roundLocked} type={type} onClick={() => recordOnce('A', type)} />
          ))}
        </Box>
        {scorePanel(battle.scoreA, 'A')}

        <Box sx={{ minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'stretch', justifyContent: 'space-between', gap: 'clamp(3px, .8vh, 8px)', position: 'relative', zIndex: 2 }}>
          <Trapezoid onClick={onRematch} color="#979A9F" sx={{ color: '#111', px: .5, py: 'clamp(4px, 1vh, 10px)', minHeight: 34, fontSize: 'clamp(.65rem, 2vmin, 1rem)', touchAction: 'manipulation' }}>
            重賽
          </Trapezoid>
          <Box sx={{ flex: 1, display: 'grid', placeItems: 'center', minHeight: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 'clamp(3px, .7vw, 10px)' }}>
              <Tri size={10} rotate={-90} />
              <Tri size={10} rotate={90} />
            </Box>
          </Box>
          <Trapezoid onClick={() => recordOnce('draw', FINISH.DRAW)} color="#979A9F" sx={{ color: '#111', px: .5, py: 'clamp(5px, 1.1vh, 11px)', minHeight: 38, fontSize: 'clamp(.7rem, 2.2vmin, 1.1rem)', pointerEvents: roundLocked ? 'none' : 'auto', opacity: roundLocked ? .5 : 1, touchAction: 'manipulation' }}>
            平手
          </Trapezoid>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 / 8 }}>
            <Box component="button" type="button" onClick={() => recordOnce('B', FINISH.LAUNCH_FAIL)} disabled={roundLocked} sx={{ minWidth: 0, minHeight: 34, border: 0, bgcolor: '#34363D', color: '#fff', fontSize: 'clamp(.48rem, 1.55vmin, .78rem)', fontWeight: 700, p: .3, cursor: 'pointer', touchAction: 'manipulation' }}>A發射失敗</Box>
            <Box component="button" type="button" onClick={() => recordOnce('A', FINISH.LAUNCH_FAIL)} disabled={roundLocked} sx={{ minWidth: 0, minHeight: 34, border: 0, bgcolor: '#34363D', color: '#fff', fontSize: 'clamp(.48rem, 1.55vmin, .78rem)', fontWeight: 700, p: .3, cursor: 'pointer', touchAction: 'manipulation' }}>B發射失敗</Box>
          </Box>
          <Box component="button" type="button" onClick={onLeave} sx={{ minHeight: 30, border: 0, bgcolor: '#242424', color: '#fff', fontWeight: 700, fontSize: 'clamp(.62rem, 1.8vmin, .9rem)', cursor: 'pointer', touchAction: 'manipulation' }}>
            離開
          </Box>
        </Box>
        {scorePanel(battle.scoreB, 'B')}
        <Box sx={{ minWidth: 0, minHeight: 0, display: 'grid', gridTemplateRows: 'repeat(4, minmax(0, 1fr))', gap: 'clamp(4px, 1vh, 10px)' }}>
          {finishTypes.map((type) => (
            <FinishBtn key={type} side="B" disabled={roundLocked} type={type} onClick={() => recordOnce('B', type)} />
          ))}
        </Box>
      </Box>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Round history list (shows actual points)
// ---------------------------------------------------------------------------
function RoundHistory({ battle }) {
  if (!battle.rounds.length) {
    return (
      <Typography variant="body2" color="grey.500" sx={{ mt: 2 }}>
        還沒有回合記錄。
      </Typography>
    );
  }
  return (
    <Paper sx={{ p: 1.5, mt: 2 }} elevation={2}>
      <Typography variant="subtitle1" fontWeight={700} gutterBottom>
        回合記錄（{battle.rounds.length}）
      </Typography>
      <List dense disablePadding>
        {battle.rounds
          .slice()
          .reverse()
          .map((r) => {
            const meta = FINISH_META[r.finishType];
            const who =
              r.winner === 'A' ? 'A 得分' : r.winner === 'B' ? 'B 得分' : '平手';
            return (
              <ListItem
                key={r.index}
                divider
                secondaryAction={
                  <Typography variant="caption" color="grey.500">
                    {fmtTime(r.timestamp)}
                  </Typography>
                }
              >
                <ListItemText
                  primary={`第 ${r.index} 局 · ${who} · +${r.points}`}
                  secondary={
                    <Chip
                      size="small"
                      label={`${meta.label} · ${meta.zh}`}
                      sx={{ bgcolor: meta.color, color: '#1A1A1A', mt: 0.5 }}
                    />
                  }
                />
              </ListItem>
            );
          })}
      </List>
    </Paper>
  );
}

// ---------------------------------------------------------------------------
// Result panel (finished battle) — adapted to new point values
// ---------------------------------------------------------------------------
function ResultPanel({ battle, onRematch, onReset }) {
  const { playerA, playerB, winner } = battle;
  const winnerName = winner === 'A' ? playerA.name : playerB.name;
  const summary = battleSummary(battle);
  const finishEntries = Object.entries(summary.finishCounts);

  return (
    <Box>
      {/* Final score banner */}
      <Paper
        sx={{
          p: 3,
          mt: 2,
          textAlign: 'center',
          bgcolor: 'rgba(76,175,80,0.12)',
          border: '2px solid',
          borderColor: GREEN,
        }}
        elevation={4}
      >
        <EmojiEventsIcon sx={{ fontSize: 48, color: '#4CAF50' }} />
        <Typography variant="h5" fontWeight={900} sx={{ mt: 1 }}>
          {winnerName} 勝利！
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ fontFamily: FONT }}>
          {playerA.name} {battle.scoreA} : {battle.scoreB} {playerB.name}
        </Typography>
        <Typography variant="caption" color="grey.500">
          目標 {WIN_SCORE} 分 · 共 {battle.rounds.length} 局
        </Typography>
      </Paper>

      <Paper sx={{ p: 2, mt: 2 }} elevation={2}>
        <Typography variant="subtitle2" fontWeight={700} gutterBottom>
          終結方式統計
        </Typography>
        {finishEntries.length === 0 ? (
          <Typography variant="body2" color="grey.500">
            無記錄
          </Typography>
        ) : (
          <Stack direction="row" flexWrap="wrap" gap={1}>
            {finishEntries.map(([type, count]) => (
              <Chip
                key={type}
                size="small"
                label={`${FINISH_META[type].zh} ×${count}`}
                sx={{ bgcolor: FINISH_META[type].color, color: '#1A1A1A' }}
              />
            ))}
          </Stack>
        )}
      </Paper>

      <RoundHistory battle={battle} />

      <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
        <Button
          fullWidth
          variant="contained"
          startIcon={<ReplayIcon />}
          onClick={onRematch}
        >
          再戰（同對手）
        </Button>
        <Button
          fullWidth
          variant="outlined"
          startIcon={<RestartAltIcon />}
          onClick={onReset}
        >
          重置整場
        </Button>
      </Stack>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Battle page (orchestrates the flow)
// ---------------------------------------------------------------------------
export default function BattlePage() {
  const {
    battle,
    startBattle,
    randomizePosition,
    beginBattle,
    recordRound,
    rematch,
    resetBattle,
    tournament,
    restartTournamentGame,
    completeTournamentGame,
    league,
    restartLeagueGame,
    completeLeagueGame,
  } = useApp();
  const [counting, setCounting] = useState(false);
  const [mode, setMode] = useState(null);
  const countdownAudioRef = useRef(null);

  useEffect(() => {
    const audio = new Audio(countdownAudioUrl);
    audio.preload = 'auto';
    countdownAudioRef.current = audio;
    return () => {
      audio.pause();
      countdownAudioRef.current = null;
    };
  }, []);

  const startCountdown = () => {
    requestLandscapeOrientation();
    const audio = countdownAudioRef.current;
    if (audio) {
      audio.currentTime = 0;
      const playback = audio.play();
      playback?.catch(() => {
        // The visual countdown still runs if a browser blocks audio playback.
      });
    }
    setCounting(true);
  };

  if (!battle && (tournament || mode === 'tournament')) {
    return <TournamentPage onBack={() => setMode(null)} />;
  }

  if (!battle && (league || mode === 'league')) {
    return <PointsLeaguePage onBack={() => setMode(null)} />;
  }

  if (!battle && mode === 'quick') {
    return (
      <SetupForm
        onStart={(a, b, random) => {
          startBattle(a, b);
          if (random) randomizePosition();
        }}
        onBack={() => setMode(null)}
      />
    );
  }

  if (!battle) {
    return (
      <BattleModeSelector
        onQuick={() => setMode('quick')}
        onTournament={() => setMode('tournament')}
        onLeague={() => setMode('league')}
      />
    );
  }

  const seriesLabel = battle.league
    ? leagueSeriesLabel(league, battle)
    : tournamentSeriesLabel(tournament, battle);

  if (counting) {
    return (
      <Countdown
        audio={countdownAudioRef.current}
        onDone={() => {
          beginBattle();
          setCounting(false);
        }}
      />
    );
  }

  if (battle.status === 'ready') {
    return (
      <ReadyConfirm
        battle={battle}
        onBothReady={startCountdown}
        onBack={resetBattle}
        onLeave={resetBattle}
        seriesLabel={seriesLabel}
      />
    );
  }

  if (battle.status === 'finished') {
    if (battle.tournament && tournament) {
      return (
        <TournamentGameResult
          battle={battle}
          tournament={tournament}
          onContinue={completeTournamentGame}
        />
      );
    }
    if (battle.league && league) {
      return (
        <LeagueGameResult
          battle={battle}
          league={league}
          onContinue={completeLeagueGame}
        />
      );
    }
    return (
      <ResultPanel
        battle={battle}
        onRematch={rematch}
        onReset={resetBattle}
      />
    );
  }

  // ongoing
  return (
    <BattleScreen
      battle={battle}
      onRecord={(winner, type) => recordRound(winner, type)}
      onRematch={battle.tournament
        ? restartTournamentGame
        : battle.league
          ? restartLeagueGame
          : rematch}
      onLeave={resetBattle}
      seriesLabel={seriesLabel}
    />
  );
}
