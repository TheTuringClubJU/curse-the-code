import React, { useState } from 'react';
import { 
  X, Search, Sparkles, BookOpen, Layers, Eye, 
  ZoomIn, Sliders, ArrowLeft, CheckCircle2 
} from 'lucide-react';

const EVIDENCE_IMAGE_MAP = {
  EB01: '/poster_piece_1.png',
  EB02: '/diary_piece_1.png',
  EB03: '/portrait_piece_1.png',
  EB04: '/notebook_piece_1.png',
  EB05: '/diary_piece_2.png',
  EB06: '/poster_piece_2.png',
  EB07: '/notebook_piece_2.png',
  EB08: '/portrait_piece_2.png',
  EB09: '/diary_piece_3.png',
  EB10: '/notebook_piece_3.png',
  EB11: '/poster_piece_3.png',
  EB12: '/portrait_piece_3.png',
  EK01: '/key_piece.png',
  XB01: '/decoy_photo.png',
  XB02: '/decoy_portrait.png',
  EK04: '/evidence/basement/EK04.png',
  EK05: '/evidence/basement/EK05.png',
  EK06: '/evidence/basement/EK06.png',
  XK01: '/evidence/basement/XK01.png',
  XK02: '/evidence/basement/XK02.png',
  ER01: '/evidence/evidence_er01.svg',
  ER02: '/evidence/evidence_er02.svg',
  ER03: '/evidence/evidence_er03.svg',
  ER04: '/evidence/evidence_er04.svg',
  ER05: '/evidence/evidence_er05.svg',
  ER06: '/evidence/evidence_er06.svg',
  ER07: '/evidence/evidence_er07.svg',
  ER08: '/evidence/evidence_er08.svg',
  ER09: '/evidence/evidence_er09.svg',
  ER10: '/evidence/evidence_er10.svg',
  XR01: '/evidence/evidence_xr01.svg',
  XR02: '/evidence/evidence_xr02.svg',
};

const EVIDENCE_DETAILS_MAP = {
  EB01: { part: 'Piece A', hiding: 'Trunk Lid Lining' },
  EB02: { part: 'Piece A', hiding: 'Nightstand Drawer' },
  EB03: { part: 'Piece A', hiding: 'Small Portrait Frame' },
  EB04: { part: 'Piece A', hiding: 'Desk Cubby' },
  EB05: { part: 'Piece B', hiding: 'Under Mattress Edge' },
  EB06: { part: 'Piece B', hiding: 'Wardrobe Coat Pocket' },
  EB07: { part: 'Piece B', hiding: 'Music Box Compartment' },
  EB08: { part: 'Piece B', hiding: 'Under Pillow' },
  EB09: { part: 'Piece C', hiding: 'Behind Clock Face' },
  EB10: { part: 'Piece C', hiding: 'Bookshelf Nook' },
  EB11: { part: 'Piece C', hiding: 'Behind Mirror Frame' },
  EB12: { part: 'Piece C', hiding: 'Chair Cushion Lining' },
  EK01: { part: 'Key Note', hiding: 'Porcelain Doll' },
  XB01: { part: 'Fragment', hiding: 'Photo Frame' },
  XB02: { part: 'Fragment', hiding: 'Portrait Canvas' },
  EK04: { part: 'Fragment C', hiding: 'Server Rack' },
  EK05: { part: 'Fragment A', hiding: 'Maintenance Terminal' },
  EK06: { part: 'Fragment C', hiding: 'Toolbox' },
  XK01: { part: 'Fragment', hiding: 'Floor Seal' },
  XK02: { part: 'Fragment', hiding: 'Server Rack Drive Bay' },
  ER01: { clue: 'Incident Report (Requisition)', part: 'Doc A', hiding: 'Filing Cabinet A (Bottom Drawer)' },
  ER02: { clue: 'Subject Intake (S-011)', part: 'Doc B', hiding: 'Filing Cabinet A (Middle Drawer)' },
  ER03: { clue: 'Medical Autopsy Memo', part: 'Doc C', hiding: 'Filing Cabinet B (Top Drawer Dividers)' },
  ER04: { clue: 'Facility Specimen Ledger', part: 'Doc D', hiding: 'Filing Cabinet B (Bottom Locked Drawer)' },
  ER05: { clue: 'Sub-Station Map (Lower Levels)', part: 'Doc E', hiding: 'Archive Shelves North (Middle Rack)' },
  ER06: { clue: 'Surveillance Camera Log (1983)', part: 'Doc F', hiding: 'Archive Shelves West (Top Collapsed Shelf)' },
  ER07: { clue: 'Corvin Hand-Written Note', part: 'Doc G', hiding: 'Clerk Desk (Blotter Inset)' },
  ER08: { clue: 'Personnel Index — Milo Corvin', part: 'Doc H', hiding: 'Card Catalog (Drawer 14)' },
  ER09: { clue: 'Personnel Index — S. Vance', part: 'Doc I', hiding: 'Card Catalog (Drawer 29)' },
  ER10: { clue: 'Shredded Document Scrap', part: 'Doc J', hiding: 'Waste Basket (Under Desk)' },
  XR01: { clue: 'Decoy (Vent Dust Filter)', part: 'Decoy', hiding: 'Ventilation Conduit (Behind Damaged Grille)' },
  XR02: { clue: 'Decoy (Empty Box Flap)', part: 'Decoy', hiding: 'Filing Cabinet A (Top Drawer)' }
};

