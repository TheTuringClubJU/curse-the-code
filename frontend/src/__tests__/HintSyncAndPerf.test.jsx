import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act, cleanup } from '@testing-library/react';
import HintModal from '../game/components/HintModal.jsx';
import Room1Bedroom from '../game/Room1Bedroom.jsx';
import { isBedroomLowDetail, rememberBedroomQuality } from '../game/engine/studyPerformance.js';

const mockSetBedroomQuality = vi.fn();

vi.mock('../game/engine/engine.js', () => ({
  createEngine: vi.fn((container) => {
    const canvas = document.createElement('canvas');
    container.appendChild(canvas);
    return {
      canvas,
      setPaused: vi.fn(),
      lock: vi.fn(),
      unlock: vi.fn(),
      isLocked: vi.fn(() => false),
      openDoor: vi.fn(),
      setBedroomQuality: mockSetBedroomQuality,
      dispose: vi.fn(() => {
        if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      }),
    };
  }),
}));

vi.mock('../game/engine/audio.js', () => ({
  GameAudio: class {
    start() {}
    stop() {}
    setMuted() {}
    click() {}
    good() {}
    bad() {}
    slam() {}
    dispose() {}
  },
}));

describe('Hint Sync & Room 1 Potato-PC Optimization Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('persists bedroom quality preference in localStorage and query param', () => {
    rememberBedroomQuality(true);
    expect(isBedroomLowDetail()).toBe(true);
    rememberBedroomQuality(false);
    expect(isBedroomLowDetail()).toBe(false);
    window.history.replaceState({}, '', '/?bedroomQuality=low');
    expect(isBedroomLowDetail()).toBe(true);
    window.history.replaceState({}, '', '/');
  });

  it('separates Active Hints vs Archived Hints and keeps them visible across reopen', async () => {
    const statusPayload = {
      round: 1,
      total_budget: 15,
      hints_used: 2,
      hints_remaining: 13,
      total_penalty_seconds: 40,
      unlocked_hints: [
        {
          id: 1,
          room_id: 'bedroom',
          hint_category: 'fragment',
          target_id: 'EB01',
          target_title: 'Old Trunk Fragment',
          penalty_seconds: 10,
          hint_text: 'Check inside the old trunk at the foot of the bed.',
        },
        {
          id: 2,
          room_id: 'bedroom',
          hint_category: 'clue',
          target_id: 'R1-01',
          target_title: "Lena's Diary",
          penalty_seconds: 30,
          hint_text: 'Shift letters backward by 14.',
          hint_details: {
            title: "Lena's Diary",
            location_prop: "Lena's Diary on the bed.",
            guidance: 'Shift each letter backward by Lena age 14.',
          },
        },
      ],
    };

    global.fetch = vi.fn(async (url) => {
      if (String(url).includes('/api/game/hint/status')) {
        return { ok: true, json: async () => statusPayload };
      }
      return { ok: true, json: async () => ({}) };
    });

    const { rerender } = render(
      <HintModal
        isOpen={true}
        onClose={vi.fn()}
        roomId="bedroom"
        roomTitle="Lena's Bedroom"
        collectedIds={['EB01']}
        clues={[{ id: 'R1-01', solved: false, attempts: 0, attempts_max: 3 }]}
      />
    );

    expect(await screen.findByText(/ACTIVE HINTS \(1\)/i)).toBeInTheDocument();
    expect(screen.getByText(/ARCHIVED HINTS \(1\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Shift each letter backward by Lena age 14\./i)).toBeInTheDocument();
    expect(screen.getByText(/Check inside the old trunk at the foot of the bed\./i)).toBeInTheDocument();

    // Close and reopen: cached hints stay visible immediately
    rerender(
      <HintModal
        isOpen={false}
        onClose={vi.fn()}
        roomId="bedroom"
        roomTitle="Lena's Bedroom"
        collectedIds={['EB01']}
        clues={[{ id: 'R1-01', solved: false, attempts: 0, attempts_max: 3 }]}
      />
    );
    rerender(
      <HintModal
        isOpen={true}
        onClose={vi.fn()}
        roomId="bedroom"
        roomTitle="Lena's Bedroom"
        collectedIds={['EB01']}
        clues={[{ id: 'R1-01', solved: false, attempts: 0, attempts_max: 3 }]}
      />
    );

    expect(screen.getByText(/ACTIVE HINTS \(1\)/i)).toBeInTheDocument();
    expect(screen.getByText(/ARCHIVED HINTS \(1\)/i)).toBeInTheDocument();
  });

  it('updates HintModal in a single POST round-trip without triggering redundant status refetch', async () => {
    let statusCalls = 0;
    global.fetch = vi.fn(async (url) => {
      if (String(url).includes('/api/game/hint/status')) {
        statusCalls += 1;
        return {
          ok: true,
          json: async () => ({
            total_budget: 15,
            hints_used: 0,
            hints_remaining: 15,
            total_penalty_seconds: 0,
            unlocked_hints: [],
          }),
        };
      }
      if (String(url).endsWith('/api/game/hint')) {
        return {
          ok: true,
          json: async () => ({
            success: true,
            target_id: 'EB01',
            target_title: 'Old Trunk Fragment',
            hint_category: 'fragment',
            room_id: 'bedroom',
            penalty_applied: 10,
            is_free: false,
            hints_used: 1,
            hints_remaining: 14,
            total_penalty_seconds: 10,
            hint_text: 'Look inside the dusty trunk at the foot of the bed.',
            unlocked_hints: [
              {
                id: 9,
                room_id: 'bedroom',
                hint_category: 'fragment',
                target_id: 'EB01',
                target_title: 'Old Trunk Fragment',
                hint_text: 'Look inside the dusty trunk at the foot of the bed.',
                is_resolved: false,
                is_active: true,
              },
            ],
          }),
        };
      }
      return { ok: true, json: async () => ({}) };
    });

    render(<HintModal isOpen={true} onClose={vi.fn()} roomId="bedroom" roomTitle="Lena's Bedroom" />);
    await screen.findByText(/ACTIVE HINTS \(0\)/i);
    expect(statusCalls).toBe(1);

    fireEvent.click(screen.getByRole('button', { name: /REQUEST NEXT HINT/i }));
    expect(await screen.findByText(/Look inside the dusty trunk at the foot of the bed\./i)).toBeInTheDocument();
    expect(screen.getByText(/14 \/ 15 REMAINING/i)).toBeInTheDocument();
    expect(screen.getByText(/^\+10s$/i)).toBeInTheDocument();
    // Crucial: status endpoint should NOT be hammered with a second blocking call after POST
    expect(statusCalls).toBe(1);
  });

  it('notifies teammate live when another device unlocks a hint and allows potato-PC mode toggle', async () => {
    vi.useFakeTimers();
    const roomState = {
      ok: true,
      room_id: 'bedroom',
      title: "Lena's Bedroom",
      total_fragments_in_room: 15,
      collected_fragment_ids: [],
      basket_unlocked: false,
      is_completed: false,
      clues: [],
      evidence: [],
      objects: [],
      hint_sync: { hints_used: 0, hints_remaining: 15, latest_target_id: null },
    };

    global.fetch = vi.fn(async (url) => {
      if (url === '/api/game/room/bedroom') {
        return { ok: true, json: async () => JSON.parse(JSON.stringify(roomState)) };
      }
      return { ok: true, json: async () => ({}) };
    });

    await act(async () => {
      render(<Room1Bedroom team={{ id: 7, name: 'PotatoSquad' }} onLogout={vi.fn()} />);
    });

    // Click Low (Potato PCs) button on loading screen
    const potatoBtn = screen.getByRole('button', { name: /Low \(Potato PCs\)/i });
    fireEvent.click(potatoBtn);
    expect(mockSetBedroomQuality).toHaveBeenCalledWith('low');

    // Simulate teammate unlocking a hint on Device 2
    roomState.hint_sync = { hints_used: 1, hints_remaining: 14, latest_target_id: 'EB01' };

    await act(async () => {
      vi.advanceTimersByTime(2100);
    });

    expect(screen.getByText(/Teammate unlocked a hint \(EB01\)\. Press H to view!/i)).toBeInTheDocument();
  });

  it('prevents stale background status poll from overwriting a newly requested hint', async () => {
    let resolveSlowStatus;
    let statusCall = 0;

    global.fetch = vi.fn((url) => {
      if (String(url).includes('/api/game/hint/status')) {
        statusCall += 1;
        if (statusCall === 1) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              total_budget: 15,
              hints_used: 0,
              hints_remaining: 15,
              total_penalty_seconds: 0,
              unlocked_hints: [],
            }),
          });
        }
        return new Promise((resolve) => {
          resolveSlowStatus = resolve;
        });
      }
      if (String(url).endsWith('/api/game/hint')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            target_id: 'EB02',
            target_title: 'Nightstand Fragment',
            hint_category: 'fragment',
            room_id: 'bedroom',
            penalty_applied: 10,
            is_free: false,
            hints_used: 1,
            hints_remaining: 14,
            total_penalty_seconds: 10,
            hint_text: 'Check beside the silver candlestick.',
            unlocked_hints: [
              {
                id: 2,
                room_id: 'bedroom',
                hint_category: 'fragment',
                target_id: 'EB02',
                target_title: 'Nightstand Fragment',
                hint_text: 'Check beside the silver candlestick.',
                is_resolved: false,
                is_active: true,
              },
            ],
          }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    const { rerender } = render(
      <HintModal isOpen={true} onClose={vi.fn()} roomId="bedroom" roomTitle="Lena's Bedroom" syncTrigger={0} />
    );
    await screen.findByText(/ACTIVE HINTS \(0\)/i);

    // Trigger background status fetch (starts slow in-flight poll)
    rerender(
      <HintModal isOpen={true} onClose={vi.fn()} roomId="bedroom" roomTitle="Lena's Bedroom" syncTrigger={1} />
    );
    expect(statusCall).toBe(2);

    // User immediately clicks REQUEST NEXT HINT while slow status poll is still pending
    fireEvent.click(screen.getByRole('button', { name: /REQUEST NEXT HINT/i }));
    expect(await screen.findByText(/Check beside the silver candlestick\./i)).toBeInTheDocument();
    expect(screen.getByText(/14 \/ 15 REMAINING/i)).toBeInTheDocument();

    // Now the stale pre-mutation status poll resolves with OLD empty data -> must NOT wipe EB02!
    await act(async () => {
      resolveSlowStatus({
        ok: true,
        json: async () => ({
          total_budget: 15,
          hints_used: 0,
          hints_remaining: 15,
          total_penalty_seconds: 0,
          unlocked_hints: [],
        }),
      });
    });

    expect(screen.getByText(/Check beside the silver candlestick\./i)).toBeInTheDocument();
    expect(screen.getByText(/14 \/ 15 REMAINING/i)).toBeInTheDocument();
  });
});
