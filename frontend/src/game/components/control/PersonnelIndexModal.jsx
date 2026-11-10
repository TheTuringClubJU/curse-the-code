import React, { useState, useMemo, useRef, useEffect } from 'react';
import { copyDocumentText, downloadDocumentFile } from '../../engine/evidenceExport';
import '../../control.css';

// Personnel database rows — 60 entries, one is the target (BDG-9001, Corvin)
const BASE_ROWS = [
  ['BDG-0153','Ashworth, R.','Systems','Terminated','1983-08-10 14:32'],
  ['BDG-0336','Pemberton, J.','Security','Retired','1983-07-20 20:08'],
  ['BDG-0348','Holt, C.','Archive','Retired','1983-06-03 12:28'],
  ['BDG-0178','Vickers, E.','Archive','Retired','1983-08-14 13:30'],
  ['BDG-0484','Dabrowski, M.','Admin','Inactive','1983-05-16 18:06'],
  ['BDG-0281','Reinholt, T.','Medical','Terminated','1983-08-01 18:08'],
  ['BDG-0500','Calloway, B.','Medical','Retired','1983-07-03 21:29'],
  ['BDG-0645','Nkosi, A.','Medical','Retired','1983-08-14 21:18'],
  ['BDG-0172','Strickland, H.','Systems','Retired','1983-06-24 09:25'],
  ['BDG-0202','Yuen, L.','Medical','Inactive','1983-07-27 15:37'],
  ['BDG-0918','Farrell, D.','Archive','Terminated','1983-05-05 09:05'],
  ['BDG-0925','McAlister, G.','Archive','Terminated','1983-08-14 15:01'],
  ['BDG-0779','Russo, N.','Admin','Inactive','1983-07-17 11:18'],
  ['BDG-0333','Oyelaran, F.','Systems','Inactive','1983-08-12 07:51'],
  ['BDG-0986','Larkins, P.','Archive','Inactive','1983-04-07 21:55'],
  ['BDG-0600','Brennan, S.','Security','Suspended','1983-08-13 15:37'],
  ['BDG-0232','Waugh, T.','Archive','Inactive','1983-08-08 09:33'],
  ['BDG-0158','Meyers, C.','Medical','Inactive','1983-03-25 19:29'],
  ['BDG-0481','Sorensen, A.','Admin','Inactive','1983-06-25 07:48'],
  ['BDG-0184','Ikeda, R.','Admin','Inactive','1983-05-06 18:28'],
  ['BDG-0217','Blackwood, E.','Admin','Inactive','1983-07-05 10:30'],
  ['BDG-0960','Ostrowski, K.','Security','Terminated','1983-08-14 15:56'],
  ['BDG-0244','Chambers, V.','Medical','Retired','1983-08-14 22:45'],
  ['BDG-0607','Pryce, O.','Systems','Retired','1983-07-14 15:47'],
  ['BDG-0853','Tanaka, W.','Systems','Terminated','1983-08-11 20:24'],
  ['BDG-0163','Gallagher, N.','Admin','Inactive','1983-04-04 14:20'],
  ['BDG-0647','Figueroa, D.','Security','Terminated','1983-08-14 09:59'],
  ['BDG-0527','Lindqvist, A.','Medical','Retired','1983-06-23 18:38'],
  ['BDG-0321','Ofoegbu, C.','Security','Suspended','1983-08-14 14:12'],
  ['BDG-0642','Westergaard, B.','Systems','Terminated','1983-07-17 19:52'],
  ['BDG-0886','Kapoor, S.','Medical','Inactive','1983-04-16 15:47'],
  ['BDG-0686','Ferreira, J.','Archive','Retired','1983-06-06 16:42'],
  ['BDG-0644','Mwangi, D.','Systems','Inactive','1983-08-14 09:22'],
  ['BDG-0414','Eriksson, L.','Maintenance','Retired','1983-08-14 11:50'],
  ['BDG-0729','Thatcher, C.','Maintenance','Terminated','1983-05-08 13:40'],
  ['BDG-0511','Nowak, M.','Admin','Inactive','1983-08-14 08:15'],
  ['BDG-9001','Corvin, M.','Research','Active','1984-04-23 11:38'],
  ['BDG-0303','Deschamps, R.','Research','Retired','1983-08-14 07:45'],
  ['BDG-0477','Lopes, V.','Research','Retired','1983-08-14 08:30'],
  ['BDG-0318','Baxter, H.','Security','Retired','1983-08-14 09:00'],
  ['BDG-0541','Okonkwo, E.','Medical','Retired','1983-08-14 09:10'],
  ['BDG-0290','Carver, T.','Systems','Retired','1983-08-14 09:20'],
  ['BDG-0375','Schreiber, U.','Archive','Retired','1983-08-14 09:35'],
  ['BDG-0488','Makkonen, J.','Maintenance','Retired','1983-08-14 09:40'],
  ['BDG-0612','Tobin, E.','Admin','Retired','1983-08-14 09:50'],
  ['BDG-0119','Achebe, N.','Medical','Retired','1983-08-14 10:05'],
  ['BDG-0744','Watanabe, K.','Systems','Retired','1983-08-14 10:10'],
  ['BDG-0863','Colquhoun, A.','Security','Retired','1983-08-14 10:22'],
  ['BDG-0590','Nzegwu, C.','Medical','Retired','1983-08-14 10:35'],
  ['BDG-0432','Osei, K.','Maintenance','Retired','1983-08-14 10:50'],
  ['BDG-0765','Lindholm, P.','Systems','Retired','1983-08-14 11:00'],
  ['BDG-0198','Beaumont, L.','Admin','Retired','1983-08-14 11:12'],
  ['BDG-0847','Dlamini, Z.','Medical','Retired','1983-08-14 11:20'],
  ['BDG-0263','Vasquez, E.','Research','Retired','1983-08-14 11:35'],
  ['BDG-0921','Bauer, G.','Systems','Retired','1983-08-14 11:45'],
  ['BDG-0356','Hashimoto, R.','Research','Retired','1983-08-14 11:55'],
  ['BDG-0430','Okafor, A.','Security','Retired','1983-08-14 12:05'],
  ['BDG-0574','Christophersen, M.','Maintenance','Retired','1983-08-14 12:14'],
  ['BDG-0802','Yılmaz, B.','Medical','Retired','1983-08-14 12:25'],
  ['BDG-0940','Corvin, L.','Admin','Retired','1983-08-14 19:00'],
  ['BDG-0889','Hale, K.','Systems','Terminated','1983-08-16 04:12'],
  ['BDG-9011','Moreau, V.','Research','Inactive','1984-01-12 08:20'],
  ['BDG-9002','Tester [SYS]','Systems','Inactive','1983-08-14 21:18'],
];

