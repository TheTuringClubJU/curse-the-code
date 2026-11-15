import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  Compass,
  FlashlightOff,
  HelpCircle,
  Lock,
  LogOut,
  Monitor,
  SlidersHorizontal,
  Unlock,
  Volume2,
  VolumeX,
} from 'lucide-react';

function getRoomZone(x, z) {
  if (x > 10.5 && z > 5.8) return '6E QUARANTINE CELLAR';
  if (x < -10.0 && z < -5.8) return '6F RELIQUARY CHAPEL';
  if (x < -8.2) return '6C SCRIPTORIUM';
  if (x > 8.2) return '6D SWITCHGEAR';
  if (z > 7.4) return '6A NARTHEX';
  return '6B CENTRAL NAVE';
}

function getRiddleObjective(clues, cluesSolved, totalClues) {
  const list = Array.isArray(clues) ? clues : [];
  const r08 = list.find((c) => c.id === 'R2-08')?.solved;
  const r09 = list.find((c) => c.id === 'R2-09')?.solved;
  const r10 = list.find((c) => c.id === 'R2-10')?.solved;

  if (r10 || cluesSolved >= totalClues) {
    return 'All three vows ring silent in phase. The Anointing Vessel rests sealed.';
  }
  if (r08 && r09) {
    return 'Two halves stand awake in dark conduits. Return to the Nave Altar to bind the third.';
  }
  if (r08 && !r09) {
    return 'The West ink ledger sleeps clean; beyond the breached iron gate east shadows await live current.';
  }
  if (!r08 && r09) {
    return 'Eastern breakers hold steady; seek the inked mirror behind western stone arches.';
  }
  return 'Two halves bind the altar: one ink-stained in the West, one wired behind the East gate.';
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

  const currentZone = getRoomZone(pose.x, pose.z);
  const riddleLine = getRiddleObjective(clues, cluesSolved, totalClues);
  const resLabel = qualityMode === 'high' ? 'High' : qualityMode === 'low' ? 'Low' : 'Med';

  // Convert 3D world coords (-18..18, -12..17) into clean RE2R SVG blueprint coords (152x104)
  const mapX = Math.max(8, Math.min(144, ((pose.x + 18) / 36) * 140 + 6));
  const mapZ = Math.max(8, Math.min(96, ((pose.z + 12) / 29) * 88 + 8));

  const triggerTorchCheck = () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyF' }));
  };

  return (
    <div className="fixed inset-0 z-30 pointer-events-none select-none flex flex-col justify-between p-3 sm:p-5 text-[#ece6da]">
      {/* TOP BAR: Objective Slat (Left) & Minimal Action Strip (Right) */}
      <div className="flex items-start justify-between gap-4">
        {/* Top-Left: Unboxed Scrim Objective Slat */}
        <div
          className="pointer-events-auto max-w-md bg-[#090a0f]/82 border border-[#d4b896]/20 border-l-2 border-l-[#b91c1c] rounded-[2px] px-3.5 py-2.5 backdrop-blur-sm shadow-[0_10px_28px_rgba(0,0,0,0.68)]"
          aria-label="Vault Mission Objective"
        >
          <div className="flex flex-wrap items-center gap-2 text-[10px] vault-font-mono tracking-[0.18em] uppercase text-[#a39a8b]">
            <span>ROUND 2 • ST. JUDE VAULT</span>
            <span className="text-[#585148]">/</span>
            <span className="font-bold text-[#e5dcc9]">The Anointing Vault</span>
            <span className="ml-auto px-1.5 py-0.5 bg-black/75 border border-[#d8b26e]/30 text-[#d8b26e] text-[9px] rounded-[2px]">
              {currentZone}
            </span>
          </div>

          <p className="mt-1.5 text-xs sm:text-[13px] vault-font-serif italic text-[#e8dfd0] leading-snug">
            {riddleLine}
          </p>

          <div className="mt-2 pt-1.5 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-[10px] vault-font-mono tracking-[0.14em] uppercase">
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
                    className={`w-2 h-2 rotate-45 border ${
                      step.done
                        ? 'bg-emerald-400 border-emerald-200'
                        : 'bg-[#2a1216] border-[#b91c1c]/80'
                    }`}
                  />
                  <span>{step.code}</span>
                </span>
              ))}
            </div>

            <span className="vault-font-mono text-[11px] font-bold tracking-[0.14em] text-[#e5dcc9]">
              {cluesSolved}/{totalClues}
            </span>
          </div>
        </div>

        {/* Top-Right: 3 Crisp RE Tactical Plates + Collapsible [TAB] Field System Menu */}
        <div className="pointer-events-auto flex flex-col items-end gap-2">
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={onToggleDossier}
              className="re-plate cursor-pointer"
              title="Case Dossier [C]"
            >
              <span className="re-keycap">C</span>
              <BookOpen className="w-3.5 h-3.5 text-[#d8b26e]" />
              <span>DOSSIER</span>
              <span className="text-[10px] text-[#a39a8b]">
                {discoveredDocsCount}/{totalDocsCount}
              </span>
            </button>

            <button
              type="button"
              onClick={onToggleHint}
              className="re-plate cursor-pointer"
              title="Field Guidance [H]"
            >
              <span className="re-keycap">H</span>
              <HelpCircle className="w-3.5 h-3.5 text-[#d8b26e]" />
              <span>GUIDANCE</span>
            </button>

            <button
              type="button"
              onClick={toggleSystem}
              aria-expanded={sysOpen}
              className={`re-plate cursor-pointer ${sysOpen ? 're-plate-amber' : ''}`}
              title="Field System Menu [TAB]"
            >
              <span className="re-keycap">TAB</span>
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#e5dcc9]" />
              <span>SYSTEM</span>
            </button>
          </div>

          {/* Field System Drawer ([TAB]) */}
          {sysOpen && (
            <div
              className="w-72 bg-[#090a0f]/94 border border-[#d4b896]/25 border-l-2 border-l-[#b91c1c] rounded-[2px] p-3.5 space-y-3 shadow-[0_18px_42px_rgba(0,0,0,0.88)] backdrop-blur-md"
              role="region"
              aria-label="Field System Menu"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-2 text-[10px] vault-font-mono tracking-[0.18em] uppercase text-[#d8b26e]">
                <span>FIELD SYSTEM OPTIONS</span>
                {team?.name && <span className="text-[#948b7e] truncate max-w-[110px]">{team.name}</span>}
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={onChangeQuality}
                  title="Switch Render Resolution"
                  className="re-plate w-full justify-between !px-2.5 !py-2 cursor-pointer"
                >
                  <span className="inline-flex items-center gap-1.5">
                    <Monitor className="w-3.5 h-3.5 text-[#d8b26e]" />
                    <span>RES: {resLabel}</span>
                  </span>
                  <span className="re-keycap">R</span>
                </button>

                <button
                  type="button"
                  onClick={onToggleMute}
                  title="Toggle Audio Mute [M]"
                  className="re-plate w-full justify-between !px-2.5 !py-2 cursor-pointer"
                >
                  <span className="inline-flex items-center gap-1.5">
                    {muted ? (
                      <VolumeX className="w-3.5 h-3.5 text-red-400" />
                    ) : (
                      <Volume2 className="w-3.5 h-3.5 text-emerald-300" />
                    )}
                    <span>{muted ? 'MUTED' : 'AUDIO'}</span>
                  </span>
                  <span className="re-keycap">M</span>
                </button>
              </div>

              <button
                type="button"
                onClick={onRequestLock}
                className="re-plate w-full justify-between !px-2.5 !py-2 cursor-pointer"
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
                <span className="re-keycap">G</span>
              </button>

              <div className="space-y-1 border-t border-white/10 pt-2">
                <div className="flex items-center justify-between text-[10px] vault-font-mono uppercase tracking-[0.14em] text-[#a39a8b]">
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
                  className="re-plate w-full justify-center !border-l-[#dc2626] text-red-200 hover:bg-[#2a0c10] !py-2 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 text-red-400" />
                  <span>Log Out</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* CENTER RETICLE */}
      <div className="fixed inset-0 pointer-events-none flex items-center justify-center">
        {isPointerLocked ? (
          <div className="relative flex items-center justify-center">
            <div className="w-1.5 h-1.5 rotate-45 bg-white/90" />
            {activeHoverPrompt && (
              <div className="w-6 h-6 border border-[#d8b26e]/80 rotate-45 absolute" />
            )}
          </div>
        ) : (
          <div className="w-1 h-1 bg-white/35" />
        )}
      </div>

      {/* BOTTOM BAR: Equipment + Blueprint Radar (Left), Action Plate (Center), Compass (Right) */}
      <div className="flex items-end justify-between gap-4">
        {/* Bottom-Left: Diegetic Equipment Card + Orthogonal RE2R Vault Minimap */}
        <div className="pointer-events-auto flex flex-col gap-2">
          <button
            type="button"
            onClick={triggerTorchCheck}
            title="Torch battery dead (0%)"
            className="re-plate !py-1.5 !px-3 w-fit cursor-pointer"
          >
            <span className="re-keycap">F</span>
            <FlashlightOff className="w-3.5 h-3.5 text-red-400" />
            <span className="text-[11px] text-[#dfd6c3]">TORCH</span>
            <span className="text-[10px] font-bold text-red-400">0%</span>
          </button>

          <div
            className="hidden sm:block bg-[#07090d]/90 border border-[#d4b896]/20 rounded-[2px] p-2 shadow-[0_14px_34px_rgba(0,0,0,0.78)]"
            aria-label="Vault Orthogonal Floor Blueprint"
          >
            <div className="flex items-center justify-between text-[9px] vault-font-mono uppercase tracking-[0.16em] text-[#9b9284] mb-1 px-0.5">
              <span>PLAN // SUB-06</span>
              <span className="text-[#d8b26e]">{currentZone.split(' ')[0]}</span>
            </div>
            <svg width="152" height="104" viewBox="0 0 152 104" className="block bg-[#040508] border border-white/10">
              {/* 6F North Reliquary Chapel */}
              <rect x="14" y="8" width="22" height="16" fill="#13161e" stroke="#475569" strokeWidth="1" />
              <text x="25" y="18" textAnchor="middle" fontSize="6" fill="#94a3b8" fontFamily="monospace">6F</text>

              {/* 6C West Scriptorium */}
              <rect
                x="10"
                y="26"
                width="30"
                height="42"
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
                fill={r09Solved ? '#0c261d' : '#1a1510'}
                stroke={r09Solved ? '#10b981' : '#d97706'}
                strokeWidth="1.1"
              />
              <text x="127" y="49" textAnchor="middle" fontSize="7" fill="#e2e8f0" fontFamily="monospace">6D</text>

              {/* 6E South Quarantine Cellar */}
              <rect x="114" y="70" width="22" height="18" fill="#13161e" stroke="#475569" strokeWidth="1" />
              <text x="125" y="81" textAnchor="middle" fontSize="6" fill="#94a3b8" fontFamily="monospace">6E</text>

              {/* 6A Narthex Entrance */}
              <rect x="64" y="74" width="24" height="24" fill="#13161e" stroke="#64748b" strokeWidth="1" />
              <text x="76" y="88" textAnchor="middle" fontSize="6.5" fill="#cbd5e1" fontFamily="monospace">6A</text>

              {/* Doorway connections */}
              <line x1="40" y1="47" x2="44" y2="47" stroke="#e2e8f0" strokeWidth="1.5" />
              <line x1="108" y1="47" x2="112" y2="47" stroke="#e2e8f0" strokeWidth="1.5" />
              <line x1="76" y1="72" x2="76" y2="74" stroke="#e2e8f0" strokeWidth="2" />

              {/* Live Player Marker */}
              <circle cx={mapX} cy={mapZ} r="2.8" fill="#f8fafc" stroke="#b91c1c" strokeWidth="1" />
            </svg>
          </div>
        </div>

        {/* Bottom-Center: Context Inspect Plate + Quiet Control Guide */}
        <div className="flex-1 flex flex-col items-center gap-2 pb-1">
          {activeHoverPrompt && (
            <div className="re-plate re-plate-amber !py-2 !px-4 bg-[#090a0f]/94 shadow-[0_12px_30px_rgba(0,0,0,0.85)]">
              {/^\[E\]\s*/i.test(activeHoverPrompt) ? (
                <>
                  <span className="re-keycap">[E]</span>{' '}
                  <span className="text-xs font-bold tracking-[0.14em] text-[#f5f0e4]">
                    {activeHoverPrompt.replace(/^\[E\]\s*/i, '')}
                  </span>
                </>
              ) : (
                <span className="text-xs font-bold tracking-[0.14em] text-[#f5f0e4]">
                  {activeHoverPrompt}
                </span>
              )}
            </div>
          )}

          <div className="hidden md:block text-[10px] vault-font-mono tracking-[0.2em] uppercase text-[#a39a8b]/70">
            [WASD] MOVE &nbsp;•&nbsp; [E] INSPECT &nbsp;•&nbsp; [F] TORCH &nbsp;•&nbsp; [C] DOSSIER &nbsp;•&nbsp; [TAB] SYSTEM
          </div>
        </div>

        {/* Bottom-Right: Minimal Aim / Lock Badge */}
        <div className="pointer-events-auto hidden sm:flex items-center gap-2">
          <button
            type="button"
            onClick={onRequestLock}
            className="re-plate !py-1.5 !px-3 cursor-pointer"
            title="Toggle First-Person Mouse Look [G]"
          >
            <span className="re-keycap">G</span>
            <Compass className="w-3.5 h-3.5 text-[#d8b26e]" />
            <span className="text-[10px]">{isPointerLocked ? 'AIM LOCKED' : 'FREE CURSOR'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
