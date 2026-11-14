import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

import Room2Study from '../game/Room2Study.jsx';
import Room1Bedroom from '../game/Room1Bedroom.jsx';
import BasketModal from '../game/components/BasketModal.jsx';
import TabletPasscodeModal from '../game/components/study/TabletPasscodeModal.jsx';
import CrtEmailModal from '../game/components/study/CrtEmailModal.jsx';
import CrashDumpModal from '../game/components/study/CrashDumpModal.jsx';
import LinePrinterModal from '../game/components/study/LinePrinterModal.jsx';

let activeEngineInstance = null;

const mockAudioInstance = {
  start: vi.fn(),
  stop: vi.fn(),
  setMuted: vi.fn(),
  step: vi.fn(),
  whisper: vi.fn(),
  slam: vi.fn(),
  dispose: vi.fn(),
};

vi.mock('../game/engine/engine.js', () => ({
  createEngine: vi.fn((container, config, callbacks) => {
    const canvas = document.createElement('canvas');
    container.appendChild(canvas);
    activeEngineInstance = {
      canvas,
      setPaused: vi.fn(),
      lock: vi.fn(),
      unlock: vi.fn(),
      isLocked: vi.fn(() => false),
      openDoor: vi.fn(),
      dispose: vi.fn(() => {
        if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      }),
      callbacks
    };
    return activeEngineInstance;
  })
}));

vi.mock('../game/engine/audio.js', () => ({
  GameAudio: class {
    constructor() {
      return mockAudioInstance;
    }
  }
}));

