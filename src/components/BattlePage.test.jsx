import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BattleScreen, ReadyConfirm } from './BattlePage';
import Countdown, {
  COUNTDOWN_DURATION_MS,
  COUNTDOWN_TIMELINE,
} from './Countdown';

const battle = {
  playerA: { name: 'Player A' },
  playerB: { name: 'Player B' },
  rounds: [],
};

describe('ReadyConfirm', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('confirms each touch side independently and starts only after both are ready', () => {
    vi.useFakeTimers();
    const onBothReady = vi.fn();

    render(
      <ReadyConfirm
        battle={battle}
        onBothReady={onBothReady}
        onBack={vi.fn()}
        onLeave={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Player A tap to ready' }));

    expect(
      screen.getByRole('button', { name: 'Player A ready' }).getAttribute('aria-pressed')
    ).toBe('true');
    expect(
      screen
        .getByRole('button', { name: 'Player B tap to ready' })
        .getAttribute('aria-pressed')
    ).toBe('false');
    act(() => vi.advanceTimersByTime(400));
    expect(onBothReady).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Player B tap to ready' }));

    expect(onBothReady).toHaveBeenCalledTimes(1);
  });

  it('shows the next round number from recorded round history', () => {
    render(
      <ReadyConfirm
        battle={{ ...battle, rounds: [{ index: 1 }] }}
        onBothReady={vi.fn()}
        onBack={vi.fn()}
        onLeave={vi.fn()}
      />
    );

    expect(screen.getByLabelText('ROUND 2')).toBeTruthy();
  });

  it('shows each current score and fills the matching number of ready markers', () => {
    render(
      <ReadyConfirm
        battle={{ ...battle, scoreA: 2, scoreB: 1 }}
        onBothReady={vi.fn()}
        onBack={vi.fn()}
        onLeave={vi.fn()}
      />
    );

    const playerAProgress = screen.getByLabelText('Player A score progress');
    expect(playerAProgress.querySelectorAll('[data-filled="true"]')).toHaveLength(2);
    expect(playerAProgress.querySelector('[data-filled]')?.getAttribute('data-filled')).toBe('false');
    expect(playerAProgress.querySelectorAll('[data-filled]')[3]?.getAttribute('data-filled')).toBe('true');
    expect(
      screen.getByLabelText('Player B score progress').querySelectorAll('[data-filled="true"]')
    ).toHaveLength(1);
  });
});

describe('Countdown', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('follows the spoken READY, SET, 3, 2, 1, GO, SHOOT cue timings', () => {
    vi.useFakeTimers();
    const onDone = vi.fn();
    render(<Countdown onDone={onDone} />);

    expect(screen.getByText('READY')).toBeTruthy();

    for (let i = 1; i < COUNTDOWN_TIMELINE.length; i += 1) {
      const elapsed = COUNTDOWN_TIMELINE[i].at - COUNTDOWN_TIMELINE[i - 1].at;
      act(() => vi.advanceTimersByTime(elapsed));
      expect(screen.getByText(COUNTDOWN_TIMELINE[i].label)).toBeTruthy();
    }

    act(() =>
      vi.advanceTimersByTime(
        COUNTDOWN_DURATION_MS - COUNTDOWN_TIMELINE.at(-1).at
      )
    );
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});

describe('BattleScreen round lock', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('stops the timer and accepts only the first score tap', () => {
    vi.useFakeTimers();
    const onRecord = vi.fn();
    const ongoingBattle = {
      ...battle,
      scoreA: 0,
      scoreB: 0,
      status: 'ongoing',
    };

    render(
      <BattleScreen
        battle={ongoingBattle}
        onRecord={onRecord}
        onRematch={vi.fn()}
        onLeave={vi.fn()}
      />
    );

    act(() => vi.advanceTimersByTime(2000));
    expect(screen.getByText('00:02')).toBeTruthy();

    const firstSpinFinish = screen.getAllByRole('button', { name: /SPIN/i })[0];
    fireEvent.click(firstSpinFinish);
    fireEvent.click(firstSpinFinish);
    act(() => vi.advanceTimersByTime(2000));

    expect(screen.getByText('00:02')).toBeTruthy();
    expect(onRecord).toHaveBeenCalledTimes(1);
    expect(onRecord).toHaveBeenCalledWith('A', 'spin');
  });
});
