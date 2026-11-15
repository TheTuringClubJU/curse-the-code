import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

import Room6Vault from '../game/Room6Vault.jsx';
import HUDVault from '../game/components/vault/HUDVault.jsx';
import ManualDiffModal from '../game/components/vault/ManualDiffModal.jsx';
import FailsafeCircuitModal from '../game/components/vault/FailsafeCircuitModal.jsx';
import CentralConsoleModal from '../game/components/vault/CentralConsoleModal.jsx';
import VaultDossierModal from '../game/components/vault/VaultDossierModal.jsx';
import vaultConfig from '../game/rooms/vault.js';
import { GameAudioVault } from '../game/engine/audioVault.js';

let activeEngineInstance = null;

const mockAudioInstance = {
  start: vi.fn(),
  ensureActive: vi.fn(),
  setTension: vi.fn(),
  stopCorePulse: vi.fn(),
  setMuted: vi.fn(),
  listen: vi.fn(),
  flapClack: vi.fn(),
  clang: vi.fn(),
  keystroke: vi.fn(),
  creak: vi.fn(),
  step: vi.fn(),
  click: vi.fn(),
  good: vi.fn(),
  bad: vi.fn(),
  scareHit: vi.fn(),
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
      setFlashlight: vi.fn(),
      isFlashlightOn: vi.fn(() => false),
      setCountdown: vi.fn(),
      restoreContainment: vi.fn(),
      triggerScare: vi.fn((name) => name === 'core_glass'),
      scares: {
        onCoreGlassInspect: vi.fn(),
        onConsoleReject: vi.fn(),
        dispose: vi.fn(),
      },
      dispose: vi.fn(() => {
        if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      }),
      callbacks,
    };
    return activeEngineInstance;
  }),
}));

vi.mock('../game/engine/audioVault.js', async () => {
  const actual = await vi.importActual('../game/engine/audioVault.js');
  return {
    ...actual,
    GameAudioVault: class {
      constructor() {
        return mockAudioInstance;
      }
    },
  };
});

function buildVaultRoomPayload(overrides = {}) {
  return {
    ok: true,
    room_id: 'vault',
    title: 'The Anointing Vault',
    round: 2,
    basket_unlocked: false,
    is_completed: false,
    clues: [
      {
        id: 'R2-08',
        object_id: 'manual_terminal',
        title: 'Containment Manual Diff',
        scene_text: 'Compare the original containment manual against the encrypted revision.',
        solved: false,
        attempts: 0,
        attempts_max: 3,
        locked: false,
        payload: {
          manual_plain: ['STEP 1 RESET VALVE', 'STEP 2 OPEN BYPASS'],
          manual_encrypted: ['STEP 1 LOCK VALVE', 'STEP 2 PURGE CORE'],
        },
        stages: [
          {
            fields: [
              {
                key: 'steps',
                label: 'Tampered steps',
                placeholder: 'e.g. 26',
              },
            ],
          },
        ],
      },
      {
        id: 'R2-09',
        object_id: 'failsafe_panel',
        title: 'Failsafe Logic Panel',
        scene_text: 'Align all four pairs of knife switches to yield the live override code.',
        solved: false,
        attempts: 0,
        attempts_max: 3,
        locked: false,
        payload: {
          panel_note: 'PAIRS A & B FEED STAGE 1 // PAIRS C & D COMPLETE INTERLOCK',
          circuit: {
            inputs: ['A1', 'A0', 'B1', 'B0', 'C1', 'C0', 'D1', 'D0'],
            gates: [
              { id: 'G1', type: 'AND', in: ['A1', 'A0'] },
              { id: 'G2', type: 'XOR', in: ['B1', 'B0'] },
              { id: 'G3', type: 'OR', in: ['C1', 'C0'] },
              { id: 'G4', type: 'NAND', in: ['D1', 'D0'] },
            ],
            outputs: ['G1', 'G2', 'G3', 'G4'],
          },
        },
        stages: [{ fields: [{ key: 'code', label: '4-bit Override', placeholder: 'e.g. 1011' }] }],
      },
      {
        id: 'R2-10',
        object_id: 'central_console',
        title: 'Monolithic Altar Console',
        scene_text: 'Authenticate clean steps, override code, and operator badge together.',
        solved: false,
        attempts: 0,
        attempts_max: 3,
        locked: true,
        lock_reason: 'Resolve R2-08 and R2-09 before accessing Central Console.',
        stages: [],
      },
    ],
    ...overrides,
  };
}

