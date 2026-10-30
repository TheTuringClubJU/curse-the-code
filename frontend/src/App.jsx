import React, { useState, useEffect } from 'react';
import UserLogin from './userlogin/UserLogin';
import Lobby from './lobby/Lobby';
import { checkAuthStatus, logoutTeam } from './userlogin/authApi';

export default function App() {
  const [team, setTeam] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    checkAuthStatus()
      .then(res => {
        if (res && res.ok && res.team) {
          setTeam(res.team);
        }
      })
      .finally(() => setCheckingAuth(false));
  }, []);

  const handleLoginSuccess = (authenticatedTeam) => {
    setTeam(authenticatedTeam);
  };

  const handleLogout = async () => {
    await logoutTeam();
    setTeam(null);
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen w-full bg-[#07060b] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#ff7a1a] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen">
      {team ? (
        <Lobby team={team} onLogout={handleLogout} />
      ) : (
        <UserLogin onLoginSuccess={handleLoginSuccess} />
      )}
    </div>
  );
}
