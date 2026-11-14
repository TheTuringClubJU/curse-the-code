import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import LeaderboardView from '../admin/LeaderboardView';

describe('Revamped Arena Leaderboard View Suite', () => {
  const mockLeaderboardData = [
    { rank: 1, team_id: 101, team_name: 'Team Alpha', clues_solved: 10, total_score: 95.5, is_qualified_r2: true },
    { rank: 2, team_id: 102, team_name: 'Team Beta', clues_solved: 8, total_score: 82.0, is_qualified_r2: true },
    { rank: 3, team_id: 103, team_name: 'Team Gamma', clues_solved: 7, total_score: 70.0, is_qualified_r2: true },
    { rank: 4, team_id: 104, team_name: 'Team Delta', clues_solved: 6, total_score: 55.0, is_qualified_r2: false },
    { rank: 5, team_id: 105, team_name: 'Team Epsilon', clues_solved: 5, total_score: 45.0, is_qualified_r2: false },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes('/api/admin/leaderboard')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            ok: true,
            round: 1,
            leaderboard: mockLeaderboardData,
          }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({}),
      });
    });
  });

  it('renders the 3D arena leaderboard title and control header', async () => {
    await act(async () => {
      render(<LeaderboardView onBack={vi.fn()} />);
    });
    expect(screen.getByRole("heading", { name: /curse the code.*live leaderboard/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /back to control/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /round i - trials/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /round ii - finals/i })).toBeDefined();
  });

  it('mounts the canvas without unnecessary audience perspective badges', async () => {
    let container;
    await act(async () => {
      ({ container } = render(<LeaderboardView onBack={vi.fn()} />));
    });
    expect(container.querySelector('canvas')).toBeDefined();
    expect(screen.queryByText(/arena audience perspective/i)).toBeNull();
  });

  it('renders the permanent arena standings side panel without searchbar or qualification threshold and filters Round 2 to qualified teams only', async () => {
    await act(async () => {
      render(<LeaderboardView onBack={vi.fn()} />);
    });

    expect(screen.getByRole('heading', { name: /arena standings/i })).toBeDefined();
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.queryByText(/qualification threshold/i)).toBeNull();

    // Round 1 shows all 5 teams + R2 qualified tags for the 3 qualified teams
    expect(screen.getByText('Team Alpha')).toBeDefined();
    expect(screen.getByText('Team Delta')).toBeDefined();
    expect(screen.getAllByText('R2')).toHaveLength(3);

    // Switch to Round 2 Finals: only qualified teams should appear
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /round ii - finals/i }));
    });

    expect(screen.getByText('Team Alpha')).toBeDefined();
    expect(screen.getByText('Team Beta')).toBeDefined();
    expect(screen.getByText('Team Gamma')).toBeDefined();
    expect(screen.queryByText('Team Delta')).toBeNull();
    expect(screen.queryByText('Team Epsilon')).toBeNull();
  });

  it('toggles fullscreen mode when pressing F key', async () => {
    await act(async () => {
      render(<LeaderboardView onBack={vi.fn()} />);
    });

    expect(screen.getByRole('button', { name: /toggle fullscreen/i })).toBeDefined();
    expect(screen.queryByRole('button', { name: /exit fullscreen/i })).toBeNull();

    await act(async () => {
      fireEvent.keyDown(window, { key: 'f' });
    });

    expect(screen.getByRole('button', { name: /exit fullscreen/i })).toBeDefined();
    expect(screen.queryByRole('heading', { name: /curse the code.*live leaderboard/i })).toBeNull();

    await act(async () => {
      fireEvent.keyDown(window, { key: 'F' });
    });

    expect(screen.getByRole('heading', { name: /curse the code.*live leaderboard/i })).toBeDefined();
    expect(screen.queryByRole('button', { name: /exit fullscreen/i })).toBeNull();
  });

  it('ranks qualified teams ahead of unqualified penalty teams on Round 1 zero-score ties', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        round: 1,
        leaderboard: [
          { rank: 1, team_id: 1, team_name: 'colead', clues_solved: 11, total_score: 1085, penalty_seconds: 30, is_qualified_r2: true },
          { rank: 2, team_id: 2, team_name: 'techlead', clues_solved: 4, total_score: 385, penalty_seconds: 30, is_qualified_r2: true },
          { rank: 3, team_id: 3, team_name: 'techtesting2', clues_solved: 0, total_score: 0, penalty_seconds: 10, is_qualified_r2: false },
          { rank: 4, team_id: 4, team_name: 'Curse Breakers', clues_solved: 0, total_score: 0, penalty_seconds: 0, is_qualified_r2: true },
        ],
      }),
    });

    await act(async () => {
      render(<LeaderboardView onBack={vi.fn()} />);
    });

    const bodyText = document.body.textContent;
    expect(bodyText.indexOf('Curse Breakers')).toBeLessThan(bodyText.indexOf('techtesting2'));
  });
});
