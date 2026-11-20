import React, { useState, useEffect } from 'react';
import UserLogin from './userlogin/UserLogin';
import Lobby from './lobby/Lobby';
import AdminLogin from './admin/AdminLogin';
import AdminDashboard from './admin/AdminDashboard';
import Room1Bedroom from './game/Room1Bedroom';
import Room2Study from './game/Room2Study';
import Room3Basement from './game/Room3Basement';
import Room4Records from './game/Room4Records';
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
  const [currentRoom, setCurrentRoom] = useState(() => {
    return localStorage.getItem('ctc_current_room') || 'bedroom';
  });
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
    const verifyAndNavigateRound2Vault = async () => {
      try {
        const token = localStorage.getItem('ctc_token') || '';
        const headers = token ? { 'x-session-token': token } : {};
        const [recRes, forkRes] = await Promise.all([
          fetch('/api/game/room/records', { credentials: 'include', headers }),
          fetch('/api/game/fork/fork_1/status', { credentials: 'include', headers }),
        ]);
        const recData = recRes.ok ? await recRes.json() : null;
        const forkData = forkRes.ok ? await forkRes.json() : null;
        const r207 = recData?.clues?.find?.((c) => c.id === 'R2-07');
        const unlocked = Boolean(
          (recData?.is_completed || r207?.solved) && forkData?.resolved
        );
        setRound2VaultUnlocked(unlocked);
        if (unlocked) {
          changeRoom('vault');
        }
      } catch {
        setRound2VaultUnlocked(false);
      }
    };

    const handleNavigateRoom = (event) => {
      const target = event?.detail;
      if (target === 'vault') {
        verifyAndNavigateRound2Vault();
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

  // Determine Round 2 backend unlock status for Room 6 (The Anointing Vault)
  useEffect(() => {
    if (!team || isAdminRoute || roundStatus !== 'live' || currentRoundNum !== 2) {
      setRound2VaultUnlocked(false);
      return;
    }
    let cancelled = false;
    const token = localStorage.getItem('ctc_token') || '';
    const headers = token ? { 'x-session-token': token } : {};
    Promise.all([
      fetch('/api/game/room/records', { credentials: 'include', headers }).then((r) => (r.ok ? r.json() : null)),
      fetch('/api/game/fork/fork_1/status', { credentials: 'include', headers }).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([recData, forkData]) => {
        if (cancelled) return;
        const r207 = recData?.clues?.find?.((c) => c.id === 'R2-07');
        const unlocked = Boolean(
          (recData?.is_completed || r207?.solved) && forkData?.resolved
        );
        setRound2VaultUnlocked(unlocked);
      })
      .catch(() => {
        if (!cancelled) setRound2VaultUnlocked(false);
      });
    return () => {
      cancelled = true;
    };
  }, [team, isAdminRoute, roundStatus, currentRoundNum]);
  useEffect(() => {
    if (!team || isAdminRoute) return;
    fetch('/api/game/room/basement', { credentials: 'include' })
      .then((res) => {
        if (res.ok) {
          return res.json().then((data) => {
            if (data.is_completed) {
              setCurrentRoom('lobby');
            } else {
              setCurrentRoom('basement');
            }
          });
        } else {
          return fetch('/api/game/room/study', { credentials: 'include' }).then((r2) => {
            if (r2.ok) {
              setCurrentRoom('study');
            } else {
              setCurrentRoom('bedroom');
            }
          });
        }
      })
      .catch(() => setCurrentRoom('bedroom'));
  }, [team, isAdminRoute]);

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

    // Pause continuous fast polling while actively playing Room 1 or Room 4 to free bandwidth for interactions
    if (roundStatus === 'live' && (currentRoundNum === 1 || currentRoundNum === 2)) return;

    const interval = setInterval(checkState, 3000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [team, isAdminRoute, roundStatus, currentRoundNum]);

  const handleLoginSuccess = (authenticatedTeam) => {
    setRoundStatus(null);
    setCurrentRoom('bedroom');
    setTeam(authenticatedTeam);
  };

  const handleLogout = async () => {
    localStorage.removeItem('ctc_current_room');
    await logoutTeam();
    setTeam(null);
    setRoundStatus(null);
    setCurrentRoom('bedroom');
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

  // Direct Room 3 entry points (frontend routing only)
  if (window.location.pathname === '/basement' || window.location.pathname === '/room3') {
    return <Room3Basement team={team} onLogout={handleLogout} />;
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

  // When Round 2 is live, display Room 4 (The Rotting Archive) or Room 6 (The Anointing Vault)
  // Room 6 only opens once backend confirms R2-07 is solved and Fork 1 is resolved (no direct URL bypass)
  if (roundStatus === 'live' && currentRoundNum === 2) {
    const wantsVault =
      currentRoom === 'vault' ||
      window.location.pathname === '/vault' ||
      window.location.pathname === '/room6';
    if (wantsVault && round2VaultUnlocked) {
      return <Room6Vault team={team} onLogout={handleLogout} />;
    }
    return <Room4Records team={team} onLogout={handleLogout} />;
  }

  // Otherwise, player waits in the atmospheric Lobby
  return <Lobby team={team} onLogout={handleLogout} />;
}
