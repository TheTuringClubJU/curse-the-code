import React, { useMemo, useState } from 'react';
import { X, AlertTriangle, CheckCircle2, Zap, HelpCircle } from 'lucide-react';

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
  const fill = active ? '#fae8c8' : '#e2d5bd';
  const stroke = active ? '#9a3412' : '#453528';
  const t = String(type || 'AND').toUpperCase();

  if (t === 'NOT') {
    return (
      <g>
        <polygon points={`${x - 16},${y - 11} ${x + 11},${y} ${x - 16},${y + 11}`} fill={fill} stroke={stroke} strokeWidth="1.8" />
        <circle cx={x + 15} cy={y} r="3.5" fill={fill} stroke={stroke} strokeWidth="1.6" />
      </g>
    );
  }
  if (t === 'OR' || t === 'NOR' || t === 'XOR') {
    const hasBubble = t === 'NOR';
    return (
      <g>
        {t === 'XOR' && (
          <path d={`M ${x - 22} ${y - 12} Q ${x - 15} ${y} ${x - 22} ${y + 12}`} fill="none" stroke={stroke} strokeWidth="1.8" />
        )}
        <path
          d={`M ${x - 16} ${y - 12} Q ${x - 9} ${y} ${x - 16} ${y + 12} Q ${x + 5} ${y + 12} ${x + 16} ${y} Q ${x + 5} ${y - 12} ${x - 16} ${y - 12} Z`}
          fill={fill}
          stroke={stroke}
          strokeWidth="1.8"
        />
        {hasBubble && <circle cx={x + 19} cy={y} r="3.5" fill={fill} stroke={stroke} strokeWidth="1.6" />}
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
        strokeWidth="1.8"
      />
      {hasBubble && <circle cx={x + 18} cy={y} r="3.5" fill={fill} stroke={stroke} strokeWidth="1.6" />}
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
        className="relative w-full max-w-5xl max-h-[92vh] flex flex-col rounded-2xl overflow-hidden text-[#ede3cf] shadow-[0_25px_70px_rgba(0,0,0,0.95)]"
        style={{
          background: 'linear-gradient(180deg, #181310 0%, #0d0a08 100%)',
          border: '1px solid rgba(196, 162, 101, 0.28)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ornamental brass corner insets */}
        <span className="absolute top-3 left-3 w-2.5 h-2.5 rounded-full bg-[#b89355] border border-black/70 pointer-events-none shadow-[0_1px_3px_rgba(0,0,0,0.8)]" />
        <span className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-[#b89355] border border-black/70 pointer-events-none shadow-[0_1px_3px_rgba(0,0,0,0.8)]" />
        <span className="absolute bottom-3 left-3 w-2.5 h-2.5 rounded-full bg-[#b89355] border border-black/70 pointer-events-none shadow-[0_1px_3px_rgba(0,0,0,0.8)]" />
        <span className="absolute bottom-3 right-3 w-2.5 h-2.5 rounded-full bg-[#b89355] border border-black/70 pointer-events-none shadow-[0_1px_3px_rgba(0,0,0,0.8)]" />

        {/* ── Medieval Ecclesiastical Header ── */}
        <div
          className="flex flex-wrap items-center justify-between gap-3 px-6 py-3.5 border-b"
          style={{
            background: 'linear-gradient(90deg, rgba(28, 20, 16, 0.95) 0%, rgba(18, 14, 12, 0.95) 100%)',
            borderColor: 'rgba(196, 162, 101, 0.22)',
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center border"
              style={{
                background: 'rgba(180, 83, 9, 0.18)',
                borderColor: 'rgba(217, 119, 6, 0.45)',
              }}
            >
              <Zap className="w-4 h-4 text-[#e5a93c]" />
            </div>
            <div>
              <h2 className="font-re-display text-sm sm:text-base font-bold tracking-[0.14em] text-[#f5f0e4] uppercase">
                {clue.title || 'Failsafe Logic Panel'} ({clue.id})
              </h2>
              <p className="font-re-typewriter text-[11px] text-[#bdae95]">
                {clue.scene_text || 'Consecrated Copper Busbars · Crypt Substation 6D'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowTruthTable((v) => !v)}
              className="re-btn cursor-pointer"
            >
              <span className="re-btn-circle">?</span>
              <HelpCircle className="w-3.5 h-3.5 text-[#d8b26e]" />
              <span>{showTruthTable ? 'Hide Gate Table' : 'Logic Gate Table'}</span>
            </button>
            <span className="re-btn cursor-default !border-white/10">
              <span className="re-btn-circle">#</span>
              <span className="text-[11px] uppercase tracking-wider text-[#9f9483]">Attempts:</span>
              <span className="font-mono text-[#fca5a5] font-bold">
                {clue.attempts ?? 0}/{clue.attempts_max ?? 3}
              </span>
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Failsafe Panel"
              className="re-btn cursor-pointer"
            >
              <span className="re-btn-circle">ESC</span>
              <X className="w-3.5 h-3.5" />
              <span>Close</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {showTruthTable && (
            <div
              className="p-3.5 rounded-xl border grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-[11px] font-re-typewriter"
              style={{
                background: 'rgba(20, 14, 10, 0.92)',
                borderColor: 'rgba(196, 162, 101, 0.3)',
              }}
            >
              {[
                ['AND', '1 only if ALL inputs = 1'],
                ['OR', '1 if ANY input = 1'],
                ['XOR', '1 if inputs DIFFER (odd 1s)'],
                ['NAND', '0 only if ALL inputs = 1'],
                ['NOR', '1 only if ALL inputs = 0'],
                ['NOT', 'Inverts single input (0↔1)'],
              ].map(([gName, desc]) => (
                <div key={gName} className="p-2 rounded-lg bg-black/50 border border-[#523d24]">
                  <div className="font-bold text-[#fbbf24] tracking-wider">{gName}</div>
                  <div className="text-[10px] text-[#cfbe9a] mt-0.5 leading-snug">{desc}</div>
                </div>
              ))}
            </div>
          )}

          {/* ── Antique Brass Engraved Legend Plate ── */}
          <div
            className="px-4 py-3 rounded-xl border font-re-typewriter text-xs space-y-1"
            style={{
              background: 'linear-gradient(135deg, rgba(38, 26, 16, 0.88) 0%, rgba(24, 16, 10, 0.92) 100%)',
              borderColor: 'rgba(180, 132, 61, 0.45)',
              color: '#ecd6ad',
            }}
          >
            {clue.payload?.panel_note && (
              <div className="flex items-start gap-2.5">
                <Zap className="w-4 h-4 text-[#e5a93c] shrink-0 mt-0.5" />
                <span>
                  <strong className="text-[#f6cb76] tracking-wider">ENGRAVED PLATE // </strong>
                  {clue.payload.panel_note}
                </span>
              </div>
            )}
            <div className="text-[11px] text-[#ceb991]">
              <strong className="text-[#f6cb76]">How to Solve: </strong>
              Toggle knife switches (A1..D0) per the engraved instruction, watch the 4 filament bulbs update live, press{' '}
              <strong className="text-white">LOAD CODE</strong>, then press <strong className="text-white">TRANSMIT CODE</strong>.
            </div>
          </div>

          {/* ── 8 Heavy Ceramic/Slate Knife Switches (Pairs A, B, C, D) ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {pairs.map((pair, pIdx) => {
              const groupLetter = pair[0]?.[0] || String.fromCharCode(65 + pIdx);
              return (
                <div
                  key={groupLetter}
                  className="p-3 rounded-xl border flex flex-col items-center gap-2.5 shadow-[inset_0_2px_6px_rgba(0,0,0,0.6)]"
                  style={{
                    background: 'rgba(16, 12, 10, 0.85)',
                    borderColor: 'rgba(196, 162, 101, 0.22)',
                  }}
                >
                  <div className="w-full text-center border-b border-[#43311f] pb-1 font-re-typewriter text-[10px] font-bold tracking-[0.2em] text-[#deb56d]">
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
                          className={`group relative flex flex-col items-center justify-between w-14 h-24 p-2 rounded-lg border transition-all cursor-pointer ${
                            on
                              ? 'bg-[#2b1a0d] border-[#f59e0b] shadow-[0_0_14px_rgba(245,158,11,0.24)]'
                              : 'bg-[#0f0b08] border-[#382a1b] hover:border-[#7a582c]'
                          }`}
                        >
                          <span className="font-re-typewriter text-[10.5px] font-bold text-[#e6d1ac]">
                            {swName}
                          </span>
                          {/* Slate base switch slot with copper knife blade */}
                          <div className="relative w-6 h-10 bg-black/90 rounded border border-[#3a2d1f] flex items-center justify-center">
                            <div
                              className={`w-4 h-3.5 rounded-[2px] border transition-transform duration-150 ${
                                on
                                  ? '-translate-y-2.5 bg-gradient-to-b from-[#f59e0b] to-[#b45309] border-[#fef3c7] shadow-[0_0_8px_rgba(245,158,11,0.6)]'
                                  : 'translate-y-2.5 bg-[#44403c] border-[#78716c]'
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

          {/* ── Hand-Drawn Engineering Schematic on Aged Vellum Parchment ── */}
          <div
            className="rounded-xl border p-3 text-[#2a2117] relative overflow-x-auto shadow-[inset_0_0_30px_rgba(100,70,30,0.12)]"
            style={{
              background: '#f4eedd',
              borderColor: 'rgba(150, 115, 65, 0.45)',
            }}
          >
            <div className="flex items-center justify-between border-b border-[#a89679]/60 pb-1.5 mb-2 font-re-typewriter">
              <span className="text-[11px] font-bold tracking-[0.14em] uppercase text-[#382b1b]">
                CONSECRATED LOGIC SCHEMATIC // ST. JUDE SUBSTATION
              </span>
              <span className="text-[10.5px] uppercase tracking-wider text-[#63513a] font-semibold">
                ACTIVE BUSBAR TRACES: {evalResult.code}
              </span>
            </div>

            <svg
              viewBox={`0 0 ${layout.width} ${layout.height}`}
              className="w-full min-w-[560px] h-auto max-h-64 block"
              aria-label="Failsafe Logic Circuit Schematic"
            >
              {/* Orthogonal Copper Traces from Inputs/Gates to Gate Inputs */}
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
                      stroke={active ? '#b45309' : '#735f47'}
                      strokeWidth={active ? '2.5' : '1.3'}
                      opacity={active ? 1 : 0.65}
                    />
                  );
                });
              })}

              {/* Traces from Terminal Gates to 4 Output Filament Bulbs */}
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
                    stroke={active ? '#d97706' : '#735f47'}
                    strokeWidth={active ? '2.8' : '1.4'}
                    opacity={active ? 1 : 0.65}
                  />
                );
              })}

              {/* Input Pin Nodes on Vellum */}
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
                      rx="3"
                      fill={active ? '#fef3c7' : '#ded1ba'}
                      stroke={active ? '#b45309' : '#574836'}
                      strokeWidth="1.4"
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
                      fill="#544431"
                    >
                      {g.id} ({active ? '1' : '0'})
                    </text>
                  </g>
                );
              })}

              {/* Output Filament Lamp Icons on Schematic */}
              {layout.outNodes.map((on, i) => {
                const active = Boolean(evalResult.outputs[i]);
                return (
                  <g key={`bulb-${on.id}`}>
                    <circle
                      cx={on.x}
                      cy={on.y}
                      r="11"
                      fill={active ? '#f59e0b' : '#332920'}
                      stroke={active ? '#78350f' : '#6b5842'}
                      strokeWidth="2"
                    />
                    <text
                      x={on.x}
                      y={on.y + 3.5}
                      textAnchor="middle"
                      fontSize="10"
                      fontWeight="bold"
                      fontFamily="monospace"
                      fill={active ? '#1c1104' : '#c4b7a2'}
                    >
                      {active ? '1' : '0'}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* ── 4 Antique Edison Vacuum Filament Lamps & Readout ── */}
          <div
            className="p-4 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-4"
            style={{
              background: 'rgba(16, 12, 10, 0.9)',
              borderColor: 'rgba(196, 162, 101, 0.22)',
            }}
          >
            <div className="flex items-center gap-5">
              {evalResult.outputs.map((val, idx) => (
                <div key={`lamp-${idx}`} className="flex flex-col items-center gap-1.5">
                  <div
                    className={`w-12 h-12 rounded-full border-2 flex items-center justify-center font-mono font-bold text-base transition-all duration-200 ${
                      val
                        ? 'bg-gradient-to-b from-[#f59e0b] to-[#b45309] border-[#fef3c7] text-[#1c0f02] shadow-[0_0_16px_rgba(245,158,11,0.65)]'
                        : 'bg-[#15110d] border-[#382b1d] text-[#6b5d4f]'
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
              <div className="text-right px-4 py-2 rounded-xl bg-black/75 border border-[#4a341b]">
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
                className="re-btn cursor-pointer"
              >
                <span className="re-btn-circle">↓</span>
                <span>LOAD CODE</span>
              </button>
            </div>
          </div>

          {feedback && (
            <div
              className={`p-3.5 rounded-xl border font-re-typewriter text-xs flex items-center gap-2 ${
                feedback.correct
                  ? 'bg-[#0e1f15] border-emerald-600/70 text-emerald-200'
                  : 'bg-[#210b0d] border-red-700/70 text-red-200'
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

        {/* ── Submission Switch Plate ── */}
        <form
          onSubmit={handleFormSubmit}
          className="p-4 border-t flex flex-col sm:flex-row items-stretch sm:items-end gap-3"
          style={{
            background: 'linear-gradient(180deg, rgba(20, 15, 12, 0.95) 0%, rgba(12, 9, 8, 0.98) 100%)',
            borderColor: 'rgba(196, 162, 101, 0.22)',
          }}
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
              className="w-full px-4 py-2.5 rounded-xl bg-[#090705] border border-[#523d24] focus:border-[#f59e0b] outline-none font-re-typewriter text-sm tracking-[0.26em] text-[#fef3c7]"
            />
          </div>

          <button
            type="submit"
            disabled={clue.solved || isExhausted || isSubmitting}
            className="re-btn !px-6 !py-2.5 !justify-center disabled:opacity-40 cursor-pointer"
          >
            <span className="re-btn-circle">⚡</span>
            <span className="tracking-widest uppercase">
              {clue.solved ? 'LATCHED' : isExhausted ? 'LOCKED OUT' : isSubmitting ? 'TRANSMITTING...' : 'TRANSMIT CODE'}
            </span>
          </button>
        </form>
      </div>
    </div>
  );
}
