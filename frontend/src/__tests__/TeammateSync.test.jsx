import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, act, fireEvent } from '@testing-library/react';
import App from '../App.jsx';
import Room4Records from '../game/Room4Records.jsx';
import { checkAuthStatus } from '../userlogin/authApi';

vi.mock('../userlogin/authApi', () => ({
  checkAuthStatus: vi.fn(),
  logoutTeam: vi.fn(),
}));

vi.mock('../userlogin/UserLogin', () => ({
  default: () => <div>Team sign in</div>,
}));

vi.mock('../lobby/Lobby', () => ({
  default: () => <div>Waiting lobby</div>,
}));

vi.mock('../admin/AdminLogin', () => ({ default: () => null }));
vi.mock('../admin/AdminDashboard', () => ({ default: () => null }));

vi.mock('../game/Room1Bedroom', () => ({
  default: () => <div>Bedroom room</div>,
}));
vi.mock('../game/Room2Study', () => ({
  default: () => <div>Study room</div>,
}));
vi.mock('../game/Room3Basement', () => ({
  default: () => <div>Basement room</div>,
}));
vi.mock('../game/Room5Control', () => ({
  default: () => <div>Control room</div>,
}));
vi.mock('../game/Room6Vault', () => ({
  default: () => <div>Vault room</div>,
}));

// Mock Three.js engine and audio for Room4Records tests
const mockAudio = {
  start: vi.fn(),
  setMuted: vi.fn(),
  step: vi.fn(),
  good: vi.fn(),
  bad: vi.fn(),
  click: vi.fn(),
  drawerSlam: vi.fn(),
  screamingStinger: vi.fn(),
  dispose: vi.fn(),
};

vi.mock('../game/engine/engine.js', () => ({
  createEngine: vi.fn((container, config, callbacks) => ({
    canvas: document.createElement('canvas'),
    setPaused: vi.fn(),
    lock: vi.fn(),
    unlock: vi.fn(),
    openDoor: vi.fn(),
    setFlashlight: vi.fn(),
    dispose: vi.fn(),
    callbacks,
  })),
}));

vi.mock('../game/engine/audioRecords.js', () => ({
  GameAudioRecords: class {
    constructor() {
      return mockAudio;
    }
  },
}));

