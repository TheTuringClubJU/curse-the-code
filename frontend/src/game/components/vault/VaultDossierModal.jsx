import React, { useEffect, useState, useMemo } from 'react';
import { BookOpen, Lock, CheckCircle2, FileText, Compass, FolderArchive } from 'lucide-react';
import '../../vault.css';

const API_BASE = import.meta.env.VITE_API_URL || '';

const FALLBACK_META = {
  'R2-01': {
    title: 'Personnel Index — Active Operator',
    room: 'Control Room',
    sector: '5A · CONTROL ROOM',
    dossierNote: 'Verified active operator credentials in Substation Delta systems.',
  },
  'R2-02': {
    title: 'Redacted Facility Report',
    room: 'Records Room',
    sector: '4A · RECORDS ARCHIVE',
    dossierNote: 'Incident memo identifying facility shutdown date and operation codename.',
  },
  'R2-03': {
    title: 'Surveillance Microfilm Frame',
    room: 'Records Room',
    sector: '4B · MICROFILM VAULT',
    dossierNote: 'Microfilm frame confirming shutdown timeline and keypad sub-code.',
  },
  'R2-04': {
    title: 'Epoch Chronology Timeline',
    room: 'Records Room',
    sector: '4C · CHRONOLOGY WING',
    dossierNote: 'Historical timeline marker letters spelling the containment keyword.',
  },
  'R2-05': {
    title: 'Radio Transmission Archive',
    room: 'Control Room',
    sector: '5B · COMMS RELAY',
    dossierNote: 'Oscilloscope carrier wave confirming authentic audio frequency.',
  },
  'R2-06': {
    title: 'Spectrogram Voicemail Audio',
    room: 'Control Room',
    sector: '5C · AUDIO MONITOR',
    dossierNote: 'Audio frequency analysis revealing the 4-digit voicemail pin.',
  },
  'R2-07': {
    title: 'Bulkhead Security Lock Bypass',
    room: 'Records Room',
    sector: '4D · LOWER BULKHEAD',
    dossierNote: 'Disengaged substation bulkhead lock connecting Records to Vault.',
  },
  'R2-08': {
    title: 'Containment Manual Diff',
    room: 'Vault',
    sector: '6C · WEST SCRIPTORIUM',
    dossierNote: 'Corvin tampered with revision v2.0 before sealing the scriptorium lectern.',
  },
  'R2-09': {
    title: 'Failsafe Logic Circuit',
    room: 'Vault',
    sector: '6D · EAST SWITCHGEAR',
    dossierNote: 'High-amperage relay matrix protecting the eastern containment bus.',
  },
  'R2-10': {
    title: 'Central Containment Console',
    room: 'Vault',
    sector: '6B · ANOINTING NAVE',
    dossierNote: 'Sacrificial monolith interlocked until all upstream containment subsystems clear.',
  },
};

const FALLBACK_ANSWERS = {
  'R2-01': {
    label: 'Active Operator Badge',
    value: 'BDG-9001',
    details: 'Clearance: Systems Department · Sub-basement Access',
  },
  'R2-02': {
    label: 'Incident Codename & Date',
    value: 'COMET · 2001-02-10',
    details: 'Containment protocol revision codename: COMET',
  },
  'R2-03': {
    label: 'Keypad Passcode',
    value: '1357',
    details: 'Surveillance timestamp confirmed: 2001-02-10',
  },
  'R2-04': {
    label: 'Chronology Keyword',
    value: 'PLANET',
    details: 'Chronological facility log sequence verified',
  },
  'R2-05': {
    label: 'Authentic Carrier Channel',
    value: 'VM-A (7.455 MHz)',
    details: 'Transmission channel verified legitimate',
  },
  'R2-06': {
    label: 'Voicemail Pin Code',
    value: '8140',
    details: 'Spectrogram audio frequency verified',
  },
  'R2-07': {
    label: 'Bulkhead Security Lock',
    value: 'Passcode: 1357 | Keyword: PLANET',
    details: 'Records-to-Vault lower bulkhead bypassed',
  },
  'R2-08': {
    label: 'Tampered Protocol Steps',
    value: '2, 6',
    details: 'Clean steps remain intact in original manual',
  },
  'R2-09': {
    label: 'Circuit Authorization Code',
    value: '1101',
    details: 'East switchgear logic bus latched',
  },
  'R2-10': {
    label: 'Containment Status',
    value: 'STABILIZED & VERIFIED',
    details: 'Biological core dormant · Round 2 complete',
  },
};

