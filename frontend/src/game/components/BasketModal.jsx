import React, { useState } from 'react';
import { X, Search, Sparkles, BookOpen, Layers } from 'lucide-react';

export default function BasketModal({
  isOpen,
  onClose,
  evidence = [],
  collectedIds = [],
  basketUnlocked = false,
  totalInRoom = 15,
  roomTitle = "Lena's Bedroom",
  onSelectFragment
}) {
  const [activeTab, setActiveTab] = useState('bedroom');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="relative w-full max-w-4xl bg-[#0c0914] border border-[#3b2a59] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#140e24] border-b border-[#3b2a59]">
          <div className="flex items-center gap-3">
            <Layers className="w-5 h-5 text-[#8f7bff]" />
            <div>
              <h2 className="text-lg font-bold text-[#e8e0ff] tracking-wide font-mono">
                INVESTIGATION BASKET • EVIDENCE TABLE
              </h2>
              <p className="text-xs text-[#a292cc] font-mono">
                {roomTitle} — Recovered: {collectedIds.length} / {totalInRoom} pieces
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Alert Bar */}
        <div className={`px-6 py-2.5 text-xs font-mono flex items-center gap-2 border-b ${
          basketUnlocked 
            ? 'bg-[#18261e] text-[#86efac] border-[#22543d]' 
            : 'bg-[#211613] text-[#fdba74] border-[#7c2d12]'
        }`}>
          <Sparkles className="w-4 h-4 shrink-0" />
          <span>
            {basketUnlocked 
              ? "All room fragments recovered! Basket seal opened — fragments can now be freely analyzed and inspected." 
              : `Fragments are sealed in wrapped parchment until all ${totalInRoom} room pieces are discovered.`}
          </span>
        </div>

        {/* Content area: Grid of fragments */}
        <div className="flex-1 overflow-y-auto p-6">
          {evidence.length === 0 ? (
            <div className="py-16 text-center text-gray-500 font-mono text-sm">
              Your basket is empty. Approach furniture and glowing objects in the room and press <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-bold">E</kbd> to search.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {evidence.map((ev, index) => {
                const isWrapped = ev.is_wrapped;
                return (
                  <div
                    key={ev.id || index}
                    onClick={() => {
                      if (!isWrapped && onSelectFragment) {
                        onSelectFragment(ev);
                      }
                    }}
                    className={`relative p-4 rounded-lg border transition flex flex-col justify-between ${
                      isWrapped
                        ? 'bg-[#151024]/70 border-[#2f224a] opacity-80 cursor-not-allowed'
                        : 'bg-[#1a132e] border-[#533b82] hover:border-[#8f7bff] hover:shadow-lg hover:shadow-[#8f7bff]/10 cursor-pointer'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/40 text-[#a292cc] border border-white/5">
                          {ev.id}
                        </span>
                        {isWrapped ? (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#3c1e14] text-[#fdba74]">
                            WRAPPED
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#14291e] text-[#86efac]">
                            UNLOCKED
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm font-semibold text-[#e8e0ff] font-serif mb-1">
                        {ev.display?.title || `Evidence ${ev.id}`}
                      </h3>

                      {isWrapped ? (
                        <p className="text-xs text-gray-400 italic font-mono mt-3">
                          [Sealed in oilcloth wrapping. Requires room discovery completion to unwrap.]
                        </p>
                      ) : (
                        <div className="mt-2 text-xs text-[#cdc2eb] font-mono bg-black/30 p-2.5 rounded border border-white/5 line-clamp-3">
                          {ev.display?.lines?.length > 0 
                            ? ev.display.lines.join(' ')
                            : (ev.display?.image_file ? `[Visual scrap: ${ev.display.image_file}]` : "Inspectable evidence fragment.")}
                        </div>
                      )}
                    </div>

                    {!isWrapped && (
                      <div className="mt-4 pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-[#8f7bff] font-mono">
                        <span>Click to examine</span>
                        <BookOpen className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-[#140e24] border-t border-[#3b2a59] flex items-center justify-between text-xs text-gray-400 font-mono">
          <span>Curse the Code • Hollow House Archives</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-[#2b1f47] text-[#e8e0ff] hover:bg-[#3b2a59] transition"
          >
            Close Basket
          </button>
        </div>
      </div>
    </div>
  );
}
