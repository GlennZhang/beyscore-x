import React, { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';

/**
 * Full-screen, white-background countdown shown before a battle begins.
 * The visual sequence follows the spoken cues in data/bgm.MP3 rather than a
 * generic one-second beat: READY → SET → 3 → 2 → 1 → GO → SHOOT.
 * Calls onDone() once the whole sequence completes.
 *
 * Reference-app styling: big tech font, black numerals, green triangle
 * accents (down-triangle above the numbers, inward arrows around GO).
 */
export const COUNTDOWN_TIMELINE = [
  { label: 'READY', at: 0 },
  { label: 'SET', at: 1430 },
  { label: '3', at: 2380 },
  { label: '2', at: 3450 },
  { label: '1', at: 4460 },
  { label: 'GO', at: 5070 },
  { label: 'SHOOT', at: 7160 },
];
export const COUNTDOWN_DURATION_MS = 9850;
const GREEN = '#35E63B';

/** A CSS triangle (apex points down by default). */
function Tri({ size = 20, rotate = 0, color = GREEN }) {
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

export default function Countdown({ onDone, audio }) {
  const [i, setI] = useState(0);
  const label = COUNTDOWN_TIMELINE[i].label;
  const isNumber = label === '3' || label === '2' || label === '1';
  const isGo = label === 'GO';
  const isShoot = label === 'SHOOT';
  const showUpTriangle = !isGo && !isShoot; // READY / SET / 3 / 2 / 1

  useEffect(() => {
    let finished = false;
    const startAt = Math.max(0, (audio?.currentTime || 0) * 1000);
    const timers = COUNTDOWN_TIMELINE.slice(1).map((cue, index) =>
      setTimeout(() => setI(index + 1), Math.max(0, cue.at - startAt))
    );

    const finish = () => {
      if (finished) return;
      finished = true;
      onDone && onDone();
    };
    const doneTimer = setTimeout(
      finish,
      Math.max(0, COUNTDOWN_DURATION_MS - startAt)
    );

    audio?.addEventListener('ended', finish);
    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(doneTimer);
      audio?.removeEventListener('ended', finish);
    };
  }, [audio, onDone]);

  return (
    <Box
      className="battle-landscape-stage"
      sx={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100dvh',
        zIndex: 2000,
        bgcolor: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Box
        key={label}
        className="bey-count"
        sx={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          fontFamily: '"Orbitron", "Chakra Petch", sans-serif',
        }}
      >
        {showUpTriangle && <Tri size={20} />}

        {isGo ? (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'clamp(.6rem, 3vw, 2rem)', width: '100%', px: 2 }}>
            {/* left arrow points right (toward center) */}
            <Tri size={26} rotate={-90} />
            <CountLabel text={label} />
            {/* right arrow points left (toward center) */}
            <Tri size={26} rotate={90} />
          </Box>
        ) : (
          <CountLabel text={label} gray={isNumber} />
        )}
      </Box>
    </Box>
  );
}

function CountLabel({ text, gray }) {
  const isNumber = /^\d$/.test(text);
  const fontSize = isNumber
    ? 'clamp(7rem, 34vmin, 19rem)'
    : text === 'SHOOT'
      ? 'clamp(3rem, 14vw, 10rem)'
      : text === 'READY' || text === 'SET'
        ? 'clamp(3rem, 15vw, 9rem)'
        : 'clamp(4.5rem, 19vw, 11rem)';

  return (
    <Typography
      sx={{
        fontFamily: '"Orbitron", "Chakra Petch", sans-serif',
        fontWeight: 900,
        fontSize,
        lineHeight: 1,
        color: gray ? '#9E9E9E' : '#1A1A1A',
        letterSpacing: '0.04em',
        mt: 0.5,
        maxWidth: '100%',
        px: 1,
        whiteSpace: 'nowrap',
      }}
    >
      {text}
    </Typography>
  );
}
