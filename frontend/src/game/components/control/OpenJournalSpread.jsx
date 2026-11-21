import React, { useEffect, useState } from 'react';
import { Copy, Download, Check, Lock } from 'lucide-react';
import {
  copyDocumentText,
  createDocumentPreviewSvg,
  downloadDocumentFile,
} from '../../engine/evidenceExport';

// Aged Leather Open Field-Journal Spread matching inspo #2:
// Left page: adaptive write-up & document details
// Right page: tilted Polaroid snapshot of the interacted 3D prop/evidence + torn charcoal tape caption
export default function OpenJournalSpread({
  classification = 'FIELD RECORD // SUBSTATION DELTA',
  cornerMark = '',
  location = '',
  title = 'Untitled Field Entry',
  writeup = '',
  lines = [],
  reportLines = [],
  extraLeft = null,
  statusTag = '',
  sealLabel = 'LOGGED',
  fontClass = 'font-journal-typewriter text-[13.5px] leading-[1.6]',
  polaroidSrc = '',
  polaroidAlt = '',
  polaroidFallbackData = null,
  polaroidCaption = '',
  polaroidStyle = undefined,
  polaroidHeader = null,
  polaroidFooter = null,
  exportText = '',
  exportFilename = 'delta_record.txt',
  copyLabel = 'Copy Content',
  downloadLabel = 'Download File',
  closeLabel = 'Continue',
  secondaryAction = null,
  isLockedOverlay = false,
  onClose,
}) {
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const fallbackSvg = createDocumentPreviewSvg(
    polaroidFallbackData || { title, classification, corner_mark: cornerMark, lines, reportLines, highlight: polaroidCaption }
  );
  const resolvedImg = polaroidSrc || fallbackSvg;

  useEffect(() => {
    setCopied(false);
    setDownloaded(false);
  }, [title, exportText]);

  const handleCopy = async () => {
    if (!exportText) return;
    const ok = await copyDocumentText(exportText);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  const handleDownload = () => {
    if (!exportText) return;
    downloadDocumentFile(exportFilename, exportText);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 1800);
  };

  return (
    <div
      className="journal-desk-backdrop"
      onMouseDown={(e) => {
        e.stopPropagation();
        if (e.target === e.currentTarget) onClose?.();
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="relative w-full max-w-5xl my-auto py-4 px-2 sm:px-6"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Background tucked stamped letter peeking on left edge (inspo detail) */}
        <div
          aria-hidden="true"
          className="hidden md:block journal-desk-letter w-52 h-72 -left-10 bottom-12 rounded-sm -rotate-[14deg] p-4 opacity-90"
        >
          <div className="text-[7px] font-serif leading-tight opacity-65 space-y-1.5">
            <div className="border-b border-black/25 pb-1 font-bold tracking-wider">
              SUBSTATION DELTA — DIRECTIVE 83-B
            </div>
            <p className="m-0">
              All physical specimen bags recovered in Sector 5 must be cross-logged with the Duty
              Terminal prior to Chamber 3 purge initiation.
            </p>
            <p className="m-0">Do not open unverified relays under containment alarm.</p>
          </div>
          <div className="mt-8 w-11 h-11 rounded-full border-2 border-[#7c1d1d]/45 flex items-center justify-center text-[7px] font-bold text-[#7c1d1d]/55 rotate-12">
            DELTA
          </div>
        </div>

        {/* Background tucked paper peeking behind top-left corner */}
        <div
          aria-hidden="true"
          className="hidden md:block absolute left-14 -top-1 w-40 h-14 bg-[#d9d1c0] rounded-t-sm -rotate-[4deg] shadow-md pointer-events-none opacity-85"
        />

        {/* Tucked green perforated ticket stub & stamped clearance slip on right edge */}
        <div
          aria-hidden="true"
          className="hidden md:flex journal-ticket-stub right-1 top-14 w-24 h-12 rotate-[7deg] items-center justify-between px-3 font-mono text-[13px] font-bold"
        >
          <span className="opacity-75 text-[8px] uppercase tracking-wider">SEC</span>
          <span>05</span>
        </div>
        <div
          aria-hidden="true"
          className="hidden md:flex journal-desk-letter right-0 top-40 w-24 h-28 rotate-[12deg] rounded-sm p-2.5 flex-col justify-between opacity-90"
        >
          <span className="text-[8px] font-mono font-bold tracking-widest opacity-70">AUTH // 83</span>
          <div className="w-9 h-9 rounded-full border-2 border-[#3f3728]/50 mx-auto flex items-center justify-center text-[7px] font-bold opacity-60">
            PASS
          </div>
          <span className="text-[7px] font-mono opacity-60 text-center">SUB-LVL 2</span>
        </div>

        {/* Fountain pen + cap on lower right edge beside cover */}
        <svg
          aria-hidden="true"
          viewBox="0 0 120 110"
          className="hidden md:block absolute -right-5 bottom-16 w-28 h-24 pointer-events-none drop-shadow-[0_10px_16px_rgba(0,0,0,0.8)] z-20"
        >
          {/* Pen body */}
          <g transform="translate(22, 18) rotate(-32)">
            <polygon points="-24,0 -8,-4 -8,4" fill="#9ca3af" />
            <circle cx="-13" cy="0" r="1" fill="#18181b" />
            <rect x="-8" y="-5" width="7" height="10" rx="1" fill="#b4945a" />
            <rect x="-1" y="-5.5" width="95" height="11" rx="3" fill="#1c2128" />
            <rect x="6" y="-4" width="84" height="3" rx="1" fill="#374151" opacity="0.45" />
          </g>
          {/* Detached Pen cap */}
          <g transform="translate(46, 56) rotate(12)">
            <rect x="0" y="-5.5" width="44" height="11" rx="3" fill="#181d24" />
            <rect x="4" y="-7" width="28" height="2" rx="1" fill="#9ca3af" />
            <rect x="38" y="-5.5" width="3" height="11" fill="#b4945a" />
          </g>
        </svg>

        {/* Main Open Aged Leather Field Journal */}
        <div className="journal-leather-cover relative z-10">
          <div className="journal-pages-shell">
            <div className="journal-spine-crease" />

            {/* ── LEFT PAGE: Document Title, Full Verbatim Record & Curator Note ── */}
            <div className="journal-page journal-page-left px-6 sm:px-9 py-6 flex flex-col justify-between overflow-hidden">
              <div aria-hidden="true" className="journal-vertical-watermark right-2">
                SUBSTATION DELTA
              </div>

              <div className="relative z-10 space-y-3.5 pr-4">
                <div className="journal-double-rule" />

                {/* Document Classification & Sharp Display Title First */}
                <div className="pt-1">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                    <span
                      className="text-[10px] tracking-[0.16em] uppercase text-[#7c1d1d] font-bold"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      {classification}
                    </span>
                    <span className="re-stamp-badge">{sealLabel}</span>
                  </div>
                  <h2
                    className="text-2xl sm:text-[26px] font-bold text-[#1a120b] m-0 leading-tight tracking-tight"
                    style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                  >
                    {title}
                  </h2>
                  {(cornerMark || location || statusTag) && (
                    <div
                      className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1.5 text-[10.5px] text-[#5e4d3a]"
                      style={{ fontFamily: "'Courier Prime', monospace" }}
                    >
                      {cornerMark && <span className="font-bold">{cornerMark}</span>}
                      {cornerMark && location && <span aria-hidden="true">•</span>}
                      {location && <span>{location}</span>}
                      {(cornerMark || location) && statusTag && <span aria-hidden="true">•</span>}
                      {statusTag && <span className="font-bold text-[#7c1d1d]">{statusTag}</span>}
                    </div>
                  )}
                </div>

                {/* Actual Verbatim Evidence / Log Content */}
                {lines.length > 0 && (
                  <div
                    className={`border-l-2 border-[#7c1d1d]/65 pl-3.5 py-1 space-y-1.5 text-[#1e150e] bg-[#e9dcc1]/45 rounded-r-lg ${fontClass}`}
                  >
                    {lines.map((line, i) => (
                      <p key={i} className="m-0 leading-relaxed">
                        {line}
                      </p>
                    ))}
                  </div>
                )}

                {reportLines.length > 0 && (
                  <div className="bg-[#e5d5b5]/80 rounded-lg px-3.5 py-2.5 space-y-1">
                    <div
                      className="text-[9.5px] uppercase tracking-widest text-[#7c1d1d] font-bold"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      FIELD DOSSIER EXCERPT
                    </div>
                    {reportLines.map((rl, i) => (
                      <p key={i} className={`m-0 text-[#261b12] ${fontClass}`}>
                        {rl}
                      </p>
                    ))}
                  </div>
                )}

                {extraLeft}

                {/* Concise Archival Curator Note (only shown concisely when useful) */}
                {writeup && (
                  <div className="border-t border-[#8a7558]/30 pt-2.5">
                    <p
                      className="text-[12px] italic text-[#4a3928] m-0 leading-relaxed"
                      style={{ fontFamily: "'Lora', Georgia, serif" }}
                    >
                      {writeup}
                    </p>
                  </div>
                )}
              </div>

              <div className="relative z-10 pt-4">
                <div className="journal-double-rule" />
              </div>
            </div>

            {/* ── RIGHT PAGE: Tilted Polaroid Prop Snapshot + Torn Charcoal Tape ── */}
            <div className="journal-page journal-page-right px-6 sm:px-9 py-6 flex flex-col justify-between overflow-hidden">
              <div aria-hidden="true" className="journal-vertical-watermark left-2">
                CURSE THE CODE
              </div>

              <div className="relative z-10">
                <div className="journal-double-rule" />
              </div>

              <div className="relative z-10 flex flex-col items-center justify-center my-4">
                {/* Etched emblem crest peeking behind top-left of Polaroid (inspo detail) */}
                <svg
                  aria-hidden="true"
                  viewBox="0 0 80 80"
                  className="w-20 h-20 absolute -top-2 left-3 sm:left-8 pointer-events-none opacity-45 -rotate-12"
                >
                  <circle cx="40" cy="40" r="34" fill="#efe6d1" stroke="#5b4936" strokeWidth="1.5" />
                  <polygon points="40,14 63,56 17,56" fill="none" stroke="#5b4936" strokeWidth="1.6" />
                  <circle cx="40" cy="41" r="8" fill="none" stroke="#6f1d1d" strokeWidth="1.5" />
                </svg>

                {/* Tilted Polaroid Snapshot */}
                <div className="journal-polaroid w-full max-w-[300px] rotate-[4deg] transition-transform duration-300 hover:rotate-[1.5deg]">
                  {polaroidHeader}
                  <div className="relative aspect-[4/3] w-full bg-[#151311] overflow-hidden border border-black/25 flex items-center justify-center">
                    <img
                      src={resolvedImg}
                      alt={polaroidAlt || title}
                      className="w-full h-full object-cover transition-all"
                      style={polaroidStyle}
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = fallbackSvg;
                      }}
                    />
                    {isLockedOverlay && (
                      <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-[#7c1d1d]/90 text-[#fef2f2] text-[9px] font-mono font-bold flex items-center gap-1 shadow">
                        <Lock className="w-2.5 h-2.5" /> SEALED
                      </div>
                    )}
                  </div>
                  {polaroidFooter}
                </div>

                {/* Dark charcoal torn-edge tape caption strip directly underneath */}
                {polaroidCaption && (
                  <div className="journal-torn-strip w-full max-w-[330px] mt-4 px-5 py-3">
                    <p className="m-0 font-sans text-[12px] sm:text-[13px] leading-snug text-[#ece5d9]">
                      {polaroidCaption}
                    </p>
                  </div>
                )}
              </div>

              <div className="relative z-10">
                <div className="journal-double-rule" />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Unified Copy / Download / Continue Action Bar */}
        <div className="relative z-20 mt-4 flex flex-wrap items-center justify-between gap-2.5 px-1">
          <div className="flex flex-wrap items-center gap-2">
            {exportText && (
              <button type="button" onClick={handleCopy} className="re-btn">
                <span className="re-btn-circle">
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                </span>
                <span>{copied ? 'Copied!' : copyLabel}</span>
              </button>
            )}
            {exportText && (
              <button type="button" onClick={handleDownload} className="re-btn">
                <span className="re-btn-circle">
                  {downloaded ? <Check className="w-3 h-3" /> : <Download className="w-3 h-3" />}
                </span>
                <span>{downloaded ? 'Saved!' : downloadLabel}</span>
              </button>
            )}
            {secondaryAction}
          </div>

          <button type="button" onClick={onClose} className="re-btn">
            <span className="re-btn-circle">ESC</span>
            <span>{closeLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
