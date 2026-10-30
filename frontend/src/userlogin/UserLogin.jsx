import React, { useState, useEffect } from 'react';
import JackOLantern from './JackOLantern';
import DustParticles from './DustParticles';
import SignInForm from './SignInForm';
import LogoutForm from './LogoutForm';
import { loginTeam, logoutAllDevices, checkAuthStatus, logoutTeam } from './authApi';
import { CheckCircle2, LogIn, LogOut, ShieldCheck } from 'lucide-react';

export default function UserLogin({ onLoginSuccess }) {
  const [activeTab, setActiveTab] = useState('signin'); // 'signin' or 'logout'
  const [teamName, setTeamName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [sessionLimitNotice, setSessionLimitNotice] = useState(null);
  const [authenticatedTeam, setAuthenticatedTeam] = useState(null);

  // Check on mount if already authenticated on this device (BE-14 / FE-25)
  useEffect(() => {
    checkAuthStatus().then((res) => {
      if (res && res.ok && res.team) {
        setAuthenticatedTeam(res.team);
      }
    });
  }, []);

  const handleSignIn = async () => {
    setError('');
    setSuccessMsg('');
    setSessionLimitNotice(null);
    setLoading(true);

    try {
      const res = await loginTeam(teamName, password);
      setAuthenticatedTeam(res.team);
      setSuccessMsg(res.message || 'Login successful!');
      setPassword('');
      if (onLoginSuccess) {
        onLoginSuccess(res.team);
      }
    } catch (err) {
      if (err.code === 'SESSION_LIMIT') {
        setSessionLimitNotice(err.detail);
        setError('');
      } else {
        setError(err.message || 'Team name or password is wrong');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogoutAll = async () => {
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const res = await logoutAllDevices(teamName, password);
      // FE-23: Green confirmation "N session(s) ended. You can sign in now.", clear password, switch to sign in with team name kept
      setSuccessMsg(`${res.sessions_ended} session(s) ended. You can sign in now.`);
      setPassword('');
      setSessionLimitNotice(null);
      setAuthenticatedTeam(null);
      setActiveTab('signin');
    } catch (err) {
      setError(err.message || 'Team name or password is wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleSingleLogout = async () => {
    setLoading(true);
    await logoutTeam();
    setAuthenticatedTeam(null);
    setSuccessMsg('You have signed out from this browser.');
    setLoading(false);
  };

  return (
    <div className="relative min-h-screen w-full bg-[#07060b] text-[#e9e4f5] flex flex-col justify-between items-center p-4 selection:bg-[#ff7a1a] selection:text-black overflow-hidden">
      {/* Background Ambience: Scanlines, vignette, dust motes */}
      <div className="absolute inset-0 scanlines z-10 pointer-events-none" />
      <div className="absolute inset-0 vignette z-10 pointer-events-none" />
      <DustParticles />

      {/* Header Banner */}
      <header className="z-20 text-center pt-8 pb-4">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-elite text-[#ff7a1a] tracking-wider animate-flicker drop-shadow-[0_0_15px_rgba(255,122,26,0.6)]">
          CURSE THE CODE
        </h1>
        <p className="text-sm sm:text-base font-mono text-[#8f7bff] mt-2 tracking-widest uppercase opacity-90">
          Hollow House opens at midnight
        </p>
      </header>

      {/* Main Content Area */}
      <main className="z-20 w-full max-w-[900px] flex flex-col md:flex-row items-center justify-center gap-8 my-auto">
        {/* Decorative Jack-o'-lantern (Visible on medium+ screens) */}
        <div className="hidden md:flex flex-col items-center justify-center p-4 border border-[#3a2a55]/50 bg-[#0e0c14]/40 rounded-lg backdrop-blur-sm purple-glow">
          <JackOLantern />
          <div className="mt-4 text-center font-mono text-xs text-[#8f7bff]/80 space-y-1">
            <p className="text-[#ff7a1a] font-bold">EVENT GATEWAY</p>
            <p>Max 2 Sessions / Team</p>
          </div>
        </div>

        {/* Central Auth Container: 420px standard panel */}
        <div className="w-full max-w-[420px] bg-[#0e0c14] border border-[#3a2a55] rounded-xl p-6 sm:p-7 purple-glow relative backdrop-blur-md">
          {/* Authenticated State Status (Direct login without redirecting) */}
          {authenticatedTeam && (
            <div className="mb-5 p-3.5 bg-[#122416] border border-[#22c55e]/40 rounded-lg flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2 text-[#4ade80]">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>
                  Logged in as <strong className="text-white">{authenticatedTeam.name}</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={handleSingleLogout}
                className="text-[11px] bg-red-950/60 hover:bg-red-900 border border-red-700/50 text-red-300 px-2.5 py-1 rounded transition-colors"
              >
                Sign out
              </button>
            </div>
          )}

          {/* Success Banner */}
          {successMsg && (
            <div className="mb-4 p-3 bg-emerald-950/40 border border-emerald-800/60 rounded text-emerald-400 text-xs font-mono flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Tab Switcher: SIGN IN / LOGOUT */}
          <div className="grid grid-cols-2 p-1 bg-[#151121] rounded-lg border border-[#3a2a55] mb-6">
            <button
              type="button"
              onClick={() => {
                setActiveTab('signin');
                setError('');
                setSuccessMsg('');
              }}
              className={`py-2 text-xs font-mono font-bold tracking-wider rounded transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'signin'
                  ? 'bg-[#ff7a1a] text-[#07060b] shadow'
                  : 'text-[#8f7bff] hover:text-[#e9e4f5]'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              SIGN IN
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('logout');
                setError('');
                setSuccessMsg('');
              }}
              className={`py-2 text-xs font-mono font-bold tracking-wider rounded transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'logout'
                  ? 'bg-[#b91c1c] text-white shadow'
                  : 'text-[#8f7bff] hover:text-[#e9e4f5]'
              }`}
            >
              <LogOut className="w-3.5 h-3.5" />
              LOGOUT ALL
            </button>
          </div>

          {/* Tab Views */}
          {activeTab === 'signin' ? (
            <SignInForm
              teamName={teamName}
              setTeamName={setTeamName}
              password={password}
              setPassword={setPassword}
              onSubmit={handleSignIn}
              loading={loading}
              error={error}
              sessionLimitNotice={sessionLimitNotice}
              onSwitchToLogoutAll={() => {
                setActiveTab('logout');
                setError('');
              }}
            />
          ) : (
            <LogoutForm
              teamName={teamName}
              setTeamName={setTeamName}
              password={password}
              setPassword={setPassword}
              onSubmit={handleLogoutAll}
              loading={loading}
              error={error}
            />
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="z-20 text-center text-xs font-mono text-[#574972] py-4">
        <span>CURSE THE CODE &bull; THE TURING CLUB &bull; 2026</span>
      </footer>
    </div>
  );
}
