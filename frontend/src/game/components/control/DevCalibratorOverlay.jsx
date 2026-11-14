import React, { useState, useEffect } from 'react';

export default function DevCalibratorOverlay({ engineRef }) {
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [wireframes, setWireframes] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const dev = engineRef.current?.dev;
    if (!dev) return;
    const list = dev.getItems();
    setItems(list);
    if (!selectedId && list.length) setSelectedId(list[0].id);
  }, [isOpen, engineRef, selectedId]);

  const current = items.find((it) => it.id === selectedId);

  const nudge = (patch) => {
    const dev = engineRef.current?.dev;
    if (!dev || !current) return;
    dev.updateItem(current.id, patch);
    setItems(dev.getItems());
  };

  const handleToggleWire = () => {
    const next = !wireframes;
    setWireframes(next);
    engineRef.current?.dev?.toggleWireframes(next);
  };

  const handleExport = async () => {
    const data = engineRef.current?.dev?.exportJSON();
    if (!data) return;
    try {
      await navigator.clipboard?.writeText(JSON.stringify(data, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard optional; already logged to console
    }
  };

  return (
    <div className="fixed bottom-4 left-4 z-50 font-mono text-xs pointer-events-auto select-none">
      {!isOpen ? (
        <button
          type="button"
          onClick={() => {
            engineRef.current?.unlock?.();
            setIsOpen(true);
          }}
          className="px-3 py-1.5 rounded-lg bg-black/90 border border-[#4dff78]/60 text-[#4dff78] font-bold hover:bg-[#0d2e12] cursor-pointer shadow-lg"
        >
          [DEV: Edit Positions]
        </button>
      ) : (
        <div className="w-80 p-3.5 rounded-xl bg-black/95 border border-[#4dff78]/50 text-[#e8f5ec] shadow-2xl space-y-2.5">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <span className="font-bold text-[#4dff78]">ROOM 5 DEV CALIBRATOR</span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-2 py-0.5 rounded border border-white/20 text-gray-300 hover:text-white cursor-pointer"
            >
              Close
            </button>
          </div>

          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="w-full bg-[#09120c] border border-[#4dff78]/40 rounded px-2 py-1.5 text-xs text-[#4dff78]"
          >
            {items.map((it) => (
              <option key={it.id} value={it.id}>
                {it.label}
              </option>
            ))}
          </select>

          {current && (
            <div className="space-y-1.5 text-[11px]">
              {['X', 'Y', 'Z'].map((axis, idx) => (
                <div key={axis} className="flex items-center justify-between gap-2">
                  <span className="text-gray-400 w-10">
                    {axis}: <strong className="text-white">{current.pos[idx]}</strong>
                  </span>
                  <div className="flex gap-1">
                    {[-0.25, -0.05, 0.05, 0.25].map((delta) => (
                      <button
                        key={delta}
                        type="button"
                        onClick={() => {
                          const next = [...current.pos];
                          next[idx] = Number((next[idx] + delta).toFixed(2));
                          nudge({ pos: next });
                        }}
                        className="px-1.5 py-0.5 rounded bg-white/10 hover:bg-[#4dff78]/20 text-gray-200 cursor-pointer"
                      >
                        {delta > 0 ? `+${delta}` : delta}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              <div className="flex items-center justify-between gap-2 pt-1">
                <span className="text-gray-400">
                  RotY: <strong className="text-white">{current.rotY}</strong>
                </span>
                <div className="flex gap-1">
                  {[-0.4, -0.1, 0.1, 0.4].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => nudge({ rotY: Number((current.rotY + d).toFixed(2)) })}
                      className="px-1.5 py-0.5 rounded bg-white/10 hover:bg-[#4dff78]/20 text-gray-200 cursor-pointer"
                    >
                      {d > 0 ? `+${d}` : d}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-gray-400">
                  Scale: <strong className="text-white">{current.scale}</strong>
                </span>
                <div className="flex gap-1">
                  {[-0.1, -0.02, 0.02, 0.1].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => nudge({ scale: Math.max(0.05, Number((current.scale + d).toFixed(2))) })}
                      className="px-1.5 py-0.5 rounded bg-white/10 hover:bg-[#4dff78]/20 text-gray-200 cursor-pointer"
                    >
                      {d > 0 ? `+${d}` : d}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-1 border-t border-white/10">
            <button
              type="button"
              onClick={handleToggleWire}
              className="flex-1 py-1.5 rounded bg-white/10 hover:bg-white/20 text-[11px] cursor-pointer"
            >
              {wireframes ? 'Hide Hitboxes' : 'Show Hitboxes'}
            </button>
            <button
              type="button"
              onClick={handleExport}
              className="flex-1 py-1.5 rounded bg-[#4dff78]/20 border border-[#4dff78]/50 text-[#4dff78] font-bold text-[11px] hover:bg-[#4dff78]/30 cursor-pointer"
            >
              {copied ? 'Copied JSON!' : 'Export JSON'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

