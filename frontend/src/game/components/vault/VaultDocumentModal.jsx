import React, { useMemo, useState } from 'react';

/**
 * Rich archival manuscripts, forensic clinical sheets, and cathedral ledgers
 * surfaced when inspecting physical props across Zones 6A–6D.
 */
export const VAULT_DOCUMENTS = {
  core_glass: {
    id: 'core_glass',
    wing: '6B · ANOINTING NAVE',
    folioCode: 'DOC-6B // GLAZE-04',
    classification: 'STRUCTURAL INTEGRITY REPORT',
    sealLabel: 'CONTAINMENT BAY 06',
    title: 'Borosilicate Viewport Fracture Analysis',
    subtitle: 'Reinforced Laminated Barrier · Central Sanctuary',
    dated: 'Recorded 03:14 UTC · Bay Shift #4',
    accent: '#ef4444',
    body: [
      'Surface examination confirms triple-ply borosilicate glass (42 mm composite) suffered a single conical percussion strike originating from the INTERIOR cavity.',
      'Acoustic transducers mounted to the brass mullion recorded a rhythmic 58 BPM thumping behind the red plasma prior to fracture. Do not strike or lean against the lower left mullion.',
    ],
    marginalia:
      'Dr. M. Corvin: "It mimics a human pulse to draw observers within two paces of the pane. Keep your torch angled upward and check both outer wings before touching the Altar."',
    telemetry: [
      { label: 'Core Pressure', value: '-14.2 kPa' },
      { label: 'Strike Origin', value: 'INTERNAL' },
      { label: 'Seal State', value: 'FRACTURED / HOLDING' },
    ],
    leadHint: 'Examine West Scriptorium (6C) and East Switchgear (6D) to stabilize the three interlock channels.',
  },

  countdown_timer: {
    id: 'countdown_timer',
    wing: '6B · ANOINTING NAVE',
    folioCode: 'CLK-DELTA // 15:00',
    classification: 'SOLENOID CHRONOMETER LOG',
    sealLabel: 'SUBSTATION DELTA',
    title: 'Split-Flap Vesper Chronometer Schematic',
    subtitle: 'Fixed Escapement Hold · North Sanctuary Arch',
    dated: 'Synchronized 03:15 UTC · Relay Lock Active',
    accent: '#f59e0b',
    body: [
      'Mechanical brass split-flap escapement locked at 15:00 awaiting tri-channel stabilization across Cathedral Vault Zone 6.',
      'Channel I terminates inside the West Scriptorium Terminal (6C). Channel II terminates at the East Switchgear Bus (6D). Channel III unlocks the Central Containment Altar once Channels I and II report GREEN.',
    ],
    marginalia:
      'Shift Note: "When the escapement clacks once, check both wings. Never brute-force the Altar solenoids before clearing Manual Diff (R2-08) and Failsafe Bus (R2-09)."',
    telemetry: [
      { label: 'Channel I (6C)', value: 'MANUAL DIFF (R2-08)' },
      { label: 'Channel II (6D)', value: 'FAILSAFE BUS (R2-09)' },
      { label: 'Channel III (6B)', value: 'ALTAR LOCK (R2-10)' },
    ],
    leadHint: 'Follow the West crimson runner into 6C for the Manual Diff Terminal, and East into 6D for the Failsafe Bus.',
  },

  narthex_registry: {
    id: 'narthex_registry',
    wing: '6A · NARTHEX DESCENT',
    folioCode: 'REG-6A // FOLIO-IV',
    classification: 'PARISH & LAB INTAKE LEDGER',
    sealLabel: 'SANCTUARY ENTRY',
    title: 'Narthex Admission & Watch Register',
    subtitle: 'Bound Vellum Folio · Brass Lectern',
    dated: 'Entries Logged 19 Nov · Final Watch',
    accent: '#fbbf24',
    body: [
      '01:40 — Junior Archivist M. Corvin admitted through South Gate with copper lantern and clean Liturgy Manual (v1).',
      '02:05 — Relay Engineer D. Vane descended into East Bay 6D with brass alligator leads. Left instructions on East workbench.',
      '02:48 — West door slammed under negative draft. Do not trust unverified edits pasted into Scriptorium Version 2.',
    ],
    marginalia:
      'Written across the margin in damp sepia ink: "Whoever tampered with the containment manual altered two liturgy clauses. Identify those tampered step digits inside the 6C Terminal to recover the uncorrupted sequence."',
    telemetry: [
      { label: 'Last Entry', value: '02:48 UTC' },
      { label: 'Custodian', value: 'M. CORVIN / D. VANE' },
      { label: 'Standing Order', value: 'FLAG TAMPERED STEPS' },
    ],
    leadHint: 'Proceed North past the twin braziers into the 6B Nave, then fork West to 6C or East to 6D.',
  },

  cell_manifest: {
    id: 'cell_manifest',
    wing: '6A · CELL ALCOVE 01',
    folioCode: 'CELL-01 // LOG-09',
    classification: 'RESTRAINT & EXTRACTION MANIFEST',
    sealLabel: 'IRON PORTCULLIS',
    title: 'Isolation Cell 01 — Incident Clipboard',
    subtitle: 'Mounted Outside West Barred Alcove',
    dated: 'Incident File #09-B · Sealed',
    accent: '#dc2626',
    body: [
      'Detainee exhibited acute acoustic sensitivity to brass bell resonance and emergency relay click transients prior to skeletal desiccation.',
      'Deep parallel scoring was cataloged along the inner brickwork 1.4 m above the cot. Shackles remained latched; extraction team withdrew north into 6B.',
    ],
    marginalia:
      'Scrap pinned beneath clip: "If the eye light flickers inside the dark corner, keep moving toward the chandelier light. It hates brass resonance."',
    telemetry: [
      { label: 'Cell Status', value: 'DECEASED / SEALED' },
      { label: 'Cuff Torque', value: 'LOCKED (85 Nm)' },
      { label: 'Exit Route', value: 'NORTH ARCH -> 6B' },
    ],
    leadHint: 'Step back onto the stone runner and pass through the North arch into 6B Anointing Nave.',
  },

  autopsy_gurney: {
    id: 'autopsy_gurney',
    wing: '6B · ANOINTING NAVE',
    folioCode: 'MED-6B // GURNEY-02',
    classification: 'PATHOLOGY & ANOINTING TRAY NOTES',
    sealLabel: 'NAVE CLINICAL FLOOR',
    title: 'Surgical Preparation & Anointing Log',
    subtitle: 'Stainless Examination Gurney · West Nave',
    dated: 'Preparation 02:22 UTC · Tray Uncovered',
    accent: '#ef4444',
    body: [
      'Steel instrument tray contains consecrated beeswax swabs mixed with dielectric substation coolant — used to coat exposed copper busbars against plasma arc-over.',
      'Forceps #2 and scalpel blade missing from cloth roll. Dried crimson staining matches sediment gathered beneath the West Seraph alcove.',
    ],
    marginalia:
      'Note tucked under stainless pan: "The Altar center console will stay dead-bolted until BOTH the West Scriptorium Manual and East Relay Switchboard validate clean."',
    telemetry: [
      { label: 'Tray Compound', value: 'MYRRH / OIL MIX' },
      { label: 'Missing Tools', value: 'SCALPEL #2' },
      { label: 'Arc Risk', value: 'HIGH WITHOUT BUS' },
    ],
    leadHint: 'Look west across the open nave arch toward the glowing stained-glass Scriptorium (6C).',
  },

  specimen_locker: {
    id: 'specimen_locker',
    wing: '6B · ANOINTING NAVE',
    folioCode: 'CRYO-6B // CAB-07',
    classification: 'RELIQUARY SPECIMEN MANIFEST',
    sealLabel: 'COLD STORAGE BAY',
    title: 'Cryo-Reliquary Cabinet Inventory',
    subtitle: 'North-West Wall Locker · Sealed Window',
    dated: 'Seal Check 02:55 UTC',
    accent: '#38bdf8',
    body: [
      'Shelf A: 4x Amber Ampoules (stabilized phenol-myrrh suspension, -4 C). Shelf B: Brass pressure relief key (missing from hook).',
      'Condensation frost along upper hinge suggests cold air draw from Sub-Basement Ducting whenever East Switchgear bus relays close.',
    ],
    marginalia:
      'Label tag: "Cross-check numbered manual clauses carefully inside 6C — one wrong added line invalidates the entire containment checksum."',
    telemetry: [
      { label: 'Cabinet Temp', value: '-3.8 °C' },
      { label: 'Ampoules', value: '4 / 4 INTACT' },
      { label: 'Brass Key', value: 'ABSENT' },
    ],
    leadHint: 'Turn left through the open West Arch into 6C Scriptorium.',
  },

  sarcophagus_se: {
    id: 'sarcophagus_se',
    wing: '6B · SE OSSUARY ALCOVE',
    folioCode: 'OSS-6B // TOMB-III',
    classification: 'STONE RUBBING & ENGINEER TESTAMENT',
    sealLabel: 'THREEFOLD SEAL',
    title: 'Ossuary Stone Rubbing & Navigation Key',
    subtitle: 'South-East Limestone Sarcophagus',
    dated: 'Charcoal Rubbing · Undated',
    accent: '#eab308',
    body: [
      'TRANSLATION FROM CHISELED STONE PLATE: "Three iron locks bind the Crimson Sphere: first purify the Scripture in the Western Study; second balance the Copper Knives in the Eastern Relay Bay; third speak both seals and your operator mark upon the Central Altar."',
    ],
    marginalia:
      'Faded charcoal rubbing beneath the plinth: "The sacred relays answer only in sequence. Clear the corrupted diff in 6C Scriptorium to recover the true steps, energize the knife switches in 6D East to derive the 4-digit beacon, then bring both recovered keys to the Central Altar in 6B."',
    telemetry: [
      { label: 'Seal I', value: 'WEST WING · 6C' },
      { label: 'Seal II', value: 'EAST WING · 6D' },
      { label: 'Final Seal', value: 'CENTER ALTAR · 6B' },
    ],
    leadHint: 'Press [C] anytime to inspect recovered Dossier keys & solved codes across all rooms.',
  },

  weeping_statue: {
    id: 'weeping_statue',
    wing: '6C · WEST SCRIPTORIUM',
    folioCode: 'REL-6C // SERAPH-01',
    classification: 'SANCTUARY ARTIFACT INSCRIPTION',
    sealLabel: 'WEST ALCOVE',
    title: 'The Weeping Seraph — Pedestal Plinth',
    subtitle: 'Blackened Basalt Sculpture · North Scriptorium',
    dated: 'Catalog Entry #114',
    accent: '#a855f7',
    body: [
      'Condensate oozing from the carved tear ducts tests positive for iron oxide and polymerized lamp oil. Locals called it the Watcher of False Revisions.',
      'Chisel groove along base reads: "Keep what was written before the knife; cast out the gloss added in haste."',
    ],
    marginalia:
      'Archivist penciled hint: "Compare Manuscript Version 1 (Baseline) against Version 2 (Tampered) at the cast-iron desk beside this statue. Only steps that were KEPT or CLEAN belong in your submission."',
    telemetry: [
      { label: 'Surface Residue', value: 'IRON / LAMP OIL' },
      { label: 'Pedestal Age', value: 'c. 1684' },
      { label: 'Direct Rule', value: 'OMIT TAMPERED LINES' },
    ],
    leadHint: 'Turn to the Scriptorium Terminal nearby and open Manual Diff (R2-08).',
  },

  scriptorium_books: {
    id: 'scriptorium_books',
    wing: '6C · WEST SCRIPTORIUM',
    folioCode: 'LIB-6C // FOLIO-R208',
    classification: 'DIFF VERIFICATION WORKSHEET',
    sealLabel: 'ARCHIVIST DESK',
    title: 'Scriptorium Marginalia & Redline Notes',
    subtitle: 'Open Scrolls & Binding Table · West Wing',
    dated: 'Annotated by Sr. Archivist Corvin',
    accent: '#f59e0b',
    body: [
      'Procedural note left beside the brass reading lamp: "Someone tampered with numbered clauses in Revision 2 so an operator blindly vents the vault!"',
      'METHODOLOGY: Read every step in v1 vs v2 side-by-side inside the Scriptorium Terminal. Spot every tampered line and combine those step digits (for example steps 2 and 6 -> 26) to recover the uncorrupted Clean Protocol Steps.',
    ],
    marginalia:
      'Tip on the blotter: "Inside the Terminal, use Split Originals or Redline Forensic Overlay and tap altered rows to assemble the candidate digits automatically!"',
    telemetry: [
      { label: 'Target Puzzle', value: 'MANUAL DIFF (R2-08)' },
      { label: 'Input Style', value: 'TAMPERED STEP DIGITS' },
      { label: 'Yield', value: 'CLEAN PROTOCOL STEPS' },
    ],
    leadHint: 'Approach the Cast-Iron Scriptorium Terminal in 6C and press [E] to run Manual Diff (R2-08).',
  },

  switchgear_log: {
    id: 'switchgear_log',
    wing: '6D · EAST SWITCHGEAR',
    folioCode: 'ENG-6D // BUS-R209',
    classification: 'ELECTRICAL CALIBRATION SHEET',
    sealLabel: 'SUBSTATION BAY',
    title: 'Relay Bus Calibration & Truth Manual',
    subtitle: 'Oscilloscope Workbench · East Relay Bay',
    dated: 'Calibrated by D. Vane · 02:11 UTC',
    accent: '#38bdf8',
    body: [
      'Sixteen knife switches arranged across four input banks (Rows A, B, C, D × Columns 1, 0 or labeled buses) drive the logic gate network above the steel switchboard.',
      'TO SOLVE R2-09: Read the gate diagram carefully from left inputs toward the final output bus. Every gate requires valid boolean logic (AND needs both HIGH, OR needs >= 1 HIGH, XOR needs odd HIGH, NOT inverts). Set only the required switches ON, click LOAD CODE to inspect Nixie confirmation, then click TRANSMIT CODE.',
    ],
    marginalia:
      'D. Vane note taped under bezel: "Once all active wires glow emerald and Nixie digits settle, hit TRANSMIT CODE! Then open [C] Dossier if you want to verify your Authorization Code before returning to 6B Center Altar."',
    telemetry: [
      { label: 'Target Puzzle', value: 'FAILSAFE BUS (R2-09)' },
      { label: 'Switch Array', value: '4x4 COPPER KNIFE' },
      { label: 'Yield', value: 'AUTHORIZATION CODE' },
    ],
    leadHint: 'Face the glowing East Switchboard panel in 6D and press [E] to align the logic switches.',
  },
};

