import React, { useState, useEffect } from 'react';
import UserLogin from './userlogin/UserLogin';
import Lobby from './lobby/Lobby';
import AdminLogin from './admin/AdminLogin';
import AdminDashboard from './admin/AdminDashboard';
import Room1Bedroom from './game/Room1Bedroom';
import Room2Study from './game/Room2Study';
import { checkAuthStatus, logoutTeam } from './userlogin/authApi';

export default function App() {
  const [isAdminRoute, setIsAdminRoute] = useState(
    typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')
  );
  const [adminUser, setAdminUser] = useState(null);
  const [checkingAdminAuth, setCheckingAdminAuth] = useState(true);

  const [team, setTeam] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [roundStatus, setRoundStatus] = useState(null); // Pure DB-driven: null until verified from DB
  const [currentRoundNum, setCurrentRoundNum] = useState(1);
  const [currentRoom, setCurrentRoom] = useState('bedroom');

  // Listen to popstate or route changes if needed
  useEffect(() => {
    const handleLocationChange = () => {
      setIsAdminRoute(window.location.pathname.startsWith('/admin'));
    };
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  // Admin auth check
  useEffect(() => {
    if (!isAdminRoute) {
      setCheckingAdminAuth(false);
      return;
    }
    fetch('/api/admin/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.admin) {
          setAdminUser(data.admin);
        } else {
          setAdminUser(null);
        }
      })
      .catch(() => setAdminUser(null))
      .finally(() => setCheckingAdminAuth(false));
  }, [isAdminRoute]);

  // Participant auth check
  useEffect(() => {
    if (isAdminRoute) {
      setCheckingAuth(false);
      return;
    }
    checkAuthStatus()
      .then((res) => {
        if (res && res.ok && res.team) {
          setTeam(res.team);
        }
      })
      .finally(() => setCheckingAuth(false));
  }, [isAdminRoute]);

  // Fast poll lobby/game status when team is logged in
  useEffect(() => {
    if (!team || isAdminRoute) return;

    let isMounted = true;
    const checkState = async () => {
      try {
        const res = await fetch('/api/lobby/state', {
          credentials: 'include'
        });
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setRoundStatus(data.round_status || 'pending');
            setCurrentRoundNum(data.current_round || 1);
          }
        } else {
          if (isMounted) setRoundStatus(prev => prev || 'pending');
        }
      } catch (err) {
        console.error('State polling error:', err);
        if (isMounted) setRoundStatus(prev => prev || 'pending');
      }
    };

    // Always execute the initial state check immediately from DB
    checkState();

    // Pause continuous fast polling while actively playing Room 1 to free bandwidth for interactions
    if (roundStatus === 'live' && currentRoundNum === 1) return;

    const interval = setInterval(checkState, 3000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [team, isAdminRoute, roundStatus, currentRoundNum]);

  const handleLoginSuccess = (authenticatedTeam) => {
    setRoundStatus(null);
    setTeam(authenticatedTeam);
  };

  const handleLogout = async () => {
    await logoutTeam();
    setTeam(null);
    setRoundStatus(null);
  };

  const handleAdminLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    setAdminUser(null);
  };

  // Admin Route Branch
  if (isAdminRoute) {
    if (checkingAdminAuth) {
      return (
        <div className="min-h-screen w-full bg-[#06040A] flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-[#8A2BE2] border-t-transparent rounded-full animate-spin" />
        </div>
      );
    }
    return (
      <div className="w-full min-h-screen overflow-y-auto">
        {adminUser ? (
          <AdminDashboard admin={adminUser} onLogout={handleAdminLogout} />
        ) : (
          <AdminLogin onLoginSuccess={(admin) => setAdminUser(admin)} />
        )}
      </div>
    );
  }

  // Participant Route Branch
  if (checkingAuth || (team && roundStatus === null)) {
    return (
      <div className="min-h-screen w-full bg-[#07060b] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#ff7a1a] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!team) {
    return <UserLogin onLoginSuccess={handleLoginSuccess} />;
  }

  // When Round 1 is live, display Room 1 (Bedroom), Room 2 (Study), or Room 3 (Basement Transition)
  if (roundStatus === 'live' && currentRoundNum === 1) {
    if (currentRoom === 'study') {
      return (
        <Room2Study
          team={team}
          onLogout={handleLogout}
          onTransitionToRoom3={() => setCurrentRoom('basement')}
        />
      );
    }

    if (currentRoom === 'basement') {
      return (
        <div className="min-h-screen w-full bg-[#080503] text-[#fcd34d] flex flex-col items-center justify-center p-6 text-center font-mono select-none">
          <div className="max-w-lg p-8 bg-[#120a05] border-2 border-[#b45309] rounded-2xl shadow-[0_0_80px_rgba(245,158,11,0.2)] space-y-6">
            <div className="w-16 h-16 mx-auto rounded-full bg-[#451a03] border border-[#f59e0b] flex items-center justify-center animate-pulse">
              <span className="text-2xl">⚠️</span>
            </div>
            <div className="space-y-2">
              <span className="text-[10px] tracking-widest text-[#d97706] uppercase block">
                ROUND 1 • ROOM 3 TRANSITION
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-[#fbbf24] tracking-wider uppercase font-serif">
                The Subterranean Bunker
              </h1>
            </div>
            <p className="text-xs text-[#fef3c7] leading-relaxed">
              The heavy pneumatic blast door has unlatched. Cold, damp air rushes up from the server vaults below. Subterranean access conduits and Room 3 are initializing...
            </p>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={() => setCurrentRoom('study')}
                className="flex-1 py-3 px-4 bg-[#2e1507] hover:bg-[#451a03] text-[#fbbf24] rounded-xl font-bold text-xs tracking-wider uppercase transition border border-[#b45309]"
              >
                ← Return to Study
              </button>
              <button
                onClick={handleLogout}
                className="py-3 px-4 bg-transparent hover:bg-white/5 text-gray-400 hover:text-white rounded-xl text-xs font-mono transition border border-white/10"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <Room1Bedroom
        team={team}
        onLogout={handleLogout}
        onTransitionToRoom2={() => setCurrentRoom('study')}
      />
    );
  }

  // Otherwise, player waits in the atmospheric Lobby
  return <Lobby team={team} onLogout={handleLogout} />;
}