describe('Room 6 (The Anointing Vault) Comprehensive Test Suite', () => {
  const mockTeam = { id: 7, name: 'vault_testers' };
  let vaultState;
  let remainingSeconds;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('ctc_token', 'test-vault-token');
    vaultState = buildVaultRoomPayload();
    remainingSeconds = 605; // 10:05

    global.fetch = vi.fn(async (url, opts = {}) => {
      const u = String(url);
      if (u.includes('/api/game/room/vault')) {
        return new Response(JSON.stringify(vaultState), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (u.includes('/api/game/time')) {
        return new Response(
          JSON.stringify({ remaining_seconds: remainingSeconds, server_time: '2026-11-14T22:00:00Z' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (u.includes('/api/game/round/2/dossier')) {
        return new Response(
          JSON.stringify({
            ok: true,
            records: [
              {
                clue_id: 'R2-08',
                title: 'Containment Manual Diff',
                case_file_id: 'CF-R208',
                room: 'vault',
                solved: vaultState.clues[0].solved,
                attempts: vaultState.clues[0].attempts,
                attempts_max: 3,
                reveal: vaultState.clues[0].solved ? { steps: '1357' } : null,
              },
              {
                clue_id: 'R2-09',
                title: 'Failsafe Logic Panel',
                case_file_id: 'CF-R209',
                room: 'vault',
                solved: vaultState.clues[1].solved,
                attempts: vaultState.clues[1].attempts,
                attempts_max: 3,
                reveal: vaultState.clues[1].solved ? { code: '1111' } : null,
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (u.includes('/api/game/hint/status')) {
        return new Response(
          JSON.stringify({
            ok: true,
            hints_remaining: 3,
            hints_used: 0,
            max_hints: 3,
            history: [],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (u.includes('/api/game/clue/R2-08/submit')) {
        const body = JSON.parse(opts.body || '{}');
        if (body.answer === '1357') {
          vaultState.clues[0].solved = true;
          return new Response(
            JSON.stringify({
              ok: true,
              correct: true,
              solved: true,
              message: 'Manual checksum accepted.',
              reveal: { steps: '1357' },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
        vaultState.clues[0].attempts += 1;
        return new Response(
          JSON.stringify({ ok: false, correct: false, solved: false, message: 'Diff mismatch.' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (u.includes('/api/game/clue/R2-09/submit')) {
        const body = JSON.parse(opts.body || '{}');
        if (body.answer === '1111') {
          vaultState.clues[1].solved = true;
          vaultState.clues[2].locked = false;
          return new Response(
            JSON.stringify({
              ok: true,
              correct: true,
              solved: true,
              message: 'Failsafe relay latched.',
              reveal: { code: '1111' },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
        vaultState.clues[1].attempts += 1;
        return new Response(
          JSON.stringify({ ok: false, correct: false, solved: false, message: 'Bitmask invalid.' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (u.includes('/api/game/clue/R2-10/submit')) {
        const body = JSON.parse(opts.body || '{}');
        if (body.steps === '1357' && body.code === '1111' && body.badge === 'OP-42') {
          vaultState.clues[2].solved = true;
          vaultState.is_completed = true;
          return new Response(
            JSON.stringify({
              ok: true,
              correct: true,
              solved: true,
              room_completed: true,
              round_completed: true,
              story_text: 'All containment rings locked into synchronous phase.',
              message: 'Containment restored!',
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
        vaultState.clues[2].attempts += 1;
        return new Response(
          JSON.stringify({
            ok: false,
            correct: false,
            solved: false,
            message: 'Credential triplet mismatch.',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('defines accurate Room 6 vault config with noFlashlight and all 5 interactables', () => {
    expect(vaultConfig.id).toBe('vault');
    expect(vaultConfig.noFlashlight).toBe(true);
    expect(Object.keys(vaultConfig.interact)).toEqual(
      expect.arrayContaining([
        'core_glass',
        'countdown_timer',
        'manual_terminal',
        'failsafe_panel',
        'central_console',
      ])
    );
  });

  it('initializes Room6Vault engine, fetches /api/game/room/vault & /api/game/time, and syncs 3D countdown', async () => {
    render(<Room6Vault team={mockTeam} onLogout={vi.fn()} />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/game/room/vault',
        expect.objectContaining({ credentials: 'include' })
      );
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/game/time',
        expect.objectContaining({ credentials: 'include' })
      );
    });

    await waitFor(() => {
      expect(activeEngineInstance.setCountdown).toHaveBeenCalledWith('10:05', false);
    });
  });

  it('cleans up engine and audio on unmount', async () => {
    const { unmount } = render(<Room6Vault team={mockTeam} onLogout={vi.fn()} />);
    await waitFor(() => expect(activeEngineInstance).not.toBeNull());
    unmount();
    expect(activeEngineInstance.dispose).toHaveBeenCalled();
    expect(mockAudioInstance.dispose).toHaveBeenCalled();
  });

  it('renders HUDVault without a 2D countdown timer and reports dead torch (0%) on [F]', async () => {
    render(<Room6Vault team={mockTeam} onLogout={vi.fn()} />);
    await waitFor(() =>
      expect(screen.getAllByText(/The Anointing Vault/i).length).toBeGreaterThan(0)
    );

    expect(screen.queryByText(/10:05/)).not.toBeInTheDocument();

    fireEvent.keyDown(window, { code: 'KeyF' });
    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(/Torch battery dead \(0%\)/i);
    });
  });

  it('clacks split-flap board audio when countdown second changes on poll', async () => {
    vi.useFakeTimers();
    render(<Room6Vault team={mockTeam} onLogout={vi.fn()} />);

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(activeEngineInstance.setCountdown).toHaveBeenCalledWith('10:05', false);

    remainingSeconds = 604;
    await act(async () => {
      vi.advanceTimersByTime(1000);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(activeEngineInstance.setCountdown).toHaveBeenCalledWith('10:04', false);
    expect(mockAudioInstance.flapClack).toHaveBeenCalled();
  });

  it('triggers core_glass scare and countdown_timer notice when interacted with in 3D', async () => {
    render(<Room6Vault team={mockTeam} onLogout={vi.fn()} />);
    await waitFor(() => expect(activeEngineInstance).not.toBeNull());

    act(() => {
      activeEngineInstance.callbacks.onTarget?.('central_console');
    });
    expect(screen.getByText(/Engage Central Containment Altar/i)).toBeInTheDocument();

    act(() => {
      activeEngineInstance.callbacks.onInteract('core_glass');
    });
    expect(activeEngineInstance.triggerScare).toHaveBeenCalledWith('core_glass');
    expect(screen.getByRole('status')).toHaveTextContent(/reinforced glass/i);

    act(() => {
      activeEngineInstance.callbacks.onInteract('countdown_timer');
    });
    expect(screen.getByRole('status')).toHaveTextContent(/Split-flap containment clock/i);
    expect(mockAudioInstance.flapClack).toHaveBeenCalled();
  });

  it('opens VaultDossierModal on [C] and lets user jump to a Vault terminal', async () => {
    render(<Room6Vault team={mockTeam} onLogout={vi.fn()} />);
    await waitFor(() => expect(activeEngineInstance).not.toBeNull());

    fireEvent.keyDown(window, { code: 'KeyC' });
    await waitFor(() => {
      expect(screen.getByText(/CASE DOSSIER \/\/ ROUND 2/i)).toBeInTheDocument();
      expect(screen.getByText(/Containment Manual Diff/i)).toBeInTheDocument();
    });

    fireEvent.keyDown(window, { code: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByText(/CASE DOSSIER \/\/ ROUND 2/i)).not.toBeInTheDocument();
    });
  });

  it('opens HintModal on [H] and closes on Escape', async () => {
    render(<Room6Vault team={mockTeam} onLogout={vi.fn()} />);
    await waitFor(() => expect(activeEngineInstance).not.toBeNull());

    fireEvent.keyDown(window, { code: 'KeyH' });
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/game/hint/status',
        expect.any(Object)
      );
    });

    fireEvent.keyDown(window, { code: 'Escape' });
  });

  it('handles R2-08 ManualDiffModal open, copy text, and correct answer submission', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(<Room6Vault team={mockTeam} onLogout={vi.fn()} />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/game/room/vault', expect.any(Object)));

    act(() => {
      activeEngineInstance.callbacks.onInteract('manual_terminal');
    });

    await waitFor(() => {
      expect(screen.getByText(/Containment Manual Diff \(R2-08\)/i)).toBeInTheDocument();
    });

    const copyBtn = screen.getByRole('button', { name: /COPY/i });
    fireEvent.click(copyBtn);
    expect(writeText).toHaveBeenCalledWith('STEP 1 LOCK VALVE\nSTEP 2 PURGE CORE');

    const input = screen.getByPlaceholderText(/e\.g\. 26/i);
    fireEvent.change(input, { target: { value: '1357' } });
    fireEvent.submit(input.closest('form'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/game/clue/R2-08/submit',
        expect.objectContaining({ method: 'POST', body: JSON.stringify({ answer: '1357' }) })
      );
      expect(mockAudioInstance.good).toHaveBeenCalled();
    });
  });

  it('evaluates R2-09 FailsafeCircuitModal gates dynamically and submits valid 4-bit code', async () => {
    render(<Room6Vault team={mockTeam} onLogout={vi.fn()} />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/game/room/vault', expect.any(Object)));

    act(() => {
      activeEngineInstance.callbacks.onInteract('failsafe_panel');
    });

    await waitFor(() => {
      expect(screen.getByText(/Failsafe Logic Panel \(R2-09\)/i)).toBeInTheDocument();
    });

    // Initially all 0: AND(0,0)=0, XOR(0,0)=0, OR(0,0)=0, NAND(0,0)=1 => 0001
    // Toggle A1, A0, B1, C1 => AND=1, XOR=1, OR=1, NAND=1 => 1111
    fireEvent.click(screen.getByRole('button', { name: 'Toggle switch A1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Toggle switch A0' }));
    fireEvent.click(screen.getByRole('button', { name: 'Toggle switch B1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Toggle switch C1' }));
    expect(mockAudioInstance.clang).toHaveBeenCalledTimes(4);

    const loadBtn = screen.getByRole('button', { name: /LOAD CODE/i });
    fireEvent.click(loadBtn);

    fireEvent.click(screen.getByRole('button', { name: /TRANSMIT CODE/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/game/clue/R2-09/submit',
        expect.objectContaining({ method: 'POST', body: JSON.stringify({ answer: '1111' }) })
      );
      expect(mockAudioInstance.good).toHaveBeenCalled();
    });
  });

  it('shows interlocked view on R2-10 before prerequisite clues are solved', async () => {
    render(<Room6Vault team={mockTeam} onLogout={vi.fn()} />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/game/room/vault', expect.any(Object)));

    act(() => {
      activeEngineInstance.callbacks.onInteract('central_console');
    });

    await waitFor(() => {
      expect(screen.getByText(/CENTRAL CONSOLE INTERLOCKED \(R2-10\)/i)).toBeInTheDocument();
    });
  });

  it('handles R2-10 rejection RGB scan tear followed by valid compound submission & victory restoration', async () => {
    vaultState.clues[2].locked = false;
    render(<Room6Vault team={mockTeam} onLogout={vi.fn()} />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/game/room/vault', expect.any(Object)));

    act(() => {
      activeEngineInstance.callbacks.onInteract('central_console');
    });

    await waitFor(() => {
      expect(screen.getByText(/ENTER CONTAINMENT CODE/i)).toBeInTheDocument();
    });

    const stepsInput = screen.getByLabelText('Clean protocol steps');
    const codeInput = screen.getByLabelText('Authorization code');
    const badgeInput = screen.getByLabelText('Operator badge');

    // Wrong attempt -> scan tear + onConsoleReject
    fireEvent.change(stepsInput, { target: { value: '0000' } });
    fireEvent.change(codeInput, { target: { value: '0000' } });
    fireEvent.change(badgeInput, { target: { value: 'WRONG' } });
    expect(mockAudioInstance.keystroke).toHaveBeenCalled();

    fireEvent.submit(stepsInput.closest('form'));
    await waitFor(() => {
      expect(screen.getByText(/CONTAINMENT REJECTED/i)).toBeInTheDocument();
      expect(screen.getByTestId('vault-scan-tear')).toBeInTheDocument();
      expect(activeEngineInstance.scares.onConsoleReject).toHaveBeenCalled();
    });

    // Correct compound attempt -> Containment Restored + 3D restoration
    fireEvent.change(stepsInput, { target: { value: '1357' } });
    fireEvent.change(codeInput, { target: { value: '1111' } });
    fireEvent.change(badgeInput, { target: { value: 'OP-42' } });
    fireEvent.submit(stepsInput.closest('form'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/game/clue/R2-10/submit',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ steps: '1357', code: '1111', badge: 'OP-42' }),
        })
      );
      expect(screen.getByText(/CONTAINMENT RESTORED/i)).toBeInTheDocument();
      expect(activeEngineInstance.restoreContainment).toHaveBeenCalled();
      expect(activeEngineInstance.setCountdown).toHaveBeenCalledWith('00:00', true);
      expect(mockAudioInstance.stopCorePulse).toHaveBeenCalled();
    });
  });

  it('toggles audio mute via [M] key', async () => {
    render(<Room6Vault team={mockTeam} onLogout={vi.fn()} />);
    await waitFor(() => expect(activeEngineInstance).not.toBeNull());

    fireEvent.keyDown(window, { code: 'KeyM' });
    expect(mockAudioInstance.setMuted).toHaveBeenCalledWith(true);

    fireEvent.keyDown(window, { code: 'KeyM' });
    expect(mockAudioInstance.setMuted).toHaveBeenCalledWith(false);
  });

  it('instantiates GameAudioVault cleanly in jsdom without AudioContext errors', () => {
    const audio = new GameAudioVault();
    expect(() => audio.start()).not.toThrow();
    expect(() => audio.flapClack()).not.toThrow();
    expect(() => audio.clang()).not.toThrow();
    expect(() => audio.keystroke()).not.toThrow();
    expect(() => audio.dispose()).not.toThrow();
  });

  it('renders standalone HUDVault, ManualDiffModal, FailsafeCircuitModal, CentralConsoleModal, and VaultDossierModal safely when closed/empty', () => {
    const { container } = render(
      <>
        <HUDVault cluesSolved={1} totalClues={3} activeHoverPrompt="[E] Inspect Core" />
        <ManualDiffModal isOpen={false} onClose={vi.fn()} clue={null} onSubmit={vi.fn()} />
        <FailsafeCircuitModal isOpen={false} onClose={vi.fn()} clue={null} onSubmit={vi.fn()} />
        <CentralConsoleModal isOpen={false} onClose={vi.fn()} clue={null} onSubmit={vi.fn()} />
        <VaultDossierModal isOpen={false} onClose={vi.fn()} vaultClues={[]} />
      </>
    );
    expect(container).toHaveTextContent('1/3');
    expect(container).toHaveTextContent('[E] Inspect Core');
  });
});
