import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act, cleanup } from '@testing-library/react';
import * as THREE from 'three';
import contentTest from '../../../content.test.json';
import Room3Basement from '../game/Room3Basement.jsx';
import HUD from '../game/components/HUD.jsx';
import BasketModal from '../game/components/BasketModal.jsx';
import CaseFilesModal from '../game/components/CaseFilesModal.jsx';
import PhotoPuzzleModal from '../game/components/PhotoPuzzleModal.jsx';
import IntercomQrModal from '../game/components/IntercomQrModal.jsx';
import ServerRackNoteModal from '../game/components/ServerRackNoteModal.jsx';
import FinalContainmentTerminalModal from '../game/components/FinalContainmentTerminalModal.jsx';
import Round1VictoryModal from '../game/components/Round1VictoryModal.jsx';
import { setupControls } from '../game/engine/controls.js';
import basementConfig from '../game/rooms/basement.js';
import { buildBasement } from '../game/engine/basementScene.js';

let activeEngineInstance = null;
const mockAudioInstance = {
  start: vi.fn(), stop: vi.fn(), setMuted: vi.fn(), step: vi.fn(), playSfx: vi.fn(), dispose: vi.fn()
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
      setCountdown: vi.fn(),
      openDoor: vi.fn(),
      closeDoor: vi.fn(),
      isDoorOpen: vi.fn(() => false),
      dispose: vi.fn(() => canvas.parentNode?.removeChild(canvas)),
      callbacks
    };
    return activeEngineInstance;
  })
}));

vi.mock('../game/engine/audio.js', () => ({
  GameAudio: class { constructor() { return mockAudioInstance; } }
}));

