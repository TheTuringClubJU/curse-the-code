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
      'Modern pencil underneath: "Translation for night shift — 1) Solve Manual Diff in West 6C (gets clean steps). 2) Solve Failsafe Switches in East 6D (gets auth code). 3) Inspect your Dossier [C] and unlock Central Console here in 6B!"',
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none backdrop-blur-md"
      style={{
        background: 'rgba(6, 7, 11, 0.82)',
      }}
      role="dialog"
      aria-modal="true"
      aria-label={`Archival Manuscript: ${doc.title}`}
    >
      <div
        className="w-full max-w-4xl rounded-[2px] overflow-hidden flex flex-col max-h-[88vh] backdrop-blur-xl"
        style={{
          background: 'rgba(10, 12, 18, 0.94)',
          border: '1px solid rgba(180, 160, 130, 0.26)',
          borderLeft: '3px solid #991b1b',
          boxShadow: '0 28px 80px rgba(0, 0, 0, 0.88)',
        }}
      >
        {/* Top Obsidian Archive Header */}
        <div
          className="px-6 py-4 flex items-center justify-between gap-4 border-b"
          style={{
            background: 'rgba(13, 16, 23, 0.85)',
            borderColor: 'rgba(148, 163, 184, 0.18)',
          }}
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-[10px] vault-font-mono tracking-[0.22em] uppercase">
              <span
                className="px-2 py-0.5 rounded-[2px] font-bold"
                style={{
                  background: 'rgba(185, 28, 28, 0.18)',
                  border: '1px solid rgba(239, 68, 68, 0.45)',
                  color: '#fca5a5',
                }}
              >
                {doc.wing}
              </span>
              <span className="text-slate-400">{doc.folioCode}</span>
              <span className="text-slate-600">·</span>
              <span className="text-slate-300">{doc.classification}</span>
            </div>
            <h2
              className="mt-1 text-lg sm:text-xl font-bold tracking-wider truncate vault-font-serif"
              style={{ color: '#f5f3ee' }}
            >
              {doc.title}
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:flex rounded-[2px] p-0.5 border border-slate-700/70 bg-black/60">
              <button
                type="button"
                onClick={() => setTab('folio')}
                className={`px-3 py-1 rounded-[2px] text-[11px] vault-font-mono tracking-wider uppercase transition cursor-pointer ${
                  tab === 'folio'
                    ? 'bg-red-900/60 text-red-100 border border-red-500/45'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Folio Sheet
              </button>
              <button
                type="button"
                onClick={() => setTab('ledger')}
                className={`px-3 py-1 rounded-[2px] text-[11px] vault-font-mono tracking-wider uppercase transition cursor-pointer ${
                  tab === 'ledger'
                    ? 'bg-red-900/60 text-red-100 border border-red-500/45'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Index ({discoveredList.length})
              </button>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="re-plate !px-3.5 !py-1.5 cursor-pointer"
            >
              <span>Close</span>
              <span className="re-keycap">ESC</span>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-5">
          {/* Left shelf index of inspected manuscripts */}
          <aside className="space-y-2">
            <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-amber-400/75 px-1">
              Examined Folios ({discoveredList.length}/10)
            </div>
            <div className="space-y-1.5 max-h-[46vh] lg:max-h-[58vh] overflow-y-auto pr-1">
              {discoveredList.map((item) => {
                const active = item.id === doc.id && tab === 'folio';
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setTab('folio');
                      onSelectDocument?.(item.id);
                    }}
                    className={`w-full text-left px-3 py-2.5 rounded-[2px] border transition cursor-pointer ${
                      active
                        ? 'bg-amber-900/35 border-amber-400/55 border-l-2 border-l-amber-400'
                        : 'bg-black/35 border-stone-800/80 hover:border-amber-700/45'
                    }`}
                  >
                    <div className="text-[9px] font-mono tracking-widest uppercase text-amber-300/70">
                      {item.folioCode}
                    </div>
                    <div className="text-xs font-semibold text-stone-100 leading-snug mt-0.5">
                      {item.title}
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Right parchment manuscript view */}
          {tab === 'ledger' ? (
            <div className="rounded-[2px] border border-amber-900/40 bg-black/45 p-5 space-y-3">
              <div className="text-xs font-mono uppercase tracking-[0.18em] text-amber-300">
                Cathedral Inspection Registry
              </div>
              <p className="text-xs text-stone-400">
                Select any examined folio below to re-read notes, marginalia, and room coordinates.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
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
                      className={`text-left p-3 rounded-[2px] border transition ${
                        found
                          ? 'border-amber-700/40 bg-amber-950/20 hover:bg-amber-900/30 cursor-pointer'
                          : 'border-stone-800/70 bg-black/25 opacity-45 cursor-not-allowed'
                      }`}
                    >
                      <div className="text-[10px] font-mono tracking-widest text-amber-300/80">
                        {item.wing}
                      </div>
                      <div className="text-xs font-semibold text-stone-100 mt-0.5">
                        {found ? item.title : 'Unexamined Artifact'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div
              className="rounded-[2px] p-6 sm:p-7 relative overflow-hidden flex flex-col justify-between gap-5"
              style={{
                background: '#ebe0c7',
                border: '1px solid #9f8154',
                boxShadow: 'inset 0 0 36px rgba(84, 52, 22, 0.18)',
                color: '#251a11',
              }}
            >
              {/* Embossed crimson wax stamp */}
              <div
                className="inline-flex items-center self-start gap-2 px-3 py-1 rounded-[2px] text-[10px] font-mono font-bold tracking-[0.18em] uppercase"
                style={{
                  background: 'rgba(130, 22, 22, 0.12)',
                  border: '1px solid rgba(130, 22, 22, 0.42)',
                  color: '#7f1d1d',
                }}
              >
                <span>✦</span>
                <span>{doc.sealLabel}</span>
              </div>

              <div>
                <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-amber-950/20 pb-2">
                  <span className="text-xs font-mono tracking-wider text-stone-700">
                    {doc.subtitle}
                  </span>
                  <span className="text-[11px] font-mono italic text-stone-700">
                    {doc.dated}
                  </span>
                </div>

                <div
                  className="mt-4 space-y-3 text-sm sm:text-[15px] leading-relaxed"
                  style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                >
                  {doc.body.map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>

                {/* Handwritten marginalia slip */}
                <div
                  className="mt-5 p-4 rounded-[2px] border-l-4"
                  style={{
                    background: 'rgba(120, 26, 20, 0.08)',
                    borderColor: '#881b1b',
                  }}
                >
                  <div className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-red-900 mb-1">
                    Handwritten Marginalia
                  </div>
                  <p
                    className="text-sm italic text-red-950 leading-relaxed"
                    style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                  >
                    {doc.marginalia}
                  </p>
                </div>
              </div>

              {/* Telemetry cards + progression tip */}
              <div className="space-y-3 pt-2 border-t border-amber-950/20">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {doc.telemetry.map((t) => (
                    <div
                      key={t.label}
                      className="px-3 py-2 rounded-[2px] border border-amber-950/25 bg-amber-950/5"
                    >
                      <div className="text-[9px] font-mono uppercase tracking-wider text-stone-600">
                        {t.label}
                      </div>
                      <div className="text-xs font-mono font-bold text-stone-900 mt-0.5">
                        {t.value}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-stone-800 bg-black/5 px-3.5 py-2.5 rounded-[2px] border border-amber-950/20">
                  <span>
                    <strong>Next Lead:</strong> {doc.leadHint}
                  </span>
                  <button
                    type="button"
                    onClick={onClose}
                    className="re-plate !py-1 !px-3.5 cursor-pointer"
                  >
                    Return to Nave
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
