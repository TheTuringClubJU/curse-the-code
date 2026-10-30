import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import Lobby from '../lobby/Lobby';

describe('Lobby Component', () => {
  const mockTeam = {
    id: 1,
    name: 'techtesting1',
    members: ['Tester 1', 'Tester 2']
  };

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes('/api/lobby/state')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            ok: true,
            current_round: 1,
            round_status: 'pending',
            round_title: 'The Last Night at Hollow House',
            round_subtitle: 'Round 1',
            is_qualified_r2: false
          })
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
  });

  it('renders team name and round 1 waiting status', async () => {
    render(<Lobby team={mockTeam} onLogout={vi.fn()} />);

    // Team name should be visible
    expect(screen.getByText('techtesting1')).toBeInTheDocument();

    // Round 1 waiting message
    expect(screen.getByText(/Waiting for the organisers to start Round 1/i)).toBeInTheDocument();

    // Title should be present
    expect(screen.getAllByText(/CURSE THE CODE/i).length).toBeGreaterThan(0);
  });

  it('toggles sound button state when clicked', async () => {
    render(<Lobby team={mockTeam} onLogout={vi.fn()} />);

    const soundBtn = screen.getByTitle(/Turn Ambient Sound On/i);
    expect(soundBtn).toHaveTextContent(/Sound: Off/i);

    await fireEvent.click(soundBtn);
    await waitFor(() => {
      expect(soundBtn).toHaveTextContent(/Sound: On/i);
    });

    await fireEvent.click(soundBtn);
    await waitFor(() => {
      expect(soundBtn).toHaveTextContent(/Sound: Off/i);
    });
  });

  it('renders Round 2 Intermission state properly when round is 2', async () => {
    global.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          ok: true,
          current_round: 2,
          round_status: 'pending',
          round_title: 'The Archive',
          round_subtitle: 'Round 2',
          is_qualified_r2: true
        })
      })
    );

    render(<Lobby team={mockTeam} onLogout={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/Results are being finalised by the curators/i)).toBeInTheDocument();
    });
  });
});
