import React, { useState, useEffect } from 'react';
import { 
  X, Search, Sparkles, BookOpen, Layers, Eye, 
  ZoomIn, Sliders, ArrowLeft, CheckCircle2, FileText 
} from 'lucide-react';
import { ROOM5_EVIDENCE_RICH_META, enrichRoom5EvidenceItem } from '../engine/simulationControl';
import {
  copyDocumentText,
  createDocumentPreviewSvg,
  downloadDocumentFile,
  formatDocumentText,
  formatEvidenceBundleText,
  sanitizeExportFilename,
} from '../engine/evidenceExport';

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
  EC01: '/evidence/evidence_ec01.svg',
  EC02: '/evidence/evidence_ec02.svg',
  EC03: '/evidence/evidence_ec03.svg',
  EC04: '/evidence/evidence_ec04.svg',
  EC05: '/evidence/evidence_ec05.svg',
  EC06: '/evidence/evidence_ec06.svg',
  EC07: '/evidence/evidence_ec07.svg',
  EC08: '/evidence/evidence_ec08.svg',
  XC01: '/evidence/evidence_xc01.svg',
  XC02: '/evidence/evidence_xc02.svg',
};

const EVIDENCE_DETAILS_MAP = {
  EB01: { clue: 'R1-03 (Carnival Poster)', part: 'Piece A', hiding: 'Trunk Lid Lining', tip: 'Left third of the dark carnival poster. Hidden text: TEST DATE 07/' },
  EB02: { clue: 'R1-01 (Diary Entry)', part: 'Piece A', hiding: 'Nightstand Drawer', tip: 'Aged diary page corner mark 41: "Rex turned 5 today. YJXY JSYWD Y"' },
  EB03: { clue: 'R1-04 (Torn Portrait)', part: 'Piece A', hiding: 'Small Portrait Frame', tip: 'Left canvas backing with faint pencil mark: "SHA"' },
  EB04: { clue: 'R1-02 (Gate Notebook)', part: 'Piece A', hiding: 'Desk Cubby', tip: 'Grid paper with 3 margin tallies: "WKH WHVW JDW"' },
  EB05: { clue: 'R1-01 (Diary Entry)', part: 'Piece B', hiding: 'Under Mattress Edge', tip: 'Torn page with blue ink: "MJ PJDBTWI NX QFS"' },
  EB06: { clue: 'R1-03 (Carnival Poster)', part: 'Piece B', hiding: 'Wardrobe Coat Pocket', tip: 'Center third of the dark carnival poster. Hidden text: 04/20' },
  EB07: { clue: 'R1-02 (Gate Notebook)', part: 'Piece B', hiding: 'Music Box Compartment', tip: 'Torn notebook scrap: "H RSHQV DW VXQ"' },
  EB08: { clue: 'R1-04 (Torn Portrait)', part: 'Piece B', hiding: 'Under Pillow', tip: 'Center canvas backing with pencil mark: "D"' },
  EB09: { clue: 'R1-01 (Diary Entry)', part: 'Piece C', hiding: 'Behind Clock Face', tip: 'Page corner scrap: "YJWS"' },
  EB10: { clue: 'R1-02 (Gate Notebook)', part: 'Piece C', hiding: 'Bookshelf Nook', tip: 'Bottom scrap: "ULVH"' },
  EB11: { clue: 'R1-03 (Carnival Poster)', part: 'Piece C', hiding: 'Behind Mirror Frame', tip: 'Right third of carnival poster. Hidden text: 01' },
  EB12: { clue: 'R1-04 (Torn Portrait)', part: 'Piece C', hiding: 'Chair Cushion Lining', tip: 'Right canvas backing with pencil mark: "OW"' },
  EK01: { clue: 'R1-10 (Doll Slip)', part: 'Key Note', hiding: 'Porcelain Doll', tip: 'Folded parchment note: "KYFV MVV HZ"' },
  XB01: { clue: 'Decoy (No Target)', part: 'Decoy', hiding: 'Photo Frame', tip: 'Faded childhood photograph. Decoy specimen.' },
  XB02: { clue: 'Decoy (No Target)', part: 'Decoy', hiding: 'Portrait Canvas', tip: 'Varnished linen frame backing. Decoy specimen.' },
  ER01: { clue: 'Incident Report (Requisition)', part: 'Doc A', hiding: 'Filing Cabinet A (Bottom Drawer)', tip: 'Facility Requisition Slip REQ-83-114 signed by Dr. M. Corvin.' },
  ER02: { clue: 'Subject Intake (S-011)', part: 'Doc B', hiding: 'Filing Cabinet A (Middle Drawer)', tip: 'Classified Subject Intake Dossier SIF-81-011 for Subject S-011.' },
  ER03: { clue: 'Medical Autopsy Memo', part: 'Doc C', hiding: 'Filing Cabinet B (Top Drawer Dividers)', tip: 'Confidential Medical Autopsy memo noting persistent neural activity.' },
  ER04: { clue: 'Chamber Breach Log', part: 'Doc D', hiding: 'Filing Cabinet B (Classified Folder)', tip: 'Security Incident Breach Report INC-82-003 regarding Sector 2 breach.' },
  ER05: { clue: 'Project Echo Report', part: 'Doc E', hiding: 'Archive Shelves (Third Shelf Box)', tip: 'Progress Report cover RPT-80-003 for Project Echo Chamber.' },
  ER06: { clue: 'Facility Surveillance Photo', part: 'Doc F', hiding: 'Archive Shelves (Back Panel Envelope)', tip: 'Photograph PHT-84-011 of Chamber 3 dated 14 months after closure.' },
  ER07: { clue: 'Corvin Handwritten Memo', part: 'Doc G', hiding: 'Clerk Desk (Under Blotter Mat)', tip: 'Confidential personal memo from Dr. Corvin citing active badge BDG-0388.' },
  ER08: { clue: 'Subject Status File Card', part: 'Doc H', hiding: 'Card Catalog (Drawer S)', tip: 'Library card catalog card IDX-S-011 for Subject 011 in Chamber 3.' },
  ER09: { clue: 'Emergency Containment Protocol', part: 'Doc I', hiding: 'Vent Grate (Inside Cover)', tip: 'Emergency Containment Protocol ECP-83-001 containing circuit bus schematic 0x054D.' },
  ER10: { clue: 'Official Closure Notice', part: 'Doc J', hiding: 'Clerk Desk (Locked Drawer)', tip: 'Official facility closure notice with verified forged signature.' },
  XR01: { clue: 'Decoy Utility Memo', part: 'Decoy', hiding: 'Waste Basket', tip: 'Discarded maintenance memo for routine fluorescent tubes.' },
  XR02: { clue: 'Decoy Supply Invoice', part: 'Decoy', hiding: 'Archive Shelves (Top Shelf Loose)', tip: 'Commercial supply invoice for cleaning supplies and detergent.' },
  EC01: { clue: 'R2-01 (Personnel Index)', part: 'Piece A', hiding: 'Relay Rack', tip: 'Transmission log TXL-83-114 sent night of closure to unregistered recipient.' },
  EC02: { clue: 'R2-01 (Personnel Index)', part: 'Piece B', hiding: 'Relay Rack', tip: 'Equipment requisition EQR-83-220 signed by M. Corvin five weeks post-shutdown.' },
  EC03: { clue: 'R2-05 (Transmission Archive)', part: 'Piece A', hiding: 'Akai Tape Deck', tip: 'CRT maintenance report MNT-83-311 noting continuous loop feed from Chamber 3.' },
  EC04: { clue: 'R2-05 (Transmission Archive)', part: 'Piece B', hiding: 'Akai Tape Deck', tip: 'Operator note warning that Monitor 6 keeps showing the same figure.' },
  EC05: { clue: 'R2-06 (Spectrogram)', part: 'Piece A', hiding: 'Operator Chair', tip: 'Automated radio intercept RIC-83-001 at 7.455 MHz referencing Echo Zero.' },
  EC06: { clue: 'R2-06 (Spectrogram)', part: 'Piece B', hiding: 'Floor Cable Conduit', tip: 'Schematic SCH-83-7C showing Chamber 3 biometric feed still live.' },
  EC07: { clue: 'R2-01 (Personnel Index)', part: 'Piece C', hiding: 'Wall Pinboard', tip: 'Shift handover LOG-83-14 ordering operator to log nothing after 23:00.' },
  EC08: { clue: 'R2-05 (Transmission Archive)', part: 'Piece C', hiding: 'Wall Fuse Box', tip: 'Fuse override OVR-MC-479 keeping Chamber 3 circuits deliberately live.' },
  XC01: { clue: 'Decoy Canteen Menu', part: 'Decoy', hiding: 'Operator Chair', tip: 'Standard Sector 5 canteen menu.' },
  XC02: { clue: 'Decoy Sign-In Sheet', part: 'Decoy', hiding: 'Wall Pinboard', tip: 'Routine blank sign-in sheet.' },
};

