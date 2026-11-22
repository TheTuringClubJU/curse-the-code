import React, { useEffect, useState } from 'react';
import {
  Book,
  BookOpen,
  Crosshair,
  Flashlight,
  FlashlightOff,
  HelpCircle,
  Lock,
  LogOut,
  Monitor,
  MousePointer2,
  SlidersHorizontal,
  Unlock,
  Volume2,
  VolumeX,
} from 'lucide-react';

const KeyCap = ({ children }) => (
  <span
    className="inline-flex items-center justify-center px-2 py-0.5 rounded-full font-sans text-[10px] font-bold tracking-wide text-white"
    style={{
      background: 'rgba(255, 255, 255, 0.12)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
    }}
  >
    {children}
  </span>
);

function getRoomZone(x, z) {
  if (x > 10.5 && z > 5.8) return { code: '6E', name: 'QUARANTINE CELLAR' };
  if (x < -10.0 && z < -5.8) return { code: '6F', name: 'RELIQUARY CHAPEL' };
  if (x < -8.2) return { code: '6C', name: 'WEST SCRIPTORIUM' };
  if (x > 8.2) return { code: '6D', name: 'EAST SWITCHGEAR' };
  if (z > 7.4) return { code: '6A', name: 'NARTHEX ENTRANCE' };
  return { code: '6B', name: 'CENTRAL NAVE' };
}

function getRiddleObjective(clues, cluesSolved, totalClues) {
  const list = Array.isArray(clues) ? clues : [];
  const r08 = list.find((c) => c.id === 'R2-08')?.solved;
  const r09 = list.find((c) => c.id === 'R2-09')?.solved;
  const r10 = list.find((c) => c.id === 'R2-10')?.solved;

  if (r10 || cluesSolved >= totalClues) {
    return 'The flesh is bound, the silence restored. The vault sleeps once more.';
  }
  if (r08 && r09) {
    return 'Twin veins thrum in silence. Approach the consecrated Altar before the vessel to speak the tri-fold rite.';
  }
  if (r08 && !r09) {
    return 'The ancient ink is purified. Cross the nave to the eastern breach, where cold iron levers await the sacred spark.';
  }
  if (!r08 && r09) {
    return 'The lightning courseth through the crypt. Cross to the western scriptorium to decipher what was severed in the sacred script.';
  }
  return 'Two dormant veins nourish the slumbering Altar: one bound in cold ink in the western shadows, one sleeping in iron in the eastern crypt.';
}

