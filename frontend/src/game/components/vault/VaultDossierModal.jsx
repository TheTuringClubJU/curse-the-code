import React, { useEffect, useState, useMemo } from 'react';
import { BookOpen, Lock, CheckCircle2, FileText, ArrowUpRight, ShieldAlert, ScrollText } from 'lucide-react';
import '../../vault.css';

const API_BASE = import.meta.env.VITE_API_URL || '';

const FALLBACK_META = {
  'R2-08': {
    title: 'Containment Manual Diff',
    code: 'R2-08',
    sector: '6C · WEST SCRIPTORIUM',
    dossierNote: 'Corvin tampered with revision v2.0 before sealing the scriptorium lectern.',
  },
  'R2-09': {
    title: 'Failsafe Logic Circuit',
    code: 'R2-09',
    sector: '6D · EAST SWITCHGEAR',
    dossierNote: 'High-amperage relay matrix protecting the eastern containment bus.',
  },
  'R2-10': {
    title: 'Central Containment Console',
    code: 'R2-10',
    sector: '6B · ANOINTING NAVE',
    dossierNote: 'Sacrificial monolith interlocked until all upstream containment subsystems clear.',
  },
};

function normalizeRecord(raw) {
  const clueId = raw.clue_id || raw.id || '';
  const meta = FALLBACK_META[clueId] || {};
  return {
    clue_id: clueId,
    title: raw.title || raw.name || meta.title || clueId,
    sector: meta.sector || 'SUBSTATION DELTA',
    dossierNote: meta.dossierNote || raw.description || '',
    solved: Boolean(raw.solved ?? raw.is_solved),
    locked: Boolean(raw.locked ?? raw.is_locked),
    revealed_data: raw.revealed_data || raw.reveal || raw.data || null,
    summary: raw.summary || null,
  };
}

