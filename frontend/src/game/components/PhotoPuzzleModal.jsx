import React from 'react';
import { X, Image as ImageIcon, Sparkles } from 'lucide-react';

export default function PhotoPuzzleModal({
  isOpen,
  onClose,
  photoCount = 0,
  requiredPieces = 10
}) {
  if (!isOpen) return null;

  // 10 slots (2 rows x 5 columns)
  const slots = Array.from({ length: 10 }, (_, i) => ({
    id: `P0${i + 1}`.slice(-3),
    unlocked: i < photoCount
  }));

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="relative w-full max-w-3xl bg-[#0c0914] border border-[#3b2a59] rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#140e24] border-b border-[#3b2a59]">
          <div className="flex items-center gap-3">
            <ImageIcon className="w-5 h-5 text-[#ffcf8a]" />
            <div>
              <h2 className="text-base font-bold text-[#e8e0ff] tracking-wide font-mono">
                THE VANCE FAMILY PORTRAIT • FRAGMENTED PUZZLE
              </h2>
              <p className="text-xs text-[#a292cc] font-mono">
                Assembled pieces: {photoCount} / {requiredPieces}
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

        {/* Puzzle Board Grid (2 rows x 5 cols) */}
        <div className="p-8 flex flex-col items-center justify-center bg-[#090610]">
          <div className="grid grid-cols-5 gap-2 w-full max-w-xl aspect-[5/2] bg-[#050308] p-3 rounded-lg border border-white/10 shadow-inner">
            {slots.map((slot, index) => (
              <div
                key={slot.id}
                className={`relative rounded border flex items-center justify-center overflow-hidden transition-all duration-300 ${
                  slot.unlocked
                    ? 'bg-[#211538] border-[#8f7bff] shadow-[0_0_12px_rgba(143,123,255,0.2)]'
                    : 'bg-black/50 border-white/5 border-dashed'
                }`}
              >
                {slot.unlocked ? (
                  <div className="text-center p-2">
                    <Sparkles className="w-4 h-4 text-[#ffcf8a] mx-auto mb-1" />
                    <span className="text-[10px] font-mono font-bold text-[#e8e0ff]">
                      {slot.id}
                    </span>
                  </div>
                ) : (
                  <span className="text-[11px] font-mono text-gray-600">
                    {index + 1}
                  </span>
                )}
              </div>
            ))}
          </div>

          <p className="text-xs text-gray-400 font-mono mt-6 text-center max-w-md">
            Solving case files in each room uncovers pieces of the original family portrait. Reconstruct all 10 pieces to unlock the Basement Containment Terminal.
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-[#140e24] border-t border-[#3b2a59] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-[#2b1f47] text-[#e8e0ff] hover:bg-[#3b2a59] transition text-xs font-mono"
          >
            Close Dossier
          </button>
        </div>
      </div>
    </div>
  );
}
