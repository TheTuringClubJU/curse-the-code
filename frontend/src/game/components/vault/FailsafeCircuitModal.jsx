import React, { useMemo, useState } from 'react';
import { Cpu, X, AlertTriangle, CheckCircle2, Zap, HelpCircle } from 'lucide-react';

function evaluateCircuit(circuit, inputState) {
  const values = { ...inputState };
  const gates = circuit?.gates || [];
  for (let pass = 0; pass < gates.length + 1; pass++) {
    let changed = false;
    for (const gate of gates) {
      const ins = (gate.in || []).map((id) => (values[id] ? 1 : 0));
      let out = 0;
      const type = String(gate.type || '').toUpperCase();
      if (type === 'NOT') out = ins[0] ? 0 : 1;
      else if (type === 'AND') out = ins.every((v) => v === 1) ? 1 : 0;
      else if (type === 'OR') out = ins.some((v) => v === 1) ? 1 : 0;
      else if (type === 'NAND') out = ins.every((v) => v === 1) ? 0 : 1;
      else if (type === 'NOR') out = ins.some((v) => v === 1) ? 0 : 1;
      else if (type === 'XOR') out = ins.reduce((a, b) => a ^ b, 0);
      if (values[gate.id] !== out) {
        values[gate.id] = out;
        changed = true;
      }
    }
    if (!changed) break;
  }
  const outputs = (circuit?.outputs || []).map((id) => (values[id] ? 1 : 0));
  return { values, outputs, code: outputs.join('') };
}

function buildSchematicLayout(circuit, inputNames) {
  const gates = circuit?.gates || [];
  const outputs = circuit?.outputs || [];
  const depth = {};
  inputNames.forEach((id) => {
    depth[id] = 0;
  });

  for (let p = 0; p < gates.length + 2; p++) {
    for (const g of gates) {
      const maxIn = Math.max(0, ...(g.in || []).map((src) => depth[src] ?? 0));
      depth[g.id] = maxIn + 1;
    }
  }

  const maxDepth = Math.max(1, ...gates.map((g) => depth[g.id] ?? 1));
  const outDepth = maxDepth + 1;

  const width = 760;
  const height = Math.max(250, Math.max(inputNames.length, outputs.length) * 32 + 28);
  const colX = (d) => 56 + (d / outDepth) * (width - 130);

  const nodes = {};
  const inputStep = (height - 34) / Math.max(1, inputNames.length);
  inputNames.forEach((id, i) => {
    nodes[id] = { id, x: colX(0), y: 26 + i * inputStep + inputStep * 0.35, kind: 'input' };
  });

  for (let d = 1; d <= maxDepth; d++) {
    const colGates = gates.filter((g) => (depth[g.id] ?? 1) === d);
    colGates.sort((a, b) => {
      const ya = ((a.in || []).reduce((s, k) => s + (nodes[k]?.y ?? height / 2), 0)) / Math.max(1, (a.in || []).length);
      const yb = ((b.in || []).reduce((s, k) => s + (nodes[k]?.y ?? height / 2), 0)) / Math.max(1, (b.in || []).length);
      return ya - yb;
    });
    const stepY = (height - 32) / Math.max(1, colGates.length);
    colGates.forEach((g, idx) => {
      nodes[g.id] = {
        id: g.id,
        type: String(g.type || 'AND').toUpperCase(),
        in: g.in || [],
        x: colX(d),
        y: 24 + idx * stepY + stepY * 0.45,
        kind: 'gate',
      };
    });
  }

  const outNodes = outputs.map((srcId, i) => {
    const stepY = (height - 40) / Math.max(1, outputs.length);
    return {
      id: `LAMP ${i + 1}`,
      srcId,
      x: width - 48,
      y: 34 + i * stepY + stepY * 0.35,
    };
  });

  return { width, height, nodes, outNodes, gates };
}

