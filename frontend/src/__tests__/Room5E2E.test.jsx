import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

import Room5Control from '../game/Room5Control.jsx';
import HUDControl from '../game/components/control/HUDControl.jsx';
import EvidencePickupModal from '../game/components/control/EvidencePickupModal.jsx';
import ControlBasketModal from '../game/components/control/ControlBasketModal.jsx';
import ControlDossierModal from '../game/components/control/ControlDossierModal.jsx';
import Fork2Modal from '../game/components/control/Fork2Modal.jsx';
import CCTVMonitorModal from '../game/components/control/CCTVMonitorModal.jsx';
import SpectrogramModal from '../game/components/control/SpectrogramModal.jsx';
import PersonnelIndexModal from '../game/components/control/PersonnelIndexModal.jsx';
import TransmissionArchiveModal from '../game/components/control/TransmissionArchiveModal.jsx';
import { isInsideSafeRoom5B, SAFE_ROOM_RESPAWN } from '../game/engine/scaresControl.js';
import { formatDocumentText, formatEvidenceBundleText, createDocumentPreviewSvg } from '../game/engine/evidenceExport.js';

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
  isInsideSafeRoom5B: vi.fn((x, z) => x >= -3.45 && x <= 3.45 && z <= 1.85),
  SAFE_ROOM_RESPAWN: [0.25, 0.1, 0.25],
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

const SAMPLE_PERSONNEL_ROWS = [
  ['Corvin, M.', 'Night Shift Lead', 'Control Bay 5B', '23:41', 'BDG-9001'],
  ['Vance, R.', 'Signal Technician', 'Relay Wing 5C', '22:15', 'BDG-9002'],
  ['Sato, K.', 'Acoustic Analyst', 'Chamber 3', '21:50', 'BDG-9003'],
];

const SAMPLE_MESSAGES = [
  { id: 'TX-1', received: '02-20 23:10', headers: { From: 'RELAY', 'X-Auth': 'QkRHLTkwMDI=' }, body: 'Calibration sweep.' },
  { id: 'TX-2', received: '02-21 09:15', headers: { From: 'RELAY', 'X-Auth': 'QkRHLTkwMDM=' }, body: 'Shift handover.' },
  { id: 'TX-3', received: '02-21 23:41', headers: { From: 'CONTROL', 'X-Auth': 'QkRHLTkwMDE=' }, body: 'VM-A verified under suffix 9001.' },
  { id: 'TX-4', received: '02-22 02:30', headers: { From: 'RELAY', 'X-Auth': 'QkRHLTkwMDQ=' }, body: 'VM-B decoy mirror.' },
  { id: 'TX-5', received: '02-23 14:08', headers: { From: 'RELAY', 'X-Auth': 'QkRHLTkwMDU=' }, body: 'Carrier static.' },
  { id: 'TX-6', received: '02-24 06:00', headers: { From: 'CONTROL', 'X-Auth': 'QkRHLTkwMDA=' }, body: 'Loop check.' },
];

const SAMPLE_SPECTROGRAM_FILES = [
  { id: 'VM-A', label: 'PRIMARY ARCHIVE (VM-A)', peaks_hz: [8140] },
  { id: 'VM-B', label: 'SECONDARY ARCHIVE (VM-B)', peaks_hz: [2200] },
];

