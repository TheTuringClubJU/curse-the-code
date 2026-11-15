import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  Crosshair,
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
    className="inline-flex items-center justify-center px-2 py-0.5 rounded-full font-mono text-[10px] font-semibold tracking-wider text-[#efe7d6]"
    style={{
      background: 'rgba(255, 255, 255, 0.08)',
      border: '1px solid rgba(196, 162, 101, 0.24)',
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
    return 'All three seals aligned in phase. The Anointing Vessel rests unsealed.';
  }
  if (r08 && r09) {
    return 'Both wing relays awake: 6C Scripture purified, 6D Breakers active. Return to 6B Altar Console.';
  }
  if (r08 && !r09) {
    return 'West Scripture verified (6C). Proceed East to Crypt Substation (6D) to energize knife switchboard.';
  }
  if (!r08 && r09) {
    return 'East Breakers online (6D). Search West Scriptorium (6C) stone desk to transcribe ancient diff.';
  }
  return 'Two wing conduits bind the Altar: Transcribe 6C West Scripture, then balance 6D East Breakers.';
}

export default function HUDVault({
  team,
  clues = [],
  cluesSolved = 0,
  totalClues = 3,
  activeHoverPrompt = '',
  isPointerLocked = false,
  sensitivity = 0.0022,
  onChangeSensitivity,
  muted = false,
  onToggleMute,
  qualityMode = 'medium',
  onChangeQuality,
  onToggleDossier,
  onToggleHint,
  onRequestLock,
  onLogout,
  discoveredDocsCount = 0,
  totalDocsCount = 8,
  isSystemOpen,
  onToggleSystem,
  getPlayerPos,
}) {
  const [localSystemOpen, setLocalSystemOpen] = useState(false);
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
  const resLabel = qualityMode === 'high' ? 'High' : qualityMode === 'low' ? 'Low' : 'Med';

  // Convert 3D world coords (-18..18, -12..17) into clean SVG blueprint coords (152x104)
  const mapX = Math.max(8, Math.min(144, ((pose.x + 18) / 36) * 140 + 6));
  const mapZ = Math.max(8, Math.min(96, ((pose.z + 12) / 29) * 88 + 8));

  const triggerTorchCheck = () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyF' }));
  };

  return (
    <div className="fixed inset-0 z-30 pointer-events-none select-none flex flex-col justify-between p-3 sm:p-5 text-[#ece6da]">
      {/* ── Top Edge Bar (Room 5 RE2R Translucent Smoke-Fade Strip + Soft Capsule Buttons) ── */}
      <div className="flex items-start justify-between gap-4">
        {/* Top-Left: Gothic smoke-fade objective strip */}
        <div
          className="pointer-events-auto pr-8 pl-4 py-2.5 rounded-r-full max-w-xl"
          style={{
            background: 'linear-gradient(90deg, rgba(12, 10, 10, 0.86) 0%, rgba(12, 10, 10, 0.45) 75%, transparent 100%)',
            borderLeft: '2px solid rgba(185, 28, 28, 0.8)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.55)',
          }}
          aria-label="Vault Mission Objective"
        >
          <div className="flex flex-wrap items-center gap-2 text-[10.5px] font-mono tracking-[0.16em] uppercase text-[#a39a8b]">
            <span>ROUND 2 · ST. JUDE VAULT</span>
            <span className="text-[#585148]">/</span>
            <span className="font-bold text-[#e5dcc9] font-re-display">The Anointing Vault</span>
            <span
              className="px-2.5 py-0.5 rounded-full border text-[9.5px] font-semibold tracking-wider"
              style={{
                background: 'rgba(196, 162, 101, 0.14)',
                borderColor: 'rgba(196, 162, 101, 0.35)',
                color: '#e7cf9e',
              }}
            >
              Sector {zoneInfo.code} · {zoneInfo.name}
            </span>
          </div>

          <div className="mt-1 text-xs text-[#ded5c5] flex items-center gap-2">
            <span className="text-[#c4a265] text-xs">✦</span>
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
                  className={`inline-flex items-center gap-1.5 ${
                    step.done ? 'text-emerald-300' : 'text-[#9e9485]'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full border ${
                      step.done
                        ? 'bg-emerald-400 border-emerald-200'
                        : 'bg-[#2a1216] border-[#b91c1c]/80'
                    }`}
                  />
                  <span>{step.code}</span>
                </span>
              ))}
            </div>

            <span className="font-mono text-[11px] font-bold tracking-[0.14em] text-[#e5dcc9]">
              {cluesSolved}/{totalClues}
            </span>
          </div>
        </div>

        {/* Top-Right: Soft Rounded Capsule Action Buttons */}
        <div className="pointer-events-auto flex flex-col items-end gap-2">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={onToggleDossier}
              className="re-btn cursor-pointer"
              title="Case Dossier [C]"
            >
              <span className="re-btn-circle">C</span>
              <BookOpen className="w-3.5 h-3.5 text-[#d8b26e]" />
              <span>Dossier</span>
              <span className="text-[10px] text-[#a39a8b] ml-1">
                {discoveredDocsCount}/{totalDocsCount}
              </span>
            </button>

            <button
              type="button"
              onClick={onToggleHint}
              className="re-btn cursor-pointer"
              title="Field Guidance [H]"
            >
              <span className="re-btn-circle">H</span>
              <HelpCircle className="w-3.5 h-3.5 text-[#d8b26e]" />
              <span>Guidance</span>
            </button>

            <button
              type="button"
              onClick={toggleSystem}
              aria-expanded={sysOpen}
              className={`re-btn cursor-pointer ${sysOpen ? 'brightness-125' : ''}`}
              title="Field System Menu [TAB]"
            >
              <span className="re-btn-circle">TAB</span>
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#e5dcc9]" />
              <span>System</span>
            </button>
          </div>

          {/* Field System Drawer ([TAB]) */}
          {sysOpen && (
            <div
              className="w-72 bg-[#0c0a0a]/95 border border-[#d4b896]/30 rounded-2xl p-4 space-y-3 shadow-[0_20px_50px_rgba(0,0,0,0.92)] backdrop-blur-md"
              role="region"
              aria-label="Field System Menu"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-2 text-[10px] font-mono tracking-[0.18em] uppercase text-[#d8b26e]">
                <span>FIELD SYSTEM OPTIONS</span>
                {team?.name && <span className="text-[#948b7e] truncate max-w-[110px]">{team.name}</span>}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={onChangeQuality}
                  title="Switch Render Resolution"
                  className="re-btn w-full justify-between cursor-pointer"
                >
                  <span className="inline-flex items-center gap-1.5">
                    <Monitor className="w-3.5 h-3.5 text-[#d8b26e]" />
                    <span>RES: {resLabel}</span>
                  </span>
                  <span className="re-btn-circle">R</span>
                </button>

                <button
                  type="button"
                  onClick={onToggleMute}
                  title="Toggle Audio Mute [M]"
                  className="re-btn w-full justify-between cursor-pointer"
                >
                  <span className="inline-flex items-center gap-1.5">
                    {muted ? (
                      <VolumeX className="w-3.5 h-3.5 text-red-400" />
                    ) : (
                      <Volume2 className="w-3.5 h-3.5 text-emerald-300" />
                    )}
                    <span>{muted ? 'MUTED' : 'AUDIO'}</span>
                  </span>
                  <span className="re-btn-circle">M</span>
                </button>
              </div>

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
                    <Unlock className="w-3.5 h-3.5 text-[#d8b26e]" />
                  )}
                  <span>{isPointerLocked ? 'CURSOR CAPTURED' : 'CAPTURE AIM'}</span>
                </span>
                <span className="re-btn-circle">G</span>
              </button>

              <div className="space-y-1 border-t border-white/10 pt-2">
                <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.14em] text-[#a39a8b]">
                  <span>MOUSE SENSITIVITY</span>
                  <span className="text-[#e5dcc9]">{(sensitivity * 1000).toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="0.0008"
                  max="0.0045"
                  step="0.0002"
                  value={sensitivity}
                  onChange={(e) => onChangeSensitivity?.(parseFloat(e.target.value))}
                  aria-label="Mouse Sensitivity"
                  className="w-full accent-[#b91c1c] cursor-pointer"
                />
              </div>

              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="re-btn w-full justify-center !border-red-900/60 text-red-200 hover:bg-red-950/40 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 text-red-400" />
                  <span>Log Out</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Center Reticle ── */}
      <div className="fixed inset-0 pointer-events-none flex items-center justify-center">
        {isPointerLocked ? (
          <div className="relative flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-white/90 shadow-[0_0_6px_rgba(255,255,255,0.8)]" />
            {activeHoverPrompt && (
              <div className="w-6 h-6 border border-[#d8b26e]/80 rounded-full absolute animate-ping opacity-40" />
            )}
          </div>
        ) : (
          <div className="w-1 h-1 rounded-full bg-white/35" />
        )}
      </div>

      {/* ── Bottom Edge (Minimap Left, Sleek Capsule Dock Center, Aim Status Right) ── */}
      <div className="flex items-end justify-between gap-4">
        {/* Bottom-Left: Diegetic Torch Capsule + Rounded Minimap Card */}
        <div className="pointer-events-auto flex flex-col gap-2">
          <button
            type="button"
            onClick={triggerTorchCheck}
            title="Torch battery dead (0%)"
            className="re-btn cursor-pointer"
          >
            <span className="re-btn-circle">F</span>
            <FlashlightOff className="w-3.5 h-3.5 text-red-400" />
            <span className="text-[11px] text-[#dfd6c3]">TORCH</span>
            <span className="text-[10px] font-bold text-red-400">0%</span>
          </button>

          <div
            className="hidden sm:block bg-[#0c0a0a]/90 border border-[#d4b896]/20 rounded-xl p-2.5 shadow-[0_14px_34px_rgba(0,0,0,0.78)] backdrop-blur-sm"
            aria-label="Vault Orthogonal Floor Blueprint"
          >
            <div className="flex items-center justify-between text-[9px] font-mono uppercase tracking-[0.16em] text-[#9b9284] mb-1 px-0.5">
              <span>PLAN // SUB-06</span>
              <span className="text-[#d8b26e]">{zoneInfo.code}</span>
            </div>
            <svg width="152" height="104" viewBox="0 0 152 104" className="block bg-[#050404] rounded-lg border border-white/10">
              {/* 6F North Reliquary Chapel */}
              <rect x="14" y="8" width="22" height="16" rx="2" fill="#13161e" stroke="#475569" strokeWidth="1" />
              <text x="25" y="18" textAnchor="middle" fontSize="6" fill="#94a3b8" fontFamily="monospace">6F</text>

              {/* 6C West Scriptorium */}
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
              <text x="25" y="49" textAnchor="middle" fontSize="7" fill="#e2e8f0" fontFamily="monospace">6C</text>

              {/* 6B Central Sanctuary Nave */}
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
              <text x="76" y="44" textAnchor="middle" fontSize="7" fill="#e2e8f0" fontFamily="monospace">6B</text>

              {/* 6D East Switchgear */}
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
              <text x="127" y="49" textAnchor="middle" fontSize="7" fill="#e2e8f0" fontFamily="monospace">6D</text>

              {/* 6E South Quarantine Cellar */}
              <rect x="114" y="70" width="22" height="18" rx="2" fill="#13161e" stroke="#475569" strokeWidth="1" />
              <text x="125" y="81" textAnchor="middle" fontSize="6" fill="#94a3b8" fontFamily="monospace">6E</text>

              {/* 6A Narthex Entrance */}
              <rect x="64" y="74" width="24" height="24" rx="2" fill="#13161e" stroke="#64748b" strokeWidth="1" />
              <text x="76" y="88" textAnchor="middle" fontSize="6.5" fill="#cbd5e1" fontFamily="monospace">6A</text>

              {/* Doorway connections */}
              <line x1="40" y1="47" x2="44" y2="47" stroke="#e2e8f0" strokeWidth="1.5" />
              <line x1="108" y1="47" x2="112" y2="47" stroke="#e2e8f0" strokeWidth="1.5" />
              <line x1="76" y1="72" x2="76" y2="74" stroke="#e2e8f0" strokeWidth="2" />

              {/* Live Player Marker */}
              <circle cx={mapX} cy={mapZ} r="3" fill="#f8fafc" stroke="#b91c1c" strokeWidth="1.2" />
            </svg>
          </div>
        </div>

        {/* Bottom-Center: Active Interaction Pill + Sleek Room 5 Capsule Dock */}
        <div className="flex-1 flex flex-col items-center gap-2 pb-1">
          {activeHoverPrompt && (
            <div
              className="pointer-events-auto px-5 py-2 rounded-full flex items-center gap-2 text-xs font-semibold tracking-wider text-[#f5f0e4] animate-pulse"
              style={{
                background: 'linear-gradient(135deg, rgba(80, 20, 20, 0.94) 0%, rgba(30, 10, 10, 0.96) 100%)',
                border: '1px solid rgba(220, 160, 90, 0.55)',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.75)',
              }}
            >
              {/^\[E\]\s*/i.test(activeHoverPrompt) ? (
                <>
                  <span className="re-btn-circle">[E]</span>{' '}
                  <span>{activeHoverPrompt.replace(/^\[E\]\s*/i, '')}</span>
                </>
              ) : (
                <span>{activeHoverPrompt}</span>
              )}
            </div>
          )}

          {/* Room 5 Matching Sleek Rounded Bottom Controls Capsule Dock */}
          <div
            className="pointer-events-auto flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 px-5 py-2 rounded-full text-[11px] font-sans"
            style={{
              background: 'rgba(14, 12, 12, 0.86)',
              border: '1px solid rgba(196, 162, 101, 0.22)',
              backdropFilter: 'blur(8px)',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.72)',
              color: '#c9bfab',
            }}
          >
            {isPointerLocked ? (
              <span className="inline-flex items-center gap-1.5 text-[#e6d2ab] font-medium pr-2.5 border-r border-white/10">
                <Crosshair className="w-3 h-3 text-[#c94a4a]" />
                <span>FPS Aim</span>
                <KeyCap>ESC</KeyCap>
                <span className="text-[#8e887c]">Cursor</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={onRequestLock}
                className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full cursor-pointer transition hover:brightness-115 text-[#f3e6cc] font-medium mr-1"
                style={{
                  background: 'linear-gradient(90deg, rgba(132, 34, 34, 0.72), rgba(44, 14, 14, 0.85))',
                  border: '1px solid rgba(196, 162, 101, 0.45)',
                }}
                title="Lock mouse for full 360 first-person view"
              >
                <MousePointer2 className="w-3 h-3" />
                <span>Click to Lock Aim</span>
              </button>
            )}

            <span className="hidden md:inline-flex items-center gap-1.5">
              <KeyCap>WASD</KeyCap>
              <span className="text-[#9e9688]">Move</span>
            </span>
            <span className="hidden md:inline-flex items-center gap-1.5">
              <KeyCap>{isPointerLocked ? 'MOUSE' : 'LMB'}</KeyCap>
              <span className="text-[#9e9688]">Look 360°</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <KeyCap>E / RMB</KeyCap>
              <span className="text-[#9e9688]">Interact</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <KeyCap>F</KeyCap>
              <span className="text-[#9e9688]">Torch</span>
            </span>

            {onChangeSensitivity && (
              <button
                type="button"
                onClick={() => {
                  const next = sensitivity >= 0.004 ? 0.0012 : sensitivity + 0.0008;
                  onChangeSensitivity(parseFloat(next.toFixed(4)));
                }}
                title="Cycle Mouse Look Sensitivity"
                className="ml-1 pl-2 border-l border-white/10 inline-flex items-center gap-1 text-[10px] font-mono text-[#d4c8ae] hover:text-white cursor-pointer transition"
              >
                <span className="text-[#8e887c]">SENS</span>
                <span className="font-semibold">{(sensitivity * 1000).toFixed(1)}×</span>
              </button>
            )}
          </div>
        </div>

        {/* Bottom-Right: Aim Status Capsule */}
        <div className="pointer-events-auto hidden sm:flex items-center gap-2">
          <button
            type="button"
            onClick={onRequestLock}
            className="re-btn cursor-pointer"
            title="Toggle First-Person Mouse Look [G]"
          >
            <span className="re-btn-circle">G</span>
            <Crosshair className="w-3.5 h-3.5 text-[#d8b26e]" />
            <span className="text-[10.5px]">{isPointerLocked ? 'Aim Locked' : 'Free Cursor'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
