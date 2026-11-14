import React, { useState, useMemo, useRef, useEffect } from 'react';
import { copyDocumentText, downloadDocumentFile } from '../../engine/evidenceExport';
import '../../control.css';

const SORTS = ['Badge ID', 'Name', 'Status', 'Last Login'];

export default function PersonnelIndexModal({ isOpen, onClose, onSubmit, clueState, teamName }) {
  const [deptFilter, setDeptFilter]   = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortBy, setSortBy]           = useState('Badge ID');
  const [filterText, setFilterText]   = useState('');
  const [copiedRoster, setCopiedRoster] = useState(false);
  const [downloadedRoster, setDownloadedRoster] = useState(false);
  const [inputVal, setInputVal]       = useState('');
  const [response, setResponse]       = useState(null); // { type: 'ok'|'err', msg: string }
  const [submitting, setSubmitting]   = useState(false);
  const [teamNameRow, setTeamNameRow] = useState(null);
  const inputRef = useRef(null);
  const tableBodyRef = useRef(null);

  const baseRows = useMemo(() => {
    const raw = clueState?.payload?.rows;
    if (!Array.isArray(raw)) return [];
    return raw.map((r) => (Array.isArray(r) ? r : [r.badge_id, r.name, r.dept, r.status, r.last_login]));
  }, [clueState?.payload?.rows]);

  const deptOptions = useMemo(() => {
    const set = new Set(['All']);
    baseRows.forEach((r) => { if (r[2]) set.add(String(r[2])); });
    return Array.from(set);
  }, [baseRows]);

  const statusOptions = useMemo(() => {
    const set = new Set(['All']);
    baseRows.forEach((r) => { if (r[3]) set.add(String(r[3])); });
    return Array.from(set);
  }, [baseRows]);

  // JS-07: inject team name into roster after 2 seconds of opening
  useEffect(() => {
    if (!isOpen || !teamName) return;
    const tid = setTimeout(() => {
      setTeamNameRow([`BDG-${Math.floor(1000+Math.random()*8000)}`, teamName.toUpperCase(), 'Research', 'Active', '1984-00-00 00:00']);
    }, 2000);
    return () => clearTimeout(tid);
  }, [isOpen, teamName]);

  useEffect(() => {
    if (!isOpen) {
      setInputVal('');
      setFilterText('');
      setResponse(null);
      setTeamNameRow(null);
      return undefined;
    }
    const tid = setTimeout(() => inputRef.current?.focus(), 100);
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(tid);
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen, onClose]);

  const rows = useMemo(() => {
    let r = teamNameRow ? [...baseRows, teamNameRow] : baseRows;
    if (filterText.trim()) {
      const q = filterText.toLowerCase();
      r = r.filter(row => row.some(cell => String(cell).toLowerCase().includes(q)));
    }
    if (deptFilter !== 'All')   r = r.filter(row => row[2] === deptFilter);
    if (statusFilter !== 'All') r = r.filter(row => row[3] === statusFilter);
    if (sortBy === 'Name')      r = [...r].sort((a,b) => String(a[1] || '').localeCompare(String(b[1] || '')));
    if (sortBy === 'Status')    r = [...r].sort((a,b) => String(a[3] || '').localeCompare(String(b[3] || '')));
    if (sortBy === 'Last Login')r = [...r].sort((a,b) => String(b[4] || '').localeCompare(String(a[4] || '')));
    return r;
  }, [baseRows, filterText, deptFilter, statusFilter, sortBy, teamNameRow]);

  const getRosterCsv = () => {
    const exportRows = rows.length > 0 ? rows : baseRows;
    return [
      'BADGE_ID,NAME,DEPT,STATUS,LAST_LOGIN',
      ...exportRows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');
  };

  const handleCopyRoster = async () => {
    await copyDocumentText(getRosterCsv());
    setCopiedRoster(true);
    setTimeout(() => setCopiedRoster(false), 1800);
  };

  const handleDownloadRoster = () => {
    downloadDocumentFile('delta_personnel_index.csv', getRosterCsv());
    setDownloadedRoster(true);
    setTimeout(() => setDownloadedRoster(false), 1800);
  };

  const handleSubmit = async () => {
    if (!inputVal.trim() || submitting) return;
    const val = inputVal.trim().toUpperCase();
    setSubmitting(true);

    try {
      const res = await onSubmit(val);
      if (res?.correct || res?.solved) {
        setResponse({ type: 'ok', msg: `>> MATCH CONFIRMED — ${val}\n>> ${res?.message || 'RECORD FLAGGED. ACTIVE OPERATOR CREDENTIAL VERIFIED.'}` });
      } else if (res?.exhausted) {
        setResponse({ type: 'err', msg: `>> MAXIMUM ATTEMPTS REACHED. RECORD ACCESS SUSPENDED.` });
      } else {
        setResponse({ type: 'err', msg: `>> ${res?.message || `ACCESS DENIED — NO MATCH FOR "${val}" IN ACTIVE REGISTRY.`}` });
      }
    } catch {
      setResponse({ type: 'err', msg: `>> CONNECTION ERROR — RETRY.` });
    }
    setSubmitting(false);
  };

  const handleKeyDown = e => {
    if (e.key === 'Enter') handleSubmit();
  };

  if (!isOpen) return null;

  const isSolved = clueState?.solved;
  const attemptsMax = clueState?.attempts_max ?? 3;
  const attemptsLeft = clueState?.attempts_remaining ?? Math.max(0, attemptsMax - (clueState?.attempts ?? 0));
  const isExhausted = Boolean(clueState?.exhausted || (!isSolved && attemptsLeft <= 0));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm select-none"
      onMouseDown={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="relative flex flex-col font-mono rounded-2xl overflow-hidden shadow-2xl"
        style={{
          width: '92vw',
          maxWidth: 880,
          height: '82vh',
          maxHeight: 680,
          background: '#110f0e',
          border: '1px solid rgba(196, 162, 101, 0.22)',
        }}
        onMouseDown={e => e.stopPropagation()}
      >
        {/* Top Workstation Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-[#171312] shrink-0">
          <div>
            <div className="text-xs tracking-[0.18em] text-[#e6e1d6] font-bold">
              {clueState?.title || 'PERSONNEL INDEX / DATABASE'}
            </div>
            <div className="text-[11px] text-[#9c9282] mt-0.5">
              {clueState?.scene_text || 'Cross-reference collected Evidence Basket fragments to isolate the active access credential'}
            </div>
          </div>
          <button type="button" onClick={onClose} className="re-btn">
            <span className="re-btn-circle">ESC</span>
            <span>Close</span>
          </button>
        </div>

        {/* Clean Unclipped Filter Bar (Gothic Capsule Controls) */}
        <div className="flex gap-3 px-5 py-2.5 border-b border-white/10 bg-[#141110] shrink-0 flex-wrap items-center">
          <input
            type="text"
            className="text-xs px-4 py-1.5 bg-black/55 border border-white/15 text-[#eceae4] placeholder-[#787268] rounded-full outline-none focus:border-[#c4a265]"
            style={{ width: 210, flex: 'none' }}
            placeholder="FILTER / SEARCH..."
            value={filterText}
            onChange={e => setFilterText(e.target.value)}
          />
          <button
            type="button"
            onClick={handleCopyRoster}
            className="text-[11px] px-4 py-1.5 rounded-full border cursor-pointer transition font-sans font-medium"
            style={{
              background: copiedRoster ? 'linear-gradient(90deg, rgba(132,34,34,0.82), rgba(40,14,14,0.9))' : 'rgba(255,255,255,0.05)',
              borderColor: copiedRoster ? 'rgba(208,156,98,0.55)' : 'rgba(255,255,255,0.14)',
              color: copiedRoster ? '#f5ead6' : '#c8c0b2',
            }}
            title="Copy visible personnel records as CSV for external/AI audit"
          >
            {copiedRoster ? '✓ Roster CSV Copied' : 'Copy Roster CSV'}
          </button>
          <button
            type="button"
            onClick={handleDownloadRoster}
            className="text-[11px] px-4 py-1.5 rounded-full border cursor-pointer transition font-sans font-medium"
            style={{
              background: downloadedRoster ? 'linear-gradient(90deg, rgba(132,34,34,0.82), rgba(40,14,14,0.9))' : 'rgba(255,255,255,0.05)',
              borderColor: downloadedRoster ? 'rgba(208,156,98,0.55)' : 'rgba(255,255,255,0.14)',
              color: downloadedRoster ? '#f5ead6' : '#c8c0b2',
            }}
            title="Download personnel index as .csv file"
          >
            {downloadedRoster ? '✓ CSV Downloaded' : 'Download CSV'}
          </button>
          <label className="flex items-center gap-1.5 text-[11px] text-[#a6a298]">
            <span>DEPT:</span>
            <select
              value={deptFilter}
              onChange={e => setDeptFilter(e.target.value)}
              className="bg-[#0e0c0b] text-[#e6e1d6] border border-white/15 px-3 py-1 rounded-full text-[11px] outline-none"
            >
              {deptOptions.map(d => <option key={d}>{d}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-1.5 text-[11px] text-[#a6a298]">
            <span>STATUS:</span>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-[#0e0c0b] text-[#e6e1d6] border border-white/15 px-3 py-1 rounded-full text-[11px] outline-none"
            >
              {statusOptions.map(s => <option key={s}>{s}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-1.5 text-[11px] text-[#a6a298]">
            <span>SORT:</span>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="bg-[#0e0c0b] text-[#e6e1d6] border border-white/15 px-3 py-1 rounded-full text-[11px] outline-none"
            >
              {SORTS.map(s => <option key={s}>{s}</option>)}
            </select>
          </label>
          <span className="text-[#8a8880] text-[10px] ml-auto">{rows.length} RECORDS</span>
        </div>

        {/* Table Column Headers */}
        <div
          className="grid text-[10px] tracking-[0.14em] text-[#c4a265] border-b border-white/10 px-5 py-1.5 shrink-0 bg-[#141617]"
          style={{ gridTemplateColumns: '110px 1fr 110px 100px 1fr' }}
        >
          <span>BADGE_ID</span><span>NAME</span><span>DEPT</span><span>STATUS</span><span>LAST_LOGIN</span>
        </div>

        {/* Scrollable Personnel Records */}
        <div ref={tableBodyRef} className="flex-1 overflow-y-auto bg-[#101213]">
          {rows.map((row, i) => {
            const isTeamRow = teamNameRow && row === teamNameRow;
            return (
              <div
                key={row[0] + i}
                className="grid text-xs px-5 py-1.5 border-b border-white/[0.04] hover:bg-white/[0.07] transition-colors"
                style={{
                  gridTemplateColumns: '110px 1fr 110px 100px 1fr',
                  background: isTeamRow
                    ? 'rgba(139, 28, 28, 0.25)'
                    : i % 2 === 0
                    ? '#131516'
                    : '#101213',
                  color: isTeamRow ? '#fca5a5' : (i % 2 === 0 ? '#cbc6ba' : '#b7b2a6'),
                }}
              >
                <span className="font-bold">{row[0]}</span>
                <span>{row[1]}</span>
                <span>{row[2]}</span>
                <span>{row[3]}</span>
                <span>{row[4]}</span>
              </div>
            );
          })}
        </div>

        {/* Clean Query Footer */}
        <div className="shrink-0 border-t border-white/10 bg-[#141110] px-5 py-3">
          {response && (
            <div className={`mb-2 text-xs whitespace-pre-wrap ${response.type === 'ok' ? 'text-[#e5d0a4]' : 'text-[#ef7b7b]'}`}>
              {response.msg}
            </div>
          )}
          {!isSolved && isExhausted && (
            <div className="text-xs text-[#ef7b7b] font-bold tracking-wider">
              ✗ SECURITY LOCKOUT (0 ATTEMPTS REMAINING) — CLUE LOCKED
            </div>
          )}
          {!isSolved && !isExhausted && (
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs text-[#c4a265] font-bold">ENTER BADGE ID:</span>
              <input
                ref={inputRef}
                className="px-4 py-1.5 bg-black/55 border border-white/20 text-[#eceae4] text-xs font-mono tracking-wider rounded-full outline-none focus:border-[#c4a265]"
                style={{ width: 150, flex: 'none' }}
                value={inputVal}
                onChange={e => setInputVal(e.target.value.toUpperCase())}
                onKeyDown={handleKeyDown}
                disabled={submitting}
                maxLength={12}
                spellCheck={false}
                placeholder="BDG-XXXX"
              />
              {!submitting && (
                <button type="button" onClick={handleSubmit} className="re-btn">
                  <span className="re-btn-circle">↵</span>
                  <span>QUERY</span>
                </button>
              )}
              <span className="text-[11px] text-[#8d8578] ml-auto">
                Attempts: {attemptsLeft}
              </span>
            </div>
          )}
          {isSolved && (
            <div className="text-xs text-[#e5d0a4] font-bold">
              ✓ CREDENTIAL VERIFIED · RECORD LOCKED
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