function getFragmentImage(ev) {
  if (ev?.display?.image_file) {
    const raw = ev.display.image_file;
    return raw.startsWith('/') ? raw : `/${raw}`;
  }
  if (ev?.id && EVIDENCE_IMAGE_MAP[ev.id]) {
    return EVIDENCE_IMAGE_MAP[ev.id];
  }
  if (ev?.kind === 'world_doc' || ev?.id?.startsWith('EC') || ev?.id?.startsWith('XC') || ev?.id?.startsWith('ENV-') || ev?.id?.startsWith('FILE-') || ev?.id?.startsWith('CCTV') || ev?.id?.startsWith('TERM') || ev?.id?.startsWith('DOC')) {
    return createDocumentPreviewSvg(ev, ROOM5_EVIDENCE_RICH_META[ev.id]);
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
  const [boardFilter, setBoardFilter] = useState('all'); // 'all' | 'core' | 'field'
  const [inspectingEv, setInspectingEv] = useState(null);
  const [inspectContrast, setInspectContrast] = useState(100);
  const [inspectBrightness, setInspectBrightness] = useState(100);
  const [inspectInvert, setInspectInvert] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [downloadedId, setDownloadedId] = useState(null);
  const [showRawText, setShowRawText] = useState(false);

  const isControlRoom = totalInRoom === 8 || evidence.some((ev) => ev?.id?.startsWith('EC') || ev?.id?.startsWith('XC') || ev?.kind === 'world_doc');

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        if (inspectingEv) setInspectingEv(null);
        else onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, inspectingEv, onClose]);

  if (!isOpen) return null;

  const handleOpenInspector = (ev) => {
    setInspectingEv(ev);
    setInspectContrast(100);
    setInspectBrightness(100);
    setInspectInvert(false);
    setShowRawText(false);
    if (onSelectFragment) {
      onSelectFragment(ev);
    }
  };

  const isPosterOrPortrait = inspectingEv && (
    inspectingEv.id === 'EB01' || inspectingEv.id === 'EB06' || inspectingEv.id === 'EB11' ||
    inspectingEv.id === 'EB03' || inspectingEv.id === 'EB08' || inspectingEv.id === 'EB12' ||
    inspectingEv.display?.style?.paper === 'poster' ||
    isControlRoom
  );

  // Room 5 Tactile Pinned Corkboard & Lamp-Lit Forensic Desk View
  if (isControlRoom) {
    const enrichedEvidence = evidence.map((ev) => enrichRoom5EvidenceItem(ev));
    const coreCount = collectedIds.filter((id) => String(id).startsWith('EC')).length;
    const worldDocCount = enrichedEvidence.filter((ev) => ev?.kind === 'world_doc').length;
    const exportableEvidence = enrichedEvidence.filter((ev) => !ev?.is_wrapped);
    const filteredEvidence = enrichedEvidence.filter((ev) => {
      if (boardFilter === 'core') return ev?.id?.startsWith('EC') || ev?.id?.startsWith('XC');
      if (boardFilter === 'field') return ev?.kind === 'world_doc';
      return true;
    });

    const triggerCopy = async (id, text) => {
      await copyDocumentText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 1800);
    };

    const triggerDownload = (id, filename, text) => {
      const res = downloadDocumentFile(filename, text);
      if (res) {
        setDownloadedId(id);
        setTimeout(() => setDownloadedId((prev) => (prev === id ? null : prev)), 1800);
      }
    };

    const activeInspect = inspectingEv ? enrichRoom5EvidenceItem(inspectingEv) : null;
    const activeRich = activeInspect ? ROOM5_EVIDENCE_RICH_META[activeInspect.id] : null;
    const activeReportLines = activeInspect
      ? (activeRich?.reportLines || activeInspect.reportLines || [])
      : [];
    const activeHighlight = activeInspect
      ? (activeRich?.highlight || activeInspect.highlight || activeInspect.secret?.note || EVIDENCE_DETAILS_MAP[activeInspect.id]?.tip || '')
      : '';
    const activeEvents = activeInspect && Array.isArray(activeInspect.events) ? activeInspect.events : [];
    const activeRawText = activeInspect ? formatDocumentText(activeInspect, activeRich) : '';

    return (
      <div
        className="corkboard-surface"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) {
            setInspectingEv(null);
            onClose();
          }
        }}
      >
        {/* Top Masking-Taped Paper Strip Banner + AI Bulk Export Capsule Pills */}
        <div className="max-w-5xl w-full mx-auto flex flex-wrap items-center justify-between gap-4 mb-3 shrink-0" onMouseDown={(e) => e.stopPropagation()}>
          <div className="re-dossier-paper px-6 py-2 rounded-sm -rotate-[0.6deg] relative">
            <div className="masking-tape absolute -top-2.5 left-4 w-16 h-4 rotate-2" />
            <div className="masking-tape absolute -top-2.5 right-4 w-16 h-4 -rotate-2" />
            <div className="font-re-typewriter text-[10px] tracking-[0.2em] text-[#5c4832] uppercase">
              {roomTitle} · Recovered {coreCount}/{totalInRoom}{worldDocCount > 0 ? ` · ${worldDocCount} Field Logs` : ''}
            </div>
            <h2 className="font-re-typewriter text-xl font-bold text-[#1c150f] m-0">
              Evidence Board
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {exportableEvidence.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={() => triggerCopy('__all__', formatEvidenceBundleText(exportableEvidence, ROOM5_EVIDENCE_RICH_META))}
                  className="re-btn"
                  title="Copy all recovered evidence & field documents for AI analysis"
                >
                  <span className="re-btn-circle">{copiedId === '__all__' ? '✓' : '⎘'}</span>
                  <span>{copiedId === '__all__' ? 'Copied All' : 'Copy All Files'}</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    triggerDownload(
                      '__all__',
                      'delta_sector5_archive.txt',
                      formatEvidenceBundleText(exportableEvidence, ROOM5_EVIDENCE_RICH_META)
                    )
                  }
                  className="re-btn"
                  title="Download all recovered documents as a .txt dossier"
                >
                  <span className="re-btn-circle">{downloadedId === '__all__' ? '✓' : '⬇'}</span>
                  <span>{downloadedId === '__all__' ? 'Downloaded All' : 'Download All'}</span>
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => {
                setInspectingEv(null);
                onClose();
              }}
              className="re-btn"
            >
              <span className="re-btn-circle">ESC</span>
              <span>Close Board</span>
            </button>
          </div>
        </div>

        {/* Category Filter Pills (Sort Core Evidence vs Field Logs) */}
        <div className="max-w-5xl w-full mx-auto flex flex-wrap items-center gap-2 mb-3 shrink-0" onMouseDown={(e) => e.stopPropagation()}>
          {[
            { key: 'all', label: `All Records (${enrichedEvidence.length})` },
            { key: 'core', label: `Core Slips (${enrichedEvidence.filter(e => e?.id?.startsWith('EC') || e?.id?.startsWith('XC')).length})` },
            { key: 'field', label: `World Logs (${worldDocCount})` },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setBoardFilter(tab.key)}
              className="text-[11px] font-sans font-medium px-4 py-1 rounded-full border cursor-pointer transition"
              style={{
                background: boardFilter === tab.key ? 'linear-gradient(90deg, rgba(132,34,34,0.84), rgba(40,14,14,0.9))' : 'rgba(14, 12, 12, 0.72)',
                borderColor: boardFilter === tab.key ? 'rgba(208,156,98,0.58)' : 'rgba(255,255,255,0.14)',
                color: boardFilter === tab.key ? '#f6efe0' : '#bfb4a2',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Corkboard Grid with Red Investigative Strings & Push-Pinned Index Cards */}
        <div className="relative flex-1 max-w-5xl w-full mx-auto overflow-y-auto px-2 py-4" onMouseDown={(e) => e.stopPropagation()}>
          {filteredEvidence.length === 0 ? (
            <div className="ruled-index-card max-w-md mx-auto mt-16 p-6 text-center -rotate-1 relative">
              <div className="push-pin absolute top-2 left-1/2 -translate-x-1/2" />
              <div className="font-re-typewriter text-sm font-bold text-[#241b13] mt-3 mb-1">
                No Field Notes Pinned Yet
              </div>
              <p className="font-re-typewriter text-xs text-[#4b3822] m-0">
                Inspect desks, crates, monitors, folders, consoles, and tape decks around the bunker to pin records onto this board.
              </p>
            </div>
          ) : (
            <div className="relative">
              {/* Subtle red corkboard yarn connecting pinned cards */}
              <svg className="hidden md:block absolute inset-0 w-full h-full pointer-events-none opacity-65" preserveAspectRatio="none">
                <line x1="15%" y1="18%" x2="48%" y2="35%" stroke="#991b1b" strokeWidth="1.5" />
                <line x1="48%" y1="35%" x2="82%" y2="20%" stroke="#991b1b" strokeWidth="1.5" />
                <line x1="48%" y1="35%" x2="22%" y2="75%" stroke="#991b1b" strokeWidth="1.5" />
                <line x1="48%" y1="35%" x2="78%" y2="74%" stroke="#991b1b" strokeWidth="1.5" />
              </svg>

              <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredEvidence.map((ev, index) => {
                  const isWrapped = ev.is_wrapped;
                  const fallbackSvg = createDocumentPreviewSvg(ev, ROOM5_EVIDENCE_RICH_META[ev.id]);
                  const imgSrc = isWrapped ? '/parcel_wrapped.png' : getFragmentImage(ev);
                  const tilts = ['-rotate-[1.2deg]', 'rotate-[0.9deg]', '-rotate-[0.7deg]', 'rotate-[1.3deg]'];
                  const tiltClass = tilts[index % tilts.length];
                  const isWorldDoc = ev.kind === 'world_doc';
                  const badgeLabel = isWrapped ? 'SEALED' : isWorldDoc ? 'FIELD LOG' : (ev.id?.startsWith('XC') ? 'DECOY?' : 'RECORD');
                  const previewLines = Array.isArray(ev.display?.lines) && ev.display.lines.length > 0
                    ? ev.display.lines
                    : (ROOM5_EVIDENCE_RICH_META[ev.id]?.reportLines || ev.reportLines || []);
                  const leadText = ev.highlight || ROOM5_EVIDENCE_RICH_META[ev.id]?.highlight || ev.secret?.note || EVIDENCE_DETAILS_MAP[ev.id]?.tip || '';

                  return (
                    <div
                      key={ev.id || index}
                      onClick={() => { if (!isWrapped) handleOpenInspector(ev); }}
                      className={`relative bg-[#f5f2eb] p-3.5 shadow-xl transition-transform hover:scale-[1.02] flex flex-col ${tiltClass} ${
                        isWrapped ? 'opacity-75 cursor-not-allowed' : 'cursor-pointer'
                      }`}
                    >
                      <div className="push-pin absolute -top-1.5 left-1/2 -translate-x-1/2" />
                      <div className="flex items-center justify-between text-[9px] font-re-typewriter text-[#5e4a32] mb-1.5">
                        <span className="font-bold">{ev.display?.corner_mark || ev.id}</span>
                        <span className="px-2 py-0.5 rounded-full bg-[#e6dfd0] text-[#4b3822] font-bold">{badgeLabel}</span>
                      </div>
                      <div className="bg-[#181615] h-28 flex items-center justify-center p-1 mb-2 overflow-hidden">
                        <img
                          src={imgSrc}
                          alt={ev.display?.title || ev.id}
                          className="max-h-full max-w-full object-contain"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = fallbackSvg;
                          }}
                        />
                      </div>
                      <div className="font-re-typewriter text-xs font-bold text-[#1c150f] leading-snug">
                        {ev.display?.title ? ev.display.title.replace(/^TEST:\s*/i, '') : ev.id}
                      </div>
                      {ev.location && (
                        <div className="font-re-typewriter text-[9.5px] text-[#7a5b38] mt-0.5">
                          {ev.location}
                        </div>
                      )}
                      <div className="font-re-typewriter text-[10px] text-[#2e241b] mt-1.5 space-y-1 flex-1 max-h-28 overflow-y-auto pr-1 border-l-2 border-[#8c1f1f]/40 pl-2">
                        {previewLines.length > 0 ? (
                          previewLines.slice(0, 4).map((ln, lIdx) => (
                            <p key={lIdx} className="m-0 leading-snug">{ln}</p>
                          ))
                        ) : (
                          <p className="m-0 italic text-[#5e4a32]">Examine full sheet on desk</p>
                        )}
                      </div>
                      {leadText && (
                        <div className="mt-2 px-2 py-1 bg-[#ede6d4] border border-[#c9bba0] rounded-sm font-re-typewriter text-[9.5px] font-bold text-[#4a1818] leading-snug">
                          {leadText}
                        </div>
                      )}

                      {!isWrapped && (
                        <div className="mt-2.5 pt-2 border-t border-black/10 flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              triggerCopy(ev.id, formatDocumentText(ev, ROOM5_EVIDENCE_RICH_META[ev.id]));
                            }}
                            className="flex-1 text-[10px] font-sans font-semibold px-2.5 py-1 rounded-full bg-[#1a1614] text-[#f3ede0] hover:bg-[#3a1616] transition cursor-pointer"
                          >
                            {copiedId === ev.id ? '✓ Copied' : 'Copy'}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const raw = formatDocumentText(ev, ROOM5_EVIDENCE_RICH_META[ev.id]);
                              triggerDownload(ev.id, sanitizeExportFilename(ev.id, ev.display?.title), raw);
                            }}
                            className="flex-1 text-[10px] font-sans font-semibold px-2.5 py-1 rounded-full bg-[#362b21] text-[#f3ede0] hover:bg-[#5c4832] transition cursor-pointer"
                          >
                            {downloadedId === ev.id ? '✓ Saved' : 'Download'}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Desk Spread Close-Up When Clicking a Pinned File */}
        {activeInspect && (
          <div
            className="desk-surface"
            style={{ zIndex: 80 }}
            onMouseDown={(e) => e.target === e.currentTarget && setInspectingEv(null)}
          >
            <div className="relative w-full max-w-4xl flex flex-col gap-5 py-2 max-h-[92vh] overflow-y-auto" onMouseDown={(e) => e.stopPropagation()}>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
                <div className="md:col-span-4 relative manila-dossier p-3.5 rounded-sm -rotate-1">
                  <div className="masking-tape absolute -top-2.5 left-1/2 -translate-x-1/2 w-20 h-5" />
                  <div
                    className="bg-[#f4f1ea] p-2 border border-black/10 flex items-center justify-center min-h-[180px]"
                    style={{ filter: `contrast(${inspectContrast}%) brightness(${inspectBrightness}%) ${inspectInvert ? 'invert(100%)' : ''}` }}
                  >
                    <img
                      src={getFragmentImage(activeInspect)}
                      alt={activeInspect.display?.title || activeInspect.id}
                      className="max-h-48 max-w-full object-contain"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = createDocumentPreviewSvg(activeInspect, activeRich);
                      }}
                    />
                  </div>
                  <div className="mt-3 space-y-1.5 text-[10px] font-re-typewriter text-[#3a2a18]">
                    <div className="flex justify-between">
                      <span>Contrast {inspectContrast}%</span>
                      <button type="button" onClick={() => setInspectInvert(!inspectInvert)} className="underline cursor-pointer">
                        {inspectInvert ? 'Normal' : 'Invert'}
                      </button>
                    </div>
                    <input type="range" min="50" max="300" value={inspectContrast} onChange={(e) => setInspectContrast(Number(e.target.value))} className="w-full accent-[#5c4832]" />
                  </div>
                </div>

                <div className="md:col-span-8 relative green-grid-sheet p-6 sm:p-7 rounded-sm rotate-[0.4deg]">
                  <div className="masking-tape absolute -top-3 left-1/2 -translate-x-1/2 w-24 h-6 -rotate-1" />
                  <div className="font-re-typewriter text-[10px] tracking-widest uppercase text-[#2d4f38] mb-1">
                    {activeRich?.classification || activeInspect.classification || (activeInspect.kind === 'world_doc' ? 'FIELD DOCUMENT' : 'FIELD RECORD')} // {activeInspect.display?.corner_mark || activeInspect.id}
                  </div>
                  {(activeRich?.location || activeInspect.location) && (
                    <div className="font-re-typewriter text-[10px] text-[#45634d] mb-1">
                      {activeRich?.location || activeInspect.location}
                    </div>
                  )}
                  <h3 className="font-re-typewriter text-xl font-bold text-[#142018] mb-3">
                    {activeInspect.display?.title ? activeInspect.display.title.replace(/^TEST:\s*/i, '') : 'Record'}
                  </h3>
                  {activeInspect.display?.lines?.length > 0 && (
                    <div className="border-l-2 border-[#23452e]/60 pl-3 mb-3 space-y-1 font-re-typewriter text-xs text-[#101c14]">
                      {activeInspect.display.lines.map((l, i) => <p key={i} className="m-0">{l}</p>)}
                    </div>
                  )}
                  {activeReportLines.length > 0 && (
                    <div className="space-y-2 font-re-typewriter text-xs leading-relaxed text-[#18291e] mb-2">
                      {activeReportLines.map((p, i) => <p key={i} className="m-0">{p}</p>)}
                    </div>
                  )}
                  {activeEvents.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-black/15 space-y-1 font-re-typewriter text-[11px] text-[#1c2b21]">
                      {activeEvents.map((evLine, i) => (
                        <div key={i} className="pl-2 border-l-2 border-[#7c1d1d]">{evLine}</div>
                      ))}
                    </div>
                  )}
                  {activeHighlight && (
                    <div className="mt-5 md:ml-auto md:max-w-md ruled-index-card px-5 pt-6 pb-4 rounded-sm rotate-[1.2deg]">
                      <div className="push-pin absolute top-2 left-1/2 -translate-x-1/2" />
                      <div className="font-re-typewriter text-xs font-bold text-[#241b13]">
                        {activeHighlight}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {showRawText && (
                <div className="bg-[#0e0c0b]/95 border border-[#c4a265]/35 rounded-xl p-4 font-mono text-[11px] text-[#e5dcc9] whitespace-pre-wrap max-h-56 overflow-y-auto">
                  {activeRawText}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => triggerCopy(activeInspect.id, activeRawText)}
                    className="re-btn"
                  >
                    <span className="re-btn-circle">{copiedId === activeInspect.id ? '✓' : '⎘'}</span>
                    <span>{copiedId === activeInspect.id ? 'Copied Content' : 'Copy Content'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      triggerDownload(
                        activeInspect.id,
                        sanitizeExportFilename(activeInspect.id, activeInspect.display?.title),
                        activeRawText
                      )
                    }
                    className="re-btn"
                  >
                    <span className="re-btn-circle">{downloadedId === activeInspect.id ? '✓' : '⬇'}</span>
                    <span>{downloadedId === activeInspect.id ? 'Downloaded File' : 'Download File'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowRawText(v => !v)}
                    className="re-btn"
                  >
                    <span className="re-btn-circle">TXT</span>
                    <span>{showRawText ? 'Hide Raw Text' : 'View Raw Text'}</span>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setInspectingEv(null)}
                  className="re-btn"
                >
                  <span className="re-btn-circle">ESC</span>
                  <span>Back to Evidence Board</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 select-none"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          setInspectingEv(null);
          onClose();
        }
      }}
    >
      <div
        className={`relative w-full max-w-5xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${
          isControlRoom
            ? 'bg-[#090d0a] border border-[#b47d3a]/60'
            : 'bg-[#0c0914] border border-[#3b2a59]'
        }`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${
          isControlRoom ? 'bg-[#121610] border-[#423522]' : 'bg-[#140e24] border-[#3b2a59]'
        }`}>
          <div className="flex items-center gap-3">
            {isControlRoom ? (
              <FileText className="w-5 h-5 text-[#c47a00]" />
            ) : (
              <Layers className="w-5 h-5 text-[#8f7bff]" />
            )}
            <div>
              <h2 className={`text-lg font-bold tracking-wide ${
                isControlRoom ? 'font-re-display text-[#f3ebd8]' : 'text-[#e8e0ff] font-mono'
              }`}>
                {isControlRoom ? 'EVIDENCE ARCHIVE BINDER • SUBSTATION DELTA' : 'INVESTIGATION BASKET • EVIDENCE TABLE'}
              </h2>
              <p className={`text-xs font-mono ${isControlRoom ? 'text-[#b5843c]' : 'text-[#a292cc]'}`}>
                {roomTitle} — Recovered: {collectedIds.length} / {totalInRoom} {isControlRoom ? 'files' : 'pieces'}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setInspectingEv(null);
              onClose();
            }}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
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
                        : isControlRoom
                        ? 'bg-[#141712] border-[#5c482c] hover:border-[#c47a00] hover:shadow-xl cursor-pointer'
                        : 'bg-[#1a132e] border-[#533b82] hover:border-[#8f7bff] hover:shadow-xl hover:shadow-[#8f7bff]/15 cursor-pointer'
                    }`}
                  >
                    <div>
                      {/* Badge bar */}
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/60 text-[#cdbfff] border border-white/5 font-bold">
                          RECOVERED
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
                          alt={ev.display?.title || "Evidence thumbnail"}
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
                        {ev.display?.title ? ev.display.title.replace(/^TEST:\s*/i, "") : "Archival Evidence"}
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
        <div className={`px-6 py-3 border-t flex items-center justify-between text-xs text-gray-400 font-mono ${
          isControlRoom ? 'bg-[#121610] border-[#423522]' : 'bg-[#140e24] border-[#3b2a59]'
        }`}>
          <span>{isControlRoom ? 'Curse the Code • Substation Delta Archives' : 'Curse the Code • Hollow House Archives'}</span>
          <button
            onClick={() => {
              setInspectingEv(null);
              onClose();
            }}
            className={`px-4 py-1.5 rounded text-xs transition cursor-pointer ${
              isControlRoom ? 'bg-[#2a2114] text-[#f3ebd8] hover:bg-[#3f311d] border border-[#7c5c30]' : 'bg-[#2b1f47] text-[#e8e0ff] hover:bg-[#3b2a59]'
            }`}
          >
            {isControlRoom ? 'Close Binder [ESC]' : 'Close Basket'}
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
                  <h3 className="text-base font-bold text-[#e8e0ff] font-serif">
                    {inspectingEv.display?.title ? inspectingEv.display.title.replace(/^TEST:\s*/i, "") : "Archival Evidence"}
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

              {/* Right Column: Forensic Details (Resident Evil paper dossier in Room 5) */}
              <div className="space-y-4 font-mono text-xs">
                {isControlRoom ? (
                  <div className="re-dossier-paper rounded p-4 sm:p-5 space-y-3">
                    <div className="flex items-center justify-between border-b border-black/20 pb-2">
                      <span className="font-re-display text-xs font-bold text-[#4a2b13]">
                        FILE // {inspectingEv.id} · {EVIDENCE_DETAILS_MAP[inspectingEv.id]?.clue || 'Case File'}
                      </span>
                      <span className="re-stamp-badge">
                        {inspectingEv.id?.startsWith('XC') ? 'DECOY' : 'CLASSIFIED'}
                      </span>
                    </div>

                    {inspectingEv.display?.lines?.length > 0 && (
                      <div className="bg-black/5 border-l-4 border-[#7c1d1d] px-3 py-2 space-y-1 font-re-typewriter text-xs text-[#19120b]">
                        {inspectingEv.display.lines.map((l, i) => (
                          <p key={i} className={`m-0 ${i === 0 ? 'font-bold text-[#5e1212]' : ''}`}>{l}</p>
                        ))}
                      </div>
                    )}

                    {ROOM5_EVIDENCE_RICH_META[inspectingEv.id]?.reportLines && (
                      <div className="space-y-2 font-re-dossier text-xs leading-relaxed text-[#251b12]">
                        {ROOM5_EVIDENCE_RICH_META[inspectingEv.id].reportLines.map((p, i) => (
                          <p key={i} className="m-0">{p}</p>
                        ))}
                      </div>
                    )}

                    <div className="p-2.5 rounded bg-[#8b1515]/10 border border-[#8b1515]/30 font-re-typewriter text-[11px] text-[#5e0f0f]">
                      <strong>LEAD:</strong> {ROOM5_EVIDENCE_RICH_META[inspectingEv.id]?.highlight || EVIDENCE_DETAILS_MAP[inspectingEv.id]?.tip}
                    </div>
                  </div>
                ) : (
                  <>
                {/* Meta details card */}
                <div className="bg-[#140e24] p-4 rounded-xl border border-[#3b2a59] space-y-2.5">
                  <h4 className="text-xs font-bold text-[#8f7bff] uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-[#86efac]" />
                    FORENSIC ARCHIVE DATA
                  </h4>
                  <div className="space-y-1.5 text-gray-300">
                    <div className="flex justify-between border-b border-white/5 pb-1">
                      <span className="text-gray-500">Associated Clue:</span>
                      <span className="text-[#cdbfff]">{EVIDENCE_DETAILS_MAP[inspectingEv.id]?.clue || 'Unassigned'}</span>
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
                  💡 Hint: {EVIDENCE_DETAILS_MAP[inspectingEv.id]?.tip || 'Examine the typography and connect with other fragments in this room.'}
                </div>
                  </>
                )}

              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