function GateSymbol({ type, x, y, active }) {
  const fill = active ? '#fbe5b2' : '#d5c7a9';
  const stroke = active ? '#b45309' : '#3a3024';
  const t = String(type || 'AND').toUpperCase();

  if (t === 'NOT') {
    return (
      <g>
        <polygon points={`${x - 16},${y - 11} ${x + 11},${y} ${x - 16},${y + 11}`} fill={fill} stroke={stroke} strokeWidth="2" />
        <circle cx={x + 15} cy={y} r="3.5" fill={fill} stroke={stroke} strokeWidth="1.8" />
      </g>
    );
  }
  if (t === 'OR' || t === 'NOR' || t === 'XOR') {
    const hasBubble = t === 'NOR';
    return (
      <g>
        {t === 'XOR' && (
          <path d={`M ${x - 22} ${y - 12} Q ${x - 15} ${y} ${x - 22} ${y + 12}`} fill="none" stroke={stroke} strokeWidth="2" />
        )}
        <path
          d={`M ${x - 16} ${y - 12} Q ${x - 9} ${y} ${x - 16} ${y + 12} Q ${x + 5} ${y + 12} ${x + 16} ${y} Q ${x + 5} ${y - 12} ${x - 16} ${y - 12} Z`}
          fill={fill}
          stroke={stroke}
          strokeWidth="2"
        />
        {hasBubble && <circle cx={x + 19} cy={y} r="3.5" fill={fill} stroke={stroke} strokeWidth="1.8" />}
      </g>
    );
  }
  // AND / NAND
  const hasBubble = t === 'NAND';
  return (
    <g>
      <path
        d={`M ${x - 16} ${y - 12} L ${x} ${y - 12} A 14 12 0 0 1 ${x} ${y + 12} L ${x - 16} ${y + 12} Z`}
        fill={fill}
        stroke={stroke}
        strokeWidth="2"
      />
      {hasBubble && <circle cx={x + 18} cy={y} r="3.5" fill={fill} stroke={stroke} strokeWidth="1.8" />}
    </g>
  );
}