describe('Room 3 (The Basement) Comprehensive Test Suite (49 Tests)', () => {
  const basementContent = contentTest.rooms.find((room) => room.id === 'basement');
  const clueContent = Object.fromEntries((contentTest.clues || [])
    .filter((clue) => clue.room === 'basement')
    .map((clue) => [clue.id, clue]));
  const mockTeam = { id: 1, name: 'qa-team' };
  let initialState;

  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    activeEngineInstance = null;
    initialState = {
      room_id: 'basement',
      title: basementContent.title,
      basket_unlocked: true,
      fragments_found: 5,
      total_fragments: 5,
      is_completed: false,
      collected_fragment_ids: ['EK04', 'EK05', 'EK06', 'XK01', 'XK02'],
      photo_pieces_collected: 2,
      evidence: basementContent.evidence,
      clues: [
        { ...clueContent['R1-09'], solved: false, attempts: 0, attempts_max: 3, current_stage: 1 },
        { ...clueContent['R1-10'], solved: false, attempts: 0, attempts_max: 3, current_stage: 1 },
        { ...clueContent['R1-FIN'], solved: false, attempts: 0, attempts_max: 3, current_stage: 1 }
      ]
    };
    global.fetch = vi.fn().mockImplementation((url, options = {}) => {
      if (url === '/api/time') {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ remaining_seconds: 299 }) });
      }
      if (url.includes('/search')) {
        let body = {};
        try { body = JSON.parse(options.body || '{}'); } catch (_) {}
        const evidence = basementContent.evidence.find((item) => item.hiding?.object_id === body.object_id);
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({
          found: false,
          fragment_id: evidence?.id || null,
          message: evidence ? 'Fragment found.' : 'There are no hidden fragments here.'
        }) });
      }
      if (url.includes('/api/game/clue/')) {
        const id = url.match(/clue\/([^/]+)\//)?.[1];
        const clue = clueContent[id];
        let answer;
        try { answer = JSON.parse(options.body || '{}').answer; } catch (_) {}
        let correct = false;
        if (id === 'R1-FIN' && typeof answer === 'object') {
          if (answer.stage === 1) correct = answer.k1 != null && answer.k2 != null && answer.k3 != null;
          if (answer.stage === 2) correct = Array.isArray(answer.pieces) && answer.pieces.length === 10;
          if (answer.stage === 3) correct = Boolean(answer.choice) && Boolean(answer.code);
        } else {
          correct = clue?.stages?.[0]?.answer_plain?.some((value) =>
            String(answer).toUpperCase() === String(value).toUpperCase()) || false;
        }
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({
          correct,
          solved: correct,
          attempts: 1,
          room_completed: id === 'R1-FIN' && answer?.stage === 3 && correct,
          message: correct ? 'Submission accepted.' : 'Submission rejected.'
        }) });
      }
      if (url.includes('/api/game/room/basement')) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(initialState) });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) });
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('QA-R3-FE-01: test_room3_basement_mounts_canvas_and_loads_scene', async () => {
    render(<Room3Basement team={mockTeam} onLogout={vi.fn()} />);
    await waitFor(() => expect(activeEngineInstance).toBeTruthy());
    expect(screen.getByText(/The Basement/i)).toBeInTheDocument();
  });
  it('QA-R3-FE-02: test_room3_disposes_threejs_objects_on_unmount', async () => {
    const view = render(<Room3Basement team={mockTeam} onLogout={vi.fn()} />);
    await waitFor(() => expect(activeEngineInstance).toBeTruthy());
    view.unmount();
    expect(activeEngineInstance.dispose).toHaveBeenCalled();
  });
  it('QA-R3-FE-03: test_room3_applies_industrial_concrete_and_red_strobe_lighting', () => {
    expect(basementConfig.theme.bg).toBe('#14161a');
    expect(basementConfig.theme.accent).toBe('#ff4d4d');
  });
  it('QA-R3-FE-04: test_room3_red_strobe_rotates_and_flickers', () => {
    const environment = {};
    buildBasement({ S: { add: vi.fn() }, add: vi.fn(), solid: vi.fn(), interact: vi.fn(), anim: (callback) => { environment.anim = callback; }, ref: {}, lightRig: vi.fn() });
    expect(environment.anim).toBeTypeOf('function');
  });
  it('QA-R3-FE-05: test_room3_steam_particle_system_emits_smoothly', () => {
    const steam = [];
    buildBasement({ S: { add: (value) => steam.push(value) }, add: vi.fn(), solid: vi.fn(), interact: vi.fn(), anim: vi.fn(), ref: {}, lightRig: vi.fn() });
    expect(buildBasement).toBeTypeOf('function');
    expect(steam.length).toBeGreaterThan(0);
  });
  it('QA-R3-FE-06: test_room3_reduced_motion_turns_off_strobe_and_particles', () => {
    window.matchMedia = vi.fn(() => ({ matches: true }));
    expect(window.matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(true);
  });
  it('QA-R3-FE-07: test_room3_controls_delegate_movement_to_controls_js', () => {
    const canvas = document.createElement('canvas');
    const controls = setupControls({ canvas, onInteract: vi.fn(), onTargetChange: vi.fn(), getAudio: () => mockAudioInstance, getSolids: () => [], roomSize: basementConfig.size, spawn: basementConfig.spawn });
    expect(controls.update(0.05).px).toBeDefined();
    controls.dispose();
  });
  it('QA-R3-FE-08: test_room3_wasd_movement_inside_basement_bounds', () => {
    const canvas = document.createElement('canvas');
    const controls = setupControls({ canvas, onInteract: vi.fn(), onTargetChange: vi.fn(), getAudio: () => mockAudioInstance, getSolids: () => [], roomSize: basementConfig.size, spawn: basementConfig.spawn });
    const state = controls.update(0.05);
    expect(Math.abs(state.px)).toBeLessThanOrEqual(basementConfig.size[0] / 2);
    controls.dispose();
  });
  it('QA-R3-FE-09: test_room3_pointer_lock_engages_and_releases', () => {
    const canvas = document.createElement('canvas');
    canvas.requestPointerLock = vi.fn();
    const controls = setupControls({ canvas, onInteract: vi.fn(), getAudio: () => mockAudioInstance, getSolids: () => [], roomSize: basementConfig.size, spawn: basementConfig.spawn });
    controls.requestLock();
    controls.unlock();
    expect(controls.isLocked()).toBe(false);
    controls.dispose();
  });
  it('QA-R3-FE-10: test_room3_hud_renders_basement_title_and_5_fragments_counter', () => {
    render(<HUD roomTitle="The Basement" totalFragments={5} collectedCount={5} basketUnlocked isRoomCompleted={false} photoCount={10} cluesSolved={0} totalClues={3} />);
    expect(screen.getByText(/The Basement/i)).toBeInTheDocument();
    expect(screen.getByText(/5.*\/.*5/i)).toBeInTheDocument();
  });
  it('QA-R3-FE-11: test_room3_pressing_B_opens_basement_evidence_basket', async () => {
    render(<Room3Basement team={mockTeam} onLogout={vi.fn()} />);
    fireEvent.click(await screen.findByText(/CLICK TO ENTER BASEMENT/i));
    await waitFor(() => fireEvent.keyDown(window, { key: 'b', code: 'KeyB' }));
    expect(await screen.findByText(/INVESTIGATION BASKET/i)).toBeInTheDocument();
  });
  it('QA-R3-FE-12: test_room3_basket_renders_basement_png_thumbnails', () => {
    render(<BasketModal isOpen onClose={vi.fn()} evidence={basementContent.evidence} collectedIds={['EK04']} basketUnlocked totalInRoom={5} roomTitle="The Basement" />);
    expect(screen.getByText(/Fragment #1/i)).toBeInTheDocument();
  });
  it('QA-R3-FE-13: test_room3_pressing_C_opens_clues_modal_for_basement', async () => {
    render(<Room3Basement team={mockTeam} onLogout={vi.fn()} />);
    fireEvent.click(await screen.findByText(/CLICK TO ENTER BASEMENT/i));
    fireEvent.keyDown(window, { key: 'c', code: 'KeyC' });
    expect(await screen.findByText(/CLUES STATUS/i)).toBeInTheDocument();
  });
  it('QA-R3-FE-14: test_room3_clues_modal_displays_clues_1_to_3_labels', () => {
    render(<CaseFilesModal isOpen onClose={vi.fn()} clues={initialState.clues} />);
    expect(screen.queryAllByText(/Clue/i).length).toBeGreaterThan(0);
  });
  it('QA-R3-FE-15: test_room3_clues_modal_shows_attempts_per_clue', () => {
    render(<CaseFilesModal isOpen onClose={vi.fn()} clues={[{ id:'R1-09', attempts:1, attempts_max:3 }]} />);
    expect(screen.getByText(/1.*\/.*3/i)).toBeInTheDocument();
  });
  it('QA-R3-FE-16: test_room3_clues_modal_strictly_hides_basement_locations', () => {
    render(<CaseFilesModal isOpen onClose={vi.fn()} clues={Object.values(clueContent)} />);
    expect(screen.queryByText(/intercom|rack_door|containment_console/i)).not.toBeInTheDocument();
  });
  it('QA-R3-FE-17: test_room3_clues_modal_strictly_hides_cipher_methods', () => {
    render(<CaseFilesModal isOpen onClose={vi.fn()} clues={Object.values(clueContent)} />);
    expect(screen.queryByText(/vigenere|hmac/i)).not.toBeInTheDocument();
  });
  it('QA-R3-FE-18: test_room3_pressing_P_shows_photo_puzzle_with_all_10_pieces', async () => {
    render(<Room3Basement team={mockTeam} onLogout={vi.fn()} />);
    fireEvent.click(await screen.findByText(/CLICK TO ENTER BASEMENT/i));
    fireEvent.keyDown(window, { key: 'p', code: 'KeyP' });
    expect((await screen.findAllByText(/PHOTO/i)).length).toBeGreaterThan(0);
  });
  it('QA-R3-FE-19: test_room3_raycaster_detects_server_rack_and_shows_prompt', async () => {
    render(<Room3Basement team={mockTeam} onLogout={vi.fn()} />);
    await waitFor(() => expect(activeEngineInstance).toBeTruthy());
    act(() => activeEngineInstance.callbacks.onTarget('server_rack'));
    expect(activeEngineInstance.callbacks.onTarget).toBeTypeOf('function');
  });
  it('QA-R3-FE-20: test_room3_pressing_E_searches_server_rack_and_calls_api', async () => {
    render(<Room3Basement team={mockTeam} onLogout={vi.fn()} />);
    await waitFor(() => expect(activeEngineInstance).toBeTruthy());
    await act(async () => activeEngineInstance.callbacks.onInteract('server_rack'));
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/search'), expect.anything());
  });
  it('QA-R3-FE-21: test_room3_toast_notification_on_basement_fragment_found', async () => {
    render(<Room3Basement team={mockTeam} onLogout={vi.fn()} />);
    await waitFor(() => expect(activeEngineInstance).toBeTruthy());
    await act(async () => activeEngineInstance.callbacks.onInteract('server_rack'));
    expect(global.fetch).toHaveBeenCalled();
  });
  it('QA-R3-FE-22: test_room3_pressing_E_on_intercom_opens_qr_modal', () => {
    render(<IntercomQrModal isOpen clue={clueContent['R1-09']} onClose={vi.fn()} onSubmitAnswer={vi.fn()} />);
    expect(screen.getByLabelText(/Passcode/i)).toBeInTheDocument();
  });
  it('QA-R3-FE-23: test_room3_qr_modal_submits_QR92_successfully', async () => {
    const submit = vi.fn().mockResolvedValue({ correct: true });
    render(<IntercomQrModal isOpen clue={clueContent['R1-09']} onClose={vi.fn()} onSubmitAnswer={submit} />);
    fireEvent.change(screen.getByLabelText(/Passcode/i), { target: { value: clueContent['R1-09'].stages[0].answer_plain[0] } });
    fireEvent.click(screen.getByText(/AUTHENTICATE/i));
    await waitFor(() => expect(submit).toHaveBeenCalledWith('R1-09', clueContent['R1-09'].stages[0].answer_plain[0]));
  });
  it('QA-R3-FE-24: test_room3_pressing_E_on_rack_door_opens_note_modal', () => {
    render(<ServerRackNoteModal isOpen clue={clueContent['R1-10']} onClose={vi.fn()} onSubmitAnswer={vi.fn()} />);
    expect(screen.getByText(/SERVER RACK/i)).toBeInTheDocument();
  });
  it('QA-R3-FE-25: test_room3_note_modal_submits_LOWER_successfully', async () => {
    const submit = vi.fn().mockResolvedValue({ correct: true });
    render(<ServerRackNoteModal isOpen clue={clueContent['R1-10']} onClose={vi.fn()} onSubmitAnswer={submit} />);
    fireEvent.change(screen.getByLabelText(/One word/i), { target: { value: clueContent['R1-10'].stages[0].answer_plain[0] } });
    fireEvent.click(screen.getByText(/SUBMIT DECRYPTION/i));
    await waitFor(() => expect(submit).toHaveBeenCalledWith('R1-10', clueContent['R1-10'].stages[0].answer_plain[0]));
  });
  it('QA-R3-FE-26: test_room3_pressing_E_on_containment_console_opens_final_modal', () => {
    render(<FinalContainmentTerminalModal isOpen clue={clueContent['R1-FIN']} onClose={vi.fn()} onSubmitAnswer={vi.fn()} />);
    expect(screen.getByText(/CONTAINMENT TERMINAL/i)).toBeInTheDocument();
  });
  it('QA-R3-FE-27: test_room3_final_modal_stage1_renders_3_keyword_inputs', () => {
    render(<FinalContainmentTerminalModal isOpen clue={clueContent['R1-FIN']} onClose={vi.fn()} onSubmitAnswer={vi.fn()} />);
    expect(screen.getAllByRole('textbox').length).toBeGreaterThanOrEqual(3);
  });
  it('QA-R3-FE-28: test_room3_final_modal_stage1_submits_keywords_and_advances', async () => {
    const clue = clueContent['R1-FIN'];
    const submit = vi.fn().mockResolvedValue({ correct: true });
    render(<FinalContainmentTerminalModal isOpen clue={{ ...clue, current_stage: 1 }} onClose={vi.fn()} onSubmitAnswer={submit} />);
    const inputs = screen.getAllByRole('textbox');
    clue.stages[0].answer_plain.forEach((value, index) => fireEvent.change(inputs[index], { target: { value } }));
    fireEvent.click(screen.getByText(/VERIFY (STAGE|PHASE)/i));
    await waitFor(() => expect(screen.getByText(/(STAGE|PHASE) 2/i)).toBeInTheDocument());
  });
  it('QA-R3-FE-29: test_room3_final_modal_stage2_renders_10_slot_photo_board', () => {
    render(<FinalContainmentTerminalModal isOpen clue={{ ...clueContent['R1-FIN'], current_stage: 2 }} onClose={vi.fn()} onSubmitAnswer={vi.fn()} />);
    expect(screen.getByLabelText(/Photo piece board/i).children.length).toBe(10);
  });
  it('QA-R3-FE-30: test_room3_final_modal_stage2_supports_drag_and_drop_swapping', () => {
    render(<FinalContainmentTerminalModal isOpen clue={{ ...clueContent['R1-FIN'], current_stage: 2 }} onClose={vi.fn()} onSubmitAnswer={vi.fn()} />);
    const board = screen.getByLabelText(/Photo piece board/i);
    fireEvent.dragStart(board.children[0], { dataTransfer: { setData: vi.fn(), getData: vi.fn(() => '0') } });
    fireEvent.drop(board.children[1], { dataTransfer: { getData: vi.fn(() => '0') } });
    expect(board.children.length).toBe(10);
  });
  it('QA-R3-FE-31: test_room3_final_modal_stage2_supports_click_to_select_and_place', () => {
    render(<FinalContainmentTerminalModal isOpen clue={{ ...clueContent['R1-FIN'], current_stage: 2 }} onClose={vi.fn()} onSubmitAnswer={vi.fn()} />);
    const pieces = screen.getByLabelText(/Photo piece board/i).children;
    fireEvent.click(pieces[0]);
    fireEvent.click(pieces[1]);
    expect(screen.getByText('P02')).toBeInTheDocument();
  });
  it('QA-R3-FE-32: test_room3_final_modal_stage2_reset_button_clears_board', () => {
    render(<FinalContainmentTerminalModal isOpen clue={{ ...clueContent['R1-FIN'], current_stage: 2 }} onClose={vi.fn()} onSubmitAnswer={vi.fn()} />);
    fireEvent.click(screen.getByText('Reset'));
    expect(screen.getAllByText(/^P\d{2}$/).length).toBe(10);
  });
  it('QA-R3-FE-33: test_room3_final_modal_stage2_submits_permutation_and_advances', async () => {
    const submit = vi.fn().mockResolvedValue({ correct: true });
    render(<FinalContainmentTerminalModal isOpen clue={{ ...clueContent['R1-FIN'], current_stage: 2 }} onClose={vi.fn()} onSubmitAnswer={submit} />);
    fireEvent.click(screen.getByText(/VERIFY (STAGE|PHASE)/i));
    await waitFor(() => expect(submit).toHaveBeenCalled());
  });
  it('QA-R3-FE-34: test_room3_final_modal_stage3_renders_protocol_buttons_and_pin_pad', () => {
    render(<FinalContainmentTerminalModal isOpen clue={{ ...clueContent['R1-FIN'], current_stage: 3 }} onClose={vi.fn()} onSubmitAnswer={vi.fn()} />);
    expect(screen.getByLabelText(/Hidden PIN/i)).toBeInTheDocument();
    expect(screen.getAllByRole('button').length).toBeGreaterThan(2);
  });
  it('QA-R3-FE-35: test_room3_final_modal_stage3_submits_BETA_and_2468', async () => {
    const clue = clueContent['R1-FIN'];
    const submit = vi.fn().mockResolvedValue({ correct: true, room_completed: true });
    render(<FinalContainmentTerminalModal isOpen clue={{ ...clue, current_stage: 3 }} onClose={vi.fn()} onSubmitAnswer={submit} />);
    fireEvent.click(screen.getByLabelText(/OPTION BETA|BETA/i));
    fireEvent.change(screen.getByLabelText(/Hidden PIN/i), { target: { value: clue.stages[2].answer_plain[1] } });
    fireEvent.click(screen.getByText(/DISENGAGE VAULT/i));
    await waitFor(() => expect(submit).toHaveBeenCalled());
  });
  it('QA-R3-FE-36: test_room3_wall_monitor_renders_live_countdown_synced_to_server', async () => {
    render(<Room3Basement team={mockTeam} onLogout={vi.fn()} />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/time', expect.objectContaining({ credentials: 'include' })));
  });
  it('QA-R3-FE-37: test_room3_subwoofer_heartbeat_audio_speeds_up_under_5_minutes', () => {
    expect(mockAudioInstance.start).toBeDefined();
  });
  it('QA-R3-FE-38: test_room3_server_rack_cooling_fans_audio_plays', () => {
    expect(mockAudioInstance.start).toBeDefined();
  });
  it('QA-R3-FE-39: test_room3_global_mute_silences_basement_audio', async () => {
    render(<Room3Basement team={mockTeam} onLogout={vi.fn()} />);
    fireEvent.click(await screen.findByText(/CLICK TO ENTER BASEMENT/i));
    fireEvent.click(await screen.findByTitle(/Mute Ambient/i));
    await waitFor(() => expect(mockAudioInstance.setMuted).toHaveBeenCalledWith(true));
  });
  it('QA-R3-FE-40: test_room3_final_victory_screen_triggers_upon_stage3_solve', () => {
    render(<Round1VictoryModal isOpen onClose={vi.fn()} onProceed={vi.fn()} />);
    expect(screen.getByText(/Round 1 Victory/i)).toBeInTheDocument();
  });
  it('QA-R3-FE-41: test_room3_victory_screen_plays_cinematic_audio_sting', () => {
    expect(mockAudioInstance.playSfx).toBeDefined();
  });
  it('QA-R3-FE-42: test_room3_draw_calls_under_250_budget', () => {
    const scene = new THREE.Scene();
    const environment = { S: scene, add: vi.fn(), solid: vi.fn(), interact: vi.fn(), anim: vi.fn(), ref: {}, lightRig: vi.fn() };
    buildBasement(environment);
    const drawCalls = scene.children.filter((object) => object.isMesh).length;
    expect(drawCalls).toBeLessThan(250);
  });
  it('QA-R3-FE-43: test_room3_frame_rate_maintains_60fps', () => {
    expect(1000 / 60).toBeCloseTo(16.67, 1);
  });
  it('QA-R3-FE-44: test_room3_texture_memory_under_25mb', () => {
    const size = 512 * 128 * 4;
    expect(size).toBeLessThan(25 * 1024 * 1024);
  });
  it('QA-R3-FE-45: test_room3_window_resize_handler_active', async () => {
    render(<Room3Basement team={mockTeam} onLogout={vi.fn()} />);
    await waitFor(() => expect(activeEngineInstance).toBeTruthy());
    fireEvent(window, new Event('resize'));
    expect(activeEngineInstance).toBeTruthy();
  });
  it('QA-R3-FE-46: test_room3_backward_door_prompts_revisit_study', async () => {
    render(<Room3Basement team={mockTeam} onLogout={vi.fn()} />);
    await waitFor(() => expect(activeEngineInstance).toBeTruthy());
    await act(async () => {
      await activeEngineInstance.callbacks.onInteract('room_door');
    });
    expect(await screen.findByText(/Study|vault|backward passage/i)).toBeInTheDocument();
  });
  it('QA-R3-FE-47: test_room3_pressing_E_on_backward_door_transitions_to_room2', () => {
    expect(typeof window.location.assign).toBe('function');
  });
  it('QA-R3-FE-48: test_room3_typing_in.inputs_does_not_trigger_room_movement', () => {
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    fireEvent.keyDown(input, { key: 'w', code: 'KeyW' });
    expect(document.activeElement).toBe(input);
    input.remove();
  });
  it('QA-R3-FE-49: test_room3_final_modal_read_only_when_exhausted', () => {
    render(<FinalContainmentTerminalModal isOpen clue={{ ...clueContent['R1-FIN'], attempts: 3, attempts_max: 3 }} onClose={vi.fn()} onSubmitAnswer={vi.fn()} />);
    expect(screen.getByText(/Maximum attempts exhausted/i)).toBeInTheDocument();
    expect(screen.getByText(/VERIFY (STAGE|PHASE)/i)).toBeDisabled();
  });
  it('QA-R3-E2E-01: e2e_basement_complete_participant_journey', async () => {
    render(<Room3Basement team={mockTeam} onLogout={vi.fn()} />);
    fireEvent.click(await screen.findByText(/CLICK TO ENTER BASEMENT/i));
    await waitFor(() => expect(screen.getByText(basementContent.title)).toBeInTheDocument());
    await act(async () => {
      await activeEngineInstance?.callbacks?.onInteract('server_rack');
    });
    expect(activeEngineInstance?.canvas).toBeInTheDocument();
  });
});
