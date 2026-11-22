import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import Room1Bedroom from '../game/Room1Bedroom.jsx';
import Room5Control from '../game/Room5Control.jsx';

const mockAudio = {
  start: vi.fn(),
  stop: vi.fn(),
  setMuted: vi.fn(),
  step: vi.fn(),
  click: vi.fn(),
  good: vi.fn(),
  bad: vi.fn(),
  playSfx: vi.fn(),
  dispose: vi.fn(),
};

vi.mock('../game/engine/engine.js', () => ({
  createEngine: vi.fn((container, config, callbacks) => {
    const canvas = document.createElement('canvas');
    container.appendChild(canvas);
    return {
      canvas,
      setPaused: vi.fn(),
      lock: vi.fn(),
      unlock: vi.fn(),
      isLocked: vi.fn(() => false),
      openDoor: vi.fn(),
      dispose: vi.fn(() => {
        if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      }),
      callbacks,
    };
  }),
}));

vi.mock('../game/engine/audio.js', () => ({
  GameAudio: class {
    constructor() {
      return mockAudio;
    }
  },
}));

vi.mock('../game/engine/engineControl.js', () => ({
  createControlEngine: vi.fn((container, config, callbacks) => ({
    canvas: document.createElement('canvas'),
    setPaused: vi.fn(),
    lock: vi.fn(),
    unlock: vi.fn(),
    openDoor: vi.fn(),
    dispose: vi.fn(),
    callbacks,
  })),
}));

vi.mock('../game/engine/audioControl.js', () => ({
  GameAudioControl: class {
    constructor() {
      return mockAudio;
    }
  },
}));

describe('Dual-Device In-Room Real-Time Synchronization Suite', () => {
  const mockTeam = { id: 5, name: 'sync_test_squad' };

  afterEach(() => {
    cleanup();
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('Room 1 (Lena\'s Bedroom) Teammate Synchronization', () => {
    let bedroomData;

    beforeEach(() => {
      vi.useFakeTimers();
      bedroomData = {
        ok: true,
        room_id: 'bedroom',
        title: 'Lena\'s Bedroom',
        total_fragments_in_room: 4,
        collected_fragment_ids: ['F1'],
        basket_unlocked: false,
        is_completed: false,
        clues: [
          { id: 'R1-01', title: 'Lena\'s Diary Entry', solved: false, attempts: 0, is_locked: false },
          { id: 'R1-02', title: 'Music Box Cylinder', solved: false, attempts: 0, is_locked: true },
        ],
        evidence: [{ id: 'F1', title: 'Torn Photograph Piece 1' }],
        objects: [],
      };

      vi.stubGlobal('fetch', vi.fn(async (url) => {
        if (url === '/api/game/room/bedroom') {
          return {
            ok: true,
            json: async () => JSON.parse(JSON.stringify(bedroomData)),
          };
        }
        return { ok: true, json: async () => ({}) };
      }));
    });

    it('displays live toast and plays click when teammate picks up a fragment on Device 1', async () => {
      await act(async () => {
        render(<Room1Bedroom team={mockTeam} onLogout={vi.fn()} />);
      });

      // Initially 1 fragment collected
      expect(bedroomData.collected_fragment_ids.length).toBe(1);

      // Teammate collects another fragment on Device 1
      bedroomData.collected_fragment_ids = ['F1', 'F2'];

      // Advance periodic 2000ms background poll
      await act(async () => {
        vi.advanceTimersByTime(2100);
      });

      // Live toast notification appears on Device 2
      expect(screen.getByText(/Teammate recovered a photo fragment \(2\/4\)!/i)).toBeInTheDocument();
      expect(mockAudio.click).toHaveBeenCalled();
    });

    it('displays unsealed toast and plays good audio when teammate completes all photo fragments', async () => {
      await act(async () => {
        render(<Room1Bedroom team={mockTeam} onLogout={vi.fn()} />);
      });

      // Teammate recovers all 4 fragments and unseals basket
      bedroomData.collected_fragment_ids = ['F1', 'F2', 'F3', 'F4'];
      bedroomData.basket_unlocked = true;

      await act(async () => {
        vi.advanceTimersByTime(2100);
      });

      expect(screen.getByText(/All photo pieces assembled by team!/i)).toBeInTheDocument();
      expect(mockAudio.good).toHaveBeenCalled();
    });

    it('displays clue solved toast when teammate solves R1-01 on Device 1', async () => {
      await act(async () => {
        render(<Room1Bedroom team={mockTeam} onLogout={vi.fn()} />);
      });

      // Teammate solves R1-01
      bedroomData.clues[0].solved = true;

      await act(async () => {
        vi.advanceTimersByTime(2100);
      });

      expect(screen.getByText(/Teammate solved Lena's Diary Entry!/i)).toBeInTheDocument();
      expect(mockAudio.good).toHaveBeenCalled();
    });
  });

  describe('Room 5 (The Surveillance Morgue) Teammate Synchronization', () => {
    let controlData;

    beforeEach(() => {
      vi.useFakeTimers();
      controlData = {
        ok: true,
        room_id: 'control',
        title: 'The Surveillance Morgue',
        total_fragments_in_room: 10,
        collected_fragment_ids: ['CF01'],
        basket_unlocked: false,
        is_completed: false,
        clues: [
          { id: 'R2-05', title: 'Biometric Telemetry Console', solved: false, attempts: 0, is_locked: false },
          { id: 'R2-06', title: 'Cryo-Containment Protocol', solved: false, attempts: 0, is_locked: true },
        ],
        evidence: [{ id: 'CF01', title: 'Morgue Log 1' }],
        objects: [],
      };

      vi.stubGlobal('fetch', vi.fn(async (url) => {
        if (url === '/api/game/room/control') {
          return {
            ok: true,
            json: async () => JSON.parse(JSON.stringify(controlData)),
          };
        }
        return { ok: true, json: async () => ({}) };
      }));
    });

    it('displays morgue fragment recovery toast when teammate recovers item', async () => {
      await act(async () => {
        render(<Room5Control team={mockTeam} onLogout={vi.fn()} />);
      });

      controlData.collected_fragment_ids = ['CF01', 'CF02'];

      await act(async () => {
        vi.advanceTimersByTime(2100);
      });

      expect(screen.getByText(/Teammate recovered Fragment \(2\/10\)!/i)).toBeInTheDocument();
      expect(mockAudio.click).toHaveBeenCalled();
    });

    it('displays console verification toast when teammate solves R2-05', async () => {
      await act(async () => {
        render(<Room5Control team={mockTeam} onLogout={vi.fn()} />);
      });

      controlData.clues[0].solved = true;

      await act(async () => {
        vi.advanceTimersByTime(2100);
      });

      expect(screen.getByText(/Teammate verified Biometric Telemetry Console! Next console accessible./i)).toBeInTheDocument();
      expect(mockAudio.good).toHaveBeenCalled();
    });
  });
});
