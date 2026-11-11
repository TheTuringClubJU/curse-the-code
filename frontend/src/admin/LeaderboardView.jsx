import React, { useState, useEffect } from 'react';
import { Trophy, ArrowLeft, RefreshCw, Medal, ShieldCheck } from 'lucide-react';

export default function LeaderboardView({ onBack }) {
  const [round, setRound] = useState(1);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = async (roundNum) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/leaderboard?round_num=${roundNum}`, {
        credentials: 'include',
        headers: {
          'x-admin-token': localStorage.getItem('ctc_admin_token') || ''
        }
      });
      if (res.ok) {
        const json = await res.json();
        setData(json.leaderboard || []);
      }
    } catch (e) {
      console.error('Error fetching leaderboard:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard(round);
    const interval = setInterval(() => fetchLeaderboard(round), 4000);
    return () => clearInterval(interval);
  }, [round]);

  return (
    <div className="min-h-screen w-full bg-[#07060b] text-[#e9e4f5] p-4 sm:p-6 font-mono flex flex-col justify-between selection:bg-[#ff7a1a] selection:text-black">
      {/* Top Bar */}
      <header className="w-full max-w-6xl mx-auto flex items-center justify-between pb-4 border-b border-[#3a2a55]">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#3a2a55] bg-[#14101e] hover:bg-[#1f1730] text-gray-300 text-xs transition-colors"
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

        {/* Round Switcher */}
        <div className="flex items-center gap-2 bg-[#14101e] border border-[#3a2a55] p-1 rounded-lg text-xs">
          <button
            onClick={() => setRound(1)}
            className={`px-3 py-1 rounded transition-colors font-bold ${round === 1 ? 'bg-[#ff7a1a] text-black' : 'text-gray-400 hover:text-white'}`}
          >
            Round 1
          </button>
          <button
            onClick={() => setRound(2)}
            className={`px-3 py-1 rounded transition-colors font-bold ${round === 2 ? 'bg-[#8f7bff] text-black' : 'text-gray-400 hover:text-white'}`}
          >
            Round 2
          </button>
        </div>
      </header>

      {/* Main Leaderboard Table */}
      <main className="w-full max-w-6xl mx-auto my-6 space-y-4 flex-1">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>
            Displaying official live ranking for <strong className="text-white">Round {round}</strong>
          </span>
          {loading && (
            <div className="flex items-center gap-1.5 text-[#ff7a1a]">
              <RefreshCw className="w-3 h-3 animate-spin" />
              <span>Syncing ranking...</span>
            </div>
          )}
        </div>

        <div className="bg-[#0e0c14] border border-[#3a2a55] rounded-xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#14101e] text-gray-400 border-b border-[#3a2a55]">
                <tr>
                  <th className="py-3 px-4 w-16 text-center">Rank</th>
                  <th className="py-3 px-4">Team</th>
                  <th className="py-3 px-4 text-center">Clues Solved</th>
                  <th className="py-3 px-4 text-center">Score</th>
                  {round === 1 && (
                    <th className="py-3 px-4 text-center">Round 2 Status</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#3a2a55]/40 font-mono">
                {data.length === 0 ? (
                  <tr>
                    <td colSpan={round === 1 ? 5 : 4} className="py-8 text-center text-gray-500 italic">
                      No team submissions recorded yet for Round {round}.
                    </td>
                  </tr>
                ) : (
                  data.map((row) => (
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
                        {row.rank === 1 ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            1
                          </span>
                        ) : row.rank === 2 ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-300/20 text-slate-200 border border-slate-300/40">
                            2
                          </span>
                        ) : row.rank === 3 ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-800/20 text-amber-400 border border-amber-800/40">
                            3
                          </span>
                        ) : (
                          <span className="text-gray-400">{row.rank}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                        <span>{row.team_name}</span>
                        {row.qualified_rank && round === 1 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-950 border border-purple-800 text-purple-300">
                            Q#{row.qualified_rank}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="font-bold text-[#ff7a1a]">
                          {row.clues_solved}
                        </span>{' '}
                        <span className="text-gray-500">/ 10</span>
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-green-400 text-sm">
                        {row.total_score.toFixed(1)}
                      </td>
                      {round === 1 && (
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
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-6xl mx-auto text-center text-xs text-[#574972] pt-4 border-t border-[#3a2a55]">
        <span>CURSE THE CODE &bull; OFFICIAL LIVE LEADERBOARD</span>
      </footer>
    </div>
  );
}
