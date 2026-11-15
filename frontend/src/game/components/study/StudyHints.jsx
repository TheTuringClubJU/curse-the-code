import React, {useEffect, useRef, useState} from 'react';
import {X} from 'lucide-react';
import {studyObjective} from './studyGuide.js';

// Study presentation only: the shared hint API owns selection, history and costs.
export default function StudyHints({isOpen, onClose, roomData}) {
  const [status, setStatus] = useState(null);
  const [latest, setLatest] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const generation = useRef(0), requesting = useRef(false), resultRef = useRef(null);
  const headers = () => ({'x-session-token': localStorage.getItem('ctc_token') || ''});

  const load = async gen => {
    const response = await fetch('/api/game/hint/status', {credentials: 'include', headers: headers()});
    if (!response.ok) throw Error('Could not load hint status. Please retry.');
    const data = await response.json();
    if (gen === generation.current) setStatus(data);
  };
  useEffect(() => {
    const gen = ++generation.current;
    if (isOpen) {
      setStatus(null); setLatest(null); setError(''); setBusy(true);
      load(gen).catch(e => gen === generation.current && setError(e.message))
        .finally(() => {if (gen === generation.current) setBusy(false);});
    }
    return () => {generation.current++;};
  }, [isOpen]);
  useEffect(() => {
    if (isOpen && latest) resultRef.current?.scrollIntoView?.({block: 'nearest', behavior: 'auto'});
  }, [isOpen, latest]);

  const request = async () => {
    if (requesting.current || !status) return;
    requesting.current = true; setBusy(true); setError('');
    const gen = generation.current;
    try {
      const response = await fetch('/api/game/hint', {
        method: 'POST', credentials: 'include',
        headers: {...headers(), 'Content-Type': 'application/json'},
        body: JSON.stringify({room_id: 'study'})
      });
      const data = await response.json();
      if (!response.ok || data.success === false) {
        throw Error(data.detail?.message || data.detail || 'Hint request failed.');
      }
      if (gen !== generation.current) return;
      setLatest(data);
      await load(gen);
    } catch (e) {
      if (gen === generation.current) setError(e.message);
    } finally {
      requesting.current = false;
      if (gen === generation.current) setBusy(false);
    }
  };

  if (!isOpen) return null;
  const guide = studyObjective(roomData);
  const history = (status?.unlocked_hints || []).filter(h => h.room_id === 'study');
  const done = guide.phase === 'exit' || guide.phase === 'sync';
  const penalty = latest?.penalty_applied ?? latest?.penalty_seconds;
  const retry = () => {
    const gen = generation.current;
    setBusy(true); setError('');
    load(gen).catch(e => gen === generation.current && setError(e.message))
      .finally(() => {if (gen === generation.current) setBusy(false);});
  };

  return <div className="study-panel" onMouseDown={e => e.target === e.currentTarget && onClose()}>
    <section className="study-panel__sheet" role="dialog" aria-modal="true" aria-label="Study hints">
      <header><div><span>THE ARCHIVIST / ASSISTANCE</span><h2>Hints &amp; investigation guidance</h2>
        <p>Your current task: {guide.title}</p></div>
        <button onClick={onClose} aria-label="Close hints"><X/></button>
      </header>
      <div className="study-panel__body">
        <p className="study-panel__instruction">Hints use the shared Round 1 tournament rules. The server selects the next hint and applies its cost. Previously unlocked hints can be read again below without a new purchase.</p>
        <div className="study-hint-meter">
          <span>{status?.hints_remaining ?? '?'} / {status?.total_budget ?? 15} tournament hints left</span>
          <span>Time added: +{status?.total_penalty_seconds ?? 0}s</span>
        </div>
        <div className="study-hint-cost">
          <h3>{done ? 'The investigation is resolved' : 'Shared hint costs'}</h3>
          <p>New search hint: +10s. New puzzle hint: +30s and ?15 points when that case is solved.</p>
          <p>Re-reading an unlocked hint is free. New hints use the shared 15-hint Round 1 allowance.</p>
          {done && <p>Head to the north Basement door.</p>}
          <button onClick={request} disabled={busy || !status || done || status.hints_remaining <= 0}>
            {busy ? 'Consulting the archive?' : done ? 'No hint needed' : 'Request next hint'}
          </button>
          {!status && error && <button disabled={busy} onClick={retry}>Retry connection</button>}
        </div>
        {error && <p role="alert">{error}</p>}
        {latest && <article ref={resultRef} className="study-hint-result" role="status">
          <span>{latest.is_free ? 'Re-inspected ? no new penalty' : penalty !== undefined ? `+${penalty}s applied by the server` : 'Hint returned by the server'}</span>
          <h3>{latest.target_title || latest.hint_details?.title || 'Current lead'}</h3>
          {latest.hint_details?.location_prop && <p>{latest.hint_details.location_prop}</p>}
          {latest.hint_details?.puzzle_type && <p>{latest.hint_details.puzzle_type}</p>}
          <p>{latest.hint_details?.guidance || latest.hint_text}</p>
        </article>}
        <h3>Unlocked archive ? free to re-read</h3>
        {!history.length ? <p>No optional hints unlocked yet.</p> : <ol className="study-hint-history">
          {history.map(h => <li key={h.id || h.target_id}>
            <span>{h.hint_category === 'fragment' ? 'Search lead' : 'Puzzle guidance'} ? +{h.penalty_seconds ?? 0}s when unlocked</span>
            <p>{h.hint_text}</p>
          </li>)}
        </ol>}
      </div>
      <footer><span>H ? Close guidance</span><button onClick={onClose}>Return to Study</button></footer>
    </section>
  </div>;
}
