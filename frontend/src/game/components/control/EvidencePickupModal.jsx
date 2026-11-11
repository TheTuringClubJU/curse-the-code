import React, { useEffect, useState } from 'react';
import { FileText, Lock, ShieldCheck } from 'lucide-react';
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

  if (modalData.type === 'evidence') {
    const ev = modalData.evidence || {};
    const disp = ev.display || {};
    const totalCount = modalData.totalCount ?? 10;
    const isWrapped = Boolean(ev.is_wrapped);
    const fallbackSvg = isWrapped ? '/parcel_wrapped.png' : createDocumentPreviewSvg(ev, null);
    const imgSrc = isWrapped ? '/parcel_wrapped.png' : (disp.image_file || fallbackSvg);
    const isDecoy = !isWrapped && Boolean(ev.is_decoy || (ev.id && ev.id.startsWith('XC')));
    const reportLines = Array.isArray(ev.reportLines) ? ev.reportLines : [];
    const highlightNote = ev.highlight || ev.secret?.note || '';

    return (
      <div
        className="desk-surface"
        onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      >
        <div
          className="relative w-full max-w-4xl flex flex-col items-center gap-6 py-4"
          onMouseDown={(e) => e.stopPropagation()}
        >
          {isWrapped ? (
            /* Clear, tactile Tamper-Sealed Evidence Acquisition Spread */
            <div className="relative w-full max-w-2xl grid grid-cols-1 sm:grid-cols-12 gap-5 items-stretch">
              <div className="sm:col-span-5 relative manila-dossier rounded-sm p-4 -rotate-1 flex flex-col justify-between">
                <div className="masking-tape absolute -top-2.5 left-1/2 -translate-x-1/2 w-20 h-5 rotate-1" />
                <div className="flex items-center justify-between text-[10px] font-re-typewriter text-[#4b3822] mb-2">
                  <span>SPECIMEN #{modalData.collectedCount}</span>
                  <span className="re-stamp-badge">LOGGED</span>
                </div>
                <div className="bg-[#161311] p-4 border border-black/25 flex items-center justify-center min-h-[155px]">
                  <img
                    src="/parcel_wrapped.png"
                    alt="Sealed Evidence Fragment"
                    className="max-h-28 max-w-full object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.85)]"
                  />
                </div>
                <div className="mt-2.5 font-re-typewriter text-[11px] font-bold text-[#3a2a18] flex justify-between">
                  <span>Basket: {modalData.collectedCount} / {totalCount}</span>
                  <span>SEAL ACTIVE</span>
                </div>
              </div>

              <div className="sm:col-span-7 relative re-dossier-paper p-6 rounded-sm rotate-[0.4deg] flex flex-col justify-between">
                <div className="masking-tape absolute -top-3 left-1/2 -translate-x-1/2 w-24 h-5 -rotate-1" />
                <div>
                  <div className="flex items-center gap-2 font-re-typewriter text-[10px] tracking-[0.18em] uppercase text-[#166534] font-bold mb-1">
                    <ShieldCheck className="w-4 h-4" />
                    <span>EVIDENCE RECOVERED // PLACED IN BASKET [B]</span>
                  </div>
                  <h3 className="font-re-typewriter text-xl font-bold text-[#142018] mb-2 leading-snug">
                    Tamper-Sealed Evidence #{modalData.collectedCount}
                  </h3>
                  {modalData.sourceName && (
                    <div className="font-re-typewriter text-[11px] text-[#5c4832] mb-2">
                      Recovered from: <strong>{modalData.sourceName}</strong>
                    </div>
                  )}
                  <p className="font-re-typewriter text-xs text-[#241b13] leading-relaxed border-l-2 border-[#7c1d1d]/60 pl-3 my-3">
                    Stored safely inside your Evidence Basket [B] ({modalData.collectedCount} of {totalCount} collected).
                    Recover all {totalCount} fragments across the bunker wings to break the wax seal and decode the Clue Terminals.
                  </p>
                </div>

                {modalData.remainingHere > 0 && (
                  <div className="ruled-index-card px-3.5 py-2 rounded-sm font-re-typewriter text-[11px] font-bold text-[#7c1d1d]">
                    Note: Another hidden compartment inside this fixture remains unsearched.
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Unsealed Evidence Inspection Spread */
            <div className="relative w-full grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
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
                  <span>{modalData.collectedCount}/{totalCount} Logged</span>
                  <span>{ev.location ? ev.location.split('·')[0].trim() : 'Room 5'}</span>
                </div>
                {modalData.remainingHere > 0 && (
                  <div className="mt-2 px-2.5 py-1.5 rounded bg-[#7c1d1d]/15 border border-[#7c1d1d]/50 font-re-typewriter text-[10.5px] font-bold text-[#7c1d1d]">
                    * Another compartment remains inside this fixture.
                  </div>
                )}
              </div>

              <div className="md:col-span-8 relative green-grid-sheet p-6 sm:p-7 rounded-sm rotate-[0.4deg]">
                <div className="masking-tape absolute -top-3 left-1/2 -translate-x-1/2 w-24 h-6 -rotate-1" />
                <div className="masking-tape hidden sm:block absolute top-14 -right-4 w-12 h-5 rotate-90" />

                <div className="font-re-typewriter text-[11px] tracking-widest uppercase text-[#2d4f38] mb-1">
                  {ev.classification || 'RECOVERED FRAGMENT'} // {ev.id}
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
          )}

          {/* Desk actions */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 w-full max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              {!isWrapped && (
                <>
                  <button
                    type="button"
                    onClick={async () => {
                      const raw = formatDocumentText(ev, null);
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
                      const raw = formatDocumentText(ev, null);
                      downloadDocumentFile(sanitizeExportFilename(ev.id, disp.title || modalData.title), raw);
                      setDownloaded(true);
                      setTimeout(() => setDownloaded(false), 1800);
                    }}
                    className="re-btn"
                  >
                    <span className="re-btn-circle">{downloaded ? '✓' : '⬇'}</span>
                    <span>{downloaded ? 'Downloaded' : 'Download File'}</span>
                  </button>
                </>
              )}
            </div>
            <button type="button" onClick={onClose} className="re-btn">
              <span className="re-btn-circle">ESC</span>
              <span>Continue</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Mode 2: Non-Spoiler Terminal Lockout OR Out-of-Sequence Prop Feedback
  if (modalData.type === 'locked_terminal' || modalData.type === 'sequence_locked') {
    const totalRequired = modalData.totalCount ?? 10;
    const isSeqLock = modalData.type === 'sequence_locked';
    const lockedSummary = {
      id: modalData.terminalName || modalData.propName || 'TERMINAL_LEADS',
      title: isSeqLock
        ? `COMPARTMENT SEALED — ${modalData.propName || 'FIXTURE'}`
        : `TERMINAL ACCESS LOCKED — ${modalData.terminalName}`,
      classification: 'INVESTIGATION STATUS // ROOM 5',
      lines: [
        isSeqLock
          ? `${modalData.propName || 'This compartment'} is locked out of sequence (${modalData.collectedCount}/${totalRequired} recovered).`
          : `${modalData.terminalName} requires all ${totalRequired} fragments in this room (${modalData.collectedCount}/${totalRequired} recovered).`,
        'Explore the bunker wings thoroughly (Bay 5B, Anteroom 5A, Annex 5C, Observation 5D, Cryo 5E, Relay Vault 5F) to recover every fragment in sequence.',
      ],
    };
    return (
      <div
        className="desk-surface"
        onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      >
        <div
          className="relative w-full max-w-lg flex flex-col gap-4 py-2"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="re-dossier-paper p-5 sm:p-6 rounded-sm relative">
            <div className="masking-tape absolute -top-2.5 left-1/2 -translate-x-1/2 w-24 h-5" />
            <div className="flex items-center justify-between border-b border-black/20 pb-2.5 mb-3">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#7c1d1d]" />
                <span className="font-re-display text-xs sm:text-sm font-bold tracking-widest text-[#1c150f] uppercase">
                  {isSeqLock ? 'Compartment Sealed' : 'Terminal Restricted'}
                </span>
              </div>
              <span className="re-stamp-badge">
                {modalData.collectedCount}/{totalRequired} COLLECTED
              </span>
            </div>

            <div className="space-y-3 text-xs font-re-typewriter text-[#241b13]">
              <p className="leading-relaxed m-0">
                {isSeqLock ? (
                  <>
                    <strong>{modalData.propName || 'This fixture'}</strong> refuses to unlatch yet — another compartment earlier in the investigation sequence must be recovered first ({modalData.collectedCount}/{totalRequired} recovered).
                  </>
                ) : (
                  <>
                    {modalData.terminalName} requires all {totalRequired} fragments in this room ({modalData.collectedCount}/{totalRequired} recovered).
                  </>
                )}
              </p>

              <div className="ruled-index-card px-4 pt-5 pb-3.5 rounded-sm space-y-1.5 text-[11px] relative">
                <div className="push-pin absolute top-2 left-1/2 -translate-x-1/2" />
                <div className="font-bold text-[#7c1d1d]">Active Search Locations:</div>
                <div className="leading-relaxed text-[#241b13]">
                  Inspect racks, tape equipment, seating, pinboards, electrical cabinets, and floor conduits across the connected Sector 5 rooms (`5B`, `5A`, `5C`, `5D`, `5E`, `5F`). Remember: some fixtures conceal multiple pieces.
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 justify-between items-center">
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
              <button type="button" onClick={onClose} className="re-btn">
                <span className="re-btn-circle">E</span>
                <span>Continue Search</span>
              </button>
              <button type="button" onClick={onClose} className="re-btn" aria-label="Close">
                <span className="re-btn-circle">ESC</span>
                <span>Close</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Mode 3: Interactive World Record / Ambient Prop Inspection
  const doc = modalData || {};
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
            <span className="re-stamp-badge shrink-0">
              {doc.kind === 'ambient_note' ? 'AMBIENT PROP' : 'FILED IN [B]'}
            </span>
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
            <span>Close</span>
          </button>
        </div>
      </div>
    </div>
  );
}
