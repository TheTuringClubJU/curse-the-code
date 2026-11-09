import React from 'react';

export default function JackOLantern({ className = '' }) {
  return (
    <div className={`select-none flex flex-col items-center justify-center ${className}`}>
      {/* Resident Evil 4 Survival Horror Biohazard / Los Illuminados Crest */}
      <svg
        viewBox="0 0 100 100"
        className="w-24 h-24 stroke-[#d4a040] fill-none drop-shadow-[0_0_14px_rgba(212,160,64,0.65)] animate-pulse"
        style={{ animationDuration: '3.5s' }}
      >
        {/* Outer Circular Reticle Ring */}
        <circle cx="50" cy="50" r="44" strokeWidth="2" strokeDasharray="6 3" stroke="#8a6e3d" />
        <circle cx="50" cy="50" r="38" strokeWidth="1.5" stroke="#d4a040" />

        {/* Tactical Crosshair Marks */}
        <line x1="50" y1="2" x2="50" y2="10" strokeWidth="2.5" stroke="#d4a040" />
        <line x1="50" y1="90" x2="50" y2="98" strokeWidth="2.5" stroke="#d4a040" />
        <line x1="2" y1="50" x2="10" y2="50" strokeWidth="2.5" stroke="#d4a040" />
        <line x1="90" y1="50" x2="98" y2="50" strokeWidth="2.5" stroke="#d4a040" />

        {/* Biohazard / Crest Triple Blades */}
        <circle cx="50" cy="38" r="14" strokeWidth="2.2" stroke="#e6b85c" />
        <circle cx="39" cy="58" r="14" strokeWidth="2.2" stroke="#e6b85c" />
        <circle cx="61" cy="58" r="14" strokeWidth="2.2" stroke="#e6b85c" />

        {/* Central Core */}
        <circle cx="50" cy="50" r="6" fill="#d4a040" stroke="#ffde8a" strokeWidth="1.5" />

        {/* Warning Spikes */}
        <path d="M 50 16 L 53 28 L 47 28 Z" fill="#c47a00" />
        <path d="M 20 68 L 32 63 L 28 57 Z" fill="#c47a00" />
        <path d="M 80 68 L 72 57 L 68 63 Z" fill="#c47a00" />
      </svg>
    </div>
  );
}
