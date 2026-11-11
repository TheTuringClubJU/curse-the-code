import React, { useState, useEffect } from 'react';
import { Play, Square, RotateCcw, LogOut, Users, UserCheck, UserX, ShieldCheck, RefreshCw, Trophy, UserPlus, CheckCircle, Eye } from 'lucide-react';
import LeaderboardView from './LeaderboardView';

export default function AdminDashboard({ admin, onLogout }) {
  const [currentView, setCurrentView] = useState('control'); // 'control' | 'leaderboard'
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Top N Qualification State
  const [nInput, setNInput] = useState(5);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [qualifyLoading, setQualifyLoading] = useState(false);
  const [qualifySuccess, setQualifySuccess] = useState('');

  // Poll dashboard data every 3 seconds
  const fetchDashboard = async () => {
    try {
      const res = await fetch('/api/admin/dashboard', {
        credentials: 'include',
        headers: {
          'x-admin-token': localStorage.getItem('ctc_admin_token') || ''
        }
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else if (res.status === 401 && onLogout) {
        onLogout();
      }
    } catch (e) {
      console.error('Error fetching admin dashboard:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleRoundAction = async (action) => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/rounds/control', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': localStorage.getItem('ctc_admin_token') || ''
        },
        credentials: 'include',
        body: JSON.stringify({ action })
      });
      if (res.ok) {
        await fetchDashboard();
      }
    } catch (e) {
      console.error('Error executing round control:', e);
    } finally {
      setActionLoading(false);
    }
  };

  const [loggingOutTeamId, setLoggingOutTeamId] = useState(null);

  const handleLogoutTeam = async (teamId) => {
    setLoggingOutTeamId(teamId);
    try {
      const res = await fetch(`/api/admin/teams/${teamId}/logout`, {
        method: 'POST',
        headers: {
          'x-admin-token': localStorage.getItem('ctc_admin_token') || ''
        },
        credentials: 'include'
      });
      if (res.ok) {
        await fetchDashboard();
      }
    } catch (e) {
      console.error('Error logging out team:', e);
    } finally {
      setLoggingOutTeamId(null);
    }
  };

  // Preview Top N teams
  const handlePreviewQualification = async () => {
    const count = parseInt(nInput, 10);
    if (!count || count < 1) return;
    setPreviewLoading(true);
    setQualifySuccess('');
    try {
      const res = await fetch(`/api/admin/qualification/preview?count=${count}`, {
        credentials: 'include',
        headers: {
          'x-admin-token': localStorage.getItem('ctc_admin_token') || ''
        }
      });
      if (res.ok) {
        const json = await res.json();
        setPreviewData(json.preview || []);
      }
    } catch (e) {
      console.error('Error previewing qualification:', e);
    } finally {
      setPreviewLoading(false);
    }
  };

  // Qualify Top N teams
  const handleQualifyTeams = async () => {
    const count = parseInt(nInput, 10);
    if (!count || count < 1) return;
    setQualifyLoading(true);
    try {
      const res = await fetch('/api/admin/qualification/qualify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': localStorage.getItem('ctc_admin_token') || ''
        },
        credentials: 'include',
        body: JSON.stringify({ count })
      });
      if (res.ok) {
        const json = await res.json();
        setQualifySuccess(`Successfully qualified ${json.qualified_count} teams for Round 2!`);
        await handlePreviewQualification();
        await fetchDashboard();
      }
    } catch (e) {
      console.error('Error executing qualification:', e);
    } finally {
      setQualifyLoading(false);
    }
  };

  if (currentView === 'leaderboard') {
    return <LeaderboardView onBack={() => setCurrentView('control')} />;
  }

  const r1 = data?.rounds?.[1] || { status: 'pending' };
  const r2 = data?.rounds?.[2] || { status: 'pending' };

  return (
    <div className="min-h-screen w-full bg-[#07060b] text-[#e9e4f5] p-4 sm:p-6 font-mono flex flex-col justify-between selection:bg-[#ff7a1a] selection:text-black">
      {/* Top Navbar */}
      <header className="w-full max-w-6xl mx-auto flex items-center justify-between pb-4 border-b border-[#3a2a55]">
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-[#ff7a1a] animate-ping" />
          <h1 className="text-lg font-bold tracking-wider text-white">
            CURSE THE CODE &bull; ADMIN CONTROL
          </h1>
        </div>

        <div className="flex items-center gap-3 text-xs">
          {/* Option near Admin on right side to view Leaderboard */}
          <button
            onClick={() => setCurrentView('leaderboard')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#ff7a1a]/40 bg-[#ff7a1a]/10 hover:bg-[#ff7a1a]/20 text-[#ff7a1a] font-bold transition-colors shadow-[0_0_10px_rgba(255,122,26,0.2)]"
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>Live Leaderboard</span>
          </button>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#14101e] border border-[#3a2a55]">
            <ShieldCheck className="w-4 h-4 text-[#4ade80]" />
            <span className="text-gray-400">Admin:</span>
            <span className="text-white font-bold">{admin?.username || 'admin'}</span>
          </div>

          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-900/60 bg-red-950/30 text-red-400 hover:text-red-300 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="w-full max-w-6xl mx-auto my-6 space-y-6">
        {/* Row 1: Status Overview & Teams Presence KPI */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Round Status Overview Card */}
          <div className="md:col-span-2 bg-[#0e0c14] border border-[#3a2a55] rounded-xl p-6 flex flex-col justify-between shadow-xl relative overflow-hidden purple-glow">
            <div>
              <span className="text-xs uppercase tracking-widest text-[#8f7bff] mb-1 block">
                Current Event Status
              </span>
              <p className="text-lg font-bold text-white mt-1">
                Curse the Code &bull; Live Round Management
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Rounds are controlled manually. Use the control panel below to initiate or terminate rounds.
              </p>
            </div>

            {/* Quick Status Badges */}
            <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
              <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded bg-[#14101e] border border-[#3a2a55]">
                <span className="text-gray-400">Round 1:</span>
                <span className={`font-bold uppercase ${r1.status === 'live' ? 'text-green-400' : (r1.status === 'ended' ? 'text-gray-500' : 'text-[#ff7a1a]')}`}>
                  {r1.status}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded bg-[#14101e] border border-[#3a2a55]">
                <span className="text-gray-400">Round 2:</span>
                <span className={`font-bold uppercase ${r2.status === 'live' ? 'text-green-400' : (r2.status === 'ended' ? 'text-gray-500' : 'text-[#8f7bff]')}`}>
                  {r2.status}
                </span>
              </div>
            </div>
          </div>

          {/* Teams Presence KPI */}
          <div className="bg-[#0e0c14] border border-[#3a2a55] rounded-xl p-6 flex flex-col justify-between shadow-xl">
            <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
              <span className="uppercase tracking-wider">Team Presence</span>
              <Users className="w-4 h-4 text-[#8f7bff]" />
            </div>

            <div className="grid grid-cols-2 gap-4 my-2">
              <div className="p-3 rounded-lg bg-[#122416] border border-[#22c55e]/30">
                <div className="flex items-center gap-1.5 text-xs text-[#4ade80]">
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Logged In</span>
                </div>
                <p className="text-2xl font-bold text-white mt-1">
                  {data?.presence?.logged_in || 0}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-[#241216] border border-[#ef4444]/30">
                <div className="flex items-center gap-1.5 text-xs text-[#f87171]">
                  <UserX className="w-3.5 h-3.5" />
                  <span>Logged Out</span>
                </div>
                <p className="text-2xl font-bold text-white mt-1">
                  {data?.presence?.logged_out || 0}
                </p>
              </div>
            </div>

            <p className="text-[11px] text-gray-500">
              Total registered teams: {data?.presence?.total_teams || 0}
            </p>
          </div>
        </div>

        {/* Row 2: Manual Round Controls */}
        <div className="bg-[#0e0c14] border border-[#3a2a55] rounded-xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm uppercase tracking-wider text-white font-bold">
                Manual Round Controls
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Organizers trigger each round manually.
              </p>
            </div>
            {actionLoading && (
              <div className="flex items-center gap-2 text-xs text-[#ff7a1a]">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Applying state...</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Round 1 Box */}
            <div className="bg-[#14101e] border border-[#3a2a55] rounded-lg p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-[#3a2a55] pb-3">
                <span className="font-bold text-white text-sm">Round 1</span>
                <span className={`text-xs px-2.5 py-1 rounded-full uppercase font-bold ${r1.status === 'live' ? 'bg-green-950 text-green-300 border border-green-800' : (r1.status === 'ended' ? 'bg-gray-800 text-gray-400' : 'bg-orange-950 text-orange-300 border border-orange-800')}`}>
                  Status: {r1.status}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2.5 pt-1">
                <button
                  onClick={() => handleRoundAction('start_r1')}
                  disabled={actionLoading || r1.status === 'live'}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg bg-green-950/60 border border-green-700/60 hover:bg-green-900/80 text-green-300 text-xs font-bold tracking-wider uppercase transition-colors disabled:opacity-40"
                  title="Make Round 1 live"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Start</span>
                </button>

                <button
                  onClick={() => handleRoundAction('end_r1')}
                  disabled={actionLoading || r1.status === 'ended'}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg bg-red-950/60 border border-red-700/60 hover:bg-red-900/80 text-red-300 text-xs font-bold tracking-wider uppercase transition-colors disabled:opacity-40"
                  title="End Round 1"
                >
                  <Square className="w-3.5 h-3.5" />
                  <span>End</span>
                </button>

                <button
                  onClick={() => handleRoundAction('reset_r1')}
                  disabled={actionLoading || r1.status === 'pending'}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 text-gray-300 text-xs font-bold tracking-wider uppercase transition-colors disabled:opacity-40"
                  title="Reset Round 1 to pending"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-[#ff7a1a]" />
                  <span>Pending</span>
                </button>
              </div>
            </div>

            {/* Round 2 Box */}
            <div className="bg-[#14101e] border border-[#3a2a55] rounded-lg p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-[#3a2a55] pb-3">
                <span className="font-bold text-white text-sm">Round 2</span>
                <span className={`text-xs px-2.5 py-1 rounded-full uppercase font-bold ${r2.status === 'live' ? 'bg-green-950 text-green-300 border border-green-800' : (r2.status === 'ended' ? 'bg-gray-800 text-gray-400' : 'bg-purple-950 text-purple-300 border border-purple-800')}`}>
                  Status: {r2.status}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2.5 pt-1">
                <button
                  onClick={() => handleRoundAction('start_r2')}
                  disabled={actionLoading || r2.status === 'live'}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg bg-purple-950/60 border border-purple-700/60 hover:bg-purple-900/80 text-purple-300 text-xs font-bold tracking-wider uppercase transition-colors disabled:opacity-40"
                  title="Make Round 2 live"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Start</span>
                </button>

                <button
                  onClick={() => handleRoundAction('end_r2')}
                  disabled={actionLoading || r2.status === 'ended'}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg bg-red-950/60 border border-red-700/60 hover:bg-red-900/80 text-red-300 text-xs font-bold tracking-wider uppercase transition-colors disabled:opacity-40"
                  title="End Round 2"
                >
                  <Square className="w-3.5 h-3.5" />
                  <span>End</span>
                </button>

                <button
                  onClick={() => handleRoundAction('reset_r2')}
                  disabled={actionLoading || r2.status === 'pending'}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 text-gray-300 text-xs font-bold tracking-wider uppercase transition-colors disabled:opacity-40"
                  title="Reset Round 2 to pending"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-[#8f7bff]" />
                  <span>Pending</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Row 3: Qualification Panel (Top N Participants) */}
        <div className="bg-[#0e0c14] border border-[#3a2a55] rounded-xl p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-sm uppercase tracking-wider text-white font-bold flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-[#8f7bff]" />
                <span>Round 2 Qualification Panel (Top N Teams)</span>
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Ranks teams by clues solved & score with tie-breaker. Enter N to preview and qualify top N teams for Round 2.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-[#14101e] border border-[#3a2a55] rounded-lg px-3 py-1.5">
                <span className="text-xs text-gray-400 font-bold">Top N:</span>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={nInput}
                  onChange={(e) => setNInput(e.target.value)}
                  className="w-16 bg-[#07060b] border border-[#3a2a55] rounded px-2 py-1 text-xs text-white text-center font-bold focus:outline-none focus:border-[#8f7bff]"
                />
              </div>

              <button
                onClick={handlePreviewQualification}
                disabled={previewLoading || !nInput}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#3a2a55] bg-[#1a1426] hover:bg-[#251d36] text-gray-200 text-xs font-bold transition-colors disabled:opacity-40"
              >
                <Eye className="w-3.5 h-3.5 text-[#ff7a1a]" />
                <span>{previewLoading ? 'Ranking...' : 'Preview N'}</span>
              </button>

              <button
                onClick={handleQualifyTeams}
                disabled={qualifyLoading || !previewData || previewData.length === 0}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#8f7bff] hover:bg-[#a08fff] text-black text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-30"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>{qualifyLoading ? 'Qualifying...' : 'Qualify'}</span>
              </button>
            </div>
          </div>

          {qualifySuccess && (
            <div className="p-3 rounded-lg bg-green-950/40 border border-green-700/60 text-green-300 text-xs font-bold flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              <span>{qualifySuccess}</span>
            </div>
          )}

          {/* Preview Table */}
          {previewData && (
            <div className="border border-[#3a2a55]/60 rounded-lg overflow-hidden bg-[#14101e]">
              <div className="px-4 py-2 bg-[#1a1426] border-b border-[#3a2a55] text-xs font-bold text-gray-300 flex items-center justify-between">
                <span>Top {previewData.length} Preview Eligible for Round 2</span>
                <span className="text-gray-500 text-[11px]">Click 'Qualify' to finalize entry</span>
              </div>
              <table className="w-full text-left text-xs">
                <thead className="bg-[#100c17] text-gray-400 border-b border-[#3a2a55]">
                  <tr>
                    <th className="py-2 px-3 w-12 text-center">#</th>
                    <th className="py-2 px-3">Team Name</th>
                    <th className="py-2 px-3 text-center">Clues Solved</th>
                    <th className="py-2 px-3 text-center">Score</th>
                    <th className="py-2 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#3a2a55]/40 font-mono">
                  {previewData.map((t) => (
                    <tr key={t.team_id} className="hover:bg-[#1f1730]/40">
                      <td className="py-2 px-3 text-center font-bold text-white">
                        {t.preview_rank}
                      </td>
                      <td className="py-2 px-3 font-bold text-white">
                        {t.team_name}
                      </td>
                      <td className="py-2 px-3 text-center text-[#ff7a1a] font-bold">
                        {t.clues_solved} / 10
                      </td>
                      <td className="py-2 px-3 text-center text-green-400 font-bold">
                        {t.total_score.toFixed(1)}
                      </td>
                      <td className="py-2 px-3 text-center">
                        {t.already_qualified ? (
                          <span className="text-green-400 font-bold text-[11px]">Already Qualified</span>
                        ) : (
                          <span className="text-[#8f7bff] text-[11px] font-semibold">Ready to Qualify</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Row 4: Team List Presence Status Table */}
        <div className="bg-[#0e0c14] border border-[#3a2a55] rounded-xl p-6 shadow-xl">
          <h2 className="text-sm uppercase tracking-wider text-white font-bold mb-4">
            Team Presence & Active Sessions
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#14101e] text-gray-400 border-b border-[#3a2a55]">
                <tr>
                  <th className="py-2.5 px-3">Team Name</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Presence</th>
                  <th className="py-2.5 px-3">Active Devices</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#3a2a55]/40">
                {data?.teams?.map((team) => (
                  <tr key={team.id} className="hover:bg-[#14101e]/50">
                    <td className="py-2.5 px-3 font-bold text-white">{team.name}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] uppercase ${team.is_active ? 'bg-green-950 text-green-300 border border-green-800' : 'bg-red-950 text-red-300 border border-red-800'}`}>
                        {team.is_active ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold ${team.is_logged_in ? 'text-green-400' : 'text-gray-500'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${team.is_logged_in ? 'bg-green-400 animate-pulse' : 'bg-gray-600'}`} />
                        {team.is_logged_in ? 'Logged In' : 'Logged Out'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-gray-400">
                      {team.active_devices} device(s)
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {team.is_logged_in ? (
                        <button
                          onClick={() => handleLogoutTeam(team.id)}
                          disabled={loggingOutTeamId === team.id}
                          className="px-2.5 py-1 rounded bg-red-950/50 hover:bg-red-900 border border-red-800/60 text-red-300 text-[11px] font-semibold transition-colors disabled:opacity-40"
                          title="Forcibly logout all active sessions for this team"
                        >
                          {loggingOutTeamId === team.id ? 'Logging out...' : 'Force Logout'}
                        </button>
                      ) : (
                        <span className="text-gray-600 text-[11px] italic">No active session</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-6xl mx-auto text-center text-xs text-[#574972] pt-4 border-t border-[#3a2a55]">
        <span>CURSE THE CODE &bull; ORGANISER ADMIN SYSTEM &bull; 2026</span>
      </footer>
    </div>
  );
}
