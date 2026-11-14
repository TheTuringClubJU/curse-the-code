import React, { useState, useEffect } from 'react';
import { Sliders, Layers, Eye, Lock, Camera } from 'lucide-react';
import {
  copyDocumentText,
  createDocumentPreviewSvg,
  downloadDocumentFile,
  formatDocumentText,
  formatEvidenceBundleText,
  sanitizeExportFilename,
} from '../../engine/evidenceExport';
import OpenJournalSpread from './OpenJournalSpread';
import { resolveJournalProfile } from './journalProfile';
import {
  resolveSealedSpecimenLead,
  resolveUnsealedEvidenceGuide,
} from './deltaClueGuides';

const escapeXml = (str) =>
  String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

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
  return createDocumentPreviewSvg(ev || { id: 'DOC', title: 'Field Manuscript' });
}

// Non-spoiler archival aged-paper document plate matching uniform Courier Prime typography
function createSealedManuscriptThumbSvg(index, total = 10) {
  const num = index + 1;
  const padNum = String(num).padStart(2, '0');
  const lead = resolveSealedSpecimenLead(index);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 300" width="420" height="300">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#f3ead2"/>
        <stop offset="100%" stop-color="#dfd0ae"/>
      </linearGradient>
      <pattern id="ruled" width="420" height="24" patternUnits="userSpaceOnUse">
        <line x1="0" y1="23" x2="420" y2="23" stroke="#8c7556" stroke-opacity="0.18" stroke-width="1"/>
      </pattern>
    </defs>
    <rect width="420" height="300" rx="6" fill="url(#bg)"/>
    <rect width="420" height="300" rx="6" fill="url(#ruled)"/>
    <line x1="42" y1="12" x2="42" y2="288" stroke="#991b1b" stroke-opacity="0.28" stroke-width="1.2"/>
    <text x="56" y="34" font-family="Courier Prime, Courier New, monospace" font-size="10.5" font-weight="bold" fill="#7c1d1d" letter-spacing="1.1">${escapeXml(lead.plateHeading)}</text>
    <text x="56" y="50" font-family="Courier Prime, Courier New, monospace" font-size="10" fill="#5e4933">PARCEL #${padNum} OF ${total} // FIELD INTERCEPT</text>
    <g transform="translate(306, 22) rotate(5)">
      <rect width="92" height="24" rx="3" fill="none" stroke="#8c1f1f" stroke-width="1.8" stroke-dasharray="3 2"/>
      <text x="46" y="16" font-family="Courier Prime, Courier New, monospace" font-size="10.5" font-weight="bold" text-anchor="middle" fill="#8c1f1f">SEALED</text>
    </g>
    <line x1="56" y1="64" x2="394" y2="64" stroke="#6b553c" stroke-opacity="0.45" stroke-width="1"/>
    <text x="56" y="90" font-family="Courier Prime, Courier New, monospace" font-size="15" font-weight="bold" fill="#1e150e">SEALED EVIDENCE #${num}</text>
    <line x1="56" y1="102" x2="230" y2="102" stroke="#8c1f1f" stroke-width="1.4" opacity="0.7"/>
    <text x="56" y="130" font-family="Courier Prime, Courier New, monospace" font-size="11.5" font-weight="bold" fill="#2c2117">${escapeXml(lead.plateLines[0] || '')}</text>
    <text x="56" y="154" font-family="Courier Prime, Courier New, monospace" font-size="11.5" fill="#2c2117">${escapeXml(lead.plateLines[1] || '')}</text>
    <text x="56" y="178" font-family="Courier Prime, Courier New, monospace" font-size="11.5" fill="#2c2117">${escapeXml(lead.plateLines[2] || '')}</text>
    <text x="56" y="202" font-family="Courier Prime, Courier New, monospace" font-size="11.5" font-weight="bold" fill="#7c1d1d">${escapeXml(lead.plateLines[3] || '')}</text>
    <rect x="56" y="232" width="336" height="44" rx="4" fill="#e5d5b3" stroke="#8a7250" stroke-opacity="0.45" stroke-width="1"/>
    <text x="68" y="250" font-family="Courier Prime, Courier New, monospace" font-size="9.5" font-weight="bold" fill="#7c1d1d">${escapeXml(lead.badgeLabel)}</text>
    <text x="68" y="266" font-family="Courier Prime, Courier New, monospace" font-size="9.5" fill="#2e2217">${escapeXml(lead.plateFooter)}</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export default function ControlBasketModal({
  isOpen,
  onClose,
  evidence = [],
  collectedIds = [],
  basketUnlocked = false,
  totalInRoom = 10,
  roomTitle = 'The Surveillance Morgue',
  propSnapshots = {},
  onSelectFragment,
}) {
  const [boardFilter, setBoardFilter] = useState('all'); // 'all' | 'sequence' | 'decoy'
  const [inspectingEv, setInspectingEv] = useState(null);
  const [inspectingIndex, setInspectingIndex] = useState(null);
  const [inspectContrast, setInspectContrast] = useState(100);
  const [inspectBrightness, setInspectBrightness] = useState(100);
  const [inspectInvert, setInspectInvert] = useState(false);
  const [polaroidMode, setPolaroidMode] = useState('plate'); // 'plate' | 'snapshot'
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
    setPolaroidMode(propSnapshots?.[ev?.id] ? 'snapshot' : 'plate');
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
  const cleanTestPrefix = (s) => String(s ?? '').replace(/^TEST:\s*/i, '').trim();
  const enrichUnsealed = (ev) => {
    const guide = resolveUnsealedEvidenceGuide(ev);
    const disp = ev?.display || {};
    const rawLines = Array.isArray(disp.lines) ? disp.lines : (Array.isArray(ev?.lines) ? ev.lines : []);
    const baseReport = Array.isArray(ev?.reportLines) ? ev.reportLines : [];
    return {
      ...ev,
      title: cleanTestPrefix(disp.title || ev?.title || ev?.id),
      lines: rawLines.map(cleanTestPrefix),
      reportLines: guide ? [...baseReport, ...guide.reportLines] : baseReport,
    };
  };
  const exportableEvidence = evidence.filter((ev) => !ev?.is_wrapped).map(enrichUnsealed);
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
                ? 'All room fragments recovered! Verification clue terminals in Control Bay 5B are unlocked.'
                : hasWrappedItems
                ? `Fragments remain sealed until all ${totalInRoom} room fragments are recovered.`
                : `${collectedIds.length}/${totalInRoom} records recovered & readable — collect all ${totalInRoom} to unlock Verification Terminals [C].`}
            </div>
            <div className="text-[11px] text-[#a69a84] mt-0.5">
              {basketUnlocked
                ? 'Select any evidence document below to inspect cipher details and cross-reference Clue Terminals [C].'
                : hasWrappedItems
                ? 'Explore the bunker rooms and inspect suspicious fixtures in sequential order with [E].'
                : 'Read recovered records below as you explore Substation Delta with [E].'}
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

      {/* Category Pills only shown once unsealed & decoys exist */}
      {!hasWrappedItems && evidence.length > 0 && decoyItems.length > 0 && (
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
          /* Sleek Rounded Tamper-Sealed Manuscript Grid with Investigative Leads & Voice Machine Prep */
          <div className="space-y-4 pb-4">
            <div
              className="rounded-2xl px-4 py-3.5 text-xs border border-[#d4b06a]/25"
              style={{
                background: 'linear-gradient(135deg, rgba(35, 25, 19, 0.92), rgba(18, 13, 10, 0.94))',
                boxShadow: '0 10px 28px rgba(0, 0, 0, 0.4)',
              }}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                <span className="font-mono text-[10.5px] font-bold tracking-[0.14em] text-[#e5c17d] uppercase">
                  CURFEW INCIDENT CASEBOARD // SUBSTATION DELTA
                </span>
                <span className="font-mono text-[10px] text-[#cbb694]">
                  {collectedIds.length}/{totalInRoom} FILED · CLICK ANY PARCEL TO EXAMINE
                </span>
              </div>
              <div className="font-journal-typewriter text-[12px] leading-relaxed text-[#e5d9c3]">
                Recovered parcels carry torn operator marginalia from 14 AUG – 07 NOV 1983. Piece together who remained{' '}
                <strong className="text-[#f5e1ba]">Active</strong> after curfew, which{' '}
                <strong className="text-[#f5e1ba]">Channel 7 X-AUTH</strong> stamp belongs to them, and what Chamber 3 hides inside the{' '}
                <strong className="text-[#f5e1ba]">HIGH-band Voice Machine</strong>.
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredEvidence.map((ev, index) => {
                const lead = resolveSealedSpecimenLead(index);
                const snapThumb = ev?.id ? propSnapshots?.[ev.id] : null;
                const thumbSrc = snapThumb || createSealedManuscriptThumbSvg(index, totalInRoom);
                const sealedDoc = {
                  id: `SEALED-${index + 1}`,
                  title: `Sealed Evidence #${index + 1} (${lead.badgeLabel})`,
                  classification: lead.code,
                  lines: [
                    ...lead.lines,
                    ...lead.reportLines,
                    `Custody Status: ${collectedIds.length}/${totalInRoom} recovered in Basket [B].`,
                  ],
                  highlight: lead.highlight,
                };

                return (
                  <div
                    key={ev.id || index}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleOpenInspector(ev, index)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleOpenInspector(ev, index);
                      }
                    }}
                    className="group relative rounded-2xl p-4 flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 cursor-pointer"
                    style={{
                      background:
                        'linear-gradient(165deg, rgba(32, 25, 20, 0.94) 0%, rgba(16, 13, 11, 0.96) 100%)',
                      boxShadow:
                        '0 14px 32px rgba(0, 0, 0, 0.52), inset 0 1px 0 rgba(232, 202, 146, 0.14)',
                    }}
                  >
                    <div>
                      <div className="flex items-center justify-between text-[10px] font-mono mb-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-[#7c1d1d]/35 text-[#fca5a5] font-bold flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5" /> SEALED
                        </span>
                        <span className="text-[#d4b06a] font-bold">#{index + 1}</span>
                      </div>

                      <div className="font-mono text-[9.5px] font-bold tracking-wider text-[#e5c17d] mb-2 truncate">
                        {lead.badgeLabel}
                      </div>

                      <div className="relative h-32 rounded-xl bg-[#0e0b09]/80 flex items-center justify-center overflow-hidden mb-3">
                        <img
                          src={thumbSrc}
                          alt={`Sealed Evidence #${index + 1}`}
                          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-200"
                        />
                        <div
                          className="absolute bottom-2 right-2 px-2.5 py-0.5 rounded-full bg-[#1a120f]/88 backdrop-blur-sm text-[#e8c684] text-[9.5px] font-semibold tracking-wider flex items-center gap-1"
                          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                        >
                          <Eye className="w-2.5 h-2.5" /> OPEN RECORD
                        </div>
                      </div>

                      <div
                        className="text-base font-bold text-[#f6efe2] mb-1 leading-tight"
                        style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                      >
                        Sealed Evidence #{index + 1}
                      </div>
                      <p className="font-journal-typewriter text-[11px] leading-snug text-[#d9cbb3] m-0 mb-1.5 line-clamp-2">
                        {lead.cardExcerpt}
                      </p>
                      <div className="font-mono text-[9.5px] text-[#a59173]">
                        {snapThumb ? '3D snapshot logged · ' : ''}
                        Full cipher unseals at {totalInRoom}/{totalInRoom}
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyDoc(sealedDoc, `sealed_${index}`);
                        }}
                        className="text-[10.5px] font-semibold px-3.5 py-1 rounded-full bg-[#2a1917] text-[#f3e6d0] hover:bg-[#7a1c1c] transition cursor-pointer"
                        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                      >
                        {copiedId === `sealed_${index}` ? '✓ Copied' : 'Copy'}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadDoc(sealedDoc, `sealed_${index}`);
                        }}
                        className="text-[10.5px] font-semibold px-3.5 py-1 rounded-full bg-[#2a1917] text-[#f3e6d0] hover:bg-[#7a1c1c] transition cursor-pointer"
                        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                      >
                        {downloadedId === `sealed_${index}` ? '✓ Saved' : 'Download'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {emptySlotsCount > 0 && (
              <div className="flex justify-center pt-1">
                <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-[#15110e]/85 text-[11px] font-mono text-[#bca98c] shadow-md">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#c4a265]" />
                  <span>
                    {emptySlotsCount} hidden {emptySlotsCount === 1 ? 'compartment' : 'compartments'} still remaining in Substation Delta
                  </span>
                </div>
              </div>
            )}
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
                const unsealedGuide = resolveUnsealedEvidenceGuide(ev);
                const enrichedDoc = enrichUnsealed(ev);
                const tilts = ['-rotate-[0.9deg]', 'rotate-[0.7deg]', '-rotate-[0.5deg]', 'rotate-[0.9deg]'];
                const tiltClass = tilts[index % tilts.length];
                const badgeLabel = isDecoy ? 'DECOY' : ev.id;
                const cleanTitle = cleanTestPrefix(disp.title || ev.id);
                const rawPreviewLines = Array.isArray(disp.lines) ? disp.lines : [];
                const previewLines = rawPreviewLines.map(cleanTestPrefix);

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
                          alt={cleanTitle}
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

                      <h4
                        className="text-sm font-bold text-[#1c150f] leading-snug mb-1.5"
                        style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                      >
                        {cleanTitle}
                      </h4>

                      {previewLines.length > 0 && (
                        <div className="font-re-typewriter text-[10.5px] text-[#2e241b] border-l-2 border-[#8c1f1f]/55 pl-2.5 space-y-1 max-h-28 overflow-y-auto">
                          {previewLines.slice(0, 6).map((ln, lIdx) => (
                            <p key={lIdx} className="m-0 leading-snug">
                              {ln}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-black/15 flex items-center justify-between gap-1.5">
                      <span className="font-re-typewriter text-[10px] font-bold text-[#6e4e2a] truncate">
                        {ev.part || unsealedGuide?.terminalRef || 'Evidence'}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyDoc(enrichedDoc, ev.id);
                          }}
                          className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-[#2a1917] text-[#f5ecd9] hover:bg-[#7a1c1c] transition cursor-pointer"
                          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                        >
                          {copiedId === ev.id ? '✓ Copied' : 'Copy File'}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadDoc(enrichedDoc, ev.id);
                          }}
                          className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-[#2a1917] text-[#f5ecd9] hover:bg-[#7a1c1c] transition cursor-pointer"
                          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
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

      {/* Open Field-Journal Close-Up Sub-Inspector */}
      {inspectingEv && (() => {
        const isSealedInspect = Boolean(hasWrappedItems || inspectingEv.is_wrapped);
        const slotNum = (inspectingIndex ?? 0) + 1;
        const remainingCount = Math.max(0, totalInRoom - collectedIds.length);
        const sealedLead = isSealedInspect ? resolveSealedSpecimenLead(inspectingIndex ?? 0) : null;
        const unsealedGuide = !isSealedInspect ? resolveUnsealedEvidenceGuide(inspectingEv) : null;
        const disp = inspectingEv.display || {};
        const cleanInspectedTitle = cleanTestPrefix(disp.title || inspectingEv.title || inspectingEv.id);
        const rawUnsealedLines = Array.isArray(disp.lines)
          ? disp.lines
          : Array.isArray(inspectingEv.lines)
          ? inspectingEv.lines
          : [];
        const lines = isSealedInspect ? sealedLead.lines : rawUnsealedLines.map(cleanTestPrefix);
        const baseReportLines = Array.isArray(inspectingEv.reportLines) ? inspectingEv.reportLines : [];
        const reportLines = isSealedInspect
          ? sealedLead.reportLines
          : unsealedGuide
          ? [...baseReportLines, ...unsealedGuide.reportLines]
          : baseReportLines;
        const hasPropSnap = Boolean(inspectingEv?.id && propSnapshots?.[inspectingEv.id]);
        const plateImg = isSealedInspect
          ? createSealedManuscriptThumbSvg(inspectingIndex ?? 0, totalInRoom)
          : getFragmentImage(inspectingEv);
        const polaroidImg =
          polaroidMode === 'snapshot' && hasPropSnap ? propSnapshots[inspectingEv.id] : plateImg;
        const isDecoy = !isSealedInspect && isDecoyFragment(inspectingEv);
        const profile = resolveJournalProfile({
          kind: 'evidence',
          id: isSealedInspect ? `SEALED-${slotNum}` : inspectingEv.id,
          title: isSealedInspect ? `Sealed Evidence #${slotNum}` : cleanInspectedTitle,
          classification: isSealedInspect
            ? sealedLead.code
            : `RECOVERED CONTENT // ${disp.corner_mark || inspectingEv.id}`,
          sourceName: isSealedInspect
            ? 'Substation Delta'
            : inspectingEv.part || inspectingEv.clue_id || 'Substation Delta',
          highlight: isSealedInspect
            ? sealedLead.highlight
            : inspectingEv.highlight || inspectingEv.secret?.note || '',
          lines,
        });
        const safeRawText = isSealedInspect
          ? formatDocumentText({
              id: `SEALED-${slotNum}`,
              title: `Sealed Evidence #${slotNum}`,
              classification: sealedLead.code,
              lines: [...lines, ...reportLines, `Next Step: ${sealedLead.nextStep}`],
              highlight: sealedLead.highlight,
            })
          : formatDocumentText({
              ...inspectingEv,
              title: cleanInspectedTitle,
              lines,
              reportLines,
            });

        const extraLeft = (
          <div className="space-y-3 pt-1">
            {!isSealedInspect && inspectingEv.secret && Object.keys(inspectingEv.secret).length > 0 && (
              <div className="p-3.5 rounded-xl bg-[#e6d6b5]/88 space-y-1.5 font-journal-tech text-xs text-[#2b1810]">
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

            {isSealedInspect && (
              <div className="p-3.5 rounded-xl bg-[#e6d6b5]/85 space-y-2 font-journal-tech text-[11.5px] text-[#2b1810]">
                <div className="flex items-center justify-between border-b border-[#8a7558]/30 pb-1">
                  <span className="font-bold text-[#7c1d1d] uppercase">Target Lead</span>
                  <span className="font-semibold">{sealedLead.badgeLabel}</span>
                </div>
                <div className="flex items-center justify-between border-b border-[#8a7558]/30 pb-1">
                  <span className="font-bold text-[#4a3723] uppercase">Basket Progress</span>
                  <span>{collectedIds.length}/{totalInRoom} logged ({remainingCount} remaining)</span>
                </div>
                <div className="text-[11px] leading-snug text-[#3a2a19]">
                  <strong className="text-[#7c1d1d] uppercase mr-1">Next Sweep:</strong>
                  {sealedLead.nextStep}
                </div>
              </div>
            )}

            {showRawText && (
              <div className="bg-[#14100d]/95 rounded-xl p-3 font-mono text-[10.5px] text-[#e8decb] whitespace-pre-wrap max-h-40 overflow-y-auto">
                {safeRawText}
              </div>
            )}
          </div>
        );

        const polaroidFooter = !isSealedInspect ? (
          <div className="mt-2.5 pt-2 border-t border-black/15 space-y-1.5 text-[10px] font-mono text-[#2e2014]">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold flex items-center gap-1 text-[#4a3520]">
                <Sliders className="w-3 h-3" /> PLATE OPTICS
              </span>
              <button
                type="button"
                onClick={() => setInspectInvert((v) => !v)}
                className={`text-[9.5px] font-semibold px-2.5 py-0.5 rounded-full cursor-pointer transition ${
                  inspectInvert
                    ? 'bg-[#7c1d1d] text-[#f5ecd9]'
                    : 'bg-[#2a1917] text-[#f3ede0]'
                }`}
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                {inspectInvert ? 'INVERT ON' : 'INVERT FILTER'}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2.5 items-center">
              <label className="block">
                <div className="flex justify-between text-[9.5px]">
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
              </label>
              <label className="block">
                <div className="flex justify-between text-[9.5px]">
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
              </label>
            </div>
          </div>
        ) : null;

        const polaroidHeader = hasPropSnap ? (
          <div className="flex items-center justify-between gap-1 mb-1.5">
            <button
              type="button"
              onClick={() => setPolaroidMode((m) => (m === 'snapshot' ? 'plate' : 'snapshot'))}
              className="w-full text-[10px] font-semibold px-3 py-1 rounded-full bg-[#2a1917] text-[#efe5cf] hover:bg-[#7a1c1c] transition flex items-center justify-center gap-1.5 cursor-pointer"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              <Camera className="w-3 h-3" />
              <span>
                {polaroidMode === 'snapshot'
                  ? 'Showing 3D Prop Photo (Switch to Document Plate)'
                  : 'Showing Document Plate (Switch to 3D Photo)'}
              </span>
            </button>
          </div>
        ) : null;

        return (
          <div className="fixed inset-0 z-[80]">
            <OpenJournalSpread
              classification={
                isSealedInspect
                  ? `${sealedLead.code} // ${collectedIds.length}/${totalInRoom}`
                  : `RECOVERED CONTENT // ${disp.corner_mark || inspectingEv.id}`
              }
              cornerMark={isSealedInspect ? `SEALED #${slotNum}` : `${inspectingEv.id} (#${slotNum})`}
              location={
                isSealedInspect
                  ? `Evidence Basket [B] · ${sealedLead.badgeLabel}`
                  : inspectingEv.clue_id
                  ? `Associated Clue: ${inspectingEv.clue_id}`
                  : roomTitle
              }
              statusTag={isSealedInspect ? `${collectedIds.length}/${totalInRoom} SEALED` : inspectingEv.part || ''}
              sealLabel={isSealedInspect ? 'SEALED' : isDecoy ? 'DECOY' : 'VERIFIED'}
              title={isSealedInspect ? `Sealed Evidence #${slotNum}` : cleanInspectedTitle}
              writeup={isSealedInspect ? '' : profile.writeup}
              lines={lines}
              reportLines={reportLines}
              extraLeft={extraLeft}
              fontClass={profile.fontClass}
              polaroidSrc={polaroidImg}
              polaroidAlt={isSealedInspect ? `Sealed Evidence #${slotNum}` : cleanInspectedTitle}
              polaroidFallbackData={isSealedInspect ? { id: `SEALED-${slotNum}`, title: `Sealed Evidence #${slotNum}` } : { ...inspectingEv, title: cleanInspectedTitle, lines }}
              polaroidCaption={
                isSealedInspect
                  ? sealedLead.highlight
                  : profile.caption
              }
              polaroidStyle={{
                filter: `contrast(${inspectContrast}%) brightness(${inspectBrightness}%) invert(${inspectInvert ? 1 : 0})`,
              }}
              polaroidHeader={polaroidHeader}
              polaroidFooter={polaroidFooter}
              exportText={safeRawText}
              exportFilename={sanitizeExportFilename(
                isSealedInspect ? `sealed_${slotNum}` : inspectingEv.id,
                isSealedInspect ? `Sealed Evidence ${slotNum}` : cleanInspectedTitle
              )}
              copyLabel="Copy"
              downloadLabel="Download"
              secondaryAction={
                <div className="flex flex-wrap items-center gap-2">
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
                    <span className="re-btn-circle">←</span>
                    <span>Back to Evidence Basket</span>
                  </button>
                </div>
              }
              onClose={() => {
                setInspectingEv(null);
                setInspectingIndex(null);
              }}
            />
          </div>
        );
      })()}
    </div>
  );
}