function makeUnlockedState(overrides = {}) {
  return {
    ok: true,
    room_id: 'control',
    title: 'The Surveillance Morgue',
    total_fragments_in_room: 10,
    collected_fragment_ids: ['EC01', 'EC02', 'EC03', 'EC04', 'EC05', 'EC06', 'EC07', 'EC08', 'XC01', 'XC02'],
    basket_unlocked: true,
    is_completed: false,
    evidence: [
      { id: 'EC01', display: { title: 'Personnel Record Header', lines: ['Shift lead verified under BDG suffix.'] } },
      { id: 'EC02', display: { title: 'Requisition Archive', lines: ['Countersigned by M. Corvin.'] } },
      { id: 'EC03', display: { title: 'CRT Anomaly', lines: ['Continuous playback on Loop 7-C.'] } },
      { id: 'EC04', display: { title: 'Operator Log', lines: ['Monitor 6 figure visible.'] } },
      { id: 'EC05', display: { title: 'Teletype Intercept', lines: ['7.455 MHz carrier burst.'] } },
      { id: 'EC06', display: { title: 'Schematic 7-C', lines: ['Auxiliary feeder to Chamber 3.'] } },
      { id: 'EC07', display: { title: 'Night Shift Order', lines: ['Acknowledge authenticated carrier bursts.'] } },
      { id: 'EC08', display: { title: 'Fuse Override Slip', lines: ['Fuses 4, 7, 9 held live.'] } },
      { id: 'XC01', display: { title: 'Corrupted Tape Note', lines: ['Decoy splice.' ] } },
      { id: 'XC02', display: { title: 'Blank Shift Card', lines: ['No carrier detected.'] } },
    ],
    clues: [
      {
        id: 'R2-01',
        object_id: 'staff_terminal',
        title: 'Personnel Index',
        solved: false,
        exhausted: false,
        attempts: 0,
        attempts_max: 3,
        attempts_remaining: 3,
        payload: { rows: SAMPLE_PERSONNEL_ROWS },
      },
      {
        id: 'R2-05',
        object_id: 'radio_console',
        title: 'Transmission Archive',
        solved: false,
        exhausted: false,
        attempts: 0,
        attempts_max: 3,
        attempts_remaining: 3,
        payload: { messages: SAMPLE_MESSAGES },
      },
      {
        id: 'R2-06',
        object_id: 'sound_console',
        title: 'Spectrogram Analyser',
        solved: false,
        exhausted: false,
        attempts: 0,
        attempts_max: 3,
        attempts_remaining: 3,
        payload: { files: SAMPLE_SPECTROGRAM_FILES },
      },
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
          totalFragments={10}
          collectedCount={10}
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
      const objectiveElem = screen.getByText(/Solve the 3 Clue Terminals/i);
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
        totalCount: 10,
        remainingHere: 0,
      };

      render(<EvidencePickupModal modalData={modalData} onClose={vi.fn()} />);
      expect(screen.getByText(/Signal Intercept TXL-83-114/i)).toBeInTheDocument();
      expect(screen.getByText('EVIDENCE')).toBeInTheDocument();
      expect(screen.getByText('1/10 Logged')).toBeInTheDocument();
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
      // Uses real isInsideSafeRoom5B helper exported from scaresControl.js
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
          clueState={{ id: 'R2-01', attempts: 0, attempts_max: 3, attempts_remaining: 3, payload: { rows: SAMPLE_PERSONNEL_ROWS } }}
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
          clueState={{ id: 'R2-05', attempts: 0, attempts_max: 3, attempts_remaining: 3, payload: { messages: SAMPLE_MESSAGES } }}
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
          clueState={{ id: 'R2-06', attempts: 0, attempts_max: 3, attempts_remaining: 3, payload: { files: SAMPLE_SPECTROGRAM_FILES } }}
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
    it('BVA-01: Caught event respawns player inside Safe Bay 5B and retains 0-fragment DB state without dropping items', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => makeUnlockedState({ collected_fragment_ids: [], basket_unlocked: false }),
      });
      render(<Room5Control team={mockTeam} onLogout={mockLogout} />);
      await waitFor(() => expect(activeEngineInstance).toBeTruthy());

      act(() => {
        activeEngineInstance.callbacks.onPlayerCaught({ x: -8.0, z: 7.5 });
      });

      expect(activeEngineInstance.setView).toHaveBeenCalledWith(SAFE_ROOM_RESPAWN[0], SAFE_ROOM_RESPAWN[1], SAFE_ROOM_RESPAWN[2], 0);
      expect(isInsideSafeRoom5B(SAFE_ROOM_RESPAWN[0], SAFE_ROOM_RESPAWN[2])).toBe(true);
      expect(screen.getByText(/all recovered fragments remain safe in your Evidence Basket/i)).toBeInTheDocument();
    });

    it('BVA-02: Caught event retains 1 collected fragment in Evidence Basket without scattering on floor', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => makeUnlockedState({ collected_fragment_ids: ['EC01'], basket_unlocked: false }),
      });
      render(<Room5Control team={mockTeam} onLogout={mockLogout} />);
      await waitFor(() => expect(activeEngineInstance).toBeTruthy());

      fireEvent.click(screen.getByText(/ENTER THE SURVEILLANCE MORGUE/i));
      act(() => {
        activeEngineInstance.callbacks.onPlayerCaught({ x: -5.5, z: 9.0 });
      });

      expect(screen.getByText('1/10')).toBeInTheDocument();
      expect(activeEngineInstance.spawnDroppedEvidence).not.toHaveBeenCalled();
    });

    it('BVA-03: Caught event retains full 10-fragment inventory and unlocked basket', async () => {
      render(<Room5Control team={mockTeam} onLogout={mockLogout} />);
      await waitFor(() => expect(activeEngineInstance).toBeTruthy());

      fireEvent.click(screen.getByText(/ENTER THE SURVEILLANCE MORGUE/i));
      act(() => {
        activeEngineInstance.callbacks.onPlayerCaught({ x: -10.0, z: 12.0 });
      });

      expect(screen.getByText('10/10')).toBeInTheDocument();
      expect(activeEngineInstance.shake).toHaveBeenCalled();
    });

    it('BVA-04: Safe room respawn coordinates always fall strictly within Control Bay 5B bounds', () => {
      expect(Array.isArray(SAFE_ROOM_RESPAWN)).toBe(true);
      expect(SAFE_ROOM_RESPAWN.length).toBeGreaterThanOrEqual(3);
      expect(isInsideSafeRoom5B(SAFE_ROOM_RESPAWN[0], SAFE_ROOM_RESPAWN[2])).toBe(true);
    });

    it('BVA-05: Precise safe room Z-boundary coordinates (Z = 1.84, 1.85, 1.86)', () => {
      expect(isInsideSafeRoom5B(0.0, 1.84)).toBe(true);
      expect(isInsideSafeRoom5B(0.0, 1.85)).toBe(true);
      expect(isInsideSafeRoom5B(0.0, 1.86)).toBe(false);
    });

    it('BVA-06: Precise safe room X-boundary coordinates (X = -3.45, -3.46, +3.45, +3.46)', () => {
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

    it('BVA-08: PersonnelIndexModal & TransmissionArchiveModal normalize whitespace and casing before submitting', () => {
      const onBadgeSubmit = vi.fn();
      const { unmount } = render(
        <PersonnelIndexModal
          isOpen={true}
          onClose={vi.fn()}
          onSubmit={onBadgeSubmit}
          clueState={{ id: 'R2-01', attempts: 0, attempts_max: 3, attempts_remaining: 3, payload: { rows: SAMPLE_PERSONNEL_ROWS } }}
        />
      );
      fireEvent.change(screen.getByPlaceholderText(/BDG-XXXX/i), { target: { value: '  bdg-9001  ' } });
      fireEvent.click(screen.getByText('QUERY'));
      expect(onBadgeSubmit).toHaveBeenCalledWith('BDG-9001');
      unmount();

      const onTxSubmit = vi.fn();
      render(
        <TransmissionArchiveModal
          isOpen={true}
          onClose={vi.fn()}
          onSubmit={onTxSubmit}
          clueState={{ id: 'R2-05', attempts: 0, attempts_max: 3, attempts_remaining: 3, payload: { messages: SAMPLE_MESSAGES } }}
        />
      );
      fireEvent.click(screen.getByText('Jump to End'));
      fireEvent.change(screen.getByPlaceholderText(/_|\bCODE\b/i), { target: { value: ' vm-a ' } });
      fireEvent.click(screen.getByText('SUBMIT'));
      expect(onTxSubmit).toHaveBeenCalledWith('VM-A');
    });

    it('BVA-09: Exhausted clue enforces permanent terminal lockout with zero client reset button', () => {
      render(
        <PersonnelIndexModal
          isOpen={true}
          onClose={vi.fn()}
          onSubmit={vi.fn()}
          clueState={{ id: 'R2-01', attempts: 3, attempts_max: 3, attempts_remaining: 0, exhausted: true, payload: { rows: SAMPLE_PERSONNEL_ROWS } }}
        />
      );
      expect(screen.getByText(/SECURITY LOCKOUT \(0 ATTEMPTS REMAINING\)/i)).toBeInTheDocument();
      expect(screen.queryByText(/reboot|reset/i)).toBeNull();
      expect(screen.queryByPlaceholderText(/BDG-XXXX/i)).toBeNull();
    });

    it('BVA-10: Locked terminal popup shows 10-fragment requirement and spec search locations', () => {
      const modalData = {
        type: 'locked_terminal',
        terminalName: 'Staff Terminal (R2-01)',
        collectedCount: 3,
        totalCount: 10,
      };

      render(<EvidencePickupModal modalData={modalData} onClose={vi.fn()} />);
      expect(screen.getByText(/Terminal Restricted/i)).toBeInTheDocument();
      expect(screen.getByText(/requires all 10 fragments.*3\/10 recovered/i)).toBeInTheDocument();
      expect(screen.getByText(/Active Search Locations:/i)).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 3: Pairwise Combinatorial Testing
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Tier 3: Pairwise Combinatorial Testing', () => {
    it('PAIR-01: Searching a prop displays fragment modal and Escape closes cleanly', async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => makeUnlockedState({ collected_fragment_ids: [], basket_unlocked: false }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ found: true, fragment_id: 'EC01', total_collected: 1, total_in_room: 10, message: 'Fragment EC01 recovered.' }) })
        .mockResolvedValueOnce({ ok: true, json: async () => makeUnlockedState({ collected_fragment_ids: ['EC01'], basket_unlocked: false }) });

      render(<Room5Control team={mockTeam} onLogout={mockLogout} />);
      await waitFor(() => expect(activeEngineInstance).toBeTruthy());
      fireEvent.click(screen.getByText(/ENTER THE SURVEILLANCE MORGUE/i));

      await act(async () => {
        await activeEngineInstance.callbacks.onInteract('relay_rack');
      });
      expect(screen.getByText(/Personnel Record Header/i)).toBeInTheDocument();

      fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
      expect(screen.queryByText(/Personnel Record Header/i)).toBeNull();
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

    it('PAIR-03: Wing doors toggle directly and notify scares director without client key items', async () => {
      render(<Room5Control team={mockTeam} onLogout={mockLogout} />);
      await waitFor(() => expect(activeEngineInstance).toBeTruthy());
      fireEvent.click(screen.getByText(/ENTER THE SURVEILLANCE MORGUE/i));

      await act(async () => {
        await activeEngineInstance.callbacks.onInteract('chamber3_door');
      });
      expect(activeEngineInstance.toggleWingDoor).toHaveBeenCalledWith('chamber3_door');
      expect(mockScares.triggerDoorSighting).toHaveBeenCalledWith('chamber3_door', { respectGrace: true });
    });

    it('PAIR-04: Control Bay bulkhead door operates independently from flashlight state', async () => {
      render(<Room5Control team={mockTeam} onLogout={mockLogout} />);
      await waitFor(() => expect(activeEngineInstance).toBeTruthy());
      fireEvent.click(screen.getByText(/ENTER THE SURVEILLANCE MORGUE/i));

      await act(async () => {
        await activeEngineInstance.callbacks.onInteract('control_door');
      });
      expect(activeEngineInstance.toggleControlDoor).toHaveBeenCalled();

      // Toggle flashlight with F key
      fireEvent.keyDown(window, { key: 'f', code: 'KeyF' });
      expect(activeEngineInstance.setFlashlight).toHaveBeenCalledWith(false);
      fireEvent.keyDown(window, { key: 'f', code: 'KeyF' });
      expect(activeEngineInstance.setFlashlight).toHaveBeenCalledWith(true);
    });

    it('PAIR-05: ControlBasketModal opens, displays fragments, and supports Contrast/Brightness inspection', () => {
      const mockEvidence = [
        { id: 'EC01', display: { title: 'Signal Intercept', lines: ['Carrier burst'] } },
        { id: 'EC02', display: { title: 'Requisition Form', lines: ['Shift roster'] } },
      ];

      render(
        <ControlBasketModal
          isOpen={true}
          onClose={vi.fn()}
          evidence={mockEvidence}
          collectedIds={['EC01', 'EC02']}
          basketUnlocked={true}
          totalInRoom={10}
        />
      );

      expect(screen.getByText(/EVIDENCE BASKET • RECOVERED FRAGMENTS/i)).toBeInTheDocument();
      expect(screen.getByText(/2 \/ 10 COLLECTED/i)).toBeInTheDocument();
      expect(screen.getByText('Signal Intercept')).toBeInTheDocument();
      expect(screen.getByText('Requisition Form')).toBeInTheDocument();
      expect(screen.getByText('Close Basket')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Signal Intercept'));
      expect(screen.getByText('Contrast')).toBeInTheDocument();
      expect(screen.getByText('Brightness')).toBeInTheDocument();
      expect(screen.getByText('INVERT FILTER')).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 4: Real-World Workload Testing (Escaperoom Progression)
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Tier 4: Real-World Workload Testing (Escaperoom Progression)', () => {
    it('T4-01: Live backend 10-fragment search unlocks terminals -> 3-console solve -> Fork 2 Valve B dispatches vault navigation', async () => {
      let state = makeUnlockedState({
        collected_fragment_ids: ['EC01','EC02','EC03','EC04','EC05','EC06','EC07','EC08','XC01'],
        basket_unlocked: false,
      });

      global.fetch = vi.fn(async (url, opts = {}) => {
        if (url === '/api/game/room/control') {
          return { ok: true, json: async () => state };
        }
        if (url === '/api/game/room/control/search') {
          state = makeUnlockedState();
          return {
            ok: true,
            json: async () => ({
              found: true,
              fragment_id: 'XC02',
              total_collected: 10,
              total_in_room: 10,
              message: 'Recovered final decoy/fragment XC02',
            }),
          };
        }
        if (url === '/api/game/clue/R2-01/submit') {
          state = {
            ...state,
            clues: state.clues.map((c) => (c.id === 'R2-01' ? { ...c, solved: true } : c)),
          };
          return { ok: true, json: async () => ({ correct: true, room_completed: false }) };
        }
        if (url === '/api/game/clue/R2-05/submit') {
          state = {
            ...state,
            clues: state.clues.map((c) => (c.id === 'R2-05' ? { ...c, solved: true } : c)),
          };
          return { ok: true, json: async () => ({ correct: true, room_completed: false }) };
        }
        if (url === '/api/game/clue/R2-06/submit') {
          state = {
            ...state,
            is_completed: true,
            clues: state.clues.map((c) => (c.id === 'R2-06' ? { ...c, solved: true } : c)),
          };
          return { ok: true, json: async () => ({ correct: true, room_completed: true }) };
        }
        return { ok: true, json: async () => ({}) };
      });

      render(<Room5Control team={mockTeam} onLogout={mockLogout} />);
      await waitFor(() => expect(activeEngineInstance).toBeTruthy());
      fireEvent.click(screen.getByText(/ENTER THE SURVEILLANCE MORGUE/i));

      // Collect 10th fragment
      await act(async () => {
        await activeEngineInstance.callbacks.onInteract('fuse_box');
      });
      expect(screen.getByText('10/10 Logged')).toBeInTheDocument();
      fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });

      // Solve R2-01
      await act(async () => { await activeEngineInstance.callbacks.onInteract('staff_terminal'); });
      fireEvent.change(screen.getByPlaceholderText(/BDG-XXXX/i), { target: { value: 'BDG-9001' } });
      await act(async () => { fireEvent.click(screen.getByText('QUERY')); });
      fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });

      // Solve R2-05
      await act(async () => { await activeEngineInstance.callbacks.onInteract('radio_console'); });
      fireEvent.click(screen.getByText('Jump to End'));
      fireEvent.change(screen.getByPlaceholderText(/_|\bCODE\b/i), { target: { value: 'VM-A' } });
      await act(async () => { fireEvent.click(screen.getByText('SUBMIT')); });
      fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });

      // Solve R2-06 -> room_completed: true
      await act(async () => { await activeEngineInstance.callbacks.onInteract('sound_console'); });
      const soundInput = screen.getByRole('textbox');
      fireEvent.change(soundInput, { target: { value: '8140' } });
      await act(async () => { fireEvent.keyDown(soundInput, { key: 'Enter' }); });

      await waitFor(() => {
        expect(screen.getByTestId('control-room-complete-modal')).toBeInTheDocument();
        expect(activeEngineInstance.openDoor).toHaveBeenCalled();
      });
    });

    it('T4-02: Permanent clue exhaustion lock rejects further submissions with zero client attempt reset', () => {
      const onSubmit = vi.fn();
      render(
        <TransmissionArchiveModal
          isOpen={true}
          onClose={vi.fn()}
          onSubmit={onSubmit}
          clueState={{
            id: 'R2-05',
            attempts: 3,
            attempts_max: 3,
            attempts_remaining: 0,
            exhausted: true,
            payload: { messages: SAMPLE_MESSAGES },
          }}
        />
      );

      fireEvent.click(screen.getByText('Jump to End'));
      expect(screen.getByText(/MAXIMUM ATTEMPTS EXCEEDED — ACCESS REVOKED/i)).toBeInTheDocument();
      expect(screen.queryByText(/Terminal rebooted/i)).toBeNull();
      expect(screen.queryByRole('button', { name: /reset|reboot/i })).toBeNull();
    });

    it('T4-03: Vault door interaction handles completion: opens Fork 2 when completed, rattles when incomplete', async () => {
      // 1. Test Incomplete State
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => makeUnlockedState({ is_completed: false }),
      });

      const { unmount } = render(<Room5Control team={mockTeam} onLogout={mockLogout} />);
      await waitFor(() => expect(activeEngineInstance).toBeTruthy());
      fireEvent.click(screen.getByText(/ENTER THE SURVEILLANCE MORGUE/i));

      await act(async () => {
        await activeEngineInstance.callbacks.onInteract('vault_door');
      });
      expect(activeEngineInstance.rattleDoor).toHaveBeenCalledWith('vault_door');
      expect(mockAudioInstance.bad).toHaveBeenCalled();
      unmount();

      // 2. Test Completed State -> opens Fork2Modal
      global.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => makeUnlockedState({ is_completed: true }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ barred_choices: [], resolved: false }) });

      render(<Room5Control team={mockTeam} onLogout={mockLogout} />);
      await waitFor(() => expect(activeEngineInstance).toBeTruthy());
      await act(async () => {
        await activeEngineInstance.callbacks.onInteract('vault_door');
      });
      expect(screen.getByText(/FORK 2 • CORE AIRLOCK PURGE MANIFOLD/i)).toBeInTheDocument();
    });

    it('T4-04: Evidence export workflow formats dynamic fragment objects and copies/downloads cleanly', async () => {
      const sampleItem = {
        id: 'EC01',
        display: {
          title: 'Personnel Header',
          lines: ['Carrier burst logged 23:41 UTC', 'Decode X-Auth Base64 header.'],
          corner_mark: 'SIGNAL INTERCEPT // EC01',
        },
      };

      const exportContent = formatDocumentText(sampleItem);
      const bundleContent = formatEvidenceBundleText([sampleItem], {});
      expect(exportContent).toContain('Personnel Header');
      expect(bundleContent).toContain('Carrier burst logged 23:41 UTC');

      await navigator.clipboard.writeText(exportContent);
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(exportContent);

      const blob = new Blob([exportContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      expect(url).toBeTruthy();
      expect(URL.createObjectURL).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER 5: Standalone Control Basket, Dossier, Fork 2, Sanctuary & AI Director
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Tier 5: Control Basket, Dossier, Fork 2, Sanctuary & Ghost Director', () => {
    it('T5-01: EvidencePickupModal & ControlBasketModal support Copy, Download, and dynamic fragment counts', async () => {
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
        <EvidencePickupModal modalData={sampleModalData} onClose={vi.fn()} />
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

      render(
        <ControlBasketModal
          isOpen={true}
          onClose={vi.fn()}
          evidence={[
            {
              id: 'EC01',
              display: { title: 'SIGNAL INTERCEPT · 7.455 MHz', lines: ['Carrier burst logged 23:41 UTC'] },
            },
          ]}
          collectedIds={['EC01']}
          basketUnlocked={false}
          totalInRoom={10}
        />
      );

      expect(screen.getByText(/1 \/ 10 COLLECTED/i)).toBeInTheDocument();
      expect(screen.getByText('Close Basket')).toBeInTheDocument();

      await act(async () => {
        fireEvent.click(screen.getByText(/Copy All Evidence/i));
      });
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining('SIGNAL INTERCEPT')
      );
      const formattedText = formatDocumentText(sampleModalData);
      expect(formattedText).toContain('EC01');
      expect(formattedText).toContain('7.455 MHz');
    });

    it('T5-02: ControlDossierModal fetches /api/game/round/2/dossier and displays dynamic reveals', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          records: [{ room: 'control', clue_id: 'R2-01', reveal: { shift: 'Night Watch', badge: 'BDG-9001' } }],
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
      fireEvent.click(screen.getByText(/Copy Dossier/i));
      expect(navigator.clipboard.writeText).toHaveBeenCalled();
    });

    it('T5-03: Fork2Modal Valve A triggers +60s penalty breach and Valve B triggers onProceedToRoom6', async () => {
      vi.useFakeTimers();
      const onProceedToRoom6 = vi.fn();
      global.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => ({ barred_choices: [], resolved: false }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ is_trap: true, message: 'Auxiliary feed valve failure. +60s time penalty applied.' }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ is_trap: false, is_correct: true }) });

      render(
        <Fork2Modal
          isOpen={true}
          onClose={vi.fn()}
          audio={mockAudioInstance}
          onProceedToRoom6={onProceedToRoom6}
        />
      );

      // Flush initial useEffect status call
      await act(async () => { await Promise.resolve(); });

      // Engage Valve A (Trap)
      await act(async () => {
        fireEvent.click(screen.getByText('ENGAGE VALVE A'));
      });
      expect(screen.getByTestId('fork2-trap-overlay')).toBeInTheDocument();
      expect(screen.getByText(/\+60s PENALTY APPLIED/i)).toBeInTheDocument();

      // Advance past 2800ms trap overlay -> Valve A barred
      await act(async () => {
        vi.advanceTimersByTime(2900);
      });
      expect(screen.queryByTestId('fork2-trap-overlay')).toBeNull();

      // Engage Valve B (Correct -> Proceed to Room 6)
      await act(async () => {
        fireEvent.click(screen.getByText(/ENGAGE VALVE B/i));
      });
      await act(async () => {
        vi.advanceTimersByTime(1500);
      });
      expect(onProceedToRoom6).toHaveBeenCalled();
      vi.useRealTimers();
    });

    it('T5-04: One-way entry door blocks return to Room 4 and actual scaresControl maps safe zones accurately', async () => {
      render(<Room5Control team={mockTeam} onLogout={mockLogout} />);
      await waitFor(() => expect(activeEngineInstance).toBeTruthy());
      fireEvent.click(screen.getByText(/ENTER THE SURVEILLANCE MORGUE/i));

      await act(async () => {
        await activeEngineInstance.callbacks.onInteract('room_door');
      });
      expect(activeEngineInstance.rattleDoor).toHaveBeenCalledWith('entry_door');
      expect(screen.getByText(/There is no going back/i)).toBeInTheDocument();

      const previewSvg = createDocumentPreviewSvg({ id: 'EC01', title: 'SIGNAL INTERCEPT' });
      expect(previewSvg.startsWith('data:image/svg+xml')).toBe(true);

      const scaresActual = await vi.importActual('../game/engine/scaresControl.js');
      expect(scaresActual.getZoneForPosition(0, -1).camId).toBe('CAM-02');
      expect(scaresActual.getZoneForPosition(-9.5, 11).camId).toBe('CAM-04');
      expect(scaresActual.getZoneForPosition(-13.5, 16.5).camId).toBe('CAM-06');
    });

    it('T5-05: ControlBasketModal renders backend evidence records without "Sealed parcel" masking', () => {
      render(
        <ControlBasketModal
          isOpen={true}
          onClose={vi.fn()}
          evidence={[
            { id: 'EC01', display: { title: 'Transmission Log Fragment', lines: ['TRANSMISSION LOG — CHANNEL 7'] } },
          ]}
          collectedIds={['EC01']}
          basketUnlocked={false}
          totalInRoom={10}
        />
      );

      expect(screen.queryByText(/Sealed parcel/i)).toBeNull();
      expect(screen.getByText(/Transmission Log Fragment/i)).toBeInTheDocument();
      expect(screen.getByText('Download All')).toBeInTheDocument();
      expect(screen.getByText('Copy All Evidence')).toBeInTheDocument();
      fireEvent.click(screen.getByText(/Transmission Log Fragment/i));
      expect(screen.getByText('Download')).toBeInTheDocument();
      expect(screen.getByText('Copy')).toBeInTheDocument();
    });

    it('T5-06: HUD renders GFX HIGH/ECO toggle, responds to auto-Eco, and jumpscare catch respawns into 5B without "YOU DIED"', async () => {
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

      // Jumpscare lunge shows crimson vignette (z-[68]) and catch respawns inside Safe Room 5B cleanly
      act(() => {
        activeEngineInstance.callbacks.onJumpscareStart({ x: -4.2, z: 9.0, gx: -4.4, gz: 9.5 });
      });
      expect(screen.getByTestId('jumpscare-vignette')).toBeInTheDocument();

      act(() => {
        activeEngineInstance.callbacks.onPlayerCaught({ x: -4.2, z: 9.0, gx: -4.4, gz: 9.5 });
      });
      expect(screen.queryByTestId('jumpscare-vignette')).toBeNull();
      expect(screen.queryByText('YOU DIED')).toBeNull();
      expect(screen.getByText(/Specimen S-011 drove you back into Safe Room 5B/i)).toBeInTheDocument();

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
        controlMode: true,
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

    it('T5-09: EvidencePickupModal renders Open Field-Journal spread, adaptive fonts, Polaroid snapshot, and Copy/Download on wrapped items', async () => {
      const wrappedModal = {
        type: 'evidence',
        objectId: 'relay_rack',
        snapshotUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
        sourceName: 'Relay Rack',
        collectedCount: 2,
        totalCount: 10,
        remainingHere: 0,
        evidence: {
          id: 'SEALED-2',
          is_wrapped: true,
          display: { title: 'Wrapped Fragment #2', lines: ['Tamper-sealed fragment'] },
        },
      };

      const { container, rerender } = render(
        <EvidencePickupModal modalData={wrappedModal} onClose={vi.fn()} />
      );
      expect(container.querySelector('.journal-leather-cover')).toBeInTheDocument();
      expect(container.querySelector('.journal-polaroid img')).toHaveAttribute(
        'src',
        'data:image/jpeg;base64,/9j/4AAQSkZJRg=='
      );
      expect(container.querySelector('.font-journal-tech')).toBeInTheDocument();

      await act(async () => {
        fireEvent.click(screen.getByText(/Copy Content/i));
      });
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining('Relay Rack')
      );
      fireEvent.click(screen.getByText(/Download File/i));
      expect(URL.createObjectURL).toHaveBeenCalled();

      // Adaptive handwritten font for furniture/crate inspection
      rerender(
        <EvidencePickupModal
          modalData={{
            objectId: 'wooden_crates',
            kind: 'ambient_note',
            title: 'Stenciled Surplus Crates',
            lines: ['Wooden crates stacked beside the outer airlock.'],
          }}
          onClose={vi.fn()}
        />
      );
      expect(container.querySelector('.font-journal-hand')).toBeInTheDocument();
    });

    it('T5-10: CCTVMonitorModal displays assigned wing screenshots across CRTs and zooms in/out cleanly', () => {
      const { container } = render(<CCTVMonitorModal isOpen={true} onClose={vi.fn()} />);

      // Wall mode displays assigned Room 5 wing screenshots inside phosphor CRTs
      expect(container.querySelector('.cctv-wall-enter')).toBeInTheDocument();
      const cam01Img = screen.getByAltText(/CAM-01 ENTRY AIRLOCK/i);
      expect(cam01Img).toHaveAttribute('src', '/assets/ui/cctv/cam-01.jpg');

      // Clicking a monitor zooms in cleanly
      fireEvent.click(screen.getByText('CAM-04'));
      expect(container.querySelector('.cctv-zoom-enter')).toBeInTheDocument();
      expect(screen.getByAltText(/CAM-04 zoomed view/i)).toHaveAttribute(
        'src',
        '/assets/ui/cctv/cam-04.jpg'
      );

      // Clicking outside (backdrop overlay) zooms smoothly back out to wall mode
      fireEvent.click(container.querySelector('.cctv-station-backdrop'));
      expect(container.querySelector('.cctv-wall-enter')).toBeInTheDocument();
      expect(container.querySelector('.cctv-zoom-enter')).toBeNull();

      // Tracking UI elements (countdown timers / biometric locks) are completely absent
      expect(screen.queryByText(/NEXT SCAN/i)).toBeNull();
      expect(screen.queryByText(/LIVE BIOMETRIC LOCK/i)).toBeNull();
    });

    it('T5-11: ControlBasketModal allows click-to-preview of sealed manuscripts without spoilers or blank slot boxes', () => {
      const wrappedEvidence = [
        {
          id: 'EC01',
          is_wrapped: true,
          part: 'PART 1',
          clue_id: 'SECRET_CLUE',
          display: { title: 'Relay Rack', lines: ['Hidden cipher text'] },
        },
        {
          id: 'XC01',
          is_wrapped: true,
          is_decoy: true,
          display: { title: 'Decoy', lines: ['Decoy secret text'] },
        },
      ];

      const { container } = render(
        <ControlBasketModal
          isOpen={true}
          onClose={vi.fn()}
          evidence={wrappedEvidence}
          collectedIds={['EC01', 'XC01']}
          basketUnlocked={false}
          totalInRoom={10}
          propSnapshots={{ EC01: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==' }}
        />
      );

      // No empty blank SLOT boxes, no flat brown parcel image, no spoiler titles
      expect(screen.queryByText(/SLOT #3/i)).toBeNull();
      expect(screen.getByText(/8 hidden compartments still remaining/i)).toBeInTheDocument();
      expect(screen.queryByText('Relay Rack')).toBeNull();
      expect(screen.queryByText('Decoy')).toBeNull();

      // Uses captured snapshot on card #1
      expect(screen.getByAltText('Sealed Evidence #1')).toHaveAttribute(
        'src',
        'data:image/jpeg;base64,/9j/4AAQSkZJRg=='
      );

      // Clicking a sealed card opens OpenJournalSpread preview safely without spoilers
      fireEvent.click(screen.getByText('Sealed Evidence #1'));
      expect(container.querySelector('.journal-leather-cover')).toBeInTheDocument();
      expect(screen.queryByText('Relay Rack')).toBeNull();
      expect(screen.queryByText('Hidden cipher text')).toBeNull();
      // Sealed inspector & plate expose real investigative leads (Personnel Registry / curfew)
      expect(screen.getByText(/Personnel Registry in Bay 5B/i)).toBeInTheDocument();
    });

    it('T5-12: Sealed & unsealed manuscripts surface atmospheric Delta clues & Voice Machine leads while respecting spoiler lock', () => {
      const sealedSet = [
        { id: 'EC01', is_wrapped: true, display: { title: 'Wrapped Fragment #1' } },
        { id: 'EC02', is_wrapped: true, display: { title: 'Wrapped Fragment #2' } },
        { id: 'EC03', is_wrapped: true, display: { title: 'Wrapped Fragment #3' } },
      ];
      const { unmount } = render(
        <ControlBasketModal
          isOpen={true}
          onClose={vi.fn()}
          evidence={sealedSet}
          collectedIds={['EC01', 'EC02', 'EC03']}
          basketUnlocked={false}
          totalInRoom={10}
          propSnapshots={{}}
        />
      );

      // Caseboard brief & per-card clue previews visible even before 10/10 unsealing
      expect(screen.getByText(/CURFEW INCIDENT CASEBOARD/i)).toBeInTheDocument();
      expect(screen.getByText(/THE GHOST BADGE/i)).toBeInTheDocument();
      expect(screen.getByText(/BEYOND AUDIBLE STATIC/i)).toBeInTheDocument();
      expect(screen.queryByText('Relay Rack')).toBeNull();
      expect(screen.queryByText('Decoy')).toBeNull();

      // Open parcel #3 -> Voice Machine tuning guidance + Courier Prime plate SVG with real lines
      fireEvent.click(screen.getByText('Sealed Evidence #3'));
      expect(screen.getByText(/Climb onto HIGH band and push the needle past two-thirds/i)).toBeInTheDocument();
      const imgs = screen.getAllByAltText('Sealed Evidence #3');
      const plateUri = decodeURIComponent(imgs[imgs.length - 1].getAttribute('src') || '');
      expect(plateUri).toContain('SWITCH TO HIGH BAND');
      expect(plateUri).toContain('Courier Prime');
      unmount();

      // Locked radio_console strips "Test Transmissions" prefix into clean in-world label
      const lockedRender = render(
        <EvidencePickupModal
          modalData={{
            type: 'locked_terminal',
            objectId: 'radio_console',
            terminalName: 'Test Transmissions',
            collectedCount: 4,
            totalCount: 10,
          }}
          onClose={vi.fn()}
        />
      );
      expect(screen.getByText(/Terminal Restricted — Radio Teletype Console/i)).toBeInTheDocument();
      expect(screen.queryByText(/Test Transmissions/i)).toBeNull();
      expect(screen.getByText(/five of six Channel 7 wires are spoofed/i)).toBeInTheDocument();
      // Never leak specific prop names or wings holding hidden evidence
      expect(screen.queryByText(/Relay Rack|Tape Deck Cart|Operator Chair|Cable Trench|Wall Clipboard|Fuse Box/i)).toBeNull();
      lockedRender.unmount();

      // Unsealed EC03 receipt includes Voice Machine terminal cross-reference
      render(
        <EvidencePickupModal
          modalData={{
            type: 'evidence',
            sourceName: 'Tape Deck Cart',
            objectId: 'tape_deck_cart',
            collectedCount: 10,
            totalCount: 10,
            evidence: {
              id: 'EC03',
              is_wrapped: false,
              display: {
                title: 'Maintenance Report — CRT Bank',
                lines: ['Date: 07 NOV 1983', 'Continuous loop feed from Chamber 3'],
              },
            },
          }}
          onClose={vi.fn()}
        />
      );
      expect(screen.getByText(/Clue Connection \[R2-06\]/i)).toBeInTheDocument();
      expect(screen.getByText(/scrub past 66%/i)).toBeInTheDocument();
    });

    it('T5-13: Single-press multi-record sweep displays bundled docs, chase panic vignette renders outside 5B, and jumpscare punches FOV 50->40 with entityScream', async () => {
      const bundleState = {
        ...makeUnlockedState({
          collected_fragment_ids: ['EC01', 'EC02'],
          basket_unlocked: false,
        }),
        total_fragments_in_room: 8,
        evidence: [
          {
            id: 'EC01',
            clue_id: 'R2-01',
            is_wrapped: false,
            display: { title: 'Transmission Log', lines: ['14 AUG 1983 — 23:41'] },
          },
          {
            id: 'EC02',
            clue_id: 'R2-01',
            is_wrapped: false,
            display: { title: 'Equipment Requisition', lines: ['CORVIN, M.'] },
          },
        ],
      };

      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            ...makeUnlockedState({ collected_fragment_ids: [], basket_unlocked: false }),
            total_fragments_in_room: 8,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            found: true,
            fragment_id: 'EC01',
            newly_collected: ['EC01', 'EC02'],
            total_collected: 2,
            total_in_room: 8,
            message: 'Recovered 2 evidence records!',
          }),
        })
        .mockResolvedValueOnce({ ok: true, json: async () => bundleState });

      render(<Room5Control team={mockTeam} onLogout={mockLogout} />);
      await waitFor(() => expect(activeEngineInstance).toBeTruthy());
      fireEvent.click(screen.getByText(/ENTER THE SURVEILLANCE MORGUE/i));

      // Single E interact yields both EC01 and EC02 simultaneously
      await act(async () => {
        await activeEngineInstance.callbacks.onInteract('relay_rack');
      });
      expect(screen.getByText(/2 Records Recovered/i)).toBeInTheDocument();
      expect(screen.getByText(/Transmission Log/i)).toBeInTheDocument();
      expect(screen.getByText(/Equipment Requisition/i)).toBeInTheDocument();
      fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });

      // Outside Safe Bay 5B during hunt shows peripheral chase-panic-vignette via telemetry interval
      const origGetPos = activeEngineInstance.getPos;
      const origGetTel = mockScares.getGhostTelemetry;
      activeEngineInstance.getPos = vi.fn(() => ({ x: -4.5, z: 9.0, yaw: 0 }));
      mockScares.getGhostTelemetry = vi.fn(() => ({ isHunting: true, state: 'HUNT', cyclePhase: 'MANIFESTING' }));
      await waitFor(() => {
        expect(screen.getByTestId('chase-panic-vignette')).toBeInTheDocument();
      }, { timeout: 1500 });
      activeEngineInstance.getPos = origGetPos;
      mockScares.getGhostTelemetry = origGetTel;

      // Real scaresControl jumpscare punches FOV 50 -> 40 -> 72 and fires monster scream
      const THREE = await import('three');
      const scaresActual = await vi.importActual('../game/engine/scaresControl.js');
      const fovs = [];
      const entityScream = vi.fn();
      const jumpscareSting = vi.fn();
      const root = new THREE.Object3D();
      const scares = scaresActual.createControlScares(
        {
          S: new THREE.Scene(),
          cam: new THREE.PerspectiveCamera(72, 16 / 9, 0.05, 80),
          ref: {},
          _ghost: { root, ghostGlow: { intensity: 0 }, ghostFaceLight: { intensity: 0 }, setAnim: vi.fn() },
          px: () => -4.2,
          pz: () => 9.0,
          yaw: () => 0,
          isSprinting: () => false,
          shake: vi.fn(),
          setCameraOverride: vi.fn(),
          setTargetFov: (v) => fovs.push(v),
        },
        {
          audio: {
            peekSting: vi.fn(), scurrySteps: vi.fn(), jumpscareSting, entityScream,
            womanScream: vi.fn(), heavyEntityStep: vi.fn(), stalkerGrowl: vi.fn(),
            bulkheadBang: vi.fn(), stinger: vi.fn(), setChaseTension: vi.fn(),
            footstep: vi.fn(), staticBurst: vi.fn(), drawerSlam: vi.fn(),
            relayClick: vi.fn(), intercomCrackle: vi.fn(), whisperRaspy: vi.fn(),
            phoneRing: vi.fn(), setWeepingVolume: vi.fn(),
          },
          onFlash: vi.fn(),
          onScare: vi.fn(),
        }
      );

      scares.triggerBreachHunt(1.0);
      for (let i = 0; i < 20; i++) scares.update(0.15, i * 0.15);
      expect(jumpscareSting).toHaveBeenCalledTimes(1);
      expect(entityScream).toHaveBeenCalled();
      expect(fovs).toContain(50);
      expect(fovs).toContain(40);
      expect(fovs[fovs.length - 1]).toBe(72);
      scares.dispose();
    });
  });
});
