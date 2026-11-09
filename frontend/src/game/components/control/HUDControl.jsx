import React from 'react';
import {
  Radio,
  Layers,
  FileText,
  Volume2,
  VolumeX,
  LogOut,
} from 'lucide-react';

export default function HUDControl({
  roomTitle = 'The Surveillance Morgue',
  totalFragments = 8,
  collectedCount = 0,
  basketUnlocked = false,
  isRoomCompleted = false,
  cluesSolved = 0,
  totalClues = 3,
  onOpenBasket,
  onOpenCaseFiles,
  onLogout,
  audioMuted = false,
  onToggleAudio,
  activeHoverPrompt = null,
}) {
  return (
    <div className="absolute inset-0 pointer-events-none select-none flex flex-col justify-between p-3 sm:p-4 z-40 font-mono">

      {/* ── Top Navigation Bar ── */}
      <div className="flex items-center justify-between w-full pointer-events-auto gap-2">

        {/* Left: Room Badge — phosphor-green theme */}
        <div
          className="flex items-center gap-3 backdrop-blur-md px-3.5 py-2 rounded-xl shadow-lg"
          style={{
            background: 'rgba(3,14,5,0.92)',
            border: '1px solid rgba(77,255,120,0.3)',
            boxShadow: '0 0 12px rgba(77,255,120,0.08)',
          }}
        >
          <Radio
            className="w-5 h-5 shrink-0 animate-pulse"
            style={{ color: '#4dff78' }}
          />
          <div>
            <span
              className="text-[9px] font-mono tracking-widest uppercase block"
              style={{ color: '#3a5a3f' }}
            >
              ROUND 2 • SURVEILLANCE MORGUE
            </span>
            <span
              className="text-xs sm:text-sm font-bold font-mono truncate block"
              style={{ color: '#e8d9c0' }}
            >
              {roomTitle}
            </span>
          </div>
        </div>

        {/* Center: Basket + Case Dossier buttons */}
        <div
          className="flex items-center gap-2 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-lg text-xs"
          style={{
            background: 'rgba(3,14,5,0.92)',
            border: '1px solid rgba(196,122,0,0.35)',
          }}
        >
          {/* Basket [B] */}
          <button
            onClick={onOpenBasket}
            title="Open Evidence Basket (Press B)"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition"
            style={{
              background: basketUnlocked ? 'rgba(13,46,18,0.8)' : 'rgba(28,24,17,0.8)',
              color: basketUnlocked ? '#4dff78' : '#e8d9c0',
              border: `1px solid ${basketUnlocked ? 'rgba(77,255,120,0.4)' : 'rgba(74,57,30,0.6)'}`,
            }}
          >
            <Layers className="w-3.5 h-3.5" style={{ color: '#c47a00' }} />
            <span className="hidden sm:inline">Basket:</span>
            <span>{collectedCount}/{totalFragments}</span>
            <kbd className="px-1 py-0.5 text-[9px] rounded" style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.1)', color: '#aaa' }}>
              B
            </kbd>
          </button>

          {/* Case Dossier [C] */}
          <button
            onClick={onOpenCaseFiles}
            title="View Case Dossier (Press C)"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition"
            style={{
              background: 'rgba(28,24,17,0.8)',
              color: '#e8d9c0',
              border: '1px solid rgba(74,57,30,0.6)',
            }}
          >
            <FileText className="w-3.5 h-3.5" style={{ color: '#c47a00' }} />
            <span className="hidden sm:inline">Dossier:</span>
            <span style={{ color: '#4dff78', fontWeight: 'bold' }}>{cluesSolved}/{totalClues}</span>
            <kbd className="px-1 py-0.5 text-[9px] rounded" style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.1)', color: '#aaa' }}>
              C
            </kbd>
          </button>
        </div>

        {/* Right: Audio + Logout */}
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleAudio}
            title={audioMuted ? 'Unmute Audio' : 'Mute Audio'}
            className="p-2 rounded-xl backdrop-blur-md transition shadow-lg"
            style={{
              background: 'rgba(3,14,5,0.92)',
              border: '1px solid rgba(77,255,120,0.25)',
              color: audioMuted ? '#a31818' : '#4dff78',
            }}
          >
            {audioMuted
              ? <VolumeX className="w-4 h-4" />
              : <Volume2 className="w-4 h-4" />
            }
          </button>

          {onLogout && (
            <button
              onClick={onLogout}
              title="Logout"
              className="p-2 rounded-xl backdrop-blur-md transition shadow-lg"
              style={{
                background: 'rgba(3,14,5,0.92)',
                border: '1px solid rgba(163,24,24,0.5)',
                color: '#a31818',
              }}
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ── Centre Reticle / Hover Prompt ── */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center">
        {/* Crosshair dot */}
        <div
          className="w-2 h-2 rounded-full border transition-all duration-150"
          style={{
            borderColor: activeHoverPrompt ? '#4dff78' : 'rgba(255,255,255,0.7)',
            background: activeHoverPrompt ? '#4dff78' : 'rgba(255,255,255,0.35)',
            transform: activeHoverPrompt ? 'scale(1.6)' : 'scale(1)',
          }}
        />

        {/* [E] Interaction prompt */}
        {activeHoverPrompt && (
          <div
            className="mt-4 px-3 py-1 backdrop-blur-md rounded text-xs font-mono flex items-center gap-2"
            style={{
              background: 'rgba(3,14,5,0.92)',
              border: '1px solid rgba(77,255,120,0.6)',
              boxShadow: '0 0 15px rgba(77,255,120,0.2)',
              color: '#4dff78',
            }}
          >
            <kbd
              className="px-1.5 py-0.5 font-bold rounded text-[10px]"
              style={{ background: '#4dff78', color: '#030e05' }}
            >
              E
            </kbd>
            <span>{activeHoverPrompt}</span>
          </div>
        )}
      </div>

      {/* ── Bottom Status Ticker ── */}
      <div
        className="flex items-center justify-between text-[11px] px-2"
        style={{ color: '#1a3d1f' }}
      >
        <div className="flex items-center gap-3">
          <span>SURVEILLANCE ACTIVE // DELTA CONTROL SECURE CHANNEL</span>
          {isRoomCompleted && (
            <span
              className="font-bold animate-pulse"
              style={{ color: '#4dff78' }}
            >
              [VAULT SEAL BROKEN // ADVANCE TO SECTOR 6]
            </span>
          )}
        </div>
        <div className="hidden sm:block text-[10px]" style={{ color: '#0d2e12' }}>
          CURSE THE CODE • 2026
        </div>
      </div>
    </div>
  );
}