function normalizeRecord(raw) {
  const clueId = raw.clue_id || raw.id || '';
  const meta = FALLBACK_META[clueId] || {};
  const isVault = ['R2-08', 'R2-09', 'R2-10'].includes(clueId) || raw.room === 'vault';
  const isSolved = Boolean(raw.solved ?? raw.is_solved);
  const answer = raw.answer || (isSolved ? FALLBACK_ANSWERS[clueId] : null);
  return {
    clue_id: clueId,
    title: raw.title || raw.name || meta.title || clueId,
    room: raw.room || meta.room || (isVault ? 'Vault' : 'Previous Room'),
    sector: meta.sector || (raw.room ? raw.room.toUpperCase() : 'SUBSTATION DELTA'),
    dossierNote: meta.dossierNote || raw.description || '',
    solved: isSolved,
    locked: Boolean(raw.locked ?? raw.is_locked),
    summary: raw.summary || null,
    answer: answer || null,
  };
}

export default function VaultDossierModal({
  isOpen,
  onClose,
  vaultClues = [],
  onSelectClue,
}) {
  const [dossierData, setDossierData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('split'); // 'split' | 'vault' | 'prev'

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    const fetchDossier = async () => {
      setLoading(true);
      try {
        const token =
          localStorage.getItem('ctc_token') ||
          localStorage.getItem('session_token') ||
          localStorage.getItem('ctc_session_token') ||
          '';
        const res = await fetch(`${API_BASE}/api/game/round/2/dossier`, {
          credentials: 'include',
          headers: token ? { 'x-session-token': token } : {},
        });
        if (!res.ok) throw new Error('Failed to load dossier');
        const json = await res.json();
        if (active) setDossierData(json);
      } catch {
        // Offline or mocked fallback uses props cleanly
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchDossier();
    return () => {
      active = false;
    };
  }, [isOpen]);

  const records = useMemo(() => {
    const map = new Map();
    for (const c of vaultClues || []) {
      const rec = normalizeRecord(c);
      if (rec.clue_id) map.set(rec.clue_id, rec);
    }
    const apiList = Array.isArray(dossierData?.clues)
      ? dossierData.clues
      : Array.isArray(dossierData?.records)
      ? dossierData.records
      : [];
    for (const c of apiList) {
      const rec = normalizeRecord(c);
      if (!rec.clue_id) continue;
      const existing = map.get(rec.clue_id) || {};
      map.set(rec.clue_id, {
        ...existing,
        ...rec,
        solved: rec.solved || existing.solved,
        locked: rec.locked && !rec.solved ? true : Boolean(existing.locked && !existing.solved),
      });
    }
    return Array.from(map.values());
  }, [vaultClues, dossierData]);

  // Separate records into:
  // 1) 3 Vault Containment Records (R2-08, R2-09, R2-10)
  // 2) 7 Previous Rooms Records (R2-01 to R2-07)
  const vaultRecords = useMemo(() => {
    const vaultIds = ['R2-08', 'R2-09', 'R2-10'];
    const order = { 'R2-08': 1, 'R2-09': 2, 'R2-10': 3 };
    const list = records.filter((r) => vaultIds.includes(r.clue_id));
    for (const id of vaultIds) {
      if (!list.some((r) => r.clue_id === id)) {
        list.push(normalizeRecord({ clue_id: id }));
      }
    }
    return list.sort((a, b) => (order[a.clue_id] || 99) - (order[b.clue_id] || 99));
  }, [records]);

  const prevRoomRecords = useMemo(() => {
    const vaultIds = ['R2-08', 'R2-09', 'R2-10'];
    const list = records.filter((r) => !vaultIds.includes(r.clue_id));
    const defaultPrevIds = ['R2-01', 'R2-02', 'R2-03', 'R2-04', 'R2-05', 'R2-06', 'R2-07'];
    for (const id of defaultPrevIds) {
      if (!list.some((r) => r.clue_id === id)) {
        list.push(normalizeRecord({ clue_id: id, solved: false }));
      }
    }
    return list.sort((a, b) => a.clue_id.localeCompare(b.clue_id));
  }, [records]);

  const vaultSolvedCount = vaultRecords.filter((r) => r.solved).length;
  const prevSolvedCount = prevRoomRecords.filter((r) => r.solved).length;

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 vault-backdrop-leather flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Case Dossier Round 2"
    >
      <div className="vault-leather-binder relative w-full max-w-5xl rounded-[2px] overflow-hidden my-auto shadow-2xl">
        {/* Top Obsidian Binder Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 sm:px-7 py-4 border-b border-slate-700/60 bg-[#0b0e15]/95">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-[2px] flex items-center justify-center border border-red-500/45 bg-red-950/45 shadow-inner">
              <BookOpen className="w-4.5 h-4.5 text-red-300" />
            </div>
            <div>
              <div className="vault-font-mono text-[10px] tracking-[0.26em] uppercase text-red-300">
                CASE DOSSIER // ROUND 2
              </div>
              <h2 className="vault-font-serif text-xl sm:text-2xl font-semibold tracking-wider text-[#f5f3ee] uppercase">
                Substation Delta — Anointing Vault Ledger
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* View Tab Switcher */}
            <div className="flex rounded-[2px] p-0.5 bg-black/60 border border-slate-700/70">
              <button
                type="button"
                onClick={() => setActiveTab('split')}
                className={`px-3 py-1 rounded-[2px] vault-font-mono text-[10px] tracking-wider uppercase cursor-pointer transition ${
                  activeTab === 'split'
                    ? 'bg-red-900/60 text-red-100 border border-red-500/45'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Split Ledger (3 + 7)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('vault')}
                className={`px-3 py-1 rounded-[2px] vault-font-mono text-[10px] tracking-wider uppercase cursor-pointer transition ${
                  activeTab === 'vault'
                    ? 'bg-red-900/60 text-red-100 border border-red-500/45'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                This Room ({vaultSolvedCount}/3)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('prev')}
                className={`px-3 py-1 rounded-[2px] vault-font-mono text-[10px] tracking-wider uppercase cursor-pointer transition ${
                  activeTab === 'prev'
                    ? 'bg-red-900/60 text-red-100 border border-red-500/45'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Prev Rooms ({prevSolvedCount}/7)
              </button>
            </div>

            {/* Split Counter Badges: 3 in this room, 7 from previous rooms */}
            <div className="flex items-center gap-1.5">
              <span className="vault-font-mono text-[11px] px-2.5 py-1 rounded-[2px] border border-cyan-500/40 bg-cyan-950/40 text-cyan-200" title="Records assigned to Room 6 (Vault)">
                THIS ROOM: {vaultSolvedCount}/3 VERIFIED
              </span>
              <span className="vault-font-mono text-[11px] px-2.5 py-1 rounded-[2px] border border-slate-600/55 bg-[#0e121c] text-slate-300" title="Records solved in Control and Records rooms">
                PREV ROOMS: {prevSolvedCount}/7 VERIFIED
              </span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="re-plate !px-3.5 !py-1.5 cursor-pointer"
            >
              CLOSE [ESC]
            </button>
          </div>
        </div>

        {/* Stitched Binder Body */}
        <div className="relative p-5 sm:p-7">
          {/* Decorative Metallic Binder Clamps for 2-page spread */}
          {activeTab === 'split' && (
            <div
              className="hidden lg:flex flex-col justify-evenly items-center absolute left-1/2 top-6 bottom-6 -translate-x-1/2 pointer-events-none z-10 w-6"
              aria-hidden="true"
            >
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="w-4 h-4 rounded-[2px] border border-[#a89578]/70 bg-[#3d362d]"
                />
              ))}
            </div>
          )}

          {/* VIEW 1: Split Ledger (3 Vault records on Left, 7 Previous room records on Right) */}
          {activeTab === 'split' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Leaf: 3 Vault Containment Records */}
              <div className="lg:col-span-6 space-y-3.5 lg:pr-3">
                <div className="flex items-center justify-between border-b border-[#5b2a26]/40 pb-2">
                  <div className="flex items-center gap-2">
                    <Compass className="w-3.5 h-3.5 text-[#d6aa63]" />
                    <span className="vault-font-mono text-[10px] tracking-[0.24em] uppercase text-[#bfa782]">
                      THIS ROOM · VAULT CONTAINMENT (3)
                    </span>
                  </div>
                  <span className="vault-font-mono text-[10px] text-[#22c55e] font-bold">
                    {vaultSolvedCount}/3 VERIFIED
                  </span>
                </div>

                <div className="space-y-3">
                  {vaultRecords.map((rec) => renderVaultCard(rec, onSelectClue))}
                </div>
              </div>

              {/* Right Leaf: 7 Previous Rooms Archive Records */}
              <div className="lg:col-span-6 space-y-3.5 lg:pl-3">
                <div className="flex items-center justify-between border-b border-[#5b2a26]/40 pb-2">
                  <div className="flex items-center gap-2">
                    <FolderArchive className="w-3.5 h-3.5 text-[#a89578]" />
                    <span className="vault-font-mono text-[10px] tracking-[0.24em] uppercase text-[#bfa782]">
                      PREVIOUS ROOMS · SUBSTATION ARCHIVE (7)
                    </span>
                  </div>
                  <span className="vault-font-mono text-[10px] text-slate-300 font-bold">
                    {prevSolvedCount}/7 VERIFIED
                  </span>
                </div>

                <div className="max-h-[520px] overflow-y-auto space-y-2.5 pr-1.5">
                  {prevRoomRecords.map((rec) => renderPrevRoomCard(rec))}
                </div>

                <div className="mt-3 p-3 rounded-[2px] border border-[#7a6345]/35 bg-[#17100b]/80 vault-font-serif italic text-xs text-[#a89578] leading-relaxed">
                  “Do not recite the containment hymn aloud near the central glass. Only the Central Monolith accepts clean protocol indices and Corvin’s original authorization hash.”
                </div>
              </div>
            </div>
          )}

          {/* VIEW 2: This Room Focus View (3 Vault Records + Chamber Protocol) */}
          {activeTab === 'vault' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 space-y-3.5">
                <div className="flex items-center justify-between border-b border-[#5b2a26]/40 pb-2">
                  <span className="vault-font-mono text-[10px] tracking-[0.24em] uppercase text-[#bfa782]">
                    ROOM 6 CONTAINMENT SUBSYSTEMS (3 RECORDS)
                  </span>
                  <span className="vault-font-mono text-[10px] text-[#22c55e] font-bold">
                    {vaultSolvedCount}/3 VERIFIED
                  </span>
                </div>
                <div className="space-y-3.5">
                  {vaultRecords.map((rec) => renderVaultCard(rec, onSelectClue))}
                </div>
              </div>

              <div className="lg:col-span-5 space-y-4">
                <div className="border-b border-[#5b2a26]/40 pb-2">
                  <span className="vault-font-mono text-[10px] tracking-[0.24em] uppercase text-[#bfa782]">
                    VAULT CONTAINMENT ARCHITECTURE
                  </span>
                </div>

                <div className="vault-corvin-sheet p-4 sm:p-5 rounded-[2px] relative shadow-lg space-y-3">
                  <div className="vault-font-mono text-[10px] tracking-[0.22em] uppercase text-[#7a1e1a] font-bold">
                    ANOINTING VAULT TRIAD SEQUENCE
                  </div>

                  <div className="space-y-2.5 text-xs font-serif text-[#2a1d12]">
                    <div className="p-2.5 rounded-[2px] bg-[#2b1f14]/10 border border-[#6c5538]/40">
                      <div className="vault-font-mono text-[10px] font-bold text-[#7a1e1a] uppercase">
                        1. West Scriptorium (6C · R2-08)
                      </div>
                      <p className="mt-0.5 text-xs text-[#3a281a]">
                        Analyze the dual shutdown manuals to uncover the tampered protocol steps and derive the clean sequence.
                      </p>
                    </div>

                    <div className="p-2.5 rounded-[2px] bg-[#2b1f14]/10 border border-[#6c5538]/40">
                      <div className="vault-font-mono text-[10px] font-bold text-[#7a1e1a] uppercase">
                        2. East Switchgear (6D · R2-09)
                      </div>
                      <p className="mt-0.5 text-xs text-[#3a281a]">
                        Solve the logic gate matrix on the power bus terminal to energize the emergency containment relays.
                      </p>
                    </div>

                    <div className="p-2.5 rounded-[2px] bg-[#2b1f14]/10 border border-[#6c5538]/40">
                      <div className="vault-font-mono text-[10px] font-bold text-[#7a1e1a] uppercase">
                        3. Central Console (6B · R2-10)
                      </div>
                      <p className="mt-0.5 text-xs text-[#3a281a]">
                        Interlock the three verification keys (Clean Protocol Steps, Circuit Relay Code, Operator Badge) to seal the bio-core.
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#7a6345]/35 vault-font-serif italic text-xs text-[#4a3926] leading-relaxed">
                    “Do not recite the containment hymn aloud near the central glass. Only the Central Monolith accepts clean protocol indices and Corvin’s original authorization hash.”
                  </div>
                </div>

                <div className="p-3.5 rounded-[2px] border border-[#d6aa63]/25 bg-[#110a08]/85 vault-font-mono text-[10px] tracking-[0.14em] text-[#b8a587] leading-relaxed">
                  NOTE: Chamber consoles must be operated in 3D space. Stand near the terminal prop in its sector and press [E] to engage.
                </div>
              </div>
            </div>
          )}

          {/* VIEW 3: Previous Rooms Focus View (7 Records) */}
          {activeTab === 'prev' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#5b2a26]/40 pb-2">
                <span className="vault-font-mono text-[10px] tracking-[0.24em] uppercase text-[#bfa782]">
                  PREVIOUS ROOMS DOSSIER (7 RECORDS FROM CONTROL &amp; RECORDS)
                </span>
                <span className="vault-font-mono text-[10px] text-slate-300 font-bold">
                  {prevSolvedCount}/7 VERIFIED
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {prevRoomRecords.map((rec) => renderPrevRoomCard(rec))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function renderVaultCard(rec, onSelectClue) {
  const statusBadge = rec.solved
    ? { label: 'VERIFIED', cls: 'bg-[#1d3a27] text-[#bfe3c8] border border-[#3d6b4e]' }
    : rec.locked
    ? { label: 'SEALED', cls: 'vault-wax-seal' }
    : { label: 'ACTIVE', cls: 'bg-[#7d1f21] text-[#fce7dc] border border-[#b43c3d]' };

  return (
    <div
      key={rec.clue_id}
      className="vault-index-card p-3.5 sm:p-4 rounded-[2px] relative"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="vault-font-mono text-[10px] font-bold tracking-[0.2em] text-[#7a1e1a]">
              {rec.clue_id}
            </span>
            <span className="text-[#8a7558]">·</span>
            <span className="vault-font-mono text-[10px] tracking-[0.14em] text-[#5c4a35]">
              {rec.sector}
            </span>
          </div>
          <h3 className="vault-font-serif text-lg sm:text-xl font-bold text-[#1f160f] mt-0.5 leading-snug">
            {rec.title}
          </h3>
        </div>

        <span
          className={`vault-font-mono text-[9px] font-bold tracking-[0.18em] px-2 py-0.5 rounded-[2px] uppercase shrink-0 ${statusBadge.cls}`}
        >
          {statusBadge.label}
        </span>
      </div>

      {rec.dossierNote && (
        <p className="vault-font-serif italic text-sm text-[#433322] mt-1.5 leading-relaxed">
          {rec.dossierNote}
        </p>
      )}

      {/* Recovered Answer Block for Solved Vault Subsystem */}
      {rec.solved && rec.answer && (
        <div className="mt-3 p-2.5 rounded-[2px] bg-[#102416] border border-[#22c55e]/50 text-xs font-mono">
          <div className="text-[10px] tracking-widest uppercase text-emerald-400 font-bold">
            RECOVERED ANSWER // {rec.answer.label}:
          </div>
          <div className="text-sm font-bold text-emerald-200 mt-0.5 tracking-wider">
            {rec.answer.value}
          </div>
          {rec.answer.details && (
            <div className="text-[11px] text-emerald-300/80 mt-0.5 italic">
              {rec.answer.details}
            </div>
          )}
        </div>
      )}

      {!rec.solved && (
        <div className="mt-3 p-2 rounded-[2px] bg-[#1a0f0d] border border-[#7a2222]/40 text-xs font-mono">
          <span className="text-rose-400 font-bold tracking-wider text-[11px] uppercase">
            {rec.locked ? '[SEALED // REQUIRES UPSTREAM CLEARANCE]' : '[ACTIVE // READY AT TERMINAL]'}
          </span>
        </div>
      )}

      <div className="mt-3 pt-2.5 border-t border-[#8a7558]/25 flex items-center justify-between gap-2">
        <span className="vault-font-mono text-[10px] tracking-[0.12em] text-[#5e4c36] inline-flex items-center gap-1.5">
          {rec.solved ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-[#235433]" />
              Subsystem Restored
            </>
          ) : rec.locked ? (
            <>
              <Lock className="w-3.5 h-3.5 text-[#7a1e1a]" />
              Requires Upstream Clearance
            </>
          ) : (
            <>
              <FileText className="w-3.5 h-3.5 text-[#7a1e1a]" />
              Ready for Terminal Entry
            </>
          )}
        </span>

        <span className="vault-font-mono text-[9px] tracking-wider uppercase px-2.5 py-1 rounded-[2px] border border-[#6b5438]/40 bg-[#1f160f]/60 text-[#a89578]">
          {rec.solved ? 'ARCHIVED' : 'ACCESS AT 3D CONSOLE [E]'}
        </span>
      </div>
    </div>
  );
}

function renderPrevRoomCard(rec) {
  const isSolved = rec.solved;
  return (
    <div
      key={rec.clue_id}
      className={`p-3 rounded-[2px] border transition ${
        isSolved
          ? 'bg-[#1a120c]/80 border-[#5c462e]/50 hover:border-[#8c6b45]/70'
          : 'bg-[#160d0f]/90 border-rose-950/80 hover:border-rose-900/90'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="vault-font-mono text-[10px] font-bold tracking-[0.18em] text-[#e0a96d]">
            {rec.clue_id}
          </span>
          <span className="text-[#6d573f]">·</span>
          <span className="vault-font-mono text-[9px] tracking-[0.12em] uppercase text-[#a89578]">
            {rec.sector || rec.room}
          </span>
        </div>
        <span
          className={`vault-font-mono text-[8px] font-bold tracking-wider px-2 py-0.5 rounded-[2px] uppercase ${
            isSolved
              ? 'bg-[#1d3a27]/90 text-[#bfe3c8] border border-[#3d6b4e]'
              : 'vault-wax-seal !text-[8px] !px-2 !py-0.5'
          }`}
        >
          {isSolved ? 'VERIFIED' : 'SEALED'}
        </span>
      </div>

      <h4 className="vault-font-serif text-sm font-semibold text-[#f5ecd8] mt-1">
        {rec.title}
      </h4>

      {rec.dossierNote && (
        <p className="vault-font-serif italic text-xs text-[#b8a78e] mt-1 leading-normal line-clamp-2">
          {rec.dossierNote}
        </p>
      )}

      {/* Answer reveal if solved / Sealed restricted notice if unsolved */}
      {isSolved && rec.answer && (
        <div className="mt-2.5 p-2 rounded-[2px] bg-[#0c1f14] border border-[#22c55e]/40 text-xs font-mono">
          <div className="text-[9px] tracking-widest uppercase text-emerald-400 font-bold">
            RECOVERED KEY // {rec.answer.label}:
          </div>
          <div className="text-xs font-bold text-emerald-200 mt-0.5 tracking-wider">
            {rec.answer.value}
          </div>
          {rec.answer.details && (
            <div className="text-[10px] text-emerald-300/70 mt-0.5 italic">
              {rec.answer.details}
            </div>
          )}
        </div>
      )}

      {!isSolved && (
        <div className="mt-2.5 p-2 rounded-[2px] bg-[#240c0f]/80 border border-rose-900/60 text-xs font-mono flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          <span className="text-rose-300 font-bold tracking-wider text-[10px] uppercase">
            SEALED - RESTRICTED // UNSOLVED IN PREVIOUS ROOM
          </span>
        </div>
      )}
    </div>
  );
}
