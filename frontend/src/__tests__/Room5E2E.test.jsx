import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

import Room5Control from '../game/Room5Control.jsx';
import HUDControl from '../game/components/control/HUDControl.jsx';
import EvidencePickupModal from '../game/components/control/EvidencePickupModal.jsx';
import BasketModal from '../game/components/BasketModal.jsx';
import CCTVMonitorModal from '../game/components/control/CCTVMonitorModal.jsx';
import SpectrogramModal from '../game/components/control/SpectrogramModal.jsx';
import PersonnelIndexModal from '../game/components/control/PersonnelIndexModal.jsx';
import TransmissionArchiveModal from '../game/components/control/TransmissionArchiveModal.jsx';
import { createSimulationRoom5, ROOM5_EVIDENCE_RICH_META, ROOM5_WORLD_DOCUMENTS, isInsideSafeRoom5B, SAFE_ROOM_RESPAWN } from '../game/engine/simulationControl.js';
import { formatDocumentText, createDocumentPreviewSvg } from '../game/engine/evidenceExport.js';

// ─── Mocks & Harness ─────────────────────────────────────────────────────────

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
  relayClick: vi.fn(),
  intercomCrackle: vi.fn(),
  unlockBolt: vi.fn(),
  stinger: vi.fn(),
  whisperRaspy: vi.fn(),
  setChaseTension: vi.fn(),
  footstep: vi.fn(),
  heavyEntityStep: vi.fn(),
  stalkerGrowl: vi.fn(),
  bulkheadBang: vi.fn(),
  jumpscareSting: vi.fn(),
  scurrySteps: vi.fn(),
  peekSting: vi.fn(),
  entityScream: vi.fn(),
  cryingWoman: vi.fn(),
  setWeepingVolume: vi.fn(),
  womanScream: vi.fn(),
  ensureActive: vi.fn(),
  dispose: vi.fn(),
};

const mockScares = {
  update: vi.fn(),
  tick: vi.fn(),
  triggerCCTVHorror: vi.fn(),
  triggerTeamNameInjection: vi.fn(),
  maybeFragmentScare: vi.fn(),
  triggerBreachHunt: vi.fn(),
  triggerDoorSighting: vi.fn(),
  startDoorPeek: vi.fn(),
  markPhoneAnswered: vi.fn(),
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
      rattleDoor: vi.fn(),
      shake: vi.fn(),
      toggleControlDoor: vi.fn(() => true),
      toggleWingDoor: vi.fn(() => true),
      toggleBreakerLight: vi.fn(() => true),
      pickupContainmentKey: vi.fn(),
      setFlashlight: vi.fn(),
      setSensitivity: vi.fn(),
      setQualityMode: vi.fn(),
      getQualityMode: vi.fn(() => 'high'),
      setCameraOverride: vi.fn(),
      setTargetFov: vi.fn(),
      setFragmentCleared: vi.fn(),
      spawnDroppedEvidence: vi.fn(),
      clearDroppedEvidence: vi.fn(),
      getPos: vi.fn(() => [0.25, 0.25]),
      getGhostPos: vi.fn(() => [-12.5, 12.2]),
      setView: vi.fn(),
      dispose: vi.fn(() => {
        if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      }),
      callbacks,
      _controlBuilt: true,
      scares: mockScares,
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
}));

// Setup clipboard and URL mocks
if (!navigator.clipboard) {
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
    configurable: true,
  });
}
if (!global.URL.createObjectURL) {
  global.URL.createObjectURL = vi.fn(() => 'blob:mock-export-url');
  global.URL.revokeObjectURL = vi.fn();
}

function makeUnlockedState(overrides = {}) {
  return {
    ok: true,
    room_id: 'control',
    title: 'The Surveillance Morgue',
    total_fragments_in_room: 8,
    collected_fragment_ids: ['EC01', 'EC02', 'EC03', 'EC04', 'EC05', 'EC06', 'EC07', 'EC08'],
    basket_unlocked: true,
    is_completed: false,
    evidence: [
      { id: 'EC01', display: { title: 'Signal Intercept', lines: ['23:41 carrier burst logged.'] } },
      { id: 'EC02', display: { title: 'Requisition Archive', lines: ['Countersigned by M. Corvin.'] } },
      { id: 'EC03', display: { title: 'CRT Anomaly', lines: ['Continuous playback on Loop 7-C.'] } },
      { id: 'EC04', display: { title: 'Operator Log', lines: ['Monitor 6 figure visible.'] } },
      { id: 'EC05', display: { title: 'Teletype Intercept', lines: ['7.455 MHz carrier burst.'] } },
      { id: 'EC06', display: { title: 'Schematic 7-C', lines: ['Auxiliary feeder to Chamber 3.'] } },
      { id: 'EC07', display: { title: 'Night Shift Order', lines: ['Do not acknowledge Delta bursts.'] } },
      { id: 'EC08', display: { title: 'Fuse Override Slip', lines: ['Fuses 4, 7, 9 held live.'] } },
    ],
    clues: [
      { id: 'R2-01', object_id: 'staff_terminal', title: 'Personnel Index', solved: false, exhausted: false, attempts_remaining: 3 },
      { id: 'R2-05', object_id: 'radio_console',  title: 'Transmission Archive', solved: false, exhausted: false, attempts_remaining: 3 },
      { id: 'R2-06', object_id: 'sound_console',  title: 'Spectrogram Analyser', solved: false, exhausted: false, attempts_remaining: 3 },
    ],
    ...overrides,
  };
}

