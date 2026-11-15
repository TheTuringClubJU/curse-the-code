import React, { useEffect, useMemo, useState } from 'react';
import { ShieldCheck, AlertTriangle, BookOpen, Cpu, Sparkles, KeyRound } from 'lucide-react';
import '../../vault.css';

function extractRecoveredTokens(vaultClues = []) {
  const tokens = { steps: '', code: '', badge: '' };
  for (const c of vaultClues || []) {
    const rev = c?.revealed_data || c?.reveal || c?.data;
    if (!rev || typeof rev !== 'object') continue;
    if (rev.clean_steps_code && !tokens.steps) tokens.steps = String(rev.clean_steps_code);
    else if (rev.clean_steps && !tokens.steps) tokens.steps = String(rev.clean_steps);
    if (rev.authorization_code && !tokens.code) tokens.code = String(rev.authorization_code);
    else if (rev.auth_code && !tokens.code) tokens.code = String(rev.auth_code);
    else if (rev.code && !tokens.code && String(rev.code) !== tokens.steps) tokens.code = String(rev.code);
    if (rev.operator_badge && !tokens.badge) tokens.badge = String(rev.operator_badge);
    else if (rev.badge && !tokens.badge) tokens.badge = String(rev.badge);
  }
  return tokens;
}

export default function CentralConsoleModal({
  isOpen,
  onClose,
  clue,
  vaultClues = [],
  onSubmit,
  onOpenDossier,
  onKeystroke,
  onReject,
  onVictory,
  onLogout,
  isSubmitting = false,
}) {
  const [steps, setSteps] = useState('');
  const [code, setCode] = useState('');
  const [badge, setBadge] = useState('');
  const [phase, setPhase] = useState('idle'); // 'idle' | 'pending' | 'rejected' | 'restored'
  const [errorMsg, setErrorMsg] = useState('');
  const [victoryLines, setVictoryLines] = useState([]);
  const [attemptsRemaining, setAttemptsRemaining] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    if (clue?.solved) {
      setPhase('restored');
      if (clue?.story_text) {
        setVictoryLines(
          String(clue.story_text)
            .split(/\n+/)
            .map((l) => l.trim())
            .filter(Boolean)
        );
      }
    } else if (phase === 'rejected') {
      setPhase('idle');
      setErrorMsg('');
    }
    if (typeof clue?.attempts_remaining === 'number') {
      setAttemptsRemaining(clue.attempts_remaining);
    } else if (typeof clue?.remaining_attempts === 'number') {
      setAttemptsRemaining(clue.remaining_attempts);
    }
  }, [isOpen, clue]);

  const recovered = useMemo(() => extractRecoveredTokens(vaultClues), [vaultClues]);

  if (!isOpen) return null;

  const isLocked = Boolean(clue?.locked);
  const isExhausted = attemptsRemaining === 0 && !clue?.solved;
  const clueId = clue?.id || clue?.clue_id || 'R2-10';
  const r08Solved = Boolean((vaultClues || []).find((c) => (c.id || c.clue_id) === 'R2-08')?.solved);
  const r09Solved = Boolean((vaultClues || []).find((c) => (c.id || c.clue_id) === 'R2-09')?.solved);
  const hasRecoveredTokens = Boolean(recovered.steps || recovered.code || recovered.badge);

  const applyRecoveredTokens = () => {
    onKeystroke?.();
    if (recovered.steps) setSteps(recovered.steps);
    if (recovered.code) setCode(recovered.code);
    if (recovered.badge) setBadge(recovered.badge);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting || isExhausted || isLocked || !onSubmit) return;
    if (!steps.trim() || !code.trim() || !badge.trim()) return;

    setPhase('pending');
    setErrorMsg('');
    try {
      const res = await onSubmit(clueId, {
        steps: steps.trim(),
        code: code.trim(),
        badge: badge.trim(),
      });

      if (typeof res?.attempts_remaining === 'number') {
        setAttemptsRemaining(res.attempts_remaining);
      }

      if (res?.correct) {
        const lines = String(res.story_text || '')
          .split(/\n+/)
          .map((line) => line.trim())
          .filter(Boolean);
        setVictoryLines(lines);
        setPhase('restored');
        onVictory?.(res);
      } else {
        setPhase('rejected');
        setErrorMsg(
          res?.message ||
            res?.detail ||
            res?.feedback ||
            'Anointing protocol mismatch. Verify clean manual indices and dossier fragments.'
        );
        onReject?.(res);
      }
    } catch (err) {
      setPhase('rejected');
      setErrorMsg(err?.message || 'Substation containment telemetry interrupted.');
      onReject?.({ error: err?.message });
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto transition-colors duration-700 ${
        phase === 'restored' ? 'vault-monolith-restored' : 'vault-monolith-backdrop'
      }`}
      role="dialog"
      aria-modal="true"
      aria-label="Central Containment Console R2-10"
    >
      <div
        className={`relative w-full max-w-3xl rounded-[2px] overflow-hidden my-auto border border-l-2 shadow-2xl backdrop-blur-xl ${
          phase === 'rejected' ? 'vault-scan-tear' : ''
        }`}
        style={{
          background:
            phase === 'restored'
              ? 'rgba(18, 15, 11, 0.86)'
              : 'rgba(12, 13, 18, 0.86)',
          borderColor:
            phase === 'restored'
              ? 'rgba(235, 193, 108, 0.52)'
              : phase === 'rejected'
              ? 'rgba(216, 54, 62, 0.65)'
              : 'rgba(196, 152, 86, 0.34)',
          boxShadow:
            phase === 'restored'
              ? '0 28px 90px rgba(0, 0, 0, 0.84)'
              : '0 28px 90px rgba(0, 0, 0, 0.88)',
        }}
      >
        {/* Top Crimson / Gold Containment Accent Bar (Solid, Zero Gradients) */}
        <div
          className="h-1 w-full"
          style={{
            background: phase === 'restored' ? '#e4b862' : '#961c22',
          }}
        />

        {/* Monolith Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-slate-700/50 bg-[#0b0e15]">
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-[2px] border flex items-center justify-center ${
                phase === 'restored'
                  ? 'border-emerald-400/50 bg-emerald-950/40 text-emerald-300'
                  : isLocked
                  ? 'border-red-500/60 bg-red-950/60 text-red-300'
                  : 'border-red-500/45 bg-red-950/35 text-red-200'
              }`}
            >
              {phase === 'restored' ? (
                <ShieldCheck className="w-4.5 h-4.5" />
              ) : isLocked ? (
                <KeyRound className="w-4.5 h-4.5" />
              ) : (
                <Cpu className="w-4.5 h-4.5" />
              )}
            </div>
            <div>
              <div className="vault-font-mono text-[10px] tracking-[0.26em] uppercase text-slate-400">
                SUBSTATION DELTA // ANOINTING ALTAR
              </div>
              <h2 className="vault-font-serif text-xl sm:text-2xl font-semibold tracking-wider text-[#f5f3ee] uppercase">
                {clue?.title || 'Central Containment Console'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {onOpenDossier && !isLocked && phase !== 'restored' && (
              <button
                type="button"
                onClick={onOpenDossier}
                className="re-plate inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[10px] vault-font-mono tracking-[0.16em] uppercase cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>DOSSIER</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="re-plate px-4 py-1.5 text-[10px] vault-font-mono tracking-[0.18em] uppercase cursor-pointer"
            >
              CLOSE [ESC]
            </button>
          </div>
        </div>

        {/* Monolith Body */}
        <div className="p-6 sm:p-8 flex flex-col items-center">
          {isLocked ? (
            <div className="w-full max-w-xl text-center space-y-6 py-3">
              {/* Bespoke Cast-Iron Twin Solenoid Interlock Chamber Graphic */}
              <div className="mx-auto w-full max-w-md rounded-[2px] border border-[#7c5628]/45 bg-[#120b09]/90 p-4 shadow-inner">
                <svg viewBox="0 0 360 76" className="w-full h-16" aria-hidden="true">
                  <line x1="28" y1="38" x2="148" y2="38" stroke={r08Solved ? '#34d399' : '#b91c1c'} strokeWidth="4" />
                  <line x1="212" y1="38" x2="332" y2="38" stroke={r09Solved ? '#34d399' : '#b91c1c'} strokeWidth="4" />
                  <rect x="20" y="20" width="66" height="36" rx="2" fill="#1b1410" stroke={r08Solved ? '#34d399' : '#9f6b32'} strokeWidth="2" />
                  <text x="53" y="42" textAnchor="middle" fill={r08Solved ? '#a7f3d0' : '#f3d28f'} fontSize="11" fontFamily="monospace" fontWeight="bold">6C R2-08</text>
                  <circle cx="180" cy="38" r="22" fill="#211011" stroke="#b98a44" strokeWidth="2.5" />
                  <circle cx="180" cy="38" r="10" fill={r08Solved && r09Solved ? '#34d399' : '#991b1b'} />
                  <rect x="274" y="20" width="66" height="36" rx="2" fill="#1b1410" stroke={r09Solved ? '#34d399' : '#9f6b32'} strokeWidth="2" />
                  <text x="307" y="42" textAnchor="middle" fill={r09Solved ? '#a7f3d0' : '#f3d28f'} fontSize="11" fontFamily="monospace" fontWeight="bold">6D R2-09</text>
                </svg>
                <div className="mt-1 inline-flex items-center gap-2 px-4 py-1 rounded-[2px] border border-[#962228]/65 bg-[#2a0c0f]/80 text-[#f1979b] vault-font-mono text-xs tracking-[0.2em] uppercase">
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>CENTRAL CONSOLE INTERLOCKED (R2-10)</span>
                </div>
              </div>

              <p className="vault-font-serif italic text-base sm:text-lg text-[#d9ccb4] leading-relaxed">
                Twin mechanical solenoids hold the altar guillotine shut. Clear the tampered Containment Manual in the West Scriptorium (6C) and trace the East Switchgear relay code (6D) before invoking final anointing containment.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                <div className={`p-3.5 rounded-[2px] border ${r08Solved ? 'border-emerald-500/45 bg-emerald-950/30' : 'border-amber-800/35 bg-[#150e0b]/90'}`}>
                  <div className="flex items-center justify-between vault-font-mono text-[10px] tracking-[0.18em]">
                    <span className="text-[#c7995e]">CHANNEL I · R2-08</span>
                    <span className={r08Solved ? 'text-emerald-300 font-bold' : 'text-red-300'}>
                      {r08Solved ? 'CLEARED' : 'LATCHED'}
                    </span>
                  </div>
                  <div className="vault-font-serif text-sm text-[#e8decb] mt-1">
                    6C West Scriptorium Manual Diff
                  </div>
                </div>
                <div className={`p-3.5 rounded-[2px] border ${r09Solved ? 'border-emerald-500/45 bg-emerald-950/30' : 'border-amber-800/35 bg-[#150e0b]/90'}`}>
                  <div className="flex items-center justify-between vault-font-mono text-[10px] tracking-[0.18em]">
                    <span className="text-[#c7995e]">CHANNEL II · R2-09</span>
                    <span className={r09Solved ? 'text-emerald-300 font-bold' : 'text-red-300'}>
                      {r09Solved ? 'CLEARED' : 'LATCHED'}
                    </span>
                  </div>
                  <div className="vault-font-serif text-sm text-[#e8decb] mt-1">
                    6D East Switchgear Logic Matrix
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                {onOpenDossier && (
                  <button
                    type="button"
                    onClick={onOpenDossier}
                    className="re-plate px-5 py-2.5 text-xs vault-font-mono tracking-[0.18em] uppercase cursor-pointer"
                  >
                    OPEN CASE DOSSIER
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-[2px] border border-white/15 bg-black/40 hover:bg-white/5 text-[#cfc2ac] text-xs vault-font-mono tracking-[0.18em] uppercase cursor-pointer transition"
                >
                  RETURN TO VAULT
                </button>
              </div>
            </div>
          ) : phase === 'restored' ? (
            <div className="w-full max-w-2xl space-y-5 text-center py-3">
              <div className="flex flex-col items-center gap-2">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-[2px] border border-emerald-400/55 bg-emerald-950/60 text-emerald-200 vault-font-mono text-xs font-bold tracking-[0.22em] uppercase">
                  <ShieldCheck className="w-4 h-4" />
                  <span>CONTAINMENT RESTORED</span>
                </div>
                <div className="vault-font-mono text-[11px] tracking-[0.22em] uppercase text-[#e4b862] font-semibold">
                  ROUND 2 CLEARED · TEST ROOM 6 COMPLETE
                </div>
              </div>

              <div className="p-6 rounded-[2px] border border-[#e4b862]/30 bg-black/45 text-left space-y-3">
                {victoryLines.length > 0 ? (
                  victoryLines.map((line, idx) => (
                    <p
                      key={idx}
                      className="vault-font-serif text-base sm:text-lg text-[#f2e4c7] leading-relaxed"
                    >
                      {line}
                    </p>
                  ))
                ) : (
                  <p className="vault-font-serif text-base sm:text-lg text-[#f2e4c7] leading-relaxed">
                    The wrought-iron containment cage drops into the crimson pit. Warm lamps ignite beneath the cathedral ribs as Substation Delta seals cleanly.
                  </p>
                )}
              </div>

              <p className="vault-font-mono text-[11px] text-slate-300 tracking-wide">
                Containment telemetry submitted. Explore the calmed Vault or finish your operative session below.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="re-plate px-6 py-2.5 text-xs vault-font-mono tracking-[0.18em] uppercase cursor-pointer"
                >
                  WITNESS CONTAINMENT [ESC]
                </button>
                {onLogout && (
                  <button
                    type="button"
                    onClick={onLogout}
                    className="inline-flex items-center gap-2 rounded-[2px] border border-emerald-400/50 bg-emerald-950/65 hover:bg-emerald-900/75 px-6 py-2.5 text-xs vault-font-mono font-bold tracking-[0.18em] uppercase text-emerald-100 transition cursor-pointer"
                  >
                    FINISH &amp; LOG OUT
                  </button>
                )}
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="w-full max-w-2xl space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                <div>
                  <div className="vault-font-mono text-xs font-bold tracking-[0.22em] text-[#ecd097] uppercase">
                    ENTER CONTAINMENT CODE
                  </div>
                  <p className="vault-font-serif italic text-sm text-[#bca98c] mt-0.5">
                    Open Case Dossier [C] to copy Clean Protocol Steps (from 6C) & Operator Badge, plus the 4-bit Authorization Code (from 6D).
                  </p>
                </div>

                {typeof attemptsRemaining === 'number' && (
                  <span className="vault-font-mono text-[10px] px-3 py-1 rounded-[2px] border border-[#962228]/50 bg-[#2a0c0f]/60 text-[#edb1b4] uppercase tracking-[0.14em]">
                    ATTEMPTS LEFT: {attemptsRemaining}
                  </span>
                )}
              </div>

              {phase === 'rejected' && (
                <div
                  role="alert"
                  className="p-3.5 rounded-[2px] border border-[#c9343b]/70 bg-[#2e0b0e]/85 text-[#f7c5c7] flex items-start gap-3"
                >
                  <AlertTriangle className="w-4 h-4 text-[#ef686e] shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <div className="vault-font-mono text-xs font-bold tracking-[0.2em] uppercase text-[#ff8d92]">
                      CONTAINMENT REJECTED
                    </div>
                    <div className="vault-font-serif text-sm text-[#ecd3d4]">
                      {errorMsg}
                    </div>
                  </div>
                </div>
              )}

              {hasRecoveredTokens && (
                <div className="p-3.5 rounded-[2px] border border-[#d6aa63]/35 bg-[#1b120d]/90 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs vault-font-mono text-[#ecd6ac] space-y-0.5">
                    <div className="text-[10px] tracking-[0.16em] uppercase text-[#c7995e]">
                      Recovered Seals Ready From Dossier
                    </div>
                    <div className="flex flex-wrap gap-3 text-[11px]">
                      {recovered.steps && <span>Steps: <strong className="text-[#fde68a]">{recovered.steps}</strong></span>}
                      {recovered.code && <span>Code: <strong className="text-[#fde68a]">{recovered.code}</strong></span>}
                      {recovered.badge && <span>Badge: <strong className="text-[#fde68a]">{recovered.badge}</strong></span>}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={applyRecoveredTokens}
                    className="re-plate inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[10px] vault-font-mono tracking-[0.14em] uppercase cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#f5d07a]" />
                    <span>Fill Recovered Keys</span>
                  </button>
                </div>
              )}

              <div className="space-y-3.5">
                {/* Bay 1 */}
                <div className="p-3.5 rounded-[2px] border border-[#c49856]/25 bg-[#0a0809] flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 shadow-inner">
                  <label
                    htmlFor="vault-console-steps"
                    className="sm:w-56 vault-font-mono text-[11px] tracking-[0.16em] text-[#d6b376] uppercase shrink-0"
                  >
                    01 // CLEAN PROTOCOL STEPS
                  </label>
                  <input
                    id="vault-console-steps"
                    type="text"
                    value={steps}
                    onChange={(e) => {
                      onKeystroke?.();
                      setSteps(e.target.value);
                    }}
                    disabled={isSubmitting || isExhausted}
                    placeholder="e.g. 1, 2, 4, 6"
                    aria-label="Clean protocol steps"
                    className="flex-1 bg-black/90 border border-white/15 focus:border-[#d8b26e] outline-none px-4 py-2 vault-font-mono text-sm tracking-[0.16em] text-[#f3e5c7] rounded-[2px]"
                  />
                </div>

                {/* Bay 2 */}
                <div className="p-3.5 rounded-[2px] border border-[#c49856]/25 bg-[#0a0809] flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 shadow-inner">
                  <label
                    htmlFor="vault-console-code"
                    className="sm:w-56 vault-font-mono text-[11px] tracking-[0.16em] text-[#d6b376] uppercase shrink-0"
                  >
                    02 // AUTHORIZATION CODE
                  </label>
                  <input
                    id="vault-console-code"
                    type="text"
                    value={code}
                    onChange={(e) => {
                      onKeystroke?.();
                      setCode(e.target.value);
                    }}
                    disabled={isSubmitting || isExhausted}
                    placeholder="________"
                    aria-label="Authorization code"
                    className="flex-1 bg-black/90 border border-white/15 focus:border-[#d8b26e] outline-none px-4 py-2 vault-font-mono text-sm tracking-[0.2em] text-[#f3e5c7] rounded-[2px]"
                  />
                </div>

                {/* Bay 3 */}
                <div className="p-3.5 rounded-[2px] border border-[#c49856]/25 bg-[#0a0809] flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 shadow-inner">
                  <label
                    htmlFor="vault-console-badge"
                    className="sm:w-56 vault-font-mono text-[11px] tracking-[0.16em] text-[#d6b376] uppercase shrink-0"
                  >
                    03 // OPERATOR BADGE
                  </label>
                  <input
                    id="vault-console-badge"
                    type="text"
                    value={badge}
                    onChange={(e) => {
                      onKeystroke?.();
                      setBadge(e.target.value);
                    }}
                    disabled={isSubmitting || isExhausted}
                    placeholder="_________"
                    aria-label="Operator badge"
                    className="flex-1 bg-black/90 border border-white/15 focus:border-[#d8b26e] outline-none px-4 py-2 vault-font-mono text-sm tracking-[0.2em] text-[#f3e5c7] uppercase rounded-[2px]"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <span className="vault-font-mono text-[10px] tracking-[0.14em] text-[#7a6f5e] uppercase">
                  DO NOT SPEAK THE LITANY ALOUD NEAR R2-10
                </span>

                <button
                  type="submit"
                  disabled={
                    isSubmitting ||
                    isExhausted ||
                    !steps.trim() ||
                    !code.trim() ||
                    !badge.trim()
                  }
                  className="re-plate re-plate-amber !px-6 !py-2.5 font-bold tracking-[0.22em] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isExhausted
                    ? 'ATTEMPTS EXHAUSTED'
                    : isSubmitting
                    ? 'AUTHENTICATING...'
                    : 'EXECUTE CONTAINMENT'}
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="px-6 py-2.5 border-t border-white/5 bg-black/60 text-center vault-font-mono text-[10px] text-[#6d6253] tracking-[0.22em] uppercase">
          SUBSTATION DELTA // ANOINTING VAULT TERMINAL
        </div>
      </div>
    </div>
  );
}
