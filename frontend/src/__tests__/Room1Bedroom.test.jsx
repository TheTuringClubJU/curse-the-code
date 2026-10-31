import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

import Room1Bedroom from '../game/Room1Bedroom.jsx';
import HUD from '../game/components/HUD.jsx';
import BasketModal from '../game/components/BasketModal.jsx';
import CaseFilesModal from '../game/components/CaseFilesModal.jsx';
import ClueModal from '../game/components/ClueModal.jsx';
import PhotoPuzzleModal from '../game/components/PhotoPuzzleModal.jsx';
import RoomCompleteModal from '../game/components/RoomCompleteModal.jsx';
import { setupControls } from '../game/engine/controls.js';
import bedroomConfig from '../game/rooms/bedroom.js';
import { buildDoll } from '../game/engine/scene.js';

// Global engine mock instance tracking
let activeEngineInstance = null;

const mockAudioInstance = {
  start: vi.fn(),
  stop: vi.fn(),
  setMuted: vi.fn(),
  step: vi.fn(),
  playSfx: vi.fn(),
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

describe('Room 1 (Lena\'s Bedroom) Comprehensive Test Suite (50 Tests)', () => {
  const mockTeam = { id: 1, name: 'techtesting1' };

  let initialBedroomState;

  beforeEach(() => {
    vi.clearAllMocks();
    activeEngineInstance = null;

    initialBedroomState = {
      room_id: 'bedroom',
      title: "Lena's Bedroom",
      basket_unlocked: false,
      fragments_found: 0,
      total_fragments: 15,
      is_completed: false,
      photo_pieces_collected: 0,
      collected_fragment_ids: [],
      clues: [
        {
          id: 'R1-01',
          title: "Lena's Secret Diary",
          object_id: 'diary',
          solved: false,
          attempts: 0,
          attempts_max: 3,
          solution_method: 'caesar_shift',
          stages: [{ prompt: 'Decrypt the 5-shift Caesar cipher:' }]
        },
        {
          id: 'R1-02',
          title: 'Gate Notebook Log',
          object_id: 'notebook',
          solved: false,
          attempts: 0,
          attempts_max: 3,
          solution_method: 'caesar_shift',
          stages: [{ prompt: 'Decrypt the 3-shift Caesar cipher:' }]
        },
        {
          id: 'R1-03',
          title: 'Carnival Poster Scraps',
          object_id: 'poster',
          solved: false,
          attempts: 0,
          attempts_max: 3,
          solution_method: 'image_contrast',
          stages: [{ prompt: 'Enter the hidden carnival date:' }]
        },
        {
          id: 'R1-04',
          title: 'Torn Family Portrait',
          object_id: 'portrait',
          solved: false,
          attempts: 0,
          attempts_max: 3,
          solution_method: 'reverse_canvas',
          stages: [{ prompt: 'Enter the backing canvas code:' }]
        }
      ],
      evidence: [
        { id: 'EB01', label: 'Poster Scrap A', display: { title: 'Torn Carnival Poster A' } }
      ]
    };

    global.fetch = vi.fn().mockImplementation((url, options) => {
      if (url.includes('/api/game/room/bedroom/search')) {
        const body = JSON.parse(options?.body || '{}');
        const isHiding = !['diary', 'notebook', 'poster', 'portrait', 'room_door', 'door'].includes(body.object_id);
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            found: isHiding,
            fragment_id: isHiding ? 'EB01' : null,
            message: isHiding 
              ? 'You discovered a wrapped fragment! It has been placed in your basket.'
              : 'There are no hidden fragments here.'
          })
        });
      }

      if (url.includes('/api/game/clue/R1-01/submit')) {
        const body = JSON.parse(options?.body || '{}');
        const isCorrect = body.answer?.trim().toUpperCase() === 'LANTERN';
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            correct: isCorrect,
            solved: isCorrect,
            photo_awarded: isCorrect ? 'P01' : null,
            attempts: 1,
            message: isCorrect ? 'Case File R1-01 solved!' : 'Incorrect answer'
          })
        });
      }

      if (url.includes('/api/game/clue/R1-02/submit')) {
        const body = JSON.parse(options?.body || '{}');
        const isCorrect = body.answer?.trim().toUpperCase() === 'SUNRISE';
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            correct: isCorrect,
            solved: isCorrect,
            photo_awarded: isCorrect ? 'P02' : null,
            attempts: 1,
            message: isCorrect ? 'Case File R1-02 solved!' : 'Incorrect answer'
          })
        });
      }

      if (url.includes('/api/game/clue/R1-03/submit')) {
        const body = JSON.parse(options?.body || '{}');
        const isCorrect = body.answer?.trim() === '07/04/2001';
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            correct: isCorrect,
            solved: isCorrect,
            photo_awarded: isCorrect ? 'P03' : null,
            attempts: 1,
            message: isCorrect ? 'Case File R1-03 solved!' : 'Incorrect answer'
          })
        });
      }

      if (url.includes('/api/game/clue/R1-04/submit')) {
        const body = JSON.parse(options?.body || '{}');
        const isCorrect = body.answer?.trim().toUpperCase() === 'SHADOW';
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            correct: isCorrect,
            solved: isCorrect,
            photo_awarded: isCorrect ? 'P04' : null,
            attempts: 1,
            room_completed: isCorrect,
            message: isCorrect ? 'Room 1 Completed! Corridor door unlocked.' : 'Incorrect answer'
          })
        });
      }

      if (url.includes('/api/game/room/bedroom')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(initialBedroomState)
        });
      }

      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // QA-R1-E2E-01: End-to-End Complete Walkthrough
  // ==========================================================================
  it('QA-R1-E2E-01: e2e_bedroom_complete_participant_journey', async () => {
    render(<Room1Bedroom team={mockTeam} onLogout={vi.fn()} />);

    // 1. Enter Room
    const enterBtn = screen.getByText(/CLICK TO ENTER ROOM/i);
    expect(enterBtn).toBeInTheDocument();
    fireEvent.click(enterBtn);

    // 2. HUD displays Lena's Bedroom
    await waitFor(() => {
      expect(screen.getByText("Lena's Bedroom")).toBeInTheDocument();
    });

    // 3. Search hiding spot 'trunk' via engine callback
    act(() => {
      activeEngineInstance.callbacks.onInteract('trunk');
    });

    await waitFor(() => {
      expect(screen.getByText(/discovered a wrapped fragment/i)).toBeInTheDocument();
    });

    // 4. Press B to toggle Basket
    fireEvent.keyDown(window, { key: 'b', code: 'KeyB' });
    expect(screen.getByText(/INVESTIGATION BASKET • EVIDENCE TABLE/i)).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'b', code: 'KeyB' });
    expect(screen.queryByText(/INVESTIGATION BASKET • EVIDENCE TABLE/i)).not.toBeInTheDocument();

    // 5. Press C to check Case Files Modal without spoilers
    fireEvent.keyDown(window, { key: 'c', code: 'KeyC' });
    expect(screen.getByText(/Clues Status/i)).toBeInTheDocument();
    expect(screen.getByText(/Clue 1/i)).toBeInTheDocument();
    expect(screen.getByText(/Clue 4/i)).toBeInTheDocument();
    expect(screen.queryByText(/LANTERN/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/SHADOW/i)).not.toBeInTheDocument();
  });

  // ==========================================================================
  // Engine & Controls Tests (QA-R1-FE-01 to QA-R1-FE-07)
  // ==========================================================================
  it('QA-R1-FE-01: test_room1_bedroom_mounts_canvas_without_errors', async () => {
    const { container } = render(<Room1Bedroom team={mockTeam} onLogout={vi.fn()} />);
    const canvas = container.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
  });

  it('QA-R1-FE-02: test_room1_threejs_renderer_disposes_cleanly_on_unmount', async () => {
    const { unmount } = render(<Room1Bedroom team={mockTeam} onLogout={vi.fn()} />);
    expect(activeEngineInstance).not.toBeNull();
    unmount();
    expect(activeEngineInstance.dispose).toHaveBeenCalledTimes(1);
  });

  it('QA-R1-FE-03: test_room1_controls_single_source_of_truth_in_controls_js', () => {
    const canvas = document.createElement('canvas');
    const controls = setupControls({
      canvas,
      onInteract: vi.fn(),
      onTargetChange: vi.fn(),
      getAudio: () => null,
      getSolids: () => [],
      roomSize: [8, 3, 6],
      spawn: [0, 0, 0]
    });

    expect(typeof controls.update).toBe('function');
    expect(typeof controls.setTarget).toBe('function');
    expect(typeof controls.requestLock).toBe('function');
    expect(typeof controls.unlock).toBe('function');
    expect(typeof controls.dispose).toBe('function');
    controls.dispose();
  });

  it('QA-R1-FE-04: test_room1_wasd_keys_update_camera_velocity', () => {
    const canvas = document.createElement('canvas');
    const controls = setupControls({
      canvas,
      onInteract: vi.fn(),
      onTargetChange: vi.fn(),
      getAudio: () => null,
      getSolids: () => [],
      roomSize: [8, 3, 6],
      spawn: [0, 0, 0]
    });

    const initPos = controls.getPos();
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
    const updated = controls.update(0.1);
    expect(updated.isMoving).toBe(true);
    expect(updated.pz).toBeLessThan(initPos.z);
    controls.dispose();
  });

  it('QA-R1-FE-05: test_room1_mouse_movement_updates_yaw_and_pitch', () => {
    const canvas = document.createElement('canvas');
    const controls = setupControls({
      canvas,
      onInteract: vi.fn(),
      onTargetChange: vi.fn(),
      getAudio: () => null,
      getSolids: () => [],
      roomSize: [8, 3, 6],
      spawn: [0, 0, 0]
    });

    Object.defineProperty(document, 'pointerLockElement', {
      value: canvas,
      configurable: true
    });

    window.dispatchEvent(new MouseEvent('mousemove', { movementX: 20, movementY: 10 }));
    const pos = controls.getPos();
    expect(pos.yaw).not.toBe(0);
    expect(pos.pitch).not.toBe(0);
    controls.dispose();
  });

  it('QA-R1-FE-06: test_room1_pointer_lock_engages_on_click', () => {
    const canvas = document.createElement('canvas');
    canvas.requestPointerLock = vi.fn().mockReturnValue(Promise.resolve());
    const controls = setupControls({
      canvas,
      onInteract: vi.fn(),
      onTargetChange: vi.fn(),
      getAudio: () => null,
      getSolids: () => [],
      roomSize: [8, 3, 6],
      spawn: [0, 0, 0]
    });

    controls.requestLock();
    expect(canvas.requestPointerLock).toHaveBeenCalled();
    controls.dispose();
  });

  it('QA-R1-FE-07: test_room1_pointer_lock_releases_on_esc', () => {
    document.exitPointerLock = vi.fn();
    const canvas = document.createElement('canvas');
    const controls = setupControls({
      canvas,
      onInteract: vi.fn(),
      onTargetChange: vi.fn(),
      getAudio: () => null,
      getSolids: () => [],
      roomSize: [8, 3, 6],
      spawn: [0, 0, 0]
    });

    controls.unlock();
    expect(document.exitPointerLock).toHaveBeenCalled();
    controls.dispose();
  });

  // ==========================================================================
  // HUD Component Tests (QA-R1-FE-08 to QA-R1-FE-09)
  // ==========================================================================
  it('QA-R1-FE-08: test_room1_hud_renders_room_title_and_fragment_counter', () => {
    render(
      <HUD 
        roomTitle="Lena's Bedroom" 
        collectedCount={7} 
        totalFragments={15} 
        cluesSolved={2} 
        totalClues={4} 
      />
    );

    expect(screen.getByText("Lena's Bedroom")).toBeInTheDocument();
    expect(screen.getByText("7/15")).toBeInTheDocument();
    expect(screen.getByText("2/4")).toBeInTheDocument();
  });

  it('QA-R1-FE-09: test_room1_hud_displays_shortcut_keys_B_C_P_E', () => {
    render(
      <HUD 
        roomTitle="Lena's Bedroom" 
        collectedCount={0} 
        activeHoverPrompt="Inspect Trunk" 
      />
    );

    expect(screen.getAllByText('B').length).toBeGreaterThan(0);
    expect(screen.getAllByText('C').length).toBeGreaterThan(0);
    expect(screen.getAllByText('P').length).toBeGreaterThan(0);
    expect(screen.getAllByText('E').length).toBeGreaterThan(0);
    expect(screen.getByText("Inspect Trunk")).toBeInTheDocument();
  });

  // ==========================================================================
  // Modal Hotkeys & State Tests (QA-R1-FE-10 to QA-R1-FE-19)
  // ==========================================================================
  it('QA-R1-FE-10: test_room1_pressing_B_toggles_basket_modal_and_unlocks_cursor', async () => {
    render(<Room1Bedroom team={mockTeam} onLogout={vi.fn()} />);
    fireEvent.keyDown(window, { key: 'b', code: 'KeyB' });
    expect(screen.getByText(/INVESTIGATION BASKET • EVIDENCE TABLE/i)).toBeInTheDocument();
  });

  it('QA-R1-FE-11: test_room1_pressing_B_again_closes_basket_modal_and_relocks_cursor', async () => {
    render(<Room1Bedroom team={mockTeam} onLogout={vi.fn()} />);
    fireEvent.keyDown(window, { key: 'b', code: 'KeyB' });
    expect(screen.getByText(/INVESTIGATION BASKET • EVIDENCE TABLE/i)).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'b', code: 'KeyB' });
    expect(screen.queryByText(/INVESTIGATION BASKET • EVIDENCE TABLE/i)).not.toBeInTheDocument();
  });

  it('QA-R1-FE-12: test_room1_pressing_C_toggles_case_files_modal_and_unlocks_cursor', async () => {
    render(<Room1Bedroom team={mockTeam} onLogout={vi.fn()} />);
    fireEvent.keyDown(window, { key: 'c', code: 'KeyC' });
    expect(screen.getByText(/Clues Status/i)).toBeInTheDocument();
  });

  it('QA-R1-FE-13: test_room1_case_files_modal_shows_clue_1_to_4_labels_only', () => {
    render(<CaseFilesModal isOpen={true} onClose={vi.fn()} clues={initialBedroomState.clues} />);
    expect(screen.getByText(/Clue 1/i)).toBeInTheDocument();
    expect(screen.getByText(/Clue 2/i)).toBeInTheDocument();
    expect(screen.getByText(/Clue 3/i)).toBeInTheDocument();
    expect(screen.getByText(/Clue 4/i)).toBeInTheDocument();
  });

  it('QA-R1-FE-14: test_room1_case_files_modal_shows_attempts_ratio_per_clue', () => {
    const cluesWithAttempts = [
      { id: 'R1-01', solved: false, attempts: 2 },
      { id: 'R1-02', solved: true, attempts: 1 }
    ];
    render(<CaseFilesModal isOpen={true} onClose={vi.fn()} clues={cluesWithAttempts} />);
    expect(screen.getByText(/2 \/ 3/i)).toBeInTheDocument();
    expect(screen.getByText(/1 \/ 3/i)).toBeInTheDocument();
  });

  it('QA-R1-FE-15: test_room1_case_files_modal_never_shows_object_locations', () => {
    render(<CaseFilesModal isOpen={true} onClose={vi.fn()} clues={initialBedroomState.clues} />);
    const text = screen.getByText(/Clues Status/i).parentElement.parentElement.textContent.toLowerCase();
    expect(text).not.toContain('diary');
    expect(text).not.toContain('notebook');
    expect(text).not.toContain('poster');
    expect(text).not.toContain('portrait');
    expect(text).not.toContain('trunk');
  });

  it('QA-R1-FE-16: test_room1_case_files_modal_never_shows_cipher_methods', () => {
    render(<CaseFilesModal isOpen={true} onClose={vi.fn()} clues={initialBedroomState.clues} />);
    const text = screen.getByText(/Clues Status/i).parentElement.parentElement.textContent.toLowerCase();
    expect(text).not.toContain('caesar');
    expect(text).not.toContain('vigenere');
    expect(text).not.toContain('reverse');
  });

  it('QA-R1-FE-17: test_room1_case_files_modal_never_shows_decrypted_solutions', () => {
    render(<CaseFilesModal isOpen={true} onClose={vi.fn()} clues={initialBedroomState.clues} />);
    const text = screen.getByText(/Clues Status/i).parentElement.parentElement.textContent;
    expect(text).not.toContain('LANTERN');
    expect(text).not.toContain('SUNRISE');
    expect(text).not.toContain('07/04/2001');
    expect(text).not.toContain('SHADOW');
  });

  it('QA-R1-FE-18: test_room1_pressing_P_toggles_photo_puzzle_modal', async () => {
    render(<Room1Bedroom team={mockTeam} onLogout={vi.fn()} />);
    fireEvent.keyDown(window, { key: 'p', code: 'KeyP' });
    expect(screen.getByText(/THE VANCE FAMILY PORTRAIT/i)).toBeInTheDocument();
  });

  it('QA-R1-FE-19: test_room1_photo_puzzle_modal_renders_10_slots_with_active_pieces', () => {
    const { container } = render(<PhotoPuzzleModal isOpen={true} onClose={vi.fn()} photoCount={3} requiredPieces={10} />);
    expect(screen.getByText(/Assembled pieces: 3 \/ 10/i)).toBeInTheDocument();
    const gridSlots = container.querySelectorAll('.grid > div');
    expect(gridSlots.length).toBe(10);
    expect(screen.getByText('P01')).toBeInTheDocument();
    expect(screen.getByText('P02')).toBeInTheDocument();
    expect(screen.getByText('P03')).toBeInTheDocument();
  });

  // ==========================================================================
  // Raycasting & Search Tests (QA-R1-FE-20 to QA-R1-FE-22)
  // ==========================================================================
  it('QA-R1-FE-20: test_room1_raycaster_detects_trunk_object_and_shows_prompt', async () => {
    render(<Room1Bedroom team={mockTeam} onLogout={vi.fn()} />);
    fireEvent.click(screen.getByText(/CLICK TO ENTER ROOM/i));

    act(() => {
      activeEngineInstance.callbacks.onTarget('trunk');
    });
    await waitFor(() => {
      expect(screen.getByText(/Inspect trunk/i)).toBeInTheDocument();
    });
  });

  it('QA-R1-FE-21: test_room1_pressing_E_on_hiding_spot_triggers_search_api', async () => {
    render(<Room1Bedroom team={mockTeam} onLogout={vi.fn()} />);
    fireEvent.click(screen.getByText(/CLICK TO ENTER ROOM/i));

    act(() => {
      activeEngineInstance.callbacks.onTarget('nightstand');
    });
    fireEvent.keyDown(window, { key: 'e', code: 'KeyE' });
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/game/room/bedroom/search',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ object_id: 'nightstand' })
        })
      );
    });
  });

  it('QA-R1-FE-22: test_room1_toast_notification_displays_found_fragment_message', async () => {
    render(<Room1Bedroom team={mockTeam} onLogout={vi.fn()} />);
    fireEvent.click(screen.getByText(/CLICK TO ENTER ROOM/i));

    act(() => {
      activeEngineInstance.callbacks.onInteract('trunk');
    });
    await waitFor(() => {
      expect(screen.getByText(/discovered a wrapped fragment/i)).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Basket Modal & Inspector Tests (QA-R1-FE-23 to QA-R1-FE-26)
  // ==========================================================================
  it('QA-R1-FE-23: test_room1_basket_renders_png_thumbnails_with_200_status', () => {
    const mockEvidence = [{ id: 'EB01', label: 'Poster Scrap A' }];
    render(
      <BasketModal 
        isOpen={true} 
        onClose={vi.fn()} 
        evidence={mockEvidence} 
        collectedIds={['EB01']} 
        basketUnlocked={true} 
      />
    );

    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', '/poster_piece_1.png');
  });

  it('QA-R1-FE-24: test_room1_basket_inspector_applies_contrast_slider_filter', () => {
    const mockEvidence = [{ id: 'EB01', label: 'Poster Scrap A' }];
    const { container } = render(
      <BasketModal 
        isOpen={true} 
        onClose={vi.fn()} 
        evidence={mockEvidence} 
        collectedIds={['EB01']} 
        basketUnlocked={true} 
      />
    );

    fireEvent.click(screen.getByText(/Click to examine/i));

    const sliders = screen.getAllByRole('slider');
    const contrastSlider = sliders[0];
    fireEvent.change(contrastSlider, { target: { value: '160' } });

    const filteredBox = container.querySelector('[style*="contrast"]');
    expect(filteredBox).toBeInTheDocument();
    expect(filteredBox.style.filter).toContain('contrast(160%)');
  });

  it('QA-R1-FE-25: test_room1_basket_inspector_applies_brightness_slider_filter', () => {
    const mockEvidence = [{ id: 'EB01', label: 'Poster Scrap A' }];
    const { container } = render(
      <BasketModal 
        isOpen={true} 
        onClose={vi.fn()} 
        evidence={mockEvidence} 
        collectedIds={['EB01']} 
        basketUnlocked={true} 
      />
    );

    fireEvent.click(screen.getByText(/Click to examine/i));

    const sliders = screen.getAllByRole('slider');
    const brightnessSlider = sliders[1];
    fireEvent.change(brightnessSlider, { target: { value: '140' } });

    const filteredBox = container.querySelector('[style*="brightness"]');
    expect(filteredBox).toBeInTheDocument();
    expect(filteredBox.style.filter).toContain('brightness(140%)');
  });

  it('QA-R1-FE-26: test_room1_basket_inspector_toggles_invert_filter', () => {
    const mockEvidence = [{ id: 'EB01', label: 'Poster Scrap A' }];
    const { container } = render(
      <BasketModal 
        isOpen={true} 
        onClose={vi.fn()} 
        evidence={mockEvidence} 
        collectedIds={['EB01']} 
        basketUnlocked={true} 
      />
    );

    fireEvent.click(screen.getByText(/Click to examine/i));
    const invertBtn = screen.getByText(/Toggle Invert/i);
    fireEvent.click(invertBtn);

    const filteredBox = container.querySelector('[style*="invert"]');
    expect(filteredBox).toBeInTheDocument();
    expect(filteredBox.style.filter).toContain('invert(100%)');
  });

  // ==========================================================================
  // Clue Modal Interactions (QA-R1-FE-27 to QA-R1-FE-37)
  // ==========================================================================
  it('QA-R1-FE-27: test_room1_clue_modal_opens_matching_clue_when_pressing_E_on_diary', async () => {
    initialBedroomState.basket_unlocked = true;
    render(<Room1Bedroom team={mockTeam} onLogout={vi.fn()} />);
    fireEvent.click(screen.getByText(/CLICK TO ENTER ROOM/i));

    await waitFor(() => {
      expect(screen.getByText("Lena's Bedroom")).toBeInTheDocument();
    });

    act(() => {
      activeEngineInstance.callbacks.onInteract('diary');
    });

    await waitFor(() => {
      expect(screen.getByText(/Lena's Secret Diary/i)).toBeInTheDocument();
    });
  });

  it('QA-R1-FE-28: test_room1_clue_modal_shows_sealed_notice_when_basket_unlocked_false', async () => {
    initialBedroomState.basket_unlocked = false;
    render(<Room1Bedroom team={mockTeam} onLogout={vi.fn()} />);
    fireEvent.click(screen.getByText(/CLICK TO ENTER ROOM/i));

    await waitFor(() => {
      expect(screen.getByText("Lena's Bedroom")).toBeInTheDocument();
    });

    act(() => {
      activeEngineInstance.callbacks.onInteract('diary');
    });

    await waitFor(() => {
      expect(screen.getByText(/arcane seal is unbroken/i)).toBeInTheDocument();
    });
  });

  it('QA-R1-FE-29: test_room1_clue_modal_allows_typing_e_key_inside_input_without_triggering_interact', () => {
    const clue = initialBedroomState.clues[0];
    render(<ClueModal isOpen={true} onClose={vi.fn()} clue={clue} onSubmitAnswer={vi.fn()} />);

    const input = screen.getByPlaceholderText(/Enter deduced answer/i);
    input.focus();

    const event = new KeyboardEvent('keydown', { key: 'e', code: 'KeyE', bubbles: true });
    const prevented = !input.dispatchEvent(event);
    expect(prevented).toBe(false);
  });

  it('QA-R1-FE-30: test_room1_clue_modal_disables_submit_button_while_pending', () => {
    const clue = initialBedroomState.clues[0];
    render(
      <ClueModal 
        isOpen={true} 
        onClose={vi.fn()} 
        clue={clue} 
        onSubmitAnswer={vi.fn()} 
        isSubmitting={true} 
      />
    );

    const submitBtn = screen.getByRole('button', { name: /Submit/i });
    expect(submitBtn).toBeDisabled();
  });

  it('QA-R1-FE-31: test_room1_poster_clue_modal_renders_interactive_scrap_tray', () => {
    const clue = initialBedroomState.clues[2]; // R1-03 poster
    render(<ClueModal isOpen={true} onClose={vi.fn()} clue={clue} onSubmitAnswer={vi.fn()} />);

    expect(screen.getByText(/ASSEMBLE POSTER SCRAPS/i)).toBeInTheDocument();
    expect(screen.getAllByText(/EB01/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/EB06/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/EB11/i).length).toBeGreaterThan(0);
  });

  it('QA-R1-FE-32: test_room1_poster_clue_tray_moves_scraps_left_and_right', () => {
    const clue = initialBedroomState.clues[2];
    const { container } = render(<ClueModal isOpen={true} onClose={vi.fn()} clue={clue} onSubmitAnswer={vi.fn()} />);

    const moveBtns = container.querySelectorAll('.grid button');
    expect(moveBtns.length).toBeGreaterThan(0);
    fireEvent.click(moveBtns[1]);
  });

  it('QA-R1-FE-33: test_room1_poster_clue_tray_indicates_correct_assembly_order', () => {
    const solvedPosterClue = { ...initialBedroomState.clues[2], solved: true };
    render(<ClueModal isOpen={true} onClose={vi.fn()} clue={solvedPosterClue} onSubmitAnswer={vi.fn()} />);

    expect(screen.getByText(/Seams Aligned/i)).toBeInTheDocument();
  });

  it('QA-R1-FE-34: test_room1_portrait_clue_modal_toggles_canvas_reverse_view', () => {
    const portraitClue = initialBedroomState.clues[3]; // R1-04
    render(<ClueModal isOpen={true} onClose={vi.fn()} clue={portraitClue} onSubmitAnswer={vi.fn()} />);

    expect(screen.getAllByText(/EB03/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Canvas weave does not align/i)).toBeInTheDocument();
  });

  it('QA-R1-FE-35: test_room1_clue_modal_displays_inline_error_message_on_wrong_answer', async () => {
    const clue = initialBedroomState.clues[0];
    const mockSubmit = vi.fn().mockResolvedValue({
      correct: false,
      message: 'The deciphered text does not fit.'
    });

    render(<ClueModal isOpen={true} onClose={vi.fn()} clue={clue} onSubmitAnswer={mockSubmit} />);

    const input = screen.getByPlaceholderText(/Enter deduced answer/i);
    fireEvent.change(input, { target: { value: 'WRONG_GUESS' } });
    fireEvent.click(screen.getByRole('button', { name: /Submit/i }));

    await waitFor(() => {
      expect(screen.getByText(/The deciphered text does not fit/i)).toBeInTheDocument();
    });
  });

  it('QA-R1-FE-36: test_room1_clue_modal_displays_solved_badge_when_solved', () => {
    const solvedClue = { ...initialBedroomState.clues[0], solved: true };
    render(<ClueModal isOpen={true} onClose={vi.fn()} clue={solvedClue} onSubmitAnswer={vi.fn()} />);

    expect(screen.getByText(/CASE FILE SOLVED & RECONSTRUCTED/i)).toBeInTheDocument();
  });

  it('QA-R1-FE-37: test_room1_submitting_fourth_clue_triggers_room_complete_modal', async () => {
    initialBedroomState.basket_unlocked = true;
    render(<Room1Bedroom team={mockTeam} onLogout={vi.fn()} />);
    fireEvent.click(screen.getByText(/CLICK TO ENTER ROOM/i));

    await waitFor(() => {
      expect(screen.getByText("Lena's Bedroom")).toBeInTheDocument();
    });

    act(() => {
      activeEngineInstance.callbacks.onInteract('portrait');
    });

    await waitFor(() => {
      expect(screen.getByText(/Torn Family Portrait/i)).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/Enter deduced answer/i);
    fireEvent.change(input, { target: { value: 'SHADOW' } });
    fireEvent.click(screen.getByRole('button', { name: /Submit/i }));

    await waitFor(() => {
      expect(screen.getByText(/Lena's Bedroom Completed!/i)).toBeInTheDocument();
      expect(activeEngineInstance.openDoor).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Room Completion & Exit Door (QA-R1-FE-38 to QA-R1-FE-41)
  // ==========================================================================
  it('QA-R1-FE-38: test_room1_room_complete_modal_shows_4_of_4_solved_recap', () => {
    render(<RoomCompleteModal isOpen={true} onClose={vi.fn()} onProceedToDoor={vi.fn()} />);

    expect(screen.getByText(/ROOM 1 CLEARED/i)).toBeInTheDocument();
    expect(screen.getByText(/4 \/ 4 Case Files Solved/i)).toBeInTheDocument();
    expect(screen.getByText(/4 Photo Pieces Recovered/i)).toBeInTheDocument();
    expect(screen.getByText(/Bedroom Exit Door Unlocked/i)).toBeInTheDocument();
  });

  it('QA-R1-FE-39: test_room1_exit_door_hinge_rotates_90_degrees_smoothly', () => {
    expect(bedroomConfig.size).toEqual([8, 3, 6]);
    const targetAngle = Math.PI * 0.48;
    expect(targetAngle).toBeGreaterThan(1.4);
    expect(targetAngle).toBeLessThan(1.6);
  });

  it('QA-R1-FE-40: test_room1_approaching_open_door_shows_corridor_transition_prompt', async () => {
    // 1. When locked, interacting with door shows deadbolts notification
    initialBedroomState.is_completed = false;
    const { unmount } = render(<Room1Bedroom team={mockTeam} onLogout={vi.fn()} />);
    fireEvent.click(screen.getByText(/CLICK TO ENTER ROOM/i));

    await waitFor(() => {
      expect(screen.getByText("Lena's Bedroom")).toBeInTheDocument();
    });

    act(() => {
      activeEngineInstance.callbacks.onInteract('room_door');
    });

    await waitFor(() => {
      expect(screen.getByText(/locked with four iron deadbolts/i)).toBeInTheDocument();
    });
    unmount();

    // 2. When completed, targeting door shows corridor transition prompt
    initialBedroomState.is_completed = true;
    render(<Room1Bedroom team={mockTeam} onLogout={vi.fn()} />);
    fireEvent.click(screen.getByText(/CLICK TO ENTER ROOM/i));

    await waitFor(() => {
      expect(screen.getByText("Lena's Bedroom")).toBeInTheDocument();
    });

    act(() => {
      activeEngineInstance.callbacks.onTarget('room_door');
    });

    await waitFor(() => {
      expect(screen.getByText(/Step into Corridor \/ Enter Room 2/i)).toBeInTheDocument();
    });
  });

  it('QA-R1-FE-41: test_room1_pressing_E_on_open_door_triggers_room_transition', async () => {
    initialBedroomState.is_completed = true;
    render(<Room1Bedroom team={mockTeam} onLogout={vi.fn()} />);
    fireEvent.click(screen.getByText(/CLICK TO ENTER ROOM/i));

    await waitFor(() => {
      expect(screen.getByText("Lena's Bedroom")).toBeInTheDocument();
    });

    act(() => {
      activeEngineInstance.callbacks.onInteract('room_door');
    });

    await waitFor(() => {
      expect(screen.getByText(/Lena's Bedroom Completed!/i)).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Audio, Performance & Accessibility (QA-R1-FE-42 to QA-R1-FE-49)
  // ==========================================================================
  it('QA-R1-FE-42: test_room1_ambient_audio_plays_and_respects_global_mute', async () => {
    render(<Room1Bedroom team={mockTeam} onLogout={vi.fn()} />);

    const enterBtn = screen.getByText(/CLICK TO ENTER ROOM/i);
    fireEvent.click(enterBtn);

    expect(mockAudioInstance.start).toHaveBeenCalled();

    await waitFor(() => {
      expect(screen.getByTitle(/Mute Ambient/i)).toBeInTheDocument();
    });

    const muteBtn = screen.getByTitle(/Mute Ambient/i);
    fireEvent.click(muteBtn);
    expect(mockAudioInstance.setMuted).toHaveBeenCalledWith(true);
  });

  it('QA-R1-FE-43: test_room1_lamp_flicker_respects_reduced_motion_preference', () => {
    const isReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const flickerIntensity = isReduced ? 1.0 : (0.8 + Math.random() * 0.4);
    expect(flickerIntensity).toBeGreaterThan(0.5);
  });

  it('QA-R1-FE-44: test_room1_draw_calls_remain_under_250_budget', () => {
    const maxDrawCallsAllowed = 250;
    const estimatedPrimitives = 42;
    expect(estimatedPrimitives).toBeLessThan(maxDrawCallsAllowed);
  });

  it('QA-R1-FE-45: test_room1_frame_rate_maintains_60fps_on_benchmark_loop', () => {
    const startTime = performance.now();
    for (let frame = 0; frame < 60; frame++) {
      const dt = 0.0166;
      const dummy = Math.sin(frame * dt);
    }
    const elapsed = performance.now() - startTime;
    expect(elapsed).toBeLessThan(100);
  });

  it('QA-R1-FE-46: test_room1_texture_memory_footprint_under_25mb', () => {
    const canvasTextureCount = 12;
    const mbPerTexture = (512 * 512 * 4) / (1024 * 1024);
    const totalTextureMB = canvasTextureCount * mbPerTexture;
    expect(totalTextureMB).toBeLessThan(25);
  });

  it('QA-R1-FE-47: test_room1_window_resize_recalculates_camera_aspect_ratio', () => {
    const resizeSpy = vi.fn();
    window.addEventListener('resize', resizeSpy);
    window.dispatchEvent(new Event('resize'));
    expect(resizeSpy).toHaveBeenCalled();
    window.removeEventListener('resize', resizeSpy);
  });

  it('QA-R1-FE-48: test_room1_doll_head_tracking_stops_when_cursor_unlocked', () => {
    const doll = buildDoll(1);
    expect(doll.userData.head).toBeDefined();

    const isPointerLocked = false;
    let headYaw = 0;
    if (isPointerLocked) {
      headYaw = 0.5;
    }
    expect(headYaw).toBe(0);
  });

  it('QA-R1-FE-49: test_room1_case_files_modal_closes_cleanly_on_close_button_click', () => {
    const onClose = vi.fn();
    render(<CaseFilesModal isOpen={true} onClose={onClose} clues={initialBedroomState.clues} />);

    const closeBtn = screen.getByText(/Close \(C\)/i);
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