export default function VaultDocumentModal({
  documentId,
  discoveredIds = [],
  onSelectDocument,
  onClose,
}) {
  const doc = VAULT_DOCUMENTS[documentId] || VAULT_DOCUMENTS.core_glass;
  const [tab, setTab] = useState('folio');

  const discoveredList = useMemo(() => {
    const uniq = Array.from(new Set([documentId, ...discoveredIds].filter((id) => VAULT_DOCUMENTS[id])));
    return uniq.map((id) => VAULT_DOCUMENTS[id]);
  }, [documentId, discoveredIds]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center p-3 sm:p-6 select-none re-wood-desk overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label={`Archival Manuscript: ${doc.title}`}
    >
      {/* Decorative Desk Props Matching Physical Study Surface (Brass Lamp Glow, Fountain Pen, Magnifier, Photos) */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden hidden lg:block" aria-hidden="true">
        {/* Top-Right Warm Brass Desk Lamp Base */}
        <div
          className="absolute -top-14 -right-14 w-56 h-56 rounded-full"
          style={{
            background: 'radial-gradient(circle at 38% 62%, #d4af64 0%, #8a6428 45%, #3a2710 82%)',
            boxShadow: '0 24px 70px rgba(255, 198, 104, 0.42), inset 0 4px 18px rgba(255, 240, 195, 0.6)',
            border: '4px solid #593e18',
          }}
        />
        {/* Bottom-Left Pinned Polaroid Evidence Slips */}
        <div
          className="absolute bottom-8 left-8 w-36 h-44 bg-[#dfd5c1] p-2.5 shadow-2xl border border-[#8f7b5d]"
          style={{ transform: 'rotate(-14deg)', boxShadow: '0 18px 36px rgba(0,0,0,0.85)' }}
        >
          <div className="w-full h-28 bg-[#221914] opacity-90 flex items-center justify-center text-[9px] font-mono text-amber-200/45 tracking-widest">
            6B // SPECIMEN
          </div>
          <div className="mt-2 h-2 w-3/4 bg-[#9e8969]/45" />
        </div>
        {/* Silver Fountain Pen beside right page */}
        <svg className="absolute right-12 top-1/2 -translate-y-1/2 w-10 h-64 drop-shadow-[0_14px_20px_rgba(0,0,0,0.85)]" viewBox="0 0 40 240">
          <defs>
            <linearGradient id="penSteel" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#6a6d74" />
              <stop offset="45%" stopColor="#d4d7de" />
              <stop offset="100%" stopColor="#484b52" />
            </linearGradient>
          </defs>
          <polygon points="20,6 15,28 25,28" fill="#c7b58b" />
          <line x1="20" y1="6" x2="20" y2="21" stroke="#1f1712" strokeWidth="1.2" />
          <rect x="13" y="28" width="14" height="196" rx="4" fill="url(#penSteel)" />
          <rect x="12" y="138" width="16" height="6" fill="#2c241d" />
          <rect x="14" y="54" width="2" height="58" rx="1" fill="#e8e2d0" opacity="0.65" />
        </svg>
        {/* Bottom-Right Brass Magnifying Glass */}
        <svg className="absolute bottom-4 right-8 w-44 h-44 drop-shadow-[0_20px_28px_rgba(0,0,0,0.88)]" viewBox="0 0 180 180">
          <circle cx="80" cy="76" r="54" fill="rgba(218, 232, 238, 0.14)" stroke="#b88b3d" strokeWidth="10" />
          <circle cx="80" cy="76" r="46" fill="none" stroke="rgba(255,244,214,0.45)" strokeWidth="2" />
          <path d="M50,52 Q74,34 102,48" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="5" strokeLinecap="round" />
          <rect x="116" y="114" width="18" height="62" rx="6" transform="rotate(-42 125 145)" fill="#4d321c" stroke="#9e7430" strokeWidth="3" />
        </svg>
      </div>

      {/* Top Desk Ribbon: Examined Folios & Escape Close */}
      <div className="relative z-10 w-full max-w-5xl mb-3 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="inline-flex rounded-full p-0.5 bg-black/75 border border-amber-800/45 shadow-lg">
            <button
              type="button"
              onClick={() => setTab('folio')}
              className={`px-3.5 py-1 rounded-full text-[11px] font-mono tracking-wider uppercase transition cursor-pointer ${
                tab === 'folio'
                  ? 'bg-gradient-to-r from-[#5a1616] to-[#320c0c] text-[#f7ecd7] border border-red-400/35'
                  : 'text-stone-300 hover:text-white'
              }`}
            >
              Folio Sheet
            </button>
            <button
              type="button"
              onClick={() => setTab('ledger')}
              className={`px-3.5 py-1 rounded-full text-[11px] font-mono tracking-wider uppercase transition cursor-pointer ${
                tab === 'ledger'
                  ? 'bg-gradient-to-r from-[#5a1616] to-[#320c0c] text-[#f7ecd7] border border-red-400/35'
                  : 'text-stone-300 hover:text-white'
              }`}
            >
              Index ({discoveredList.length})
            </button>
          </div>
          <div className="hidden md:flex items-center gap-1.5 ml-1">
            {discoveredList.slice(0, 6).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setTab('folio');
                  onSelectDocument?.(item.id);
                }}
                className={`px-2.5 py-1 rounded-full text-[10px] font-mono tracking-wider uppercase border transition cursor-pointer ${
                  item.id === doc.id && tab === 'folio'
                    ? 'bg-[#e8dcc2] text-[#24160b] border-[#8b5e34] font-bold shadow'
                    : 'bg-black/60 text-amber-200/80 border-amber-900/45 hover:bg-black/85'
                }`}
              >
                {item.folioCode.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="re-btn cursor-pointer"
        >
          <span className="re-btn-circle">ESC</span>
          <span>Close</span>
        </button>
      </div>

      {/* Physical Open Leather Field Notes Notebook */}
      <div className="relative z-10 w-full max-w-5xl rounded-xl p-2.5 sm:p-3.5 re-field-notebook-cover max-h-[84vh] overflow-y-auto">
        {tab === 'ledger' ? (
          <div className="re-journal-page-left rounded-md p-6 sm:p-8 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-[#7b603b]/40 pb-3">
              <div>
                <div className="text-[11px] font-re-typewriter uppercase tracking-[0.22em] text-[#7c1d1d] font-bold">
                  Cathedral Inspection Registry · Examined Folios ({discoveredList.length}/10)
                </div>
                <h2 className="text-2xl font-bold font-re-dossier tracking-wide text-[#24170e] mt-1">
                  FIELD NOTES ARCHIVE INDEX
                </h2>
              </div>
              <div className="re-crimson-stamp px-3 py-1 text-[11px] font-re-typewriter font-bold uppercase tracking-widest">
                FIELD NOTES
              </div>
            </div>
            <p className="text-sm font-re-typewriter text-[#4b3826]">
              Select any inspected folio entry to reopen both field notebook pages, handwritten marginalia, and sector clues.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {Object.values(VAULT_DOCUMENTS).map((item) => {
                const found = discoveredIds.includes(item.id) || item.id === documentId;
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={!found}
                    onClick={() => {
                      setTab('folio');
                      onSelectDocument?.(item.id);
                    }}
                    className={`text-left p-3.5 rounded border transition ${
                      found
                        ? 'border-[#8a6f47]/65 bg-[#dfd0b1]/70 hover:bg-[#d6c29b] cursor-pointer shadow-sm'
                        : 'border-[#8a6f47]/25 bg-black/5 opacity-45 cursor-not-allowed'
                    }`}
                  >
                    <div className="text-[10px] font-re-typewriter font-bold tracking-widest uppercase text-[#7b1d1d]">
                      {item.wing} · {item.folioCode}
                    </div>
                    <div className="text-sm font-bold font-re-display text-[#1e130b] mt-0.5">
                      {found ? item.title : 'Unexamined Artifact'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 rounded-md overflow-hidden shadow-inner border border-[#6e5233]/60">
            {/* LEFT NOTEBOOK PAGE */}
            <section className="re-journal-page-left p-6 sm:p-8 flex flex-col justify-between gap-5 border-b md:border-b-0 md:border-r border-[#8d7048]/50 relative">
              <div>
                <div className="flex items-center justify-between gap-2 text-[10px] font-re-typewriter uppercase tracking-[0.18em] text-[#6d5033]">
                  <span>{doc.wing}</span>
                  <span>{doc.folioCode}</span>
                </div>

                <h2 className="mt-2.5 text-xl sm:text-2xl font-bold tracking-wide text-center uppercase font-re-dossier text-[#1b120c] leading-snug border-b border-[#7a5f3b]/35 pb-2.5">
                  {doc.title}
                </h2>

                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] font-re-typewriter italic text-[#5c432b]">
                  <span>{doc.subtitle}</span>
                  <span>{doc.dated}</span>
                </div>

                <div className="mt-5 space-y-3.5 text-[14px] sm:text-[15px] leading-[1.68] font-re-typewriter text-[#221710]">
                  {doc.body.map((para, i) => (
                    <p key={i}>- {para}</p>
                  ))}
                </div>
              </div>

              {/* Left Footer: Examined Folio Ribbon Switcher */}
              <div className="pt-3 border-t border-[#7a5f3b]/30">
                <div className="text-[10px] font-re-typewriter uppercase tracking-[0.18em] text-[#6e5034] mb-1.5">
                  Examined Folios ({discoveredList.length}/10)
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {discoveredList.map((item) => {
                    const active = item.id === doc.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onSelectDocument?.(item.id)}
                        className={`px-2 py-0.5 rounded-[2px] text-[10px] font-re-typewriter border transition cursor-pointer ${
                          active
                            ? 'bg-[#7c1d1d] text-[#f9efd8] border-[#591313] font-bold'
                            : 'bg-[#d9c8a5]/80 text-[#342316] border-[#9c815a] hover:bg-[#cbb58a]'
                        }`}
                      >
                        {item.title}
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* RIGHT NOTEBOOK PAGE */}
            <section className="re-journal-page-right p-6 sm:p-8 flex flex-col justify-between gap-5 relative">
              <div>
                <div className="flex items-center justify-between gap-2 text-[10px] font-re-typewriter uppercase tracking-[0.18em] text-[#6d5033]">
                  <span>{doc.classification}</span>
                  <span>SECTOR OBSERVATION</span>
                </div>

                <h3 className="mt-2.5 text-lg sm:text-xl font-bold tracking-wide text-center uppercase font-re-dossier text-[#1b120c] border-b border-[#7a5f3b]/35 pb-2.5">
                  FIELD MARGINALIA & READOUTS
                </h3>

                {/* Telemetry bullets ruled like handwritten ink notebook items */}
                <ul className="mt-4 space-y-2.5 font-re-typewriter text-[13px] sm:text-[14px] text-[#24170f]">
                  {doc.telemetry.map((t) => (
                    <li key={t.label} className="flex flex-col border-b border-dashed border-[#8d724c]/35 pb-1.5">
                      <span className="text-[10px] uppercase tracking-[0.16em] text-[#735538]">
                        - {t.label}
                      </span>
                      <span className="font-bold text-[#191009] pl-3">
                        {t.value}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* Handwritten Red Ink Marginalia */}
                <div
                  className="mt-5 p-3.5 rounded-[2px] border-l-[3px]"
                  style={{
                    background: 'rgba(130, 24, 20, 0.07)',
                    borderColor: '#7f1d1d',
                  }}
                >
                  <div className="text-[10px] font-re-typewriter font-bold uppercase tracking-[0.18em] text-[#7f1d1d] mb-1">
                    Handwritten Marginalia
                  </div>
                  <p className="text-[13.5px] sm:text-sm italic leading-relaxed text-[#4f1212] font-re-display">
                    {doc.marginalia}
                  </p>
                </div>
              </div>

              {/* Next Lead + Stamped Crimson FIELD NOTES Badge + Return Button */}
              <div className="space-y-4 pt-2 border-t border-[#7a5f3b]/30">
                <div className="text-xs font-re-typewriter text-[#2d1e12] leading-relaxed">
                  <strong className="uppercase tracking-wider text-[#6e1616]">Next Lead:</strong>{' '}
                  {doc.leadHint}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="re-crimson-stamp px-3 py-1 text-[11px] font-re-dossier font-bold tracking-[0.2em] uppercase">
                    FIELD NOTES · {doc.sealLabel}
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="re-btn cursor-pointer"
                  >
                    <span className="re-btn-circle">ESC</span>
                    <span>Return to Nave</span>
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
