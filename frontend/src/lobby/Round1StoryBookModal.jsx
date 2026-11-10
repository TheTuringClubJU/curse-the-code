import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Book, Flame, Sparkles, Bookmark, Skull, ShieldAlert } from 'lucide-react';

export default function Round1StoryBookModal({ isOpen, onClose }) {
  const [page, setPage] = useState(0);

  // Keyboard navigation: Arrow keys to turn pages, ESC/S to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      const tag = (e.target?.tagName || '').toUpperCase();
      if (['INPUT', 'TEXTAREA'].includes(tag)) return;

      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        setPage((prev) => Math.min(prev + 1, 5));
      } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        setPage((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Escape' || e.key === 's' || e.key === 'S') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  // Reset to cover when opening
  useEffect(() => {
    if (isOpen) {
      setPage(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-3xl flex flex-col items-center">
        {/* Floating Close Button */}
        <button
          onClick={onClose}
          className="absolute -top-11 right-0 sm:right-2 flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/80 border border-[#852834]/80 text-[#fecdd3] hover:text-white hover:border-red-500 text-xs font-mono transition shadow-lg"
          title="Close Chronicle (Press S or ESC)"
        >
          <span>Close (S)</span>
          <X className="w-4 h-4" />
        </button>

        {/* ========================================================================= */}
        {/* PAGE 0: BOOK COVER                                                        */}
        {/* ========================================================================= */}
        {page === 0 ? (
          <div className="relative w-full aspect-[4/5] max-h-[82vh] rounded-2xl bg-gradient-to-br from-[#2a0e16] via-[#16070c] to-[#0a0305] border-[6px] border-[#92400e]/70 shadow-[0_25px_60px_rgba(0,0,0,0.95)] flex flex-col items-center justify-between p-6 sm:p-10 text-center overflow-hidden">
            {/* Book Spine Shadow on Left */}
            <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-black/80 via-black/40 to-transparent pointer-events-none" />
            <div className="absolute left-6 top-0 bottom-0 w-[2px] bg-[#92400e]/30 pointer-events-none" />

            {/* Corner Decorative Brass Ornaments */}
            <div className="absolute top-3 left-3 w-8 h-8 border-t-2 border-l-2 border-[#f59e0b]/60 rounded-tl-lg pointer-events-none" />
            <div className="absolute top-3 right-3 w-8 h-8 border-t-2 border-r-2 border-[#f59e0b]/60 rounded-tr-lg pointer-events-none" />
            <div className="absolute bottom-3 left-3 w-8 h-8 border-b-2 border-l-2 border-[#f59e0b]/60 rounded-bl-lg pointer-events-none" />
            <div className="absolute bottom-3 right-3 w-8 h-8 border-b-2 border-r-2 border-[#f59e0b]/60 rounded-br-lg pointer-events-none" />

            {/* Top Inscription */}
            <div className="space-y-1 mt-2">
              <div className="flex items-center justify-center gap-2 text-[11px] font-mono tracking-[0.3em] uppercase text-[#f59e0b]/80">
                <Flame className="w-3.5 h-3.5 text-[#ff7a1a] animate-pulse" />
                <span>Confidential Field Lore</span>
                <Flame className="w-3.5 h-3.5 text-[#ff7a1a] animate-pulse" />
              </div>
              <div className="text-[10px] font-mono text-[#a89988] tracking-widest uppercase">
                Curse the Code &bull; Sector 01 Dossier
              </div>
            </div>

            {/* Centerpiece Crest & Title */}
            <div className="my-auto flex flex-col items-center space-y-4 max-w-lg">
              <div className="w-20 h-20 rounded-full border-2 border-[#f59e0b]/50 bg-[#250d14] flex items-center justify-center shadow-[0_0_30px_rgba(245,158,11,0.25)] relative">
                <Skull className="w-10 h-10 text-[#f59e0b] drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                <span className="absolute -inset-1 rounded-full border border-dashed border-[#f59e0b]/30 animate-spin-slow pointer-events-none" />
              </div>

              <div className="space-y-2">
                <h1 className="text-2xl sm:text-4xl font-elite text-[#fef3c7] tracking-wider drop-shadow-[0_2px_10px_rgba(245,158,11,0.4)] leading-tight uppercase">
                  The Last Night at Hollow House
                </h1>
                <p className="text-xs sm:text-sm font-serif italic text-[#fbcfe8] tracking-wide">
                  An Archival Chronicle of the 1994 Vance Family Vanishing
                </p>
              </div>

              <div className="w-32 h-[1px] bg-gradient-to-r from-transparent via-[#f59e0b]/60 to-transparent" />

              <p className="text-xs font-mono text-[#d6c7b2] max-w-sm leading-relaxed">
                Open these pages to uncover who the Vance family were, why the mansion fractured, and how the fragments lead to the subterranean containment core.
              </p>
            </div>

            {/* Bottom Open Button */}
            <div className="w-full max-w-xs space-y-3 mb-2">
              <button
                type="button"
                onClick={() => setPage(1)}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-[#852834] via-[#a23242] to-[#852834] text-[#fef2f2] font-mono font-bold text-sm tracking-widest uppercase border border-[#f43f5e]/50 shadow-[0_0_20px_rgba(244,63,94,0.35)] hover:shadow-[0_0_25px_rgba(244,63,94,0.6)] hover:brightness-110 transition active:scale-95"
              >
                <Book className="w-4 h-4" />
                <span>OPEN CHRONICLE</span>
                <ChevronRight className="w-4 h-4" />
              </button>
              <div className="text-[10px] font-mono text-[#8c7b6d] tracking-wider">
                Press [→] or click to turn the page
              </div>
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* PAGES 1 TO 5: AGED PARCHMENT OPEN BOOK                                    */
          /* ========================================================================= */
          <div className="relative w-full aspect-[4/5] sm:aspect-[16/11] max-h-[85vh] rounded-2xl bg-gradient-to-b from-[#f9f3e3] via-[#f1e6cd] to-[#e4d5b7] border-[6px] border-[#6b3c16] shadow-[0_25px_70px_rgba(0,0,0,0.95)] flex flex-col justify-between overflow-hidden text-[#261710]">
            {/* Parchment Soot & Burn Vignette Inset */}
            <div className="absolute inset-0 shadow-[inset_0_0_60px_rgba(70,35,10,0.35)] pointer-events-none" />

            {/* Creased Book Spine Shadow down the Center (on larger screens) */}
            <div className="hidden sm:block absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-12 bg-gradient-to-r from-transparent via-black/15 to-transparent pointer-events-none" />
            <div className="hidden sm:block absolute left-1/2 top-0 bottom-0 w-[1px] bg-[#8c5a2b]/30 pointer-events-none" />

            {/* Red Bookmark Ribbon at Top */}
            <div className="absolute top-0 right-12 sm:right-16 w-5 h-8 bg-gradient-to-b from-red-800 to-red-900 shadow-md border-x border-b border-red-950 rounded-b-sm pointer-events-none" />

            {/* Top Page Header Bar */}
            <div className="relative z-10 px-6 sm:px-10 pt-5 pb-2 flex items-center justify-between border-b border-[#8c5a2b]/25 text-[11px] font-mono text-[#614532]">
              <span className="font-bold tracking-widest uppercase">
                THE CHRONICLES OF HOLLOW HOUSE
              </span>
              <span className="tracking-wider">
                CHAPTER {page} OF 5
              </span>
            </div>

            {/* Main Page Content Body */}
            <div className="relative z-10 flex-1 px-6 sm:px-12 py-4 overflow-y-auto space-y-3.5">
              {/* PAGE 1: THE TRAGEDY */}
              {page === 1 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#881337] uppercase tracking-wider">
                    <span>Chapter I</span>
                    <span>&bull;</span>
                    <span>The Vanishing (October 31, 1994)</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-elite text-[#3a1a12] tracking-wide leading-tight">
                    The Night the Walls Dissolved
                  </h2>
                  <div className="w-16 h-[2px] bg-[#8c5a2b]/40" />

                  <p className="text-xs sm:text-sm font-serif leading-relaxed text-[#2f1f18]">
                    <span className="float-left text-3xl sm:text-4xl font-elite leading-none mr-2 text-[#881337] font-bold">
                      T
                    </span>
                    hirty years ago tonight, the Vance family vanished from Hollow House in an instant. Police investigators arriving at the remote estate found the dinner plates still warm, the front doors securely bolted from the inside, and zero signs of struggle or forced entry. Not a single body or grave was ever discovered.
                  </p>

                  <p className="text-xs sm:text-sm font-serif leading-relaxed text-[#2f1f18]">
                    The only physical trace left behind was a severed family photograph, violently torn into ten ragged shards and scattered throughout the house. Precisely at 11:00 PM, a long-dead CRT terminal booted up in the dark, flashing a chilling directive:
                  </p>

                  {/* Quote Banner */}
                  <div className="p-3 rounded-lg bg-[#2b141d]/10 border-l-4 border-[#881337] text-xs font-mono text-[#581523] italic">
                    &ldquo;TEN FRAGMENTS. TEN SEALS. ONE DOOR. At midnight, the house opens. Reconstruct what was severed before midnight strikes, or become part of the archive forever.&rdquo;
                  </div>

                  <p className="text-xs sm:text-sm font-serif leading-relaxed text-[#2f1f18]">
                    You and your partner are the digital investigators authorized to step across the threshold. You must breach the three quarantined sectors of Hollow House before the twelve midnight chimes ring out.
                  </p>
                </div>
              )}

              {/* PAGE 2: LENA VANCE & THE BEDROOM */}
              {page === 2 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#881337] uppercase tracking-wider">
                    <span>Chapter II</span>
                    <span>&bull;</span>
                    <span>Sector 1: Lena's Bedroom</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-elite text-[#3a1a12] tracking-wide leading-tight">
                    Lena Vance: The Girl Who Heard the Call
                  </h2>
                  <div className="w-16 h-[2px] bg-[#8c5a2b]/40" />

                  <p className="text-xs sm:text-sm font-serif leading-relaxed text-[#2f1f18]">
                    <span className="float-left text-3xl sm:text-4xl font-elite leading-none mr-2 text-[#881337] font-bold">
                      L
                    </span>
                    ena Vance was the 16-year-old daughter. Sensitive, observant, and gifted with astronomy, she was the first to realize the house was no longer obeying the laws of reality. Days before the disappearance, her diary entries grew frantic with sleepless terror as she documented the clock ticks slowing down.
                  </p>

                  {/* Audio Memo Box */}
                  <div className="p-3 rounded-lg bg-[#3a191f]/10 border border-[#881337]/30 text-xs font-mono text-[#4c1d24]">
                    <span className="font-bold uppercase tracking-wider block text-[10px] text-[#881337] mb-1">
                      Recovered Audio Transcript (voice_memo.mp3):
                    </span>
                    &ldquo;Dad says don&apos;t answer if it calls. Don&apos;t look into the hallway mirrors. Whatever you hear calling your name tonight... it isn&apos;t us.&rdquo;
                  </div>

                  <p className="text-xs sm:text-sm font-serif leading-relaxed text-[#2f1f18]">
                    <b>The 15 Bedroom Fragments:</b> When the temporal tear erupted, Lena&apos;s diary, star charts, and wall poster were shredded into <b>15 evidence scraps</b> across the furniture. Collecting all 15 unlocks the room&apos;s evidence basket, allowing you to solve her 4 clues (<b>R1-01 to R1-04</b>) and recover the first four photograph pieces: <b>P01, P02, P03, and P04</b>.
                  </p>
                </div>
              )}

              {/* PAGE 3: DANIEL VANCE & THE STUDY */}
              {page === 3 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#881337] uppercase tracking-wider">
                    <span>Chapter III</span>
                    <span>&bull;</span>
                    <span>Sector 2: Daniel's Study</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-elite text-[#3a1a12] tracking-wide leading-tight">
                    Daniel Vance: Tracking the Resonance
                  </h2>
                  <div className="w-16 h-[2px] bg-[#8c5a2b]/40" />

                  <p className="text-xs sm:text-sm font-serif leading-relaxed text-[#2f1f18]">
                    <span className="float-left text-3xl sm:text-4xl font-elite leading-none mr-2 text-[#881337] font-bold">
                      D
                    </span>
                    aniel Vance was Lena&apos;s father—a brilliant cybernetics researcher and telemetry engineer. Rather than fleeing when anomalous electrical surges rocked the estate, Daniel locked himself in his private study, determined to capture the entity using terminal diagnostics and frequency analyzers.
                  </p>

                  <p className="text-xs sm:text-sm font-serif leading-relaxed text-[#2f1f18]">
                    His terminal logs reveal how the entity infiltrated the estate's network grid, triggering corrupted memory faults and unauthorized late-night access anomalies across the house's infrastructure.
                  </p>

                  {/* Decoy Warning */}
                  <div className="p-2.5 rounded-lg bg-[#78350f]/10 border border-[#b45309]/30 text-xs font-mono text-[#78350f]">
                    <b>The 16 Study Fragments & Decoys:</b> Daniel was paranoid. Among his 16 shredded printouts, 2 are intentional decoys meant to mislead. All 16 must be recovered to unlock the 4 study terminals (<b>R1-05 to R1-08</b>), awarding Photo Pieces <b>P05, P06, P07, and P08</b>.
                  </div>
                </div>
              )}

              {/* PAGE 4: THE BASEMENT */}
              {page === 4 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#881337] uppercase tracking-wider">
                    <span>Chapter IV</span>
                    <span>&bull;</span>
                    <span>Sector 3: The Basement Vault</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-elite text-[#3a1a12] tracking-wide leading-tight">
                    The Subterranean Containment Core
                  </h2>
                  <div className="w-16 h-[2px] bg-[#8c5a2b]/40" />

                  <p className="text-xs sm:text-sm font-serif leading-relaxed text-[#2f1f18]">
                    <span className="float-left text-3xl sm:text-4xl font-elite leading-none mr-2 text-[#881337] font-bold">
                      B
                    </span>
                    eneath the floorboards lies Hollow House&apos;s darkest secret: a fortified underground bunker where Daniel attempted to build a physical resonance trap. He finally realized this was no ghost—it was an anomalous entity slipping through temporal folds.
                  </p>

                  <p className="text-xs sm:text-sm font-serif leading-relaxed text-[#2f1f18]">
                    The basement is guarded by humming server racks, maintenance terminals, and an emergency clearance intercom. Five final clearance scraps hide within the machinery.
                  </p>

                  <p className="text-xs sm:text-sm font-serif leading-relaxed text-[#2f1f18]">
                    Solving the emergency QR intercom clearance (<b>R1-09</b>) and the family&apos;s final ciphered note (<b>R1-10</b>) yields the last two missing pieces: <b>P09 and P10</b>. Once collected, all 10 fragments are assembled, and the massive steel vault console illuminates in the center of the room.
                  </p>
                </div>
              )}

              {/* PAGE 5: THE GRAND FINALE & THE PHOTOGRAPH */}
              {page === 5 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#881337] uppercase tracking-wider">
                    <span>Chapter V</span>
                    <span>&bull;</span>
                    <span>The Reconstructed Truth</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-elite text-[#3a1a12] tracking-wide leading-tight">
                    Five People. Four Shadows.
                  </h2>
                  <div className="w-16 h-[2px] bg-[#8c5a2b]/40" />

                  <p className="text-xs sm:text-sm font-serif leading-relaxed text-[#2f1f18]">
                    <span className="float-left text-3xl sm:text-4xl font-elite leading-none mr-2 text-[#881337] font-bold">
                      W
                    </span>
                    hy must you reconstruct the photograph? The fragments are anchors of human memory. Without them, the house forgets the Vance family existed. But when all ten pieces (P01 through P10) are assembled onto the board, a chilling revelation appears:
                  </p>

                  {/* Terrifying Anomaly Box */}
                  <div className="p-3 rounded-lg bg-[#450a0a]/10 border-l-4 border-red-700 text-xs font-mono text-[#581523]">
                    <span className="font-bold block uppercase text-red-800 mb-0.5">The Portrait Anomaly:</span>
                    The restored photograph depicts five family members standing together. But looking at the ground beneath them reveals only <b>four shadows</b>. A fifth presence was captured in the frame alongside them...
                  </div>

                  <p className="text-xs sm:text-sm font-serif leading-relaxed text-[#2f1f18]">
                    <b>The 3-Stage Finale at R1-FIN:</b>
                    <br />
                    1. <b>Master Keywords:</b> Enter the clearance keywords you uncovered across Hollow House.
                    <br />
                    2. <b>Photograph Restoration:</b> Reassemble the ten severed portrait pieces onto the terminal grid.
                    <br />
                    3. <b>Containment Override:</b> Select the protocol and enter the security PIN to seal the vault!
                  </p>
                </div>
              )}
            </div>

            {/* Bottom Page Navigation Controls */}
            <div className="relative z-10 px-6 sm:px-10 py-3.5 border-t border-[#8c5a2b]/25 bg-[#eedebd]/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono">
              {/* Previous Button */}
              <button
                type="button"
                onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-[#8c5a2b]/40 bg-[#f9f3e3] hover:bg-white text-[#452b1b] font-bold transition shadow-sm"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>{page === 1 ? 'Cover' : 'Previous'}</span>
              </button>

              {/* Quick Jump Page Pills */}
              <div className="flex items-center gap-1.5">
                {[
                  { p: 0, label: 'Cover' },
                  { p: 1, label: 'I' },
                  { p: 2, label: 'II' },
                  { p: 3, label: 'III' },
                  { p: 4, label: 'IV' },
                  { p: 5, label: 'V' }
                ].map((item) => (
                  <button
                    key={item.p}
                    type="button"
                    onClick={() => setPage(item.p)}
                    className={`w-6 h-6 rounded text-[11px] font-bold transition ${
                      page === item.p
                        ? 'bg-[#881337] text-white shadow-sm'
                        : 'bg-[#8c5a2b]/15 text-[#5e381a] hover:bg-[#8c5a2b]/30'
                    }`}
                    title={`Jump to Page ${item.p}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Next Button */}
              {page < 5 ? (
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.min(prev + 1, 5))}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-[#881337]/60 bg-[#881337] hover:bg-[#9f1239] text-white font-bold transition shadow-sm"
                >
                  <span>Next Page</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-[#451a03]/60 bg-[#29140d] hover:bg-black text-[#fef3c7] font-bold transition shadow-sm"
                >
                  <span>Close Tome</span>
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
