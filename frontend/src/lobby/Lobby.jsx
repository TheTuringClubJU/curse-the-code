import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, LogOut, ShieldCheck, Flame, Compass, Moon } from 'lucide-react';
import CandleAnimation from './CandleAnimation';
import DustParticles from '../userlogin/DustParticles';
import HauntedNightScenery from './HauntedNightScenery';
import { ambientSound } from './ambientAudio';

export default function Lobby({ team, onLogout }) {
  const [lobbyState, setLobbyState] = useState({
    current_round: 1,
    round_status: 'pending',
    round_title: 'The Last Night at Hollow House',
    round_subtitle: 'Round 1',
    is_qualified_r2: false,
  });
  const [audioMuted, setAudioMuted] = useState(true);
  const [pulseSeconds, setPulseSeconds] = useState(0);

  // Poll lobby state every 4 seconds
  useEffect(() => {
    let isMounted = true;
    const fetchState = async () => {
      try {
        const res = await fetch('/api/lobby/state', {
          credentials: 'include',
          headers: {
            'x-session-token': localStorage.getItem('ctc_token') || ''
          }
        });
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setLobbyState(prev => ({
              ...prev,
              current_round: data.current_round,
              round_status: data.round_status,
              round_title: data.round_title || prev.round_title,
              round_subtitle: data.round_subtitle || prev.round_subtitle,
              is_qualified_r2: data.is_qualified_r2,
            }));
          }
        }
      } catch (err) {
        console.error('Lobby polling error:', err);
      }
    };

    fetchState();
    const interval = setInterval(fetchState, 4000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Ambient sound handling
  const toggleAudio = async () => {
    if (audioMuted) {
      await ambientSound.start(lobbyState.current_round === 2);
      setAudioMuted(false);
    } else {
      ambientSound.stop();
      setAudioMuted(true);
    }
  };

  useEffect(() => {
    return () => {
      ambientSound.stop();
    };
  }, []);

  const isRound2 = lobbyState.current_round === 2;

  // Theming configuration
  const theme = isRound2 ? {
    accentColor: '#8f7bff',
    accentText: 'text-[#8f7bff]',
    glowClass: 'purple-glow',
    subtitle: 'RECORDS ARCHIVE • TRANSMISSION STANDBY',
    tag: 'ROUND 2 INTERMISSION',
    primaryMsg: 'Results are being finalised by the curators.',
    secondaryMsg: lobbyState.is_qualified_r2 
      ? 'Your team is shortlisted. Stand by for archive decryption clearance.' 
      : 'Reviewing clue submissions and qualification cutoff...',
    statusPill: 'FINALISING ARCHIVE RESULTS'
  } : {
    accentColor: '#ff7a1a',
    accentText: 'text-[#ff7a1a]',
    glowClass: 'pumpkin-glow',
    subtitle: 'HOLLOW HOUSE • MIDNIGHT GATEWAY',
    tag: 'ROUND 1 • PRE-EVENT GATHERING',
    primaryMsg: 'Waiting for the organisers to start Round 1',
    secondaryMsg: 'The front iron gates remain bolted. Study your team and prepare your minds.',
    statusPill: 'ORGANISERS PREPARING THE GATES'
  };

  return (
    <div className="relative min-h-screen w-full bg-[#07060b] text-[#e9e4f5] flex flex-col justify-between items-center px-4 py-3 selection:bg-[#ff7a1a] selection:text-black overflow-hidden font-mono">
      {/* Background Ambience: Scanlines, vignette, dust motes */}
      <div className="absolute inset-0 scanlines z-10 pointer-events-none" />
      <div className="absolute inset-0 vignette z-10 pointer-events-none" />
      <DustParticles />

      {/* Haunted Night Forest Background: Moon, bats, twisted trees, glowing pumpkins, fog */}
      <HauntedNightScenery round={lobbyState.current_round} />

      {/* Top Bar Navigation */}
      <header className="z-20 w-full max-w-5xl flex items-center justify-between px-3 py-2.5 rounded-lg border border-[#3a2a55]/60 bg-[#0e0c14]/70 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff7a1a] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ff7a1a]"></span>
          </span>
          <span className="text-xs font-bold tracking-widest text-gray-300">
            CURSE THE CODE
          </span>
          <span className="hidden sm:inline-block text-[11px] px-2 py-0.5 rounded bg-[#1f1730] border border-[#3a2a55] text-[#8f7bff]">
            {isRound2 ? 'Round 2' : 'Round 1'}
          </span>
        </div>

        {/* Audio and Sign Out Controls */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={toggleAudio}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border transition-all ${
              audioMuted 
                ? 'border-[#3a2a55] text-gray-400 bg-[#14101e]/60 hover:text-white' 
                : 'border-[#ff7a1a]/60 text-[#ff7a1a] bg-[#ff7a1a]/10 shadow-[0_0_12px_rgba(255,122,26,0.3)]'
            }`}
            title={audioMuted ? "Turn Ambient Sound On" : "Mute Sound"}
          >
            {audioMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 animate-pulse" />}
            <span>{audioMuted ? "Sound: Off" : "Sound: On"}</span>
          </button>

          {onLogout && (
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors px-3 py-1.5 rounded border border-red-950/60 hover:border-red-800 bg-[#170c12]/60"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Center Waiting Card */}
      <main className="z-20 w-full max-w-[560px] my-auto flex flex-col items-center">
        {/* Main Event Title Header */}
        <div className="text-center mb-5">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-elite text-[#ff7a1a] tracking-wider animate-flicker drop-shadow-[0_0_15px_rgba(255,122,26,0.5)]">
            CURSE THE CODE
          </h1>
          <p className="text-xs sm:text-sm font-mono text-[#8f7bff] mt-1.5 tracking-widest uppercase opacity-85">
            {theme.subtitle}
          </p>
        </div>

        {/* Main Themed Waiting Panel */}
        <div className={`w-full bg-[#0e0c14]/90 border border-[#3a2a55] rounded-xl p-6 sm:p-7 relative backdrop-blur-md ${theme.glowClass} flex flex-col items-center text-center shadow-2xl`}>
          
          {/* Active Round Stage Tag */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#171322] border border-[#3a2a55] text-xs font-mono text-gray-400 mb-1">
            <Flame className={`w-3.5 h-3.5 ${theme.accentText} animate-pulse`} />
            <span>{theme.tag}</span>
          </div>

          {/* Candle Visual */}
          <CandleAnimation round={lobbyState.current_round} />

          {/* Pulsing Status Pill */}
          <div className="mb-4 px-3.5 py-1.5 rounded-lg bg-[#140e21] border border-[#3a2a55] text-xs tracking-widest uppercase flex items-center gap-2 text-gray-300">
            <span className={`w-2 h-2 rounded-full ${isRound2 ? 'bg-[#8f7bff]' : 'bg-[#ff7a1a]'} animate-ping`} />
            <span>{theme.statusPill}</span>
          </div>

          {/* Primary & Secondary Atmospheric Waiting Messages */}
          <div className="space-y-2 max-w-md">
            <p className="text-base sm:text-lg text-[#ff7a1a] font-elite">
              {theme.primaryMsg}
            </p>
            <p className="text-xs sm:text-sm text-gray-400 leading-relaxed font-mono">
              {theme.secondaryMsg}
            </p>
          </div>

          {/* Connected Team Info Badge */}
          <div className="mt-8 pt-5 border-t border-[#3a2a55]/60 w-full flex items-center justify-between text-xs text-gray-400 px-2 font-mono">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#4ade80]" />
              <span className="text-gray-400">Team:</span>
              <span className="text-white font-bold tracking-wide">
                {team?.name || 'Authorized Contender'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-[#8f7bff]">
              <Compass className="w-3.5 h-3.5 animate-spin-slow" />
              <span>Standby Mode</span>
            </div>
          </div>
        </div>

        {/* Ambient Footer Instruction */}
        <p className="text-xs text-[#574972] mt-4 font-mono text-center">
          Keep this browser tab open &bull; The portal will unlock automatically once live
        </p>
      </main>

      {/* Footer */}
      <footer className="z-20 text-center text-xs font-mono text-[#574972] py-3">
        <span>CURSE THE CODE &bull; THE TURING CLUB &bull; 2026</span>
      </footer>
    </div>
  );
}