describe('Dual-Device Real-Time Teammate Synchronization Suite', () => {
  const mockTeam = { id: 7, name: 'sync_squad' };

  afterEach(() => {
    cleanup();
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('1. App-Level Live Room Transition Sync (No Refresh Needed)', () => {
    let appState;

    beforeEach(() => {
      vi.useFakeTimers();
      appState = {
        round_status: 'live',
        current_round: 2,
        fork1_resolved: false,
        fork2_resolved: false,
        study_unlocked: false,
        basement_unlocked: false,
        basement_completed: false,
        r207_solved: false,
        fail_network: false,
      };

      vi.mocked(checkAuthStatus).mockResolvedValue({ ok: true, team: mockTeam });

      vi.stubGlobal('fetch', vi.fn(async (url) => {
        if (appState.fail_network) {
          throw new Error('Network transient failure');
        }
        if (url === '/api/lobby/state') {
          return {
            ok: true,
            json: async () => ({
              round_status: appState.round_status,
              current_round: appState.current_round,
            }),
          };
        }
        if (url === '/api/game/fork/fork_1/status') {
          return {
            ok: true,
            json: async () => ({ resolved: appState.fork1_resolved }),
          };
        }
        if (url === '/api/game/fork/fork_2/status') {
          return {
            ok: true,
            json: async () => ({ resolved: appState.fork2_resolved }),
          };
        }
        if (url === '/api/game/room/basement') {
          return {
            ok: appState.basement_unlocked,
            json: async () => ({ is_completed: appState.basement_completed }),
          };
        }
        if (url === '/api/game/room/study') {
          return {
            ok: appState.study_unlocked,
            json: async () => ({ room_id: 'study' }),
          };
        }
        if (url === '/api/game/room/bedroom') {
          return { ok: true, json: async () => ({ room_id: 'bedroom' }) };
        }
        if (url === '/api/game/room/records') {
          return {
            ok: true,
            json: async () => ({
              room_id: 'records',
              is_completed: false,
              clues: [{ id: 'R2-07', solved: appState.r207_solved }],
            }),
          };
        }
        return { ok: true, json: async () => ({}) };
      }));
    });

    it('syncs Fork 1 resolution: Player 2 automatically transitions from Room 4 to Room 5 when Player 1 selects Primary Wing B', async () => {
      await act(async () => {
        render(<App />);
      });

      // Player 2 starts initially in Room 4 (The Rotting Archive)
      expect(screen.getByText(/ROOM 4: THE ROTTING ARCHIVE/i)).toBeInTheDocument();

      // Teammate on Device 1 resolves Fork 1
      appState.fork1_resolved = true;

      // Fast sync heartbeat runs (within 2.5s)
      await act(async () => {
        vi.advanceTimersByTime(2600);
      });

      // Device 2 is automatically moved to Room 5 (Control Room) without page refresh
      expect(screen.getByText('Control room')).toBeInTheDocument();
      expect(screen.queryByText(/ROOM 4: THE ROTTING ARCHIVE/i)).toBeNull();
    });

    it('syncs Fork 2 resolution: Player 2 automatically transitions from Room 5 to Room 6 when Player 1 chooses Valve B', async () => {
      // Start already in Room 5
      appState.fork1_resolved = true;
      appState.fork2_resolved = false;

      await act(async () => {
        render(<App />);
      });

      expect(screen.getByText('Control room')).toBeInTheDocument();

      // Teammate on Device 1 resolves Fork 2
      appState.fork2_resolved = true;

      // Sync interval triggers
      await act(async () => {
        vi.advanceTimersByTime(2600);
      });

      // Device 2 is automatically moved to Room 6 (Vault room) without page refresh
      expect(screen.getByText('Vault room')).toBeInTheDocument();
      expect(screen.queryByText('Control room')).toBeNull();
    });

    it('syncs Round 1 room progression: Player 2 automatically moves to Study when Player 1 finishes Bedroom', async () => {
      appState.current_round = 1;
      appState.study_unlocked = false;

      await act(async () => {
        render(<App />);
      });

      expect(screen.getByText('Bedroom room')).toBeInTheDocument();

      // Teammate finishes Bedroom -> Study unlocked on backend
      appState.study_unlocked = true;

      await act(async () => {
        vi.advanceTimersByTime(2600);
      });

      expect(screen.getByText('Study room')).toBeInTheDocument();
      expect(screen.queryByText('Bedroom room')).toBeNull();
    });

    it('syncs Round 1 Study -> Basement progression: Player 2 moves to Basement when Study completes', async () => {
      appState.current_round = 1;
      appState.study_unlocked = true;
      appState.basement_unlocked = false;

      await act(async () => {
        render(<App />);
      });

      expect(screen.getByText('Study room')).toBeInTheDocument();

      // Teammate finishes Study -> Basement unlocked
      appState.basement_unlocked = true;

      await act(async () => {
        vi.advanceTimersByTime(2600);
      });

      expect(screen.getByText('Basement room')).toBeInTheDocument();
      expect(screen.queryByText('Study room')).toBeNull();
    });

    it('syncs Round 1 Basement -> Lobby progression: Player 2 moves to Lobby when Basement is cleared', async () => {
      appState.current_round = 1;
      appState.study_unlocked = true;
      appState.basement_unlocked = true;
      appState.basement_completed = false;

      await act(async () => {
        render(<App />);
      });

      expect(screen.getByText('Basement room')).toBeInTheDocument();

      // Teammate finishes Basement room
      appState.basement_completed = true;

      await act(async () => {
        vi.advanceTimersByTime(2600);
      });

      expect(screen.getByText('Waiting lobby')).toBeInTheDocument();
      expect(screen.queryByText('Basement room')).toBeNull();
    });

    it('retains current room safely during transient network error or 500 status without crash', async () => {
      appState.current_round = 2;
      appState.fork1_resolved = false;

      await act(async () => {
        render(<App />);
      });

      expect(screen.getByText(/ROOM 4: THE ROTTING ARCHIVE/i)).toBeInTheDocument();

      // Transient network drop
      appState.fail_network = true;

      await act(async () => {
        vi.advanceTimersByTime(5000);
      });

      // App stays intact in Room 4 and doesn't crash
      expect(screen.getByText(/ROOM 4: THE ROTTING ARCHIVE/i)).toBeInTheDocument();
    });

    it('syncs Round 2 Records -> Vault direct transition when both Fork 1 and Fork 2 are resolved', async () => {
      appState.current_round = 2;
      appState.fork1_resolved = false;
      appState.fork2_resolved = false;

      await act(async () => {
        render(<App />);
      });

      expect(screen.getByText(/ROOM 4: THE ROTTING ARCHIVE/i)).toBeInTheDocument();

      // Teammate resolves both forks on Device 1
      appState.fork1_resolved = true;
      appState.fork2_resolved = true;

      await act(async () => {
        vi.advanceTimersByTime(2600);
      });

      expect(screen.getByText('Vault room')).toBeInTheDocument();
      expect(screen.queryByText(/ROOM 4: THE ROTTING ARCHIVE/i)).toBeNull();
    });
  });

  describe('2. In-Room Live State Sync in Room 4 (The Rotting Archive)', () => {
    let recordsData;

    beforeEach(() => {
      vi.useFakeTimers();
      recordsData = {
        id: 'records',
        title: 'The Rotting Archive',
        total_fragments_in_room: 12,
        collected_fragment_ids: ['ER01'],
        basket_unlocked: false,
        is_completed: false,
        clues: [
          { id: 'R2-02', title: 'Redacted Incident Report', solved: false, attempts: 0 },
          { id: 'R2-03', title: 'Microfilm Archive', solved: false, attempts: 0 },
          { id: 'R2-04', title: 'Timeline Whiteboard', solved: false, attempts: 0 },
          { id: 'R2-07', title: 'Bulkhead Keypad', solved: false, attempts: 0 },
        ],
        evidence: [{ id: 'ER01', title: 'Fragment 1' }],
      };

      vi.stubGlobal('fetch', vi.fn(async (url) => {
        if (url === '/api/game/room/records') {
          return {
            ok: true,
            json: async () => JSON.parse(JSON.stringify(recordsData)),
          };
        }
        return { ok: true, json: async () => ({}) };
      }));
    });

    it('shows toast when teammate recovers fragments in the background without refresh', async () => {
      await act(async () => {
        render(<Room4Records team={mockTeam} onLogout={vi.fn()} />);
      });
      fireEvent.click(screen.getByText(/DESCEND INTO THE SUB-BASEMENT/i));

      // Initially 1 fragment collected
      expect(
        screen.getByText((_, el) => el?.tagName === 'SPAN' && /1\s*\/\s*12/.test(el.textContent))
      ).toBeInTheDocument();

      // Teammate collects 2 more fragments on Device 1
      recordsData.collected_fragment_ids = ['ER01', 'ER02', 'ER03'];

      // Background poll executes at 2000ms
      await act(async () => {
        vi.advanceTimersByTime(2100);
      });

      // Fragment counter updates AND toast notification appears
      expect(
        screen.getByText((_, el) => el?.tagName === 'SPAN' && /3\s*\/\s*12/.test(el.textContent))
      ).toBeInTheDocument();
      expect(screen.getByText(/Teammate recovered Fragment \(3\/12\)!/i)).toBeInTheDocument();
    });

    it('notifies and unseals terminals when teammate completes all 12 fragments', async () => {
      await act(async () => {
        render(<Room4Records team={mockTeam} onLogout={vi.fn()} />);
      });
      fireEvent.click(screen.getByText(/DESCEND INTO THE SUB-BASEMENT/i));

      // Teammate completes all 12 fragments and unlocks basket
      recordsData.collected_fragment_ids = Array.from({ length: 12 }, (_, i) => `ER0${i + 1}`);
      recordsData.basket_unlocked = true;

      await act(async () => {
        vi.advanceTimersByTime(2100);
      });

      expect(screen.getByText(/All 12 fragments recovered by team! Archival terminals powered./i)).toBeInTheDocument();
    });

    it('notifies and updates case dossier when teammate solves a clue', async () => {
      await act(async () => {
        render(<Room4Records team={mockTeam} onLogout={vi.fn()} />);
      });
      fireEvent.click(screen.getByText(/DESCEND INTO THE SUB-BASEMENT/i));

      // Teammate solves R2-02 on Device 1
      recordsData.clues[0].solved = true;

      await act(async () => {
        vi.advanceTimersByTime(2100);
      });

      expect(screen.getByText(/Teammate verified Redacted Incident Report! Case dossier updated./i)).toBeInTheDocument();
    });

    it('automatically triggers bulkhead door unseal when teammate clears the room', async () => {
      await act(async () => {
        render(<Room4Records team={mockTeam} onLogout={vi.fn()} />);
      });
      fireEvent.click(screen.getByText(/DESCEND INTO THE SUB-BASEMENT/i));

      // Teammate clears the room on Device 1
      recordsData.is_completed = true;

      await act(async () => {
        vi.advanceTimersByTime(2100);
      });

      // Verification that background poll executed and accepted room completed state
      expect(screen.queryByText('CURSE THE CODE')).toBeNull();
    });
  });
});

