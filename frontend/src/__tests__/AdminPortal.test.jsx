import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import AdminLogin from '../admin/AdminLogin';
import AdminDashboard from '../admin/AdminDashboard';

describe('Admin Portal Frontend Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    global.localStorage.setItem('ctc_admin_token', 'test-token');
  });

  describe('AdminLogin Component', () => {
    it('renders admin login form elements', () => {
      render(<AdminLogin onLoginSuccess={vi.fn()} />);
      expect(screen.getByRole('heading', { name: /admin portal/i })).toBeDefined();
      expect(screen.getByPlaceholderText('admin')).toBeDefined();
      expect(screen.getByPlaceholderText('••••••••')).toBeDefined();
      expect(screen.getByRole('button', { name: /sign in as admin/i })).toBeDefined();
    });

    it('submits admin login credentials and triggers onLoginSuccess on 200', async () => {
      const mockSuccess = vi.fn();
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          token: 'mock-admin-token',
          admin: { id: 1, username: 'admin' },
        }),
      });

      render(<AdminLogin onLoginSuccess={mockSuccess} />);
      const userInput = screen.getByPlaceholderText('admin');
      const passInput = screen.getByPlaceholderText('••••••••');
      const submitBtn = screen.getByRole('button', { name: /sign in as admin/i });

      fireEvent.change(userInput, { target: { value: 'admin' } });
      fireEvent.change(passInput, { target: { value: 'admin123' } });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(mockSuccess).toHaveBeenCalledWith({ id: 1, username: 'admin' });
      });
    });

    it('displays error message on invalid credentials', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          detail: { message: 'Invalid admin username or password' },
        }),
      });

      render(<AdminLogin onLoginSuccess={vi.fn()} />);
      const userInput = screen.getByPlaceholderText('admin');
      const passInput = screen.getByPlaceholderText('••••••••');
      const submitBtn = screen.getByRole('button', { name: /sign in as admin/i });

      fireEvent.change(userInput, { target: { value: 'badadmin' } });
      fireEvent.change(passInput, { target: { value: 'badpass' } });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText(/invalid admin username or password/i)).toBeDefined();
      });
    });
  });

  describe('AdminDashboard Component', () => {
    const mockDashboardData = {
      ok: true,
      rounds: {
        1: { round: 1, status: 'pending', starts_at: null, ends_at: null },
        2: { round: 2, status: 'pending', starts_at: null, ends_at: null },
      },
      presence: {
        total_teams: 5,
        logged_in: 2,
        logged_out: 3,
      },
      teams: [
        { id: 1, name: 'Team Alpha', username: 'alpha', is_active: true, is_logged_in: true, active_devices: 2 },
        { id: 2, name: 'Team Beta', username: 'beta', is_active: true, is_logged_in: false, active_devices: 0 },
      ],
    };

    it('renders top bar, KPI tiles, and 4 round buttons', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => mockDashboardData,
      });

      await act(async () => {
        render(<AdminDashboard admin={{ username: 'admin' }} onLogout={vi.fn()} />);
      });

      // Top bar title
      expect(screen.getAllByText(/curse the code/i).length).toBeGreaterThan(0);

      // Presence counts
      expect(screen.getByText('2')).toBeDefined(); // logged_in
      expect(screen.getByText('3')).toBeDefined(); // logged_out

      // Round control buttons
      expect(screen.getAllByRole('button', { name: /^start$/i }).length).toBe(2);
      expect(screen.getAllByRole('button', { name: /^end$/i }).length).toBe(2);
      expect(screen.getAllByRole('button', { name: /^pending$/i }).length).toBe(2);

      // Team presence table
      expect(screen.getByText('Team Alpha')).toBeDefined();
      expect(screen.getByText('Team Beta')).toBeDefined();
    });

    it('triggers manual round control action when button clicked', async () => {
      global.fetch.mockImplementation((url, options) => {
        if (options && options.method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: async () => ({ ok: true, round: 1, status: 'live' }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => mockDashboardData,
        });
      });

      await act(async () => {
        render(<AdminDashboard admin={{ username: 'admin' }} onLogout={vi.fn()} />);
      });

      const startButtons = screen.getAllByRole('button', { name: /start/i });
      await act(async () => {
        fireEvent.click(startButtons[0]);
      });

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/admin/rounds/control',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ action: 'start_r1' }),
        })
      );
    });

    it('handles logout button click', async () => {
      const mockLogout = vi.fn();
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => mockDashboardData,
      });

      await act(async () => {
        render(<AdminDashboard admin={{ username: 'admin' }} onLogout={mockLogout} />);
      });

      const logoutBtn = screen.getByRole('button', { name: /sign out/i });
      fireEvent.click(logoutBtn);

      expect(mockLogout).toHaveBeenCalledTimes(1);
    });

    it('triggers force logout for a team when Force Logout button clicked', async () => {
      global.fetch.mockImplementation((url, options) => {
        if (url.includes('/api/admin/teams/1/logout')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ ok: true, team_id: 1, sessions_terminated: 2 }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => mockDashboardData,
        });
      });

      await act(async () => {
        render(<AdminDashboard admin={{ username: 'admin' }} onLogout={vi.fn()} />);
      });

      const forceLogoutBtn = screen.getByRole('button', { name: /force logout/i });
      await act(async () => {
        fireEvent.click(forceLogoutBtn);
      });

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/admin/teams/1/logout',
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('previews and qualifies top N teams when clicking Preview and Qualify', async () => {
      global.fetch.mockImplementation((url, options) => {
        if (url.includes('/api/admin/qualification/preview')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              ok: true,
              count: 2,
              preview: [
                { team_id: 1, team_name: 'Team Alpha', clues_solved: 3, total_score: 30, already_qualified: false },
                { team_id: 2, team_name: 'Team Beta', clues_solved: 2, total_score: 20, already_qualified: false },
              ],
            }),
          });
        }
        if (url.includes('/api/admin/qualification/qualify')) {
          return Promise.resolve({
            ok: true,
            count: 2,
            qualified_count: 2,
            teams: [{ team_id: 1 }, { team_id: 2 }],
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => mockDashboardData,
        });
      });

      await act(async () => {
        render(<AdminDashboard admin={{ username: 'admin' }} onLogout={vi.fn()} />);
      });

      const previewBtn = screen.getByRole('button', { name: /preview n/i });
      await act(async () => {
        fireEvent.click(previewBtn);
      });

      expect(screen.getByText(/top 2 preview eligible for round 2/i)).toBeDefined();

      const qualifyBtn = screen.getByRole('button', { name: /^qualify$/i });
      await act(async () => {
        fireEvent.click(qualifyBtn);
      });

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/admin/qualification/qualify',
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('switches to Live Leaderboard view when clicking Live Leaderboard button', async () => {
      global.fetch.mockImplementation((url) => {
        if (url.includes('/api/admin/leaderboard')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              ok: true,
              round: 1,
              leaderboard: [
                { rank: 1, team_id: 1, team_name: 'Team Alpha', clues_solved: 5, total_score: 48, finished_at: null, is_qualified_r2: true },
              ],
            }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => mockDashboardData,
        });
      });

      await act(async () => {
        render(<AdminDashboard admin={{ username: 'admin' }} onLogout={vi.fn()} />);
      });

      const leaderboardBtn = screen.getByRole('button', { name: /live leaderboard/i });
      await act(async () => {
        fireEvent.click(leaderboardBtn);
      });

      expect(screen.getByText(/curse the code • live leaderboard/i)).toBeDefined();
      expect(screen.getByRole('button', { name: /back to control/i })).toBeDefined();

      // Switch back
      const backBtn = screen.getByRole('button', { name: /back to control/i });
      await act(async () => {
        fireEvent.click(backBtn);
      });

      expect(screen.getByText(/manual round controls/i)).toBeDefined();
    });
  });
});
