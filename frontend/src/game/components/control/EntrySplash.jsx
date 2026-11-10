import React from 'react';

export function EntrySplash({ onStart, assetProgress }) {
  return (
    <div className="req-splash-root fixed inset-0 z-50 overflow-hidden select-none">
      {/* Left-Aligned Resident Evil Requiem Style Title & Slab-Serif Menu */}
      <div className="relative z-10 h-full max-w-2xl flex flex-col justify-center px-8 sm:px-14 lg:px-20">
        {/* Rough horizontal ink brush scratch rule above main title */}
        <svg viewBox="0 0 360 10" className="w-72 sm:w-88 h-2.5 mb-4 opacity-85" fill="none" aria-hidden="true">
          <path
            d="M2 5 C75 3.5, 195 6.5, 342 4 M12 7 C110 7.5, 250 5.5, 355 7.5"
            stroke="#edeae2"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <circle cx="348" cy="3.5" r="1.4" fill="#edeae2" />
          <circle cx="322" cy="7.5" r="1" fill="#edeae2" opacity="0.7" />
        </svg>

        <h1
          className="font-re-slab text-3xl sm:text-4xl lg:text-[40px] leading-none font-bold tracking-[0.12em] text-[#f0ede6] uppercase mb-2.5 whitespace-nowrap"
          style={{ textShadow: '0 3px 16px rgba(0, 0, 0, 0.96)' }}
        >
          CURSE THE CODE
        </h1>

        {/* Distressed White Brush Smear Strip (`room 5` matching Requiem strip) */}
        <div className="relative inline-flex items-center w-fit mb-9">
          <svg
            viewBox="0 0 360 54"
            preserveAspectRatio="none"
            className="absolute -inset-x-3 -inset-y-1 w-[calc(100%+24px)] h-[calc(100%+8px)] pointer-events-none"
            aria-hidden="true"
          >
            <path
              d="M8 10 Q45 5 110 8 T235 6 Q300 4 348 11 L354 22 L346 31 L352 42 Q295 47 220 45 T90 48 Q35 50 6 43 L11 32 L4 21 Z"
              fill="#ece9e2"
            />
            <path
              d="M2 15 L14 14 L8 25 Z M349 16 L359 19 L347 27 Z M336 47 L356 44 L344 51 Z"
              fill="#ece9e2"
              opacity="0.88"
            />
          </svg>
          <span
            className="relative z-10 px-4 py-1 font-re-slab text-xl sm:text-2xl font-bold lowercase text-[#151414]"
            style={{ letterSpacing: '0.38em' }}
          >
            room 5
          </span>
        </div>

        {/* Resident Evil Style Slab-Serif Menu Column */}
        <div className="flex flex-col items-start gap-2.5">
          <button
            type="button"
            onClick={onStart}
            className="re-title-item"
          >
            <span>Enter the Surveillance Morgue</span>
          </button>

          <div className="font-re-slab pl-2 space-y-2 pt-1 text-[15px] text-[#c8c2b7]">
            <div className="flex items-center whitespace-nowrap opacity-90">
              <span className="inline-block w-3.5 text-[#ded8cc]">•</span>
              <span className="w-36">Move &amp; Look</span>
              <span className="text-[13px] text-[#8f897e]">WASD · Mouse</span>
            </div>
            <div className="flex items-center whitespace-nowrap opacity-90">
              <span className="inline-block w-3.5 text-transparent">•</span>
              <span className="w-36">Interact</span>
              <span className="text-[13px] text-[#8f897e]">E · Right-Click</span>
            </div>
            <div className="flex items-center whitespace-nowrap opacity-90">
              <span className="inline-block w-3.5 text-transparent">•</span>
              <span className="w-36">Torch &amp; Files</span>
              <span className="text-[13px] text-[#8f897e]">F · B · C</span>
            </div>
            <div className="flex items-center whitespace-nowrap opacity-90">
              <span className="inline-block w-3.5 text-transparent">•</span>
              <span className="w-36">Cursor Release</span>
              <span className="text-[13px] text-[#8f897e]">ESC</span>
            </div>
          </div>

          {assetProgress && assetProgress.pct < 100 && (
            <div className="w-76 pt-4 pl-2 space-y-1.5">
              <div className="flex justify-between text-[11px] font-re-slab text-[#b4ada0] tracking-wider">
                <span>Loading ({assetProgress.label})</span>
                <span>{assetProgress.pct}%</span>
              </div>
              <div className="w-full h-[2px] bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-[#e6e1d7] transition-all duration-200"
                  style={{ width: `${assetProgress.pct}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
