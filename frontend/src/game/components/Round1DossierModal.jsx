import React, { useEffect } from 'react';
import { X, Flame, ShieldAlert, Compass, Sparkles, Key, AlertTriangle, Clock } from 'lucide-react';

export default function Round1DossierModal({ isOpen, onClose }) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' || e.key === 'r' || e.key === 'R' || e.code === 'KeyR') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 select-none font-serif lining-nums tabular-nums overflow-y-auto"
      style={{ fontVariantNumeric: 'lining-nums' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Outer Burnt / Charred Glow Effect */}
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
                CONFIDENTIAL
              </span>
            </div>
          </div>

          {/* Dossier Header */}
          <div className="relative px-6 sm:px-10 pt-8 pb-4 border-b-2 border-[#54301a]/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono tracking-widest text-[#7a2818] uppercase font-bold">
                <Flame className="w-4 h-4 text-[#b9381e] animate-pulse" />
                <span>ARCHIVAL DOSSIER // CURSE THE CODE</span>
                <span className="px-1.5 py-0.5 rounded bg-[#481c13] text-[#ffddba] text-[10px]">
                  ROUND 1 PROTOCOL
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#2a1409] tracking-tight mt-1 font-serif">
                Field Investigation & Survival Mandate
              </h1>
              <p className="text-xs text-[#5f412c] italic mt-0.5 font-serif">
                Recover the Vance family fragments, unlock the seals sequentially, and breach the containment terminal.
              </p>
            </div>

            {/* Red Wax Seal Stamp & Close Button */}
            <div className="flex items-center gap-3 self-end sm:self-auto">
              <div className="hidden sm:flex flex-col items-center justify-center w-16 h-16 rounded-full bg-[#7a1818] text-[#f7e0b5] border-2 border-[#420a0a] shadow-[inset_0_0_12px_rgba(0,0,0,0.7),0_4px_10px_rgba(0,0,0,0.5)] rotate-[-6deg] p-1 text-center select-none">
                <span className="text-[8px] font-mono tracking-tighter uppercase leading-tight font-bold">HOLLOW</span>
                <span className="text-xs font-black">1984</span>
                <span className="text-[7px] font-mono tracking-tighter uppercase leading-tight font-bold">SEALED</span>
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
            
            {/* Section 1: The Three Nightmare Chambers */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-b border-[#633a21]/30 pb-1.5">
                <Compass className="w-4 h-4 text-[#8a331c]" />
                <h2 className="text-sm sm:text-base font-bold text-[#5c1c0e] uppercase tracking-wide">
                  1. The Three Chambers of Hollow House
                </h2>
              </div>
              <p className="text-xs text-[#4e3423] font-serif">
                You must investigate three corrupted rooms in strict chronological progression. Every room demands fragment recovery before evidence files can be unsealed:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs">
                {/* Room 1 */}
                <div className="p-3.5 rounded border border-[#5a361e]/40 bg-[#f9eed7]/80 shadow-sm relative">
                  <div className="text-[10px] font-bold text-[#8a331c] uppercase tracking-widest mb-1">
                    CHAMBER I
                  </div>
                  <div className="font-bold text-[#2a1307] text-sm font-serif">Lena's Bedroom</div>
                  <div className="mt-2 space-y-1 text-[#4a3222] text-[11px]">
                    <div>• <b>15 Fragments</b> (13 Evidence + 2 Decoys)</div>
                    <div>• <b>4 Sequential Clues</b> (R1-01 → R1-04)</div>
                    <div className="text-[10px] text-[#6b472e] italic mt-1 font-serif">
                      Diary, Notebook, Torn Poster, Family Portrait.
                    </div>
                  </div>
                </div>

                {/* Room 2 */}
                <div className="p-3.5 rounded border border-[#5a361e]/40 bg-[#f9eed7]/80 shadow-sm relative">
                  <div className="text-[10px] font-bold text-[#8a331c] uppercase tracking-widest mb-1">
                    CHAMBER II
                  </div>
                  <div className="font-bold text-[#2a1307] text-sm font-serif">Daniel's Study</div>
                  <div className="mt-2 space-y-1 text-[#4a3222] text-[11px]">
                    <div>• <b>16 Fragments</b> (14 Evidence + 2 Decoys)</div>
                    <div>• <b>4 Sequential Clues</b> (R1-05 → R1-08)</div>
                    <div className="text-[10px] text-[#6b472e] italic mt-1 font-serif">
                      Tablet, CRT Email, Crash Log, Line Printer.
                    </div>
                  </div>
                </div>

                {/* Room 3 */}
                <div className="p-3.5 rounded border border-[#5a361e]/40 bg-[#f9eed7]/80 shadow-sm relative">
                  <div className="text-[10px] font-bold text-[#8a331c] uppercase tracking-widest mb-1">
                    CHAMBER III
                  </div>
                  <div className="font-bold text-[#2a1307] text-sm font-serif">Subterranean Basement</div>
                  <div className="mt-2 space-y-1 text-[#4a3222] text-[11px]">
                    <div>• <b>5 Fragments</b> (3 Evidence + 2 Decoys)</div>
                    <div>• <b>3 Sequential Clues</b> (R1-09, R1-10, R1-FIN)</div>
                    <div className="text-[10px] text-[#6b472e] italic mt-1 font-serif">
                      Intercom Relay, Server Note, Containment Terminal.
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-xs bg-[#e0ccab]/60 p-2.5 rounded border border-[#855431]/30 font-mono flex items-center justify-between text-[#402715]">
                <span>ROUND 1 TOTALS: <b>36 Fragments</b></span>
                <span><b>11 Clues</b></span>
                <span><b>10 Photo Pieces</b></span>
              </div>
            </div>

            {/* Section 2: Sequential Progression (Fragments & Clues) */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-b border-[#633a21]/30 pb-1.5">
                <Key className="w-4 h-4 text-[#8a331c]" />
                <h2 className="text-sm sm:text-base font-bold text-[#5c1c0e] uppercase tracking-wide">
                  2. Strict Sequential Progression: Fragments & Clues
                </h2>
              </div>
              
              <div className="space-y-3 text-xs sm:text-sm text-[#462d1d]">
                {/* Fragment Sequencing */}
                <div className="p-3 rounded bg-[#f3e7ce]/70 border border-[#7a4823]/25 space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-[#8a331c]">
                    <Sparkles className="w-4 h-4 text-[#8a331c]" />
                    <span className="uppercase tracking-wide text-xs">Sequential Fragment Hunting</span>
                  </div>
                  <ul className="space-y-1 list-disc list-inside text-xs text-[#523420] leading-relaxed">
                    <li>
                      <b>Fragments Unlock in Strict Order:</b> Evidence scraps cannot be collected randomly. You must uncover Fragment 1 before Fragment 2 becomes discoverable, Fragment 2 before Fragment 3, and so on.
                    </li>
                    <li>
                      <b>Premature Inspections:</b> If you search a furniture object before its required sequential fragment is active, the game reports that the spot is dormant or locked until earlier evidence is found.
                    </li>
                    <li>
                      <b>Decoy Scraps:</b> False leads / decoys can be stumbled upon at any time, but only genuine numbered fragments advance your sequence.
                    </li>
                    <li>
                      <b>Evidence Basket Unlocking:</b> Once all required room fragments are collected sequentially, the room's Evidence Basket unlocks (press <b>[B]</b>), granting full access to solve the room's clues.
                    </li>
                  </ul>
                </div>

                {/* Clue Sequencing & Attempts */}
                <div className="p-3 rounded bg-[#f3e7ce]/70 border border-[#7a4823]/25 space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-[#8a331c]">
                    <Key className="w-4 h-4 text-[#8a331c]" />
                    <span className="uppercase tracking-wide text-xs">Sequential Clue Gating & Attempt Ceiling</span>
                  </div>
                  <ul className="space-y-1 list-disc list-inside text-xs text-[#523420] leading-relaxed">
                    <li>
                      <b>Sequential Clues:</b> Clues also unlock strictly in order (Clue 1 → Clue 2 → Clue 3 → ...). Attempting a later clue out of sequence prompts: <i>"Previous clue must be solved first."</i>
                    </li>
                    <li>
                      <b>3 Attempts Maximum:</b> Every clue permits up to <b>3 verification attempts</b>.
                    </li>
                    <li>
                      <b className="text-[#872012]">Exhaustion Rule (No Deadlocks):</b> If your team uses all 3 attempts without solving:
                      <ul className="list-circle list-inside ml-4 mt-1 space-y-0.5 text-[11px] text-[#6b3524]">
                        <li>The clue becomes <b>EXHAUSTED</b> (awards 0 score and 0 photo piece).</li>
                        <li>The <b>next sequential clue immediately unlocks</b> so your team is never blocked.</li>
                      </ul>
                    </li>
                    <li>
                      <b>Chamber Exit Doors:</b> The heavy door to the next room unlatches only when <b>every clue in the room is resolved</b> (either solved or exhausted).
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Section 3: Hints and Penalties */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-b border-[#633a21]/30 pb-1.5">
                <Clock className="w-4 h-4 text-[#8a331c]" />
                <h2 className="text-sm sm:text-base font-bold text-[#5c1c0e] uppercase tracking-wide">
                  3. Hints and Penalties
                </h2>
              </div>

              <div className="bg-[#f2e5cb] p-3.5 rounded border border-[#6b4224]/30 space-y-2.5 text-xs">
                <div className="flex items-center justify-between font-mono font-bold text-[#7a2212] border-b border-[#7a2212]/20 pb-1.5">
                  <span>HINT LIMIT: 15 TOTAL HINTS</span>
                  <span>SHARED ACROSS ALL 3 ROOMS</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-0.5">
                  <div className="p-2.5 rounded bg-[#ebd7b5]/60 border border-[#7a4823]/25 space-y-1.5">
                    <div className="flex items-center justify-between font-bold text-[#8a331c]">
                      <span className="text-sm">Fragment Hint</span>
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-[#7a2212]/15 text-[#7a2212] font-bold">
                        +10s penalty
                      </span>
                    </div>
                    <p className="text-[11px] text-[#543825] leading-normal font-sans">
                      Stuck searching for room fragments? A hint reveals which piece of furniture holds the next fragment.
                    </p>
                    <div className="text-[10px] text-[#3e2718] font-sans border-t border-[#7a4823]/15 pt-1">
                      <b>Score Impact:</b> <span className="font-mono font-bold bg-[#ebd7b5] px-1 py-0.2 rounded border border-[#7a4823]/30">0</span> points deducted (only adds +10s to time).
                    </div>
                  </div>

                  <div className="p-2.5 rounded bg-[#ebd7b5]/60 border border-[#7a4823]/25 space-y-1.5">
                    <div className="flex items-center justify-between font-bold text-[#8a331c]">
                      <span className="text-sm">Clue Hint</span>
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-[#7a2212]/15 text-[#7a2212] font-bold">
                        +30s penalty
                      </span>
                    </div>
                    <p className="text-[11px] text-[#543825] leading-normal font-sans">
                      Stuck solving a clue? A hint reveals solving guidance, cipher logic, and puzzle mechanics.
                    </p>
                    <div className="text-[10px] text-[#8a331c] font-sans border-t border-[#7a4823]/15 pt-1">
                      <b>Score Impact:</b> Solving with a hint deducts <span className="font-mono font-bold bg-[#ebd7b5] px-1 py-0.2 rounded border border-[#7a4823]/30">15</span> pts (awards 85 pts). The finale (R1-FIN) deducts <span className="font-mono font-bold bg-[#ebd7b5] px-1 py-0.2 rounded border border-[#7a4823]/30">30</span> pts (awards 70 pts).
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#6b4224]/20 text-[11px] text-[#3e2718]">
                  <span>
                    <b>Free Re-Reading:</b> Re-opening an already unlocked hint is 100% free. It adds{' '}
                    <span className="font-mono font-bold bg-[#ebd7b5] px-1.5 py-0.2 rounded border border-[#7a4823]/30">0</span> penalty time and uses{' '}
                    <span className="font-mono font-bold bg-[#ebd7b5] px-1.5 py-0.2 rounded border border-[#7a4823]/30">0</span> hints from your budget.
                  </span>
                </div>
              </div>
            </div>

            {/* Section 4: Scoring & Tournament Standings */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-b border-[#633a21]/30 pb-1.5">
                <ShieldAlert className="w-4 h-4 text-[#8a331c]" />
                <h2 className="text-sm sm:text-base font-bold text-[#5c1c0e] uppercase tracking-wide">
                  4. Scoring & Leaderboard Tie-Breakers
                </h2>
              </div>

              <div className="text-xs space-y-1.5 text-[#462d1d]">
                <p>
                  Leaderboard ranking is determined strictly by two tournament metrics:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-xs pt-1">
                  <div className="p-2.5 rounded bg-[#ebd7b5] border border-[#7a4823]/30">
                    <span className="font-bold text-[#2a1307] block">1. PRIMARY: TOTAL SCORE (1,100 MAX)</span>
                    <span className="text-[11px] text-[#5e3c23]">
                      Base 100 pts per clean solve. Solved with hint: 85 pts (-15 deduction) or 70 pts for R1-FIN (-30 deduction). Exhausted: 0 pts.
                    </span>
                  </div>
                  <div className="p-2.5 rounded bg-[#ebd7b5] border border-[#7a4823]/30">
                    <span className="font-bold text-[#2a1307] block">2. TIEBREAKER: ADJUSTED TIME</span>
                    <span className="text-[11px] text-[#5e3c23]">
                      Total Time = Elapsed Solve Duration + Accumulated Hint & Trap Penalties. Lowest time wins.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 5: Keyboard Shortcuts Reference */}
            <div className="space-y-2 pt-2 border-t border-[#633a21]/30">
              <div className="text-[11px] font-mono font-bold text-[#5c1c0e] uppercase tracking-wider">
                TACTICAL CONTROLS & SHORTCUT KEYS
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center font-mono text-[11px]">
                <div className="p-2 rounded bg-[#ded0b6] border border-[#7a4b27]/30">
                  <kbd className="px-1.5 py-0.5 bg-[#2c170b] text-[#f5ebd7] rounded text-[10px] font-bold">WASD</kbd>
                  <span className="block text-[10px] text-[#4f3320] mt-1">Move Around</span>
                </div>
                <div className="p-2 rounded bg-[#ded0b6] border border-[#7a4b27]/30">
                  <kbd className="px-1.5 py-0.5 bg-[#2c170b] text-[#f5ebd7] rounded text-[10px] font-bold">E</kbd>
                  <span className="block text-[10px] text-[#4f3320] mt-1">Search / Inspect</span>
                </div>
                <div className="p-2 rounded bg-[#ded0b6] border border-[#7a4b27]/30">
                  <kbd className="px-1.5 py-0.5 bg-[#2c170b] text-[#f5ebd7] rounded text-[10px] font-bold">B</kbd>
                  <span className="block text-[10px] text-[#4f3320] mt-1">Evidence Basket</span>
                </div>
                <div className="p-2 rounded bg-[#ded0b6] border border-[#7a4b27]/30">
                  <kbd className="px-1.5 py-0.5 bg-[#2c170b] text-[#f5ebd7] rounded text-[10px] font-bold">C</kbd>
                  <span className="block text-[10px] text-[#4f3320] mt-1">Case Files (Clues)</span>
                </div>
                <div className="p-2 rounded bg-[#ded0b6] border border-[#7a4b27]/30">
                  <kbd className="px-1.5 py-0.5 bg-[#2c170b] text-[#f5ebd7] rounded text-[10px] font-bold">P</kbd>
                  <span className="block text-[10px] text-[#4f3320] mt-1">Photo Puzzle</span>
                </div>
                <div className="p-2 rounded bg-[#481c13] text-[#ffe3cc] border border-[#8a331c] shadow-sm">
                  <kbd className="px-1.5 py-0.5 bg-[#872314] text-[#fff] rounded text-[10px] font-bold">R</kbd>
                  <span className="block text-[10px] mt-1 font-bold">This Rules Dossier</span>
                </div>
                <div className="p-2 rounded bg-[#ded0b6] border border-[#7a4b27]/30 col-span-2 sm:col-span-2">
                  <kbd className="px-1.5 py-0.5 bg-[#2c170b] text-[#f5ebd7] rounded text-[10px] font-bold">ESC</kbd>
                  <span className="inline-block text-[10px] text-[#4f3320] ml-2">Close Open Terminal / Modal</span>
                </div>
              </div>
            </div>

          </div>

          {/* Charred Soot Bottom Footer Strip */}
          <div className="relative px-6 sm:px-10 py-3 bg-[#261309] border-t-2 border-[#160a04] flex items-center justify-between text-xs font-mono text-[#d6be9a]">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#ff7a1a] animate-ping" />
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