export default function VaultDossierModal({
  isOpen,
  onClose,
  vaultClues = [],
  discoveredDocIds = [],
  documents = {},
  onOpenDocument,
}) {
  const [dossierData, setDossierData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('records'); // 'records' | 'manuscripts'

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    const fetchDossier = async () => {
      setLoading(true);
      try {
        const token =
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
        revealed_data: rec.revealed_data || existing.revealed_data,
      });
    }
    return Array.from(map.values());
  }, [vaultClues, dossierData]);

  const revealedEntries = useMemo(() => {
    const out = [];
    const globalReveals = dossierData?.revealed || dossierData?.revealed_data;
    if (globalReveals && typeof globalReveals === 'object' && !Array.isArray(globalReveals)) {
      for (const [k, v] of Object.entries(globalReveals)) {
        if (v !== undefined && v !== null && v !== '') {
          out.push([k, String(v)]);
        }
      }
    }
    for (const r of records) {
      if (r.revealed_data && typeof r.revealed_data === 'object') {
        for (const [k, v] of Object.entries(r.revealed_data)) {
          if (v !== undefined && v !== null && v !== '') {
            const exists = out.some(([ek]) => ek === k);
            if (!exists) out.push([k, String(v)]);
          }
        }
      }
    }
    return out;
  }, [records, dossierData]);

  if (!isOpen) return null;

  const solvedCount = records.filter((r) => r.solved).length;

  return (
    <div
      className="fixed inset-0 z-50 vault-backdrop-leather flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Case Dossier Round 2"
    >
      <div className="vault-leather-binder relative w-full max-w-4xl rounded-[2px] overflow-hidden my-auto">
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

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-[2px] p-0.5 bg-black/60 border border-slate-700/70">
              <button
                type="button"
                onClick={() => setActiveTab('records')}
                className={`px-3 py-1 rounded-[2px] vault-font-mono text-[10px] tracking-wider uppercase cursor-pointer transition ${
                  activeTab === 'records'
                    ? 'bg-red-900/60 text-red-100 border border-red-500/45'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Records ({records.length || 3})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('manuscripts')}
                className={`px-3 py-1 rounded-[2px] vault-font-mono text-[10px] tracking-wider uppercase cursor-pointer transition inline-flex items-center gap-1 ${
                  activeTab === 'manuscripts'
                    ? 'bg-red-900/60 text-red-100 border border-red-500/45'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ScrollText className="w-3 h-3" />
                <span>Folios ({discoveredDocIds.length})</span>
              </button>
            </div>
            <span className="vault-font-mono text-[11px] px-3 py-1 rounded-[2px] border border-slate-600/55 bg-[#0e121c] text-slate-200">
              {solvedCount}/{records.length || 3} VERIFIED
            </span>
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
        {activeTab === 'manuscripts' ? (
          <div className="p-5 sm:p-7 space-y-4">
            <div className="flex items-center justify-between border-b border-[#5b2a26]/40 pb-2">
              <span className="vault-font-mono text-[10px] tracking-[0.24em] uppercase text-[#bfa782]">
                EXAMINED MANUSCRIPTS &amp; FIELD SHEETS ({discoveredDocIds.length})
              </span>
              <span className="vault-font-mono text-[10px] text-[#9b8668]">
                INSPECT PROPS THROUGHOUT ZONES 6A–6F WITH [E]
              </span>
            </div>

            {discoveredDocIds.length === 0 ? (
              <div className="vault-index-card p-6 rounded-[2px] text-center vault-font-serif text-base italic">
                No archival manuscripts examined yet. Walk through Narthex (6A), Nave (6B), Scriptorium (6C), and Switchgear (6D) and press [E] on ledgers, clipboards, statues, or glazing panes.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {discoveredDocIds.map((docId) => {
                  const doc = documents?.[docId];
                  if (!doc) return null;
                  return (
                    <div
                      key={docId}
                      className="vault-index-card p-4 rounded-[2px] flex flex-col justify-between gap-3"
                    >
                      <div>
                        <div className="vault-font-mono text-[9px] font-bold tracking-[0.18em] uppercase text-[#7a1e1a]">
                          {doc.wing} · {doc.folioCode}
                        </div>
                        <h3 className="vault-font-serif text-base font-bold text-[#1f160f] mt-1">
                          {doc.title}
                        </h3>
                        <p className="vault-font-serif italic text-xs text-[#4a3926] mt-1.5 line-clamp-3">
                          {doc.marginalia}
                        </p>
                      </div>
                      {onOpenDocument && (
                        <button
                          type="button"
                          onClick={() => onOpenDocument(docId)}
                          className="re-plate self-start !px-3 !py-1.5 text-[10px] cursor-pointer"
                        >
                          <span>READ FOLIO</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
        <div className="relative p-5 sm:p-7 grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Decorative Metallic Binder Clamps */}
          <div
            className="hidden lg:flex flex-col justify-evenly items-center absolute left-1/2 top-4 bottom-4 -translate-x-1/2 pointer-events-none z-10 w-6"
            aria-hidden="true"
          >
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-4 h-4 rounded-[2px] border border-[#a89578]/70 bg-[#3d362d]"
              />
            ))}
          </div>

          {/* Left Leaf: Containment Record Cards */}
          <div className="lg:col-span-7 space-y-3.5 lg:pr-4">
            <div className="flex items-center justify-between border-b border-[#5b2a26]/40 pb-2">
              <span className="vault-font-mono text-[10px] tracking-[0.24em] uppercase text-[#bfa782]">
                ASSIGNED CONTAINMENT RECORDS
              </span>
              {loading && (
                <span className="vault-font-mono text-[10px] text-[#d6aa63] animate-pulse">
                  SYNCING ARCHIVE...
                </span>
              )}
            </div>

            {records.length === 0 ? (
              <div className="vault-index-card p-6 rounded-[2px] text-center vault-font-serif text-base italic">
                No Round 2 containment records registered yet. Inspect terminals inside the Vault.
              </div>
            ) : (
              records.map((rec) => {
                const statusBadge = rec.solved
                  ? { label: 'VERIFIED', cls: 'bg-[#1d3a27] text-[#bfe3c8] border border-[#3d6b4e]' }
                  : rec.locked
                  ? { label: 'SEALED', cls: 'vault-wax-seal' }
                  : { label: 'ACTIVE', cls: 'bg-[#7d1f21] text-[#fce7dc] border border-[#b43c3d]' };

                return (
                  <div
                    key={rec.clue_id}
                    className="vault-index-card p-4 sm:p-4.5 rounded-[2px] relative"
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
                      <p className="vault-font-serif italic text-sm text-[#433322] mt-2 leading-relaxed">
                        {rec.dossierNote}
                      </p>
                    )}

                    {/* Inline per-record extracted evidence */}
                    {rec.revealed_data && typeof rec.revealed_data === 'object' && (
                      <div className="mt-2.5 pt-2 border-t border-[#7a6345]/30 flex flex-wrap gap-2">
                        {Object.entries(rec.revealed_data).map(([k, v]) => (
                          <div
                            key={k}
                            className="vault-font-mono text-[11px] px-2.5 py-0.5 rounded-[2px] bg-[#231910]/10 border border-[#6e583b]/35 text-[#261a0e]"
                          >
                            <span className="opacity-70 uppercase">{k}: </span>
                            <span className="font-bold text-[#7c1d18]">{String(v)}</span>
                          </div>
                        ))}
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
              })
            )}
          </div>

          {/* Right Leaf: Recovered Field Cipher Slip & Instructions */}
          <div className="lg:col-span-5 lg:pl-4 flex flex-col gap-4">
            <div className="border-b border-[#5b2a26]/40 pb-2">
              <span className="vault-font-mono text-[10px] tracking-[0.24em] uppercase text-[#bfa782]">
                RECOVERED FIELD FRAGMENTS
              </span>
            </div>

            <div className="vault-corvin-sheet p-4 sm:p-5 rounded-[2px] relative shadow-lg flex-1">
              <div className="vault-font-mono text-[10px] tracking-[0.22em] uppercase text-[#7a1e1a] font-bold mb-3">
                SUBSTATION DELTA // RECOVERED KEYS
              </div>

              {revealedEntries.length === 0 ? (
                <div className="py-6 text-center border border-dashed border-[#6e583b]/45 rounded-[2px] px-4">
                  <ShieldAlert className="w-6 h-6 text-[#7a1e1a]/80 mx-auto mb-2" />
                  <p className="vault-font-serif italic text-sm text-[#433322]">
                    No recovered cipher keys logged in the leather sleeve yet. Complete the Scriptorium Diff (R2-08) and East Switchgear (R2-09) to transcribe authorization tokens here.
                  </p>
                </div>
              ) : (
                <dl className="space-y-2.5">
                  {revealedEntries.map(([key, val]) => (
                    <div
                      key={key}
                      className="p-2.5 rounded-[2px] bg-[#2b1f14]/10 border border-[#6c5538]/40"
                    >
                      <dt className="vault-font-mono text-[10px] tracking-[0.16em] uppercase text-[#5e4b34]">
                        {key}
                      </dt>
                      <dd className="vault-font-mono text-sm font-bold tracking-[0.12em] text-[#6d1612] mt-0.5 break-all">
                        {val}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}

              <div className="mt-5 pt-3 border-t border-[#7a6345]/35 vault-font-serif italic text-xs text-[#4a3926] leading-relaxed">
                “Do not recite the containment hymn aloud near the central glass. Only the Central Monolith accepts clean protocol indices and Corvin’s original authorization hash.”
              </div>
            </div>

            <div className="p-3.5 rounded-[2px] border border-[#d6aa63]/25 bg-[#110a08]/85 vault-font-mono text-[10px] tracking-[0.14em] text-[#b8a587] leading-relaxed">
              NOTE: Chamber consoles must be operated in 3D space. Stand near the terminal prop in its sector and press [E] to engage.
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