export default function FailsafeCircuitModal({
  isOpen,
  onClose,
  clue,
  onSubmit,
  onSwitchClang,
  isSubmitting = false,
}) {
  const circuit = clue?.payload?.circuit || { inputs: [], gates: [], outputs: [] };
  const inputNames = circuit.inputs?.length
    ? circuit.inputs
    : ['A1', 'A0', 'B1', 'B0', 'C1', 'C0', 'D1', 'D0'];

  const [switches, setSwitches] = useState(() =>
    Object.fromEntries(inputNames.map((n) => [n, 0]))
  );
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [showTruthTable, setShowTruthTable] = useState(false);

  const evalResult = useMemo(
    () => evaluateCircuit(circuit, switches),
    [circuit, switches]
  );

  const layout = useMemo(
    () => buildSchematicLayout(circuit, inputNames),
    [circuit, inputNames]
  );

  if (!isOpen || !clue) return null;

  const stage = clue.stages?.[0] || {};
  const attemptsLeft = Math.max(0, (clue.attempts_max ?? 3) - (clue.attempts ?? 0));
  const isExhausted = !clue.solved && attemptsLeft <= 0;

  const toggleSwitch = (name) => {
    onSwitchClang?.();
    setSwitches((prev) => ({
      ...prev,
      [name]: prev[name] ? 0 : 1,
    }));
  };

  const applyLampCode = () => {
    setAnswer(evalResult.code);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const candidate = (answer || evalResult.code).trim();
    if (!candidate || isSubmitting || clue.solved || isExhausted) return;
    const res = await onSubmit(clue.id, candidate);
    setFeedback(res);
  };

  const pairs = [];
  for (let i = 0; i < inputNames.length; i += 2) {
    pairs.push(inputNames.slice(i, i + 2));
  }

  return (
    <div className="vault-desk-surface select-none" onClick={onClose}>
      <div
        className="vault-copper-housing relative w-full max-w-5xl max-h-[93vh] flex flex-col rounded-[2px] overflow-hidden text-[#efe3cf]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Corner brass hex bolts */}
        <span className="absolute top-2.5 left-2.5 w-2 h-2 rounded-[1px] bg-[#926e37] border border-black/80 pointer-events-none" />
        <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-[1px] bg-[#926e37] border border-black/80 pointer-events-none" />
        <span className="absolute bottom-2.5 left-2.5 w-2 h-2 rounded-[1px] bg-[#926e37] border border-black/80 pointer-events-none" />
        <span className="absolute bottom-2.5 right-2.5 w-2 h-2 rounded-[1px] bg-[#926e37] border border-black/80 pointer-events-none" />

        {/* Engraved Switchgear Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3.5 bg-[#0b0d13] border-b border-slate-700/60">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-[2px] border border-red-500/55 bg-red-950/40 flex items-center justify-center">
              <Cpu className="w-4 h-4 text-red-400" />
            </div>
            <div>
              <h2 className="font-re-display text-sm sm:text-base font-bold tracking-[0.14em] text-[#f5f3ee] uppercase">
                {clue.title || 'Failsafe Logic Panel'} ({clue.id})
              </h2>
              <p className="font-re-typewriter text-[11px] text-slate-300">{clue.scene_text}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowTruthTable((v) => !v)}
              className="re-plate !py-1.5 !px-3 text-[11px] cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5 text-red-400" />
              <span>{showTruthTable ? 'Hide Gate Table' : 'Logic Gate Table'}</span>
            </button>
            <span className="re-plate !py-1.5 !px-3 cursor-default">
              <span className="text-[10px] uppercase tracking-wider text-slate-400">Attempts</span>
              <span className="font-mono text-red-200">
                {clue.attempts ?? 0}/{clue.attempts_max ?? 3}
              </span>
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Failsafe Panel"
              className="re-plate !py-1.5 !px-3.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Close [ESC]</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {showTruthTable && (
            <div className="p-3.5 rounded-[2px] bg-[#16100b] border border-[#b4843d]/45 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-[11px] font-re-typewriter">
              {[
                ['AND', '1 only if ALL inputs = 1'],
                ['OR', '1 if ANY input = 1'],
                ['XOR', '1 if inputs DIFFER (odd 1s)'],
                ['NAND', '0 only if ALL inputs = 1'],
                ['NOR', '1 only if ALL inputs = 0'],
                ['NOT', 'Inverts single input (0↔1)'],
              ].map(([gName, desc]) => (
                <div key={gName} className="p-2 rounded-[2px] bg-black/45 border border-[#5c4121]">
                  <div className="font-bold text-[#fbbf24] tracking-wider">{gName}</div>
                  <div className="text-[10px] text-[#d6be92] mt-0.5 leading-snug">{desc}</div>
                </div>
              ))}
            </div>
          )}
          {/* Brass Engraved Legend Plate + Step-by-Step Guide */}
          <div className="px-4 py-3 rounded-[2px] bg-[#21170e] border border-[#926933]/70 font-re-typewriter text-xs text-[#ebd4aa] space-y-1.5">
            {clue.payload?.panel_note && (
              <div className="flex items-start gap-2.5">
                <Zap className="w-4 h-4 text-[#e5a93c] shrink-0 mt-0.5" />
                <span>
                  <strong className="text-[#f4c66a] tracking-wider">ENGRAVED PLATE // </strong>
                  {clue.payload.panel_note}
                </span>
              </div>
            )}
            <div className="text-[11px] text-[#d6be92]">
              <strong className="text-[#f4c66a]">How to Solve: </strong>
              Toggle knife switches (A1..D0) per the engraved instruction, watch the 4 filament bulbs update live, press{' '}
              <strong>LOAD CODE</strong>, then press <strong>TRANSMIT CODE</strong>.
            </div>
          </div>

          {/* 8 Copper-Jaw Knife Switches (Pairs A, B, C, D) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {pairs.map((pair, pIdx) => {
              const groupLetter = pair[0]?.[0] || String.fromCharCode(65 + pIdx);
              return (
                <div
                  key={groupLetter}
                  className="p-3 rounded-[2px] bg-[#140f0b] border border-[#5e4120] flex flex-col items-center gap-2.5"
                >
                  <div className="w-full text-center border-b border-[#4c3419] pb-1 font-re-typewriter text-[10px] font-bold tracking-[0.2em] text-[#deb56d]">
                    PAIR {groupLetter}
                  </div>
                  <div className="flex items-center gap-3">
                    {pair.map((swName) => {
                      const on = Boolean(switches[swName]);
                      return (
                        <button
                          key={swName}
                          type="button"
                          onClick={() => toggleSwitch(swName)}
                          aria-label={`Toggle switch ${swName}`}
                          className={`group relative flex flex-col items-center justify-between w-14 h-24 p-2 rounded-[2px] border transition-colors cursor-pointer ${
                            on
                              ? 'bg-[#26180b] border-[#e09f3e]'
                              : 'bg-[#0e0b08] border-[#423222] hover:border-[#8c6434]'
                          }`}
                        >
                          <span className="font-re-typewriter text-[10px] font-bold text-[#e6d1ac]">
                            {swName}
                          </span>
                          {/* Bakelite switch channel + rectangular knife blade */}
                          <div className="relative w-6 h-10 bg-black/85 rounded-[2px] border border-[#3a2d1f] flex items-center justify-center">
                            <div
                              className={`w-4 h-3.5 rounded-[1px] border transition-transform duration-150 ${
                                on
                                  ? '-translate-y-2.5 bg-[#f59e0b] border-[#fef3c7]'
                                  : 'translate-y-2.5 bg-[#57534e] border-[#a8a29e]'
                              }`}
                            />
                          </div>
                          <span
                            className={`font-re-typewriter text-xs font-bold ${
                              on ? 'text-[#fbbf24]' : 'text-[#78716c]'
                            }`}
                          >
                            {on ? '1' : '0'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Hand-Drawn 1981 Interactive Engineering Blueprint Schematic */}
          <div className="vault-blueprint-grid rounded-[2px] border-2 border-[#4e4230] p-3 text-[#2a2117] relative overflow-x-auto">
            <div className="flex items-center justify-between border-b border-[#7a6b54]/50 pb-1.5 mb-2 font-re-typewriter">
              <span className="text-[11px] font-bold tracking-[0.14em] uppercase">
                HAND-DRAWN LOGIC SCHEMATIC // REV. 1981
              </span>
              <span className="text-[10px] uppercase tracking-wider text-[#544736]">
                ACTIVE COPPER TRACES: {evalResult.code}
              </span>
            </div>

            <svg
              viewBox={`0 0 ${layout.width} ${layout.height}`}
              className="w-full min-w-[560px] h-auto max-h-64 block"
              aria-label="Failsafe Logic Circuit Schematic"
            >
              <defs>
                <filter id="vault-wire-glow" x="-15%" y="-15%" width="130%" height="130%">
                  <feGaussianBlur stdDeviation="2.2" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              {/* Orthogonal Wires from Inputs/Gates to Gate Inputs */}
              {layout.gates.map((g) => {
                const gn = layout.nodes[g.id];
                if (!gn) return null;
                const ins = g.in || [];
                return ins.map((srcId, i) => {
                  const sn = layout.nodes[srcId];
                  if (!sn) return null;
                  const active = Boolean(evalResult.values[srcId]);
                  const syOffset = ins.length === 1 ? 0 : i === 0 ? -5 : 5;
                  const midX = (sn.x + gn.x) * 0.5 + (i % 2 ? 6 : -6);
                  const dPath = `M ${sn.x + 18} ${sn.y} L ${midX} ${sn.y} L ${midX} ${gn.y + syOffset} L ${gn.x - 16} ${gn.y + syOffset}`;
                  return (
                    <path
                      key={`w-${g.id}-${srcId}-${i}`}
                      d={dPath}
                      fill="none"
                      stroke={active ? '#c2410c' : '#574a38'}
                      strokeWidth={active ? '2.4' : '1.4'}
                      opacity={active ? 0.95 : 0.62}
                    />
                  );
                });
              })}

              {/* Wires from Terminal Gates to 4 Output Filament Bulbs */}
              {layout.outNodes.map((on) => {
                const sn = layout.nodes[on.srcId];
                if (!sn) return null;
                const active = Boolean(evalResult.values[on.srcId]);
                const midX = (sn.x + on.x) * 0.52;
                const dPath = `M ${sn.x + 18} ${sn.y} L ${midX} ${sn.y} L ${midX} ${on.y} L ${on.x - 18} ${on.y}`;
                return (
                  <path
                    key={`out-${on.id}`}
                    d={dPath}
                    fill="none"
                    stroke={active ? '#d97706' : '#574a38'}
                    strokeWidth={active ? '2.8' : '1.5'}
                    opacity={active ? 1 : 0.6}
                  />
                );
              })}

              {/* Input Pin Nodes */}
              {inputNames.map((id) => {
                const n = layout.nodes[id];
                const active = Boolean(switches[id]);
                return (
                  <g key={`pin-${id}`}>
                    <rect
                      x={n.x - 24}
                      y={n.y - 9}
                      width="36"
                      height="18"
                      rx="2"
                      fill={active ? '#fde68a' : '#cdc0a6'}
                      stroke={active ? '#b45309' : '#4a3d2d'}
                      strokeWidth="1.5"
                    />
                    <text
                      x={n.x - 6}
                      y={n.y + 3.5}
                      textAnchor="middle"
                      fontSize="9.5"
                      fontWeight="bold"
                      fontFamily="monospace"
                      fill="#1f160d"
                    >
                      {id}:{active ? '1' : '0'}
                    </text>
                  </g>
                );
              })}

              {/* Logic Gate Symbols + ID Labels */}
              {layout.gates.map((g) => {
                const gn = layout.nodes[g.id];
                const active = Boolean(evalResult.values[g.id]);
                return (
                  <g key={`gate-${g.id}`}>
                    <GateSymbol type={gn.type} x={gn.x} y={gn.y} active={active} />
                    <text
                      x={gn.x}
                      y={gn.y + 3}
                      textAnchor="middle"
                      fontSize="8"
                      fontWeight="bold"
                      fontFamily="monospace"
                      fill="#1f160d"
                    >
                      {gn.type}
                    </text>
                    <text
                      x={gn.x}
                      y={gn.y + 22}
                      textAnchor="middle"
                      fontSize="8"
                      fontFamily="monospace"
                      fill="#4a3d2d"
                    >
                      {g.id} ({active ? '1' : '0'})
                    </text>
                  </g>
                );
              })}

              {/* Output Bulb Nodes */}
              {layout.outNodes.map((on, i) => {
                const active = Boolean(evalResult.outputs[i]);
                return (
                  <g key={`bulb-${on.id}`}>
                    <circle
                      cx={on.x}
                      cy={on.y}
                      r="11"
                      fill={active ? '#f59e0b' : '#2a241d'}
                      stroke={active ? '#78350f' : '#574a38'}
                      strokeWidth="2"
                    />
                    <text
                      x={on.x}
                      y={on.y + 3.5}
                      textAnchor="middle"
                      fontSize="10"
                      fontWeight="bold"
                      fontFamily="monospace"
                      fill={active ? '#1c1104' : '#a89f91'}
                    >
                      {active ? '1' : '0'}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* 4 Physical Edison Filament Bulbs & Nixie Lamp Readout */}
          <div className="p-4 rounded-[2px] bg-[#140f0b] border border-[#5e4120] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {evalResult.outputs.map((val, idx) => (
                <div key={`lamp-${idx}`} className="flex flex-col items-center gap-1.5">
                  <div
                    className={`w-11 h-11 rounded-[2px] border-2 flex items-center justify-center font-re-typewriter font-bold text-sm transition-colors ${
                      val
                        ? 'bg-[#d97706] border-[#fef3c7] text-[#1c0f02]'
                        : 'bg-[#120e0b] border-[#3d3024] text-[#736455]'
                    }`}
                  >
                    {val}
                  </div>
                  <span className="font-re-typewriter text-[10px] tracking-wider text-[#bba072]">
                    LAMP {idx + 1}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right px-4 py-1.5 rounded-[2px] bg-black/70 border border-[#4a341b]">
                <span className="font-re-typewriter text-[9px] tracking-widest text-[#948066] block">
                  READOUT (L → R)
                </span>
                <span className="font-re-typewriter text-xl font-bold tracking-[0.28em] text-[#fbbf24]">
                  {evalResult.code || '----'}
                </span>
              </div>
              <button
                type="button"
                onClick={applyLampCode}
                className="re-plate re-plate-amber !py-2 !px-3.5 cursor-pointer"
              >
                <span className="re-keycap">↓</span>
                <span>LOAD CODE</span>
              </button>
            </div>
          </div>

          {feedback && (
            <div
              className={`p-3.5 rounded-[2px] border border-l-2 font-re-typewriter text-xs flex items-center gap-2 ${
                feedback.correct
                  ? 'bg-[#0e1f15] border-emerald-600/70 border-l-emerald-400 text-emerald-200'
                  : 'bg-[#210b0d] border-red-700/70 border-l-red-400 text-red-200'
              }`}
            >
              {feedback.correct ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}
        </div>

        {/* Submission Switch Plate */}
        <form
          onSubmit={handleFormSubmit}
          className="p-4 bg-[#16100c] border-t border-[#5e4120] flex flex-col sm:flex-row items-stretch sm:items-end gap-3"
        >
          <div className="flex-1">
            <label className="block font-re-typewriter text-[11px] uppercase tracking-[0.12em] text-[#e2be7f] mb-1.5">
              {stage.prompt || 'Enter the 4-digit authorization code shown by the lamps:'}
            </label>
            <input
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              disabled={clue.solved || isExhausted || isSubmitting}
              placeholder={stage.fields?.[0]?.placeholder || `Current lamp code: ${evalResult.code}`}
              aria-label={stage.fields?.[0]?.label || 'Authorization code'}
              className="w-full px-4 py-2.5 rounded-[2px] bg-[#070605] border border-[#6e4c23] focus:border-[#f59e0b] outline-none font-re-typewriter text-sm tracking-[0.26em] text-[#fef3c7]"
            />
          </div>

          <button
            type="submit"
            disabled={clue.solved || isExhausted || isSubmitting}
            className="re-plate re-plate-amber !px-5 !py-2.5 !justify-center disabled:opacity-40 cursor-pointer"
          >
            <span className="re-keycap">⚡</span>
            <span className="tracking-widest uppercase">
              {clue.solved ? 'LATCHED' : isExhausted ? 'LOCKED OUT' : isSubmitting ? 'TRANSMITTING...' : 'TRANSMIT CODE'}
            </span>
          </button>
        </form>
      </div>
    </div>
  );
}
