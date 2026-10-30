import React from 'react';

export default function JackOLantern({ className = '' }) {
  return (
    <div className={`select-none flex flex-col items-center justify-center ${className}`}>
      <svg
        viewBox="0 0 100 100"
        className="w-24 h-24 stroke-[#ff7a1a] fill-none drop-shadow-[0_0_12px_rgba(255,122,26,0.6)] animate-pulse"
        style={{ animationDuration: '4s' }}
      >
        {/* Pumpkin Stem */}
        <path
          d="M 50 16 Q 52 8 58 6 Q 56 12 52 18"
          strokeWidth="3.5"
          strokeLinecap="round"
          stroke="#4ade80"
          fill="#166534"
        />
        {/* Pumpkin Body */}
        <ellipse cx="50" cy="55" rx="38" ry="32" strokeWidth="2.5" />
        <path d="M 32 28 Q 22 55 32 82" strokeWidth="2" strokeDasharray="3 2" />
        <path d="M 68 28 Q 78 55 68 82" strokeWidth="2" strokeDasharray="3 2" />
        <path d="M 50 23 Q 44 55 50 87" strokeWidth="2" strokeDasharray="4 2" />
        {/* Left Eye */}
        <polygon
          points="35,46 44,52 32,54"
          fill="#ff9d42"
          stroke="#ff7a1a"
          strokeWidth="1.5"
        />
        {/* Right Eye */}
        <polygon
          points="65,46 68,54 56,52"
          fill="#ff9d42"
          stroke="#ff7a1a"
          strokeWidth="1.5"
        />
        {/* Nose */}
        <polygon
          points="50,56 46,62 54,62"
          fill="#ff9d42"
          stroke="#ff7a1a"
          strokeWidth="1.5"
        />
        {/* Creepy Mouth */}
        <path
          d="M 28 68 Q 36 78 50 78 Q 64 78 72 68 Q 67 74 60 72 L 57 66 L 53 72 L 47 72 L 44 66 L 40 72 Q 33 74 28 68 Z"
          fill="#ff7a1a"
          stroke="#ffaa55"
          strokeWidth="1.5"
        />
      </svg>
      <span className="text-[10px] text-[#ff7a1a]/70 font-terminal tracking-widest mt-1">
        CURSED BEACON
      </span>
    </div>
  );
}
