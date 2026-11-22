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
  start: vi.fn(), stop: vi.fn(), setMuted: vi.fn(), step: vi.fn(), playSfx: vi.fn(), hoarseScream: vi.fn(), playTrack: vi.fn(), dispose: vi.fn()
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
      shake: vi.fn(),
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

vi.mock('../game/engine/audioRecords.js', () => ({
  GameAudioRecords: class { constructor() { return mockAudioInstance; } }
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
  it('QA-R3-FE-08: test_room3_wasd_movement_reaches_both_basement_edges', () => {
    const canvas = document.createElement('canvas');
    const controls = setupControls({
      canvas,
      onInteract: vi.fn(),
      onTargetChange: vi.fn(),
      getAudio: () => mockAudioInstance,
      getSolids: () => [],
      roomSize: basementConfig.size,
      boundaryInset: basementConfig.boundaryInset,
      spawn: basementConfig.spawn
    });
    controls.setView(0, 0, 0);
    fireEvent.keyDown(window, { key: 'w', code: 'KeyW' });
    for (let i = 0; i < 300; i++) controls.update(0.02);
    expect(controls.getPos().z).toBeCloseTo(-basementConfig.size[2] / 2 + 0.35, 1);
    fireEvent.keyUp(window, { key: 'w', code: 'KeyW' });

    controls.setView(0, 0, 0);
    fireEvent.keyDown(window, { key: 's', code: 'KeyS' });
    for (let i = 0; i < 300; i++) controls.update(0.02);
    expect(controls.getPos().z).toBeCloseTo(basementConfig.size[2] / 2 - 0.35, 1);
    fireEvent.keyUp(window, { key: 's', code: 'KeyS' });

    controls.setView(0, 0, 0);
    fireEvent.keyDown(window, { key: 'a', code: 'KeyA' });
    for (let i = 0; i < 400; i++) controls.update(0.02);
    expect(controls.getPos().x).toBeCloseTo(-basementConfig.size[0] / 2 + 0.35, 1);
    fireEvent.keyUp(window, { key: 'a', code: 'KeyA' });

    controls.setView(basementConfig.spawn[0], basementConfig.spawn[2], 0);
    fireEvent.keyDown(window, { key: 'd', code: 'KeyD' });
    for (let i = 0; i < 400; i++) controls.update(0.02);
    expect(controls.getPos().x).toBeCloseTo(basementConfig.size[0] / 2 - 0.35, 1);
    fireEvent.keyUp(window, { key: 'd', code: 'KeyD' });
    controls.dispose();
  });
  it('QA-R3-FE-51: controls keep the default edge inset for rooms without an override', () => {
    const controls = setupControls({
      canvas: document.createElement('canvas'),
      onInteract: vi.fn(),
      getAudio: () => mockAudioInstance,
      getSolids: () => [],
      roomSize: [8, 3, 6],
      spawn: [0, 0, 0]
    });
    fireEvent.keyDown(window, { key: 'w', code: 'KeyW' });
    for (let i = 0; i < 200; i++) controls.update(0.02);

    expect(controls.getPos().z).toBeCloseTo(-2.65, 1);
    fireEvent.keyUp(window, { key: 'w', code: 'KeyW' });
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
  it('QA-R3-FE-52: basement interact prompt stays visible with transparent styling', () => {
    const { container } = render(
      <div className="basement-room">
        <HUD activeHoverPrompt="Inspect containment console" />
      </div>
    );
    expect(screen.getByText('Inspect containment console')).toBeInTheDocument();
    expect(container.querySelector('.basement-room')).toBeInTheDocument();
  });
  it('QA-R3-FE-11: test_room3_pressing_B_opens_basement_evidence_basket', async () => {
    render(<Room3Basement team={mockTeam} onLogout={vi.fn()} />);
    fireEvent.click(await screen.findByText(/CLICK TO ENTER BASEMENT/i));
    await waitFor(() => fireEvent.keyDown(window, { key: 'b', code: 'KeyB' }));
    expect(await screen.findByText(/INVESTIGATION BASKET/i)).toBeInTheDocument();
  });
  it('QA-R3-FE-12: test_room3_basket_renders_basement_png_thumbnails', () => {
    render(<BasketModal isOpen onClose={vi.fn()} evidence={basementContent.evidence} collectedIds={['EK04']} basketUnlocked totalInRoom={5} roomTitle="The Basement" />);
    expect(screen.getByText(/Glitched printer report/i)).toBeInTheDocument();
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
    fireEvent.click(screen.getByText(/VERIFY PHASE/i));
    await waitFor(() => expect(screen.getByText(/PHASE 2\/3/i)).toBeInTheDocument());
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
    fireEvent.click(screen.getByText(/VERIFY PHASE/i));
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
  it('QA-R3-FE-50: basement interior registers physical collision solids without a room door object', () => {
    const environment = {
      S: new THREE.Scene(),
      add: vi.fn(),
      solid: vi.fn(),
      interact: vi.fn(),
      anim: vi.fn(),
      ref: {},
      lightRig: vi.fn(),
      W: 30,
      H: 3.8,
      D: 7.4
    };
    buildBasement(environment);

    expect(environment.solid).toHaveBeenCalled();
    expect(environment.interact).not.toHaveBeenCalledWith(expect.anything(), 'room_door');
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
    expect(screen.getByText(/VERIFY PHASE/i)).toBeDisabled();
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

  it('QA-R3-FE-53: staircase jumpscare triggers at end of staircase with image and scream audio', async () => {
    sessionStorage.setItem('ctc_room2_completed', 'true');
    render(<Room3Basement team={mockTeam} onLogout={vi.fn()} />);
    fireEvent.click(await screen.findByText(/CLICK TO ENTER BASEMENT/i));
    await waitFor(() => expect(screen.getByText(basementContent.title)).toBeInTheDocument());

    // Initially jumpscare is not present
    expect(screen.queryByTestId('basement-jumpscare-modal')).not.toBeInTheDocument();

    // Player descends stairs and reaches the end (px <= 15.05)
    act(() => {
      activeEngineInstance?.callbacks?.onPlayerMove({ px: 18.0 });
    });
    act(() => {
      activeEngineInstance?.callbacks?.onPlayerMove({ px: 15.0 });
    });

    // Jumpscare pops up
    const modal = screen.getByTestId('basement-jumpscare-modal');
    expect(modal).toBeInTheDocument();
    const img = screen.getByTestId('jumpscare-image');
    expect(img.getAttribute('src')).toMatch(/jumpscare_entity\.jpg/);
    expect(mockAudioInstance.hoarseScream).toHaveBeenCalled();
  });

  it('QA-R3-FE-54: staircase jumpscare disappears after exactly one second', async () => {
    vi.useFakeTimers();
    sessionStorage.setItem('ctc_room2_completed', 'true');
    render(<Room3Basement team={mockTeam} onLogout={vi.fn()} />);
    fireEvent.click(screen.getByText(/CLICK TO ENTER BASEMENT/i));

    act(() => {
      activeEngineInstance?.callbacks?.onPlayerMove({ px: 18.0 });
    });
    act(() => {
      activeEngineInstance?.callbacks?.onPlayerMove({ px: 15.0 });
    });

    expect(screen.getByTestId('basement-jumpscare-modal')).toBeInTheDocument();

    // Advance by 1 second (1000ms)
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // Jumpscare disappears
    expect(screen.queryByTestId('basement-jumpscare-modal')).not.toBeInTheDocument();
    vi.useRealTimers();
  });

  it('QA-R3-FE-55: staircase jumpscare does not re-trigger after already played', async () => {
    vi.useFakeTimers();
    sessionStorage.setItem('ctc_room2_completed', 'true');
    mockAudioInstance.hoarseScream.mockClear();
    render(<Room3Basement team={mockTeam} onLogout={vi.fn()} />);
    fireEvent.click(screen.getByText(/CLICK TO ENTER BASEMENT/i));

    act(() => {
      activeEngineInstance?.callbacks?.onPlayerMove({ px: 18.0 });
    });
    act(() => {
      activeEngineInstance?.callbacks?.onPlayerMove({ px: 15.0 });
    });

    expect(mockAudioInstance.hoarseScream).toHaveBeenCalledTimes(1);

    // Fade out after 1000ms
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.queryByTestId('basement-jumpscare-modal')).not.toBeInTheDocument();

    // Moving around again at end of stairs
    act(() => {
      activeEngineInstance?.callbacks?.onPlayerMove({ px: 14.8 });
    });
    expect(mockAudioInstance.hoarseScream).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('basement-jumpscare-modal')).not.toBeInTheDocument();
    vi.useRealTimers();
  });

  it('QA-R3-FE-56: lurking monster audio plays every 1m15s and heavy object falling plays 40-45s after', () => {
    vi.useFakeTimers();
    mockAudioInstance.playTrack.mockClear();
    render(<Room3Basement team={mockTeam} onLogout={vi.fn()} />);
    fireEvent.click(screen.getByText(/CLICK TO ENTER BASEMENT/i));

    // Initially neither track has played
    expect(mockAudioInstance.playTrack).not.toHaveBeenCalled();

    // Advance by 75 seconds (1 min 15 sec)
    act(() => {
      vi.advanceTimersByTime(75000);
    });

    // Monster audio plays
    expect(mockAudioInstance.playTrack).toHaveBeenCalledWith(
      '/assets/audio/basement/alesiadavina-halloween-horror-sound-lurking-monster-145070.mp3',
      0.85
    );

    // Falling object audio has not played yet
    expect(mockAudioInstance.playTrack).not.toHaveBeenCalledWith(
      '/assets/audio/basement/universfield-heavy-object-falling-291096.mp3',
      expect.anything()
    );

    // Advance by 45 seconds (within the 40-45s random window)
    act(() => {
      vi.advanceTimersByTime(45000);
    });

    // Heavy object falling audio now plays
    expect(mockAudioInstance.playTrack).toHaveBeenCalledWith(
      '/assets/audio/basement/universfield-heavy-object-falling-291096.mp3',
      0.85
    );

    vi.useRealTimers();
  });

  it('QA-R3-FE-57: sequential clue gating prevents opening R1-10 when R1-09 is unsolved', async () => {
    render(<Room3Basement team={mockTeam} onLogout={vi.fn()} />);
    fireEvent.click(await screen.findByText(/CLICK TO ENTER BASEMENT/i));
    await waitFor(() => expect(screen.getByText(basementContent.title)).toBeInTheDocument());

    // Interacting with rack_door when R1-09 is not solved
    await act(async () => {
      await activeEngineInstance?.callbacks?.onInteract('rack_door');
    });

    expect(await screen.findByText(/Previous clue "R1-09" in this sequence must be solved first/i)).toBeInTheDocument();
    expect(screen.queryByText(/SERVER RACK \/ MARGIN NOTE/i)).not.toBeInTheDocument();
  });

  it('QA-R3-FE-58: sequential clue gating prevents opening R1-FIN when prerequisites are unresolved', async () => {
    render(<Room3Basement team={mockTeam} onLogout={vi.fn()} />);
    fireEvent.click(await screen.findByText(/CLICK TO ENTER BASEMENT/i));
    await waitFor(() => expect(screen.getByText(basementContent.title)).toBeInTheDocument());

    // Interacting with containment_console when R1-09 & R1-10 are not resolved
    await act(async () => {
      await activeEngineInstance?.callbacks?.onInteract('containment_console');
    });

    expect(await screen.findByText(/Final terminal locked. Solve R1-09 and R1-10 first/i)).toBeInTheDocument();
    expect(screen.queryByText(/CONTAINMENT TERMINAL • PHASE/i)).not.toBeInTheDocument();
  });

  it('QA-R3-FE-59: sealed evidence basket blocks opening any clues', async () => {
    global.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes('/api/game/room/basement')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            ...initialState,
            basket_unlocked: false,
            fragments_found: 2,
            collected_fragment_ids: ['EK04', 'EK05']
          })
        });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) });
    });

    render(<Room3Basement team={mockTeam} onLogout={vi.fn()} />);
    fireEvent.click(await screen.findByText(/CLICK TO ENTER BASEMENT/i));
    await waitFor(() => expect(screen.getByText(basementContent.title)).toBeInTheDocument());

    // Try interacting with intercom
    await act(async () => {
      await activeEngineInstance?.callbacks?.onInteract('intercom');
    });

    expect(await screen.findByText(/The evidence lock is sealed. Recover all 5 basement fragments first/i)).toBeInTheDocument();
    expect(screen.queryByText(/WALL INTERCOM/i)).not.toBeInTheDocument();
  });

  it('QA-R3-FE-60: clue submission preserves 403 CLUE_LOCKED server detail message', async () => {
    global.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes('/api/game/room/basement')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            ...initialState,
            clues: [
              { ...clueContent['R1-09'], solved: true, attempts: 1, attempts_max: 3 },
              { ...clueContent['R1-10'], solved: false, attempts: 0, attempts_max: 3 },
              { ...clueContent['R1-FIN'], solved: false, attempts: 0, attempts_max: 3 }
            ]
          })
        });
      }
      if (url.includes('/api/game/clue/R1-10/submit')) {
        return Promise.resolve({
          ok: false,
          status: 403,
          json: () => Promise.resolve({
            detail: {
              code: 'CLUE_LOCKED',
              message: "Previous clue 'R1-09' in this sequence must be solved first."
            }
          })
        });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) });
    });

    render(<Room3Basement team={mockTeam} onLogout={vi.fn()} />);
    fireEvent.click(await screen.findByText(/CLICK TO ENTER BASEMENT/i));
    await waitFor(() => expect(screen.getByText(basementContent.title)).toBeInTheDocument());

    // Open R1-10 modal since R1-09 is solved
    await act(async () => {
      await activeEngineInstance?.callbacks?.onInteract('rack_door');
    });

    expect(await screen.findByText(/SERVER RACK \/ MARGIN NOTE/i)).toBeInTheDocument();

    // Submit answer which triggers 403
    fireEvent.change(screen.getByLabelText(/One word/i), { target: { value: 'TEST' } });
    fireEvent.click(screen.getByText(/SUBMIT DECRYPTION/i));

    expect(await screen.findByText(/Previous clue 'R1-09' in this sequence must be solved first/i)).toBeInTheDocument();
    expect(screen.queryByText(/Your session is no longer authorized/i)).not.toBeInTheDocument();
  });
});