describe('Room 2 Frontend E2E & Combinatorics Test Suite', () => {
  const mockTeam = { id: 1, name: 'techtesting1' };

  beforeEach(() => {
    vi.clearAllMocks();
    activeEngineInstance = null;
  });

  it('E2E-FE-01: BasketModal does NOT display internal fragment codes (ES01, etc.) or answer leaks', () => {
    const sampleEvidence = [
      { id: 'ES01', is_wrapped: false, display: { title: 'Terminal printout' } },
      { id: 'ES06', is_wrapped: false, display: { title: 'Crash excerpt' } },
      { id: 'ES10', is_wrapped: false, display: { title: 'Access log dispatch' } },
      { id: 'ES12', is_wrapped: false, display: { title: 'Screen protector' } },
    ];

    render(
      <BasketModal
        isOpen={true}
        onClose={vi.fn()}
        evidence={sampleEvidence}
        collectedIds={['ES01', 'ES06', 'ES10', 'ES12']}
        basketUnlocked={true}
        totalInRoom={16}
        roomTitle="Daniel's Study"
      />
    );

    // Verify neutral fragment numbering is displayed instead of internal codes
    expect(screen.getByText('Fragment #1')).toBeInTheDocument();
    expect(screen.getByText('Fragment #2')).toBeInTheDocument();
    expect(screen.getByText('Fragment #3')).toBeInTheDocument();
    expect(screen.getByText('Fragment #4')).toBeInTheDocument();

    // Verify raw internal IDs are NEVER rendered as badges
    expect(screen.queryByText('ES01')).not.toBeInTheDocument();
    expect(screen.queryByText('ES06')).not.toBeInTheDocument();
    expect(screen.queryByText('ES10')).not.toBeInTheDocument();
    expect(screen.queryByText('ES12')).not.toBeInTheDocument();

    // Click to examine Fragment #2 (ES06)
    const examineButtons = screen.getAllByText(/Click to examine/i);
    fireEvent.click(examineButtons[1]);

    // Verify inspector does not leak raw answer 'ORBIT.SYS' or '💡 Hint:'
    expect(screen.queryByText(/ORBIT\.SYS/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/💡 Hint:/i)).not.toBeInTheDocument();
    expect(screen.queryByText('ES06')).not.toBeInTheDocument();
  });

  it('E2E-FE-02: Clue modals have sanitized placeholders with NO answer leaks', () => {
    const mockClue5 = { id: 'R1-05', case_file_id: 'CF-0F69', solved: false, stages: [{ prompt: 'Enter passcode' }] };
    const mockClue6 = { id: 'R1-06', case_file_id: 'CF-6E2A', solved: false, stages: [{ prompt: 'Enter word' }] };
    const mockClue7 = { id: 'R1-07', case_file_id: 'CF-3135', solved: false, stages: [{ prompt: 'Enter process' }] };
    const mockClue8 = { id: 'R1-08', case_file_id: 'CF-E0D1', solved: false, stages: [{ prompt: 'Enter source' }] };

    // Tablet Modal
    const { unmount: u1 } = render(<TabletPasscodeModal isOpen={true} onClose={vi.fn()} clue={mockClue5} onSubmitAnswer={vi.fn()} />);
    const input5 = screen.getByPlaceholderText(/Enter deduced answer/i);
    expect(input5.placeholder).not.toContain('ALPHA');
    u1();

    // CRT Email Modal
    const { unmount: u2 } = render(<CrtEmailModal isOpen={true} onClose={vi.fn()} clue={mockClue6} onSubmitAnswer={vi.fn()} />);
    const input6 = screen.getByPlaceholderText(/Enter deduced answer/i);
    expect(input6.placeholder).not.toContain('SIGNAL');
    u2();

    // Crash Dump Modal
    const { unmount: u3 } = render(<CrashDumpModal isOpen={true} onClose={vi.fn()} clue={mockClue7} onSubmitAnswer={vi.fn()} />);
    const input7 = screen.getByPlaceholderText(/Enter deduced process name/i);
    expect(input7.placeholder).not.toContain('ORBIT');
    u3();

    // Line Printer Modal
    const { unmount: u4 } = render(<LinePrinterModal isOpen={true} onClose={vi.fn()} clue={mockClue8} onSubmitAnswer={vi.fn()} />);
    const input8 = screen.getByPlaceholderText(/Enter deduced source ID/i);
    expect(input8.placeholder).not.toContain('SRC-TEST9');
    u4();
  });

  it('E2E-FE-03: Room 1 exit door directly transitions to Room 2 when room is completed', async () => {
    const mockTransition = vi.fn();

    global.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes('/api/game/room/bedroom')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            room_id: 'bedroom',
            title: "Lena's Bedroom",
            is_completed: true,
            basket_unlocked: true,
            total_fragments_in_room: 15,
            collected_fragment_ids: Array(15).fill('EB01'),
            clues: [
              { id: 'R1-01', solved: true },
              { id: 'R1-02', solved: true },
              { id: 'R1-03', solved: true },
              { id: 'R1-04', solved: true },
            ]
          })
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(
      <Room1Bedroom
        team={mockTeam}
        onLogout={vi.fn()}
        onTransitionToRoom2={mockTransition}
      />
    );

    await waitFor(() => {
      expect(activeEngineInstance).not.toBeNull();
    });

    // Simulate interacting with room_door when room is completed
    await act(async () => {
      await activeEngineInstance.callbacks.onInteract('room_door');
    });

    expect(mockTransition).toHaveBeenCalledTimes(1);
  });

  it('E2E-FE-04: Tablet modal features interactive scrap rearrangement tray', () => {
    const mockClue = { id: 'R1-05', case_file_id: 'CF-0F69', solved: false, stages: [{ prompt: 'Enter passcode' }] };

    render(<TabletPasscodeModal isOpen={true} onClose={vi.fn()} clue={mockClue} onSubmitAnswer={vi.fn()} />);

    // Click Flip button
    fireEvent.click(screen.getByText(/Flip to Back/i));

    // Initially misaligned
    expect(screen.getAllByText(/Misaligned/i).length).toBeGreaterThan(0);

    // Click Swap Positions button
    fireEvent.click(screen.getByText(/Swap Positions/i));

    // Now aligned!
    expect(screen.getByText(/Seams Aligned/i)).toBeInTheDocument();
  });

  it('E2E-FE-05: Room 2 exit door transitions to Room 3 when completed', async () => {
    const mockProceedToRoom3 = vi.fn();

    global.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes('/api/game/room/study')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            room_id: 'study',
            title: "Daniel's Study",
            is_completed: true,
            basket_unlocked: true,
            total_fragments_in_room: 16,
            collected_fragment_ids: Array(16).fill('ES01'),
            clues: [
              { id: 'R1-05', solved: true },
              { id: 'R1-06', solved: true },
              { id: 'R1-07', solved: true },
              { id: 'R1-08', solved: true },
            ]
          })
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(
      <Room2Study
        team={mockTeam}
        onLogout={vi.fn()}
        onTransitionToRoom3={mockProceedToRoom3}
      />
    );

    await waitFor(() => {
      expect(activeEngineInstance).not.toBeNull();
    });

    // Interacting with study_door_exit when is_completed=true triggers transition to Room 3
    await act(async () => {
      await activeEngineInstance.callbacks.onInteract('study_door_exit');
    });

    expect(mockProceedToRoom3).toHaveBeenCalledTimes(1);
  });
});