const DEPTS   = ['All','Admin','Archive','Maintenance','Medical','Research','Security','Systems'];
const STATUSES = ['All','Active','Inactive','Retired','Suspended','Terminated'];
const SORTS    = ['Badge ID','Name','Status','Last Login'];
const CORRECT  = 'BDG-9001';

export default function PersonnelIndexModal({ isOpen, onClose, onSubmit, onResetLockout, clueState, teamName }) {
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
    let r = teamNameRow ? [...BASE_ROWS, teamNameRow] : BASE_ROWS;
    if (filterText.trim()) {
      const q = filterText.toLowerCase();
      r = r.filter(row => row.some(cell => String(cell).toLowerCase().includes(q)));
    }
    if (deptFilter !== 'All')   r = r.filter(row => row[2] === deptFilter);
    if (statusFilter !== 'All') r = r.filter(row => row[3] === statusFilter);
    if (sortBy === 'Name')      r = [...r].sort((a,b) => a[1].localeCompare(b[1]));
    if (sortBy === 'Status')    r = [...r].sort((a,b) => a[3].localeCompare(b[3]));
    if (sortBy === 'Last Login')r = [...r].sort((a,b) => b[4].localeCompare(a[4]));
    return r;
  }, [filterText, deptFilter, statusFilter, sortBy, teamNameRow]);

  const getRosterCsv = () => {
    const exportRows = rows.length > 0 ? rows : BASE_ROWS;
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
        setResponse({ type: 'ok', msg: `>> MATCH CONFIRMED — ${val} — CORVIN, M. — STATUS: ACTIVE\n>> RECORD FLAGGED. POST-SHUTDOWN BADGE ACTIVITY LOGGED.` });
      } else if (res?.exhausted) {
        setResponse({ type: 'err', msg: `>> MAXIMUM ATTEMPTS REACHED. RECORD ACCESS SUSPENDED.` });
      } else {
        setResponse({ type: 'err', msg: `>> ACCESS DENIED — NO MATCH FOR "${val}" IN ACTIVE REGISTRY.` });
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
              PROJECT CRYPT — PERSONNEL INDEX / DATABASE — v2.1
            </div>
            <div className="text-[11px] text-[#9c9282] mt-0.5">
              Cross-reference collected dossier fragments to isolate the anomalous access credential
            </div>
          </div>
          <button type="button" onClick={onClose} className="re-btn">
            <span className="re-btn-circle">ESC</span>
            <span>Put Down</span>
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
              {DEPTS.map(d => <option key={d}>{d}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-1.5 text-[11px] text-[#a6a298]">
            <span>STATUS:</span>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-[#0e0c0b] text-[#e6e1d6] border border-white/15 px-3 py-1 rounded-full text-[11px] outline-none"
            >
              {STATUSES.map(s => <option key={s}>{s}</option>)}
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
          {!isSolved && clueState?.exhausted && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-[#ef7b7b] font-bold tracking-wider">
                ✗ SECURITY LOCKOUT (0 ATTEMPTS) — BREACH ALARM ACTIVE
              </div>
              {onResetLockout && (
                <button
                  type="button"
                  onClick={() => {
                    setResponse(null);
                    setInputVal('');
                    onResetLockout();
                  }}
                  className="re-btn"
                >
                  <span className="re-btn-circle">↻</span>
                  <span>Reboot Terminal</span>
                </button>
              )}
            </div>
          )}
          {!isSolved && !clueState?.exhausted && (
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
                Attempts: {clueState?.attempts_remaining ?? 3}
              </span>
            </div>
          )}
          {isSolved && (
            <div className="text-xs text-[#e5d0a4] font-bold">
              ✓ IDENTITY CONFIRMED · RECORD LOCKED — BADGE BDG-9001 — CORVIN, M. LOGGED
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

