import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AppProvider } from '../context/AppContext';
import TournamentPage, { BattleModeSelector } from './TournamentPage';

describe('tournament setup UI', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('selects tournament mode and completes the three-step setup', () => {
    const onTournament = vi.fn();
    const modeView = render(<BattleModeSelector onQuick={vi.fn()} onTournament={onTournament} />);
    fireEvent.click(screen.getByRole('button', { name: /淘汰赛/ }));
    expect(onTournament).toHaveBeenCalledOnce();
    modeView.unmount();

    render(<AppProvider><TournamentPage onBack={vi.fn()} /></AppProvider>);
    fireEvent.click(screen.getByRole('button', { name: '下一步' }));
    expect(screen.getByLabelText('参赛者 1')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '下一步' }));
    expect(screen.getByRole('button', { name: /三场两胜/ })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /三场两胜/ }));
    act(() => fireEvent.click(screen.getByRole('button', { name: '随机抽签并创建赛程' })));

    expect(screen.getByText('4 人 · 三场两胜制')).toBeTruthy();
    expect(screen.getByRole('button', { name: /开始下一场/ })).toBeTruthy();
    expect(screen.getByRole('tab', { name: /统计榜/ })).toBeTruthy();
  });
});
