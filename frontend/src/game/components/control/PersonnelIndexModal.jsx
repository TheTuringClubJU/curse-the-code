import React, { useState, useMemo, useRef, useEffect } from 'react';
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
  ['BDG-9002','Tester [SYS]','Systems','Active','1983-11-02 07:30'],  // decoy active
  // ★ TARGET: Corvin — active after shutdown (shutdown 14 AUG 1983)
  ['BDG-9001','Corvin, M.','Research','Active','1984-04-23 11:38'],
];

const DEPTS   = ['All','Admin','Archive','Maintenance','Medical','Research','Security','Systems'];
const STATUSES = ['All','Active','Inactive','Retired','Suspended','Terminated'];
const SORTS    = ['Badge ID','Name','Status','Last Login'];
const CORRECT  = 'BDG-9001';

export default function PersonnelIndexModal({ isOpen, onClose, onSubmit, clueState, teamName }) {
  const [deptFilter, setDeptFilter]   = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortBy, setSortBy]           = useState('Badge ID');
  const [filterText, setFilterText]   = useState('');
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
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 100);
    else { setInputVal(''); setFilterText(''); setResponse(null); setTeamNameRow(null); }
  }, [isOpen]);

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onMouseDown={e => e.target === e.currentTarget && onClose()}
    >
      <div className="crt-modal-shell crt-scanlines relative flex flex-col font-mono select-none"
           style={{ width: '90vw', maxWidth: 860, height: '82vh', maxHeight: 680, background: '#000000' }}>

        {/* Close button */}
        <button onClick={onClose}
          className="absolute top-2 right-3 text-[#2db84d] hover:text-[#4dff78] text-xs tracking-widest z-10 phosphor-text-dim">
          [ESC]
        </button>

        {/* Terminal header */}
        <div className="border-b border-[#4dff78]/20 px-4 py-2.5 shrink-0">
          <div className="phosphor-text text-[11px] tracking-[0.2em]">PROJECT CRYPT — PERSONNEL INDEX / DATABASE — v2.1</div>
          <div className="text-[#1a3d1f] text-[9px] tracking-widest mt-0.5">SECURE ACCESS TERMINAL · AUTHORIZED PERSONNEL ONLY</div>
        </div>

        {/* Filter bar */}
        <div className="flex gap-4 px-4 py-2 border-b border-[#4dff78]/10 shrink-0 flex-wrap items-center">
          <input
            type="text"
            className="terminal-input text-xs px-2 py-1 bg-black/60 border border-[#4dff78]/30 text-[#4dff78] placeholder-[#1a3d1f] rounded"
            placeholder="FILTER / SEARCH..."
            value={filterText}
            onChange={e => setFilterText(e.target.value)}
          />
          <label className="terminal-toggle">
            <span className="toggle-label">DEPT:</span>
            <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
              {DEPTS.map(d => <option key={d}>{d}</option>)}
            </select>
          </label>
          <label className="terminal-toggle">
            <span className="toggle-label">STATUS:</span>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </label>
          <label className="terminal-toggle">
            <span className="toggle-label">SORT:</span>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
              {SORTS.map(s => <option key={s}>{s}</option>)}
            </select>
          </label>
          <span className="text-[#1a3d1f] text-[10px] self-center ml-auto">{rows.length} RECORDS</span>
        </div>

        {/* Table header */}
        <div className="grid text-[9px] tracking-[0.14em] text-[#1a3d1f] border-b border-[#4dff78]/15 px-4 py-1 shrink-0"
             style={{ gridTemplateColumns: '100px 1fr 100px 90px 1fr' }}>
          <span>BADGE_ID</span><span>NAME</span><span>DEPT</span><span>STATUS</span><span>LAST_LOGIN</span>
        </div>

        {/* Scrollable table */}
        <div ref={tableBodyRef} className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#1a3d1f #000' }}>
          {rows.map((row, i) => {
            const isTarget = row[0] === CORRECT;
            const isTeamRow = teamNameRow && row === teamNameRow;
            const isActive = row[3] === 'Active';
            const bg = i % 2 === 0 ? '#001200' : '#000000';
            return (
              <div key={row[0] + i}
                className={`crt-table-row grid text-[11px] px-4 py-[3px] transition-all ${isTeamRow ? 'animate-pulse' : ''}`}
                style={{
                  gridTemplateColumns: '100px 1fr 100px 90px 1fr',
                  background: bg,
                  color: isTeamRow ? '#ff4444' : isTarget && isActive ? '#4dff78' : isActive ? '#c8f0a8' : '#2db84d',
                  textShadow: (isTarget && isActive) || isTeamRow ? '0 0 8px currentColor' : 'none'
                }}>
                <span className="font-bold">{row[0]}</span>
                <span>{row[1]}</span>
                <span>{row[2]}</span>
                <span className={isActive ? 'phosphor-text' : ''}>{row[3]}</span>
                <span className="text-[10px]">{row[4]}</span>
              </div>
            );
          })}
        </div>

        {/* Input prompt */}
        <div className="shrink-0 border-t border-[#4dff78]/20">
          {response && (
            <div className={`px-4 pt-2 text-[11px] whitespace-pre-wrap ${response.type === 'ok' ? 'terminal-response-ok' : response.type === 'err' ? 'terminal-response-err' : 'text-[#2db84d]'}`}>
              {response.msg}
            </div>
          )}
          {!isSolved && (
            <div className="terminal-input-line">
              <span className="prompt-symbol">&gt; ENTER BADGE ID:</span>
              <input
                ref={inputRef}
                className="terminal-input blink-cursor"
                value={inputVal}
                onChange={e => setInputVal(e.target.value.toUpperCase())}
                onKeyDown={handleKeyDown}
                disabled={submitting || clueState?.exhausted}
                maxLength={12}
                spellCheck={false}
                placeholder="BDG-XXXX"
              />
              {!submitting && !clueState?.exhausted && (
                <button onClick={handleSubmit}
                  className="text-[#2db84d] hover:text-[#4dff78] text-[10px] tracking-widest ml-2 shrink-0">
                  [QUERY]
                </button>
              )}
            </div>
          )}
          {isSolved && (
            <div className="px-4 py-2 terminal-response-ok text-[11px]">
              ✓ IDENTITY CONFIRMED · RECORD LOCKED — BADGE BDG-9001 — CORVIN, M. LOGGED
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