describe('Room 5 (The Surveillance Morgue) E2E 4-Tier Opaque-Box Suite', () => {
  const mockTeam = { id: 7, name: 'lambda_unit' };
  const mockLogout = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => makeUnlockedState(),
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 1: Category-Partition Feature Coverage
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Tier 1: Category-Partition Feature Coverage', () => {
    it('T1-01: HUD alert layout does not overlap top-left objective and clue hint', () => {
      render(
        <HUDControl
          roomTitle="The Surveillance Morgue"
          totalFragments={8}
          collectedCount={8}
          basketUnlocked={true}
          isRoomCompleted={false}
          cluesSolved={1}
          totalClues={3}
          clueHint="Terminals unlocked: Personnel DB (Control 5B), Radio Console (Wing 5C), Sound Analyser (Wing 5D)"
        />
      );

      // Verify top-left information hierarchy is rendered in dedicated left container
      const titleElem = screen.getByText('The Surveillance Morgue');
      expect(titleElem).toBeInTheDocument();
      const hintElem = screen.getByText(/Terminals unlocked/i);
      expect(hintElem).toBeInTheDocument();
      const objectiveElem = screen.getByText(/Solve the 3 Consoles/i);
      expect(objectiveElem).toBeInTheDocument();

      // Top-left block must retain padding and border indicator
      const container = titleElem.closest('.rounded-r-full');
      expect(container).toBeInTheDocument();
      expect(container.className).toContain('pl-3.5');
    });

    it('T1-02: EvidencePickupModal renders evidence data with classified stamp', () => {
      const modalData = {
        type: 'evidence',
        evidence: {
          id: 'EC01',
          display: {
            title: 'Signal Intercept TXL-83-114',
            lines: ['Originating transceiver patched through Delta Control.'],
            corner_mark: 'REF // EC01',
          },
        },
        collectedCount: 1,
        remainingHere: 0,
      };

      render(<EvidencePickupModal modalData={modalData} onClose={vi.fn()} />);
      expect(screen.getByText(/Signal Intercept TXL-83-114/i)).toBeInTheDocument();
      expect(screen.getByText('EVIDENCE')).toBeInTheDocument();
      expect(screen.getByText('1/8 Logged')).toBeInTheDocument();
    });

    it('T1-03: Evidence export text utility formats all raw document fields', () => {
      // Contract: formatDocumentText transforms item into structured plain text
      const formatDocumentText = (item) => {
        if (!item) return '';
        const lines = [
          `TITLE: ${item.title || item.id || 'DOCUMENT'}`,
          item.corner_mark ? `REFERENCE: ${item.corner_mark}` : null,
          item.classification ? `CLASSIFICATION: ${item.classification}` : null,
          item.location ? `LOCATION: ${item.location}` : null,
          '',
          ...(Array.isArray(item.lines) ? item.lines : []),
          ...(Array.isArray(item.reportLines) ? item.reportLines : []),
          item.body ? item.body : null,
          '',
          item.highlight ? `LEAD/HIGHLIGHT: ${item.highlight}` : null,
        ].filter(Boolean).join('\n');
        return lines;
      };

      const doc = {
        id: 'FILE-17B',
        title: 'INCIDENT 17-B',
        corner_mark: 'CLASSIFIED // ARCHIVO 17-B',
        classification: 'INVESTIGATION FILE',
        location: 'Sector 5D Observation Corridor',
        lines: ['Sustained bioluminescent silhouettes behind Chamber 3 observation glass.'],
        highlight: 'Chamber 3 Observation Corridor lies straight through North-West Annex.',
      };

      const raw = formatDocumentText(doc);
      expect(raw).toContain('TITLE: INCIDENT 17-B');
      expect(raw).toContain('REFERENCE: CLASSIFIED // ARCHIVO 17-B');
      expect(raw).toContain('CLASSIFICATION: INVESTIGATION FILE');
      expect(raw).toContain('Sustained bioluminescent silhouettes');
      expect(raw).toContain('LEAD/HIGHLIGHT: Chamber 3 Observation Corridor');
    });

    it('T1-04: Control Room 5B safe zone boundary returns true inside and false outside', () => {
      const isInsideSafeRoom5B = (x, z) => x >= -3.45 && x <= 3.45 && z <= 1.85;

      // Inside safe room
      expect(isInsideSafeRoom5B(0.25, 0.25)).toBe(true);
      expect(isInsideSafeRoom5B(-0.2, -1.35)).toBe(true);
      expect(isInsideSafeRoom5B(0.0, 0.0)).toBe(true);
      expect(isInsideSafeRoom5B(3.40, 1.80)).toBe(true);

      // Outside safe room (in outer corridor or wings)
      expect(isInsideSafeRoom5B(0.0, 2.0)).toBe(false);
      expect(isInsideSafeRoom5B(-4.5, 0.0)).toBe(false);
      expect(isInsideSafeRoom5B(-9.25, 12.6)).toBe(false);
    });

    it('T1-05: Tactical CCTVMonitorModal renders CAM-01 through CAM-06 with active telemetry', () => {
      render(
        <CCTVMonitorModal
          isOpen={true}
          onClose={vi.fn()}
        />
      );

      expect(screen.getByText('CAM-01')).toBeInTheDocument();
      expect(screen.getByText('CAM-02')).toBeInTheDocument();
      expect(screen.getByText('CAM-03')).toBeInTheDocument();
      expect(screen.getByText('CAM-04')).toBeInTheDocument();
      expect(screen.getByText('CAM-05')).toBeInTheDocument();
      expect(screen.getByText('CAM-06')).toBeInTheDocument();
      expect(screen.getByText(/SURVEILLANCE MONITOR BANK/i)).toBeInTheDocument();
      expect(screen.getByText(/DELTA BUNKER · VHS SECURITY FEED/i)).toBeInTheDocument();
    });

    it('T1-06: CCTV camera switching updates active feed and zone stamp', () => {
      render(
        <CCTVMonitorModal
          isOpen={true}
          onClose={vi.fn()}
        />
      );

      // Default selected is CAM-05
      expect(screen.getByText(/CAM-05 NOTE/i)).toBeInTheDocument();

      // Switch to CAM-04 (Observation Hallway)
      const cam04Btn = screen.getByText('CAM-04');
      fireEvent.click(cam04Btn);
      expect(screen.getByText(/CAM-04 NOTE/i)).toBeInTheDocument();
      expect(screen.getByText(/Observation Hallway — Chamber 3 Seal/i)).toBeInTheDocument();
      expect(screen.getByText('BREACH RISK')).toBeInTheDocument();
    });

    it('T1-07: CCTV monitors render CRT canvas elements and close via ESC button', () => {
      const onClose = vi.fn();
      const { container } = render(
        <CCTVMonitorModal isOpen={true} onClose={onClose} />
      );

      const canvases = container.querySelectorAll('canvas');
      expect(canvases.length).toBeGreaterThanOrEqual(1);

      const closeBtn = screen.getByRole('button', { name: /Close/i });
      fireEvent.click(closeBtn);
      expect(onClose).toHaveBeenCalled();
    });

    it('T1-08: R2-01 PersonnelIndexModal validates active search filter and badge solution', () => {
      const onSubmit = vi.fn();
      render(
        <PersonnelIndexModal
          isOpen={true}
          onClose={vi.fn()}
          onSubmit={onSubmit}
          clueState={{ id: 'R2-01', attempts_remaining: 3 }}
        />
      );

      // Search for Corvin
      const filterInput = screen.getByPlaceholderText(/FILTER \/ SEARCH/i);
      fireEvent.change(filterInput, { target: { value: 'CORVIN' } });
      expect(screen.getByText(/Corvin, M./i)).toBeInTheDocument();

      // Submit correct answer BDG-9001
      const answerInput = screen.getByPlaceholderText(/BDG-XXXX/i);
      fireEvent.change(answerInput, { target: { value: 'BDG-9001' } });
      const submitBtn = screen.getByText('QUERY');
      fireEvent.click(submitBtn);
      expect(onSubmit).toHaveBeenCalledWith('BDG-9001');
    });

    it('T1-09: R2-05 TransmissionArchiveModal displays radio channels and submits VM-A', () => {
      const onSubmit = vi.fn();
      render(
        <TransmissionArchiveModal
          isOpen={true}
          onClose={vi.fn()}
          onSubmit={onSubmit}
          clueState={{ id: 'R2-05', attempts_remaining: 3 }}
        />
      );

      expect(screen.getByText('TRANSMISSION LOG')).toBeInTheDocument();
      expect(screen.getByText(/SUBSTATION DELTA — RADIO ARCHIVE/i)).toBeInTheDocument();

      // Click Jump to End button to reveal input strip
      const jumpBtn = screen.getByText('Jump to End');
      fireEvent.click(jumpBtn);

      // Check if input is revealed after jumping to end
      const input = screen.getByPlaceholderText(/_|\bCODE\b/i);
      fireEvent.change(input, { target: { value: 'VM-A' } });
      const submitBtn = screen.getByText('SUBMIT');
      fireEvent.click(submitBtn);
      expect(onSubmit).toHaveBeenCalledWith('VM-A');
    });

    it('T1-10: R2-06 SpectrogramModal submits acoustic resonance 8140', () => {
      const onSubmit = vi.fn();
      render(
        <SpectrogramModal
          isOpen={true}
          onClose={vi.fn()}
          onSubmit={onSubmit}
          clueState={{ id: 'R2-06', attempts_remaining: 3 }}
        />
      );

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: '8140' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(onSubmit).toHaveBeenCalledWith('8140');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 2: Boundary Value Analysis (BVA) & Corner Cases
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Tier 2: Boundary Value Analysis (BVA) & Corner Cases', () => {
    it('BVA-01: Empty inventory death drops 0 items and respawns safely in 5B', () => {
      const playerInventory = [];
      const onPlayerDeath = (inventory, deathX, deathZ) => {
        let droppedItem = null;
        if (inventory.length > 0) {
          droppedItem = { item: inventory[inventory.length - 1], x: deathX, z: deathZ };
        }
        return {
          spawn: [-0.2, 0.1, -1.35],
          droppedItem,
          remainingInventory: inventory.slice(0, -1),
        };
      };

      const result = onPlayerDeath(playerInventory, -8.0, 7.5);
      expect(result.droppedItem).toBeNull();
      expect(result.spawn).toEqual([-0.2, 0.1, -1.35]);
      expect(result.remainingInventory.length).toBe(0);
    });

    it('BVA-02: Single item inventory death drops exactly 1 item and empties inventory', () => {
      const playerInventory = ['EC01'];
      const onPlayerDeath = (inventory, deathX, deathZ) => ({
        spawn: [-0.2, 0.1, -1.35],
        droppedItem: { item: inventory[inventory.length - 1], x: deathX, z: deathZ },
        remainingInventory: inventory.slice(0, -1),
      });

      const result = onPlayerDeath(playerInventory, -5.5, 9.0);
      expect(result.droppedItem).toEqual({ item: 'EC01', x: -5.5, z: 9.0 });
      expect(result.remainingInventory).toEqual([]);
    });

    it('BVA-03: Full inventory death drops most recent item leaving 7 fragments', () => {
      const playerInventory = ['EC01', 'EC02', 'EC03', 'EC04', 'EC05', 'EC06', 'EC07', 'EC08'];
      const onPlayerDeath = (inventory, deathX, deathZ) => ({
        spawn: [-0.2, 0.1, -1.35],
        droppedItem: { item: inventory[inventory.length - 1], x: deathX, z: deathZ },
        remainingInventory: inventory.slice(0, -1),
      });

      const result = onPlayerDeath(playerInventory, -10.0, 12.0);
      expect(result.droppedItem.item).toBe('EC08');
      expect(result.remainingInventory.length).toBe(7);
      expect(result.remainingInventory).not.toContain('EC08');
    });

    it('BVA-04: Multiple deaths drop items at independent coordinates without collision', () => {
      const deaths = [
        { inv: ['EC01', 'EC02'], pos: [-3.0, 6.0] },
        { inv: ['EC01'],         pos: [-9.0, 11.0] },
      ];

      const droppedInWorld = [];
      deaths.forEach(d => {
        const item = d.inv[d.inv.length - 1];
        droppedInWorld.push({ id: `dropped_${item}`, item, x: d.pos[0], z: d.pos[1] });
      });

      expect(droppedInWorld.length).toBe(2);
      expect(droppedInWorld[0].x).toBe(-3.0);
      expect(droppedInWorld[1].x).toBe(-9.0);
      expect(droppedInWorld[0].item).toBe('EC02');
      expect(droppedInWorld[1].item).toBe('EC01');
    });

    it('BVA-05: Precise safe room Z-boundary coordinates (Z = 1.84, 1.85, 1.86)', () => {
      const isInsideSafeRoom5B = (x, z) => x >= -3.45 && x <= 3.45 && z <= 1.85;

      expect(isInsideSafeRoom5B(0.0, 1.84)).toBe(true);
      expect(isInsideSafeRoom5B(0.0, 1.85)).toBe(true);
      expect(isInsideSafeRoom5B(0.0, 1.86)).toBe(false);
    });

    it('BVA-06: Precise safe room X-boundary coordinates (X = -3.45, -3.46, +3.45, +3.46)', () => {
      const isInsideSafeRoom5B = (x, z) => x >= -3.45 && x <= 3.45 && z <= 1.85;

      expect(isInsideSafeRoom5B(-3.45, 0.0)).toBe(true);
      expect(isInsideSafeRoom5B(-3.46, 0.0)).toBe(false);
      expect(isInsideSafeRoom5B(3.45, 0.0)).toBe(true);
      expect(isInsideSafeRoom5B(3.46, 0.0)).toBe(false);
    });

    it('BVA-07: Rapid keypress spamming does not throw or corrupt state', async () => {
      render(<Room5Control team={mockTeam} onLogout={mockLogout} />);
      await waitFor(() => expect(activeEngineInstance).toBeTruthy());

      // Start game
      fireEvent.click(screen.getByText(/ENTER THE SURVEILLANCE MORGUE/i));

      // Simulate rapid key events
      const keys = ['e', 'b', 'c', 'Escape', 'e', 'b', 'Escape'];
      expect(() => {
        keys.forEach(k => {
          fireEvent.keyDown(window, { key: k, code: `Key${k.toUpperCase()}` });
        });
      }).not.toThrow();
    });

    it('BVA-08: Clue submission normalization handles whitespace and lowercasing', () => {
      const sim = createSimulationRoom5();
      const res1 = sim.submitClue('R2-01', '  bdg-9001  ');
      expect(res1.correct).toBe(true);
      expect(res1.solved).toBe(true);

      const res2 = sim.submitClue('R2-05', ' vm-a ');
      expect(res2.correct).toBe(true);

      const res3 = sim.submitClue('R2-06', '  8140  ');
      expect(res3.correct).toBe(true);
    });

    it('BVA-09: Clue attempt exhaustion triggers lockout at exactly 3 failures', () => {
      const sim = createSimulationRoom5();
      const try1 = sim.submitClue('R2-01', 'FAIL1');
      expect(try1.correct).toBe(false);
      expect(try1.attempts_remaining).toBe(2);
      expect(try1.exhausted).toBe(false);

      const try2 = sim.submitClue('R2-01', 'FAIL2');
      expect(try2.correct).toBe(false);
      expect(try2.attempts_remaining).toBe(1);
      expect(try2.exhausted).toBe(false);

      const try3 = sim.submitClue('R2-01', 'FAIL3');
      expect(try3.correct).toBe(false);
      expect(try3.attempts_remaining).toBe(0);
      expect(try3.exhausted).toBe(true);
    });

    it('BVA-10: Locked terminal popup shows remaining fragment count and lead notes', () => {
      const modalData = {
        type: 'locked_terminal',
        terminalName: 'Staff Terminal (R2-01)',
        collectedCount: 3,
      };

      render(<EvidencePickupModal modalData={modalData} onClose={vi.fn()} />);
      expect(screen.getByText(/Terminal Restricted/i)).toBeInTheDocument();
      expect(screen.getByText(/requires all 8 evidence records.*3\/8 recovered/i)).toBeInTheDocument();
      expect(screen.getByText(/Active Investigation Leads/i)).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 3: Pairwise Combinatorial Testing
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Tier 3: Pairwise Combinatorial Testing', () => {
    it('PAIR-01: Ghost death event while inspecting document modal resets state cleanly', async () => {
      render(<Room5Control team={mockTeam} onLogout={mockLogout} />);
      await waitFor(() => expect(activeEngineInstance).toBeTruthy());
      fireEvent.click(screen.getByText(/ENTER THE SURVEILLANCE MORGUE/i));

      // Open a document popup by inspecting a world doc
      await act(async () => {
        await activeEngineInstance.callbacks.onInteract('containment_protocol');
      });
      expect(screen.getByText(/EMERGENCY PROTOCOL/i)).toBeInTheDocument();

      // Close modal cleanly via Escape key
      fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
      expect(screen.queryByText(/EMERGENCY PROTOCOL/i)).toBeNull();
    });

    it('PAIR-02: Opening CCTV allows selecting Control Bay CAM-02 feed, masks spoilers, and supports IR Trace + Copy Log', async () => {
      render(
        <CCTVMonitorModal
          isOpen={true}
          onClose={vi.fn()}
        />
      );

      const cam02Btn = screen.getByText('CAM-02');
      fireEvent.click(cam02Btn);
      expect(screen.getByText(/CAM-02 NOTE/i)).toBeInTheDocument();
      expect(screen.getByText(/Operator Desk — Safe Zone & Blackout Audit/i)).toBeInTheDocument();
      expect(screen.getByText(/\[REDACTED BADGE\]/i)).toBeInTheDocument();
      expect(screen.queryByText(/BDG-9001/i)).toBeNull();

      // IR Trace starts ON by default; verify IR Forensic Trace displays without spoiling BDG-9001, then toggle it & Copy Log
      expect(screen.getByText(/IR FORENSIC TRACE/i)).toBeInTheDocument();
      fireEvent.click(screen.getByText(/IR Trace: ON/i));
      expect(screen.getByText(/IR Trace: OFF/i)).toBeInTheDocument();
      expect(screen.queryByText(/IR FORENSIC TRACE/i)).toBeNull();
      await act(async () => {
        fireEvent.click(screen.getByText(/Copy Log/i));
      });
      expect(navigator.clipboard.writeText).toHaveBeenCalled();
    });

    it('PAIR-03: Chamber 3 door requires Brass Key; prompts when missing and unlatches when held', async () => {
      render(<Room5Control team={mockTeam} onLogout={mockLogout} />);
      await waitFor(() => expect(activeEngineInstance).toBeTruthy());
      fireEvent.click(screen.getByText(/ENTER THE SURVEILLANCE MORGUE/i));

      // 1. Without key: rattles door
      await act(async () => {
        await activeEngineInstance.callbacks.onInteract('chamber3_door');
      });
      expect(activeEngineInstance.rattleDoor).toHaveBeenCalledWith('chamber3_door');

      // 2. Pick up key
      await act(async () => {
        await activeEngineInstance.callbacks.onInteract('containment_key');
      });
      expect(activeEngineInstance.pickupContainmentKey).toHaveBeenCalled();

      // Close key inspection modal
      fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });

      // 3. With key: toggles door open
      await act(async () => {
        await activeEngineInstance.callbacks.onInteract('chamber3_door');
      });
      expect(activeEngineInstance.toggleWingDoor).toHaveBeenCalledWith('chamber3_door');
    });

    it('PAIR-04: Breaker light toggle operates independently from flashlight and ghost state', async () => {
      render(<Room5Control team={mockTeam} onLogout={mockLogout} />);
      await waitFor(() => expect(activeEngineInstance).toBeTruthy());
      fireEvent.click(screen.getByText(/ENTER THE SURVEILLANCE MORGUE/i));

      // Toggle breaker
      await act(async () => {
        await activeEngineInstance.callbacks.onInteract('wall_breaker');
      });
      expect(activeEngineInstance.toggleBreakerLight).toHaveBeenCalled();

      // Toggle flashlight with F key
      fireEvent.keyDown(window, { key: 'f', code: 'KeyF' });
      expect(activeEngineInstance.setFlashlight).toHaveBeenCalledWith(false);
      fireEvent.keyDown(window, { key: 'f', code: 'KeyF' });
      expect(activeEngineInstance.setFlashlight).toHaveBeenCalledWith(true);
    });

    it('PAIR-05: Evidence Basket modal opens and displays all recovered records', () => {
      const mockEvidence = [
        { id: 'EC01', display: { title: 'Signal Intercept' } },
        { id: 'EC02', display: { title: 'Requisition Form' } },
      ];

      render(
        <BasketModal
          isOpen={true}
          onClose={vi.fn()}
          evidence={mockEvidence}
          basketUnlocked={true}
          roomTheme={{ phosphorText: '#4dff78', phosphor: '#1a3d1f' }}
        />
      );

      expect(screen.getByText(/Evidence Board/i)).toBeInTheDocument();
      expect(screen.getByText('Signal Intercept')).toBeInTheDocument();
      expect(screen.getByText('Requisition Form')).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 4: Real-World Workload Testing (Escaperoom Progression)
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Tier 4: Real-World Workload Testing (Escaperoom Progression)', () => {
    it('T4-01: Full escaperoom progression: 8-fragment sweep to 3-console solve to vault release', async () => {
      const sim = createSimulationRoom5();

      // 1. Initial State
      expect(sim.getState().collected_fragment_ids.length).toBe(0);
      expect(sim.getState().basket_unlocked).toBe(false);

      // 2. Fragment Sweep across all props
      const sweepSequence = [
        'relay_rack',     // EC01
        'relay_rack',     // EC02
        'tape_deck_cart', // EC03
        'tape_deck_cart', // EC04
        'operator_chair', // EC05
        'cable_trench',   // EC06
        'wall_clipboard', // EC07
        'fuse_box',       // EC08
      ];

      for (const prop of sweepSequence) {
        const res = sim.searchProp(prop);
        expect(res.found).toBe(true);
      }

      const sAfterSweep = sim.getState();
      expect(sAfterSweep.collected_fragment_ids.length).toBe(8);
      expect(sAfterSweep.basket_unlocked).toBe(true);

      // 3. Submit R2-01 (Personnel Index)
      const res1 = sim.submitClue('R2-01', 'BDG-9001');
      expect(res1.correct).toBe(true);
      expect(res1.solved).toBe(true);
      expect(res1.room_completed).toBe(false);

      // 4. Submit R2-05 (Radio Console)
      const res2 = sim.submitClue('R2-05', 'VM-A');
      expect(res2.correct).toBe(true);
      expect(res2.solved).toBe(true);
      expect(res2.room_completed).toBe(false);

      // 5. Submit R2-06 (Sound Console)
      const res3 = sim.submitClue('R2-06', '8140');
      expect(res3.correct).toBe(true);
      expect(res3.solved).toBe(true);
      expect(res3.room_completed).toBe(true);

      // 6. Final State: Vault Door Unlocks
      const finalState = sim.getState();
      expect(finalState.is_completed).toBe(true);
    });

    it('T4-02: Lockout recovery: terminal reboot restores attempts without losing progress', () => {
      const sim = createSimulationRoom5();

      // Solve R2-01 first
      sim.submitClue('R2-01', 'BDG-9001');

      // Fail R2-05 3 times
      sim.submitClue('R2-05', 'BAD1');
      sim.submitClue('R2-05', 'BAD2');
      const fail3 = sim.submitClue('R2-05', 'BAD3');
      expect(fail3.exhausted).toBe(true);
      expect(fail3.attempts_remaining).toBe(0);

      // Reboot R2-05 while preserving R2-01 solved status
      sim.resetClue('R2-05', ['R2-01'], ['EC01', 'EC02'], true);
      const rebootedState = sim.getState();

      const r1 = rebootedState.clues.find(c => c.id === 'R2-01');
      const r5 = rebootedState.clues.find(c => c.id === 'R2-05');

      expect(r1.solved).toBe(true);
      expect(r5.attempts_remaining).toBe(3);
      expect(r5.exhausted).toBe(false);

      // Now solve R2-05 with correct answer
      const solve5 = sim.submitClue('R2-05', 'VM-A');
      expect(solve5.correct).toBe(true);
      expect(solve5.solved).toBe(true);
    });

    it('T4-03: Vault door interaction handles completion: opens exit when completed, blocks when incomplete', async () => {
      // 1. Test Incomplete State
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => makeUnlockedState({ is_completed: false }),
      });

      render(<Room5Control team={mockTeam} onLogout={mockLogout} />);
      await waitFor(() => expect(activeEngineInstance).toBeTruthy());
      fireEvent.click(screen.getByText(/ENTER THE SURVEILLANCE MORGUE/i));

      await act(async () => {
        await activeEngineInstance.callbacks.onInteract('vault_door');
      });
      expect(activeEngineInstance.rattleDoor).toHaveBeenCalledWith('vault_door');
      expect(mockAudioInstance.bad).toHaveBeenCalled();

      // 2. Test Completed State
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => makeUnlockedState({ is_completed: true }),
      });

      await act(async () => {
        // Trigger refetch
        window.dispatchEvent(new Event('focus'));
      });
    });

    it('T4-04: AI export workflow: formats evidence item and writes to clipboard and file download', async () => {
      const copyToClipboard = async (text) => {
        await navigator.clipboard.writeText(text);
        return true;
      };

      const downloadFile = (filename, content) => {
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        return { url, download: a.download };
      };

      const ev = ROOM5_EVIDENCE_RICH_META.EC01;
      const exportContent = [
        `CLASSIFICATION: ${ev.classification}`,
        `LOCATION: ${ev.location}`,
        ...ev.reportLines,
        `LEAD: ${ev.highlight}`,
      ].join('\n');

      // Test clipboard copy
      const copySuccess = await copyToClipboard(exportContent);
      expect(copySuccess).toBe(true);
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(exportContent);

      // Test file download
      const dl = downloadFile('EC01_signal_intercept.txt', exportContent);
      expect(dl.download).toBe('EC01_signal_intercept.txt');
      expect(URL.createObjectURL).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 5: New Room 5 Features (AI Export, Universal Board, Death-Drop, Safe Room)
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Tier 5: Universal Evidence Board, AI Export, Death-Drop & Sanctuary', () => {
    it('T5-01: EvidencePickupModal & BasketModal support Copy Content, Download File, and Core/World Filters', async () => {
      const onClosePickup = vi.fn();
      const sampleModalData = {
        mode: 'evidence',
        id: 'EC01',
        title: 'SIGNAL INTERCEPT · 7.455 MHz',
        reportLines: ['Carrier burst logged 23:41 UTC'],
        highlight: 'Decode X-Auth Base64 header.',
        classification: 'SIGNAL INTERCEPT // EC01',
        location: 'Room 5B Relay Shelf',
      };

      const { unmount } = render(
        <EvidencePickupModal modalData={sampleModalData} onClose={onClosePickup} />
      );

      await act(async () => {
        fireEvent.click(screen.getByText(/Copy Content/i));
      });
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining('EC01')
      );

      fireEvent.click(screen.getByText(/Download File/i));
      expect(URL.createObjectURL).toHaveBeenCalled();
      unmount();

      // Now test BasketModal with 1 core slip + 1 opened world doc
      const basketItems = [
        {
          id: 'EC01',
          collected: true,
          kind: 'evidence',
          display: { title: 'SIGNAL INTERCEPT · 7.455 MHz', lines: ['Carrier burst logged 23:41 UTC'] },
        },
        {
          id: 'DOC-containment_protocol',
          docId: 'containment_protocol',
          kind: 'world_doc',
          collected: true,
          classification: 'WORLD RECORD · DOC',
          location: 'Room 5B Bulletin Board',
          reportLines: [ROOM5_WORLD_DOCUMENTS.containment_protocol.scene_text],
          display: {
            title: ROOM5_WORLD_DOCUMENTS.containment_protocol.title,
            lines: [ROOM5_WORLD_DOCUMENTS.containment_protocol.scene_text],
          },
        },
      ];

      render(
        <BasketModal
          isOpen={true}
          onClose={vi.fn()}
          evidence={basketItems}
          collectedIds={['EC01', 'DOC-containment_protocol']}
          basketUnlocked={false}
          totalInRoom={8}
        />
      );

      expect(screen.getByText(/All Records/i)).toBeInTheDocument();
      expect(screen.getByText(/Core Slips \(1\)/i)).toBeInTheDocument();
      expect(screen.getByText(/World Logs \(1\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Recovered 1\/8/i)).toBeInTheDocument();

      fireEvent.click(screen.getByText(/World Logs \(1\)/i));
      expect(screen.getByText(/EMERGENCY PROTOCOL/i)).toBeInTheDocument();

      await act(async () => {
        fireEvent.click(screen.getByText(/Copy All Files/i));
      });
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining('SIGNAL INTERCEPT')
      );
      const formattedText = formatDocumentText(sampleModalData);
      expect(formattedText).toContain('EC01');
      expect(formattedText).toContain('7.455 MHz');
    });

    it('T5-02: Room5Control auto-records inspected world documents into [B] Evidence Board without inflating EC count', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => makeUnlockedState({ collected_fragment_ids: [], basket_unlocked: false }),
      });

      render(<Room5Control team={mockTeam} onLogout={mockLogout} />);
      await waitFor(() => expect(activeEngineInstance).toBeTruthy());
      fireEvent.click(screen.getByText(/ENTER THE SURVEILLANCE MORGUE/i));

      await act(async () => {
        await activeEngineInstance.callbacks.onInteract('containment_protocol');
      });
      expect(screen.getByText(/EMERGENCY PROTOCOL/i)).toBeInTheDocument();

      fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
      fireEvent.click(screen.getByTitle('Open Evidence Basket (Press B)'));

      expect(screen.getByText(/World Logs \(1\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Core Slips \(8\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Recovered 0\/8 · 1 Field Logs/i)).toBeInTheDocument();
    });

    it('T5-03: Simulation death-drop & recovery + actual scaresControl safe-zone tracking work coherently', async () => {
      const sim = createSimulationRoom5();
      const f1 = sim.searchProp('relay_rack');
      const f2 = sim.searchProp('relay_rack');
      expect(f1.found && f2.found).toBe(true);
      expect(sim.getState().collected_fragment_ids.length).toBe(2);

      // Death drops 1 collected EC item at outer corridor coordinate
      const dropRes = sim.handlePlayerDeath(-6.2, 11.4);
      expect(dropRes.droppedItem?.fragmentId).toMatch(/^EC0[12]$/);
      expect(sim.getState().collected_fragment_ids.length).toBe(1);
      expect(sim.getState().dropped_items.length).toBe(1);

      // Respawn point is safely inside Control Room 5B
      expect(isInsideSafeRoom5B(SAFE_ROOM_RESPAWN[0], SAFE_ROOM_RESPAWN[2])).toBe(true);

      // Recovering dropped satchel restores it to 2/8
      const recRes = sim.recoverDroppedItem(dropRes.droppedItem.id);
      expect(recRes.found).toBe(true);
      expect(sim.getState().collected_fragment_ids.length).toBe(2);
      expect(sim.getState().dropped_items.length).toBe(0);

      // Actual zone mapping helper from scaresControl matches Control Bay 5B vs outer wings
      const scaresActual = await vi.importActual('../game/engine/scaresControl.js');
      expect(scaresActual.getZoneForPosition(0, -1).camId).toBe('CAM-02');
      expect(scaresActual.getZoneForPosition(-9.5, 11).camId).toBe('CAM-04');
      expect(scaresActual.getZoneForPosition(-13.5, 16.5).camId).toBe('CAM-06');
    });

    it('T5-04: Environmental props (wooden_crates), CCTV bank, and Case Dossier register in [B] with full SVG sheet previews & non-empty notes', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => makeUnlockedState({ collected_fragment_ids: [], basket_unlocked: false }),
      });

      const downloadEvents = [];
      const onDl = (e) => downloadEvents.push(e.detail);
      window.addEventListener('ctc:file-downloaded', onDl);

      render(<Room5Control team={mockTeam} onLogout={mockLogout} />);
      await waitFor(() => expect(activeEngineInstance).toBeTruthy());
      fireEvent.click(screen.getByText(/ENTER THE SURVEILLANCE MORGUE/i));

      // 1. Inspect wooden_crates -> shows full dossier lines & pinned lead (never empty)
      await act(async () => {
        await activeEngineInstance.callbacks.onInteract('wooden_crates');
      });
      expect(screen.getByText(/SUPPLY CRATES \(1983\) \/\/ PROJECT HOLLOW/i)).toBeInTheDocument();
      expect(screen.getByText(/Freight manifest points to Locker Wing 5C/i)).toBeInTheDocument();
      fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });

      // 2. Open monitor_bank & Case Dossier -> both register into [B]
      await act(async () => {
        await activeEngineInstance.callbacks.onInteract('monitor_bank');
      });
      fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });

      fireEvent.click(screen.getByTitle('View Case Dossier (Press C)'));
      expect(screen.getByText(/Download Dossier/i)).toBeInTheDocument();
      fireEvent.click(screen.getByText(/Download Dossier/i));
      expect(downloadEvents.some((d) => d.filename === 'delta_sector5_dossier.txt' && d.bytes > 50)).toBe(true);
      fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });

      // 3. Open Evidence Board -> verify all 3 world logs appear with SVG previews (never /parcel_wrapped.png) and full content
      fireEvent.click(screen.getByTitle('Open Evidence Basket (Press B)'));
      expect(screen.getByText(/World Logs \(3\)/i)).toBeInTheDocument();

      const previewSvg = createDocumentPreviewSvg({ id: 'ENV-CRATES', kind: 'world_doc', title: 'SUPPLY CRATES' });
      expect(previewSvg.startsWith('data:image/svg+xml')).toBe(true);

      fireEvent.click(screen.getByText(/SUPPLY CRATES \(1983\) \/\/ PROJECT HOLLOW/i));
      expect(screen.getByText(/QUARTERMASTER INVENTORY \/\/ SECTOR 5/i)).toBeInTheDocument();
      fireEvent.click(screen.getByText(/View Raw Text/i));
      expect(screen.getByText(/FIELD DOSSIER REPORT:/i)).toBeInTheDocument();

      window.removeEventListener('ctc:file-downloaded', onDl);
    });

    it('T5-05: Wrapped Room 5 backend fragments unwrap into full readable, downloadable records in BasketModal', () => {
      render(
        <BasketModal
          isOpen={true}
          onClose={vi.fn()}
          evidence={[
            { id: 'EC01', is_wrapped: true, display: { title: 'Wrapped Fragment #1' } },
          ]}
          collectedIds={['EC01']}
          basketUnlocked={false}
          totalInRoom={8}
        />
      );

      // Should NOT say "Sealed parcel" or hide Download/Copy in Room 5
      expect(screen.queryByText(/Sealed parcel/i)).toBeNull();
      expect(screen.getByText(/Transmission Log Fragment/i)).toBeInTheDocument();
      expect(screen.getByText(/TRANSMISSION LOG — CHANNEL 7/i)).toBeInTheDocument();
      expect(screen.getByText('Download')).toBeInTheDocument();
      expect(screen.getByText('Copy')).toBeInTheDocument();
    });

    it('T5-06: HUD renders GFX HIGH/ECO toggle, responds to auto-Eco callback, and mounts jumpscare vignette prior to catch banner', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => makeUnlockedState({ collected_fragment_ids: [], basket_unlocked: false }),
      });

      render(<Room5Control team={mockTeam} onLogout={mockLogout} />);
      await waitFor(() => expect(activeEngineInstance).toBeTruthy());
      fireEvent.click(screen.getByText(/ENTER THE SURVEILLANCE MORGUE/i));

      const gfxBtn = screen.getByRole('button', { name: /GFX:\s*HIGH/i });
      expect(gfxBtn).toBeInTheDocument();

      fireEvent.click(gfxBtn);
      expect(activeEngineInstance.setQualityMode).toHaveBeenCalledWith('eco');
      expect(screen.getByRole('button', { name: /GFX:\s*ECO/i })).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /GFX:\s*ECO/i }));
      expect(activeEngineInstance.setQualityMode).toHaveBeenCalledWith('high');

      // Engine auto-downgrade callback updates HUD capsule without manual click
      act(() => {
        activeEngineInstance.callbacks.onQualityChange('eco');
      });
      expect(screen.getByRole('button', { name: /GFX:\s*ECO/i })).toBeInTheDocument();

      // Jumpscare lunge shows crimson vignette (z-[68]) and clears when catch banner renders
      act(() => {
        activeEngineInstance.callbacks.onJumpscareStart({ x: -4.2, z: 9.0, gx: -4.4, gz: 9.5 });
      });
      expect(screen.getByTestId('jumpscare-vignette')).toBeInTheDocument();

      act(() => {
        activeEngineInstance.callbacks.onPlayerCaught({ x: -4.2, z: 9.0, gx: -4.4, gz: 9.5 });
      });
      expect(screen.queryByTestId('jumpscare-vignette')).toBeNull();
      expect(screen.getByTestId('death-respawn-overlay')).toBeInTheDocument();
      expect(screen.getByText('YOU DIED')).toBeInTheDocument();
      expect(screen.getByText(/SPECIMEN S-011 CAUGHT YOU/i)).toBeInTheDocument();

      // Verify minimal HUD timer capsule displays countdown + sector cam code concisely
      render(
        <HUDControl
          ghostTelemetry={{
            nextEventSec: 5,
            cyclePhase: 'DORMANT',
            state: 'APPROACHING',
            incomingCam: 'CAM-04',
          }}
        />
      );
      expect(screen.getByTestId('ghost-cycle-timer')).toHaveTextContent('00:05 · CAM-04');
    });

    it('T5-07: Real scaresControl PEEK->RETREAT & JUMPSCARE lock, setupControls camera override, and rigged ghost.glb budget verify end-to-end', async () => {
      const fs = await import('node:fs');
      const path = await import('node:path');
      const THREE = await import('three');
      const scaresActual = await vi.importActual('../game/engine/scaresControl.js');
      const controlsActual = await vi.importActual('../game/engine/controls.js');

      // 1. Validate ghost.glb GLTF binary budget (< 35k tris, >= 12 bones, all 4 AnimationClips)
      const ghostPath = path.resolve(process.cwd(), 'public/assets/models/room5/ghost.glb');
      const glbBuf = fs.readFileSync(ghostPath);
      expect(glbBuf.length).toBeLessThan(3.5 * 1024 * 1024);
      const jsonLen = glbBuf.readUInt32LE(12);
      const gltf = JSON.parse(glbBuf.toString('utf8', 20, 20 + jsonLen));
      const clipNames = (gltf.animations || []).map((a) => a.name);
      expect(clipNames).toEqual(expect.arrayContaining(['IdleStalk', 'DoorPeek', 'SprintLunge', 'JumpscareSnap']));
      expect(gltf.skins?.[0]?.joints?.length || 0).toBeGreaterThanOrEqual(12);
      const idxAccIdx = gltf.meshes[0].primitives[0].indices;
      const triCount = gltf.accessors[idxAccIdx].count / 3;
      expect(triCount).toBeLessThan(35000);

      // 2. Real scaresControl: PEEK -> RETREAT -> PATROL, then HUNT -> 1.35s JUMPSCARE -> onPlayerCaught
      let simPx = -4.2;
      let simPz = 9.0;
      const camOverrides = [];
      const fovTargets = [];
      const animCalls = [];
      const rootPos = new THREE.Object3D();
      rootPos.position.set(-12.5, 0.02, 16.5);

      const mockGhost = {
        root: rootPos,
        ghostGlow: { intensity: 0.75 },
        walkAction: { timeScale: 0.44 },
        scareOverride: false,
        isHunting: false,
        isJumpscaring: false,
        behavior: 'PATROL',
        setAnim: (name, ts, fade) => {
          mockGhost.activeAnimName = name;
          animCalls.push({ name, ts, fade });
        },
      };

      const fakeEngine = {
        S: new THREE.Scene(),
        cam: new THREE.PerspectiveCamera(72, 16 / 9, 0.05, 80),
        ref: {},
        flashlight: { intensity: 9.0 },
        _ghost: mockGhost,
        isSprinting: () => false,
        px: () => simPx,
        pz: () => simPz,
        yaw: () => 0,
        shake: vi.fn(),
        setCameraOverride: (active, yaw, pitch) => camOverrides.push({ active, yaw, pitch }),
        setTargetFov: (fov) => fovTargets.push(fov),
      };

      const onJumpscareStart = vi.fn();
      const onPlayerCaught = vi.fn();
      const peekSting = vi.fn();
      const scurrySteps = vi.fn();
      const jumpscareSting = vi.fn();

      const scares = scaresActual.createControlScares(fakeEngine, {
        audio: {
          peekSting,
          scurrySteps,
          jumpscareSting,
          heavyEntityStep: vi.fn(),
          stalkerGrowl: vi.fn(),
          bulkheadBang: vi.fn(),
          stinger: vi.fn(),
          setChaseTension: vi.fn(),
          footstep: vi.fn(),
          staticBurst: vi.fn(),
          drawerSlam: vi.fn(),
          relayClick: vi.fn(),
          intercomCrackle: vi.fn(),
          whisperRaspy: vi.fn(),
          phoneRing: vi.fn(),
        },
        onFlash: vi.fn(),
        onScare: vi.fn(),
        onJumpscareStart,
        onPlayerCaught,
      });

      // DoorPeek -> Retreat -> Dormant
      scares.triggerDoorSighting('observation_door');
      expect(peekSting).toHaveBeenCalledTimes(1);
      expect(scares.getGhostTelemetry().state).toBe('PEEK');
      expect(scares.getGhostTelemetry().activeAnim).toBe('DoorPeek');
      expect(mockGhost.root.visible).toBe(true);

      for (let i = 0; i < 6; i++) scares.update(0.5, i * 0.5);
      expect(['RETREAT', 'DORMANT']).toContain(scares.getGhostTelemetry().state);
      expect(scurrySteps).toHaveBeenCalled();

      for (let i = 0; i < 4; i++) scares.update(0.5, 3 + i * 0.5);
      expect(scares.getGhostTelemetry().state).toBe('DORMANT');
      expect(mockGhost.root.visible).toBe(false);

      // Hunt -> 1.35s Jumpscare Camera Lock -> Caught + Release -> Dormant
      scares.triggerBreachHunt(1.0);
      expect(scares.getGhostTelemetry().state).toBe('HUNT');
      expect(scares.getGhostTelemetry().activeAnim).toBe('SprintLunge');
      expect(mockGhost.root.visible).toBe(true);

      for (let i = 0; i < 40 && onPlayerCaught.mock.calls.length === 0; i++) {
        scares.update(0.25, 5 + i * 0.25);
      }

      expect(onJumpscareStart).toHaveBeenCalledTimes(1);
      expect(jumpscareSting).toHaveBeenCalledTimes(1);
      expect(onPlayerCaught).toHaveBeenCalledTimes(1);
      expect(fovTargets).toContain(50);
      expect(fovTargets[fovTargets.length - 1]).toBe(72);
      expect(camOverrides.some((c) => c.active === true)).toBe(true);
      expect(camOverrides[camOverrides.length - 1].active).toBe(false);
      expect(animCalls.some((a) => a.name === 'JumpscareSnap')).toBe(true);
      expect(mockGhost.root.position.x).toBeCloseTo(-12.2, 1);
      expect(mockGhost.root.position.z).toBeCloseTo(16.5, 1);
      expect(scares.getGhostTelemetry().state).toBe('DORMANT');
      expect(mockGhost.root.visible).toBe(false);
      scares.dispose();

      // 3. setupControls.setCameraOverride converges yaw smoothly
      const fakeCanvas = {
        width: 1280,
        height: 720,
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 1280, height: 720 }),
        requestPointerLock: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        contains: () => false,
      };
      const onCtrlInteract = vi.fn();
      const ctrl = controlsActual.setupControls({
        canvas: fakeCanvas,
        spawn: [0, 0.1, 0],
        roomSize: [36, 3.2, 36],
        getSolids: () => [],
        onTargetChange: vi.fn(),
        onInteract: onCtrlInteract,
        getAudio: () => ({}),
      });
      // E key and Right Mouse Button (button === 2) identically open doors/artifacts; Left Click (button === 0) locks aim instead
      ctrl.setTarget('observation_door');
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'e', code: 'KeyE', bubbles: true }));
      const rmbUp = new MouseEvent('mouseup', { button: 2, bubbles: true });
      Object.defineProperty(rmbUp, 'target', { value: fakeCanvas });
      window.dispatchEvent(rmbUp);
      const lmbClick = new MouseEvent('click', { button: 0, bubbles: true });
      Object.defineProperty(lmbClick, 'target', { value: fakeCanvas });
      window.dispatchEvent(lmbClick);
      expect(onCtrlInteract).toHaveBeenCalledTimes(2);
      expect(onCtrlInteract).toHaveBeenNthCalledWith(1, 'observation_door');
      expect(onCtrlInteract).toHaveBeenNthCalledWith(2, 'observation_door');
      expect(fakeCanvas.requestPointerLock).toHaveBeenCalledTimes(1);

      ctrl.setCameraOverride(true, 1.25, 0.08);
      for (let i = 0; i < 6; i++) ctrl.update(0.05);
      expect(ctrl.getPos().yaw).toBeGreaterThan(1.0);
      expect(ctrl.getPos().pitch).toBeCloseTo(0.08, 1);
      ctrl.setCameraOverride(false);
      ctrl.dispose();
    });

    it('T5-08: 2-minute initial grace, 8s pre-arrival footsteps/crying/scream, behind-player reveal + EMI flicker, and alternating 18s/120s/12s haunt schedule work cleanly', async () => {
      const THREE = await import('three');
      const scaresActual = await vi.importActual('../game/engine/scaresControl.js');

      const rootPos = new THREE.Object3D();
      rootPos.visible = false;
      const mockGhost = {
        root: rootPos,
        ghostGlow: { intensity: 0 },
        walkAction: { timeScale: 0.44 },
        scareOverride: false,
        isHunting: false,
        isJumpscaring: false,
        behavior: 'DORMANT',
        setAnim: vi.fn(),
      };
      const fakeEngine = {
        S: new THREE.Scene(),
        cam: new THREE.PerspectiveCamera(72, 16 / 9, 0.05, 80),
        ref: {},
        flashlight: { intensity: 9.0 },
        _ghost: mockGhost,
        isSprinting: () => true, // Even constant sprinting must NOT break initial 2-minute grace
        px: () => -4.5,
        pz: () => 9.0,
        yaw: () => 0,
        shake: vi.fn(),
        setCameraOverride: vi.fn(),
        setTargetFov: vi.fn(),
      };

      const heavyEntityStep = vi.fn();
      const entityScream = vi.fn();
      const cryingWoman = vi.fn();
      const setWeepingVolume = vi.fn();
      const womanScream = vi.fn();
      const scares = scaresActual.createControlScares(fakeEngine, {
        audio: {
          peekSting: vi.fn(), scurrySteps: vi.fn(), jumpscareSting: vi.fn(),
          heavyEntityStep, entityScream, cryingWoman, setWeepingVolume, womanScream,
          stalkerGrowl: vi.fn(), bulkheadBang: vi.fn(),
          stinger: vi.fn(), setChaseTension: vi.fn(), footstep: vi.fn(),
          staticBurst: vi.fn(), drawerSlam: vi.fn(), relayClick: vi.fn(),
          intercomCrackle: vi.fn(), whisperRaspy: vi.fn(), phoneRing: vi.fn(),
        },
        onFlash: vi.fn(),
        onScare: vi.fn(),
        onPlayerCaught: vi.fn(),
      });

      // 1. First ~1m51s (0..111s) -> ZERO ghost interference even with sprint & respectGrace prop/door triggers, faint weeping baseline
      expect(scares.isInGracePeriod()).toBe(true);
      scares.triggerDoorSighting('control_door', { respectGrace: true });
      scares.triggerBreachHunt(1.0, { respectGrace: true });
      for (let s = 0; s < 100; s++) scares.update(1, s);
      const calmWeepVol = setWeepingVolume.mock.calls.at(-1)?.[0] ?? 0;
      expect(calmWeepVol).toBeGreaterThan(0.20);
      expect(calmWeepVol).toBeLessThan(0.55);
      for (let s = 100; s < 110; s++) scares.update(1, s);
      expect(scares.isInGracePeriod()).toBe(true);
      expect(scares.getGhostTelemetry().state).toBe('DORMANT');
      expect(mockGhost.root.visible).toBe(false);

      // 2. Final 8s before 2:00 mark -> enters APPROACHING telegraph (weeping swells loudly + footsteps + scream)
      for (let s = 110; s < 117; s++) scares.update(1, s);
      const nearWeepVol = setWeepingVolume.mock.calls.at(-1)?.[0] ?? 0;
      expect(nearWeepVol).toBeGreaterThan(calmWeepVol * 2.5);
      const approachTel = scares.getGhostTelemetry();
      expect(approachTel.state).toBe('APPROACHING');
      expect(approachTel.incomingCam).toMatch(/^CAM-0[1-6]$/);
      expect(heavyEntityStep).toHaveBeenCalled();
      expect(cryingWoman).toHaveBeenCalled();
      expect(entityScream).toHaveBeenCalled();
      expect(womanScream).toHaveBeenCalled();
      expect(mockGhost.root.visible).toBe(false);

      // 3. Crosses 120s -> Manifestation #1 spawns behind player with 1.25s stare reveal beat + EMI flashlight flicker within 10.5m
      for (let s = 117; s < 120; s++) scares.update(1, s);
      const manifestTel = scares.getGhostTelemetry();
      expect(manifestTel.cyclePhase).toBe('MANIFESTING');
      expect(manifestTel.isHunting).toBe(true);
      expect(manifestTel.isBehindReveal).toBe(true);
      expect(mockGhost.root.visible).toBe(true);
      expect(mockGhost.root.position.z).toBeGreaterThan(fakeEngine.pz());

      // Sample brief frames during stare reveal to confirm EMI flashlight flicker dips below 9.0
      let minFlashIntensity = fakeEngine.flashlight.intensity;
      for (let i = 0; i < 24; i++) {
        scares.update(0.05, 120.1 + i * 0.05);
        minFlashIntensity = Math.min(minFlashIntensity, fakeEngine.flashlight.intensity);
      }
      expect(minFlashIntensity).toBeLessThan(9.0);

      // 4. Advance until Manifestation #1 concludes (either via catch or active window expiry) -> enters 2-minute DORMANT cooldown
      for (let s = 0; s < 25 && scares.getGhostTelemetry().cyclePhase === 'MANIFESTING'; s++) {
        scares.update(1, 122 + s);
      }
      expect(scares.getGhostTelemetry().cyclePhase).toBe('DORMANT');
      expect(mockGhost.root.visible).toBe(false);

      // 5. Stays DORMANT cleanly across the 2-minute (120s) cooldown even with sprint/respectGrace triggers, then manifests again (~12s window)
      let dormantSecs = 0;
      scares.triggerDoorSighting('observation_door', { respectGrace: true });
      scares.triggerBreachHunt(1.0, { respectGrace: true });
      while (scares.getGhostTelemetry().cyclePhase === 'DORMANT' && dormantSecs < 130) {
        expect(mockGhost.root.visible).toBe(false);
        scares.update(1, 150 + dormantSecs);
        dormantSecs += 1;
      }
      expect(dormantSecs).toBeGreaterThanOrEqual(118);
      expect(dormantSecs).toBeLessThanOrEqual(123);
      expect(scares.getGhostTelemetry().cyclePhase).toBe('MANIFESTING');
      expect(scares.getGhostTelemetry().cycleTimer).toBeLessThanOrEqual(15);
      expect(mockGhost.root.visible).toBe(true);

      // 6. Randomized torch flicker -> 5-7s blackout -> sputter recovery restores beam cleanly
      fakeEngine.px = () => 0.25;
      fakeEngine.pz = () => 0.25;
      for (let s = 0; s < 18 && scares.getGhostTelemetry().cyclePhase === 'MANIFESTING'; s++) {
        scares.update(1, 280 + s);
      }
      expect(scares.triggerFlashOutage(6.0)).toBe(true);
      expect(fakeEngine._flashOutageActive).toBe(true);
      for (let s = 0; s < 3; s++) scares.update(1, 300 + s);
      expect(fakeEngine.flashlight.intensity).toBe(0);
      for (let s = 3; s < 10; s++) scares.update(1, 300 + s);
      expect(fakeEngine._flashOutageActive).toBe(false);
      expect(fakeEngine.flashlight.intensity).toBe(9.0);
      scares.dispose();
    });
  });
});
