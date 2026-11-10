import React, { useState, useEffect } from 'react';
import UserLogin from './userlogin/UserLogin';
import Lobby from './lobby/Lobby';
import AdminLogin from './admin/AdminLogin';
import AdminDashboard from './admin/AdminDashboard';
import Room1Bedroom from './game/Room1Bedroom';
import Room4Records from './game/Room4Records';
import Room5Control from './game/Room5Control';
import RE4RoomSwitcher from './game/components/RE4RoomSwitcher';
import { checkAuthStatus, logoutTeam } from './userlogin/authApi';

export default function App() {
  const [isAdminRoute, setIsAdminRoute] = useState(
    typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')
  );
  const [adminUser, setAdminUser] = useState(null);
  const [checkingAdminAuth, setCheckingAdminAuth] = useState(true);

  const [team, setTeam] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [roundStatus, setRoundStatus] = useState(null);
  const [currentRoundNum, setCurrentRoundNum] = useState(1);

  // Active 3D room preview state (defaults to bedroom / r100)
  const [previewRoom, setPreviewRoom] = useState(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search).get('room');
      if (p === '4' || p === 'records') return 'records';
      if (p === '5' || p === 'control') return 'control';
      return 'bedroom';
    }
    return 'bedroom';
  });

  // Listen to popstate or explicit cross-room return requests from Room modals
  useEffect(() => {
    const handleLocationChange = () => {
      setIsAdminRoute(window.location.pathname.startsWith('/admin'));
      const p = new URLSearchParams(window.location.search).get('room');
      if (p === '4' || p === 'records') setPreviewRoom('records');
      else if (p === '5' || p === 'control') setPreviewRoom('control');
      else if (p === '1' || p === 'bedroom') setPreviewRoom('bedroom');
    };
    const handleNavigateRoom = (e) => {
      const nextRoom = e?.detail;
      if (!nextRoom) return;
      setPreviewRoom(nextRoom);
      try {
        const url = new URL(window.location);
        url.searchParams.set('room', nextRoom);
        window.history.pushState({}, '', url);
      } catch {}
    };
    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('ctc:navigate-room', handleNavigateRoom);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('ctc:navigate-room', handleNavigateRoom);
    };
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

  // 3D Resident Evil 4 Horror Simulation Mode
  return (
    <div className="relative w-full h-full min-h-screen bg-black overflow-hidden">
      {/* Resident Evil 4 Debug Room Jump Bar */}
      <RE4RoomSwitcher
        currentRoom={previewRoom}
        onSelectRoom={(r) => {
          setPreviewRoom(r);
          const url = new URL(window.location);
          url.searchParams.set('room', r);
          window.history.pushState({}, '', url);
        }}
      />

      {/* Render Selected 3D Room */}
      {previewRoom === 'bedroom' && (
        <Room1Bedroom team={team || { name: 'Leon S. Kennedy' }} onLogout={handleLogout} />
      )}
      {previewRoom === 'records' && (
        <Room4Records team={team || { name: 'Leon S. Kennedy' }} onLogout={handleLogout} />
      )}
      {previewRoom === 'control' && (
        <Room5Control team={team || { name: 'Leon S. Kennedy' }} onLogout={handleLogout} />
      )}
    </div>
  );
}
