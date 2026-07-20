import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AppProvider } from '../context/AppContext';
import PointsLeaguePage from './PointsLeaguePage';
import { BattleModeSelector } from './TournamentPage';

describe('points league setup UI', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('selects league mode and creates a default three-player points league', () => {
    const onLeague = vi.fn();
    const modeView = render(
      <BattleModeSelector onQuick={vi.fn()} onTournament={vi.fn()} onLeague={onLeague} />
    );
    fireEvent.click(screen.getByRole('button', { name: /积分赛/ }));
    expect(onLeague).toHaveBeenCalledOnce();
    modeView.unmount();

    render(<AppProvider><PointsLeaguePage onBack={vi.fn()} /></AppProvider>);
    fireEvent.click(screen.getByRole('button', { name: '减少参赛人数' }));
    expect(screen.getByLabelText('3 位参赛者')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '下一步' }));
    expect(screen.getByLabelText('参赛者 3')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '下一步' }));
    expect(screen.getByRole('button', { name: /循环赛/ }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: '1 分' }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: /瑞士轮/ }));
    expect(screen.getByText(/系统自动换算为 3 个瑞士小轮/)).toBeTruthy();
    expect(screen.getByText(/预计 3 场对阵/)).toBeTruthy();
    act(() => fireEvent.click(screen.getByRole('button', { name: '创建积分赛' })));

    expect(screen.getByText(/3 人 · 瑞士轮 · 1 周期 · 胜者 \+1 分/)).toBeTruthy();
    expect(screen.getByRole('button', { name: /开始下一场/ })).toBeTruthy();
    fireEvent.click(screen.getByRole('tab', { name: /统计榜/ }));
    expect(screen.getByRole('table', { name: '积分赛统计榜' })).toBeTruthy();
  });
});