export default function HUDVault({
  team,
  clues = [],
  cluesSolved = 0,
  totalClues = 3,
  activeHoverPrompt = '',
  isPointerLocked = false,
  sensitivity = 1.0,
  onChangeSensitivity,
  muted = false,
  onToggleMute,
  qualityMode = 'med',
  onChangeQuality,
  onSelectQuality,
  fpsCap = 60,
  onChangeFpsCap,
  flashlightOn = true,
  onToggleFlashlight,
  onToggleDossier,
  onToggleRules,
  onToggleHint,
  onRequestLock,
  onLogout,
  isSystemOpen,
  onToggleSystem,
  getPlayerPos,
  threatState = null,
}) {
  const [localSystemOpen, setLocalSystemOpen] = useState(false);
  const [systemTab, setSystemTab] = useState('resolution');
  const [pose, setPose] = useState({ x: 0, z: 13.8, yaw: 0 });
  const sysOpen = isSystemOpen !== undefined ? isSystemOpen : localSystemOpen;
  const toggleSystem = () => {
    if (onToggleSystem) onToggleSystem();
    else setLocalSystemOpen((v) => !v);
  };

  useEffect(() => {
    const id = setInterval(() => {
      const p = getPlayerPos ? getPlayerPos() : typeof window !== 'undefined' ? window.__vaultPose : null;
      if (p) setPose(p);
    }, 160);
    return () => clearInterval(id);
  }, [getPlayerPos]);

  const list = Array.isArray(clues) ? clues : [];
  const r08Solved = Boolean(list.find((c) => c.id === 'R2-08')?.solved);
  const r09Solved = Boolean(list.find((c) => c.id === 'R2-09')?.solved);
  const r10Solved = Boolean(list.find((c) => c.id === 'R2-10')?.solved);

  const zoneInfo = getRoomZone(pose.x, pose.z);
  const riddleLine = getRiddleObjective(clues, cluesSolved, totalClues);
  const resLabel = qualityMode === 'high' ? 'HIGH' : qualityMode === 'low' ? 'LOW' : 'MED';
  const promptBody = activeHoverPrompt ? activeHoverPrompt.replace(/^\[E\]\s*/i, '') : '';

  // Convert 3D world coords (-18..18, -12..17) into clean SVG blueprint coords (152x104)
  const mapX = Math.max(8, Math.min(144, ((pose.x + 18) / 36) * 140 + 6));
  const mapZ = Math.max(8, Math.min(96, ((pose.z + 12) / 29) * 88 + 8));

  const triggerTorchToggle = () => {
    if (onToggleFlashlight) onToggleFlashlight();
    else window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyF' }));
  };

  return (
    <div className="fixed inset-0 z-30 pointer-events-none select-none flex flex-col justify-between p-3 sm:p-5 text-white">
      {/* ── Top Edge Bar (Room 5 Translucent Smoke-Fade Strip + Rounded White-Text Pills) ── */}
      <div className="flex items-start justify-between gap-4">
        {/* Top-Left: Gothic smoke-fade objective strip */}
        <div
          className="pointer-events-auto pr-8 pl-4 py-2.5 rounded-r-2xl max-w-xl"
          style={{
            background: 'linear-gradient(90deg, rgba(12, 10, 10, 0.86) 0%, rgba(12, 10, 10, 0.48) 78%, transparent 100%)',
            borderLeft: '2px solid rgba(185, 28, 28, 0.85)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.55)',
          }}
          aria-label="Vault Mission Objective"
        >
          <div className="flex flex-wrap items-center gap-2 text-[10.5px] font-mono tracking-[0.14em] uppercase text-white/70">
            <span>ROUND 2 · ST. JUDE VAULT</span>
            <span className="text-white/35">/</span>
            <span className="font-bold text-white font-re-display">The Anointing Vault</span>
            <span className="px-2.5 py-0.5 rounded-full border border-white/20 bg-white/10 text-[9.5px] font-semibold tracking-wider text-white">
              Sector {zoneInfo.code} · {zoneInfo.name}
            </span>
            {threatState?.label && (
              <span className="px-2.5 py-0.5 rounded-full border border-red-400/50 bg-red-950/75 text-[9.5px] font-semibold tracking-wider text-red-100 animate-pulse">
                {threatState.label}
              </span>
            )}
          </div>

          <div className="mt-1 text-xs text-white/90 font-sans flex items-center gap-2">
            <span className="text-[#e7cf9e] text-xs">✦</span>
            <span>{riddleLine}</span>
          </div>

          <div className="mt-2 pt-1.5 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-[10px] font-mono tracking-[0.12em] uppercase">
              {[
                { code: '6C WEST', done: r08Solved },
                { code: '6D EAST', done: r09Solved },
                { code: '6B ALTAR', done: r10Solved },
              ].map((step) => (
                <span
                  key={step.code}
                  className={`inline-flex items-center gap-1.5 ${step.done ? 'text-emerald-300' : 'text-white/70'
                    }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full border ${step.done
                      ? 'bg-emerald-400 border-emerald-200'
                      : 'bg-[#2a1216] border-[#b91c1c]/80'
                      }`}
                  />
                  <span>{step.code}</span>
                </span>
              ))}
            </div>

            <span className="font-mono text-[11px] font-bold tracking-[0.14em] text-white">
              {cluesSolved}/{totalClues}
            </span>
          </div>
        </div>

        {/* Top-Right: Clean Rounded Pill Buttons in Crisp White Text Matching Room 5 */}
        <div className="pointer-events-auto flex flex-col items-end gap-2">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={onToggleDossier}
              className="re-btn cursor-pointer"
              title="Case Dossier [C]"
            >
              <span className="re-btn-circle">C</span>
              <BookOpen className="w-3.5 h-3.5 text-white/90" />
              <span>Dossier</span>
            </button>

            {onToggleRules && (
              <button
                type="button"
                onClick={onToggleRules}
                className="re-btn cursor-pointer"
                title="Investigation Rules [R]"
              >
                <span className="re-btn-circle">R</span>
                <Book className="w-3.5 h-3.5 text-white/90" />
                <span>Rules</span>
              </button>
            )}

            <button
              type="button"
              onClick={onToggleHint}
              className="re-btn cursor-pointer"
              title="Field Guidance [H]"
            >
              <span className="re-btn-circle">H</span>
              <HelpCircle className="w-3.5 h-3.5 text-white/90" />
              <span>Guidance</span>
            </button>

            {(onChangeQuality || onSelectQuality) && (
              <button
                type="button"
                onClick={() => {
                  setSystemTab('resolution');
                  if (!sysOpen) toggleSystem();
                  else onChangeQuality?.();
                }}
                className="re-btn cursor-pointer"
                title="Resolution & FPS Settings [TAB]"
              >
                <Monitor className="w-3.5 h-3.5 text-white/90" />
                <span>RES: {resLabel} · {fpsCap}FPS</span>
              </button>
            )}
            <button
              type="button"
              onClick={onToggleMute}
              className="re-btn cursor-pointer"
              title={muted ? 'Unmute Audio [M]' : 'Mute Audio [M]'}
            >
              <span className="re-btn-circle">M</span>
              {muted ? <VolumeX className="w-3.5 h-3.5 text-red-300" /> : <Volume2 className="w-3.5 h-3.5 text-white/90" />}
            </button>

            <button
              type="button"
              onClick={toggleSystem}
              aria-expanded={sysOpen}
              className={`re-btn cursor-pointer ${sysOpen ? 'brightness-125' : ''}`}
              title="Field System Menu [TAB]"
            >
              <span className="re-btn-circle">TAB</span>
              <SlidersHorizontal className="w-3.5 h-3.5 text-white/90" />
              <span>System</span>
            </button>
          </div>

          {/* Field System Drawer ([TAB]) with Resolution & Controls Tabs */}
          {sysOpen && (
            <div
              className="w-80 bg-[#0c0a0a]/95 border border-white/15 rounded-2xl p-4 space-y-3 shadow-[0_20px_50px_rgba(0,0,0,0.92)] text-white"
              role="region"
              aria-label="Field System Menu"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-2 text-[10px] font-mono tracking-[0.18em] uppercase text-white/80">
                <span>FIELD SYSTEM OPTIONS</span>
                {team?.name && <span className="text-white/60 truncate max-w-[110px]">{team.name}</span>}
              </div>

              {/* Tab Switcher: Resolution vs Controls */}
              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-white/5 border border-white/10 text-[10px] font-mono uppercase tracking-[0.14em]" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={systemTab === 'resolution'}
                  onClick={() => setSystemTab('resolution')}
                  className={`py-1.5 rounded-lg transition cursor-pointer ${systemTab === 'resolution'
                    ? 'bg-[#b91c1c]/80 text-white font-bold shadow-sm'
                    : 'text-white/65 hover:text-white'
                    }`}
                >
                  Resolution
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={systemTab === 'controls'}
                  onClick={() => setSystemTab('controls')}
                  className={`py-1.5 rounded-lg transition cursor-pointer ${systemTab === 'controls'
                    ? 'bg-[#b91c1c]/80 text-white font-bold shadow-sm'
                    : 'text-white/65 hover:text-white'
                    }`}
                >
                  Controls
                </button>
              </div>

              {systemTab === 'resolution' ? (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.14em] text-white/75">
                      <span>Render Resolution</span>
                      <span className="text-white font-semibold">{resLabel}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { id: 'low', label: 'LOW', sub: '72%' },
                        { id: 'med', label: 'MED', sub: '100%' },
                        { id: 'high', label: 'HIGH', sub: '140%' },
                      ].map((opt) => {
                        const active = qualityMode === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              if (onSelectQuality) onSelectQuality(opt.id);
                              else onChangeQuality?.();
                            }}
                            className={`flex flex-col items-center py-1.5 px-2 rounded-lg border text-[10px] font-mono transition cursor-pointer ${active
                              ? 'bg-white/15 border-emerald-400/70 text-white font-bold'
                              : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                              }`}
                          >
                            <span>{opt.label}</span>
                            <span className="text-[9px] text-white/55">{opt.sub}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-1.5 border-t border-white/10 pt-2.5">
                    <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.14em] text-white/75">
                      <span>Frame Rate Cap</span>
                      <span className="text-emerald-300 font-semibold">{fpsCap} FPS</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { val: 30, label: '30 FPS', sub: 'Smooth / Low-End' },
                        { val: 60, label: '60 FPS', sub: 'High Spec' },
                      ].map((opt) => {
                        const active = Number(fpsCap) === opt.val;
                        return (
                          <button
                            key={opt.val}
                            type="button"
                            onClick={() => onChangeFpsCap?.(opt.val)}
                            className={`flex flex-col items-center py-1.5 px-2 rounded-lg border text-[10px] font-mono transition cursor-pointer ${active
                              ? 'bg-white/15 border-emerald-400/70 text-white font-bold'
                              : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                              }`}
                          >
                            <span>{opt.label}</span>
                            <span className="text-[9px] text-white/55">{opt.sub}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={onRequestLock}
                    className="re-btn w-full justify-between cursor-pointer"
                    title="Capture Aim Reticle [G]"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      {isPointerLocked ? (
                        <Lock className="w-3.5 h-3.5 text-emerald-300" />
                      ) : (
                        <Unlock className="w-3.5 h-3.5 text-white/90" />
                      )}
                      <span>{isPointerLocked ? 'Cursor Captured' : 'Capture Aim'}</span>
                    </span>
                    <span className="re-btn-circle">G</span>
                  </button>

                  <div className="space-y-1 border-t border-white/10 pt-2">
                    <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.14em] text-white/75">
                      <span>Mouse Sensitivity</span>
                      <span className="text-white">{Number(sensitivity).toFixed(1)}×</span>
                    </div>
                    <input
                      type="range"
                      min="0.4"
                      max="2.2"
                      step="0.1"
                      value={sensitivity}
                      onChange={(e) => onChangeSensitivity?.(parseFloat(e.target.value))}
                      aria-label="Mouse Sensitivity"
                      className="w-full accent-white cursor-pointer"
                    />
                  </div>
                </div>
              )}

              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="re-btn w-full justify-center !border-red-500/40 text-white hover:bg-red-950/60 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 text-red-300" />
                  <span>Log Out</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Center Reticle & Room 5 RE2R White Circular E Prompt ── */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center z-40">
        {!activeHoverPrompt && (
          <div className="relative flex items-center justify-center">
            <div
              className="rounded-full transition-all duration-150"
              style={{
                width: isPointerLocked ? '18px' : '14px',
                height: isPointerLocked ? '18px' : '14px',
                border: isPointerLocked
                  ? '1px solid rgba(255, 255, 255, 0.34)'
                  : '1px solid rgba(255, 255, 255, 0.2)',
              }}
            />
            <div
              className="absolute rounded-full"
              style={{
                width: '4px',
                height: '4px',
                background: isPointerLocked ? 'rgba(255, 255, 255, 0.94)' : 'rgba(255, 255, 255, 0.6)',
                boxShadow: '0 0 6px rgba(0, 0, 0, 0.95)',
              }}
            />
          </div>
        )}

        {activeHoverPrompt && (
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-2.5">
              {/* Circular white button badge matching Room 5 prompt */}
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center font-sans font-bold text-xs shadow-lg"
                style={{
                  background: '#f5f4f0',
                  color: '#111213',
                  boxShadow: '0 2px 10px rgba(0, 0, 0, 0.85)',
                }}
              >
                <span className="sr-only">[</span>E<span className="sr-only">] </span>
              </div>
              {/* Borderless translucent dark smoke gradient label with crisp white text */}
              <div
                className="pl-3 pr-8 py-1 rounded-full text-xs sm:text-sm font-sans font-medium tracking-wide text-white"
                style={{
                  background: 'linear-gradient(90deg, rgba(14, 12, 12, 0.84) 0%, rgba(14, 12, 12, 0.36) 76%, transparent 100%)',
                  textShadow: '0 1px 4px rgba(0, 0, 0, 0.95)',
                }}
              >
                {promptBody || activeHoverPrompt}
              </div>
            </div>
            {!isPointerLocked && (
              <span
                className="text-[10px] font-sans tracking-wider text-white/85 px-2.5 py-0.5 rounded-full"
                style={{ textShadow: '0 1px 4px rgba(0, 0, 0, 0.95)' }}
              >
                Right-Click or [E]
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Bottom Edge (Minimap Bottom-Left, Room 5 White-Text Rounded Capsule Dock Bottom-Center) ── */}
      <div className="flex items-end justify-between gap-4">
        <div
          className="pointer-events-auto hidden sm:block bg-[#0c0a0a]/92 border border-white/15 rounded-xl p-2.5 shadow-[0_14px_34px_rgba(0,0,0,0.78)]"
          aria-label="Vault Orthogonal Floor Blueprint"
        >
          <div className="flex items-center justify-between text-[9px] font-mono uppercase tracking-[0.16em] text-white/70 mb-1 px-0.5">
            <span>PLAN // SUB-06</span>
            <span className="text-white font-semibold">{zoneInfo.code}</span>
          </div>
          <svg width="152" height="104" viewBox="0 0 152 104" className="block bg-[#050404] rounded-lg border border-white/10">
            <rect x="14" y="8" width="22" height="16" rx="2" fill="#13161e" stroke="#475569" strokeWidth="1" />
            <text x="25" y="18" textAnchor="middle" fontSize="6" fill="#94a3b8" fontFamily="monospace">6F</text>

            <rect
              x="10"
              y="26"
              width="30"
              height="42"
              rx="2"
              fill={r08Solved ? '#0c261d' : '#18131a'}
              stroke={r08Solved ? '#10b981' : '#b91c1c'}
              strokeWidth="1.1"
            />
            <text x="25" y="49" textAnchor="middle" fontSize="7" fill="#f8fafc" fontFamily="monospace">6C</text>

            <rect
              x="44"
              y="16"
              width="64"
              height="56"
              rx="3"
              fill={r10Solved ? '#0c261d' : '#11141c'}
              stroke={r10Solved ? '#10b981' : '#64748b'}
              strokeWidth="1.1"
            />
            <text x="76" y="44" textAnchor="middle" fontSize="7" fill="#f8fafc" fontFamily="monospace">6B</text>

            <rect
              x="112"
              y="26"
              width="30"
              height="42"
              rx="2"
              fill={r09Solved ? '#0c261d' : '#1a1510'}
              stroke={r09Solved ? '#10b981' : '#d97706'}
              strokeWidth="1.1"
            />
            <text x="127" y="49" textAnchor="middle" fontSize="7" fill="#f8fafc" fontFamily="monospace">6D</text>

            <rect x="114" y="70" width="22" height="18" rx="2" fill="#13161e" stroke="#475569" strokeWidth="1" />
            <text x="125" y="81" textAnchor="middle" fontSize="6" fill="#94a3b8" fontFamily="monospace">6E</text>

            <rect x="64" y="74" width="24" height="24" rx="2" fill="#13161e" stroke="#64748b" strokeWidth="1" />
            <text x="76" y="88" textAnchor="middle" fontSize="6.5" fill="#cbd5e1" fontFamily="monospace">6A</text>

            <line x1="40" y1="47" x2="44" y2="47" stroke="#e2e8f0" strokeWidth="1.5" />
            <line x1="108" y1="47" x2="112" y2="47" stroke="#e2e8f0" strokeWidth="1.5" />
            <line x1="76" y1="72" x2="76" y2="74" stroke="#e2e8f0" strokeWidth="2" />

            <circle cx={mapX} cy={mapZ} r="3" fill="#f8fafc" stroke="#b91c1c" strokeWidth="1.2" />
          </svg>
        </div>

        {/* Single Sleek Rounded Capsule Dock Matching Room 5 White Text & Pill Buttons */}
        <div className="flex-1 flex items-center justify-center pb-1">
          <div
            className="pointer-events-auto flex flex-wrap items-center justify-center gap-x-3.5 gap-y-1.5 px-5 py-2 rounded-full text-[11px] font-sans text-white"
            style={{
              background: 'rgba(14, 12, 12, 0.92)',
              border: '1px solid rgba(255, 255, 255, 0.16)',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.72)',
            }}
          >
            {isPointerLocked ? (
              <button
                type="button"
                onClick={onRequestLock}
                className="inline-flex items-center gap-1.5 text-white font-medium pr-2.5 border-r border-white/15 cursor-pointer hover:text-white/80"
                title="Release Cursor [ESC / G]"
              >
                <Crosshair className="w-3 h-3 text-emerald-400" />
                <span>FPS Aim</span>
                <KeyCap>ESC</KeyCap>
                <span className="text-white/75">Cursor</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onRequestLock}
                className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full cursor-pointer transition hover:brightness-115 text-white font-semibold mr-1"
                style={{
                  background: 'rgba(120, 28, 28, 0.82)',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                }}
                title="Lock mouse for full 360 first-person view [G]"
              >
                <MousePointer2 className="w-3 h-3" />
                <span>Click to Lock Aim</span>
              </button>
            )}

            <span className="hidden md:inline-flex items-center gap-1.5">
              <KeyCap>WASD</KeyCap>
              <span className="text-white/85">Move</span>
            </span>
            <span className="hidden md:inline-flex items-center gap-1.5">
              <KeyCap>{isPointerLocked ? 'MOUSE' : 'LMB'}</KeyCap>
              <span className="text-white/85">Look 360°</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <KeyCap>E / RMB</KeyCap>
              <span className="text-white/85">Interact</span>
            </span>

            <button
              type="button"
              onClick={triggerTorchToggle}
              title={flashlightOn ? 'Turn Torchlight OFF [F]' : 'Turn Torchlight ON [F]'}
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-white transition cursor-pointer ${flashlightOn
                ? 'bg-amber-400/20 hover:bg-amber-400/30 border-amber-300/45'
                : 'bg-white/10 hover:bg-white/20 border-white/15'
                }`}
            >
              {flashlightOn ? (
                <Flashlight className="w-3 h-3 text-amber-300" />
              ) : (
                <FlashlightOff className="w-3 h-3 text-white/60" />
              )}
              <span className="font-semibold">F</span>
              <span className="text-white/90">{flashlightOn ? 'Torch ON' : 'Torch OFF'}</span>
            </button>

            {onChangeSensitivity && (
              <button
                type="button"
                onClick={() => {
                  const tiers = [0.7, 1.0, 1.4, 1.8];
                  const idx = tiers.findIndex((t) => Math.abs(t - sensitivity) < 0.08);
                  const next = tiers[(idx + 1) % tiers.length];
                  onChangeSensitivity(next);
                }}
                title="Cycle Mouse Look Sensitivity"
                className="ml-1 pl-2.5 border-l border-white/15 inline-flex items-center gap-1 text-[10.5px] font-mono text-white hover:text-white/80 cursor-pointer transition"
              >
                <span className="text-white/65">SENS</span>
                <span className="font-semibold">{Number(sensitivity).toFixed(1)}×</span>
              </button>
            )}
          </div>
        </div>

        {/* Invisible spacer on right to keep capsule cleanly centered symmetrically with minimap */}
        <div className="hidden sm:block w-[172px]" aria-hidden="true" />
      </div>
    </div>
  );
}
