import React, { useEffect, useState } from 'react';
import { FileText, Lock, Unlock } from 'lucide-react';
import { ROOM5_EVIDENCE_RICH_META, enrichRoom5EvidenceItem } from '../../engine/simulationControl';
import {
  copyDocumentText,
  createDocumentPreviewSvg,
  downloadDocumentFile,
  formatDocumentText,
  sanitizeExportFilename,
} from '../../engine/evidenceExport';

export default function EvidencePickupModal({
  modalData,
  onClose,
  onUnlockPreview,
}) {
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  useEffect(() => {
    setCopied(false);
    setDownloaded(false);
  }, [modalData]);

  useEffect(() => {
    if (!modalData) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape' || e.key === 'Enter') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modalData, onClose]);

  if (!modalData) return null;

  // Mode 1: Pinned Green Engineering Sheet + Ruled Index Card on Wooden Desk (Image 5 exact inspo!)
  if (modalData.type === 'evidence') {
    const ev = enrichRoom5EvidenceItem(modalData.evidence || {});
    const disp = ev.display || {};
    const rich = ROOM5_EVIDENCE_RICH_META[ev.id] || null;
    const fallbackSvg = createDocumentPreviewSvg(ev, rich);
    const imgSrc = disp.image_file || fallbackSvg;
    const isDecoy = Boolean(ev.is_decoy || (ev.id && ev.id.startsWith('XC')));
    const reportLines = rich?.reportLines || ev.reportLines || [];
    const highlightNote = rich?.highlight || ev.highlight || ev.secret?.note;

    return (
      <div
        className="desk-surface"
        onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      >
        <div
          className="relative w-full max-w-4xl flex flex-col items-center gap-6 py-4"
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* Main Desk Spread: Taped Left Envelope/Photo + Center-Right Green Grid Document + Pinned Index Card */}
          <div className="relative w-full grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
            {/* Left: Taped Manila Sleeve & Polaroid Scan (Images 3 & 5) */}
            <div className="md:col-span-4 relative manila-dossier rounded-sm p-3.5 -rotate-1">
              <div className="masking-tape absolute -top-2.5 left-1/2 -translate-x-1/2 w-20 h-5 rotate-1" />
              <div className="flex items-center justify-between text-[10px] font-re-typewriter text-[#4b3822] mb-2">
                <span>REF // {disp.corner_mark || ev.id}</span>
                <span className="re-stamp-badge">{isDecoy ? 'DISCARD' : 'EVIDENCE'}</span>
              </div>
              <div className="bg-[#f4f1ea] p-2 shadow-inner border border-black/10 flex items-center justify-center min-h-[175px]">
                {imgSrc ? (
                  <img
                    src={imgSrc}
                    alt={disp.title || ev.id}
                    className="max-h-44 max-w-full object-contain"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = fallbackSvg;
                    }}
                  />
                ) : (
                  <FileText className="w-10 h-10 text-[#6e5e44]" />
                )}
              </div>
              <div className="mt-2.5 font-re-typewriter text-[11px] text-[#3a2a18] flex justify-between">
                <span>{modalData.collectedCount}/8 Logged</span>
                <span>{(rich?.location || ev.location) ? (rich?.location || ev.location).split('·')[0].trim() : 'Sector 5'}</span>
              </div>
              {modalData.remainingHere > 0 && (
                <div className="mt-1.5 font-re-typewriter text-[10px] text-[#7c1d1d]">
                  * Another slip remains tucked inside.
                </div>
              )}
            </div>

            {/* Right: Masking-Taped Green Graph Sheet (e7dfa4a4.png inspo!) */}
            <div className="md:col-span-8 relative green-grid-sheet p-6 sm:p-7 rounded-sm rotate-[0.4deg]">
              {/* Realistic masking tape tabs at top & sides */}
              <div className="masking-tape absolute -top-3 left-1/2 -translate-x-1/2 w-24 h-6 -rotate-1" />
              <div className="masking-tape hidden sm:block absolute top-14 -right-4 w-12 h-5 rotate-90" />

              <div className="font-re-typewriter text-[11px] tracking-widest uppercase text-[#2d4f38] mb-1">
                {rich?.classification || ev.classification || 'FIELD ARCHIVE'} // {ev.id}
              </div>
              <h3 className="font-re-typewriter text-xl sm:text-2xl font-bold text-[#142018] mb-3 leading-snug">
                {disp.title || modalData.title}
              </h3>

              {Array.isArray(disp.lines) && disp.lines.length > 0 && (
                <div className="border-l-2 border-[#23452e]/60 pl-3 mb-3 space-y-1 font-re-typewriter text-xs text-[#101c14]">
                  {disp.lines.map((line, i) => (
                    <div key={i} className={i === 0 ? 'font-bold' : ''}>{line}</div>
                  ))}
                </div>
              )}

              {reportLines.length > 0 && (
                <div className="space-y-2 font-re-typewriter text-xs leading-relaxed text-[#18291e] pr-2">
                  {reportLines.map((p, idx) => (
                    <p key={idx} className="m-0">{p}</p>
                  ))}
                </div>
              )}

              {/* Overlapping Push-Pinned Cream Ruled Index Card for Key Clue Lead (Image 5!) */}
              {highlightNote && (
                <div className="mt-5 md:ml-auto md:max-w-md ruled-index-card px-5 pt-6 pb-4 rounded-sm rotate-[1.4deg]">
                  <div className="push-pin absolute top-2 left-1/2 -translate-x-1/2" />
                  <div className="font-re-typewriter text-xs leading-relaxed text-[#241b13] font-bold">
                    {highlightNote}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RE2R desk actions: AI Copy / Download pills + Close */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 w-full">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  const raw = formatDocumentText(ev, rich);
                  await copyDocumentText(raw);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1800);
                }}
                className="re-btn"
              >
                <span className="re-btn-circle">{copied ? '✓' : '⎘'}</span>
                <span>{copied ? 'Copied' : 'Copy Content'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const raw = formatDocumentText(ev, rich);
                  downloadDocumentFile(sanitizeExportFilename(ev.id, disp.title || modalData.title), raw);
                  setDownloaded(true);
                  setTimeout(() => setDownloaded(false), 1800);
                }}
                className="re-btn"
              >
                <span className="re-btn-circle">{downloaded ? '✓' : '⬇'}</span>
                <span>{downloaded ? 'Downloaded' : 'Download File'}</span>
              </button>
            </div>
            <button type="button" onClick={onClose} className="re-btn">
              <span className="re-btn-circle">ESC</span>
              <span>Put Down</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Mode 2: Multi-Room Progression Lockout Popup
  if (modalData.type === 'locked_terminal') {
    const lockedSummary = {
      id: modalData.terminalName || 'TERMINAL_LEADS',
      title: `TERMINAL ACCESS LOCKED — ${modalData.terminalName}`,
      classification: 'INVESTIGATION LEADS // SECTOR 5',
      lines: [
        `${modalData.terminalName} requires all 8 evidence records across the bunker (${modalData.collectedCount}/8 recovered).`,
        'Control Bay (5B): Chair, Wall Clipboard, Fuse Box, Relay Shelf',
        'Locker Annex (5C): Akai Reel-to-Reel Tape Deck',
        'Observation Wing (5D): Exposed Loop 7-C Floor Conduit outside Chamber 3',
        'Relay Vault (5F): Auxiliary Generator Steel Relay Rack',
      ],
    };
    return (
      <div
        className="modal-overlay"
        onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      >
        <div
          className="modal-panel"
          style={{ width: '94vw', maxWidth: 500, display: 'flex', flexDirection: 'column', gap: 14 }}
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#d4c8ae]" />
              <span className="font-re-display text-xs font-bold tracking-widest text-[#eceae4] uppercase">
                Terminal Restricted
              </span>
            </div>
            <button type="button" onClick={onClose} className="re-btn" aria-label="Close">
              <span className="re-btn-circle">ESC</span>
              <span>Close</span>
            </button>
          </div>

          <div className="space-y-3.5 text-xs font-re-typewriter">
            <p className="text-[#d4cfc4] leading-relaxed m-0">
              {modalData.terminalName} requires all 8 evidence records across the bunker ({modalData.collectedCount}/8 recovered).
            </p>
            <div className="ruled-index-card p-3.5 space-y-1.5 text-[11px]">
              <div className="font-bold text-[#7c1d1d] mb-1">Active Investigation Leads:</div>
              <div>Control Bay (5B): Chair, Wall Clipboard, Fuse Box, Relay Shelf</div>
              <div>Locker Annex (5C): Akai Reel-to-Reel Tape Deck</div>
              <div>Observation Wing (5D): Exposed Loop 7-C Floor Conduit outside Chamber 3</div>
              <div>Relay Vault (5F): Auxiliary Generator Steel Relay Rack</div>
            </div>

            <div className="flex flex-wrap gap-2 pt-1 justify-between items-center">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    await copyDocumentText(formatDocumentText(lockedSummary));
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1800);
                  }}
                  className="re-btn"
                >
                  <span className="re-btn-circle">{copied ? '✓' : '⎘'}</span>
                  <span>{copied ? 'Copied' : 'Copy Leads'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    downloadDocumentFile('delta_investigation_leads.txt', formatDocumentText(lockedSummary));
                    setDownloaded(true);
                    setTimeout(() => setDownloaded(false), 1800);
                  }}
                  className="re-btn"
                >
                  <span className="re-btn-circle">{downloaded ? '✓' : '⬇'}</span>
                  <span>{downloaded ? 'Downloaded' : 'Download Leads'}</span>
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {onUnlockPreview && (
                  <button type="button" onClick={onUnlockPreview} className="re-btn">
                    <span className="re-btn-circle"><Unlock className="w-3 h-3" /></span>
                    <span>Unlock Consoles (Preview)</span>
                  </button>
                )}
                <button type="button" onClick={onClose} className="re-btn">
                  <span className="re-btn-circle">E</span>
                  <span>Continue Search</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Mode 3: Interactive World Case File / Field Inspection (Unified Full Forensic Sheet)
  const doc = enrichRoom5EvidenceItem({ ...modalData, kind: modalData.kind || 'world_doc' });
  const docDisp = doc.display || {};
  const docLines = docDisp.lines?.length ? docDisp.lines : (doc.body ? [doc.body] : []);
  const docReportLines = Array.isArray(doc.reportLines) ? doc.reportLines : [];
  const docHighlight = doc.highlight || doc.secret?.note || '';

  return (
    <div
      className="desk-surface"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="relative w-full max-w-2xl flex flex-col gap-5"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="relative green-grid-sheet p-6 sm:p-8 rounded-sm -rotate-[0.4deg]">
          <div className="masking-tape absolute -top-3 left-1/2 -translate-x-1/2 w-24 h-6 rotate-1" />
          <div className="flex items-center justify-between border-b border-black/20 pb-2 mb-4 gap-3">
            <div>
              <div className="font-re-typewriter text-[10px] tracking-[0.2em] text-[#284a33] uppercase">
                {doc.classification || 'FIELD DOCUMENT'} // {docDisp.corner_mark || doc.id || 'RECORD'}
              </div>
              {doc.location && (
                <div className="font-re-typewriter text-[10px] text-[#45634d]">
                  {doc.location}
                </div>
              )}
              <h3 className="font-re-typewriter text-lg sm:text-xl font-bold text-[#142018] m-0 mt-0.5">
                {docDisp.title || doc.title || 'CASE RECORD'}
              </h3>
            </div>
            <span className="re-stamp-badge shrink-0">FILED IN [B]</span>
          </div>

          {docLines.length > 0 && (
            <div className="space-y-2.5 font-re-typewriter text-xs leading-relaxed text-[#16261c] border-l-2 border-[#23452e]/50 pl-3 mb-3">
              {docLines.map((line, i) => (
                <p key={i} className={`m-0 ${i === 0 ? 'font-bold text-[#101c14]' : ''}`}>
                  {line}
                </p>
              ))}
            </div>
          )}

          {docReportLines.length > 0 && (
            <div className="space-y-2 font-re-typewriter text-xs leading-relaxed text-[#18291e] mt-2">
              {docReportLines.map((line, i) => (
                <p key={i} className="m-0">{line}</p>
              ))}
            </div>
          )}

          {docHighlight && (
            <div className="mt-5 md:ml-auto md:max-w-md ruled-index-card px-5 pt-6 pb-4 rounded-sm rotate-[1.4deg]">
              <div className="push-pin absolute top-2 left-1/2 -translate-x-1/2" />
              <div className="font-re-typewriter text-xs font-bold text-[#241b13]">
                {docHighlight}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2.5 w-full">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={async () => {
                const raw = formatDocumentText(doc);
                await copyDocumentText(raw);
                setCopied(true);
                setTimeout(() => setCopied(false), 1800);
              }}
              className="re-btn"
            >
              <span className="re-btn-circle">{copied ? '✓' : '⎘'}</span>
              <span>{copied ? 'Copied' : 'Copy Content'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                const raw = formatDocumentText(doc);
                downloadDocumentFile(sanitizeExportFilename(doc.id, docDisp.title || doc.title), raw);
                setDownloaded(true);
                setTimeout(() => setDownloaded(false), 1800);
              }}
              className="re-btn"
            >
              <span className="re-btn-circle">{downloaded ? '✓' : '⬇'}</span>
              <span>{downloaded ? 'Downloaded' : 'Download File'}</span>
            </button>
          </div>
          <button type="button" onClick={onClose} className="re-btn">
            <span className="re-btn-circle">ESC</span>
            <span>Put Down</span>
          </button>
        </div>
      </div>
    </div>
  );
}
