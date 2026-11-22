import React, { useEffect } from 'react';
import { X, Flame, ShieldAlert, Compass, Sparkles, Key, AlertTriangle, Clock, Layers, GitFork, BookOpen } from 'lucide-react';

export default function Round2DossierModal({ isOpen, onClose, isLobby = false }) {
  const onCloseRef = React.useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' || e.key === 'r' || e.key === 'R' || e.code === 'KeyR' || (isLobby && (e.key === 's' || e.key === 'S' || e.code === 'KeyS'))) {
        e.preventDefault();
        e.stopPropagation();
        onCloseRef.current?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, isLobby]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 select-none font-serif lining-nums tabular-nums overflow-y-auto"
      style={{ fontVariantNumeric: 'lining-nums' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Outer Charred Glow Container */}
      <div className="relative w-full max-w-4xl my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Jagged Charred Border Layer */}
        <div 
          className="relative bg-[#e9d9b6] text-[#2c1d11] rounded-sm shadow-[0_0_80px_rgba(255,100,20,0.35),0_0_40px_rgba(0,0,0,0.9),inset_0_0_100px_rgba(70,35,10,0.45)] border-[6px] border-[#29170a] overflow-hidden"
          style={{
            backgroundImage: `
              radial-gradient(ellipse at 0% 0%, rgba(30,15,5,0.7) 0%, transparent 25%),
              radial-gradient(ellipse at 100% 0%, rgba(30,15,5,0.75) 0%, transparent 28%),
              radial-gradient(ellipse at 0% 100%, rgba(20,10,3,0.85) 0%, transparent 32%),
              radial-gradient(ellipse at 100% 100%, rgba(25,12,4,0.85) 0%, transparent 30%),
              radial-gradient(circle at 50% 50%, rgba(255,248,225,0.3) 0%, rgba(205,175,130,0.5) 100%)
            `,
            boxShadow: 'inset 0 0 45px rgba(20, 8, 2, 0.8), 0 15px 50px rgba(0,0,0,0.95)'
          }}
        >
          {/* Scorched Perimeter Glow Overlay */}
          <div className="absolute inset-0 pointer-events-none border-t-[8px] border-b-[8px] border-r-[8px] border-l-[8px] border-[#1f1006]/90 shadow-[inset_0_0_35px_#140702]" />

          {/* Burnt Paper Side Streaks / Gradients */}
          <div className="absolute top-0 bottom-0 left-0 w-8 bg-gradient-to-r from-[#180a03]/90 via-[#3a1b0a]/40 to-transparent pointer-events-none" />
          <div className="absolute top-0 bottom-0 right-0 w-8 bg-gradient-to-l from-[#180a03]/90 via-[#3a1b0a]/40 to-transparent pointer-events-none" />
          <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-[#180a03]/90 via-[#3a1b0a]/40 to-transparent pointer-events-none" />
          <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[#180a03]/90 via-[#3a1b0a]/40 to-transparent pointer-events-none" />

          {/* Watermark / Occult Stamp Background */}
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.06] pointer-events-none select-none">
            <div className="w-[450px] h-[450px] rounded-full border-[18px] border-dashed border-[#57190d] flex items-center justify-center">
              <span className="text-8xl font-black text-[#57190d] rotate-[-25deg] tracking-widest uppercase">
                SUB-STATION
              </span>
            </div>
          </div>

          {/* Dossier Header */}
          <div className="relative px-6 sm:px-10 pt-8 pb-4 border-b-2 border-[#54301a]/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono tracking-widest text-[#7a2818] uppercase font-bold">
                <Flame className="w-4 h-4 text-[#b9381e] animate-pulse" />
                <span>ARCHIVAL DOSSIER // SUB-STATION DELTA</span>
                <span className="px-1.5 py-0.5 rounded bg-[#481c13] text-[#ffddba] text-[10px]">
                  ROUND 2 MANDATE
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#2a1409] tracking-tight mt-1 font-serif">
                Subterranean Protocol &amp; Survival Mandate
              </h1>
              <p className="text-xs text-[#5f412c] italic mt-0.5 font-serif">
                Uncover suppressed facility records, breach surveillance telemetry, and engage the permanent containment failsafe.
              </p>
            </div>

            {/* Red Wax Seal Stamp & Close Button */}
            <div className="flex items-center gap-3 self-end sm:self-auto">
              <div className="hidden sm:flex flex-col items-center justify-center w-16 h-16 rounded-full bg-[#7a1818] text-[#f7e0b5] border-2 border-[#420a0a] shadow-[inset_0_0_12px_rgba(0,0,0,0.7),0_4px_10px_rgba(0,0,0,0.5)] rotate-[-6deg] p-1 text-center select-none">
                <span className="text-[8px] font-mono tracking-tighter uppercase leading-tight font-bold">SECTOR</span>
                <span className="text-xs font-black">DELTA</span>
                <span className="text-[7px] font-mono tracking-tighter uppercase leading-tight font-bold">LEVEL-2</span>
              </div>
              <button
                onClick={onClose}
                className="group flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#3d2011] hover:bg-[#5a2e18] text-[#f2e5cf] border border-[#210f07] transition text-xs font-mono shadow-md"
                title="Close Dossier (Press R or ESC)"
              >
                <X className="w-4 h-4 text-[#ffaa75] group-hover:rotate-90 transition-transform" />
                <span>CLOSE [R]</span>
              </button>
            </div>
          </div>

          {/* Dossier Body Content */}
          <div className="relative px-6 sm:px-10 py-6 max-h-[72vh] overflow-y-auto space-y-6 text-[#352114] text-xs sm:text-sm leading-relaxed custom-scrollbar">
            
            {/* ================================================================= */}
            {/* STORYLINE PROLOGUE (Displayed Exclusively in Round 2 Lobby)       */}
            {/* ================================================================= */}
            {isLobby && (
              <div className="p-4 rounded-lg bg-[#2b1308]/15 border-2 border-[#8c431d]/40 shadow-sm space-y-3">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#8a2a16] uppercase tracking-wider border-b border-[#8c431d]/30 pb-1.5">
                  <BookOpen className="w-4 h-4 text-[#a83216]" />
                  <span>Prologue: The Subterranean Breach (Bridging Round 1 &amp; Round 2)</span>
                </div>
                
                <p className="text-xs sm:text-sm font-serif leading-relaxed text-[#2f1f18]">
                  <span className="float-left text-3xl font-elite leading-none mr-2 text-[#881337] font-bold">
                    W
                  </span>
                  hen your team reconstructed the shattered family portrait in Hollow House and sealed the basement console, you believed the nightmare was over. But that restoration only severed the surface anchor. The terminal override tripped ancient facility relays buried two levels beneath the foundation, tearing open the heavy reinforced bulkheads to <b>Sub-Station Delta</b>.
                </p>

                <p className="text-xs sm:text-sm font-serif leading-relaxed text-[#2f1f18]">
                  Hollow House was never an ordinary home. In 1996, a secret government telemetry project (Codename: <i>Project HOLLOW</i>) established a covert underground testing facility directly beneath the Vance property to conduct voice-containment and temporal resonance trials. When the final containment experiment collapsed in August 1996, the installation was abruptly abandoned, sealed behind heavy hydraulic blast doors, and left to rot in the dark.
                </p>

                {/* Why each room exists */}
                <div className="mt-2 pt-2 border-t border-[#8c431d]/25 space-y-2">
                  <div className="text-[11px] font-mono font-bold text-[#682312] uppercase tracking-wider">
                    Why the Three Subterranean Sectors Exist:
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-[11px] font-sans">
                    <div className="p-2.5 rounded bg-[#f5e8cf]/90 border border-[#85502c]/30">
                      <b className="text-[#631f10] block font-serif">1. The Rotting Archive</b>
                      <p className="text-[#4a3222] mt-1 leading-snug">
                        The flooded records depository where classified project logs, incident reports, and microfilms were abandoned when the facility was condemned.
                      </p>
                    </div>

                    <div className="p-2.5 rounded bg-[#f5e8cf]/90 border border-[#85502c]/30">
                      <b className="text-[#631f10] block font-serif">2. The Surveillance Morgue</b>
                      <p className="text-[#4a3222] mt-1 leading-snug">
                        The fortified observation bunker equipped with CCTV feeds, audio reel decks, and radio receivers where operators monitored the entity's acoustic signatures.
                      </p>
                    </div>

                    <div className="p-2.5 rounded bg-[#f5e8cf]/90 border border-[#85502c]/30">
                      <b className="text-[#631f10] block font-serif">3. The Anointing Vault</b>
                      <p className="text-[#4a3222] mt-1 leading-snug">
                        The deepest monolithic sanctum housing the high-voltage failsafe matrix and altar where the resonance was born—and where it must be permanently shut down.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ================================================================= */}
            {/* SECTION 1: THE THREE CHAMBERS & FRAGMENT QUOTAS                   */}
            {/* ================================================================= */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-b border-[#633a21]/30 pb-1.5">
                <Compass className="w-4 h-4 text-[#8a331c]" />
                <h2 className="text-sm sm:text-base font-bold text-[#5c1c0e] uppercase tracking-wide">
                  1. Sector 02 Chambers &amp; Fragment Distributions
                </h2>
              </div>
              <p className="text-xs text-[#4e3423] font-serif">
                Round 2 spans three specialized underground chambers. Each sector operates under strict fragment collection quotas and sequential terminal access:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs">
                {/* Chamber 4 */}
                <div className="p-3.5 rounded border border-[#5a361e]/40 bg-[#f9eed7]/80 shadow-sm relative">
                  <div className="text-[10px] font-bold text-[#8a331c] uppercase tracking-widest mb-1">
                    CHAMBER IV
                  </div>
                  <div className="font-bold text-[#2a1307] text-sm font-serif">The Rotting Archive</div>
                  <div className="mt-2 space-y-1 text-[#4a3222] text-[11px]">
                    <div>• <b>12 Fragments</b> (10 Evidence + 2 Decoys)</div>
                    <div>• <b>4 Sequential Clues</b></div>
                    <div className="text-[10px] text-[#6b472e] italic mt-1 font-serif">
                      Sub-basement filing cabinets, microfilm, timeline board, and convergence bulkhead.
                    </div>
                  </div>
                </div>

                {/* Chamber 5 */}
                <div className="p-3.5 rounded border border-[#5a361e]/40 bg-[#f9eed7]/80 shadow-sm relative">
                  <div className="text-[10px] font-bold text-[#8a331c] uppercase tracking-widest mb-1">
                    CHAMBER V
                  </div>
                  <div className="font-bold text-[#2a1307] text-sm font-serif">The Surveillance Morgue</div>
                  <div className="mt-2 space-y-1 text-[#4a3222] text-[11px]">
                    <div>• <b>10 Fragments</b> (8 Evidence + 2 Decoys)</div>
                    <div>• <b>3 Sequential Clues</b></div>
                    <div className="text-[10px] text-[#6b472e] italic mt-1 font-serif">
                      Personnel archives, reel-to-reel transmissions, and spectrogram voicemail monitors.
                    </div>
                  </div>
                </div>

                {/* Chamber 6 */}
                <div className="p-3.5 rounded border border-[#5a361e]/40 bg-[#f9eed7]/80 shadow-sm relative">
                  <div className="text-[10px] font-bold text-[#8a331c] uppercase tracking-widest mb-1">
                    CHAMBER VI
                  </div>
                  <div className="font-bold text-[#2a1307] text-sm font-serif">The Anointing Vault</div>
                  <div className="mt-2 space-y-1 text-[#4a3222] text-[11px]">
                    <div>• <b>0 Fragments</b> (Direct Puzzle Chamber)</div>
                    <div>• <b>3 Sequential Clues</b></div>
                    <div className="text-[10px] text-[#6b472e] italic mt-1 font-serif">
                      No scattered fragments exist here. All focus is on manual diffs, failsafe breakers, and final altar containment.
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-xs bg-[#e0ccab]/60 p-2.5 rounded border border-[#855431]/30 font-mono flex items-center justify-between text-[#402715]">
                <span>ROUND 2 TOTALS: <b>22 Fragments</b></span>
                <span><b>10 Clues</b></span>
                <span><b>2 Dual-Path Forks</b></span>
              </div>
            </div>

            {/* ================================================================= */}
            {/* SECTION 2: CRUCIAL FIELD INVESTIGATION DIRECTIVES                 */}
            {/* ================================================================= */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-b border-[#633a21]/30 pb-1.5">
                <Key className="w-4 h-4 text-[#8a331c]" />
                <h2 className="text-sm sm:text-base font-bold text-[#5c1c0e] uppercase tracking-wide">
                  2. Essential Tactical Directives for Sector 02
                </h2>
              </div>
              
              <div className="space-y-3 text-xs sm:text-sm text-[#462d1d]">
                
                {/* 1. Answers of Previous Clues Feed Forward */}
                <div className="p-3 rounded bg-[#f3e7ce]/70 border border-[#7a4823]/25 space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-[#8a331c]">
                    <Layers className="w-4 h-4 text-[#8a331c]" />
                    <span className="uppercase tracking-wide text-xs">Cross-Chamber Continuity (Answers Feed Forward)</span>
                  </div>
                  <p className="text-xs text-[#523420] leading-relaxed">
                    <b>Do not discard solved clues!</b> Answers, verified codewords, operator badge numbers, timestamps, and frequencies discovered in previous chambers will be required to unlock terminals and solve puzzles in subsequent rooms. Maintain written notes of every verified solution your team enters.
                  </p>
                </div>

                {/* 2. Multiple Clues in Single Objects */}
                <div className="p-3 rounded bg-[#f3e7ce]/70 border border-[#7a4823]/25 space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-[#8a331c]">
                    <Sparkles className="w-4 h-4 text-[#8a331c]" />
                    <span className="uppercase tracking-wide text-xs">Multiple Clues Concealed Within Single Objects</span>
                  </div>
                  <p className="text-xs text-[#523420] leading-relaxed">
                    Never assume an interactive prop or terminal is depleted after solving a single puzzle. Certain key furniture items, terminals, and observation consoles in Sector 02 conceal <b>multiple distinct clues</b> that become operational at different stages of your investigation.
                  </p>
                </div>

                {/* 3. Strict Sequential Progression */}
                <div className="p-3 rounded bg-[#f3e7ce]/70 border border-[#7a4823]/25 space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-[#8a331c]">
                    <Key className="w-4 h-4 text-[#8a331c]" />
                    <span className="uppercase tracking-wide text-xs">Strict Sequential Clue &amp; Fragment Progression</span>
                  </div>
                  <ul className="space-y-1 list-disc list-inside text-xs text-[#523420] leading-relaxed">
                    <li>
                      <b>Sequential Fragment Hunting:</b> In Chambers IV and V, evidence fragments must be gathered in sequence to unseal the Evidence Basket (press <b>[B]</b>). Clue terminals remain sealed until the basket is unlocked.
                    </li>
                    <li>
                      <b>Sequential Clue Gating:</b> Clues must be solved in strict chronological order. Attempting a later terminal out of order triggers a lock notification indicating which prerequisite must be cleared first.
                    </li>
                    <li>
                      <b>3 Attempts Per Clue:</b> If your team fails 3 attempts on any clue, it becomes exhausted (awards 0 points and adds a <b>+90s penalty</b>), and the next clue unlocks automatically so your team is never trapped.
                    </li>
                  </ul>
                </div>

                {/* 4. Branching Fork Decisions */}
                <div className="p-3 rounded bg-[#f3e7ce]/70 border border-[#7a4823]/25 space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-[#8a331c]">
                    <GitFork className="w-4 h-4 text-[#8a331c]" />
                    <span className="uppercase tracking-wide text-xs">Branching Fork Corridors (Do Not Gamble)</span>
                  </div>
                  <p className="text-xs text-[#523420] leading-relaxed">
                    Connecting corridors branch into dual paths. One conduit safely connects to the next sector, while the other is a sealed quarantine trap. <b>This is not a random gamble.</b> The correct route is always governed by the authentic project directives and codewords you verified in that room's clues. Entering the forged archway incurs a severe <b>60-second time penalty</b> and violent trap reset!
                  </p>
                </div>

              </div>
            </div>

            {/* ================================================================= */}
            {/* SECTION 3: ROUND 2 HINT SYSTEM                                    */}
            {/* ================================================================= */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-b border-[#633a21]/30 pb-1.5">
                <Clock className="w-4 h-4 text-[#8a331c]" />
                <h2 className="text-sm sm:text-base font-bold text-[#5c1c0e] uppercase tracking-wide">
                  3. Round 2 Hint System &amp; Penalties
                </h2>
              </div>

              <div className="bg-[#f2e5cb] p-3.5 rounded border border-[#6b4224]/30 space-y-2.5 text-xs">
                <div className="flex items-center justify-between font-mono font-bold text-[#7a2212] border-b border-[#7a2212]/20 pb-1.5">
                  <span>ROUND 2 BUDGET: 15 FRESH HINTS</span>
                  <span>INDEPENDENT FROM ROUND 1</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-0.5">
                  <div className="p-2.5 rounded bg-[#ebd7b5]/60 border border-[#7a4823]/25 space-y-1.5">
                    <div className="flex items-center justify-between font-bold text-[#8a331c]">
                      <span className="text-sm">Fragment Location Hint</span>
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-[#7a2212]/15 text-[#7a2212] font-bold">
                        +10s penalty
                      </span>
                    </div>
                    <p className="text-[11px] text-[#543825] leading-normal font-sans">
                      Stuck finding uncollected evidence? Reveals which storage prop holds the next active sequential fragment.
                    </p>
                    <div className="text-[10px] text-[#3e2718] font-sans border-t border-[#7a4823]/15 pt-1">
                      <b>Score Impact:</b> <span className="font-mono font-bold bg-[#ebd7b5] px-1 py-0.2 rounded border border-[#7a4823]/30">0</span> score deduction (adds only +10s to adjusted time).
                    </div>
                  </div>

                  <div className="p-2.5 rounded bg-[#ebd7b5]/60 border border-[#7a4823]/25 space-y-1.5">
                    <div className="flex items-center justify-between font-bold text-[#8a331c]">
                      <span className="text-sm">Clue Guidance Hint</span>
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-[#7a2212]/15 text-[#7a2212] font-bold">
                        +30s penalty
                      </span>
                    </div>
                    <p className="text-[11px] text-[#543825] leading-normal font-sans">
                      Stuck deciphering a terminal? Reveals cryptographic methods, target frequency ranges, and offset guidance.
                    </p>
                    <div className="text-[10px] text-[#8a331c] font-sans border-t border-[#7a4823]/15 pt-1">
                      <b>Score Impact:</b> Deducts <span className="font-mono font-bold bg-[#ebd7b5] px-1 py-0.2 rounded border border-[#7a4823]/30">15</span> pts (awards 85 pts). The Vault finale deducts <span className="font-mono font-bold bg-[#ebd7b5] px-1 py-0.2 rounded border border-[#7a4823]/30">30</span> pts (awards 70 pts).
                    </div>
                  </div>
                </div>

                <div className="p-2.5 rounded bg-[#ebd7b5]/60 border border-[#7a4823]/25 space-y-1.5">
                  <div className="flex items-center justify-between font-bold text-[#8a331c]">
                    <span className="text-sm">Clue Attempt Exhaustion (3 Strikes)</span>
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-[#7a2212]/15 text-[#7a2212] font-bold">
                      +90s penalty
                    </span>
                  </div>
                  <p className="text-[11px] text-[#543825] leading-normal font-sans">
                    Exhausting all 3 verification attempts on any clue console triggers a permanent security lockout and adds a 90-second facility penalty to your adjusted time.
                  </p>
                  <div className="text-[10px] text-[#8a331c] font-sans border-t border-[#7a4823]/15 pt-1">
                    <b>Score Impact:</b> Awards <span className="font-mono font-bold bg-[#ebd7b5] px-1 py-0.2 rounded border border-[#7a4823]/30">0</span> points. The next sequential clue terminal unlocks automatically.
                  </div>
                </div>

                <div className="pt-2 border-t border-[#6b4224]/20 text-[11px] text-[#3e2718]">
                  <span>
                    <b>Free Re-Reading:</b> Re-opening an already purchased hint is 100% free with{' '}
                    <span className="font-mono font-bold bg-[#ebd7b5] px-1.5 py-0.2 rounded border border-[#7a4823]/30">0</span> penalty and{' '}
                    <span className="font-mono font-bold bg-[#ebd7b5] px-1.5 py-0.2 rounded border border-[#7a4823]/30">0</span> budget cost.
                  </span>
                </div>
              </div>
            </div>

            {/* ================================================================= */}
            {/* SECTION 4: SCORING & TACTICAL CONTROLS                            */}
            {/* ================================================================= */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-b border-[#633a21]/30 pb-1.5">
                <ShieldAlert className="w-4 h-4 text-[#8a331c]" />
                <h2 className="text-sm sm:text-base font-bold text-[#5c1c0e] uppercase tracking-wide">
                  4. Tactical Controls &amp; Standings
                </h2>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center font-mono text-[11px]">
                <div className="p-2 rounded bg-[#ded0b6] border border-[#7a4b27]/30">
                  <kbd className="px-1.5 py-0.5 bg-[#2c170b] text-[#f5ebd7] rounded text-[10px] font-bold">WASD</kbd>
                  <span className="block text-[10px] text-[#4f3320] mt-1">Move Character</span>
                </div>
                <div className="p-2 rounded bg-[#ded0b6] border border-[#7a4b27]/30">
                  <kbd className="px-1.5 py-0.5 bg-[#2c170b] text-[#f5ebd7] rounded text-[10px] font-bold">E</kbd>
                  <span className="block text-[10px] text-[#4f3320] mt-1">Search / Operate</span>
                </div>
                <div className="p-2 rounded bg-[#ded0b6] border border-[#7a4b27]/30">
                  <kbd className="px-1.5 py-0.5 bg-[#2c170b] text-[#f5ebd7] rounded text-[10px] font-bold">B</kbd>
                  <span className="block text-[10px] text-[#4f3320] mt-1">Evidence Basket</span>
                </div>
                <div className="p-2 rounded bg-[#ded0b6] border border-[#7a4b27]/30">
                  <kbd className="px-1.5 py-0.5 bg-[#2c170b] text-[#f5ebd7] rounded text-[10px] font-bold">C</kbd>
                  <span className="block text-[10px] text-[#4f3320] mt-1">Case Dossier</span>
                </div>
                <div className="p-2 rounded bg-[#ded0b6] border border-[#7a4b27]/30">
                  <kbd className="px-1.5 py-0.5 bg-[#2c170b] text-[#f5ebd7] rounded text-[10px] font-bold">H</kbd>
                  <span className="block text-[10px] text-[#4f3320] mt-1">Guidance Hints</span>
                </div>
                <div className="p-2 rounded bg-[#ded0b6] border border-[#7a4b27]/30">
                  <kbd className="px-1.5 py-0.5 bg-[#2c170b] text-[#f5ebd7] rounded text-[10px] font-bold">F</kbd>
                  <span className="block text-[10px] text-[#4f3320] mt-1">Tactical Flashlight</span>
                </div>
                <div className="p-2 rounded bg-[#481c13] text-[#ffe3cc] border border-[#8a331c] shadow-sm">
                  <kbd className="px-1.5 py-0.5 bg-[#872314] text-[#fff] rounded text-[10px] font-bold">R</kbd>
                  <span className="block text-[10px] mt-1 font-bold">This Rules Dossier</span>
                </div>
                <div className="p-2 rounded bg-[#ded0b6] border border-[#7a4b27]/30">
                  <kbd className="px-1.5 py-0.5 bg-[#2c170b] text-[#f5ebd7] rounded text-[10px] font-bold">ESC</kbd>
                  <span className="block text-[10px] text-[#4f3320] mt-1">Close Modal</span>
                </div>
              </div>
            </div>

          </div>

          {/* Charred Soot Bottom Footer Strip */}
          <div className="relative px-6 sm:px-10 py-3 bg-[#261309] border-t-2 border-[#160a04] flex items-center justify-between text-xs font-mono text-[#d6be9a]">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#ffaa00] animate-ping" />
              <span className="text-[11px] text-[#bda380]">PRESS [R] ANYWHERE TO TOGGLE DOSSIER</span>
            </div>
            <button
              onClick={onClose}
              className="px-3.5 py-1 rounded bg-[#421f10] hover:bg-[#5e2b16] text-[#ffdfba] border border-[#5a2e18] transition text-xs font-bold"
            >
              I Understand (R)
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
