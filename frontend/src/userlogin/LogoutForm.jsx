import React, { useState } from 'react';
import { Eye, EyeOff, Loader2, LogOut, ShieldAlert } from 'lucide-react';

export default function LogoutForm({
  teamName,
  setTeamName,
  password,
  setPassword,
  onSubmit,
  loading,
  error,
}) {
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!loading) {
      onSubmit();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-start gap-2.5 p-3 bg-[#1e152d]/60 border border-[#8f7bff]/30 rounded text-xs text-[#b8a7db] leading-relaxed">
        <ShieldAlert className="w-5 h-5 text-[#8f7bff] shrink-0 mt-0.5" />
        <p>
          Signs this team out everywhere. Your progress and timer are not affected.
          Re-enter your team credentials to release all active device locks.
        </p>
      </div>

      {/* Input 1: Team Name */}
      <div>
        <label className="block text-xs uppercase tracking-wider text-[#8f7bff] mb-1 font-mono">
          Team Name
        </label>
        <input
          type="text"
          required
          maxLength={40}
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
          placeholder="e.g. Shadow Hackers"
          disabled={loading}
          className="w-full bg-[#130f1e] border border-[#3a2a55] rounded px-3 py-2.5 text-[#e9e4f5] placeholder-[#574972] focus:outline-none focus:border-[#ff5a5a] focus:ring-1 focus:ring-[#ff5a5a] font-mono text-sm transition-all"
        />
      </div>

      {/* Input 2: Password */}
      <div>
        <label className="block text-xs uppercase tracking-wider text-[#8f7bff] mb-1 font-mono">
          Team Password
        </label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            required
            maxLength={100}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••••"
            disabled={loading}
            className="w-full bg-[#130f1e] border border-[#3a2a55] rounded px-3 py-2.5 text-[#e9e4f5] placeholder-[#574972] focus:outline-none focus:border-[#ff5a5a] focus:ring-1 focus:ring-[#ff5a5a] font-mono text-sm pr-10 transition-all"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-2.5 top-2.5 text-[#735d97] hover:text-[#e9e4f5] transition-colors focus:outline-none"
            title={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-950/40 border border-red-800/60 rounded text-red-400 text-xs font-mono leading-relaxed">
          {error}
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full mt-2 py-3 px-4 bg-[#b91c1c] hover:bg-[#dc2626] active:bg-[#991b1b] text-white font-bold font-elite tracking-wider text-base rounded shadow-lg shadow-red-950/40 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>REVOKING SESSIONS...</span>
          </>
        ) : (
          <>
            <LogOut className="w-4 h-4" />
            <span>LOG OUT THIS TEAM</span>
          </>
        )}
      </button>
    </form>
  );
}
