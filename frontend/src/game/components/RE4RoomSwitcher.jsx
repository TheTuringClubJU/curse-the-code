// RE4RoomSwitcher.jsx - Resident Evil 4 Debug Room Jump Tool (Mirrors r_jmp / room_jmp.cpp)
import React, { useState, useEffect } from 'react';

export default function RE4RoomSwitcher({ currentRoom, onSelectRoom }) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Toggle room selector with ~ or F2
      if (e.key === '`' || e.key === 'F2') {
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const rooms = [
    { id: '1', key: 'bedroom', name: 'Room 1: Village Cabin (r100 / r102)', re4: 'Stage 1-1 Homestead', icon: '🏚️' },
    { id: '4', key: 'records', name: 'Room 4: The Rotting Archive (r208)', re4: 'Castle Archives Vault', icon: '📚' },
    { id: '5', key: 'control', name: 'Room 5: Surveillance Morgue (r219)', re4: 'Island Surveillance Lab', icon: '📺' },
  ];

  return (
    <div className="fixed top-2 left-1/2 transform -translate-x-1/2 z-50 pointer-events-auto select-none">
      {!isOpen ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="inline-flex items-center gap-2 pl-2 pr-4 py-1 text-[11px] font-sans font-medium text-[#f4f3ef] opacity-75 hover:opacity-100 transition cursor-pointer backdrop-blur-sm"
          style={{
            background: 'linear-gradient(90deg, rgba(14, 15, 17, 0.86) 0%, rgba(18, 19, 21, 0.6) 78%, rgba(18, 19, 21, 0.25) 100%)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
            textShadow: '0 1px 3px rgba(0, 0, 0, 0.9)',
          }}
          title="Return to Previous Rooms (~ / F2)"
        >
          <span className="w-4 h-4 rounded-full bg-[#f5f4f0] text-[#111213] text-[10px] font-bold inline-flex items-center justify-center">
            ~
          </span>
          <span>Rooms [~]</span>
        </button>
      ) : (
      <div
        className="flex items-center gap-2 px-3 py-1.5 backdrop-blur-md shadow-2xl"
        style={{
          background: 'rgba(13, 14, 16, 0.92)',
          border: '1px solid rgba(255, 255, 255, 0.16)',
          borderRadius: '2px',
        }}
      >
        {/* Sector Label */}
        <div className="border-r border-white/15 pr-2.5 mr-0.5 text-left">
          <div className="text-[9px] tracking-[0.18em] text-[#9e9688] uppercase">
            SECTOR SELECT
          </div>
          <div className="text-[11px] text-[#f4f3ef] font-sans font-semibold">
            Rooms [~]
          </div>
        </div>

        {/* RE2R Room Jump Pills */}
        <div className="flex items-center gap-1.5">
          {rooms.map((r) => {
            const isActive = currentRoom === r.id || currentRoom === r.key;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  onSelectRoom(r.key);
                  setIsOpen(false);
                }}
                className="inline-flex items-center gap-1.5 pl-1.5 pr-3 py-1 text-[11px] font-sans font-medium transition cursor-pointer"
                style={{
                  background: isActive
                    ? 'linear-gradient(90deg, rgba(168, 120, 56, 0.35) 0%, rgba(168, 120, 56, 0.16) 100%)'
                    : 'rgba(255, 255, 255, 0.06)',
                  borderBottom: isActive ? '1.5px solid #e3b261' : '1px solid rgba(255, 255, 255, 0.14)',
                  color: isActive ? '#f5e1ba' : '#dcd7cc',
                }}
                title={`Jump to ${r.name}`}
              >
                <span className="w-4 h-4 rounded-full bg-[#f5f4f0] text-[#111213] text-[10px] font-bold inline-flex items-center justify-center">
                  {r.id}
                </span>
                <span>{r.id === '1' ? 'Room 1 · Cabin' : r.id === '4' ? 'Room 4 · Archive' : 'Room 5 · Morgue'}</span>
              </button>
            );
          })}
        </div>

        {/* Admin & Close */}
        <div className="border-l border-white/15 pl-2 ml-0.5 flex items-center gap-1.5">
          <a
            href="/admin"
            className="px-2.5 py-1 bg-white/10 hover:bg-white/20 border-b border-red-400/50 text-[#fca5a5] text-[10px] font-sans font-semibold"
          >
            ADMIN
          </a>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="w-5 h-5 rounded-full bg-[#f5f4f0] text-[#111213] text-[10px] font-bold inline-flex items-center justify-center cursor-pointer hover:brightness-90"
            title="Hide Room Switcher"
          >
            ✕
          </button>
        </div>
      </div>
      )}
    </div>
  );
}