function getFragmentImage(ev) {
  if (ev?.display?.image_file) {
    const raw = ev.display.image_file;
    return raw.startsWith('/') ? raw : `/${raw}`;
  }
  if (ev?.id && EVIDENCE_IMAGE_MAP[ev.id]) {
    return EVIDENCE_IMAGE_MAP[ev.id];
  }
  return '/parcel_wrapped.png';
}

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
  const [activeTab, setActiveTab] = useState('all');
  const [inspectingEv, setInspectingEv] = useState(null);
  const [inspectingIndex, setInspectingIndex] = useState(null);
  const [inspectContrast, setInspectContrast] = useState(100);
  const [inspectBrightness, setInspectBrightness] = useState(100);
  const [inspectInvert, setInspectInvert] = useState(false);

  if (!isOpen) return null;

  const handleOpenInspector = (ev, idx) => {
    setInspectingEv(ev);
    setInspectingIndex(idx);
    setInspectContrast(100);
    setInspectBrightness(100);
    setInspectInvert(false);
    if (onSelectFragment) {
      onSelectFragment(ev);
    }
  };

  const isPosterOrPortrait = inspectingEv && (
    inspectingEv.id === 'EB01' || inspectingEv.id === 'EB06' || inspectingEv.id === 'EB11' ||
    inspectingEv.id === 'EB03' || inspectingEv.id === 'EB08' || inspectingEv.id === 'EB12' ||
    inspectingEv.display?.style?.paper === 'poster'
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 select-none">
      <div className="relative w-full max-w-5xl bg-[#0c0914] border border-[#3b2a59] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
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
            onClick={() => {
              setInspectingEv(null); setInspectingIndex(null);
              onClose();
            }}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Alert Bar */}
        <div className={`px-6 py-2.5 text-xs font-mono flex items-center justify-between border-b ${
          basketUnlocked 
            ? 'bg-[#18261e] text-[#86efac] border-[#22543d]' 
            : 'bg-[#211613] text-[#fdba74] border-[#7c2d12]'
        }`}>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>
              {basketUnlocked 
                ? "All room fragments recovered! Oilcloth seals opened — PNG fragments can now be examined and analyzed." 
                : `Fragments are sealed in wrapped parchment until all ${totalInRoom} room pieces are discovered.`}
            </span>
          </div>
          <span className="text-[11px] font-bold">
            {collectedIds.length} / {totalInRoom} DISCOVERED
          </span>
        </div>

        {/* Content area: Grid of fragments */}
        <div className="flex-1 overflow-y-auto p-6">
          {evidence.length === 0 ? (
            <div className="py-20 text-center text-gray-500 font-mono text-sm">
              Your basket is empty. Approach glowing furniture and objects in the room and press <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-bold">E</kbd> to search.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {evidence.map((ev, index) => {
                const isWrapped = ev.is_wrapped;
                const imgSrc = isWrapped ? '/parcel_wrapped.png' : getFragmentImage(ev);
                const meta = EVIDENCE_DETAILS_MAP[ev.id] || {};

                return (
                  <div
                    key={ev.id || index}
                    onClick={() => {
                      if (!isWrapped) {
                        handleOpenInspector(ev, index);
                      }
                    }}
                    className={`group relative p-3 rounded-lg border transition flex flex-col justify-between ${
                      isWrapped
                        ? 'bg-[#151024]/70 border-[#2f224a] opacity-80 cursor-not-allowed'
                        : 'bg-[#1a132e] border-[#533b82] hover:border-[#8f7bff] hover:shadow-xl hover:shadow-[#8f7bff]/15 cursor-pointer'
                    }`}
                  >
                    <div>
                      {/* Badge bar */}
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/60 text-[#cdbfff] border border-white/5 font-bold">
                          Fragment #{index + 1}
                        </span>
                        {isWrapped ? (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#3c1e14] text-[#fdba74]">
                            WRAPPED
                          </span>
                        ) : (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#14291e] text-[#86efac]">
                            UNWRAPPED
                          </span>
                        )}
                      </div>

                      {/* Actual PNG Fragment Thumbnail */}
                      <div className="relative w-full h-32 rounded-md bg-black/60 border border-white/10 overflow-hidden mb-2.5 flex items-center justify-center">
                        <img
                          src={imgSrc}
                          alt={ev.display?.title || `Fragment #${index + 1}`}
                          className="w-full h-full object-contain p-1 transition-transform duration-300 group-hover:scale-105"
                          onError={(e) => {
                            // Fallback if image fails
                            e.target.src = '/parcel_wrapped.png';
                          }}
                        />
                        {!isWrapped && (
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="text-[10px] font-mono font-bold px-2 py-1 bg-[#8f7bff] text-black rounded flex items-center gap-1">
                              <Eye className="w-3 h-3" /> Inspect PNG
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Title & Metadata */}
                      <h3 className="text-xs font-bold text-[#e8e0ff] font-serif mb-0.5 truncate">
                        {ev.display?.title ? ev.display.title.replace(/^TEST:\s*/i, "") : `Fragment #${index + 1}`}
                      </h3>

                      {isWrapped ? (
                        <p className="text-[10px] text-gray-400 italic font-mono mt-1">
                          [Sealed in oilcloth. Discover all room pieces to inspect.]
                        </p>
                      ) : (
                        <div className="space-y-1 mt-1 text-[10px] text-gray-400 font-mono">
                          <p className="text-[#a292cc] truncate">
                            {meta.clue || 'Case Clue Fragment'}
                          </p>
                          {ev.display?.lines?.length > 0 ? (
                            <p className="text-gray-300 line-clamp-1 italic">
                              "{ev.display.lines[0]}"
                            </p>
                          ) : ev.secret?.hidden_strip ? (
                            <p className="text-gray-300 line-clamp-1">
                              Strip: "{ev.secret.hidden_strip}"
                            </p>
                          ) : ev.secret?.chunk ? (
                            <p className="text-gray-300 line-clamp-1">
                              Cipher: "{ev.secret.chunk}"
                            </p>
                          ) : (
                            <p className="text-gray-400 line-clamp-1 truncate">
                              {meta.tip || 'Visual fragment scrap'}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {!isWrapped && (
                      <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-[#8f7bff] font-mono">
                        <span>Click to examine</span>
                        <BookOpen className="w-3 h-3" />
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
            onClick={() => {
              setInspectingEv(null); setInspectingIndex(null);
              onClose();
            }}
            className="px-4 py-1.5 rounded bg-[#2b1f47] text-[#e8e0ff] hover:bg-[#3b2a59] transition text-xs"
          >
            Close Basket
          </button>
        </div>

        {/* Detailed High-Res PNG Fragment Inspector Modal Overlay */}
        {inspectingEv && (
          <div className="absolute inset-0 z-20 bg-black/95 backdrop-blur-lg flex flex-col p-6 animate-fadeIn">
            {/* Inspector Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#3b2a59]">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setInspectingEv(null)}
                  className="px-3 py-1 rounded bg-white/10 hover:bg-white/20 text-white font-mono text-xs flex items-center gap-1.5 transition"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Basket
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#8f7bff]/20 text-[#cdbfff] border border-[#8f7bff]/30">
                    Fragment #{inspectingIndex != null ? inspectingIndex + 1 : "?"}
                  </span>
                  <h3 className="text-base font-bold text-[#e8e0ff] font-serif">
                    {inspectingEv.display?.title ? inspectingEv.display.title.replace(/^TEST:\s*/i, "") : `Fragment #${inspectingIndex != null ? inspectingIndex + 1 : "?"}`}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setInspectingEv(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Inspector Body */}
            <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-6 p-4 items-center">
              
              {/* Left Column: High-Res PNG Image Display with interactive exposure */}
              <div className="space-y-3">
                <div
                  className="w-full h-80 rounded-xl bg-black/80 border border-[#523d78] overflow-hidden flex items-center justify-center p-3 transition-all"
                  style={{
                    filter: isPosterOrPortrait 
                      ? `contrast(${inspectContrast}%) brightness(${inspectBrightness}%) ${inspectInvert ? 'invert(100%)' : ''}`
                      : 'none'
                  }}
                >
                  <img
                    src={getFragmentImage(inspectingEv)}
                    alt={inspectingEv.display?.title || `Fragment #${inspectingIndex != null ? inspectingIndex + 1 : '?'}`}
                    className="max-h-full max-w-full object-contain rounded shadow-2xl"
                  />
                </div>

                {/* Exposure controls if poster or portrait */}
                {isPosterOrPortrait && (
                  <div className="bg-[#140e24] p-3 rounded-lg border border-[#3b2a59] space-y-2 text-xs font-mono text-gray-300">
                    <div className="flex justify-between items-center text-[11px] text-[#cdbfff]">
                      <span>INSPECTION CONTROLS (EXPOSURE)</span>
                      <button
                        type="button"
                        onClick={() => setInspectInvert(!inspectInvert)}
                        className={`px-2 py-0.5 rounded text-[10px] border transition ${
                          inspectInvert ? 'bg-[#8f7bff] text-black' : 'bg-black/40 text-gray-300 border-white/20'
                        }`}
                      >
                        {inspectInvert ? 'Invert Active' : 'Toggle Invert'}
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-[10px]">
                      <div>
                        <div className="flex justify-between mb-0.5">
                          <span>Contrast</span>
                          <span className="text-[#8f7bff]">{inspectContrast}%</span>
                        </div>
                        <input
                          type="range"
                          min="50"
                          max="400"
                          value={inspectContrast}
                          onChange={(e) => setInspectContrast(Number(e.target.value))}
                          className="w-full accent-[#8f7bff]"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between mb-0.5">
                          <span>Brightness</span>
                          <span className="text-[#8f7bff]">{inspectBrightness}%</span>
                        </div>
                        <input
                          type="range"
                          min="20"
                          max="300"
                          value={inspectBrightness}
                          onChange={(e) => setInspectBrightness(Number(e.target.value))}
                          className="w-full accent-[#8f7bff]"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Forensic Details */}
              <div className="space-y-4 font-mono text-xs">
                
                {/* Meta details card */}
                <div className="bg-[#140e24] p-4 rounded-xl border border-[#3b2a59] space-y-2.5">
                  <h4 className="text-xs font-bold text-[#8f7bff] uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-[#86efac]" />
                    FORENSIC ARCHIVE DATA
                  </h4>
                  <div className="space-y-1.5 text-gray-300">
                    <div className="flex justify-between border-b border-white/5 pb-1">
                      <span className="text-gray-500">Fragment Label:</span>
                      <span className="text-[#e8e0ff] font-bold">Fragment #{inspectingIndex != null ? inspectingIndex + 1 : '?'}</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 pb-1">
                      <span className="text-gray-500">Document Style:</span>
                      <span className="text-[#e8e0ff] capitalize">{inspectingEv.display?.style?.paper || 'Archival document'}</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 pb-1">
                      <span className="text-gray-500">Ink Characteristic:</span>
                      <span className="text-[#8f7bff] capitalize">{inspectingEv.display?.style?.ink || 'Standard ink'}</span>
                    </div>
                  </div>
                </div>

                {/* Recovered text / lines */}
                <div className="bg-[#140e24] p-4 rounded-xl border border-[#3b2a59] space-y-2">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    RECOVERED CONTENT / INSCRIPTION
                  </h4>
                  {inspectingEv.display?.lines?.length > 0 ? (
                    <div className="p-3 rounded bg-black/50 border border-white/10 space-y-1 text-gray-200">
                      {inspectingEv.display.lines.map((l, i) => (
                        <p key={i} className="font-serif italic">{l}</p>
                      ))}
                    </div>
                  ) : inspectingEv.secret?.hidden_strip ? (
                    <div className="p-3 rounded bg-black/50 border border-white/10 text-emerald-400 font-bold">
                      Hidden strip text: "{inspectingEv.secret.hidden_strip}"
                    </div>
                  ) : inspectingEv.secret?.chunk ? (
                    <div className="p-3 rounded bg-black/50 border border-white/10 text-[#8f7bff] font-bold">
                      Cipher chunk: "{inspectingEv.secret.chunk}"
                    </div>
                  ) : (
                    <div className="p-3 rounded bg-black/50 border border-white/10 text-gray-400">
                      Visual scrap. Reconstruct with complementary fragments in the target clue terminal.
                    </div>
                  )}
                </div>

                {/* Case Note */}
                <div className="p-3 rounded-lg bg-black/30 border border-white/5 text-[11px] text-gray-400 italic">
                  Forensic item securely cataloged in the investigation archive.
                </div>

              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
