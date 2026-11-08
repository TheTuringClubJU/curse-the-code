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
  // Study Room 2 fragments
  ES01: '/evidence/study/ES01.png',
  ES02: '/evidence/study/ES02.png',
  ES03: '/evidence/study/ES03.png',
  ES04: '/evidence/study/ES04.png',
  ES05: '/evidence/study/ES05.png',
  ES06: '/evidence/study/ES06.png',
  ES07: '/evidence/study/ES07.png',
  ES08: '/evidence/study/ES08.png',
  ES09: '/evidence/study/ES09.png',
  ES10: '/evidence/study/ES10.png',
  ES11: '/evidence/study/ES11.png',
  ES12: '/evidence/study/ES12.png',
  EK02: '/evidence/study/EK02.png',
  EK03: '/evidence/study/EK03.png',
  XS01: '/evidence/study/XS01.png',
  XS02: '/evidence/study/XS02.png',
};

const EVIDENCE_DETAILS_MAP = {
  EB01: { part: 'Piece A', hiding: 'Trunk Lid Lining', tip: 'Left section of aged dark poster.' },
  EB02: { part: 'Piece A', hiding: 'Nightstand Drawer', tip: 'Aged diary page corner slip.' },
  EB03: { part: 'Piece A', hiding: 'Small Portrait Frame', tip: 'Canvas backing strip.' },
  EB04: { part: 'Piece A', hiding: 'Desk Cubby', tip: 'Grid notebook sheet fragment.' },
  EB05: { part: 'Piece B', hiding: 'Under Mattress Edge', tip: 'Torn page with faded ink.' },
  EB06: { part: 'Piece B', hiding: 'Wardrobe Coat Pocket', tip: 'Center section of aged dark poster.' },
  EB07: { part: 'Piece B', hiding: 'Music Box Compartment', tip: 'Torn notebook scrap.' },
  EB08: { part: 'Piece B', hiding: 'Under Pillow', tip: 'Center canvas backing scrap.' },
  EB09: { part: 'Piece C', hiding: 'Behind Clock Face', tip: 'Torn corner paper scrap.' },
  EB10: { part: 'Piece C', hiding: 'Bookshelf Nook', tip: 'Bottom notebook scrap.' },
  EB11: { part: 'Piece C', hiding: 'Behind Mirror Frame', tip: 'Right section of aged dark poster.' },
  EB12: { part: 'Piece C', hiding: 'Chair Cushion Lining', tip: 'Right canvas backing scrap.' },
  EK01: { part: 'Key Note', hiding: 'Porcelain Doll', tip: 'Folded parchment note.' },
  XB01: { part: 'Decoy', hiding: 'Photo Frame', tip: 'Faded childhood photograph.' },
  XB02: { part: 'Decoy', hiding: 'Portrait Canvas', tip: 'Varnished linen frame backing.' },
  // Study Room 2 details (atmospheric, zero spoilers/answer leaks)
  ES01: { part: 'Piece A', hiding: 'Bookshelf', tip: 'Terminal printout recovered from bookshelf.' },
  ES02: { part: 'Piece A', hiding: 'Corkboard', tip: 'CRT screen dump tape segment.' },
  ES03: { part: 'Piece A', hiding: 'Desk Blotter', tip: 'Binary tape scrap from desk blotter.' },
  ES04: { part: 'Piece A', hiding: 'Filing Cabinet', tip: 'Access log dispatch scrap.' },
  ES05: { part: 'Piece B', hiding: 'Sticky-note Wall', tip: 'Yellow sticky note recovered from wall.' },
  ES06: { part: 'Piece B', hiding: 'Armchair', tip: 'Corrupted crash excerpt scrap.' },
  ES07: { part: 'Piece B', hiding: 'Reel Recorder', tip: 'Magnetic tape log page.' },
  ES08: { part: 'Piece B', hiding: 'Cable Bundle', tip: 'Adhesive tape snippet from cable bundle.' },
  ES09: { part: 'Piece C', hiding: 'Corkboard (Upper)', tip: 'CRT screen dump tape fragment.' },
  ES10: { part: 'Piece C', hiding: 'Filing Cabinet (Drawer 4)', tip: 'Dispatched log printout scrap.' },
  ES11: { part: 'Piece C', hiding: 'Floor Lamp', tip: 'Printed memo rolled inside shade.' },
  ES12: { part: 'Piece C', hiding: 'Wastebin', tip: 'Faded screen protector fragment.' },
  EK02: { part: 'Reel Tape', hiding: 'Reel Recorder Case', tip: 'Magnetic tape reel strip.' },
  EK03: { part: 'Folded Slip', hiding: 'Bookshelf Row', tip: 'Folded paper cipher note.' },
  XS01: { part: 'Decoy', hiding: 'Window Sill', tip: 'Old terminal printout scrap.' },
  XS02: { part: 'Decoy', hiding: 'Radiator Pipes', tip: 'Decoy sticky note scrap.' },
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
  const [inspectContrast, setInspectContrast] = useState(100);
  const [inspectBrightness, setInspectBrightness] = useState(100);
  const [inspectInvert, setInspectInvert] = useState(false);

  if (!isOpen) return null;

  const handleOpenInspector = (ev) => {
    setInspectingEv(ev);
    setInspectContrast(100);
    setInspectBrightness(100);
    setInspectInvert(false);
    if (onSelectFragment) {
      onSelectFragment(ev);
    }
  };

  const isPosterOrPortrait = Boolean(inspectingEv);

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
              setInspectingEv(null);
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
                        handleOpenInspector(ev);
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
                          {`Fragment #${index + 1}`}
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
                          alt={ev.display?.title || ev.id}
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
                        {ev.display?.title || `Evidence Fragment ${index + 1}`}
                      </h3>

                      {isWrapped ? (
                        <p className="text-[10px] text-gray-400 italic font-mono mt-1">
                          [Sealed in oilcloth. Discover all room pieces to inspect.]
                        </p>
                      ) : (
                        <div className="space-y-1 mt-1 text-[10px] text-gray-400 font-mono">
                          <p className="text-[#a292cc] truncate">
                            Investigation Scrap
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
              setInspectingEv(null);
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
                    {`Fragment #${evidence.findIndex(x => x.id === inspectingEv.id) + 1 || 1}`}
                  </span>
                  <h3 className="text-base font-bold text-[#e8e0ff] font-serif">
                    {inspectingEv.display?.title || `Evidence Fragment #${evidence.findIndex(x => x.id === inspectingEv.id) + 1 || 1}`}
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
                    alt={inspectingEv.display?.title}
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
                      <span className="text-gray-500">Fragment Number:</span>
                      <span className="text-[#e8e0ff] font-bold">#{evidence.findIndex(x => x.id === inspectingEv.id) + 1 || 1}</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 pb-1">
                      <span className="text-gray-500">Classification:</span>
                      <span className="text-[#cdbfff]">Active Room Evidence</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 pb-1">
                      <span className="text-gray-500">Hiding Spot:</span>
                      <span className="text-[#e8e0ff]">{EVIDENCE_DETAILS_MAP[inspectingEv.id]?.hiding || 'Room fixture'}</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 pb-1">
                      <span className="text-gray-500">Assembly Part:</span>
                      <span className="text-[#8f7bff]">{inspectingEv.part || EVIDENCE_DETAILS_MAP[inspectingEv.id]?.part || 'A'}</span>
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
                  Forensic Note: {EVIDENCE_DETAILS_MAP[inspectingEv.id]?.tip || 'Examine the visual typography and markings.'}
                </div>

              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
