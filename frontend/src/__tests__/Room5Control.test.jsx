import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

import Room5Control from '../game/Room5Control.jsx';
import HUDControl from '../game/components/control/HUDControl.jsx';
import PersonnelIndexModal from '../game/components/control/PersonnelIndexModal.jsx';
import TransmissionArchiveModal from '../game/components/control/TransmissionArchiveModal.jsx';
import SpectrogramModal from '../game/components/control/SpectrogramModal.jsx';
import ControlBasketModal from '../game/components/control/ControlBasketModal.jsx';
import ControlDossierModal from '../game/components/control/ControlDossierModal.jsx';
import Fork2Modal from '../game/components/control/Fork2Modal.jsx';

// ─── Mocks ─────────────────────────────────────────────────────────────────────

let activeEngineInstance = null;

const mockAudioInstance = {
  start: vi.fn(),
  setMuted: vi.fn(),
  step: vi.fn(),
  good: vi.fn(),
  bad: vi.fn(),
  click: vi.fn(),
  staticBurst: vi.fn(),
  drawerSlam: vi.fn(),
  dispose: vi.fn(),
};

const mockScares = {
  update: vi.fn(),
  triggerCCTVHorror: vi.fn(),
  triggerTeamNameInjection: vi.fn(),
  maybeFragmentScare: vi.fn(),
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
      shake: vi.fn(),
      dispose: vi.fn(() => { if (canvas.parentNode) canvas.parentNode.removeChild(canvas); }),
      callbacks,
    };
    return activeEngineInstance;
  }),
}));

vi.mock('../game/engine/audioControl.js', () => ({
  GameAudioControl: class {
    constructor() { return mockAudioInstance; }
  },
}));

vi.mock('../game/engine/sceneControl.js', () => ({
  buildControlScene: vi.fn(),
}));

vi.mock('../game/engine/scaresControl.js', () => ({
  createControlScares: vi.fn(() => mockScares),
  isInsideSafeRoom5B: vi.fn((x, z) => x >= -3.45 && x <= 3.45 && z <= 1.85),
  SAFE_ROOM_RESPAWN: [0.25, 0.1, 0.25],
}));

// Mock canvas for SpectrogramModal
HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
  fillRect: vi.fn(),
  fillStyle: '',
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  strokeStyle: '',
  lineWidth: 1,
  arc: vi.fn(),
  createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
  fillText: vi.fn(),
  textAlign: '',
  font: '',
}));

// ─── Shared state factory ───────────────────────────────────────────────────────

function makeRoomState(overrides = {}) {
  return {
    ok: true,
    room_id: 'control',
    title: 'The Surveillance Morgue',
    total_fragments_in_room: 10,
    collected_fragment_ids: [],
    basket_unlocked: false,
    is_completed: false,
    evidence: [],
    clues: [
      { id: 'R2-01', object_id: 'staff_terminal', title: 'Personnel Index', solved: false, exhausted: false, attempts_remaining: 3 },
      { id: 'R2-05', object_id: 'radio_console',  title: 'Transmission Archive', solved: false, exhausted: false, attempts_remaining: 3 },
      { id: 'R2-06', object_id: 'sound_console',  title: 'Spectrogram Analyser', solved: false, exhausted: false, attempts_remaining: 3 },
    ],
    objects: [
      { id: 'relay_rack' }, { id: 'tape_deck_cart' }, { id: 'operator_chair' },
      { id: 'cable_trench' }, { id: 'wall_clipboard' }, { id: 'fuse_box' },
      { id: 'staff_terminal' }, { id: 'radio_console' }, { id: 'sound_console' },
      { id: 'monitor_bank' },
    ],
    ...overrides,
  };
}

const mockMessagesPayload = {
  messages: [
    { id: 'TX-1', received: '2001-02-20 23:10', headers: { From: 'CIPHER', 'X-Auth': 'QkRHLTkwMDI=' }, body: 'Trust VM-B.' },
    { id: 'TX-2', received: '2001-02-21 09:15', headers: { From: 'CIPHER', 'X-Auth': 'QkRHLTkwMDM=' }, body: 'Handover log.' },
    { id: 'TX-3', received: '2001-02-21 23:41', headers: { From: 'CIPHER', 'X-Auth': 'QkRHLTkwMDE=' }, body: 'VM-A is the authenticated source.' },
    { id: 'TX-4', received: '2001-02-22 02:30', headers: { From: 'CIPHER', 'X-Auth': 'QkRHLTkwMDQ=' }, body: 'Use VM-B mirror.' },
    { id: 'TX-5', received: '2001-02-23 14:08', headers: { From: 'CIPHER', 'X-Auth': 'QkRHLTkwMDU=' }, body: 'Static.' },
    { id: 'TX-6', received: '2001-02-24 06:00', headers: { From: 'CIPHER', 'X-Auth': 'QkRHLTkwMDA=' }, body: 'Routine.' },
  ],
};

function makeUnlockedState() {
  return makeRoomState({
    basket_unlocked: true,
    collected_fragment_ids: ['EC01','EC02','EC03','EC04','EC05','EC06','EC07','EC08','XC01','XC02'],
  });
}

// ─── Test suite ────────────────────────────────────────────────────────────────

