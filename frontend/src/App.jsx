import React, { useState, useEffect } from 'react';
import UserLogin from './userlogin/UserLogin';
import Lobby from './lobby/Lobby';
import AdminLogin from './admin/AdminLogin';
import AdminDashboard from './admin/AdminDashboard';
import Room1Bedroom from './game/Room1Bedroom';
import Room3Basement from './game/Room3Basement';
import Room4Records from './game/Room4Records';
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

  // Direct Room 3 entry points (frontend routing only)
  if (window.location.pathname === '/basement' || window.location.pathname === '/room3') {
    return <Room3Basement team={team} onLogout={handleLogout} />;
  }

  // When Round 1 is live, display Room 1 (Lena's Bedroom)
  if (roundStatus === 'live' && currentRoundNum === 1) {
    return <Room1Bedroom team={team} onLogout={handleLogout} />;
  }

  // When Round 2 is live, display Room 4 (The Rotting Archive)
  if (roundStatus === 'live' && currentRoundNum === 2) {
    return <Room4Records team={team} onLogout={handleLogout} />;
  }

  // Otherwise, player waits in the atmospheric Lobby
  return <Lobby team={team} onLogout={handleLogout} />;
}
