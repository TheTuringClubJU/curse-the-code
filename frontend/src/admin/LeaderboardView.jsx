import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Trophy, ArrowLeft, RefreshCw, Columns2, Clock, AlertTriangle } from 'lucide-react';

export default function LeaderboardView({ onBack }) {
  // 'side' = Side-by-Side R1 & R2 comparison, '1' = Round 1 only, '2' = Round 2 only
  const [viewMode, setViewMode] = useState('side');
  const [r1Data, setR1Data] = useState([]);
  const [r2Data, setR2Data] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchBothRounds = useCallback(async () => {
    setLoading(true);
    try {
      const headers = {
        'x-admin-token': localStorage.getItem('ctc_admin_token') || '',
      };
      const [res1, res2] = await Promise.all([
        fetch('/api/admin/leaderboard?round_num=1', { credentials: 'include', headers }),
        fetch('/api/admin/leaderboard?round_num=2', { credentials: 'include', headers }),
      ]);

      if (res1.ok) {
        const j1 = await res1.json();
        if (Array.isArray(j1?.leaderboard)) {
          setR1Data(j1.leaderboard);
        }
      }
      if (res2.ok) {
        const j2 = await res2.json();
        if (Array.isArray(j2?.leaderboard)) {
          const rNum = j2?.round ?? 2;
          setR2Data(rNum === 2 ? j2.leaderboard : []);
        }
      }
    } catch (e) {
      console.error('Error fetching leaderboard:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBothRounds();
    const interval = setInterval(fetchBothRounds, 4000);
    return () => clearInterval(interval);
  }, [fetchBothRounds]);

  const sideBySideRows = useMemo(() => {
    const map = new Map();
    for (const row of r1Data) {
      map.set(row.team_id, {
        team_id: row.team_id,
        team_name: row.team_name,
        r1: row,
        r2: null,
      });
    }
    for (const row of r2Data) {
      const existing = map.get(row.team_id);
      if (existing) {
        existing.r2 = row;
      } else {
        map.set(row.team_id, {
          team_id: row.team_id,
          team_name: row.team_name,
          r1: null,
          r2: row,
        });
      }
    }

    const list = Array.from(map.values()).map((entry) => {
      const r1Score = entry.r1?.total_score ?? 0;
      const r2Score = entry.r2?.total_score ?? 0;
      const r1Clues = entry.r1?.clues_solved ?? 0;
      const r2Clues = entry.r2?.clues_solved ?? 0;
      return {
        ...entry,
        combinedScore: r1Score + r2Score,
        combinedClues: r1Clues + r2Clues,
      };
    });

    list.sort((a, b) => {
      if (b.combinedScore !== a.combinedScore) return b.combinedScore - a.combinedScore;
      if (b.combinedClues !== a.combinedClues) return b.combinedClues - a.combinedClues;
      const aR2 = a.r2?.adjusted_elapsed_seconds ?? Number.MAX_SAFE_INTEGER;
      const bR2 = b.r2?.adjusted_elapsed_seconds ?? Number.MAX_SAFE_INTEGER;
      if (aR2 !== bR2) return aR2 - bR2;
      return (a.team_name || '').localeCompare(b.team_name || '');
    });

    return list.map((row, idx) => ({ ...row, rank: idx + 1 }));
  }, [r1Data, r2Data]);

  const activeSingleRound = viewMode === '2' ? 2 : 1;
  const singleData = activeSingleRound === 2 ? r2Data : r1Data;

  const r1Leader = r1Data[0] || null;
  const r2Leader = r2Data[0] || null;

  const renderRankBadge = (rank) => {
    if (rank === 1) {
      return (
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
          1
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-300/20 text-slate-200 border border-slate-300/40">
          2
        </span>
      );
    }
    if (rank === 3) {
      return (
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-800/20 text-amber-400 border border-amber-800/40">
          3
        </span>
      );
    }
    return <span className="text-gray-400">{rank}</span>;
  };

  return (
    <div className="min-h-screen w-full bg-[#07060b] text-[#e9e4f5] p-4 sm:p-6 font-mono flex flex-col justify-between selection:bg-[#ff7a1a] selection:text-black">
      {/* Top Bar */}
      <header className="w-full max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#3a2a55]">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-[#3a2a55] bg-[#14101e] hover:bg-[#1f1730] text-gray-300 text-xs transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Control</span>
            </button>
          )}
          <h1 className="text-lg font-bold tracking-wider text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-[#ff7a1a]" />
            <span>CURSE THE CODE &bull; LIVE LEADERBOARD</span>
          </h1>
        </div>

        {/* View Mode Switcher (Side-by-Side + Individual Rounds) */}
        <div className="flex items-center gap-1.5 bg-[#14101e] border border-[#3a2a55] p-1 rounded-full text-xs">
          <button
            onClick={() => setViewMode('side')}
            className={`flex items-center gap-1.5 px-3.5 py-1 rounded-full transition-colors font-bold ${viewMode === 'side' ? 'bg-[#ff7a1a] text-black' : 'text-gray-400 hover:text-white'}`}
          >
            <Columns2 className="w-3.5 h-3.5" />
            <span>Side-by-Side (R1 &amp; R2)</span>
          </button>
          <button
            onClick={() => setViewMode('1')}
            className={`px-3.5 py-1 rounded-full transition-colors font-bold ${viewMode === '1' ? 'bg-[#ff7a1a] text-black' : 'text-gray-400 hover:text-white'}`}
          >
            Round 1
          </button>
          <button
            onClick={() => setViewMode('2')}
            className={`px-3.5 py-1 rounded-full transition-colors font-bold ${viewMode === '2' ? 'bg-[#8f7bff] text-black' : 'text-gray-400 hover:text-white'}`}
          >
            Round 2 (Rooms 4–6)
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full max-w-7xl mx-auto my-6 space-y-5 flex-1">
        {/* Status Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-400">
          <span>
            {viewMode === 'side' ? (
              <>
                Displaying side-by-side live standings for <strong className="text-[#ff7a1a]">Round 1</strong> &amp; <strong className="text-[#8f7bff]">Round 2 (incl. Room 5)</strong>
              </>
            ) : (
              <>
                Displaying official live ranking for <strong className="text-white">Round {activeSingleRound}</strong>
              </>
            )}
          </span>
          {loading && (
            <div className="flex items-center gap-1.5 text-[#ff7a1a]">
              <RefreshCw className="w-3 h-3 animate-spin" />
              <span>Syncing ranking...</span>
            </div>
          )}
        </div>

        {/* Side-by-Side Quick Leaders Summary Cards */}
        {viewMode === 'side' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#0e0c14] border border-[#3a2a55] rounded-xl p-4 flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-[#ff7a1a] font-bold">Round 1 Leader (Rooms 1–3)</div>
                <div className="text-base font-bold text-white mt-1">{r1Leader ? r1Leader.team_name : 'No R1 submissions yet'}</div>
                <div className="text-[11px] text-gray-400 mt-0.5">
                  {r1Leader ? `${r1Leader.clues_solved ?? 0} solved · ${r1Leader.adjusted_time_str || '--:--'}` : 'Waiting for teams'}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-[#ff7a1a]">{r1Leader ? Number(r1Leader.total_score ?? 0).toFixed(1) : '0.0'}</div>
                <div className="text-[10px] text-gray-500">pts</div>
              </div>
            </div>

            <div className="bg-[#0e0c14] border border-[#3a2a55] rounded-xl p-4 flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-[#8f7bff] font-bold">Round 2 Leader (Rooms 4–6 · Room 5 Tracked)</div>
                <div className="text-base font-bold text-white mt-1">{r2Leader ? r2Leader.team_name : 'No R2 submissions yet'}</div>
                <div className="text-[11px] text-gray-400 mt-0.5">
                  {r2Leader ? `${r2Leader.clues_solved ?? 0} solved · ${r2Leader.adjusted_time_str || '--:--'}` : 'Requires Round 2 start + team login'}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-[#8f7bff]">{r2Leader ? Number(r2Leader.total_score ?? 0).toFixed(1) : '0.0'}</div>
                <div className="text-[10px] text-gray-500">pts</div>
              </div>
            </div>
          </div>
        )}

        {/* Leaderboard Table */}
        <div className="bg-[#0e0c14] border border-[#3a2a55] rounded-xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            {viewMode === 'side' ? (
              <table className="w-full text-left text-xs">
                <thead className="bg-[#14101e] text-gray-400 border-b border-[#3a2a55]">
                  <tr>
                    <th rowSpan={2} className="py-3 px-4 w-14 text-center border-r border-[#3a2a55]/50">Rank</th>
                    <th rowSpan={2} className="py-3 px-4 border-r border-[#3a2a55]/50">Team</th>
                    <th colSpan={3} className="py-2 px-4 text-center text-[#ff7a1a] border-r border-[#3a2a55]/50">
                      Round 1 (Rooms 1–3)
                    </th>
                    <th colSpan={3} className="py-2 px-4 text-center text-[#8f7bff] border-r border-[#3a2a55]/50">
                      Round 2 (Rooms 4–6 incl. Room 5)
                    </th>
                    <th rowSpan={2} className="py-3 px-4 text-center text-green-300">Total</th>
                  </tr>
                  <tr className="border-t border-[#3a2a55]/60 text-[11px]">
                    <th className="py-2 px-3 text-center">Clues</th>
                    <th className="py-2 px-3 text-center">Score</th>
                    <th className="py-2 px-3 text-center border-r border-[#3a2a55]/50">Time / Pen</th>
                    <th className="py-2 px-3 text-center">Clues</th>
                    <th className="py-2 px-3 text-center">Score</th>
                    <th className="py-2 px-3 text-center border-r border-[#3a2a55]/50">Time / Pen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#3a2a55]/40 font-mono">
                  {sideBySideRows.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-gray-500 italic">
                        No team submissions recorded yet for Round 1 or Round 2.
                      </td>
                    </tr>
                  ) : (
                    sideBySideRows.map((row) => (
                      <tr
                        key={row.team_id}
                        className={`hover:bg-[#14101e]/60 transition-colors ${
                          row.rank === 1 ? 'bg-amber-950/20' : row.rank === 2 ? 'bg-slate-800/20' : row.rank === 3 ? 'bg-orange-950/20' : ''
                        }`}
                      >
                        <td className="py-3 px-4 text-center font-bold border-r border-[#3a2a55]/30">
                          {renderRankBadge(row.rank)}
                        </td>
                        <td className="py-3 px-4 font-bold text-white border-r border-[#3a2a55]/30">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span>{row.team_name}</span>
                            {row.r1?.qualified_rank && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-950 border border-purple-800 text-purple-300">
                                Q#{row.r1.qualified_rank}
                              </span>
                            )}
                          </div>
                        </td>
                        {/* Round 1 */}
                        <td className="py-3 px-3 text-center font-bold text-[#ff7a1a]">
                          {row.r1 ? `${row.r1.clues_solved ?? 0}` : '—'}
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-green-400">
                          {row.r1 ? Number(row.r1.total_score ?? 0).toFixed(1) : '—'}
                        </td>
                        <td className="py-3 px-3 text-center text-gray-300 border-r border-[#3a2a55]/30">
                          {row.r1 ? (
                            <span className="inline-flex items-center gap-1">
                              <Clock className="w-3 h-3 text-gray-500" />
                              {row.r1.adjusted_time_str || '--:--'}
                              {row.r1.penalty_seconds > 0 && (
                                <span className="text-[10px] text-red-400">+{row.r1.penalty_seconds}s</span>
                              )}
                            </span>
                          ) : '—'}
                        </td>
                        {/* Round 2 */}
                        <td className="py-3 px-3 text-center font-bold text-[#8f7bff]">
                          {row.r2 ? `${row.r2.clues_solved ?? 0}` : (row.r1?.is_qualified_r2 ? '0' : '—')}
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-green-400">
                          {row.r2 ? Number(row.r2.total_score ?? 0).toFixed(1) : (row.r1?.is_qualified_r2 ? '0.0' : '—')}
                        </td>
                        <td className="py-3 px-3 text-center text-gray-300 border-r border-[#3a2a55]/30">
                          {row.r2 ? (
                            <span className="inline-flex items-center gap-1">
                              <Clock className="w-3 h-3 text-gray-500" />
                              {row.r2.adjusted_time_str || '--:--'}
                              {row.r2.penalty_seconds > 0 && (
                                <span className="text-[10px] text-red-400">+{row.r2.penalty_seconds}s</span>
                              )}
                            </span>
                          ) : '—'}
                        </td>
                        {/* Total */}
                        <td className="py-3 px-4 text-center font-bold text-white text-sm">
                          {row.combinedScore.toFixed(1)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-[#14101e] text-gray-400 border-b border-[#3a2a55]">
                  <tr>
                    <th className="py-3 px-4 w-16 text-center">Rank</th>
                    <th className="py-3 px-4">Team</th>
                    <th className="py-3 px-4 text-center">Clues Solved</th>
                    <th className="py-3 px-4 text-center">Score</th>
                    <th className="py-3 px-4 text-center">Time / Pen</th>
                    {activeSingleRound === 1 && (
                      <th className="py-3 px-4 text-center">Round 2 Status</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#3a2a55]/40 font-mono">
                  {singleData.length === 0 ? (
                    <tr>
                      <td colSpan={activeSingleRound === 1 ? 6 : 5} className="py-8 text-center text-gray-500 italic">
                        No team submissions recorded yet for Round {activeSingleRound}.
                      </td>
                    </tr>
                  ) : (
                    singleData.map((row) => (
                      <tr
                        key={row.team_id}
                        className={`hover:bg-[#14101e]/60 transition-colors ${
                          row.rank === 1
                            ? 'bg-amber-950/20'
                            : row.rank === 2
                            ? 'bg-slate-800/20'
                            : row.rank === 3
                            ? 'bg-orange-950/20'
                            : ''
                        }`}
                      >
                        <td className="py-3 px-4 text-center font-bold">
                          {renderRankBadge(row.rank)}
                        </td>
                        <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                          <span>{row.team_name}</span>
                          {row.qualified_rank && activeSingleRound === 1 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-950 border border-purple-800 text-purple-300">
                              Q#{row.qualified_rank}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="font-bold text-[#ff7a1a]">
                            {row.clues_solved}
                          </span>{' '}
                          <span className="text-gray-500">solved</span>
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-green-400 text-sm">
                          {Number(row.total_score ?? 0).toFixed(1)}
                        </td>
                        <td className="py-3 px-4 text-center text-gray-300">
                          {row.adjusted_time_str || '--:--'}
                          {row.penalty_seconds > 0 && (
                            <span className="ml-1.5 text-[10px] text-red-400 inline-flex items-center gap-0.5">
                              <AlertTriangle className="w-3 h-3" />+{row.penalty_seconds}s
                            </span>
                          )}
                        </td>
                        {activeSingleRound === 1 && (
                          <td className="py-3 px-4 text-center">
                            {row.is_qualified_r2 ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-green-950 border border-green-800 text-green-300">
                                Qualified
                              </span>
                            ) : (
                              <span className="text-gray-500 text-[11px]">—</span>
                            )}
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-7xl mx-auto text-center text-xs text-[#574972] pt-4 border-t border-[#3a2a55]">
        <span>CURSE THE CODE &bull; OFFICIAL LIVE LEADERBOARD</span>
      </footer>
    </div>
  );
}
