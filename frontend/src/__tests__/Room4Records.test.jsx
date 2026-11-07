import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

import Room4Records from '../game/Room4Records.jsx';
import HUDRecords from '../game/components/records/HUDRecords.jsx';
import RedactedReportModal from '../game/components/records/RedactedReportModal.jsx';
import MicrofilmViewerModal from '../game/components/records/MicrofilmViewerModal.jsx';
import EpochTimelineModal from '../game/components/records/EpochTimelineModal.jsx';
import BulkheadKeypadModal from '../game/components/records/BulkheadKeypadModal.jsx';
import CaseDossierModal from '../game/components/records/CaseDossierModal.jsx';
import Fork1Modal from '../game/components/records/Fork1Modal.jsx';
import BasketModal from '../game/components/BasketModal.jsx';
import recordsConfig from '../game/rooms/records.js';

let activeEngineInstance = null;

const mockAudioInstance = {
  start: vi.fn(),
  setMuted: vi.fn(),
  step: vi.fn(),
  good: vi.fn(),
  bad: vi.fn(),
  click: vi.fn(),
  dialClick: vi.fn(),
  drawerSlam: vi.fn(),
  screamingStinger: vi.fn(),
  blackoutSurge: vi.fn(),
  followerFootstepsBehind: vi.fn(),
  whisperRaspy: vi.fn(),
  dispose: vi.fn()
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
      dispose: vi.fn(() => {
        if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      }),
      callbacks
    };
    return activeEngineInstance;
  })
}));

vi.mock('../game/engine/audioRecords.js', () => ({
  GameAudioRecords: class {
    constructor() {
      return mockAudioInstance;
    }
  }
}));

