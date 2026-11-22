import React, { useState, useEffect } from 'react';
import UserLogin from './userlogin/UserLogin';
import Lobby from './lobby/Lobby';
import AdminLogin from './admin/AdminLogin';
import AdminDashboard from './admin/AdminDashboard';
import Room1Bedroom from './game/Room1Bedroom';
import Room2Study from './game/Room2Study';
import Room3Basement from './game/Room3Basement';
import Room4Records from './game/Room4Records';
import Room5Control from './game/Room5Control';
import Room6Vault from './game/Room6Vault';
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
  const [inRoom5, setInRoom5] = useState(false);
  const [round2VaultUnlocked, setRound2VaultUnlocked] = useState(false);

  const changeRoom = (newRoom) => {
    localStorage.setItem('ctc_current_room', newRoom);
    setCurrentRoom(newRoom);
  };

  // Listen to popstate or route changes if needed
  useEffect(() => {
    const handleLocationChange = () => {
      setIsAdminRoute(window.location.pathname.startsWith('/admin'));
    };
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  useEffect(() => {
    const handleNavigateRoom = (event) => {
      const target = event?.detail;
      if (target === 'vault') {
        setRound2VaultUnlocked(true);
        setInRoom5(false);
        changeRoom('vault');
      } else if (target === 'control') {
        setInRoom5(true);
        setRound2VaultUnlocked(false);
        changeRoom('control');
      } else if (typeof target === 'string' && target) {
        changeRoom(target);
      }
    };
    window.addEventListener('ctc:navigate-room', handleNavigateRoom);
    return () => window.removeEventListener('ctc:navigate-room', handleNavigateRoom);
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

  // Live synchronization of Round 1 room progression across teammates
  useEffect(() => {
    if (!team || isAdminRoute || roundStatus !== 'live' || currentRoundNum !== 1) return;
    let cancelled = false;

    const syncRound1 = async () => {
      try {
        const bRes = await fetch('/api/game/room/basement', { credentials: 'include' });
        if (bRes.ok) {
          const bData = await bRes.json();
          if (!cancelled) {
            if (bData.is_completed) {
              setCurrentRoom('lobby');
              return;
            }
            setCurrentRoom('basement');
            return;
          }
        }
        const sRes = await fetch('/api/game/room/study', { credentials: 'include' });
        if (!cancelled && sRes.ok) {
          setCurrentRoom('study');
          return;
        }
        if (!cancelled) {
          setCurrentRoom('bedroom');
        }
      } catch {
        // Keep current room on transient network error
      }
    };

    syncRound1();
    const interval = setInterval(syncRound1, 2500);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [team, isAdminRoute, roundStatus, currentRoundNum]);

  // Live synchronization of Round 2 room progression (Room 4 -> Room 5 -> Room 6) across teammates
  useEffect(() => {
    if (!team || isAdminRoute || roundStatus !== 'live' || currentRoundNum !== 2) return;
    let cancelled = false;
    const token = localStorage.getItem('ctc_token') || '';
    const headers = token ? { 'x-session-token': token } : {};

    const syncRound2 = async () => {
      try {
        // 1. Check if Fork 2 is resolved -> Room 6 (Vault)
        const fork2Res = await fetch('/api/game/fork/fork_2/status', { credentials: 'include', headers });
        if (!cancelled && fork2Res.ok) {
          const fork2Data = await fork2Res.json();
          if (fork2Data?.resolved) {
            setRound2VaultUnlocked(true);
            setInRoom5(false);
            setCurrentRoom('vault');
            return;
          }
        }

        // 2. Check if Fork 1 is resolved -> Room 5 (Control)
        const fork1Res = await fetch('/api/game/fork/fork_1/status', { credentials: 'include', headers });
        if (!cancelled && fork1Res.ok) {
          const fork1Data = await fork1Res.json();
          if (fork1Data?.resolved) {
            setInRoom5(true);
            setRound2VaultUnlocked(false);
            setCurrentRoom('control');
            return;
          }
        }

        // 3. Otherwise default to initial Room 4 (The Rotting Archive)
        if (!cancelled) {
          setInRoom5(false);
          setRound2VaultUnlocked(false);
          setCurrentRoom('records');
        }
      } catch {
        // Keep current room on transient network error
      }
    };

    syncRound2();
    const interval = setInterval(syncRound2, 2500);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [team, isAdminRoute, roundStatus, currentRoundNum]);

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
          if (isMounted) setRoundStatus((prev) => prev || 'pending');
        }
      } catch (err) {
        console.error('State polling error:', err);
        if (isMounted) setRoundStatus((prev) => prev || 'pending');
      }
    };

    // Always execute the initial state check immediately from DB
    checkState();

    const interval = setInterval(checkState, 3000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [team, isAdminRoute]);

  const handleLoginSuccess = (authenticatedTeam) => {
    setRoundStatus(null);
    setCurrentRoom('bedroom');
    setInRoom5(false);
    setTeam(authenticatedTeam);
  };

  const handleLogout = async () => {
    localStorage.removeItem('ctc_current_room');
    await logoutTeam();
    setTeam(null);
    setRoundStatus(null);
    setCurrentRoom('bedroom');
    setInRoom5(false);
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

  // When Round 1 is live, display Room 1 (Bedroom), Room 2 (Study), or Room 3 (Basement)
  if (roundStatus === 'live' && currentRoundNum === 1) {
    if (currentRoom === 'lobby') {
      return <Lobby team={team} onLogout={handleLogout} />;
    }

    if (currentRoom === 'study') {
      return (
        <Room2Study
          team={team}
          onLogout={handleLogout}
          onTransitionToRoom3={() => changeRoom('basement')}
        />
      );
    }

    if (currentRoom === 'basement') {
      return (
        <Room3Basement
          team={team}
          onLogout={handleLogout}
          onProceedToLobby={() => changeRoom('lobby')}
        />
      );
    }

    return (
      <Room1Bedroom
        team={team}
        onLogout={handleLogout}
        onTransitionToRoom2={() => changeRoom('study')}
      />
    );
  }

  // When Round 2 is live, display Room 4 (The Rotting Archive), Room 5 (The Surveillance Morgue), or Room 6 (The Anointing Vault)
  if (roundStatus === 'live' && currentRoundNum === 2) {
    if (currentRoom === 'vault' && round2VaultUnlocked) {
      return <Room6Vault team={team} onLogout={handleLogout} />;
    }
    if (inRoom5 || currentRoom === 'control') {
      return <Room5Control team={team} onLogout={handleLogout} />;
    }
    return <Room4Records team={team} onLogout={handleLogout} />;
  }

  // Otherwise, player waits in the atmospheric Lobby
  return <Lobby team={team} onLogout={handleLogout} />;
}