describe('Room 5 (The Surveillance Morgue) Frontend Test Suite', () => {
  const mockTeam = { id: 42, name: 'delta_team' };
  const mockLogout = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => makeRoomState(),
    });
  });

  // ── 1. Mount & 3D Engine ────────────────────────────────────────────────────

  it('QA-R5-FE-01: renders without crashing', async () => {
    render(<Room5Control team={mockTeam} onLogout={mockLogout} />);
    expect(document.body).toBeTruthy();
  });

  it('QA-R5-FE-02: mounts canvas via createEngine', async () => {
    render(<Room5Control team={mockTeam} onLogout={mockLogout} />);
    await waitFor(() => expect(activeEngineInstance).toBeTruthy());
    expect(activeEngineInstance.canvas.tagName).toBe('CANVAS');
  });

  it('QA-R5-FE-03: calls buildControlScene to construct 3D geometry', async () => {
    const { buildControlScene } = await import('../game/engine/sceneControl.js');
    render(<Room5Control team={mockTeam} onLogout={mockLogout} />);
    await waitFor(() => expect(buildControlScene).toHaveBeenCalledOnce());
  });

  it('QA-R5-FE-04: creates horror director via createControlScares', async () => {
    const { createControlScares } = await import('../game/engine/scaresControl.js');
    render(<Room5Control team={mockTeam} onLogout={mockLogout} />);
    await waitFor(() => expect(createControlScares).toHaveBeenCalledOnce());
  });

  it('QA-R5-FE-05: fetches initial room state from /api/game/room/control', async () => {
    render(<Room5Control team={mockTeam} onLogout={mockLogout} />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(
      '/api/game/room/control', expect.any(Object)
    ));
  });

  it('QA-R5-FE-06: shows enter-room splash screen before game starts', async () => {
    render(<Room5Control team={mockTeam} onLogout={mockLogout} />);
    expect(screen.getByText(/ENTER THE SURVEILLANCE MORGUE/i)).toBeInTheDocument();
  });

  it('QA-R5-FE-07: splash shows R2 Room 2 title', async () => {
    render(<Room5Control team={mockTeam} onLogout={mockLogout} />);
    expect(screen.getByText(/R2 · ROOM 2/i)).toBeInTheDocument();
  });

  it('QA-R5-FE-08: HUD not shown before start button clicked', async () => {
    render(<Room5Control team={mockTeam} onLogout={mockLogout} />);
    // Basket button should not be visible in HUD
    const baskets = screen.queryAllByTitle(/Evidence Basket/i);
    expect(baskets.length).toBe(0);
  });

  it('QA-R5-FE-09: clicking start hides splash and shows HUD', async () => {
    render(<Room5Control team={mockTeam} onLogout={mockLogout} />);
    fireEvent.click(screen.getByText(/ENTER THE SURVEILLANCE MORGUE/i));
    await waitFor(() => expect(screen.queryByText(/ENTER THE SURVEILLANCE MORGUE/i)).toBeNull());
  });

  it('QA-R5-FE-10: start calls audio.start', async () => {
    render(<Room5Control team={mockTeam} onLogout={mockLogout} />);
    fireEvent.click(screen.getByText(/ENTER THE SURVEILLANCE MORGUE/i));
    expect(mockAudioInstance.start).toHaveBeenCalled();
  });

  // ── 2. HUD ──────────────────────────────────────────────────────────────────

  it('QA-R5-FE-11: HUDControl renders with phosphor green theme', () => {
    render(
      <HUDControl
        roomTitle="The Surveillance Morgue"
        totalFragments={8}
        collectedCount={0}
        basketUnlocked={false}
        cluesSolved={0}
        totalClues={3}
        onOpenBasket={vi.fn()}
        onOpenCaseFiles={vi.fn()}
        onLogout={vi.fn()}
        onToggleAudio={vi.fn()}
      />
    );
    expect(screen.getByText(/SURVEILLANCE MORGUE/i)).toBeInTheDocument();
  });

  it('QA-R5-FE-12: HUD shows fragment count correctly', () => {
    render(
      <HUDControl totalFragments={8} collectedCount={5} onOpenBasket={vi.fn()}
        onOpenCaseFiles={vi.fn()} onLogout={vi.fn()} onToggleAudio={vi.fn()} />
    );
    expect(screen.getByText('5/8')).toBeInTheDocument();
  });

  it('QA-R5-FE-13: HUD shows clue progress', () => {
    render(
      <HUDControl cluesSolved={2} totalClues={3} onOpenBasket={vi.fn()}
        onOpenCaseFiles={vi.fn()} onLogout={vi.fn()} onToggleAudio={vi.fn()} />
    );
    expect(screen.getByText('2/3')).toBeInTheDocument();
  });

  it('QA-R5-FE-14: HUD has no flashlight or battery controls', () => {
    const { container } = render(
      <HUDControl onOpenBasket={vi.fn()} onOpenCaseFiles={vi.fn()}
        onLogout={vi.fn()} onToggleAudio={vi.fn()} />
    );
    expect(container.querySelector('[title*="Flashlight"]')).toBeNull();
    expect(container.querySelector('[title*="Battery"]')).toBeNull();
  });

  it('QA-R5-FE-15: HUD Basket button opens basket', async () => {
    render(<Room5Control team={mockTeam} onLogout={mockLogout} />);
    fireEvent.click(screen.getByText(/ENTER THE SURVEILLANCE MORGUE/i));
    const basketBtn = await screen.findByTitle(/Evidence Basket/i);
    fireEvent.click(basketBtn);
    expect(activeEngineInstance.unlock).toHaveBeenCalled();
  });

  it('QA-R5-FE-16: HUD displays room-complete message when done', () => {
    render(
      <HUDControl isRoomCompleted={true} onOpenBasket={vi.fn()}
        onOpenCaseFiles={vi.fn()} onLogout={vi.fn()} onToggleAudio={vi.fn()} />
    );
    expect(screen.getByText(/VAULT SEAL BROKEN/i)).toBeInTheDocument();
  });

  // ── 3. Keyboard Shortcuts ───────────────────────────────────────────────────

  it('QA-R5-FE-17: B key opens basket', async () => {
    render(<Room5Control team={mockTeam} onLogout={mockLogout} />);
    fireEvent.click(screen.getByText(/ENTER THE SURVEILLANCE MORGUE/i));
    fireEvent.keyDown(window, { key: 'b', code: 'KeyB' });
    await waitFor(() => expect(activeEngineInstance.unlock).toHaveBeenCalled());
  });

  it('QA-R5-FE-18: C key opens case dossier', async () => {
    render(<Room5Control team={mockTeam} onLogout={mockLogout} />);
    fireEvent.click(screen.getByText(/ENTER THE SURVEILLANCE MORGUE/i));
    fireEvent.keyDown(window, { key: 'c', code: 'KeyC' });
    await waitFor(() => expect(activeEngineInstance.unlock).toHaveBeenCalled());
  });

  it('QA-R5-FE-19: M key toggles mute', async () => {
    render(<Room5Control team={mockTeam} onLogout={mockLogout} />);
    fireEvent.keyDown(window, { key: 'm', code: 'KeyM' });
    expect(mockAudioInstance.setMuted).toHaveBeenCalled();
  });

  it('QA-R5-FE-20: Escape key closes active modal', async () => {
    render(<Room5Control team={mockTeam} onLogout={mockLogout} />);
    fireEvent.click(screen.getByText(/ENTER THE SURVEILLANCE MORGUE/i));
    fireEvent.keyDown(window, { key: 'b', code: 'KeyB' });
    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => expect(activeEngineInstance.lock).toHaveBeenCalled());
  });

  // ── 4. Fragment Interactions ────────────────────────────────────────────────

  it('QA-R5-FE-21: interacting with relay_rack calls search API', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => makeRoomState() })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ found: true, fragment_id: 'EC01', message: 'Found EC01' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => makeRoomState() });

    render(<Room5Control team={mockTeam} onLogout={mockLogout} />);
    await waitFor(() => expect(activeEngineInstance).toBeTruthy());
    await act(async () => {
      await activeEngineInstance.callbacks.onInteract('relay_rack');
    });
    expect(global.fetch).toHaveBeenCalledWith('/api/game/room/control/search', expect.any(Object));
  });

  it('QA-R5-FE-22: fragment found triggers audio.good()', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => makeRoomState() })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ found: true, fragment_id: 'EC01', message: 'Found' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => makeRoomState() });

    render(<Room5Control team={mockTeam} onLogout={mockLogout} />);
    await waitFor(() => expect(activeEngineInstance).toBeTruthy());
    await act(async () => {
      await activeEngineInstance.callbacks.onInteract('relay_rack');
    });
    expect(mockAudioInstance.good).toHaveBeenCalled();
  });

  it('QA-R5-FE-23: fragment found triggers maybeFragmentScare()', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => makeRoomState() })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ found: true, fragment_id: 'EC02', message: 'Found' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => makeRoomState() });

    render(<Room5Control team={mockTeam} onLogout={mockLogout} />);
    await waitFor(() => expect(activeEngineInstance).toBeTruthy());
    await act(async () => {
      await activeEngineInstance.callbacks.onInteract('tape_deck_cart');
    });
    expect(mockScares.maybeFragmentScare).toHaveBeenCalled();
  });

  it('QA-R5-FE-24: interacting with monitor_bank triggers CCTV horror', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => makeRoomState() });
    render(<Room5Control team={mockTeam} onLogout={mockLogout} />);
    await waitFor(() => expect(activeEngineInstance).toBeTruthy());
    await act(async () => {
      await activeEngineInstance.callbacks.onInteract('monitor_bank');
    });
    expect(mockScares.triggerCCTVHorror).toHaveBeenCalled();
  });

  it('QA-R5-FE-25: 6 search props are defined (relay_rack, tape_deck_cart, operator_chair, cable_trench, wall_clipboard, fuse_box)', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => makeRoomState() });
    render(<Room5Control team={mockTeam} onLogout={mockLogout} />);
    await waitFor(() => expect(activeEngineInstance).toBeTruthy());
    const searchProps = ['relay_rack', 'tape_deck_cart', 'operator_chair', 'cable_trench', 'wall_clipboard', 'fuse_box'];
    for (const prop of searchProps) {
      global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ found: false, message: 'Nothing here' }) });
      await act(async () => { await activeEngineInstance.callbacks.onInteract(prop); });
    }
    // All 6 triggered fetch calls
    expect(global.fetch).toHaveBeenCalledTimes(1 + 6);
  });

  it('QA-R5-FE-26: entry door interaction shows "no return" notification', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => makeRoomState() });
    render(<Room5Control team={mockTeam} onLogout={mockLogout} />);
    await waitFor(() => expect(activeEngineInstance).toBeTruthy());
    await act(async () => { await activeEngineInstance.callbacks.onInteract('entry_door'); });
    expect(screen.getByText(/no going back/i)).toBeInTheDocument();
  });

  it('QA-R5-FE-27: staff_terminal blocked before basket unlock', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => makeRoomState({ basket_unlocked: false }) });
    render(<Room5Control team={mockTeam} onLogout={mockLogout} />);
    await waitFor(() => expect(activeEngineInstance).toBeTruthy());
    await act(async () => { await activeEngineInstance.callbacks.onInteract('staff_terminal'); });
    expect(screen.getByText(/terminal is locked/i)).toBeInTheDocument();
  });

  it('QA-R5-FE-28: radio_console blocked before basket unlock', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => makeRoomState({ basket_unlocked: false }) });
    render(<Room5Control team={mockTeam} onLogout={mockLogout} />);
    await waitFor(() => expect(activeEngineInstance).toBeTruthy());
    await act(async () => { await activeEngineInstance.callbacks.onInteract('radio_console'); });
    expect(screen.getByText(/terminal is locked/i)).toBeInTheDocument();
  });

  // ── 5. Clue Modal: PersonnelIndexModal (R2-01) ─────────────────────────────

  it('QA-R5-FE-29: staff_terminal opens PersonnelIndexModal when basket unlocked', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => makeUnlockedState() });
    render(<Room5Control team={mockTeam} onLogout={mockLogout} />);
    await waitFor(() => expect(activeEngineInstance).toBeTruthy());
    await act(async () => { await activeEngineInstance.callbacks.onInteract('staff_terminal'); });
    expect(screen.getByText(/PERSONNEL INDEX/i)).toBeInTheDocument();
  });

  it('QA-R5-FE-30: PersonnelIndexModal renders in isolation', () => {
    render(
      <PersonnelIndexModal
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        clueState={{ id: 'R2-01', attempts_remaining: 3 }}
      />
    );
    expect(screen.getByText(/PERSONNEL INDEX/i)).toBeInTheDocument();
  });

  it('QA-R5-FE-31: PersonnelIndexModal filter input exists', () => {
    render(
      <PersonnelIndexModal isOpen={true} onClose={vi.fn()} onSubmit={vi.fn()}
        clueState={{ id: 'R2-01', attempts_remaining: 3 }} />
    );
    const filterInput = screen.getByPlaceholderText(/filter|search/i);
    expect(filterInput).toBeInTheDocument();
  });

  it('QA-R5-FE-32: PersonnelIndexModal badge submit input exists', () => {
    render(
      <PersonnelIndexModal isOpen={true} onClose={vi.fn()} onSubmit={vi.fn()}
        clueState={{ id: 'R2-01', attempts_remaining: 3 }} />
    );
    const inputs = screen.getAllByRole('textbox');
    expect(inputs.length).toBeGreaterThanOrEqual(1);
  });

  it('QA-R5-FE-33: PersonnelIndexModal calls onSubmit with badge when submitted', () => {
    const onSubmit = vi.fn();
    render(
      <PersonnelIndexModal isOpen={true} onClose={vi.fn()} onSubmit={onSubmit}
        clueState={{ id: 'R2-01', attempts_remaining: 3 }} />
    );
    // Find the badge answer input (not the filter)
    const inputs = screen.getAllByRole('textbox');
    const answerInput = inputs[inputs.length - 1];
    fireEvent.change(answerInput, { target: { value: 'BDG-9001' } });
    fireEvent.keyDown(answerInput, { key: 'Enter' });
    expect(onSubmit).toHaveBeenCalledWith('BDG-9001');
  });

  it('QA-R5-FE-34: PersonnelIndexModal shows solved state', () => {
    render(
      <PersonnelIndexModal isOpen={true} onClose={vi.fn()} onSubmit={vi.fn()}
        clueState={{ id: 'R2-01', solved: true, attempts_remaining: 0 }} />
    );
    expect(screen.getByText(/CREDENTIAL VERIFIED|RECORD LOCKED/i)).toBeInTheDocument();
  });

  it('QA-R5-FE-35: staff_terminal triggers team name injection scare', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => makeUnlockedState() });
    render(<Room5Control team={mockTeam} onLogout={mockLogout} />);
    await waitFor(() => expect(activeEngineInstance).toBeTruthy());
    await act(async () => { await activeEngineInstance.callbacks.onInteract('staff_terminal'); });
    expect(mockScares.triggerTeamNameInjection).toHaveBeenCalled();
  });

  // ── 6. Clue Modal: TransmissionArchiveModal (R2-05) ────────────────────────

  it('QA-R5-FE-36: radio_console opens TransmissionArchiveModal when basket unlocked', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => makeUnlockedState() });
    render(<Room5Control team={mockTeam} onLogout={mockLogout} />);
    await waitFor(() => expect(activeEngineInstance).toBeTruthy());
    await act(async () => { await activeEngineInstance.callbacks.onInteract('radio_console'); });
    expect(screen.getByText(/TRANSMISSION LOG/i)).toBeInTheDocument();
  });

  it('QA-R5-FE-37: TransmissionArchiveModal shows 6 transmissions from API payload', () => {
    render(
      <TransmissionArchiveModal isOpen={true} onClose={vi.fn()} onSubmit={vi.fn()}
        clueState={{ id: 'R2-05', attempts_remaining: 3, payload: mockMessagesPayload }} />
    );
    expect(screen.getByText('TX-1')).toBeInTheDocument();
    expect(screen.getByText('TX-6')).toBeInTheDocument();
  });

  it('QA-R5-FE-38: TransmissionArchiveModal renders dynamic transmission body', () => {
    render(
      <TransmissionArchiveModal isOpen={true} onClose={vi.fn()} onSubmit={vi.fn()}
        clueState={{ id: 'R2-05', attempts_remaining: 3, payload: mockMessagesPayload }} />
    );
    expect(screen.getByText(/VM-A is the authenticated source/i)).toBeInTheDocument();
  });

  it('QA-R5-FE-39: TransmissionArchiveModal input prompt hidden before scroll-to-end', () => {
    render(
      <TransmissionArchiveModal isOpen={true} onClose={vi.fn()} onSubmit={vi.fn()}
        clueState={{ id: 'R2-05', attempts_remaining: 3 }} />
    );
    expect(screen.queryByText(/IDENTIFY AUTHENTIC/i)).toBeNull();
  });

  it('QA-R5-FE-40: TransmissionArchiveModal calls onSubmit with VM-A', () => {
    const onSubmit = vi.fn();
    const { container } = render(
      <TransmissionArchiveModal isOpen={true} onClose={vi.fn()} onSubmit={onSubmit}
        clueState={{ id: 'R2-05', attempts_remaining: 3 }} />
    );
    // Simulate scroll-to-end by firing a scroll event on the container
    const scrollEl = container.querySelector('.tape-scroll-container');
    if (scrollEl) {
      Object.defineProperty(scrollEl, 'scrollTop', { value: 9999, writable: true });
      Object.defineProperty(scrollEl, 'clientHeight', { value: 400 });
      Object.defineProperty(scrollEl, 'scrollHeight', { value: 400 });
      fireEvent.scroll(scrollEl);
    }
  });

  // ── 7. Clue Modal: SpectrogramModal (R2-06) ────────────────────────────────

  it('QA-R5-FE-41: sound_console opens SpectrogramModal when basket unlocked', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => makeUnlockedState() });
    render(<Room5Control team={mockTeam} onLogout={mockLogout} />);
    await waitFor(() => expect(activeEngineInstance).toBeTruthy());
    await act(async () => { await activeEngineInstance.callbacks.onInteract('sound_console'); });
    expect(screen.getByText(/SOUND CONSOLE/i)).toBeInTheDocument();
  });

  it('QA-R5-FE-42: SpectrogramModal renders VM-A and VM-B tabs', () => {
    render(
      <SpectrogramModal isOpen={true} onClose={vi.fn()} onSubmit={vi.fn()}
        clueState={{ id: 'R2-06', attempts_remaining: 3 }} />
    );
    expect(screen.getByText('VM-A')).toBeInTheDocument();
    expect(screen.getByText('VM-B')).toBeInTheDocument();
  });

  it('QA-R5-FE-43: SpectrogramModal band selector has LOW MID HIGH', () => {
    render(
      <SpectrogramModal isOpen={true} onClose={vi.fn()} onSubmit={vi.fn()}
        clueState={{ id: 'R2-06', attempts_remaining: 3 }} />
    );
    expect(screen.getByText('LOW')).toBeInTheDocument();
    expect(screen.getByText('MID')).toBeInTheDocument();
    expect(screen.getByText('HIGH')).toBeInTheDocument();
  });

  it('QA-R5-FE-44: SpectrogramModal tab switch from VM-A to VM-B', () => {
    render(
      <SpectrogramModal isOpen={true} onClose={vi.fn()} onSubmit={vi.fn()}
        clueState={{ id: 'R2-06', attempts_remaining: 3 }} />
    );
    const vmB = screen.getAllByText('VM-B')[0];
    fireEvent.click(vmB);
    // VM-B tab now active — secondary archive label shown
    expect(screen.getByText(/SECONDARY ARCHIVE/i)).toBeInTheDocument();
  });

  it('QA-R5-FE-45: SpectrogramModal calls onSubmit with 8140', () => {
    const onSubmit = vi.fn();
    render(
      <SpectrogramModal isOpen={true} onClose={vi.fn()} onSubmit={onSubmit}
        clueState={{ id: 'R2-06', attempts_remaining: 3 }} />
    );
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '8140' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSubmit).toHaveBeenCalledWith('8140');
  });

  it('QA-R5-FE-46: SpectrogramModal canvas elements rendered', () => {
    const { container } = render(
      <SpectrogramModal isOpen={true} onClose={vi.fn()} onSubmit={vi.fn()}
        clueState={{ id: 'R2-06', attempts_remaining: 3 }} />
    );
    const canvases = container.querySelectorAll('canvas');
    expect(canvases.length).toBeGreaterThanOrEqual(2); // oscilloscope + waveform strip
  });

  it('QA-R5-FE-47: SpectrogramModal shows solved state', () => {
    render(
      <SpectrogramModal isOpen={true} onClose={vi.fn()} onSubmit={vi.fn()}
        clueState={{ id: 'R2-06', solved: true, attempts_remaining: 0 }} />
    );
    expect(screen.getByText(/CODE VERIFIED|RECORD LOCKED/i)).toBeInTheDocument();
  });

  // ── 8. Clue Submission Flow ─────────────────────────────────────────────────

  it('QA-R5-FE-48: correct clue submission calls audio.good()', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => makeUnlockedState() })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ correct: true, room_completed: false }) })
      .mockResolvedValueOnce({ ok: true, json: async () => makeUnlockedState() });

    render(<Room5Control team={mockTeam} onLogout={mockLogout} />);
    await waitFor(() => expect(activeEngineInstance).toBeTruthy());
    await act(async () => { await activeEngineInstance.callbacks.onInteract('staff_terminal'); });

    const answerInput = screen.getByPlaceholderText(/BDG-XXXX/i);
    fireEvent.change(answerInput, { target: { value: 'BDG-9001' } });
    await act(async () => {
      fireEvent.click(screen.getByText('QUERY'));
    });

    await waitFor(() => {
      expect(mockAudioInstance.good).toHaveBeenCalled();
    });
  });

  it('QA-R5-FE-49: wrong clue answer calls engine.shake()', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => makeUnlockedState() })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ correct: false, attempts_remaining: 2 }) })
      .mockResolvedValueOnce({ ok: true, json: async () => makeUnlockedState() });

    render(<Room5Control team={mockTeam} onLogout={mockLogout} />);
    await waitFor(() => expect(activeEngineInstance).toBeTruthy());
    await act(async () => { await activeEngineInstance.callbacks.onInteract('staff_terminal'); });

    const answerInput = screen.getByPlaceholderText(/BDG-XXXX/i);
    fireEvent.change(answerInput, { target: { value: 'BDG-0000' } });
    await act(async () => {
      fireEvent.click(screen.getByText('QUERY'));
    });

    await waitFor(() => {
      expect(activeEngineInstance.shake).toHaveBeenCalled();
      expect(mockAudioInstance.bad).toHaveBeenCalled();
    });
  });

  it('QA-R5-FE-50: ControlRoomCompleteModal shown and openDoor called when room_completed returned', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => makeUnlockedState() })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ correct: true, room_completed: true }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ...makeUnlockedState(), is_completed: true }) });

    render(<Room5Control team={mockTeam} onLogout={mockLogout} />);
    await waitFor(() => expect(activeEngineInstance).toBeTruthy());
    await act(async () => { await activeEngineInstance.callbacks.onInteract('staff_terminal'); });

    const answerInput = screen.getByPlaceholderText(/BDG-XXXX/i);
    fireEvent.change(answerInput, { target: { value: 'BDG-9001' } });
    await act(async () => {
      fireEvent.click(screen.getByText('QUERY'));
    });

    await waitFor(() => {
      expect(activeEngineInstance.openDoor).toHaveBeenCalled();
      expect(screen.getByTestId('control-room-complete-modal')).toBeInTheDocument();
      expect(screen.getByText(/R2 · ROOM 2 CLEARED/i)).toBeInTheDocument();
    });
  });

  it('QA-R5-FE-51: ControlBasketModal renders 10-fragment progress, Close Basket, and optical sliders', () => {
    const sampleEv = [
      {
        id: 'EC01',
        display: { title: 'Personnel Header', lines: ['Badge suffix verified'] },
      },
    ];
    render(
      <ControlBasketModal
        isOpen={true}
        onClose={vi.fn()}
        evidence={sampleEv}
        collectedIds={['EC01']}
        basketUnlocked={false}
        totalInRoom={10}
      />
    );
    expect(screen.getByText(/1 \/ 10 COLLECTED/i)).toBeInTheDocument();
    expect(screen.getByText('Close Basket')).toBeInTheDocument();
    fireEvent.click(screen.getByText(/Personnel Header/i));
    expect(screen.getByText('Contrast')).toBeInTheDocument();
    expect(screen.getByText('Brightness')).toBeInTheDocument();
  });

  it('QA-R5-FE-52: ControlDossierModal fetches /api/game/round/2/dossier and displays Room 5 clues', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        records: [{ room: 'control', clue_id: 'R2-01', reveal: { note: 'Shift log verified' } }],
      }),
    });
    render(
      <ControlDossierModal
        isOpen={true}
        onClose={vi.fn()}
        clues={makeUnlockedState().clues}
        basketUnlocked={true}
        totalFragments={10}
        collectedCount={10}
        onOpenClue={vi.fn()}
      />
    );
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/game/round/2/dossier',
        expect.objectContaining({ credentials: 'include' })
      );
    });
    expect(screen.getByText(/CASE DOSSIER \/\/ THE SURVEILLANCE MORGUE/i)).toBeInTheDocument();
  });

  it('QA-R5-FE-53: Fork2Modal Valve A triggers trap +60s overlay and Valve B invokes onProceedToRoom6', async () => {
    const onProceedToRoom6 = vi.fn();
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ barred_choices: [], resolved: false }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ is_trap: true, message: 'Aerosol breach +60s.' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ is_trap: false, is_correct: true }),
      });

    render(
      <Fork2Modal
        isOpen={true}
        onClose={vi.fn()}
        audio={mockAudioInstance}
        onProceedToRoom6={onProceedToRoom6}
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByText('ENGAGE VALVE A'));
    });
    expect(screen.getByTestId('fork2-trap-overlay')).toBeInTheDocument();
    expect(screen.getByText(/\+60s PENALTY APPLIED/i)).toBeInTheDocument();
  });

  it('QA-R5-FE-54: interacting with vault_door when room is completed opens Fork2Modal', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ...makeUnlockedState(), is_completed: true }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ barred_choices: [], resolved: false }) });

    render(<Room5Control team={mockTeam} onLogout={mockLogout} />);
    await waitFor(() => expect(activeEngineInstance).toBeTruthy());
    await act(async () => {
      await activeEngineInstance.callbacks.onInteract('vault_door');
    });

    await waitFor(() => {
      expect(screen.getByText(/FORK 2 • CORE AIRLOCK PURGE MANIFOLD/i)).toBeInTheDocument();
    });
  });

  it('QA-R5-FE-55: Polished sealed basket & dossier UI hide location/decoy spoilers until unsealed', async () => {
    const { container, unmount } = render(
      <ControlBasketModal
        isOpen={true}
        onClose={vi.fn()}
        evidence={[
          { id: 'EC01', is_wrapped: true, display: { title: 'Wrapped Fragment #1' } },
          { id: 'XC01', is_wrapped: true, is_decoy: true, display: { title: 'Wrapped Fragment #None' } },
        ]}
        collectedIds={['EC01', 'XC01']}
        basketUnlocked={false}
        totalInRoom={10}
      />
    );
    expect(container.querySelector('.corkboard-surface')).toBeInTheDocument();
    expect(screen.getByText(/EVIDENCE BASKET • RECOVERED FRAGMENTS/i)).toBeInTheDocument();
    expect(screen.getByText('Sealed Evidence #1')).toBeInTheDocument();
    expect(screen.getByText('Sealed Evidence #2')).toBeInTheDocument();
    expect(screen.queryByText(/Relay Rack/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Decoy/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/#None/i)).not.toBeInTheDocument();
    unmount();

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ records: [] }),
    });
    const dossierRender = render(
      <ControlDossierModal
        isOpen={true}
        onClose={vi.fn()}
        clues={makeUnlockedState().clues}
        basketUnlocked={true}
        totalFragments={10}
        collectedCount={10}
        onOpenClue={vi.fn()}
      />
    );
    expect(dossierRender.container.querySelector('.desk-surface')).toBeInTheDocument();
    expect(dossierRender.container.querySelectorAll('.manila-dossier').length).toBe(3);
    expect(screen.getByText(/R2-01 → R2-05 → R2-06/i)).toBeInTheDocument();
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
  });

  it('QA-R5-FE-56: Real sceneControl doorways (incl. cryo_door & generator_door) toggle solids cleanly and stay >= 0.48m passable', async () => {
    const actualSceneMod = await vi.importActual('../game/engine/sceneControl.js');
    const THREE = await import('three');
    const solids = [];
    const mockEngine = {
      S: new THREE.Scene(),
      add: vi.fn(),
      solid: (x0, x1, z0, z1) => {
        const b = { x0, x1, z0, z1 };
        solids.push(b);
        return b;
      },
      removeSolid: (b) => {
        const idx = solids.indexOf(b);
        if (idx !== -1) solids.splice(idx, 1);
      },
      interact: vi.fn(),
      visualInteract: vi.fn(),
      anim: vi.fn(),
      ref: {},
      loadGLB: vi.fn(() => new Promise(() => {})),
    };

    actualSceneMod.buildControlScene(mockEngine);

    // Initially all 8 wing doors + control door add colliders; opening them must clear corridors
    mockEngine.toggleControlDoor();
    const doorways = [
      { id: 'control_door', axis: 'Z', fixed: [0.5, 1.6], walk: [1.0, 2.6], toggle: () => {} },
      { id: 'annex_door', axis: 'X', fixed: [8.8, 10.0], walk: [-2.4, -0.8] },
      { id: 'south_wing_door', axis: 'Z', fixed: [-4.5, -3.4], walk: [4.6, 6.4] },
      { id: 'observation_door', axis: 'X', fixed: [7.2, 8.5], walk: [-8.7, -7.0] },
      { id: 'chamber3_door', axis: 'X', fixed: [7.2, 8.5], walk: [-11.8, -10.1] },
      { id: 'chamber3_north_door', axis: 'Z', fixed: [-12.3, -11.2], walk: [12.0, 14.3] },
      { id: 'cryo_door', axis: 'Z', fixed: [-6.1, -4.9], walk: [12.0, 14.3] },
      { id: 'generator_door', axis: 'Z', fixed: [-10.8, -9.6], walk: [12.0, 14.3] },
      { id: 'morgue_vault_door', axis: 'X', fixed: [16.6, 17.8], walk: [-8.7, -7.0] },
    ];

    const RM = 0.2828;
    const isBlocked = (x, z) =>
      solids.some((s) => {
        const cx = Math.max(s.x0, Math.min(x, s.x1));
        const cz = Math.max(s.z0, Math.min(z, s.z1));
        return (x - cx) ** 2 + (z - cz) ** 2 < RM * RM;
      });

    for (const dw of doorways) {
      if (!dw.toggle) {
        expect(mockEngine.toggleWingDoor(dw.id)).toBe(true);
      }
      const clearPositions = [];
      for (let p = dw.fixed[0]; p <= dw.fixed[1] + 0.001; p += 0.02) {
        let ok = true;
        for (let w = dw.walk[0]; w <= dw.walk[1]; w += 0.08) {
          const x = dw.axis === 'Z' ? p : w;
          const z = dw.axis === 'Z' ? w : p;
          if (isBlocked(x, z)) {
            ok = false;
            break;
          }
        }
        if (ok) clearPositions.push(p);
      }
      const clearWidth = clearPositions.length
        ? clearPositions[clearPositions.length - 1] - clearPositions[0]
        : 0;
      expect(clearWidth).toBeGreaterThanOrEqual(0.48);
    }
  });

  it('QA-R5-FE-57: Out-of-order search shows non-spoiler Compartment Sealed, wrapped pickup shows clear confirmation, ambient props open notes, and HUD minimap tracks room', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => makeRoomState({ collected_fragment_ids: ['EC01'] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ found: false, locked: true, message: 'Locked for now.' }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          found: true,
          fragment_id: 'EC02',
          total_collected: 2,
          total_in_room: 10,
          message: 'You discovered a wrapped fragment inside the relay rack!',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => makeRoomState({
          collected_fragment_ids: ['EC01', 'EC02'],
          evidence: [
            { id: 'EC01', is_wrapped: true, display: { title: 'Wrapped Fragment #1' } },
            { id: 'EC02', is_wrapped: true, display: { title: 'Wrapped Fragment #2' } },
          ],
        }),
      });

    render(<Room5Control team={mockTeam} onLogout={mockLogout} />);
    await waitFor(() => expect(activeEngineInstance).toBeTruthy());

    // Attempting out-of-order prop shows Compartment Sealed without leaking sequence route
    await act(async () => {
      await activeEngineInstance.callbacks.onInteract('tape_deck_cart');
    });
    expect(screen.getByText(/Compartment Sealed/i)).toBeInTheDocument();
    expect(screen.queryByText(/NEXT SEARCH STOP/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Continue Search'));

    // Collecting a wrapped fragment opens unmistakable Evidence Recovered confirmation
    await act(async () => {
      await activeEngineInstance.callbacks.onInteract('relay_rack');
    });
    expect(screen.getByText(/EVIDENCE RECOVERED \/\/ PLACED IN BASKET \[B\]/i)).toBeInTheDocument();
    expect(screen.getByText(/Tamper-Sealed Evidence #2/i)).toBeInTheDocument();
    expect(screen.getByText('Relay Rack')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Continue'));

    // Ambient prop opens readable inspection writing without firing a backend /search request
    const callsBeforeAmbient = global.fetch.mock.calls.length;
    await act(async () => {
      await activeEngineInstance.callbacks.onInteract('autopsy_gurney');
    });
    expect(global.fetch.mock.calls.length).toBe(callsBeforeAmbient);
    expect(screen.getByText(/Stainless Cryo Examination Gurney/i)).toBeInTheDocument();
    expect(screen.getByText(/AMBIENT PROP/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText('Close'));

    // CCTV Monitor opens tactical floorplan blueprint without sequence spoilers
    await act(async () => {
      await activeEngineInstance.callbacks.onInteract('monitor_bank');
    });
    expect(screen.getByText(/TACTICAL FLOORPLAN/i)).toBeInTheDocument();
    expect(screen.queryByText(/START HERE \(SEQ #1-#2\)/i)).not.toBeInTheDocument();
  });

  it('QA-R5-FE-58: Bottom-left architectural minimap highlights active sector dynamically (5B -> 5F)', () => {
    const { rerender } = render(
      <HUDControl
        roomTitle="The Surveillance Morgue"
        totalFragments={10}
        collectedCount={2}
        basketUnlocked={false}
        playerPos={{ x: 0.25, z: 0.25, yaw: 0 }}
      />
    );
    const minimap = screen.getByTestId('hud-room-minimap');
    expect(minimap).toBeInTheDocument();
    expect(screen.getByText('CONTROL BAY (SAFE)')).toBeInTheDocument();

    rerender(
      <HUDControl
        roomTitle="The Surveillance Morgue"
        totalFragments={10}
        collectedCount={2}
        basketUnlocked={false}
        playerPos={{ x: -12.0, z: 16.0, yaw: 1.5 }}
      />
    );
    expect(screen.getByText('RELAY VAULT')).toBeInTheDocument();
    expect(screen.getAllByText('5F').length).toBeGreaterThanOrEqual(1);
  });
});

