import React from 'react';

/**
 * Animated candle flame with flickering glow
 * Styled according to Curse The Code palette (#ff7a1a pumpkin amber, #8f7bff ghost purple)
 */
export default function CandleAnimation({ round = 1 }) {
  const isRound2 = round === 2;
  const flameColor = isRound2 ? '#8f7bff' : '#ff7a1a';
  const glowFilter = isRound2 ? 'drop-shadow(0 0 16px rgba(143,123,255,0.8))' : 'drop-shadow(0 0 16px rgba(255,122,26,0.8))';

  return (
    <div className="relative flex flex-col items-center justify-center my-6 select-none">
      {/* Ambient Pulsing Aura */}
      <div 
        className={`absolute -top-4 w-28 h-28 rounded-full blur-2xl animate-pulse pointer-events-none opacity-40 ${
          isRound2 ? 'bg-[#8f7bff]' : 'bg-[#ff7a1a]'
        }`} 
      />

      <svg width="120" height="150" viewBox="0 0 120 150" className="relative z-10">
        <defs>
          {/* Flame Gradient */}
          <radialGradient id="candleFlameGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="40%" stopColor={isRound2 ? '#c4b5fd' : '#fed7aa'} />
            <stop offset="75%" stopColor={flameColor} />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>

          {/* Candle Body Gradient */}
          <linearGradient id="candleBodyGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#1a1424" />
            <stop offset="50%" stopColor="#2c223d" />
            <stop offset="100%" stopColor="#120c1c" />
          </linearGradient>

          {/* Wax Melt Drips */}
          <linearGradient id="waxDripGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={isRound2 ? '#3a2a55' : '#4a2820'} />
            <stop offset="100%" stopColor="#1a1424" />
          </linearGradient>
        </defs>

        {/* Animated Flame */}
        <g style={{ filter: glowFilter }}>
          <path
            d="M60 20 C64 35 72 45 72 58 C72 68 66 74 60 74 C54 74 48 68 48 58 C48 45 56 35 60 20 Z"
            fill="url(#candleFlameGrad)"
            className="animate-flicker origin-bottom"
          >
            <animateTransform
              attributeName="transform"
              type="scale"
              values="1 1; 1.05 0.96; 0.96 1.04; 1 1"
              dur="1.4s"
              repeatCount="indefinite"
            />
            <animateTransform
              attributeName="transform"
              type="translate"
              additive="sum"
              values="0 0; -1 1; 1 -1; 0 0"
              dur="0.8s"
              repeatCount="indefinite"
            />
          </path>
        </g>

        {/* Candle Wick */}
        <path d="M60 74 L60 82" stroke="#50445d" strokeWidth="2.5" strokeLinecap="round" />

        {/* Candle Wax Rim */}
        <ellipse cx="60" cy="82" rx="20" ry="5" fill="#2c223d" stroke="#3a2a55" strokeWidth="1" />

        {/* Candle Column Body */}
        <path
          d="M40 82 Q38 110 40 135 Q60 138 80 135 Q82 110 80 82 Z"
          fill="url(#candleBodyGrad)"
          stroke="#3a2a55"
          strokeWidth="1"
        />

        {/* Wax Drips Detail */}
        <path
          d="M44 83 Q46 98 47 106 Q49 98 51 83 M68 83 Q70 102 72 112 Q74 100 76 83"
          fill="none"
          stroke="url(#waxDripGrad)"
          strokeWidth="3.5"
          strokeLinecap="round"
        />

        {/* Base Rim */}
        <ellipse cx="60" cy="135" rx="24" ry="6" fill="#0e0c14" stroke="#3a2a55" strokeWidth="1.5" />
      </svg>
    </div>
  );
}
