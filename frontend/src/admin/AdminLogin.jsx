import React, { useState } from 'react';
import { Lock, User, AlertCircle, ShieldAlert } from 'lucide-react';

export default function AdminLogin({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) return;

    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail?.message || 'Invalid admin credentials');
      }
      localStorage.setItem('ctc_admin_token', data.token);
      if (onLoginSuccess) {
        onLoginSuccess(data.admin);
      }
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#07060b] text-[#e9e4f5] flex items-center justify-center p-4 selection:bg-[#ff7a1a] selection:text-black font-mono">
      <div className="w-full max-w-md bg-[#0e0c14] border border-[#3a2a55] rounded-xl p-8 relative shadow-2xl purple-glow">
        <div className="text-center mb-6">
          <div className="inline-flex p-3 rounded-full bg-[#1b1429] border border-[#3a2a55] text-[#ff7a1a] mb-3">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-wider text-white">
            ADMIN PORTAL
          </h1>
          <p className="text-xs text-[#8f7bff] mt-1 tracking-widest uppercase">
            Curse the Code &bull; Organiser Gateway
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-lg bg-red-950/40 border border-red-800/60 flex items-center gap-2 text-red-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1.5">
              Admin Username
            </label>
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                disabled={loading}
                className="w-full bg-[#14101e] border border-[#3a2a55] rounded-lg px-3.5 py-2.5 pl-10 text-sm text-white focus:outline-none focus:border-[#ff7a1a] transition-colors"
                required
              />
              <User className="w-4 h-4 text-gray-500 absolute left-3.5 top-3" />
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1.5">
              Admin Password
            </label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
                className="w-full bg-[#14101e] border border-[#3a2a55] rounded-lg px-3.5 py-2.5 pl-10 text-sm text-white focus:outline-none focus:border-[#ff7a1a] transition-colors"
                required
              />
              <Lock className="w-4 h-4 text-gray-500 absolute left-3.5 top-3" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-[#ff7a1a] hover:bg-[#ff8f3d] text-black font-bold py-2.5 px-4 rounded-lg text-sm tracking-wider uppercase transition-colors disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Sign In as Admin'}
          </button>
        </form>
      </div>
    </div>
  );
}
