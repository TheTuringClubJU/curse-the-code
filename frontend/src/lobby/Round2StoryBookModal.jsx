import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Book, Flame, Radio, ShieldAlert, Cpu, Sparkles, Layers } from 'lucide-react';

export default function Round2StoryBookModal({ isOpen, onClose }) {
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
          className="absolute -top-11 right-0 sm:right-2 flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/80 border border-[#8f7bff]/60 text-[#d8d0f8] hover:text-white hover:border-[#a394ff] text-xs font-mono transition shadow-lg"
          title="Close Chronicle (Press S or ESC)"
        >
          <span>Close (S)</span>
          <X className="w-4 h-4" />
        </button>

        {/* ========================================================================= */}
        {/* PAGE 0: BOOK COVER                                                        */}
        {/* ========================================================================= */}
        {page === 0 ? (
          <div className="relative w-full aspect-[4/5] max-h-[82vh] rounded-2xl bg-gradient-to-br from-[#1d142d] via-[#100b1a] to-[#07040d] border-[6px] border-[#6b5596]/70 shadow-[0_25px_60px_rgba(0,0,0,0.95)] flex flex-col items-center justify-between p-6 sm:p-10 text-center overflow-hidden">
            {/* Book Spine Shadow on Left */}
            <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-black/80 via-black/40 to-transparent pointer-events-none" />
            <div className="absolute left-6 top-0 bottom-0 w-[2px] bg-[#8f7bff]/30 pointer-events-none" />

            {/* Corner Decorative Silver / Violet Ornaments */}
            <div className="absolute top-3 left-3 w-8 h-8 border-t-2 border-l-2 border-[#8f7bff]/60 rounded-tl-lg pointer-events-none" />
            <div className="absolute top-3 right-3 w-8 h-8 border-t-2 border-r-2 border-[#8f7bff]/60 rounded-tr-lg pointer-events-none" />
            <div className="absolute bottom-3 left-3 w-8 h-8 border-b-2 border-l-2 border-[#8f7bff]/60 rounded-bl-lg pointer-events-none" />
            <div className="absolute bottom-3 right-3 w-8 h-8 border-b-2 border-r-2 border-[#8f7bff]/60 rounded-br-lg pointer-events-none" />

            {/* Top Inscription */}
            <div className="space-y-1 mt-2">
              <div className="flex items-center justify-center gap-2 text-[11px] font-mono tracking-[0.3em] uppercase text-[#a99bf7]/90">
                <Flame className="w-3.5 h-3.5 text-[#8f7bff] animate-pulse" />
                <span>Classified Facility Chronicle</span>
                <Flame className="w-3.5 h-3.5 text-[#8f7bff] animate-pulse" />
              </div>
              <div className="text-[10px] font-mono text-[#8f7da8] tracking-widest uppercase">
                Sub-Station Delta &bull; Sector 02 Lore
              </div>
            </div>

            {/* Centerpiece Crest & Title */}
            <div className="my-auto flex flex-col items-center space-y-4 max-w-lg">
              <div className="w-20 h-20 rounded-full border-2 border-[#8f7bff]/50 bg-[#160e24] flex items-center justify-center shadow-[0_0_30px_rgba(143,123,255,0.25)] relative">
                <Radio className="w-10 h-10 text-[#8f7bff] drop-shadow-[0_0_8px_rgba(143,123,255,0.5)]" />
                <span className="absolute -inset-1 rounded-full border border-dashed border-[#8f7bff]/30 animate-spin-slow pointer-events-none" />
              </div>

              <div className="space-y-2">
                <h1 className="text-2xl sm:text-4xl font-elite text-[#f3f0ff] tracking-wider drop-shadow-[0_2px_10px_rgba(143,123,255,0.4)] leading-tight uppercase">
                  The Breach at Sub-Station Delta
                </h1>
                <p className="text-xs sm:text-sm font-serif italic text-[#c8beeb] tracking-wide">
                  An Archival Chronicle of Project HOLLOW &amp; The 1996 Containment Failure
                </p>
              </div>

              <div className="w-32 h-[1px] bg-gradient-to-r from-transparent via-[#8f7bff]/60 to-transparent" />

              <p className="text-xs font-mono text-[#b3a4cf] max-w-sm leading-relaxed">
                Turn these pages to discover what was buried beneath Hollow House, how secret acoustic telemetry breached containment, and how to engage the final altar failsafe.
              </p>
            </div>

            {/* Bottom Open Button */}
            <div className="w-full max-w-xs space-y-3 mb-2">
              <button
                type="button"
                onClick={() => setPage(1)}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-[#4d337a] via-[#6543a3] to-[#4d337a] text-[#f7f5ff] font-mono font-bold text-sm tracking-widest uppercase border border-[#8f7bff]/50 shadow-[0_0_20px_rgba(143,123,255,0.35)] hover:shadow-[0_0_25px_rgba(143,123,255,0.6)] hover:brightness-110 transition active:scale-95"
              >
                <Book className="w-4 h-4" />
                <span>OPEN CHRONICLE</span>
                <ChevronRight className="w-4 h-4" />
              </button>
              <div className="text-[10px] font-mono text-[#8a79a3] tracking-wider">
                Press [→] or click to turn the page
              </div>
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* PAGES 1 TO 5: AGED PARCHMENT OPEN BOOK                                    */
          /* ========================================================================= */
          <div className="relative w-full aspect-[4/5] sm:aspect-[16/11] max-h-[85vh] rounded-2xl bg-gradient-to-b from-[#f5f1e8] via-[#ebe3d3] to-[#ded2bd] border-[6px] border-[#4a3a61] shadow-[0_25px_70px_rgba(0,0,0,0.95)] flex flex-col justify-between overflow-hidden text-[#231a2c]">
            {/* Parchment Vignette Inset */}
            <div className="absolute inset-0 shadow-[inset_0_0_60px_rgba(40,25,60,0.35)] pointer-events-none" />

            {/* Creased Book Spine Shadow down the Center */}
            <div className="hidden sm:block absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-12 bg-gradient-to-r from-transparent via-black/15 to-transparent pointer-events-none" />
            <div className="hidden sm:block absolute left-1/2 top-0 bottom-0 w-[1px] bg-[#614d7a]/30 pointer-events-none" />

            {/* Purple Bookmark Ribbon at Top */}
            <div className="absolute top-0 right-12 sm:right-16 w-5 h-8 bg-gradient-to-b from-[#4d337a] to-[#2c1a4d] shadow-md border-x border-b border-[#1b0f33] rounded-b-sm pointer-events-none" />

            {/* Top Page Header Bar */}
            <div className="relative z-10 px-6 sm:px-10 pt-5 pb-2 flex items-center justify-between border-b border-[#614d7a]/25 text-[11px] font-mono text-[#4e3d63]">
              <span className="font-bold tracking-widest uppercase">
                THE CHRONICLES OF SUB-STATION DELTA
              </span>
              <span className="tracking-wider">
                CHAPTER {page} OF 5
              </span>
            </div>

            {/* Main Page Content Body */}
            <div className="relative z-10 flex-1 px-6 sm:px-12 py-4 overflow-y-auto space-y-3.5">
              
              {/* PAGE 1: THE BREACH */}
              {page === 1 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#4c2d73] uppercase tracking-wider">
                    <span>Chapter I</span>
                    <span>&bull;</span>
                    <span>The Subterranean Breach</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-elite text-[#271838] tracking-wide leading-tight">
                    The Surface Was Only the Anchor
                  </h2>
                  <div className="w-16 h-[2px] bg-[#6b5596]/40" />

                  <p className="text-xs sm:text-sm font-serif leading-relaxed text-[#2a1d36]">
                    <span className="float-left text-3xl sm:text-4xl font-elite leading-none mr-2 text-[#4c2d73] font-bold">
                      W
                    </span>
                    hen your team reconstructed the severed family portrait in Hollow House and engaged the basement containment override, you believed the nightmare was over. But sealing the basement only severed the surface anchor. The terminal override tripped ancient facility relays buried two levels beneath the foundation, tearing open the heavy reinforced hydraulic blast doors to <b>Sub-Station Delta</b>.
                  </p>

                  <p className="text-xs sm:text-sm font-serif leading-relaxed text-[#2a1d36]">
                    Hollow House was never an ordinary home. In 1996, a classified government telemetry initiative (Codename: <i>Project HOLLOW</i>) established a covert underground research facility directly beneath the Vance property to conduct voice-containment and acoustic temporal resonance trials.
                  </p>

                  {/* Redacted Memo Banner */}
                  <div className="p-3 rounded-lg bg-[#382654]/10 border-l-4 border-[#5d3b8f] text-xs font-mono text-[#361e57] italic">
                    &ldquo;The anomaly does not inhabit the building. The building was constructed over the anomaly. When the final containment experiment collapsed in August 1996, the entire facility was evacuated, sealed, and left to rot in the dark.&rdquo;
                  </div>

                  <p className="text-xs sm:text-sm font-serif leading-relaxed text-[#2a1d36]">
                    You have crossed into the forgotten complex. Three subterranean sectors stand between you and the deep containment vault.
                  </p>
                </div>
              )}

              {/* PAGE 2: SECTOR IV - THE ROTTING ARCHIVE */}
              {page === 2 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#4c2d73] uppercase tracking-wider">
                    <span>Chapter II</span>
                    <span>&bull;</span>
                    <span>Sector IV: The Rotting Archive</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-elite text-[#271838] tracking-wide leading-tight">
                    The Depository of Suppressed Memory
                  </h2>
                  <div className="w-16 h-[2px] bg-[#6b5596]/40" />

                  <p className="text-xs sm:text-sm font-serif leading-relaxed text-[#2a1d36]">
                    <span className="float-left text-3xl sm:text-4xl font-elite leading-none mr-2 text-[#4c2d73] font-bold">
                      S
                    </span>
                    tepping through the broken hydraulic doors plunges you into Chamber IV: The Rotting Archive. Corroded steam pipes drip black, stagnant water onto flooded concrete walkways, while rows of bowed steel shelving sag under the weight of waterlogged filing boxes.
                  </p>

                  {/* Incident Directive Box */}
                  <div className="p-3 rounded-lg bg-[#3b2a52]/10 border border-[#5d3b8f]/30 text-xs font-mono text-[#381f57]">
                    <span className="font-bold uppercase tracking-wider block text-[10px] text-[#5d3b8f] mb-1">
                      Recovered Incident Log (Record CF-6DB6):
                    </span>
                    &ldquo;Facility operational shutdown initiated on August 15, 1996. All temporal logs quarantined under operation codename VESPER.&rdquo;
                  </div>

                  <p className="text-xs sm:text-sm font-serif leading-relaxed text-[#2a1d36]">
                    <b>The 12 Archive Fragments:</b> Twelve vital document scraps lie hidden across filing cabinets, the microfilm reader, and clerk desks. Collecting all 12 unlocks the sector&apos;s records basket, allowing you to solve clues <b>R2-01 to R2-04</b> and unseal the massive chained bulkhead door.
                  </p>
                </div>
              )}

              {/* PAGE 3: SECTOR V - THE SURVEILLANCE MORGUE */}
              {page === 3 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#4c2d73] uppercase tracking-wider">
                    <span>Chapter III</span>
                    <span>&bull;</span>
                    <span>Sector V: The Surveillance Morgue</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-elite text-[#271838] tracking-wide leading-tight">
                    The Listening Post in the Dark
                  </h2>
                  <div className="w-16 h-[2px] bg-[#6b5596]/40" />

                  <p className="text-xs sm:text-sm font-serif leading-relaxed text-[#2a1d36]">
                    <span className="float-left text-3xl sm:text-4xl font-elite leading-none mr-2 text-[#4c2d73] font-bold">
                      B
                    </span>
                    eyond the first rotary corridor fork lies Chamber V: The Surveillance Morgue. This reinforced tactical observation bunker was built to record and monitor the entity&apos;s anomalous acoustic emissions through banks of vintage monochrome CCTV monitors and Akai reel-to-reel tape decks.
                  </p>

                  <p className="text-xs sm:text-sm font-serif leading-relaxed text-[#2a1d36]">
                    The researchers discovered that the anomaly did not speak through physical vocal cords—it infiltrated telephone carrier waves and voicemail archives, masking its presence within high-frequency audio noise.
                  </p>

                  {/* Spectrogram Discovery Box */}
                  <div className="p-2.5 rounded-lg bg-[#3b2a52]/10 border border-[#6b5596]/30 text-xs font-mono text-[#381f57]">
                    <b>The 10 Surveillance Fragments:</b> Recovering the 10 scattered telemetry printouts unseals the personnel index and audio spectrogram terminals (<b>R2-05 to R2-07</b>), uncovering operator credential <b>BDG-0417</b> and the 4-digit voicemail pin (<b>6027</b>).
                  </div>
                </div>
              )}

              {/* PAGE 4: SECTOR VI - THE ANOINTING VAULT */}
              {page === 4 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#4c2d73] uppercase tracking-wider">
                    <span>Chapter IV</span>
                    <span>&bull;</span>
                    <span>Sector VI: The Anointing Vault</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-elite text-[#271838] tracking-wide leading-tight">
                    The Altar of the Monolith
                  </h2>
                  <div className="w-16 h-[2px] bg-[#6b5596]/40" />

                  <p className="text-xs sm:text-sm font-serif leading-relaxed text-[#2a1d36]">
                    <span className="float-left text-3xl sm:text-4xl font-elite leading-none mr-2 text-[#4c2d73] font-bold">
                      T
                    </span>
                    hrough the second quarantine fork lies the deepest sanctum: Chamber VI: The Anointing Vault. Unlike the sterile bunker rooms above, this is an ancient subterranean stone cathedral carved directly into the bedrock, illuminated by pulsating crimson containment lamps.
                  </p>

                  <p className="text-xs sm:text-sm font-serif leading-relaxed text-[#2a1d36]">
                    At the center stands the high-amperage failsafe circuit and a massive stone altar. This is the origin point of the breach—where lead engineer Corvin tampered with revision ledgers and attempted to bind the entity.
                  </p>

                  <p className="text-xs sm:text-sm font-serif leading-relaxed text-[#2a1d36]">
                    <b>The Zero-Fragment Chamber:</b> Unlike previous sectors, there are no scattered fragments to find in the Vault. Survival relies entirely on the verified codes, manual diffs, and credentials brought forward from the earlier chambers.
                  </p>
                </div>
              )}

              {/* PAGE 5: THE FINAL CONVERGENCE */}
              {page === 5 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#4c2d73] uppercase tracking-wider">
                    <span>Chapter V</span>
                    <span>&bull;</span>
                    <span>The Permanent Containment Failsafe</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-elite text-[#271838] tracking-wide leading-tight">
                    The Convergence Protocol
                  </h2>
                  <div className="w-16 h-[2px] bg-[#6b5596]/40" />

                  <p className="text-xs sm:text-sm font-serif leading-relaxed text-[#2a1d36]">
                    <span className="float-left text-3xl sm:text-4xl font-elite leading-none mr-2 text-[#4c2d73] font-bold">
                      T
                    </span>
                    he security architecture of Sub-Station Delta is an interlocking cryptographic chain. No single clue can purge the facility on its own. Every codeword, date, and frequency you have recorded converges at the final altar console:
                  </p>

                  {/* Failsafe Stages Box */}
                  <div className="p-3 rounded-lg bg-[#2b1740]/10 border-l-4 border-[#5d3b8f] text-xs font-mono text-[#361e57] space-y-1">
                    <span className="font-bold block uppercase text-[#4c2d73]">The 3 Final Vault Stages:</span>
                    <div>1. <b>Manual Diff (R2-08):</b> Detect the altered revision line in Corvin&apos;s ledger.</div>
                    <div>2. <b>Failsafe Relay (R2-09):</b> Configure the 4-bit binary relay matrix (1001).</div>
                    <div>3. <b>Final Master Containment (R2-10):</b> Transmit the full triad: Convergence Key &bull; Relay Code &bull; Personnel Badge!</div>
                  </div>

                  <p className="text-xs sm:text-sm font-serif leading-relaxed text-[#2a1d36]">
                    Engaging the master failsafe permanently seals Sub-Station Delta, venting the temporal resonance and lifting the curse once and for all.
                  </p>
                </div>
              )}
            </div>

            {/* Bottom Page Navigation Controls */}
            <div className="relative z-10 px-6 sm:px-10 py-3.5 border-t border-[#614d7a]/25 bg-[#e3d8c8]/70 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono">
              {/* Previous Button */}
              <button
                type="button"
                onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-[#614d7a]/40 bg-[#f5f1e8] hover:bg-white text-[#382650] font-bold transition shadow-sm"
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
                        ? 'bg-[#5d3b8f] text-white shadow-sm'
                        : 'bg-[#614d7a]/15 text-[#422e5a] hover:bg-[#614d7a]/30'
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
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-[#5d3b8f]/60 bg-[#5d3b8f] hover:bg-[#734cb0] text-white font-bold transition shadow-sm"
                >
                  <span>Next Page</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-[#301d4a]/60 bg-[#25153b] hover:bg-black text-[#f3f0ff] font-bold transition shadow-sm"
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