import React, { useState } from 'react';
import { Eye, EyeOff, Loader2, Sparkles } from 'lucide-react';

export default function SignInForm({
  teamName,
  setTeamName,
  password,
  setPassword,
  onSubmit,
  loading,
  error,
  sessionLimitNotice,
  onSwitchToLogoutAll,
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
      {/* Input 1: Team Name */}
      <div>
        <label className="block text-xs uppercase tracking-wider text-[#8f7bff] mb-1 font-mono">
          Team Name
        </label>
        <div className="relative">
          <input
            type="text"
            required
            autoFocus
            maxLength={40}
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder="e.g. Shadow Hackers"
            disabled={loading}
            className="w-full bg-[#130f1e] border border-[#3a2a55] rounded px-3 py-2.5 text-[#e9e4f5] placeholder-[#574972] focus:outline-none focus:border-[#ff7a1a] focus:ring-1 focus:ring-[#ff7a1a] font-mono text-sm transition-all"
          />
        </div>
      </div>

      {/* Input 2: Password */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-xs uppercase tracking-wider text-[#8f7bff] font-mono">
            Password
          </label>
        </div>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            required
            maxLength={100}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••••"
            disabled={loading}
            className="w-full bg-[#130f1e] border border-[#3a2a55] rounded px-3 py-2.5 text-[#e9e4f5] placeholder-[#574972] focus:outline-none focus:border-[#ff7a1a] focus:ring-1 focus:ring-[#ff7a1a] font-mono text-sm pr-10 transition-all"
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

      {/* Error Message Display */}
      {error && (
        <div className="p-3 bg-red-950/40 border border-red-800/60 rounded text-red-400 text-xs font-mono leading-relaxed">
          {error}
        </div>
      )}

      {/* Session Limit Banner (BE-11 / FE-24) */}
      {sessionLimitNotice && (
        <div className="p-3 bg-[#241324] border border-[#ff5a5a]/60 rounded text-xs space-y-2 font-mono">
          <p className="text-[#ff9d9d] font-semibold">
            {sessionLimitNotice.message}
          </p>
          {sessionLimitNotice.devices && sessionLimitNotice.devices.length > 0 && (
            <ul className="list-disc list-inside text-gray-300 text-[11px] space-y-0.5">
              {sessionLimitNotice.devices.map((dev, i) => (
                <li key={i}>{dev}</li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={onSwitchToLogoutAll}
            className="w-full mt-2 py-1.5 px-3 bg-[#3f1931] hover:bg-[#581c3c] border border-[#ff7a1a]/60 rounded text-[#ffaa55] text-xs font-mono transition-all font-bold"
          >
            Log out this team everywhere &rarr;
          </button>
        </div>
      )}

      {/* Primary Action Button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full mt-2 py-3 px-4 bg-[#ff7a1a] hover:bg-[#ff8e38] active:bg-[#e0660e] text-[#07060b] font-bold font-elite tracking-wider text-base rounded shadow-lg shadow-[#ff7a1a]/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>VERIFYING RITUAL...</span>
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 transition-transform group-hover:scale-125" />
            <span>ENTER THE HOUSE</span>
          </>
        )}
      </button>
    </form>
  );
}
