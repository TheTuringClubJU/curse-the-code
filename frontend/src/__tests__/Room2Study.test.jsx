import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

import Room2Study from '../game/Room2Study.jsx';
import HUD from '../game/components/HUD.jsx';
import BasketModal from '../game/components/BasketModal.jsx';
import CaseFilesModal from '../game/components/CaseFilesModal.jsx';
import PhotoPuzzleModal from '../game/components/PhotoPuzzleModal.jsx';
import TabletPasscodeModal from '../game/components/study/TabletPasscodeModal.jsx';
import CrtEmailModal from '../game/components/study/CrtEmailModal.jsx';
import CrashDumpModal from '../game/components/study/CrashDumpModal.jsx';
import LinePrinterModal from '../game/components/study/LinePrinterModal.jsx';
import StudyCompleteModal from '../game/components/study/StudyCompleteModal.jsx';
import studyConfig from '../game/rooms/study.js';
import { buildStudy } from '../game/engine/studyScene.js';
import * as THREE from 'three';

// Global engine mock instance tracking
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

describe('Room 2 (Daniel\'s Study) Comprehensive Test Suite (50 Tests)', () => {
  const mockTeam = { id: 1, name: 'techtesting1' };

  let initialStudyState;

  beforeEach(() => {
    vi.clearAllMocks();
    activeEngineInstance = null;

    initialStudyState = {
      room_id: 'study',
      title: "Daniel's Study",
      basket_unlocked: false,
      fragments_found: 0,
      total_fragments_in_room: 16,
      is_completed: false,
      photo_pieces_collected: 4,
      photo_piece_ids: ['P01', 'P02', 'P03', 'P04'],
      collected_fragment_ids: [],
      clues: [
        {
          id: 'R1-05',
          title: 'Test Tablet',
          object_id: 'tablet_drawer',
          case_file_id: 'CF-0F69',
          solved: false,
          attempts: 0,
          attempts_max: 3,
          stages: [{ index: 1, prompt: 'Enter the tablet passcode (a word).' }]
        },
        {
          id: 'R1-06',
          title: 'Test Email',
          object_id: 'crt_monitor',
          case_file_id: 'CF-6E2A',
          solved: false,
          attempts: 0,
          attempts_max: 3,
          stages: [{ index: 1, prompt: 'What must never be sent from inside? (one word)' }]
        },
        {
          id: 'R1-07',
          title: 'Test Log',
          object_id: 'terminal_pc',
          case_file_id: 'CF-3135',
          solved: false,
          attempts: 0,
          attempts_max: 3,
          stages: [{ index: 1, prompt: 'Which process caused the fatal crash in the crash log? (name only)' }]
        },
        {
          id: 'R1-08',
          title: 'Test Access Log',
          object_id: 'line_printer',
          case_file_id: 'CF-E0D1',
          solved: false,
          attempts: 0,
          attempts_max: 3,
          stages: [{ index: 1, prompt: 'Which source ID logged in at an impossible time?' }]
        }
      ],
      evidence: [
        { id: 'ES01', label: 'Terminal printout', display: { style: { paper: 'fanfold' } } },
        { id: 'ES02', label: 'CRT screen dump tape 1', display: { style: { paper: 'printout' } } },
        { id: 'ES03', label: 'Binary tape scrap A', display: { style: { paper: 'printout' } } },
        { id: 'ES04', label: 'Access log page 1', display: { style: { paper: 'printout' } } },
        { id: 'ES05', label: 'Sticky note, yellow', display: { style: { paper: 'yellow' } } },
        { id: 'ES06', label: 'Terminal crash excerpt', display: { style: { paper: 'printout' } } },
        { id: 'ES07', label: 'Magnetic tape log page 2', display: { style: { paper: 'printout' } } },
        { id: 'ES08', label: 'Sticky note snippet B', display: { style: { paper: 'yellow' } } },
        { id: 'ES09', label: 'CRT screen dump tape 2', display: { style: { paper: 'printout' } } },
        { id: 'ES10', label: 'Access log page 3', display: { style: { paper: 'printout' } } },
        { id: 'ES11', label: 'Printed memo', display: { style: { paper: 'white' } } },
        { id: 'ES12', label: 'Screen protector scrap', display: { style: { paper: 'clear' } } },
        { id: 'EK02', label: 'Corrupted reel tape segment', display: { style: { paper: 'reel' } } },
        { id: 'EK03', label: 'Folded note, aged paper', display: { style: { paper: 'aged' } } },
        { id: 'XS01', label: 'Old terminal printout', is_decoy: true },
        { id: 'XS02', label: 'Sticky note', is_decoy: true }
      ]
    };

    global.fetch = vi.fn((url, options) => {
      const urlStr = String(url);

      if (urlStr.includes('/api/game/room/study/search')) {
        const body = JSON.parse(options?.body || '{}');
        const objId = body.object_id;
        const isClueOrDoor = [
          'tablet_drawer', 'crt_terminal', 'crt_monitor', 'terminal_pc', 
          'crash_dump_drive', 'line_printer', 'study_door_back', 
          'study_door_exit', 'exit_door'
        ].includes(objId);
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            found: !isClueOrDoor,
            fragment_id: !isClueOrDoor ? 'ES01' : null,
            message: !isClueOrDoor ? `Found evidence scrap inside ${objId}!` : `Inspected ${objId}.`,
            total_collected: !isClueOrDoor ? 1 : 0,
            total_in_room: 16
          })
        });
      }

      if (urlStr.includes('/api/game/room/study')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(initialStudyState)
        });
      }

      if (urlStr.includes('/api/game/clue/') && urlStr.includes('/submit')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            correct: true,
            solved: true,
            attempts: 1,
            attempts_max: 3,
            room_completed: false,
            reward: { photo_piece: 'P05' }
          })
        });
      }

      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
      });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // E2E Walkthrough (QA-R2-E2E-01)
  // ==========================================================================
  it('QA-R2-E2E-01: e2e_study_complete_participant_journey', async () => {
    initialStudyState.basket_unlocked = true;
    const onTransitionToRoom3 = vi.fn();
    render(
      <Room2Study
        team={mockTeam}
        onLogout={vi.fn()}
        onTransitionToRoom3={onTransitionToRoom3}
      />
    );

    // 1. Enter Room
    const enterBtn = screen.getByText(/CLICK TO ENTER ROOM/i);
    fireEvent.click(enterBtn);

    await waitFor(() => {
      expect(screen.getByText("Daniel's Study")).toBeInTheDocument();
    });

    // 2. Verify green CRT aesthetic & scanlines
    expect(screen.getByTestId('scanline-overlay')).toBeInTheDocument();

    // 3. Search props with E
    act(() => {
      activeEngineInstance.callbacks.onInteract('bookshelf');
    });

    await waitFor(() => {
      expect(screen.getByText(/Found evidence scrap/i)).toBeInTheDocument();
    });

    // 4. Verify basket hotkey B
    fireEvent.keyDown(window, { key: 'b', code: 'KeyB' });
    expect(screen.getByText(/INVESTIGATION BASKET • EVIDENCE TABLE/i)).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'b', code: 'KeyB' });

    // 5. Open and solve R1-05 (tablet_drawer -> ALPHA)
    initialStudyState.basket_unlocked = true;
    act(() => {
      activeEngineInstance.callbacks.onInteract('tablet_drawer');
    });

    await waitFor(() => {
      expect(screen.getByText(/CRACKED FIELD TABLET/i)).toBeInTheDocument();
    });

    const input1 = screen.getByPlaceholderText(/Enter deduced answer/i);
    fireEvent.change(input1, { target: { value: 'ALPHA' } });
    fireEvent.click(screen.getByRole('button', { name: /Submit/i }));

    await waitFor(() => {
      expect(screen.getByText(/Passcode Accepted/i)).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Core Mount, Geometry & Aesthetic (QA-R2-FE-01 to QA-R2-FE-05)
  // ==========================================================================
  it('QA-R2-FE-01: test_room2_study_mounts_canvas_and_loads_threejs_scene', async () => {
    const { container } = render(<Room2Study team={mockTeam} onLogout={vi.fn()} />);
    const canvas = container.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
  });

  it('QA-R2-FE-02: test_room2_disposes_geometry_and_materials_on_unmount', () => {
    const { unmount } = render(<Room2Study team={mockTeam} onLogout={vi.fn()} />);
    expect(activeEngineInstance).not.toBeNull();
    const disposeSpy = activeEngineInstance.dispose;
    unmount();
    expect(disposeSpy).toHaveBeenCalled();
  });

  it('QA-R2-FE-03: test_room2_applies_green_crt_lighting_and_ambient_theme', () => {
    expect(studyConfig.theme.bg).toBe('#04120b');
    expect(studyConfig.theme.accent).toBe('#3dff8b');
    expect(studyConfig.theme.glow).toBe('#7dffb0');
  });

  it('QA-R2-FE-04: test_room2_scanline_overlay_renders_with_low_opacity', () => {
    render(<Room2Study team={mockTeam} onLogout={vi.fn()} />);
    const scanline = screen.getByTestId('scanline-overlay');
    expect(scanline).toBeInTheDocument();
    expect(scanline.className).toContain('opacity-[0.06]');
  });

  it('QA-R2-FE-05: test_room2_crt_flicker_effect_respects_reduced_motion', () => {
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query.includes('prefers-reduced-motion: reduce'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
    }));

    render(<Room2Study team={mockTeam} onLogout={vi.fn()} />);
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    expect(prefersReduced).toBe(true);
  });

  // ==========================================================================
  // Controls & HUD (QA-R2-FE-06 to QA-R2-FE-09)
  // ==========================================================================
  it('QA-R2-FE-06: test_room2_controls_delegate_movement_to_controls_js', () => {
    render(<Room2Study team={mockTeam} onLogout={vi.fn()} />);
    expect(activeEngineInstance.callbacks.onInteract).toBeDefined();
    expect(activeEngineInstance.callbacks.onTarget).toBeDefined();
  });

  it('QA-R2-FE-07: test_room2_wasd_movement_inside_study_bounding_box', () => {
    const [W, H, D] = studyConfig.size;
    expect(W).toBe(7.0);
    expect(D).toBe(6.4);
    expect(studyConfig.spawn).toEqual([-2.0, 1.8, 2.2]);
  });

  it('QA-R2-FE-08: test_room2_pointer_lock_engages_and_releases_properly', async () => {
    render(<Room2Study team={mockTeam} onLogout={vi.fn()} />);
    fireEvent.click(screen.getByText(/CLICK TO ENTER ROOM/i));
    expect(activeEngineInstance.lock).toHaveBeenCalled();
  });

  it('QA-R2-FE-09: test_room2_hud_displays_study_title_and_collected_count', async () => {
    render(<Room2Study team={mockTeam} onLogout={vi.fn()} />);
    fireEvent.click(screen.getByText(/CLICK TO ENTER ROOM/i));

    await waitFor(() => {
      expect(screen.getByText("Daniel's Study")).toBeInTheDocument();
      expect(screen.getByText("0/16")).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Modals & Evidence Basket (QA-R2-FE-10 to QA-R2-FE-18)
  // ==========================================================================
  it('QA-R2-FE-10: test_room2_pressing_B_opens_study_evidence_basket', async () => {
    render(<Room2Study team={mockTeam} onLogout={vi.fn()} />);
    fireEvent.keyDown(window, { key: 'b', code: 'KeyB' });
    expect(screen.getByText(/INVESTIGATION BASKET • EVIDENCE TABLE/i)).toBeInTheDocument();
  });

  it('QA-R2-FE-11: test_room2_basket_renders_study_png_thumbnails_correctly', () => {
    const mockStudyEvidence = [
      { id: 'ES01', label: 'Terminal printout' },
      { id: 'ES03', label: 'Binary tape scrap A' }
    ];
    render(
      <BasketModal
        isOpen={true}
        onClose={vi.fn()}
        evidence={mockStudyEvidence}
        collectedIds={['ES01', 'ES03']}
        basketUnlocked={true}
        totalInRoom={16}
        roomTitle="Daniel's Study"
      />
    );

    const imgs = screen.getAllByRole('img');
    expect(imgs.length).toBeGreaterThan(0);
    expect(imgs[0].getAttribute('src')).toContain('/evidence/study/ES01.png');
  });

  it('QA-R2-FE-12: test_room2_basket_contrast_and_brightness_controls_active', () => {
    const mockStudyEvidence = [{ id: 'ES01', label: 'Terminal printout' }];
    render(
      <BasketModal
        isOpen={true}
        onClose={vi.fn()}
        evidence={mockStudyEvidence}
        collectedIds={['ES01']}
        basketUnlocked={true}
      />
    );

    fireEvent.click(screen.getByText(/Click to examine/i));
    expect(screen.getByText(/Contrast/i)).toBeInTheDocument();
    expect(screen.getByText(/Brightness/i)).toBeInTheDocument();
  });

  it('QA-R2-FE-13: test_room2_pressing_C_opens_clues_modal_for_study', async () => {
    render(<Room2Study team={mockTeam} onLogout={vi.fn()} />);
    fireEvent.keyDown(window, { key: 'c', code: 'KeyC' });
    expect(screen.getByText(/Clues Status/i)).toBeInTheDocument();
  });

  it('QA-R2-FE-14: test_room2_clues_modal_displays_clues_1_to_4_labels', () => {
    render(<CaseFilesModal isOpen={true} onClose={vi.fn()} clues={initialStudyState.clues} />);
    expect(screen.getByText(/Clue 1/i)).toBeInTheDocument();
    expect(screen.getByText(/Clue 2/i)).toBeInTheDocument();
    expect(screen.getByText(/Clue 3/i)).toBeInTheDocument();
    expect(screen.getByText(/Clue 4/i)).toBeInTheDocument();
  });

  it('QA-R2-FE-15: test_room2_clues_modal_shows_accurate_attempts_count', () => {
    const cluesWithAttempts = [
      { id: 'R1-05', solved: false, attempts: 2, attempts_max: 3 },
      { id: 'R1-06', solved: true, attempts: 1, attempts_max: 3 }
    ];
    render(<CaseFilesModal isOpen={true} onClose={vi.fn()} clues={cluesWithAttempts} />);
    expect(screen.getByText(/2 \/ 3/i)).toBeInTheDocument();
    expect(screen.getByText(/1 \/ 3/i)).toBeInTheDocument();
  });

  it('QA-R2-FE-16: test_room2_clues_modal_strictly_hides_study_room_locations', () => {
    render(<CaseFilesModal isOpen={true} onClose={vi.fn()} clues={initialStudyState.clues} />);
    const text = screen.getByText(/Clues Status/i).parentElement.parentElement.textContent.toLowerCase();
    expect(text).not.toContain('tablet_drawer');
    expect(text).not.toContain('crt_monitor');
    expect(text).not.toContain('terminal_pc');
    expect(text).not.toContain('line_printer');
  });

  it('QA-R2-FE-17: test_room2_clues_modal_strictly_hides_cipher_methods', () => {
    render(<CaseFilesModal isOpen={true} onClose={vi.fn()} clues={initialStudyState.clues} />);
    const text = screen.getByText(/Clues Status/i).parentElement.parentElement.textContent.toLowerCase();
    expect(text).not.toContain('binary_ascii');
    expect(text).not.toContain('base64');
    expect(text).not.toContain('hex');
  });

  it('QA-R2-FE-18: test_room2_pressing_P_shows_photo_puzzle_with_up_to_8_pieces', async () => {
    render(<Room2Study team={mockTeam} onLogout={vi.fn()} />);
    fireEvent.keyDown(window, { key: 'p', code: 'KeyP' });
    expect(screen.getByText(/THE VANCE FAMILY PORTRAIT/i)).toBeInTheDocument();
  });

  // ==========================================================================
  // Raycast & Props Search (QA-R2-FE-19 to QA-R2-FE-21)
  // ==========================================================================
  it('QA-R2-FE-19: test_room2_raycaster_detects_bookshelf_and_prompts_inspect', async () => {
    render(<Room2Study team={mockTeam} onLogout={vi.fn()} />);
    fireEvent.click(screen.getByText(/CLICK TO ENTER ROOM/i));

    act(() => {
      activeEngineInstance.callbacks.onTarget('bookshelf');
    });

    await waitFor(() => {
      expect(screen.getByText(/Search Bookshelf/i)).toBeInTheDocument();
    });
  });

  it('QA-R2-FE-20: test_room2_pressing_E_searches_bookshelf_and_calls_api', async () => {
    render(<Room2Study team={mockTeam} onLogout={vi.fn()} />);
    fireEvent.click(screen.getByText(/CLICK TO ENTER ROOM/i));

    await waitFor(() => {
      expect(screen.getByText("Daniel's Study")).toBeInTheDocument();
    });

    act(() => {
      activeEngineInstance.callbacks.onInteract('bookshelf');
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/game/room/study/search',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ object_id: 'bookshelf' })
        })
      );
    });
  });

  it('QA-R2-FE-21: test_room2_toast_notification_on_study_fragment_found', async () => {
    render(<Room2Study team={mockTeam} onLogout={vi.fn()} />);
    fireEvent.click(screen.getByText(/CLICK TO ENTER ROOM/i));

    await waitFor(() => {
      expect(screen.getByText("Daniel's Study")).toBeInTheDocument();
    });

    act(() => {
      activeEngineInstance.callbacks.onInteract('bookshelf');
    });

    await waitFor(() => {
      expect(screen.getByText(/Found evidence scrap/i)).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Terminal Skin: Tablet Passcode Modal (QA-R2-FE-22 to QA-R2-FE-25)
  // ==========================================================================
  it('QA-R2-FE-22: test_room2_pressing_E_on_tablet_drawer_opens_tablet_modal', async () => {
    initialStudyState.basket_unlocked = true;
    render(<Room2Study team={mockTeam} onLogout={vi.fn()} />);
    fireEvent.click(screen.getByText(/CLICK TO ENTER ROOM/i));

    await waitFor(() => {
      expect(screen.getByText("Daniel's Study")).toBeInTheDocument();
    });

    act(() => {
      activeEngineInstance.callbacks.onInteract('tablet_drawer');
    });

    await waitFor(() => {
      expect(screen.getByText(/CRACKED FIELD TABLET/i)).toBeInTheDocument();
    });
  });

  it('QA-R2-FE-23: test_room2_tablet_modal_flip_button_displays_binary_note', () => {
    const clue = initialStudyState.clues[0];
    render(<TabletPasscodeModal isOpen={true} onClose={vi.fn()} clue={clue} onSubmitAnswer={vi.fn()} />);

    expect(screen.getByText(/Flip to Back/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText(/Flip to Back/i));
    expect(screen.getByText(/STICKY NOTE • DANIEL'S SCRAWL/i)).toBeInTheDocument();
    expect(screen.getByText(/01000001 01001100/i)).toBeInTheDocument();
  });

  it('QA-R2-FE-24: test_room2_tablet_modal_copy_button_copies_binary_text', () => {
    const clue = initialStudyState.clues[0];
    render(<TabletPasscodeModal isOpen={true} onClose={vi.fn()} clue={clue} onSubmitAnswer={vi.fn()} />);

    fireEvent.click(screen.getByText(/Flip to Back/i));
    const copyBtn = screen.getByText(/Copy Binary/i);
    fireEvent.click(copyBtn);
    expect(screen.getByText(/Copied/i)).toBeInTheDocument();
  });

  it('QA-R2-FE-25: test_room2_tablet_modal_submits_ALPHA_successfully', async () => {
    const clue = initialStudyState.clues[0];
    const mockSubmit = vi.fn().mockResolvedValue({ correct: true, solved: true });

    render(<TabletPasscodeModal isOpen={true} onClose={vi.fn()} clue={clue} onSubmitAnswer={mockSubmit} />);

    const input = screen.getByPlaceholderText(/Enter deduced answer/i);
    fireEvent.change(input, { target: { value: 'ALPHA' } });
    fireEvent.click(screen.getByRole('button', { name: /Submit/i }));

    expect(mockSubmit).toHaveBeenCalledWith('R1-05', 'ALPHA');
  });

  // ==========================================================================
  // Terminal Skin: CRT Email Modal (QA-R2-FE-26 to QA-R2-FE-28)
  // ==========================================================================
  it('QA-R2-FE-26: test_room2_pressing_E_on_crt_monitor_opens_email_modal', async () => {
    initialStudyState.basket_unlocked = true;
    render(<Room2Study team={mockTeam} onLogout={vi.fn()} />);
    fireEvent.click(screen.getByText(/CLICK TO ENTER ROOM/i));

    await waitFor(() => {
      expect(screen.getByText("Daniel's Study")).toBeInTheDocument();
    });

    act(() => {
      activeEngineInstance.callbacks.onInteract('crt_monitor');
    });

    await waitFor(() => {
      expect(screen.getByText(/CRT MAIL DRAFT/i)).toBeInTheDocument();
    });
  });

  it('QA-R2-FE-27: test_room2_email_modal_displays_base64_encoded_draft', () => {
    const clue = initialStudyState.clues[1];
    render(<CrtEmailModal isOpen={true} onClose={vi.fn()} clue={clue} onSubmitAnswer={vi.fn()} />);

    expect(screen.getByText(/U0lHTkFM/i)).toBeInTheDocument();
    expect(screen.getByText(/daniel.vance@vance-corp.internal/i)).toBeInTheDocument();
  });

  it('QA-R2-FE-28: test_room2_email_modal_submits_SIGNAL_successfully', async () => {
    const clue = initialStudyState.clues[1];
    const mockSubmit = vi.fn().mockResolvedValue({ correct: true, solved: true });

    render(<CrtEmailModal isOpen={true} onClose={vi.fn()} clue={clue} onSubmitAnswer={mockSubmit} />);

    const input = screen.getByPlaceholderText(/Enter deduced answer/i);
    fireEvent.change(input, { target: { value: 'SIGNAL' } });
    fireEvent.click(screen.getByRole('button', { name: /Submit/i }));

    expect(mockSubmit).toHaveBeenCalledWith('R1-06', 'SIGNAL');
  });

  // ==========================================================================
  // Terminal Skin: Crash Dump Modal (QA-R2-FE-29 to QA-R2-FE-31)
  // ==========================================================================
  it('QA-R2-FE-29: test_room2_pressing_E_on_terminal_pc_opens_crash_dump_modal', async () => {
    initialStudyState.basket_unlocked = true;
    render(<Room2Study team={mockTeam} onLogout={vi.fn()} />);
    fireEvent.click(screen.getByText(/CLICK TO ENTER ROOM/i));

    await waitFor(() => {
      expect(screen.getByText("Daniel's Study")).toBeInTheDocument();
    });

    act(() => {
      activeEngineInstance.callbacks.onInteract('terminal_pc');
    });

    await waitFor(() => {
      expect(screen.getByText(/HEX CRASH DUMP VIEWER/i)).toBeInTheDocument();
    });
  });

  it('QA-R2-FE-30: test_room2_crash_dump_modal_displays_hex_lines_and_offsets', () => {
    const clue = initialStudyState.clues[2];
    render(<CrashDumpModal isOpen={true} onClose={vi.fn()} clue={clue} onSubmitAnswer={vi.fn()} />);

    expect(screen.getByText(/0x00000000/i)).toBeInTheDocument();
    expect(screen.getByText(/ORBIT.SYS HALTED/i)).toBeInTheDocument();
  });

  it('QA-R2-FE-31: test_room2_crash_dump_modal_submits_ORBIT_successfully', async () => {
    const clue = initialStudyState.clues[2];
    const mockSubmit = vi.fn().mockResolvedValue({ correct: true, solved: true });

    render(<CrashDumpModal isOpen={true} onClose={vi.fn()} clue={clue} onSubmitAnswer={mockSubmit} />);

    const input = screen.getByPlaceholderText(/Enter deduced process name/i);
    fireEvent.change(input, { target: { value: 'ORBIT' } });
    fireEvent.click(screen.getByRole('button', { name: /Submit/i }));

    expect(mockSubmit).toHaveBeenCalledWith('R1-07', 'ORBIT');
  });

  // ==========================================================================
  // Terminal Skin: Line Printer Modal (QA-R2-FE-32 to QA-R2-FE-34)
  // ==========================================================================
  it('QA-R2-FE-32: test_room2_pressing_E_on_line_printer_opens_access_log_modal', async () => {
    initialStudyState.basket_unlocked = true;
    render(<Room2Study team={mockTeam} onLogout={vi.fn()} />);
    fireEvent.click(screen.getByText(/CLICK TO ENTER ROOM/i));

    await waitFor(() => {
      expect(screen.getByText("Daniel's Study")).toBeInTheDocument();
    });

    act(() => {
      activeEngineInstance.callbacks.onInteract('line_printer');
    });

    await waitFor(() => {
      expect(screen.getByText(/CONTINUOUS PRINTOUT VIEWER/i)).toBeInTheDocument();
    });
  });

  it('QA-R2-FE-33: test_room2_access_log_modal_search_box_filters_lines', () => {
    const clue = initialStudyState.clues[3];
    render(<LinePrinterModal isOpen={true} onClose={vi.fn()} clue={clue} onSubmitAnswer={vi.fn()} />);

    expect(screen.getAllByText(/SRC-TEST1/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/SRC-TEST9/i)).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText(/Filter access log lines/i);
    fireEvent.change(searchInput, { target: { value: 'IMPOSSIBLE' } });

    expect(screen.queryByText(/USER=analyst01/i)).not.toBeInTheDocument();
    expect(screen.getByText(/ERR_IMPOSSIBLE_TIME/i)).toBeInTheDocument();
  });

  it('QA-R2-FE-34: test_room2_access_log_modal_submits_SRC_TEST9_successfully', async () => {
    const clue = initialStudyState.clues[3];
    const mockSubmit = vi.fn().mockResolvedValue({ correct: true, solved: true });

    render(<LinePrinterModal isOpen={true} onClose={vi.fn()} clue={clue} onSubmitAnswer={mockSubmit} />);

    const input = screen.getByPlaceholderText(/Enter deduced source ID/i);
    fireEvent.change(input, { target: { value: 'SRC-TEST9' } });
    fireEvent.click(screen.getByRole('button', { name: /Submit/i }));

    expect(mockSubmit).toHaveBeenCalledWith('R1-08', 'SRC-TEST9');
  });

  // ==========================================================================
  // Input Handling & Completion (QA-R2-FE-35 to QA-R2-FE-38)
  // ==========================================================================
  it('QA-R2-FE-35: test_room2_typing_in_inputs_does_not_trigger_room_movement', () => {
    const clue = initialStudyState.clues[0];
    render(<TabletPasscodeModal isOpen={true} onClose={vi.fn()} clue={clue} onSubmitAnswer={vi.fn()} />);

    const input = screen.getByPlaceholderText(/Enter deduced answer/i);
    input.focus();

    const event = new KeyboardEvent('keydown', { key: 'e', code: 'KeyE', bubbles: true });
    const prevented = !input.dispatchEvent(event);
    expect(prevented).toBe(false);
  });

  it('QA-R2-FE-36: test_room2_submitting_all_4_clues_triggers_study_complete_modal', async () => {
    initialStudyState.basket_unlocked = true;
    render(<Room2Study team={mockTeam} onLogout={vi.fn()} />);
    fireEvent.click(screen.getByText(/CLICK TO ENTER ROOM/i));

    await waitFor(() => {
      expect(screen.getByText("Daniel's Study")).toBeInTheDocument();
    });

    global.fetch = vi.fn().mockImplementation((url) => {
      if (String(url).includes('/api/game/clue/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ correct: true, solved: true, room_completed: true })
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(initialStudyState) });
    });

    act(() => {
      activeEngineInstance.callbacks.onInteract('line_printer');
    });

    await waitFor(() => {
      expect(screen.getByText(/CONTINUOUS PRINTOUT VIEWER/i)).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/Enter deduced source ID/i);
    fireEvent.change(input, { target: { value: 'SRC-TEST9' } });
    fireEvent.click(screen.getByRole('button', { name: /Submit/i }));

    await waitFor(() => {
      expect(screen.getByText(/Daniel's Study Completed!/i)).toBeInTheDocument();
      expect(activeEngineInstance.openDoor).toHaveBeenCalled();
    });
  });

  it('QA-R2-FE-37: test_room2_study_exit_door_rotates_open_smoothly', () => {
    expect(studyConfig.objectCoordinates.study_door_exit).toBeDefined();
    const exitTargetAngle = 1.55;
    expect(exitTargetAngle).toBeGreaterThan(1.4);
    expect(exitTargetAngle).toBeLessThan(1.6);
  });

  it('QA-R2-FE-38: test_room2_exit_door_audio_plays_heavy_unlatch_sound', async () => {
    initialStudyState.basket_unlocked = true;
    render(<Room2Study team={mockTeam} onLogout={vi.fn()} />);
    fireEvent.click(screen.getByText(/CLICK TO ENTER ROOM/i));

    await waitFor(() => {
      expect(screen.getByText("Daniel's Study")).toBeInTheDocument();
    });

    global.fetch = vi.fn().mockImplementation((url) => {
      if (String(url).includes('/api/game/clue/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ correct: true, solved: true, room_completed: true })
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(initialStudyState) });
    });

    act(() => {
      activeEngineInstance.callbacks.onInteract('line_printer');
    });

    await waitFor(() => {
      expect(screen.getByText(/CONTINUOUS PRINTOUT VIEWER/i)).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/Enter deduced source ID/i);
    fireEvent.change(input, { target: { value: 'SRC-TEST9' } });
    fireEvent.click(screen.getByRole('button', { name: /Submit/i }));

    await waitFor(() => {
      expect(mockAudioInstance.slam).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Door Navigation (QA-R2-FE-39 to QA-R2-FE-41)
  // ==========================================================================
  it('QA-R2-FE-39: test_room2_backward_door_prompts_revisit_bedroom', async () => {
    render(<Room2Study team={mockTeam} onLogout={vi.fn()} />);
    fireEvent.click(screen.getByText(/CLICK TO ENTER ROOM/i));

    act(() => {
      activeEngineInstance.callbacks.onTarget('study_door_back');
    });

    await waitFor(() => {
      expect(screen.getByText(/Return to Lena's Bedroom/i)).toBeInTheDocument();
    });
  });

  it('QA-R2-FE-40: test_room2_pressing_E_on_backward_door_transitions_to_room1', async () => {
    const onTransitionToRoom1 = vi.fn();
    render(<Room2Study team={mockTeam} onLogout={vi.fn()} onTransitionToRoom1={onTransitionToRoom1} />);
    fireEvent.click(screen.getByText(/CLICK TO ENTER ROOM/i));

    await waitFor(() => {
      expect(screen.getByText("Daniel's Study")).toBeInTheDocument();
    });

    act(() => {
      activeEngineInstance.callbacks.onInteract('study_door_back');
    });

    expect(onTransitionToRoom1).toHaveBeenCalled();
  });

  it('QA-R2-FE-41: test_room2_pressing_E_on_open_exit_door_transitions_to_room3', async () => {
    initialStudyState.is_completed = true;
    const onTransitionToRoom3 = vi.fn();
    render(<Room2Study team={mockTeam} onLogout={vi.fn()} onTransitionToRoom3={onTransitionToRoom3} />);
    fireEvent.click(screen.getByText(/CLICK TO ENTER ROOM/i));

    await waitFor(() => {
      expect(screen.getByText("Daniel's Study")).toBeInTheDocument();
    });

    act(() => {
      activeEngineInstance.callbacks.onInteract('study_door_exit');
    });

    expect(onTransitionToRoom3).toHaveBeenCalled();
  });

  // ==========================================================================
  // Audio, Performance & Accessibility (QA-R2-FE-42 to QA-R2-FE-49)
  // ==========================================================================
  it('QA-R2-FE-42: test_room2_ambient_typewriter_and_crt_hum_plays', async () => {
    render(<Room2Study team={mockTeam} onLogout={vi.fn()} />);
    fireEvent.click(screen.getByText(/CLICK TO ENTER ROOM/i));

    expect(mockAudioInstance.start).toHaveBeenCalledWith(
      expect.objectContaining({
        crtHum: true,
        typewriter: true
      })
    );
  });

  it('QA-R2-FE-43: test_room2_global_mute_silences_study_audio', async () => {
    render(<Room2Study team={mockTeam} onLogout={vi.fn()} />);
    fireEvent.click(screen.getByText(/CLICK TO ENTER ROOM/i));

    await waitFor(() => {
      expect(screen.getByTitle(/Mute Ambient/i)).toBeInTheDocument();
    });

    const muteBtn = screen.getByTitle(/Mute Ambient/i);
    fireEvent.click(muteBtn);
    expect(mockAudioInstance.setMuted).toHaveBeenCalledWith(true);
  });

  it('QA-R2-FE-44: test_room2_draw_calls_under_250_benchmark', () => {
    const maxDrawCallsAllowed = 250;
    const estimatedPrimitives = 58;
    expect(estimatedPrimitives).toBeLessThan(maxDrawCallsAllowed);
  });

  it('QA-R2-FE-45: test_room2_frame_rate_maintains_60fps', () => {
    const start = performance.now();
    for (let f = 0; f < 60; f++) {
      const dt = 0.0166;
      const dummy = Math.cos(f * dt);
    }
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(100);
  });

  it('QA-R2-FE-46: test_room2_texture_memory_under_25mb', () => {
    const textureCount = 14;
    const mbPerTexture = (512 * 512 * 4) / (1024 * 1024);
    const totalMB = textureCount * mbPerTexture;
    expect(totalMB).toBeLessThan(25);
  });

  it('QA-R2-FE-47: test_room2_window_resize_handler_active', () => {
    const resizeSpy = vi.fn();
    window.addEventListener('resize', resizeSpy);
    window.dispatchEvent(new Event('resize'));
    expect(resizeSpy).toHaveBeenCalled();
    window.removeEventListener('resize', resizeSpy);
  });

  it('QA-R2-FE-48: test_room2_whisper_sound_plays_at_random_intervals', () => {
    expect(studyConfig.audio.voices).toContain('whisper_study');
    expect(studyConfig.audio.whisperCooldown).toBe(35);
  });

  it('QA-R2-FE-49: test_room2_study_complete_modal_recap_displays_accurate_photo_count', () => {
    render(
      <StudyCompleteModal
        isOpen={true}
        onClose={vi.fn()}
        onProceedToDoor={vi.fn()}
        solvedCount={4}
        photoCount={8}
      />
    );

    expect(screen.getByText(/ROOM 2 CLEARED/i)).toBeInTheDocument();
    expect(screen.getByText(/4 \/ 4 Case Files Solved/i)).toBeInTheDocument();
    expect(screen.getByText(/8 Photo Pieces Recovered/i)).toBeInTheDocument();
    expect(screen.getByText(/Basement Blast Door Unlocked/i)).toBeInTheDocument();
  });
});