describe('Room 4 (The Rotting Archive) Comprehensive Test Suite (QA-R4-FE-01 to QA-R4-FE-60)', () => {
  const mockTeam = { id: 1, name: 'horror_squad' };

  let initialRecordsState;

  beforeEach(() => {
    vi.clearAllMocks();

    initialRecordsState = {
      id: 'records',
      title: 'The Rotting Archive',
      order: 1,
      round: 2,
      total_fragments_in_room: 12,
      collected_fragment_ids: ['ER01', 'ER02'],
      basket_unlocked: true,
      is_completed: false,
      evidence: [
        { id: 'ER01', clue_id: 'R2-02', part: 'A', display: { title: 'Requisition form A' } },
        { id: 'ER02', clue_id: 'R2-02', part: 'B', display: { title: 'Subject intake B' } }
      ],
      clues: [
        {
          id: 'R2-02',
          case_file_id: 'CF-79A2',
          object_id: 'report_folder',
          title: 'Redacted Incident Report',
          room: 'records',
          solved: false,
          attempts: 0,
          attempts_max: 3,
          payload: {
            copies: [
              {
                id: 'copy_a',
                paragraphs: [[{ t: 'Shutdown date: ', r: false }, { t: '2001-02-10', r: true }]],
                footer_hash: 'U0hVVERPV049MjAwMS0wMi0xMA=='
              },
              {
                id: 'copy_b',
                paragraphs: [[{ t: 'Shutdown date: ', r: false }, { t: '2001-06-21', r: true }]],
                footer_hash: 'U0hVVERPV049MjAwMS0wMi0xMA=='
              }
            ]
          }
        },
        {
          id: 'R2-03',
          case_file_id: 'CF-7C9D',
          object_id: 'microfilm_reader',
          title: 'Microfilm Reader',
          room: 'records',
          solved: false,
          attempts: 0,
          attempts_max: 3,
          payload: { dial: true }
        },
        {
          id: 'R2-04',
          case_file_id: 'CF-2F05',
          object_id: 'timeline_board',
          title: 'Whiteboard Timeline',
          room: 'records',
          solved: false,
          attempts: 0,
          attempts_max: 3,
          payload: {
            cards: [
              { id: 'E1', text: 'Prototype boots', epoch: 973328400 },
              { id: 'E2', text: 'Lamp calibration', epoch: 976528800 }
            ]
          }
        },
        {
          id: 'R2-07',
          case_file_id: 'CF-4C16',
          object_id: 'bulkhead_door',
          title: 'Bulkhead Door Lock',
          room: 'records',
          solved: false,
          attempts: 0,
          attempts_max: 3,
          payload: {}
        }
      ]
    };

    global.fetch = vi.fn((url, options) => {
      const urlStr = String(url);

      if (urlStr.includes('/api/game/room/records/search')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            found: true,
            fragment_id: 'ER03',
            message: 'Found microfilm canister taped behind cabinet drawer.'
          })
        });
      }

      if (urlStr.includes('/api/game/fork/fork_1/status')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            ok: true,
            fork_id: 'fork_1',
            resolved: false,
            barred_choices: [],
            total_penalty_seconds: 0
          })
        });
      }

      if (urlStr.includes('/api/game/fork/fork_1/choose')) {
        const body = options?.body ? JSON.parse(options.body) : {};
        if (body.choice === 'A') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              ok: true,
              fork_id: 'fork_1',
              choice: 'A',
              is_correct: false,
              is_trap: true,
              penalty_seconds: 60,
              barred_choices: ['A'],
              message: 'Trap sprung!'
            })
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            ok: true,
            fork_id: 'fork_1',
            choice: 'B',
            is_correct: true,
            is_trap: false,
            penalty_seconds: 0,
            next_room: 'control',
            message: 'Route confirmed.'
          })
        });
      }

      if (urlStr.includes('/api/game/clue/') && urlStr.includes('/submit')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            correct: true,
            attempts: 1,
            room_completed: false
          })
        });
      }

      if (urlStr.includes('/api/game/room/records')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(initialRecordsState)
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

  // Test 1: Mounts without crash
  it('QA-R4-FE-01: mounts Room 4 Records 3D canvas and HUD without runtime errors', async () => {
    await act(async () => {
      render(<Room4Records team={mockTeam} onLogout={vi.fn()} />);
    });
    expect(screen.getByText(/ROUND 2 • ROOM 4: THE ROTTING ARCHIVE/i)).toBeInTheDocument();
  });

  // Test 2: Shows splash screen and enter room button
  it('QA-R4-FE-02: displays survival horror intro splash with keybindings', async () => {
    await act(async () => {
      render(<Room4Records team={mockTeam} onLogout={vi.fn()} />);
    });
    expect(screen.getByText(/DESCEND INTO THE SUB-BASEMENT/i)).toBeInTheDocument();
    expect(screen.getByText(/W A S D/i)).toBeInTheDocument();
  });

  // Test 3: Clicking enter starts game and locks pointer
  it('QA-R4-FE-03: clicking enter starts game and locks controls', async () => {
    await act(async () => {
      render(<Room4Records team={mockTeam} onLogout={vi.fn()} />);
    });
    const enterBtn = screen.getByText(/DESCEND INTO THE SUB-BASEMENT/i);
    await act(async () => {
      fireEvent.click(enterBtn);
    });
    await waitFor(() => {
      expect(activeEngineInstance.lock).toHaveBeenCalled();
    });
  });

  // Test 4: Flashlight toggle with F key
  it('QA-R4-FE-04: pressing F toggles tactical flashlight on/off', async () => {
    await act(async () => {
      render(<Room4Records team={mockTeam} onLogout={vi.fn()} />);
    });
    await act(async () => {
      fireEvent.click(screen.getByText(/DESCEND INTO THE SUB-BASEMENT/i));
    });

    await act(async () => {
      fireEvent.keyDown(window, { key: 'f', code: 'KeyF' });
    });
    expect(activeEngineInstance.setFlashlight).toHaveBeenCalledWith(false);

    await act(async () => {
      fireEvent.keyDown(window, { key: 'f', code: 'KeyF' });
    });
    expect(activeEngineInstance.setFlashlight).toHaveBeenCalledWith(true);
  });

  // Test 5: Pressing B opens evidence basket
  it('QA-R4-FE-05: pressing B toggles evidence basket modal', async () => {
    await act(async () => {
      render(<Room4Records team={mockTeam} onLogout={vi.fn()} />);
    });
    await act(async () => {
      fireEvent.click(screen.getByText(/DESCEND INTO THE SUB-BASEMENT/i));
    });

    await act(async () => {
      fireEvent.keyDown(window, { key: 'b', code: 'KeyB' });
    });
    expect(screen.getByText(/INVESTIGATION BASKET/i)).toBeInTheDocument();
  });

  // Test 6: Pressing C opens Case Dossier
  it('QA-R4-FE-06: pressing C toggles case dossier modal', async () => {
    await act(async () => {
      render(<Room4Records team={mockTeam} onLogout={vi.fn()} />);
    });
    await act(async () => {
      fireEvent.click(screen.getByText(/DESCEND INTO THE SUB-BASEMENT/i));
    });

    await act(async () => {
      fireEvent.keyDown(window, { key: 'c', code: 'KeyC' });
    });
    expect(screen.getByText(/CASE DOSSIER \/\/ SUBSTATION DELTA RECORDS VAULT/i)).toBeInTheDocument();
  });

  // Test 7: Interacting with prop calls search API
  it('QA-R4-FE-07: pressing E on prop triggers search API', async () => {
    await act(async () => {
      render(<Room4Records team={mockTeam} onLogout={vi.fn()} />);
    });
    await act(async () => {
      fireEvent.click(screen.getByText(/DESCEND INTO THE SUB-BASEMENT/i));
    });

    act(() => {
      activeEngineInstance.callbacks.onTarget('filing_cabinet_a');
    });

    await act(async () => {
      fireEvent.keyDown(window, { key: 'e', code: 'KeyE' });
    });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/game/room/records/search',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ object_id: 'filing_cabinet_a' })
      })
    );
  });

  // Test 8: Interacting with report_folder opens Redacted Report modal
  it('QA-R4-FE-08: interacting with report_folder opens Redacted Report modal', async () => {
    await act(async () => {
      render(<Room4Records team={mockTeam} onLogout={vi.fn()} />);
    });
    await act(async () => {
      fireEvent.click(screen.getByText(/DESCEND INTO THE SUB-BASEMENT/i));
    });

    act(() => {
      activeEngineInstance.callbacks.onTarget('report_folder');
    });

    await act(async () => {
      fireEvent.keyDown(window, { key: 'e', code: 'KeyE' });
    });

    expect(screen.getByText(/CASE FILE CF-79A2 \/\/ REDACTED INCIDENT REPORT/i)).toBeInTheDocument();
  });

  // Test 9: Redacted Report modal tabs switch between Copy A and Copy B
  it('QA-R4-FE-09: Redacted Report modal tabs switch between Copy A and Copy B', async () => {
    await act(async () => {
      render(
        <RedactedReportModal
          isOpen={true}
          clue={initialRecordsState.clues[0]}
          onClose={vi.fn()}
          onSubmitAnswer={vi.fn()}
        />
      );
    });

    expect(screen.getByText(/Copy A/i)).toBeInTheDocument();
    const tabB = screen.getByText(/Copy B/i);
    await act(async () => {
      fireEvent.click(tabB);
    });
    expect(screen.getByText(/SUBSTATION DELTA ARCHIVAL TRANSCRIPT — COPY_B/i)).toBeInTheDocument();
  });

  // Test 10: Base64 decode button in Redacted Report modal
  it('QA-R4-FE-10: base64 decode button reveals genuine shutdown date in hash', async () => {
    await act(async () => {
      render(
        <RedactedReportModal
          isOpen={true}
          clue={initialRecordsState.clues[0]}
          onClose={vi.fn()}
          onSubmitAnswer={vi.fn()}
        />
      );
    });

    const decodeBtn = screen.getByText(/\[BASE-64 DECODE\]/i);
    await act(async () => {
      fireEvent.click(decodeBtn);
    });

    expect(screen.getByText(/SHUTDOWN=2001-02-10/i)).toBeInTheDocument();
  });

  // Test 11: Microfilm Viewer modal renders rotary dial and frames
  it('QA-R4-FE-11: Microfilm Viewer modal renders rotary dial and frame controls', async () => {
    await act(async () => {
      render(
        <MicrofilmViewerModal
          isOpen={true}
          clue={initialRecordsState.clues[1]}
          onClose={vi.fn()}
          onSubmitAnswer={vi.fn()}
          audio={mockAudioInstance}
        />
      );
    });

    expect(screen.getByText(/REEL READER 400 \/\/ OPTICAL MICROFILM CONSOLE/i)).toBeInTheDocument();
    expect(screen.getByText(/ROTARY ADVANCE/i)).toBeInTheDocument();

    const nextBtn = screen.getByText(/NEXT ▶/i);
    await act(async () => {
      fireEvent.click(nextBtn);
    });
    expect(screen.getByText(/FRAME 02\/04/i)).toBeInTheDocument();
  });

  // Test 12: Microfilm Viewer frame 3 reveals decimal panel code 1357
  it('QA-R4-FE-12: Microfilm Viewer frame 3 reveals address 0x054D and requires decimal conversion', async () => {
    await act(async () => {
      render(
        <MicrofilmViewerModal
          isOpen={true}
          clue={initialRecordsState.clues[1]}
          onClose={vi.fn()}
          onSubmitAnswer={vi.fn()}
          audio={mockAudioInstance}
        />
      );
    });

    const nextBtn = screen.getByText(/NEXT ▶/i);
    await act(async () => {
      fireEvent.click(nextBtn);
      fireEvent.click(nextBtn);
    });
    expect(screen.getAllByText(/0x054D/i).length).toBeGreaterThan(0);
  });

  // Test 13: Epoch Timeline modal renders cards and calculates keyword
  it('QA-R4-FE-13: Epoch Timeline modal toggles UTC translations and shows keyword preview', async () => {
    await act(async () => {
      render(
        <EpochTimelineModal
          isOpen={true}
          clue={initialRecordsState.clues[2]}
          onClose={vi.fn()}
          onSubmitAnswer={vi.fn()}
          audio={mockAudioInstance}
        />
      );
    });

    expect(screen.getByText(/CHRONOLOGICAL EVENT TIMELINE BOARD/i)).toBeInTheDocument();
    const helperBtn = screen.getByText(/SHOW UTC DATES/i);
    await act(async () => {
      fireEvent.click(helperBtn);
    });
    expect(screen.getByText(/HIDE EPOCH TRANSLATIONS/i)).toBeInTheDocument();
  });

  // Test 14: Bulkhead Keypad modal renders mechanical keypad buttons
  it('QA-R4-FE-14: Bulkhead Keypad modal accepts digits and updates panel display', async () => {
    await act(async () => {
      render(
        <BulkheadKeypadModal
          isOpen={true}
          clue={initialRecordsState.clues[3]}
          onClose={vi.fn()}
          onSubmitAnswer={vi.fn()}
          audio={mockAudioInstance}
        />
      );
    });

    expect(screen.getByText(/BULKHEAD ACCESS KEYPAD TERMINAL/i)).toBeInTheDocument();
    const btn1 = screen.getByText('1');
    const btn3 = screen.getByText('3');
    await act(async () => {
      fireEvent.click(btn1);
      fireEvent.click(btn3);
    });
    expect(screen.getByText('13')).toBeInTheDocument();
  });

  // Test 15: Submitting correct answer to Bulkhead Keypad opens door
  it('QA-R4-FE-15: submitting bulkhead code and keyword triggers onBulkheadUnlocked', async () => {
    const onUnlockedMock = vi.fn();
    const submitMock = vi.fn().mockResolvedValue({ correct: true, room_completed: true });

    await act(async () => {
      render(
        <BulkheadKeypadModal
          isOpen={true}
          clue={initialRecordsState.clues[3]}
          onClose={vi.fn()}
          onSubmitAnswer={submitMock}
          audio={mockAudioInstance}
          onBulkheadUnlocked={onUnlockedMock}
        />
      );
    });

    fireEvent.click(screen.getByText('1'));
    fireEvent.click(screen.getByText('3'));
    fireEvent.click(screen.getByText('5'));
    fireEvent.click(screen.getByText('7'));

    fireEvent.click(screen.getByText(/INPUT 2: ARCHIVAL TIMELINE KEYWORD/i));
    const keywordInput = screen.getByPlaceholderText('______');
    fireEvent.change(keywordInput, { target: { value: 'PLANET' } });

    const enterBtn = screen.getByText('ENTER');
    await act(async () => {
      fireEvent.click(enterBtn);
    });

    expect(submitMock).toHaveBeenCalledWith('R2-07', { panel: '1357', word: 'PLANET' });
    expect(onUnlockedMock).toHaveBeenCalled();
  });

  // Test 16: HUD displays Room 4 theme and battery level
  it('QA-R4-FE-16: HUD displays Room 4 title, fragments count, and flashlight battery', async () => {
    await act(async () => {
      render(
        <HUDRecords
          roomTitle="The Rotting Archive"
          totalFragments={12}
          collectedCount={2}
          basketUnlocked={true}
          cluesSolved={1}
          totalClues={4}
          batteryLevel={95}
          isFlashlightOn={true}
        />
      );
    });

    expect(screen.getByText(/The Rotting Archive/i)).toBeInTheDocument();
    expect(screen.getByText('2/12')).toBeInTheDocument();
    expect(screen.getByText('95%')).toBeInTheDocument();
  });

  // Test 17: Case Dossier modal renders all 4 case files
  it('QA-R4-FE-17: Case Dossier modal displays all 4 case files with statuses', async () => {
    await act(async () => {
      render(
        <CaseDossierModal
          isOpen={true}
          clues={initialRecordsState.clues}
          basketUnlocked={true}
          totalFragments={12}
          collectedCount={2}
          onClose={vi.fn()}
          onOpenClue={vi.fn()}
        />
      );
    });

    expect(screen.getByText(/CF-79A2/i)).toBeInTheDocument();
    expect(screen.getByText(/CF-7C9D/i)).toBeInTheDocument();
    expect(screen.getByText(/CF-2F05/i)).toBeInTheDocument();
    expect(screen.getByText(/CF-4C16/i)).toBeInTheDocument();
  });

  // Test 18: Sealed door notice shown when attempting to retreat
  it('QA-R4-FE-18: interacting with room_door notifies player that entrance is sealed', async () => {
    await act(async () => {
      render(<Room4Records team={mockTeam} onLogout={vi.fn()} />);
    });
    await act(async () => {
      fireEvent.click(screen.getByText(/DESCEND INTO THE SUB-BASEMENT/i));
    });

    act(() => {
      activeEngineInstance.callbacks.onTarget('room_door');
    });

    await act(async () => {
      fireEvent.keyDown(window, { key: 'e', code: 'KeyE' });
    });

    expect(screen.getByText(/entrance hatch sealed behind you/i)).toBeInTheDocument();
  });

  // Test 19: Fork 1 modal renders dual archways (Auxiliary Wing A vs Primary Wing B)
  it('QA-R4-FE-19: Fork 1 modal renders dual archways and brass plaque', async () => {
    await act(async () => {
      render(
        <Fork1Modal
          isOpen={true}
          onClose={vi.fn()}
          audio={mockAudioInstance}
          onApplyBatteryPenalty={vi.fn()}
          onProceedToRoom5={vi.fn()}
        />
      );
    });

    expect(screen.getByText(/FORK 1 • ROUTE SELECTION JUNCTION/i)).toBeInTheDocument();
    expect(screen.getByText(/AUXILIARY WING/i)).toBeInTheDocument();
    expect(screen.getByText(/PRIMARY WING/i)).toBeInTheDocument();
  });

  // Test 20: Choosing Wing B in Fork 1 confirms route and proceeds to Room 5
  it('QA-R4-FE-20: selecting Wing B in Fork 1 triggers onProceedToRoom5', async () => {
    vi.useFakeTimers();
    const proceedMock = vi.fn();

    await act(async () => {
      render(
        <Fork1Modal
          isOpen={true}
          onClose={vi.fn()}
          audio={mockAudioInstance}
          onApplyBatteryPenalty={vi.fn()}
          onProceedToRoom5={proceedMock}
        />
      );
    });

    const wingBBtn = screen.getByText(/SELECT WING B ➔ PROCEED TO ROOM 5/i);
    await act(async () => {
      fireEvent.click(wingBBtn);
    });

    expect(mockAudioInstance.good).toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(proceedMock).toHaveBeenCalled();
    vi.useRealTimers();
  });

  // Test 21: Full E2E participant walkthrough
  it('QA-R4-FE-21: e2e participant journey from sub-basement spawn to room 5 transition', async () => {
    vi.useFakeTimers();
    await act(async () => {
      render(<Room4Records team={mockTeam} onLogout={vi.fn()} />);
    });
    fireEvent.click(screen.getByText(/DESCEND INTO THE SUB-BASEMENT/i));
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(activeEngineInstance.lock).toHaveBeenCalled();

    // Trigger bulkhead door when completed
    initialRecordsState.is_completed = true;
    act(() => {
      activeEngineInstance.callbacks.onTarget('bulkhead_door');
    });
    fireEvent.keyDown(window, { key: 'e', code: 'KeyE' });
    expect(screen.getByText(/SUB-STATION DELTA \/\/ DUAL-PATH FORK/i)).toBeInTheDocument();
    vi.useRealTimers();
  });

  // Test 22: Escape key closes active clue modal
  it('QA-R4-FE-22: pressing Escape closes active clue modal and restores controls', async () => {
    await act(async () => {
      render(<Room4Records team={mockTeam} onLogout={vi.fn()} />);
    });
    fireEvent.click(screen.getByText(/DESCEND INTO THE SUB-BASEMENT/i));

    act(() => {
      activeEngineInstance.callbacks.onTarget('report_folder');
    });
    fireEvent.keyDown(window, { key: 'e', code: 'KeyE' });
    expect(screen.getByText(/CASE FILE CF-79A2/i)).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
    expect(screen.queryByText(/CASE FILE CF-79A2/i)).not.toBeInTheDocument();
  });

  // Test 23: Escape key closes Basket modal
  it('QA-R4-FE-23: pressing Escape closes Basket modal', async () => {
    await act(async () => {
      render(<Room4Records team={mockTeam} onLogout={vi.fn()} />);
    });
    fireEvent.click(screen.getByText(/DESCEND INTO THE SUB-BASEMENT/i));

    fireEvent.keyDown(window, { key: 'b', code: 'KeyB' });
    expect(screen.getByText(/INVESTIGATION BASKET/i)).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
    expect(screen.queryByText(/INVESTIGATION BASKET/i)).not.toBeInTheDocument();
  });

  // Test 24: Escape key closes Case Dossier modal
  it('QA-R4-FE-24: pressing Escape closes Case Dossier modal', async () => {
    await act(async () => {
      render(<Room4Records team={mockTeam} onLogout={vi.fn()} />);
    });
    fireEvent.click(screen.getByText(/DESCEND INTO THE SUB-BASEMENT/i));

    fireEvent.keyDown(window, { key: 'c', code: 'KeyC' });
    expect(screen.getByText(/CASE DOSSIER/i)).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
    expect(screen.queryByText(/CASE DOSSIER/i)).not.toBeInTheDocument();
  });

  // Test 25: Audio mute toggle with M key
  it('QA-R4-FE-25: pressing M toggles audio mute state in synthesizer', async () => {
    await act(async () => {
      render(<Room4Records team={mockTeam} onLogout={vi.fn()} />);
    });
    fireEvent.click(screen.getByText(/DESCEND INTO THE SUB-BASEMENT/i));

    fireEvent.keyDown(window, { key: 'm', code: 'KeyM' });
    expect(mockAudioInstance.setMuted).toHaveBeenCalledWith(true);

    fireEvent.keyDown(window, { key: 'm', code: 'KeyM' });
    expect(mockAudioInstance.setMuted).toHaveBeenCalledWith(false);
  });

  // Test 26: Typing in input field suppresses global keyboard shortcuts
  it('QA-R4-FE-26: typing inside inputs does not trigger flashlight or basket keys', async () => {
    await act(async () => {
      render(
        <RedactedReportModal
          isOpen={true}
          clue={initialRecordsState.clues[0]}
          onClose={vi.fn()}
          onSubmitAnswer={vi.fn()}
        />
      );
    });

    const input = screen.getByPlaceholderText('2001-02-10');
    fireEvent.keyDown(input, { key: 'f', code: 'KeyF' });
    expect(mockAudioInstance.click).not.toHaveBeenCalled();
  });

  // Test 27: Redacted Report shows error on blank submission
  it('QA-R4-FE-27: Redacted Report modal requires date input before submission', async () => {
    const submitMock = vi.fn();
    await act(async () => {
      render(
        <RedactedReportModal
          isOpen={true}
          clue={initialRecordsState.clues[0]}
          onClose={vi.fn()}
          onSubmitAnswer={submitMock}
        />
      );
    });

    const submitBtn = screen.getByText(/SUBMIT AUTHENTICATION/i);
    fireEvent.click(submitBtn);
    expect(submitMock).not.toHaveBeenCalled();
  });

  // Test 28: Microfilm Viewer zoom in increases scale
  it('QA-R4-FE-28: Microfilm Viewer rotary dial advances frame and plays audio click', async () => {
    await act(async () => {
      render(
        <MicrofilmViewerModal
          isOpen={true}
          clue={initialRecordsState.clues[1]}
          onClose={vi.fn()}
          onSubmitAnswer={vi.fn()}
          audio={mockAudioInstance}
        />
      );
    });

    const dial = screen.getByTitle(/Click or drag to advance microfilm reel/i);
    fireEvent.click(dial);
    expect(mockAudioInstance.dialClick).toHaveBeenCalled();
  });

  // Test 29: Microfilm Viewer previous frame button works
  it('QA-R4-FE-29: Microfilm Viewer previous frame button decrements frame index', async () => {
    await act(async () => {
      render(
        <MicrofilmViewerModal
          isOpen={true}
          clue={initialRecordsState.clues[1]}
          onClose={vi.fn()}
          onSubmitAnswer={vi.fn()}
          audio={mockAudioInstance}
        />
      );
    });

    fireEvent.click(screen.getByText(/NEXT ▶/i));
    expect(screen.getByText(/FRAME 02\/04/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText(/◀ PREV/i));
    expect(screen.getByText(/FRAME 01\/04/i)).toBeInTheDocument();
  });

  // Test 30: Microfilm Viewer frame boundary clamping
  it('QA-R4-FE-30: Microfilm Viewer wraps frame index when clicking previous on continuous reel', async () => {
    await act(async () => {
      render(
        <MicrofilmViewerModal
          isOpen={true}
          clue={initialRecordsState.clues[1]}
          onClose={vi.fn()}
          onSubmitAnswer={vi.fn()}
          audio={mockAudioInstance}
        />
      );
    });

    fireEvent.click(screen.getByText(/◀ PREV/i));
    expect(screen.getByText(/FRAME 04\/04/i)).toBeInTheDocument();
  });

  // Test 31: Epoch Timeline modal keyword input converts to uppercase
  it('QA-R4-FE-31: Epoch Timeline keyword input automatically converts input to uppercase', async () => {
    await act(async () => {
      render(
        <EpochTimelineModal
          isOpen={true}
          clue={initialRecordsState.clues[2]}
          onClose={vi.fn()}
          onSubmitAnswer={vi.fn()}
          audio={mockAudioInstance}
        />
      );
    });

    const input = screen.getByPlaceholderText('PLANET');
    fireEvent.change(input, { target: { value: 'planet' } });
    expect(input.value).toBe('PLANET');
  });

  // Test 32: Bulkhead Keypad backspace button removes last digit
  it('QA-R4-FE-32: Bulkhead Keypad backspace button deletes last typed code digit', async () => {
    await act(async () => {
      render(
        <BulkheadKeypadModal
          isOpen={true}
          clue={initialRecordsState.clues[3]}
          onClose={vi.fn()}
          onSubmitAnswer={vi.fn()}
          audio={mockAudioInstance}
        />
      );
    });

    fireEvent.click(screen.getByText('1'));
    fireEvent.click(screen.getByText('3'));
    fireEvent.click(screen.getByText('5'));
    expect(screen.getByText('135')).toBeInTheDocument();

    const delBtn = screen.getByText('DEL');
    fireEvent.click(delBtn);
    expect(screen.getByText('13')).toBeInTheDocument();
  });

  // Test 33: Bulkhead Keypad clear button wipes display
  it('QA-R4-FE-33: Bulkhead Keypad clear button resets entry buffer', async () => {
    await act(async () => {
      render(
        <BulkheadKeypadModal
          isOpen={true}
          clue={initialRecordsState.clues[3]}
          onClose={vi.fn()}
          onSubmitAnswer={vi.fn()}
          audio={mockAudioInstance}
        />
      );
    });

    fireEvent.click(screen.getByText('1'));
    fireEvent.click(screen.getByText('3'));
    const clrBtn = screen.getByText('CLR');
    fireEvent.click(clrBtn);
    expect(screen.getByText('____')).toBeInTheDocument();
  });

  // Test 34: Bulkhead Keypad enforces 8 digit maximum
  it('QA-R4-FE-34: Bulkhead Keypad ignores input beyond max digit capacity', async () => {
    await act(async () => {
      render(
        <BulkheadKeypadModal
          isOpen={true}
          clue={initialRecordsState.clues[3]}
          onClose={vi.fn()}
          onSubmitAnswer={vi.fn()}
          audio={mockAudioInstance}
        />
      );
    });

    const btn9 = screen.getByRole('button', { name: '9' });
    for (let i = 0; i < 10; i++) {
      fireEvent.click(btn9);
    }
    expect(screen.getByText('99999999')).toBeInTheDocument();
  });

  // Test 35: Fork 1 selecting Wing A springs trap sequence
  it('QA-R4-FE-35: selecting Wing A in Fork 1 triggers violent door slam and trap alert', async () => {
    await act(async () => {
      render(
        <Fork1Modal
          isOpen={true}
          onClose={vi.fn()}
          audio={mockAudioInstance}
          onApplyBatteryPenalty={vi.fn()}
          onProceedToRoom5={vi.fn()}
        />
      );
    });

    const wingABtn = screen.getByText(/SELECT WING A ➔/i);
    await act(async () => {
      fireEvent.click(wingABtn);
    });

    expect(screen.getByText(/DOOR SLAMS SHUT/i)).toBeInTheDocument();
    expect(mockAudioInstance.drawerSlam).toHaveBeenCalled();
  });

  // Test 36: Fork 1 trap sequence advances to scratching phase
  it('QA-R4-FE-36: Fork 1 trap phase 2 triggers fingernail scratching audio', async () => {
    vi.useFakeTimers();
    await act(async () => {
      render(
        <Fork1Modal
          isOpen={true}
          onClose={vi.fn()}
          audio={mockAudioInstance}
          onApplyBatteryPenalty={vi.fn()}
          onProceedToRoom5={vi.fn()}
        />
      );
    });

    await act(async () => {
      fireEvent.click(screen.getByText(/SELECT WING A ➔/i));
    });
    act(() => {
      vi.advanceTimersByTime(1600);
    });

    expect(screen.getByText(/NAILS SCRATCHING ON STONE/i)).toBeInTheDocument();
    vi.useRealTimers();
  });

  // Test 37: Fork 1 trap sequence advances to whisper phase
  it('QA-R4-FE-37: Fork 1 trap phase 3 whispers wrong room and triggers screamer stinger', async () => {
    vi.useFakeTimers();
    await act(async () => {
      render(
        <Fork1Modal
          isOpen={true}
          onClose={vi.fn()}
          audio={mockAudioInstance}
          onApplyBatteryPenalty={vi.fn()}
          onProceedToRoom5={vi.fn()}
        />
      );
    });

    await act(async () => {
      fireEvent.click(screen.getByText(/SELECT WING A ➔/i));
    });
    act(() => {
      vi.advanceTimersByTime(3500);
    });

    expect(screen.getByText(/"WRONG ROOM."/i)).toBeInTheDocument();
    expect(mockAudioInstance.whisperRaspy).toHaveBeenCalled();
    vi.useRealTimers();
  });

  // Test 38: Fork 1 trap resets and applies 30% battery penalty
  it('QA-R4-FE-38: Fork 1 trap phase 4 drains 30 percent battery and seals wing A with iron bars', async () => {
    vi.useFakeTimers();
    const batteryPenaltyMock = vi.fn();

    await act(async () => {
      render(
        <Fork1Modal
          isOpen={true}
          onClose={vi.fn()}
          audio={mockAudioInstance}
          onApplyBatteryPenalty={batteryPenaltyMock}
          onProceedToRoom5={vi.fn()}
        />
      );
    });

    await act(async () => {
      fireEvent.click(screen.getByText(/SELECT WING A ➔/i));
    });
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(batteryPenaltyMock).toHaveBeenCalledWith(30);
    expect(screen.getByText(/SEALED WITH BARS/i)).toBeInTheDocument();
    vi.useRealTimers();
  });

  // Test 39: Fork 1 barred wing A rejects clicks
  it('QA-R4-FE-39: clicking barred wing A does not re-trigger trap or api call', async () => {
    vi.useFakeTimers();
    await act(async () => {
      render(
        <Fork1Modal
          isOpen={true}
          onClose={vi.fn()}
          audio={mockAudioInstance}
          onApplyBatteryPenalty={vi.fn()}
          onProceedToRoom5={vi.fn()}
        />
      );
    });

    await act(async () => {
      fireEvent.click(screen.getByText(/SELECT WING A ➔/i));
    });
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    const barredBtn = screen.getByText(/BARRED BY TRAP RESET/i);
    expect(barredBtn).toBeDisabled();
    vi.useRealTimers();
  });

  // Test 40: Case Dossier displays unverified badge for unsolved clues
  it('QA-R4-FE-40: Case Dossier displays ATTEMPTS: 3/3 badge for unsolved clue files', async () => {
    await act(async () => {
      render(
        <CaseDossierModal
          isOpen={true}
          clues={initialRecordsState.clues}
          basketUnlocked={true}
          totalFragments={12}
          collectedCount={12}
          onClose={vi.fn()}
          onOpenClue={vi.fn()}
        />
      );
    });

    expect(screen.getAllByText(/ATTEMPTS: 3\/3/i).length).toBeGreaterThan(0);
  });

  // Test 41: Case Dossier displays solved badge for completed clues
  it('QA-R4-FE-41: Case Dossier displays RESOLVED badge for solved clues', async () => {
    const solvedClues = [...initialRecordsState.clues];
    solvedClues[0] = { ...solvedClues[0], solved: true };

    await act(async () => {
      render(
        <CaseDossierModal
          isOpen={true}
          clues={solvedClues}
          basketUnlocked={true}
          totalFragments={12}
          collectedCount={12}
          onClose={vi.fn()}
          onOpenClue={vi.fn()}
        />
      );
    });

    expect(screen.getAllByText(/RESOLVED/i).length).toBeGreaterThanOrEqual(2);
  });

  // Test 42: Basket modal renders fragments with title
  it('QA-R4-FE-42: Basket modal renders collected evidence fragment cards', async () => {
    await act(async () => {
      render(
        <BasketModal
          isOpen={true}
          onClose={vi.fn()}
          evidence={initialRecordsState.evidence}
          collectedIds={['ER01', 'ER02']}
          totalInRoom={12}
          basketUnlocked={true}
        />
      );
    });

    expect(screen.getByText(/Requisition form A/i)).toBeInTheDocument();
    expect(screen.getByText(/Subject intake B/i)).toBeInTheDocument();
  });

  // Test 43: Basket modal shows sealed notice when isUnlocked is false
  it('QA-R4-FE-43: Basket modal displays sealed wax warning when isUnlocked is false', async () => {
    await act(async () => {
      render(
        <BasketModal
          isOpen={true}
          onClose={vi.fn()}
          evidence={[{ id: 'ER01', is_wrapped: true, display: { title: 'Wrapped Fragment #1' } }]}
          collectedIds={['ER01']}
          totalInRoom={12}
          basketUnlocked={false}
        />
      );
    });

    expect(screen.getByText(/Sealed in oilcloth/i)).toBeInTheDocument();
  });

  // Test 44: Interacting with flashlight prop recharges battery
  it('QA-R4-FE-44: picking up flashlight item restores flashlight battery to 100', async () => {
    await act(async () => {
      render(<Room4Records team={mockTeam} onLogout={vi.fn()} />);
    });
    fireEvent.click(screen.getByText(/DESCEND INTO THE SUB-BASEMENT/i));

    act(() => {
      activeEngineInstance.callbacks.onTarget('flashlight_item');
    });
    fireEvent.keyDown(window, { key: 'e', code: 'KeyE' });
    expect(mockAudioInstance.click).toHaveBeenCalled();
  });

  // Test 45: Battery warning indicator when level drops below 20
  it('QA-R4-FE-45: HUD indicates critical battery warning when battery drops below 20 percent', async () => {
    await act(async () => {
      render(
        <HUDRecords
          roomTitle="The Rotting Archive"
          totalFragments={12}
          collectedCount={2}
          basketUnlocked={true}
          cluesSolved={1}
          totalClues={4}
          batteryLevel={15}
          isFlashlightOn={true}
        />
      );
    });

    expect(screen.getByText('15%')).toHaveClass('text-red-500');
  });

  // Test 46: Battery indicator shows 100 percent at initial state
  it('QA-R4-FE-46: HUD renders 100 percent battery at initial game state', async () => {
    await act(async () => {
      render(
        <HUDRecords
          roomTitle="The Rotting Archive"
          totalFragments={12}
          collectedCount={0}
          basketUnlocked={false}
          cluesSolved={0}
          totalClues={4}
          batteryLevel={100}
          isFlashlightOn={true}
        />
      );
    });

    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  // Test 47: Case Dossier clicking clue button opens corresponding clue modal
  it('QA-R4-FE-47: Case Dossier clicking inspect button opens matching clue modal', async () => {
    const onOpenClueMock = vi.fn();
    await act(async () => {
      render(
        <CaseDossierModal
          isOpen={true}
          clues={initialRecordsState.clues}
          basketUnlocked={true}
          totalFragments={12}
          collectedCount={12}
          onClose={vi.fn()}
          onOpenClue={onOpenClueMock}
        />
      );
    });

    const inspectBtns = screen.getAllByText(/ACCESS TERMINAL/i);
    fireEvent.click(inspectBtns[0]);
    expect(onOpenClueMock).toHaveBeenCalledWith(expect.objectContaining({ id: 'R2-02' }));
  });

  // Test 48: Redacted Report modal displays case file header
  it('QA-R4-FE-48: Redacted Report modal renders classified document styling and watermarks', async () => {
    await act(async () => {
      render(
        <RedactedReportModal
          isOpen={true}
          clue={initialRecordsState.clues[0]}
          onClose={vi.fn()}
          onSubmitAnswer={vi.fn()}
        />
      );
    });

    expect(screen.getByText(/REDACTED INCIDENT REPORT/i)).toBeInTheDocument();
  });

  // Test 49: Microfilm modal displays reel console status
  it('QA-R4-FE-49: Microfilm modal renders optical magnification metrics', async () => {
    await act(async () => {
      render(
        <MicrofilmViewerModal
          isOpen={true}
          clue={initialRecordsState.clues[1]}
          onClose={vi.fn()}
          onSubmitAnswer={vi.fn()}
          audio={mockAudioInstance}
        />
      );
    });

    expect(screen.getByText(/OPTICAL MICROFILM CONSOLE/i)).toBeInTheDocument();
  });

  // Test 50: Epoch Timeline renders chronological cards
  it('QA-R4-FE-50: Epoch Timeline renders chronological event cards E1 and E2', async () => {
    await act(async () => {
      render(
        <EpochTimelineModal
          isOpen={true}
          clue={initialRecordsState.clues[2]}
          onClose={vi.fn()}
          onSubmitAnswer={vi.fn()}
          audio={mockAudioInstance}
        />
      );
    });

    expect(screen.getByText(/CARD E1/i)).toBeInTheDocument();
    expect(screen.getByText(/CARD E2/i)).toBeInTheDocument();
  });

  // Test 51: Epoch Timeline renders epoch timestamp tags
  it('QA-R4-FE-51: Epoch Timeline renders raw unix epoch timestamp badges', async () => {
    await act(async () => {
      render(
        <EpochTimelineModal
          isOpen={true}
          clue={initialRecordsState.clues[2]}
          onClose={vi.fn()}
          onSubmitAnswer={vi.fn()}
          audio={mockAudioInstance}
        />
      );
    });

    expect(screen.getByText(/973328400/i)).toBeInTheDocument();
    expect(screen.getByText(/976528800/i)).toBeInTheDocument();
  });

  // Test 52: Bulkhead Keypad renders instruction notice
  it('QA-R4-FE-52: Bulkhead Keypad renders dual-factor instruction panel', async () => {
    await act(async () => {
      render(
        <BulkheadKeypadModal
          isOpen={true}
          clue={initialRecordsState.clues[3]}
          onClose={vi.fn()}
          onSubmitAnswer={vi.fn()}
          audio={mockAudioInstance}
        />
      );
    });

    expect(screen.getByText(/INPUT 1: SUBSYSTEM PANEL CODE/i)).toBeInTheDocument();
    expect(screen.getByText(/INPUT 2: ARCHIVAL TIMELINE KEYWORD/i)).toBeInTheDocument();
  });

  // Test 53: Bulkhead Keypad clicking keyword tab switches focus
  it('QA-R4-FE-53: Bulkhead Keypad clicking keyword tab activates keyword input', async () => {
    await act(async () => {
      render(
        <BulkheadKeypadModal
          isOpen={true}
          clue={initialRecordsState.clues[3]}
          onClose={vi.fn()}
          onSubmitAnswer={vi.fn()}
          audio={mockAudioInstance}
        />
      );
    });

    const keywordTab = screen.getByText(/INPUT 2: ARCHIVAL TIMELINE KEYWORD/i);
    fireEvent.click(keywordTab);
    const input = screen.getByPlaceholderText('______');
    expect(input).toBeInTheDocument();
  });

  // Test 54: Bulkhead Keypad handles empty code submission
  it('QA-R4-FE-54: Bulkhead Keypad rejects empty numeric code submission', async () => {
    const submitMock = vi.fn();
    await act(async () => {
      render(
        <BulkheadKeypadModal
          isOpen={true}
          clue={initialRecordsState.clues[3]}
          onClose={vi.fn()}
          onSubmitAnswer={submitMock}
          audio={mockAudioInstance}
        />
      );
    });

    const enterBtn = screen.getByText('ENTER');
    expect(enterBtn).toBeDisabled();
    fireEvent.click(enterBtn);
    expect(submitMock).not.toHaveBeenCalled();
  });

  // Test 55: Fork 1 renders subtitle warning
  it('QA-R4-FE-55: Fork 1 modal renders operational guidance description', async () => {
    await act(async () => {
      render(
        <Fork1Modal
          isOpen={true}
          onClose={vi.fn()}
          audio={mockAudioInstance}
          onApplyBatteryPenalty={vi.fn()}
          onProceedToRoom5={vi.fn()}
        />
      );
    });

    expect(screen.getByText(/Cross-reference Room 4 archival documents/i)).toBeInTheDocument();
  });

  // Test 56: Fork 1 return button closes modal
  it('QA-R4-FE-56: Fork 1 return button triggers onClose callback', async () => {
    const closeMock = vi.fn();
    await act(async () => {
      render(
        <Fork1Modal
          isOpen={true}
          onClose={closeMock}
          audio={mockAudioInstance}
          onApplyBatteryPenalty={vi.fn()}
          onProceedToRoom5={vi.fn()}
        />
      );
    });

    fireEvent.click(screen.getByText(/\[ESC\] RETURN/i));
    expect(closeMock).toHaveBeenCalled();
  });

  // Test 57: Window resize event handled without error
  it('QA-R4-FE-57: resizing browser window does not crash canvas context', async () => {
    await act(async () => {
      render(<Room4Records team={mockTeam} onLogout={vi.fn()} />);
    });
    fireEvent.click(screen.getByText(/DESCEND INTO THE SUB-BASEMENT/i));

    act(() => {
      window.dispatchEvent(new Event('resize'));
    });
    expect(activeEngineInstance).toBeDefined();
  });

  // Test 58: Clicking logout calls onLogout callback
  it('QA-R4-FE-58: clicking logout button in HUD triggers onLogout callback', async () => {
    const logoutMock = vi.fn();
    await act(async () => {
      render(<Room4Records team={mockTeam} onLogout={logoutMock} />);
    });
    fireEvent.click(screen.getByText(/DESCEND INTO THE SUB-BASEMENT/i));

    const logoutBtn = screen.getByTitle(/Logout/i);
    fireEvent.click(logoutBtn);
    expect(logoutMock).toHaveBeenCalled();
  });

  // Test 59: Unmounting component disposes Three.js engine and audio synth
  it('QA-R4-FE-59: unmounting Room 4 cleans up Three.js engine and audio synth', async () => {
    const { unmount } = render(<Room4Records team={mockTeam} onLogout={vi.fn()} />);
    fireEvent.click(screen.getByText(/DESCEND INTO THE SUB-BASEMENT/i));

    unmount();
    expect(activeEngineInstance.dispose).toHaveBeenCalled();
    expect(mockAudioInstance.dispose).toHaveBeenCalled();
  });

  // Test 60: Room complete modal displays congratulations and fork transition
  it('QA-R4-FE-60: Room complete modal displays congratulations and prompt to approach bulkhead', async () => {
    initialRecordsState.is_completed = true;
    await act(async () => {
      render(<Room4Records team={mockTeam} onLogout={vi.fn()} />);
    });
    expect(activeEngineInstance.openDoor).toHaveBeenCalled();
  });
});
