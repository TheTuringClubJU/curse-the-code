import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, CheckCircle2, Flame, Ghost, Maximize2, Minimize2, RefreshCw, Skull } from 'lucide-react';
import ArenaLeaderboardCanvas from './ArenaLeaderboardCanvas';

export default function LeaderboardView({ onBack }) {
  const [round, setRound] = useState(1);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const previousRanks = useRef({});
  const [rankMovements, setRankMovements] = useState({});

  useEffect(() => {
    let active = true;
    previousRanks.current = {};
    setRankMovements({});

    const fetchLeaderboard = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/leaderboard?round_num=${round}`, {
          credentials: 'include',
          headers: { 'x-admin-token': localStorage.getItem('ctc_admin_token') || '' }
        });
        if (!res.ok) throw new Error(`Leaderboard request failed (${res.status})`);
        const json = await res.json();
        if (!active) return;
        const rawRows = json.leaderboard || [];
        const rows =
          round === 2
            ? rawRows
                .filter((row) => Boolean(row.is_qualified_r2))
                .map((row, idx) => ({ ...row, rank: idx + 1 }))
            : [...rawRows]
                .sort((a, b) => {
                  const cluesDiff = (Number(b.clues_solved) || 0) - (Number(a.clues_solved) || 0);
                  if (cluesDiff !== 0) return cluesDiff;
                  const scoreDiff = (Number(b.total_score) || 0) - (Number(a.total_score) || 0);
                  if (scoreDiff !== 0) return scoreDiff;
                  const qualDiff = Number(Boolean(b.is_qualified_r2)) - Number(Boolean(a.is_qualified_r2));
                  if (qualDiff !== 0) return qualDiff;
                  const penaltyDiff = (Number(a.penalty_seconds) || 0) - (Number(b.penalty_seconds) || 0);
                  if (penaltyDiff !== 0) return penaltyDiff;
                  return (Number(a.rank) || 0) - (Number(b.rank) || 0);
                })
                .map((row, idx) => ({ ...row, rank: idx + 1 }));

        const movements = {};
        const currentRanks = {};
        rows.forEach((row) => {
          const id = row.team_id ?? row.rank;
          const oldRank = previousRanks.current[id];
          movements[id] = oldRank === undefined ? 0 : oldRank - row.rank;
          currentRanks[id] = row.rank;
        });
        previousRanks.current = currentRanks;
        setRankMovements(movements);
        setData(rows);
      } catch (error) {
        console.error('Error fetching leaderboard:', error);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 4000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [round]);

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement && !isFullscreen) {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        }
        setIsFullscreen(true);
      } else {
        if (document.fullscreenElement && document.exitFullscreen) {
          await document.exitFullscreen();
        }
        setIsFullscreen(false);
      }
    } catch (error) {
      console.warn('Native fullscreen unavailable, toggling presentation view:', error);
      setIsFullscreen((prev) => !prev);
    }
  }, [isFullscreen]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
      const tag = event.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || event.target?.isContentEditable) return;
      if (event.key.toLowerCase() === 'f') {
        event.preventDefault();
        toggleFullscreen();
      } else if (event.key === 'Escape' && isFullscreen && !document.fullscreenElement) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [toggleFullscreen, isFullscreen]);

  return (
    <div className="fixed inset-0 z-40 flex h-full w-full select-none flex-col overflow-hidden bg-[#050308] text-[#ece6f2]">
      {!isFullscreen && (
        <header className="relative z-30 flex min-h-[78px] shrink-0 items-center justify-between gap-4 border-b border-red-950/90 bg-[radial-gradient(ellipse_at_12%_0%,rgba(153,27,27,0.34),transparent_44%),radial-gradient(ellipse_at_88%_100%,rgba(88,28,135,0.34),transparent_46%),linear-gradient(180deg,#09040e_0%,#040207_100%)] px-4 shadow-[0_12px_45px_rgba(0,0,0,0.92)] sm:px-6">
          {/* Haunted glowing blood-moon hairline + subtle gothic corners */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-red-600/75 to-transparent shadow-[0_0_12px_rgba(220,38,38,0.6)]" />

          <div className="flex min-w-0 items-center gap-3.5">
            {onBack && (
              <button
                onClick={onBack}
                aria-label="Back to control room"
                className="flex h-9 shrink-0 items-center gap-2 border-r border-red-950/70 pr-4 text-stone-400 transition-colors hover:text-red-300"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden text-[10px] font-semibold uppercase tracking-[0.16em] sm:inline">Control room</span>
              </button>
            )}

            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-red-900/70 bg-gradient-to-br from-[#200810] via-[#0e0516] to-[#040207] shadow-[0_0_26px_rgba(185,28,28,0.45),inset_0_0_12px_rgba(0,0,0,0.9)]">
              <Skull className="h-5 w-5 text-amber-100 drop-shadow-[0_0_8px_rgba(220,38,38,0.7)]" />
              <Flame className="absolute -right-1.5 -top-1.5 h-4 w-4 animate-pulse fill-orange-500 text-amber-400 drop-shadow-[0_0_10px_rgba(249,115,22,0.95)]" />
            </div>

            <div className="min-w-0 leading-tight">
              <p className="mb-0.5 flex items-center gap-1.5 truncate text-[9px] font-bold uppercase tracking-[0.26em] text-red-400/90">
                <Ghost className="h-3 w-3 shrink-0 text-purple-400/90" />
                Crypt of Shadows
              </p>
              <h1
                className="animate-flicker truncate text-[17px] font-black uppercase tracking-[0.14em] text-amber-100 sm:text-xl"
                style={{ fontFamily: "'Cinzel', Georgia, serif" }}
              >
                Curse the Code <span className="text-red-500">&#10013;</span> Live Leaderboard
              </h1>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3 sm:gap-4">
            <div
              className={`hidden items-center gap-2 rounded-full border px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.18em] shadow-inner md:flex ${
                loading
                  ? 'border-orange-900/70 bg-[#140805]/95 text-orange-300'
                  : 'border-red-900/60 bg-[#10050a]/95 text-red-200'
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full shadow-[0_0_10px_currentColor] ${
                  loading ? 'animate-pulse bg-orange-400 text-orange-400' : 'animate-pulse bg-red-500 text-red-500'
                }`}
              />
              <span>{loading ? 'Summoning souls' : 'Haunted feed'}</span>
            </div>

            <nav
              aria-label="Leaderboard round"
              className="flex items-stretch rounded-lg border border-red-950/80 bg-[#0a050f] p-1 shadow-[inset_0_2px_8px_rgba(0,0,0,0.85)]"
            >
              {[1, 2].map((number) => (
                <button
                  key={number}
                  onClick={() => setRound(number)}
                  aria-label={number === 1 ? 'Round I - Trials' : 'Round II - Finals'}
                  aria-pressed={round === number}
                  className={`flex min-h-9 items-center gap-2 rounded-md px-3 transition-all sm:px-4 ${
                    round === number
                      ? number === 1
                        ? 'border border-amber-500/45 bg-gradient-to-br from-red-900/95 via-red-800/90 to-orange-950 text-amber-100 shadow-[0_0_16px_rgba(220,38,38,0.45)]'
                        : 'border border-purple-400/45 bg-gradient-to-br from-purple-900/95 via-violet-900/90 to-fuchsia-950 text-purple-100 shadow-[0_0_16px_rgba(147,51,234,0.45)]'
                      : 'border border-transparent text-stone-400 hover:bg-white/5 hover:text-stone-200'
                  }`}
                >
                  <span
                    className={`font-mono text-[10px] font-black tracking-[0.12em] ${
                      round === number ? (number === 1 ? 'text-amber-300' : 'text-purple-200') : 'text-stone-600'
                    }`}
                  >
                    0{number}
                  </span>
                  <span className="text-left leading-tight">
                    <span className="block text-[10px] font-bold uppercase tracking-[0.14em]">
                      {number === 1 ? 'Trials' : 'Finals'}
                    </span>
                    <span
                      className={`hidden text-[8px] uppercase tracking-[0.12em] sm:block ${
                        round === number ? 'text-white/70' : 'text-stone-500'
                      }`}
                    >
                      Round {number}
                    </span>
                  </span>
                </button>
              ))}
            </nav>

            <button
              onClick={toggleFullscreen}
              title="Toggle fullscreen (F)"
              aria-label="Toggle fullscreen"
              className="flex h-10 items-center gap-1.5 rounded-lg border border-red-900/50 bg-[#100817] px-2.5 text-stone-300 transition-all hover:border-amber-500/60 hover:bg-[#1a0d24] hover:text-amber-200 hover:shadow-[0_0_14px_rgba(245,158,11,0.25)]"
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              <span className="hidden rounded border border-red-900/60 bg-black/50 px-1 py-0.5 font-mono text-[9px] font-bold text-stone-400 sm:inline">
                F
              </span>
            </button>
          </div>
        </header>
      )}

      <main className="relative flex min-h-0 flex-1 overflow-hidden">
        <section className="relative min-w-0 flex-1 overflow-hidden">
          <ArenaLeaderboardCanvas teams={data} round={round} />
          {isFullscreen && (
            <button
              onClick={toggleFullscreen}
              title="Exit fullscreen (F)"
              aria-label="Exit fullscreen"
              className="absolute right-4 top-4 z-40 flex h-9 items-center gap-1.5 rounded-lg border border-red-900/60 bg-[#08040c]/85 px-2.5 text-stone-300 backdrop-blur-md transition-all hover:border-amber-400/70 hover:text-amber-200"
            >
              <Minimize2 className="h-4 w-4" />
              <span className="font-mono text-[9px] font-bold text-stone-400">F</span>
            </button>
          )}
        </section>

        <aside
          className="relative z-20 flex w-[320px] shrink-0 flex-col overflow-hidden border-l border-[#3b0d0d] bg-[#030303] text-[#c9c2b2] shadow-[-24px_0_60px_rgba(0,0,0,0.98),inset_0_0_55px_rgba(0,0,0,0.95)] lg:w-[376px]"
          style={{ fontFamily: "'IBM Plex Mono', monospace" }}
        >
          {/* Dried blood top stain + faint VHS scanlines strictly inside right panel */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[#330707]/35 to-transparent" />
          <div className="scanlines pointer-events-none absolute inset-0 z-10 opacity-30" />

          <div className="relative z-20 flex shrink-0 items-end justify-between gap-2 border-b border-[#241010] bg-[#060505] pb-3 pl-4 pr-5 pt-4">
            <div className="min-w-0">
              <p className="mb-1 flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.28em] text-[#851e1e]">
                <Skull className="h-3.5 w-3.5 text-[#751818]" /> BIOHAZARD // ARCHIVE
              </p>
              <h2
                aria-label="Arena Standings"
                className="text-xl font-normal uppercase tracking-[0.16em] text-[#d4cdbe]"
                style={{ fontFamily: "'Special Elite', 'Courier New', monospace" }}
              >
                Standings <span className="text-[#781919]">/</span>
              </h2>
            </div>
            <span className="shrink-0 whitespace-nowrap pb-0.5 text-[10px] font-semibold tabular-nums text-[#635e56]">
              <span className="border border-[#381212] bg-[#0c0606] px-1.5 py-0.5 text-[#a32a2a]">
                {String(data.length).padStart(2, '0')}
              </span>{' '}
              {round === 2 ? 'QUALIFIED' : 'TEAMS'}
            </span>
          </div>

          <div className="relative z-20 grid shrink-0 grid-cols-[36px_24px_minmax(0,1fr)_64px] items-center border-b border-[#181818] bg-[#050505] py-2 pl-3 pr-5 text-[8px] font-semibold uppercase tracking-[0.2em] text-[#524e47]">
            <span>Rank</span>
            <span aria-hidden="true" />
            <span>Team // Clues</span>
            <span className="text-right">Points</span>
          </div>

          <div className="relative z-20 min-h-0 flex-1 overflow-y-auto bg-[#030303]">
            {data.length === 0 ? (
              <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
                <Ghost className="h-7 w-7 text-[#5e1414]" />
                <p
                  className="text-xs text-[#615b52]"
                  style={{ fontFamily: "'Special Elite', 'Courier New', monospace" }}
                >
                  {round === 2 ? 'No qualified teams in Round II yet.' : 'No teams recorded yet.'}
                </p>
              </div>
            ) : (
              data.map((row) => {
                const rank = Number(row.rank);
                const movement = rankMovements[row.team_id ?? row.rank] || 0;
                const solved = Math.max(0, Math.min(10, Number(row.clues_solved) || 0));
                const isQualified = Boolean(row.is_qualified_r2);

                const rankBadge =
                  rank === 1
                    ? 'border border-[#6e1717] bg-[#450c0c] text-[#e3dcd0]'
                    : rank === 2
                      ? 'border border-[#2f2f2f] bg-[#141414] text-[#b8b2a6]'
                      : rank === 3
                        ? 'border border-[#262626] bg-[#101010] text-[#969086]'
                        : 'border border-[#191919] bg-[#080808] text-[#5c574f]';

                const rowTheme =
                  rank === 1
                    ? 'border-l-2 border-l-[#7a1818] bg-[#090606]'
                    : rank === 2
                      ? 'border-l-2 border-l-[#474542] bg-[#070707]'
                      : rank === 3
                        ? 'border-l-2 border-l-[#33302c] bg-[#060606]'
                        : 'border-l-2 border-l-[#181212] bg-[#030303] hover:border-l-[#591313] hover:bg-[#080505]';

                const pipColor =
                  rank === 1
                    ? 'bg-[#991f1f]'
                    : rank <= 3
                      ? 'bg-[#731818]'
                      : 'bg-[#541313]';

                const scoreColor =
                  rank === 1
                    ? 'text-[#dfd7c8]'
                    : rank === 2
                      ? 'text-[#b3ada2]'
                      : rank === 3
                        ? 'text-[#8f897f]'
                        : 'text-[#822525]';

                return (
                  <React.Fragment key={row.team_id ?? row.rank}>
                    <div className={`border-b border-[#111111] py-2 pl-3 pr-5 transition-colors ${rowTheme}`}>
                      <div className="grid grid-cols-[36px_24px_minmax(0,1fr)_64px] items-center gap-0.5">
                        <span
                          className={`mx-auto flex h-6 min-w-7 items-center justify-center px-1 text-[10px] font-bold tabular-nums ${rankBadge}`}
                        >
                          {String(rank).padStart(2, '0')}
                        </span>
                        <span
                          className={`text-center text-[9px] font-bold ${
                            movement > 0 ? 'text-[#5b7a56]' : movement < 0 ? 'text-[#7d1d1d]' : 'text-[#33312d]'
                          }`}
                        >
                          {movement > 0
                            ? `${String.fromCharCode(9650)}${movement}`
                            : movement < 0
                              ? `${String.fromCharCode(9660)}${Math.abs(movement)}`
                              : '—'}
                        </span>
                        <div className="flex min-w-0 items-center gap-1.5 pr-1">
                          <span
                            className={`min-w-0 truncate pt-0.5 text-[13px] tracking-wide ${
                              rank === 1 ? 'text-[#e3dcd0]' : rank <= 3 ? 'text-[#c2bbb0]' : 'text-[#969086]'
                            }`}
                            style={{ fontFamily: "'Special Elite', 'Courier New', monospace" }}
                          >
                            {row.team_name}
                          </span>
                          {round === 1 && isQualified && (
                            <span
                              title="Qualified for Round 2 Finals"
                              className="inline-flex shrink-0 items-center gap-0.5 border border-[#2d402b] bg-[#0a110a] px-1 py-[1px] text-[8px] font-bold uppercase tracking-wider text-[#6e9168]"
                            >
                              <CheckCircle2 className="h-2.5 w-2.5 text-[#5b7d55]" />
                              R2
                            </span>
                          )}
                        </div>
                        <span className={`text-right text-[12px] font-bold tabular-nums ${scoreColor}`}>
                          {Number(row.total_score || 0).toFixed(1)}
                        </span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-2 pl-[64px]">
                        <div className="flex items-center gap-[3px]" aria-label={`${solved} of 10 clues solved`}>
                          {Array.from({ length: 10 }, (_, index) => (
                            <span
                              key={index}
                              className={`h-[6px] w-[8px] ${
                                index < solved ? pipColor : 'bg-[#0f0f0f] ring-1 ring-[#1c1c1c]'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-[8px] font-semibold tabular-nums text-[#524e47]">{solved}/10</span>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })
            )}
          </div>
        </aside>
      </main>

      {!isFullscreen && (
        <footer className="relative z-30 flex h-8 shrink-0 items-center justify-between border-t border-red-950/70 bg-[#050308] px-4 text-[9px] font-bold uppercase tracking-[0.16em] text-stone-400 sm:px-6">
          <span className="flex items-center gap-2">
            <Skull className="h-3.5 w-3.5 text-red-500" /> Curse the Code{' '}
            <span className="text-red-800">/</span> Colosseum of the Damned
          </span>
          <span className="flex items-center gap-2 text-amber-200/80">
            Round 0{round}
            {loading && <RefreshCw className="h-3 w-3 animate-spin text-orange-400" />}
          </span>
        </footer>
      )}
    </div>
  );
}
