import React, { useState, useEffect } from 'react';
import { Sliders, CheckCircle2, Layers, Eye, Lock } from 'lucide-react';
import {
  copyDocumentText,
  createDocumentPreviewSvg,
  downloadDocumentFile,
  formatDocumentText,
  formatEvidenceBundleText,
  sanitizeExportFilename,
} from '../../engine/evidenceExport';

const CONTROL_IMAGE_MAP = {
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

function getFragmentImage(ev) {
  if (ev?.display?.image_file) {
    const raw = ev.display.image_file;
    return raw.startsWith('/') ? raw : `/${raw}`;
  }
  if (ev?.id && CONTROL_IMAGE_MAP[ev.id]) {
    return CONTROL_IMAGE_MAP[ev.id];
  }
  return '/parcel_wrapped.png';
}

export default function ControlBasketModal({
  isOpen,
  onClose,
  evidence = [],
  collectedIds = [],
  basketUnlocked = false,
  totalInRoom = 10,
  roomTitle = 'The Surveillance Morgue',
  onSelectFragment,
}) {
  const [boardFilter, setBoardFilter] = useState('all'); // 'all' | 'sequence' | 'decoy'
  const [inspectingEv, setInspectingEv] = useState(null);
  const [inspectingIndex, setInspectingIndex] = useState(null);
  const [inspectContrast, setInspectContrast] = useState(100);
  const [inspectBrightness, setInspectBrightness] = useState(100);
  const [inspectInvert, setInspectInvert] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [downloadedId, setDownloadedId] = useState(null);
  const [showRawText, setShowRawText] = useState(false);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        if (inspectingEv) {
          setInspectingEv(null);
          setInspectingIndex(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, inspectingEv, onClose]);

  if (!isOpen) return null;

  const handleOpenInspector = (ev, idx) => {
    setInspectingEv(ev);
    setInspectingIndex(idx);
    setInspectContrast(100);
    setInspectBrightness(100);
    setInspectInvert(false);
    setShowRawText(false);
    onSelectFragment?.(ev);
  };

  const handleCopyDoc = async (ev, id) => {
    await copyDocumentText(formatDocumentText(ev));
    setCopiedId(id);
    setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 1800);
  };

  const handleDownloadDoc = (ev, id) => {
    downloadDocumentFile(
      sanitizeExportFilename(ev?.id || id, ev?.display?.title || ev?.title),
      formatDocumentText(ev)
    );
    setDownloadedId(id);
    setTimeout(() => setDownloadedId((prev) => (prev === id ? null : prev)), 1800);
  };

  const hasWrappedItems = !basketUnlocked && evidence.some((ev) => Boolean(ev?.is_wrapped));
  const exportableEvidence = evidence.filter((ev) => !ev?.is_wrapped);
  const isDecoyFragment = (ev) => Boolean(ev?.is_decoy || (ev?.id && String(ev.id).startsWith('XC')));
  const sequenceItems = evidence.filter((ev) => !isDecoyFragment(ev));
  const decoyItems = evidence.filter((ev) => isDecoyFragment(ev));
  const filteredEvidence = hasWrappedItems
    ? evidence
    : evidence.filter((ev) => {
        if (boardFilter === 'sequence') return !isDecoyFragment(ev);
        if (boardFilter === 'decoy') return isDecoyFragment(ev);
        return true;
      });

  const activeRawText = inspectingEv ? formatDocumentText(inspectingEv) : '';
  const emptySlotsCount = hasWrappedItems ? Math.max(0, totalInRoom - evidence.length) : 0;
  const progressPct = Math.min(100, Math.round((collectedIds.length / Math.max(1, totalInRoom)) * 100));

  return (
    <div
      className="corkboard-surface select-none"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          setInspectingEv(null);
          setInspectingIndex(null);
          onClose();
        }
      }}
    >
      {/* Top Masking-Taped Dossier Header + Action Pills */}
      <div
        className="max-w-5xl w-full mx-auto flex flex-wrap items-center justify-between gap-4 mb-3 shrink-0"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="re-dossier-paper px-5 py-2.5 rounded-sm -rotate-[0.4deg] relative">
          <div className="masking-tape absolute -top-2.5 left-4 w-16 h-4 rotate-2" />
          <div className="masking-tape absolute -top-2.5 right-4 w-16 h-4 -rotate-2" />
          <div className="flex items-center gap-2 font-re-typewriter text-[10px] tracking-[0.16em] text-[#5c4832] uppercase">
            <Layers className="w-3.5 h-3.5 text-[#7c1d1d]" />
            <span>
              {roomTitle} — Recovered: {collectedIds.length} / {totalInRoom} fragments
            </span>
          </div>
          <h2 className="font-re-typewriter text-lg sm:text-xl font-bold text-[#1c150f] m-0">
            EVIDENCE BASKET • RECOVERED FRAGMENTS
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {exportableEvidence.length > 0 && (
            <>
              <button
                type="button"
                onClick={async () => {
                  await copyDocumentText(formatEvidenceBundleText(exportableEvidence));
                  setCopiedId('__all__');
                  setTimeout(() => setCopiedId((prev) => (prev === '__all__' ? null : prev)), 1800);
                }}
                className="re-btn"
              >
                <span className="re-btn-circle">{copiedId === '__all__' ? '✓' : '⎘'}</span>
                <span>{copiedId === '__all__' ? 'Copied All' : 'Copy All Evidence'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  downloadDocumentFile(
                    'room5_evidence_bundle.txt',
                    formatEvidenceBundleText(exportableEvidence)
                  );
                  setDownloadedId('__all__');
                  setTimeout(
                    () => setDownloadedId((prev) => (prev === '__all__' ? null : prev)),
                    1800
                  );
                }}
                className="re-btn"
              >
                <span className="re-btn-circle">{downloadedId === '__all__' ? '✓' : '⬇'}</span>
                <span>{downloadedId === '__all__' ? 'Downloaded' : 'Download All'}</span>
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => {
              setInspectingEv(null);
              setInspectingIndex(null);
              onClose();
            }}
            className="re-btn"
            title="Close Basket (ESC)"
          >
            <span className="re-btn-circle">ESC</span>
            <span>Close Basket</span>
          </button>
        </div>
      </div>

      {/* Polished Seal Status Bar (zero spoiler hints) */}
      <div
        className="max-w-5xl w-full mx-auto mb-3.5 shrink-0 px-4 py-3 rounded-lg border"
        style={{
          background: basketUnlocked
            ? 'rgba(18, 36, 24, 0.88)'
            : 'rgba(16, 13, 12, 0.88)',
          borderColor: basketUnlocked
            ? 'rgba(134, 239, 172, 0.35)'
            : 'rgba(196, 162, 101, 0.28)',
          backdropFilter: 'blur(8px)',
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="font-sans text-xs">
            <div className={basketUnlocked ? 'text-[#bbf7d0] font-semibold' : 'text-[#efe7d6] font-medium'}>
              {basketUnlocked
                ? 'All room fragments recovered! Evidence Basket unsealed — clue terminals are now unlocked.'
                : `Fragments remain sealed until all ${totalInRoom} room fragments are recovered.`}
            </div>
            <div className="text-[11px] text-[#a69a84] mt-0.5">
              {basketUnlocked
                ? 'Select any evidence document below to inspect cipher details and cross-reference Clue Terminals [C].'
                : 'Explore the bunker rooms and inspect suspicious fixtures with [E]. Some compartments require sequential recovery.'}
            </div>
          </div>
          <span
            className="px-3 py-1 rounded-full text-[11px] font-mono font-bold border shrink-0"
            style={{
              background: basketUnlocked ? 'rgba(22, 101, 52, 0.5)' : 'rgba(132, 34, 34, 0.35)',
              borderColor: basketUnlocked ? 'rgba(134, 239, 172, 0.4)' : 'rgba(208, 156, 98, 0.45)',
              color: basketUnlocked ? '#86efac' : '#f3d8a4',
            }}
          >
            {collectedIds.length} / {totalInRoom} COLLECTED
          </span>
        </div>

        {/* Sleek Segmented Progress Bar */}
        <div className="mt-2.5 h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${progressPct}%`,
              background: basketUnlocked
                ? 'linear-gradient(90deg, #22c55e, #86efac)'
                : 'linear-gradient(90deg, #991b1b, #d4a45a)',
            }}
          />
        </div>
      </div>

      {/* Category Pills only shown once unsealed (prevents leaking which items are decoys!) */}
      {!hasWrappedItems && evidence.length > 0 && (
        <div
          className="max-w-5xl w-full mx-auto flex flex-wrap items-center gap-2 mb-3 shrink-0"
          onMouseDown={(e) => e.stopPropagation()}
        >
          {[
            { key: 'all', label: `All Fragments (${evidence.length})` },
            { key: 'sequence', label: `Evidence Records (${sequenceItems.length})` },
            { key: 'decoy', label: `Discard Records (${decoyItems.length})` },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setBoardFilter(tab.key)}
              className={`freq-band-btn ${boardFilter === tab.key ? 'active' : ''}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Corkboard Workspace */}
      <div
        className="relative flex-1 max-w-5xl w-full mx-auto overflow-y-auto px-1 py-2"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {filteredEvidence.length === 0 ? (
          <div className="ruled-index-card max-w-xl mx-auto mt-10 px-6 pt-7 pb-6 rounded-sm -rotate-[0.4deg] relative">
            <div className="push-pin absolute top-2.5 left-1/2 -translate-x-1/2" />
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="font-re-typewriter text-sm font-bold text-[#241b13]">
                {evidence.length === 0 ? 'Evidence Basket Empty' : 'No Matching Category'}
              </span>
              <span className="re-stamp-badge">SEALED</span>
            </div>
            <p className="font-re-typewriter text-xs text-[#3b2d1f] m-0 leading-relaxed">
              Your Evidence Basket is empty. Search interactive objects in the room and press{' '}
              <kbd className="px-1.5 py-0.5 rounded bg-[#241b13] text-[#f5ecd9] font-bold">E</kbd>
              . Collect all {totalInRoom} fragments across Substation Delta to unseal the basket and unlock the Clue Terminals.
            </p>
          </div>
        ) : hasWrappedItems ? (
          /* Sleek Uniform 10-Slot Tamper-Sealed Tray when Basket Seal is still active */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 pb-4">
            {filteredEvidence.map((ev, index) => (
              <div
                key={ev.id || index}
                className="relative rounded-lg border p-3.5 flex flex-col justify-between transition"
                style={{
                  background: 'linear-gradient(180deg, rgba(28, 22, 18, 0.94) 0%, rgba(15, 12, 10, 0.96) 100%)',
                  borderColor: 'rgba(196, 162, 101, 0.36)',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.55)',
                }}
              >
                <div className="flex items-center justify-between text-[10px] font-mono mb-2.5">
                  <span className="px-2 py-0.5 rounded bg-[#7c1d1d]/30 border border-[#7c1d1d]/60 text-[#fca5a5] font-bold flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" /> SEALED
                  </span>
                  <span className="text-[#c4a265] font-bold">#{index + 1}</span>
                </div>

                <div className="h-24 rounded bg-black/50 border border-white/5 flex items-center justify-center p-2 mb-2.5">
                  <img
                    src="/parcel_wrapped.png"
                    alt={`Sealed Evidence #${index + 1}`}
                    className="max-h-16 max-w-16 object-contain opacity-90"
                  />
                </div>

                <div>
                  <div className="font-sans text-xs font-semibold text-[#f0eae0] mb-0.5">
                    Sealed Evidence #{index + 1}
                  </div>
                  <div className="font-mono text-[10px] text-[#9e927f]">
                    Unlocks at {totalInRoom}/{totalInRoom}
                  </div>
                </div>
              </div>
            ))}

            {Array.from({ length: emptySlotsCount }).map((_, idx) => {
              const slotNum = filteredEvidence.length + idx + 1;
              return (
                <div
                  key={`empty_${slotNum}`}
                  className="rounded-lg border border-dashed p-3.5 flex flex-col items-center justify-center min-h-[170px] text-center"
                  style={{
                    background: 'rgba(10, 9, 9, 0.42)',
                    borderColor: 'rgba(196, 162, 101, 0.16)',
                  }}
                >
                  <span className="font-mono text-xs font-bold text-[#6e6353] mb-1">
                    SLOT #{slotNum}
                  </span>
                  <span className="font-sans text-[10px] text-[#5c5345]">
                    Awaiting Recovery
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          /* Unsealed Forensic Corkboard Grid with Red Investigative Yarn */
          <div className="relative">
            <svg
              className="hidden md:block absolute inset-0 w-full h-full pointer-events-none opacity-65"
              preserveAspectRatio="none"
            >
              <line x1="15%" y1="18%" x2="48%" y2="35%" stroke="#991b1b" strokeWidth="1.5" />
              <line x1="48%" y1="35%" x2="82%" y2="20%" stroke="#991b1b" strokeWidth="1.5" />
              <line x1="48%" y1="35%" x2="22%" y2="75%" stroke="#991b1b" strokeWidth="1.5" />
              <line x1="48%" y1="35%" x2="78%" y2="74%" stroke="#991b1b" strokeWidth="1.5" />
            </svg>

            <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-4 pt-2">
              {filteredEvidence.map((ev, index) => {
                const disp = ev.display || {};
                const imgSrc = getFragmentImage(ev);
                const fallbackSvg = createDocumentPreviewSvg(ev);
                const isDecoy = isDecoyFragment(ev);
                const tilts = ['-rotate-[0.9deg]', 'rotate-[0.7deg]', '-rotate-[0.5deg]', 'rotate-[0.9deg]'];
                const tiltClass = tilts[index % tilts.length];
                const badgeLabel = isDecoy ? 'DECOY' : ev.id;
                const previewLines = Array.isArray(disp.lines) ? disp.lines : [];

                return (
                  <div
                    key={ev.id || index}
                    onClick={() => handleOpenInspector(ev, index)}
                    className={`relative bg-[#f5f2eb] p-3.5 shadow-xl transition-transform hover:scale-[1.02] flex flex-col justify-between cursor-pointer ${tiltClass}`}
                  >
                    <div className="push-pin absolute -top-1.5 left-1/2 -translate-x-1/2" />
                    <div>
                      <div className="flex items-center justify-between text-[10px] font-re-typewriter text-[#5e4a32] mb-1.5">
                        <span className="px-2 py-0.5 rounded bg-[#e8dfcb] text-[#4b2d16] font-bold">
                          {badgeLabel}
                        </span>
                        {ev.clue_id && (
                          <span className="text-[10px] font-bold text-[#7c1d1d]">{ev.clue_id}</span>
                        )}
                      </div>

                      <div className="relative bg-[#181615] h-28 flex items-center justify-center p-1.5 mb-2 overflow-hidden border border-black/20">
                        <img
                          src={imgSrc}
                          alt={disp.title || ev.id}
                          className="max-h-full max-w-full object-contain"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = fallbackSvg;
                          }}
                        />
                        <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/75 text-[#e6d5b2] text-[9px] font-mono flex items-center gap-1">
                          <Eye className="w-2.5 h-2.5" /> INSPECT
                        </div>
                      </div>

                      <h4 className="font-re-typewriter text-xs font-bold text-[#1c150f] leading-snug mb-1">
                        {disp.title || ev.id}
                      </h4>

                      {previewLines.length > 0 && (
                        <div className="font-re-typewriter text-[10px] text-[#2e241b] border-l-2 border-[#8c1f1f]/45 pl-2 space-y-0.5 max-h-20 overflow-y-auto">
                          {previewLines.slice(0, 3).map((ln, lIdx) => (
                            <p key={lIdx} className="m-0 leading-snug">
                              {ln}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-black/15 flex items-center justify-between gap-1.5">
                      <span className="font-re-typewriter text-[10px] font-bold text-[#6e4e2a] truncate">
                        {ev.part || 'Evidence'}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyDoc(ev, ev.id);
                          }}
                          className="text-[10px] font-sans font-semibold px-2.5 py-0.5 rounded-full bg-[#1a1614] text-[#f3ede0] hover:bg-[#3a1616] transition cursor-pointer"
                        >
                          {copiedId === ev.id ? '✓ Copied' : 'Copy File'}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadDoc(ev, ev.id);
                          }}
                          className="text-[10px] font-sans font-semibold px-2.5 py-0.5 rounded-full bg-[#2a221c] text-[#f3ede0] hover:bg-[#3a1616] transition cursor-pointer"
                        >
                          {downloadedId === ev.id ? '✓ Saved' : 'Save File'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Desk Spread Close-Up Sub-Inspector */}
      {inspectingEv && (
        <div
          className="desk-surface"
          style={{ zIndex: 80 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setInspectingEv(null);
              setInspectingIndex(null);
            }
          }}
        >
          <div
            className="relative w-full max-w-4xl flex flex-col gap-4 py-2 max-h-[92vh] overflow-y-auto"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setInspectingEv(null);
                  setInspectingIndex(null);
                }}
                className="re-btn"
              >
                <span className="re-btn-circle">←</span>
                <span>Back to Evidence Basket</span>
              </button>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyDoc(inspectingEv, inspectingEv.id)}
                  className="re-btn"
                >
                  <span className="re-btn-circle">{copiedId === inspectingEv.id ? '✓' : '⎘'}</span>
                  <span>{copiedId === inspectingEv.id ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadDoc(inspectingEv, inspectingEv.id)}
                  className="re-btn"
                >
                  <span className="re-btn-circle">{downloadedId === inspectingEv.id ? '✓' : '⬇'}</span>
                  <span>{downloadedId === inspectingEv.id ? 'Saved' : 'Download'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowRawText((v) => !v)}
                  className="re-btn"
                >
                  <span className="re-btn-circle">TXT</span>
                  <span>{showRawText ? 'Hide Raw Text' : 'Raw Text'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setInspectingEv(null);
                    setInspectingIndex(null);
                  }}
                  className="re-btn"
                >
                  <span className="re-btn-circle">ESC</span>
                  <span>Close</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
              <div className="md:col-span-5 relative manila-dossier p-4 rounded-sm -rotate-1">
                <div className="masking-tape absolute -top-2.5 left-1/2 -translate-x-1/2 w-20 h-5" />
                <div className="bg-[#181512] p-3 border border-black/20 flex items-center justify-center min-h-[200px]">
                  <img
                    src={getFragmentImage(inspectingEv)}
                    alt={inspectingEv.display?.title || inspectingEv.id}
                    className="max-h-56 max-w-full object-contain transition-all"
                    style={{
                      filter: `contrast(${inspectContrast}%) brightness(${inspectBrightness}%) invert(${inspectInvert ? 1 : 0})`,
                    }}
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = createDocumentPreviewSvg(inspectingEv);
                    }}
                  />
                </div>

                <div className="mt-3 pt-2 border-t border-black/15 space-y-2 text-[11px] font-re-typewriter text-[#2e2014]">
                  <div className="flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1">
                      <Sliders className="w-3.5 h-3.5" /> OPTICAL ENHANCEMENT
                    </span>
                    <button
                      type="button"
                      onClick={() => setInspectInvert((v) => !v)}
                      className={`text-[10px] font-mono px-2.5 py-0.5 rounded border cursor-pointer transition ${
                        inspectInvert
                          ? 'bg-[#7c1d1d] text-[#f5ecd9] border-[#7c1d1d] font-bold'
                          : 'bg-[#1a1614] text-[#f3ede0] border-black/30'
                      }`}
                    >
                      {inspectInvert ? 'INVERT ON' : 'INVERT FILTER'}
                    </button>
                  </div>

                  <div>
                    <div className="flex justify-between mb-0.5">
                      <span>Contrast</span>
                      <span className="font-bold">{inspectContrast}%</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="300"
                      value={inspectContrast}
                      onChange={(e) => setInspectContrast(Number(e.target.value))}
                      className="w-full accent-[#7c1d1d]"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between mb-0.5">
                      <span>Brightness</span>
                      <span className="font-bold">{inspectBrightness}%</span>
                    </div>
                    <input
                      type="range"
                      min="20"
                      max="300"
                      value={inspectBrightness}
                      onChange={(e) => setInspectBrightness(Number(e.target.value))}
                      className="w-full accent-[#7c1d1d]"
                    />
                  </div>
                </div>
              </div>

              <div className="md:col-span-7 space-y-4">
                <div className="relative green-grid-sheet p-5 sm:p-6 rounded-sm rotate-[0.4deg]">
                  <div className="masking-tape absolute -top-3 left-1/2 -translate-x-1/2 w-24 h-6 -rotate-1" />
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-re-typewriter text-[10px] tracking-widest uppercase text-[#2d4f38]">
                      RECOVERED CONTENT // {inspectingEv.display?.corner_mark || inspectingEv.id}
                    </span>
                    <span className="re-stamp-badge">
                      {isDecoyFragment(inspectingEv) ? 'DECOY' : 'VERIFIED'}
                    </span>
                  </div>
                  <h3 className="font-re-typewriter text-lg sm:text-xl font-bold text-[#142018] mb-3">
                    {inspectingEv.display?.title || inspectingEv.id}
                  </h3>

                  {inspectingEv.display?.lines?.length > 0 && (
                    <div className="border-l-2 border-[#23452e]/65 pl-3 mb-3 space-y-1 font-re-typewriter text-xs text-[#101c14]">
                      {inspectingEv.display.lines.map((l, i) => (
                        <p key={i} className="m-0">
                          {l}
                        </p>
                      ))}
                    </div>
                  )}

                  {inspectingEv.secret && Object.keys(inspectingEv.secret).length > 0 && (
                    <div className="mt-3 p-3 rounded-sm bg-[#f5ecd9]/90 border border-[#5c4832]/35 space-y-1 font-re-typewriter text-xs text-[#2b1810]">
                      {Object.entries(inspectingEv.secret).map(([k, v]) => (
                        <div key={k}>
                          <strong className="uppercase mr-1.5 text-[#7c1d1d]">
                            {k.replace(/_/g, ' ')}:
                          </strong>
                          <span>{typeof v === 'string' ? v : JSON.stringify(v)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="ruled-index-card px-5 pt-6 pb-4 rounded-sm rotate-[0.8deg] relative">
                  <div className="push-pin absolute top-2 left-1/2 -translate-x-1/2" />
                  <h4 className="font-re-typewriter text-xs font-bold text-[#5e1212] uppercase tracking-wider flex items-center gap-1.5 mb-2">
                    <CheckCircle2 className="w-4 h-4 text-[#166534]" />
                    FRAGMENT METADATA
                  </h4>
                  <div className="space-y-1 font-re-typewriter text-xs text-[#241b13]">
                    <div className="flex justify-between border-b border-black/10 pb-1">
                      <span className="text-[#5e4a32]">Fragment ID:</span>
                      <span className="font-bold">
                        {inspectingEv.id} (#{(inspectingIndex ?? 0) + 1})
                      </span>
                    </div>
                    {inspectingEv.clue_id && (
                      <div className="flex justify-between border-b border-black/10 pb-1">
                        <span className="text-[#5e4a32]">Associated Clue:</span>
                        <span className="font-bold text-[#7c1d1d]">{inspectingEv.clue_id}</span>
                      </div>
                    )}
                    {inspectingEv.part && (
                      <div className="flex justify-between border-b border-black/10 pb-1">
                        <span className="text-[#5e4a32]">Classification:</span>
                        <span className="font-bold">{inspectingEv.part}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {showRawText && (
              <div className="bg-[#0e0c0b]/95 border border-[#c4a265]/35 rounded-xl p-4 font-mono text-[11px] text-[#e5dcc9] whitespace-pre-wrap max-h-56 overflow-y-auto">
                {activeRawText}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
