import React, { useEffect, useRef, useState } from 'react';
import { createEngine } from './engine/engine.js';
import studyConfig from './rooms/study.js';
import { StudyAudio } from './engine/studyAudio.js';
import {isStudyLowDetail,studyQualityUrl,rememberStudyQuality} from './engine/studyPerformance.js';
import HUD from './components/study/StudyHUD.jsx';
import BasketModal from './components/study/StudyEvidenceTable.jsx';
import CaseFilesModal from './components/study/StudyCaseFiles.jsx';
import {studyObjective} from './components/study/studyGuide.js';
import PhotoPuzzleModal from './components/PhotoPuzzleModal.jsx';
import TabletPasscodeModal from './components/study/TabletPasscodeModal.jsx';
import CrtEmailModal from './components/study/CrtEmailModal.jsx';
import CrashDumpModal from './components/study/CrashDumpModal.jsx';
import LinePrinterModal from './components/study/LinePrinterModal.jsx';
import StudyCompleteModal from './components/study/StudyCompleteModal.jsx';
import Round1DossierModal from './components/Round1DossierModal.jsx';
import HintModal from './components/study/StudyHints.jsx';
import './game.css';
import './study.css';

export default function Room2Study({
  team,
  onLogout,
  onTransitionToRoom1,
  onTransitionToRoom3
}) {
  const mountRef = useRef(null);
  const engineRef = useRef(null);
  const audioRef = useRef(null);
  const roomDataRef = useRef(null);
  const handleInteractRef = useRef(null);
  const activeTargetRef = useRef(null);

  const stateRef = useRef({ paused: true, started: false, modal: null });
  const mountedRef = useRef(false);
  const notificationTimerRef = useRef(null);
  const searchBusyRef = useRef(false);

  // Game state
  const [roomData, setRoomData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isStarted, setIsStarted] = useState(false);
  const [isBasketOpen, setIsBasketOpen] = useState(false);
  const [isCaseFilesOpen, setIsCaseFilesOpen] = useState(false);
  const [isPhotoPuzzleOpen, setIsPhotoPuzzleOpen] = useState(false);
  const [isDossierOpen, setIsDossierOpen] = useState(false);
  const [isHintOpen, setIsHintOpen] = useState(false);
  const [isStudyCompleteModalOpen, setIsStudyCompleteModalOpen] = useState(false);
  const [activeClueModal, setActiveClueModal] = useState(null); // 'R1-05' | 'R1-06' | 'R1-07' | 'R1-08'
  const [activeHoverPrompt, setActiveHoverPrompt] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [systemNotification, setSystemNotification] = useState(null);
  const [audioMuted, setAudioMuted] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [assetProgress, setAssetProgress] = useState(null);
  const [audioPreparing,setAudioPreparing]=useState(false);
  const [isExitScarePlaying, setIsExitScarePlaying] = useState(false);
  const [cinematic,setCinematic]=useState(null);
  const cinematicLocked=Boolean(cinematic?.locked);
  const [lowDetail]=useState(isStudyLowDetail);
  const assetsPending = audioPreparing || Boolean(assetProgress && assetProgress.loaded + assetProgress.failed < assetProgress.total);
  const isAnyModalOpen = Boolean(activeClueModal || isBasketOpen || isCaseFilesOpen ||
    isPhotoPuzzleOpen || isStudyCompleteModalOpen || isDossierOpen || isHintOpen);
  stateRef.current = {
    started: isStarted,
    paused: !isStarted || loading || Boolean(loadError) || isAnyModalOpen || isSubmitting || isExitScarePlaying || cinematicLocked,
    cinematic:cinematicLocked,
    modal: cinematicLocked?'cinematic':isExitScarePlaying ? 'finale' : activeClueModal ? 'clue' : isBasketOpen ? 'b' : isCaseFilesOpen ? 'c' :
      isPhotoPuzzleOpen ? 'p' : isDossierOpen ? 'r' : isHintOpen ? 'h' :
      isStudyCompleteModalOpen ? 'complete' : null
  };
  useEffect(() => {
    engineRef.current?.setStudyState?.({ started: isStarted, paused: stateRef.current.paused, ...(cinematicLocked?{cinematic:true}:{}), ...(isExitScarePlaying ? {exitScare:true} : {}) });
  }, [isStarted, loading, loadError, isAnyModalOpen, isSubmitting, isExitScarePlaying,cinematicLocked]);

  const pauseForModal = () => {
    stateRef.current.paused = true;
    engineRef.current?.setStudyState?.({ started: true, paused: true });
    engineRef.current?.unlock();
  };

  // Fetch initial room data from backend
  const fetchRoomState = async () => {
    try {
      const res = await fetch('/api/game/room/study', {
        credentials: 'include',
        headers: {
          'x-session-token': localStorage.getItem('ctc_token') || ''
        }
      });
      if (!res.ok) {
        throw new Error(res.status === 401 ? 'Your session has expired. Sign in again to continue.' :
          res.status === 403 ? 'The Study is locked. Complete the previous room before entering.' :
          'The Study could not connect to the server. Please try again.');
      }
      if (res.ok) {
        const data = await res.json();
        if (!mountedRef.current) return;
        setLoadError(null);
        setRoomData(data);
        roomDataRef.current = data;
        engineRef.current?.setStudyProgress?.({basketUnlocked: Boolean(data.basket_unlocked), completed: Boolean(data.is_completed), collected: data.collected_fragment_ids?.length || 0, total: data.total_fragments_in_room || 16, clues: data.clues?.map(c => ({id: c.id, is_locked: c.is_locked}))});

        // If room is completed, animate blast door open
        if (data.is_completed && engineRef.current) {
          engineRef.current.openDoor?.();
        }
      }
    } catch (err) {
      if (mountedRef.current) setLoadError(err.message || 'The Study could not connect to the server. Please try again.');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  // Global keyboard shortcuts (E, B, C, P)
  useEffect(() => {
    const handleGlobalKey = (e) => {
      const tag = (e.target?.tagName || document.activeElement?.tagName || '').toUpperCase();
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable) {
        return;
      }

      if (e.repeat || !stateRef.current.started || !roomDataRef.current) return;
      const key = (e.key || '').toLowerCase() || e.code?.replace('Key', '').toLowerCase();
      if(stateRef.current.cinematic){
        if(key==='q')engineRef.current?.standUpStudy?.();
        if(key!=='escape'){e.preventDefault();e.stopImmediatePropagation();}return;
      }
      if(key==='escape' && stateRef.current.modal && !['b','finale'].includes(stateRef.current.modal)) {
        const close={c:setIsCaseFilesOpen,h:setIsHintOpen,p:setIsPhotoPuzzleOpen,r:setIsDossierOpen,clue:setActiveClueModal,complete:setIsStudyCompleteModalOpen};
        close[stateRef.current.modal]?.(stateRef.current.modal==='clue'?null:false);
        e.preventDefault();e.stopImmediatePropagation();engineRef.current?.lock();return;
      }
      if (key === 'e') {
        if (stateRef.current.paused || !activeTargetRef.current) return;
        e.preventDefault();
        // The engine also listens on window: stop this key being dispatched twice.
        e.stopImmediatePropagation();
        handleInteractRef.current?.(activeTargetRef.current);
        return;
      }
      const setters = { b: setIsBasketOpen, c: setIsCaseFilesOpen,
        p: setIsPhotoPuzzleOpen, r: setIsDossierOpen, h: setIsHintOpen };
      if (!setters[key]) return;
      if (stateRef.current.paused && stateRef.current.modal !== key) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (stateRef.current.modal === key) {
        setters[key](false);
        engineRef.current?.lock();
      } else {
        pauseForModal();
        setters[key](true);
      }
    };

    window.addEventListener('keydown', handleGlobalKey, true);
    return () => window.removeEventListener('keydown', handleGlobalKey, true);
  }, []);

  // Notification helper
  const showNotification = (msg) => {
    if (!mountedRef.current) return;
    clearTimeout(notificationTimerRef.current);
    setSystemNotification(msg);
    notificationTimerRef.current = setTimeout(() => {
      setSystemNotification((curr) => (curr === msg ? null : curr));
    }, 4500);
  };

  // Main interaction handler
  const handleInteract = async (objectId) => {
    if (stateRef.current.paused || searchBusyRef.current) return;
    const currentData = roomDataRef.current;
    if (!currentData) return;

    if (objectId === 'study_door_back') {
      const held=engineRef.current?.canLeaveStudy?.();if(held?.blocked){showNotification(held.message);return;}
      onTransitionToRoom1?.();
      return;
    }

    // 2. Check if this is the Basement Exit Door
    if (objectId === 'study_door_exit' || objectId === 'exit_door') {
      if (currentData?.is_completed) {
        const held=engineRef.current?.tryStudyExit?.();if(held?.blocked){if(held.message)showNotification(held.message);return;}
        if (onTransitionToRoom3) {
          onTransitionToRoom3();
        } else {
          setIsStudyCompleteModalOpen(true);
          pauseForModal();
        }
      } else {
        const objective=studyObjective(currentData);
        const resolvedCount = currentData?.clues?.filter((c) => c.solved || c.exhausted || (c.attempts_max !== null && c.attempts >= (c.attempts_max ?? 3)))?.length || 0;
        showNotification(
          `The Basement needs four resolved case files (${resolvedCount}/4 resolved). ${objective.title}. ${objective.detail} A case is resolved when solved or its attempts are exhausted.`
        );
      }
      return;
    }

    if (objectId === 'tablet_drawer' || objectId === 'desk') {
      engineRef.current?.notifyStudyEvent?.({ type: 'inspect', objectId });
    }

    // 3. Search for evidence fragment
    let searchResult = null;
    searchBusyRef.current = true;
    try {
      const res = await fetch('/api/game/room/study/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': localStorage.getItem('ctc_token') || ''
        },
        credentials: 'include',
        body: JSON.stringify({ object_id: objectId })
      });

      if (res.ok) {
        searchResult = await res.json();
        if (!mountedRef.current) return;
        if (searchResult?.message && (searchResult.found || !currentData.clues?.some(c=>c.object_id===objectId))) {
          showNotification(searchResult.message);
        }
        if (searchResult.found) {
          engineRef.current?.notifyStudyEvent?.({ type: 'fragment', objectId });
          await fetchRoomState();
          return;
        }
      }
    } catch (err) {
      showNotification('The search could not be completed. Please try again.');
      return;
    } finally {
      searchBusyRef.current = false;
    }
    if (!mountedRef.current || stateRef.current.paused) return;

    // 4. Check if this is a clue entry prop
    const matchingClue = currentData?.clues?.find((c) => c.object_id === objectId);
    if (matchingClue) {
      if (!currentData?.basket_unlocked) {
        showNotification(
          "Arcane seal unbroken: Recover all 16 study fragments to inspect this clue terminal."
        );
        return;
      }
      if (matchingClue.is_locked) {
        showNotification(
          `This case follows an earlier file. ${studyObjective(currentData).title}. Open Case Files (C) to see the sequence.`
        );
        return;
      }
      pauseForModal();
      engineRef.current?.notifyStudyEvent?.({ type: 'clue', objectId });
      setActiveClueModal(matchingClue.id);
    }
  };
  handleInteractRef.current = handleInteract;

  // Submit Clue Answer
  const handleClueSubmit = async (clueId, answer) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/game/clue/${clueId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': localStorage.getItem('ctc_token') || ''
        },
        credentials: 'include',
        body: JSON.stringify({ answer })
      });

      if (res.ok) {
        const data = await res.json();
        await fetchRoomState();

        // Check if this submission completed the room
        if (data.room_completed || data.is_completed) {
          setActiveClueModal(null);
          engineRef.current?.openDoor?.();
          audioRef.current?.slam?.(0, -3);
          setIsStudyCompleteModalOpen(true);
        }

        return data;
      } else {
        const errData = await res.json().catch(() => ({}));
        return {
          correct: false,
          message: typeof errData.detail === 'string' ? errData.detail : errData.detail?.message || 'Submission failed'
        };
      }
    } catch (err) {
      console.error('Study submission failed:', err);
      return { correct: false, message: 'Server communication error' };
    } finally {
      setIsSubmitting(false);
    }
  };

  // Initialize Three.js Engine and Audio
  useEffect(() => {
    mountedRef.current = true;
    fetchRoomState();

    if (!mountRef.current) return;

    const audio = new StudyAudio();
    audioRef.current = audio;
    const preparation=audio.prepare?.();
    if(preparation){setAudioPreparing(true);preparation.catch(()=>{}).finally(()=>{if(mountedRef.current)setAudioPreparing(false);});}

    const engine = createEngine(mountRef.current, studyConfig, {
      audio: audioRef.current,
      isPaused: () => stateRef.current.paused,
      studyStorageKey: 'ctc.study.horror.v2.' + (team?.id || team?.name || 'local'),
      onStudyFinale: (active) => { if (mountedRef.current) setIsExitScarePlaying(active); },
      onStudyCinematic: (event) => {if(mountedRef.current)setCinematic(event);},
      onStudyAssets: (progress) => {
        if (mountedRef.current) setAssetProgress(progress);
      },
      onInteract: (targetId) => {
        handleInteractRef.current?.(targetId);
      },
      onTarget: (targetId) => {
        activeTargetRef.current = targetId;
        if (!targetId) {
          setActiveHoverPrompt(null);
          return;
        }

        const data = roomDataRef.current;
        if (targetId === 'study_door_back') {
          setActiveHoverPrompt("Return to Lena's Bedroom [E]");
          return;
        }
        if (targetId === 'study_door_exit' || targetId === 'exit_door') {
          if (data?.is_completed) {
            setActiveHoverPrompt('Step into Subterranean Bunker / Enter Room 3 [E]');
          } else {
            setActiveHoverPrompt('Basement Blast Door [Deadbolted]');
          }
          return;
        }

        const interactInfo = studyConfig.interact?.[targetId];
        if (interactInfo) {
          setActiveHoverPrompt(`${interactInfo.label} [E]`);
        } else {
          setActiveHoverPrompt(`Inspect ${targetId} [E]`);
        }
      }
    });

    engineRef.current = engine;
    engine.setStudyState?.({ started: stateRef.current.started, paused: stateRef.current.paused });

    return () => {
      mountedRef.current = false;
      clearTimeout(notificationTimerRef.current);
      engineRef.current = null;
      engine.dispose();
      audio.dispose();
    };
  }, []);

  const handleStartGame = () => {
    if (loading || assetsPending || loadError || !roomDataRef.current) return;
    setIsStarted(true);
    audioRef.current?.start?.({
      crtHum: true,
      typewriter: true,
      whisperCooldown: 35
    });
    engineRef.current?.lock();
  };

  const toggleAudio = () => {
    if (!audioRef.current) return;
    const next = !audioMuted;
    setAudioMuted(next);
    audioRef.current.setMuted(next);
  };

  const activeClueObj = roomData?.clues?.find((c) => c.id === activeClueModal);

  // Clues count calculations
  const cluesList = roomData?.clues || [];
  const cluesSolvedCount = cluesList.filter((c) => c.solved).length;
  const totalCluesCount = cluesList.length || 4;

  return (
    <div className={`study-room ${isExitScarePlaying ? 'study-room--finale' : ''} ${cinematicLocked?'study-room--cinematic':''} relative w-full h-screen overflow-hidden bg-[#04120b] select-none`}>
      
      {/* 3D Canvas Mount Point */}
      <div 
        ref={mountRef} 
        onClick={() => {
          if (isStarted && engineRef.current && !isAnyModalOpen&&!cinematicLocked) {
            engineRef.current.lock();
          }
        }}
        className="absolute inset-0 w-full h-full cursor-crosshair" 
      />

      {/* 6% Scanline Overlay */}
      <div 
        data-testid="scanline-overlay"
        className="pointer-events-none fixed inset-0 z-40 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] opacity-[0.06]" 
      />

      <div className="study-room__vignette" aria-hidden="true" />
      {cinematicLocked&&cinematic?.caption&&<div className="study-room__cinematic-caption" role="status">
        <p>{cinematic.caption}</p>
        {cinematic.phase==='prone'&&<button onClick={()=>engineRef.current?.standUpStudy?.()}>Stand up <kbd>Q</kbd></button>}
      </div>}

      {(!isStarted || loadError) && (
        <section className="study-room__intro" aria-label="Enter Daniel's Study">
          <div className="study-room__chapter" aria-hidden="true">II</div>
          <div className="study-room__intro-content">
            <p className="study-room__eyebrow"><span /> CURSE THE CODE / ROOM 02</p>
            <p className="study-room__chapter-label">THE INVESTIGATION CONTINUES</p>
            <h1>DANIEL'S<br /><em>STUDY</em></h1>
            <div className="study-room__rule" />
            <p className="study-room__description">The screen is still warm.<br />Someone left in a hurry.</p>
            <p className="study-room__brief">Follow the field notes to recover sixteen sealed fragments. Open your Basket to read them, then resolve four case files in order to unlock the Basement.</p>
            <div className="study-room__objectives">
              <span><b>16</b> EVIDENCE FRAGMENTS</span>
              <span><b>04</b> CASE FILES</span>
            </div>
            {loadError ? (
              <div className="study-room__error" role="alert">
                <p>{loadError}</p>
                <button onClick={() => { setLoading(true); setLoadError(null); fetchRoomState(); }} disabled={loading}>Try again</button>
                <button onClick={onLogout}>Return to sign in</button>
              </div>
            ) : (
              <button onClick={handleStartGame} disabled={loading || assetsPending} className="study-room__enter">
                <span>{loading ? 'CONNECTING TO THE STUDY' : assetsPending ? 'PREPARING THE STUDY' : 'CLICK TO ENTER ROOM'}</span><span aria-hidden="true">&rarr;</span>
              </button>
            )}
            <p className="study-room__asset-status" role="status">
              {assetProgress && assetProgress.loaded + assetProgress.failed < assetProgress.total
                ? `Preparing the room / ${assetProgress.loaded} / ${assetProgress.total}`
                : 'Headphones recommended / Contains sudden sounds and horror imagery'}
            </p>
            <nav className="study-room__quality" aria-label="Visual detail">
              <span>Visual detail</span>
              <a href={studyQualityUrl(false)} onClick={()=>rememberStudyQuality(false)} aria-current={!lowDetail?'true':undefined}>Balanced</a>
              <a href={studyQualityUrl(true)} onClick={()=>rememberStudyQuality(true)} aria-current={lowDetail?'true':undefined}>Low (older PCs)</a>
            </nav>
          </div>
          <footer className="study-room__intro-footer">
            <span>WASD <i>MOVE</i> &nbsp; MOUSE <i>LOOK</i> &nbsp; E <i>INSPECT</i> &nbsp; F <i>TORCH</i></span>
            <span>THE TURING CLUB <span aria-hidden="true">/</span> FIELD INVESTIGATION</span>
          </footer>
        </section>
      )}

      {/* In-Game HUD */}
      {isStarted && (
        <div className="study-room__hud"><HUD
          objective={studyObjective(roomData||{})}
          roomTitle={roomData?.title || "Daniel's Study"}
          collectedCount={roomData?.collected_fragment_ids?.length || 0}
          totalFragments={roomData?.total_fragments_in_room || 16}
          photoCount={roomData?.photo_pieces_collected || (roomData?.photo_piece_ids?.length || 0)}
          cluesSolved={cluesSolvedCount}
          totalClues={totalCluesCount}
          basketUnlocked={Boolean(roomData?.basket_unlocked)}
          isRoomCompleted={Boolean(roomData?.is_completed)}
          completedMessage="ROOM 2 COMPLETE • BLAST DOOR TO ROOM 3 UNLATCHED"
          team={team}
          onOpenBasket={() => {
            setIsBasketOpen(true);
            pauseForModal();
          }}
          onOpenCaseFiles={() => {
            setIsCaseFilesOpen(true);
            pauseForModal();
          }}
          onOpenPhotoPuzzle={() => {
            setIsPhotoPuzzleOpen(true);
            pauseForModal();
          }}
          onOpenRules={() => {
            setIsDossierOpen(true);
            pauseForModal();
          }}
          onOpenHints={() => {
            setIsHintOpen(true);
            pauseForModal();
          }}
          onLogout={onLogout}
          audioMuted={audioMuted}
          onToggleAudio={toggleAudio}
          activeHoverPrompt={isAnyModalOpen ? null : activeHoverPrompt}
        /></div>
      )}

      {/* System Toast Notifications */}
      {systemNotification && (
        <div role="status" className="study-room__notification">
          {systemNotification}
        </div>
      )}

      {/* Modals use a room-scoped gothic shell. */}
      <div className="study-modal-theme">
      <BasketModal
        isOpen={isBasketOpen}
        onClose={() => {
          setIsBasketOpen(false);
          engineRef.current?.lock();
        }}
        onOpenCaseFiles={()=>{setIsBasketOpen(false);setIsCaseFilesOpen(true);pauseForModal();}}
        evidence={roomData?.evidence || []}
        collectedIds={roomData?.collected_fragment_ids || []}
        basketUnlocked={Boolean(roomData?.basket_unlocked)}
        totalInRoom={roomData?.total_fragments_in_room || 16}
        roomTitle={roomData?.title || "Daniel's Study"}
      />

      <CaseFilesModal
        isOpen={isCaseFilesOpen}
        onClose={() => {
          setIsCaseFilesOpen(false);
          engineRef.current?.lock();
        }}
        collectedCount={roomData?.collected_fragment_ids?.length||0}
        totalFragments={roomData?.total_fragments_in_room||16}
        clues={roomData?.clues || []}
        basketUnlocked={Boolean(roomData?.basket_unlocked)}
        onOpenClue={(clue) => {
          setIsCaseFilesOpen(false);
          if (!roomData?.basket_unlocked) {
            showNotification("Arcane seal unbroken: Recover all 16 study fragments to inspect this clue terminal.");
            return;
          }
          if (clue.is_locked) {
            showNotification(
              `This case follows an earlier file. ${studyObjective(roomData).title}. Open Case Files (C) to see the sequence.`
            );
            return;
          }
          pauseForModal();
          engineRef.current?.notifyStudyEvent?.({ type: 'clue', objectId: clue.object_id });
          setActiveClueModal(clue.id);
        }}
      />

      <PhotoPuzzleModal
        isOpen={isPhotoPuzzleOpen}
        onClose={() => {
          setIsPhotoPuzzleOpen(false);
          engineRef.current?.lock();
        }}
        photoCount={roomData?.photo_pieces_collected || (roomData?.photo_piece_ids?.length || 0)}
        requiredPieces={10}
      />

      {/* Clue Modals */}
      {activeClueModal === 'R1-05' && (
        <TabletPasscodeModal
          isOpen={true}
          onClose={() => {
            setActiveClueModal(null);
            engineRef.current?.lock();
          }}
          clue={activeClueObj}
          evidence={roomData?.evidence || []}
          onSubmitAnswer={handleClueSubmit}
          isSubmitting={isSubmitting}
        />
      )}

      {activeClueModal === 'R1-06' && (
        <CrtEmailModal
          isOpen={true}
          onClose={() => {
            setActiveClueModal(null);
            engineRef.current?.lock();
          }}
          clue={activeClueObj}
          evidence={roomData?.evidence || []}
          onSubmitAnswer={handleClueSubmit}
          isSubmitting={isSubmitting}
        />
      )}

      {activeClueModal === 'R1-07' && (
        <CrashDumpModal
          isOpen={true}
          onClose={() => {
            setActiveClueModal(null);
            engineRef.current?.lock();
          }}
          clue={activeClueObj}
          evidence={roomData?.evidence || []}
          onSubmitAnswer={handleClueSubmit}
          isSubmitting={isSubmitting}
        />
      )}

      {activeClueModal === 'R1-08' && (
        <LinePrinterModal
          isOpen={true}
          onClose={() => {
            setActiveClueModal(null);
            engineRef.current?.lock();
          }}
          clue={activeClueObj}
          evidence={roomData?.evidence || []}
          onSubmitAnswer={handleClueSubmit}
          isSubmitting={isSubmitting}
        />
      )}

      {/* Study Complete Celebration Modal */}
      <StudyCompleteModal
        isOpen={isStudyCompleteModalOpen}
        onClose={() => {
          setIsStudyCompleteModalOpen(false);
          engineRef.current?.lock();
        }}
        solvedCount={roomData?.clues?.filter((c) => c.solved)?.length || 0}
        photoCount={roomData?.photo_pieces_collected || (roomData?.photo_piece_ids?.length || 0)}
        onProceedToDoor={() => {
          setIsStudyCompleteModalOpen(false);
          engineRef.current?.lock();
          showNotification("Head to the unbolted blast door at the north wall to enter Room 3 (The Basement).");
        }}
      />

      <Round1DossierModal
        isOpen={isDossierOpen}
        onClose={() => {
          setIsDossierOpen(false);
          engineRef.current?.lock();
        }}
      />
      <HintModal
        isOpen={isHintOpen}
        onClose={() => {
          setIsHintOpen(false);
          engineRef.current?.lock();
        }}
        roomData={roomData}
      />
      </div>
    </div>
  );
}
