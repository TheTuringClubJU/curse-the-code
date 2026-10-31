import React, { useState, useEffect } from 'react';
import { 
  X, Send, AlertCircle, CheckCircle, Sparkles, Sliders, 
  ArrowLeft, ArrowRight, ArrowLeftRight, RotateCcw, Layers, Check 
} from 'lucide-react';

const SCRAP_IMAGE_MAP = {
  EB01: '/poster_piece_1.png',
  EB02: '/diary_piece_1.png',
  EB03: '/portrait_piece_1.png',
  EB04: '/notebook_piece_1.png',
  EB05: '/diary_piece_2.png',
  EB06: '/poster_piece_2.png',
  EB07: '/notebook_piece_2.png',
  EB08: '/portrait_piece_2.png',
  EB09: '/diary_piece_3.png',
  EB10: '/notebook_piece_3.png',
  EB11: '/poster_piece_3.png',
  EB12: '/portrait_piece_3.png',
  EK01: '/key_piece.png',
  XB01: '/decoy_photo.png',
  XB02: '/decoy_portrait.png',
};

// Static fragments reference dictionary for Room 1 Bedroom
const SCRAP_DATA = {
  // Poster R1-03 scraps
  EB01: {
    id: 'EB01',
    part: 'A',
    label: 'Scrap A • EB01',
    source: 'Trunk Lid Lining',
    titleFragment: 'CARNI',
    dateFragment: 'TEST DATE 07/',
    footerFragment: '',
    tearType: 'right',
  },
  EB06: {
    id: 'EB06',
    part: 'B',
    label: 'Scrap B • EB06',
    source: 'Coat in Wardrobe',
    titleFragment: 'VAL OF ',
    dateFragment: '04/20',
    footerFragment: '',
    tearType: 'both',
  },
  EB11: {
    id: 'EB11',
    part: 'C',
    label: 'Scrap C • EB11',
    source: 'Behind Mirror Frame',
    titleFragment: 'SHADOWS',
    dateFragment: '01',
    footerFragment: 'THE GATES SHALL BOLT AT SUNDOWN',
    tearType: 'left',
  },

  // Portrait R1-04 scraps
  EB03: {
    id: 'EB03',
    part: 'A',
    label: 'Canvas Strip A • EB03',
    source: 'Behind small canvas',
    contentFragment: 'SHA',
    tearType: 'right',
  },
  EB08: {
    id: 'EB08',
    part: 'B',
    label: 'Canvas Strip B • EB08',
    source: 'Dresser bottom drawer',
    contentFragment: 'D',
    tearType: 'both',
  },
  EB12: {
    id: 'EB12',
    part: 'C',
    label: 'Canvas Strip C • EB12',
    source: 'Under loose floorboard',
    contentFragment: 'OW',
    tearType: 'left',
  },

  // Diary R1-01 scraps
  EB02: {
    id: 'EB02',
    part: 'A',
    label: 'Page Slip A • EB02',
    source: 'Nightstand drawer',
    contentFragment: 'YJXY JSYWD Y',
    hintNote: 'Rex turned 5 today',
  },
  EB05: {
    id: 'EB05',
    part: 'B',
    label: 'Page Slip B • EB05',
    source: 'Under mattress edge',
    contentFragment: 'MJ PJDBTWI NX QFS',
  },
  EB09: {
    id: 'EB09',
    part: 'C',
    label: 'Page Slip C • EB09',
    source: 'Behind clock face',
    contentFragment: 'YJWS',
  },

  // Notebook R1-02 scraps
  EB04: {
    id: 'EB04',
    part: 'A',
    label: 'Notebook Page A • EB04',
    source: 'Desk cubby',
    contentFragment: 'WKH WHVW JDW',
    hintNote: '3 tally marks in margin',
  },
  EB07: {
    id: 'EB07',
    part: 'B',
    label: 'Notebook Page B • EB07',
    source: 'Bookshelf upper nook',
    contentFragment: 'H RSHQV DW VXQ',
  },
  EB10: {
    id: 'EB10',
    part: 'C',
    label: 'Notebook Page C • EB10',
    source: 'Curtain hem',
    contentFragment: 'ULVH',
  },
};

// Preset default scrambled orders for unsolved clues
const DEFAULT_SCRAMBLED_ORDERS = {
  'R1-01': ['EB05', 'EB09', 'EB02'],
  'R1-02': ['EB07', 'EB10', 'EB04'],
  'R1-03': ['EB06', 'EB11', 'EB01'],
  'R1-04': ['EB08', 'EB12', 'EB03'],
};

export default function ClueModal({
  isOpen,
  onClose,
  clue,
  evidence = [],
  onSubmitAnswer,
  isSubmitting = false
}) {
  const [answerInput, setAnswerInput] = useState('');
  const [contrastVal, setContrastVal] = useState(100);
  const [brightnessVal, setBrightnessVal] = useState(100);
  const [invertVal, setInvertVal] = useState(false);
  const [submissionFeedback, setSubmissionFeedback] = useState(null);

  // Fragment reordering state
  const [scrapOrder, setScrapOrder] = useState([]);
  const [selectedScrapIndex, setSelectedScrapIndex] = useState(null);

  const stage = clue?.stages?.[0] || {};
  const isImageContrast = clue?.solution_method === 'image_contrast' || clue?.object_id === 'poster' || clue?.object_id === 'portrait';

  // Expected order for this clue
  const expectedOrder = React.useMemo(() => {
    if (!clue) return [];
    if (clue.assembly?.evidence_ids?.length) {
      return clue.assembly.evidence_ids;
    }
    if (clue.id === 'R1-03') return ['EB01', 'EB06', 'EB11'];
    if (clue.id === 'R1-04') return ['EB03', 'EB08', 'EB12'];
    if (clue.id === 'R1-01') return ['EB02', 'EB05', 'EB09'];
    if (clue.id === 'R1-02') return ['EB04', 'EB07', 'EB10'];
    return [];
  }, [clue]);

  // Initialize scrap order on clue change or open
  useEffect(() => {
    if (!clue || expectedOrder.length === 0) {
      setScrapOrder([]);
      return;
    }

    if (clue.solved) {
      setScrapOrder([...expectedOrder]);
    } else {
      const scrambled = DEFAULT_SCRAMBLED_ORDERS[clue.id] || [...expectedOrder].reverse();
      setScrapOrder([...scrambled]);
    }
    setSubmissionFeedback(null);
    setSelectedScrapIndex(null);
  }, [clue?.id, clue?.solved, expectedOrder]);

  if (!isOpen || !clue) return null;

  // Check if scraps are currently in correct alignment
  const isAligned = expectedOrder.length > 0 && scrapOrder.length === expectedOrder.length &&
    scrapOrder.every((id, idx) => id === expectedOrder[idx]);

  // Re-ordering actions
  const moveScrap = (fromIndex, direction) => {
    const toIndex = fromIndex + direction;
    if (toIndex < 0 || toIndex >= scrapOrder.length) return;

    setScrapOrder(prev => {
      const updated = [...prev];
      const temp = updated[fromIndex];
      updated[fromIndex] = updated[toIndex];
      updated[toIndex] = temp;
      return updated;
    });
    setSelectedScrapIndex(null);
  };

  const handleScrapClick = (index) => {
    if (selectedScrapIndex === null) {
      setSelectedScrapIndex(index);
    } else if (selectedScrapIndex === index) {
      setSelectedScrapIndex(null);
    } else {
      // Swap the two selected scraps
      setScrapOrder(prev => {
        const updated = [...prev];
        const temp = updated[selectedScrapIndex];
        updated[selectedScrapIndex] = updated[index];
        updated[index] = temp;
        return updated;
      });
      setSelectedScrapIndex(null);
    }
  };

  const resetScrapOrder = () => {
    const scrambled = DEFAULT_SCRAMBLED_ORDERS[clue.id] || [...expectedOrder].reverse();
    setScrapOrder([...scrambled]);
    setSelectedScrapIndex(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!answerInput.trim() || isSubmitting) return;

    setSubmissionFeedback(null);
    const res = await onSubmitAnswer(clue.id, answerInput.trim());
    if (res) {
      setSubmissionFeedback(res);
      if (res.correct) {
        setAnswerInput('');
        setScrapOrder([...expectedOrder]);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 select-none">
      <div className="relative w-full max-w-2xl bg-[#0e0a1a] border border-[#433066] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#171029] border-b border-[#433066]">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#8f7bff]/20 text-[#cdbfff] border border-[#8f7bff]/30">
                {clue.id}
              </span>
              <h2 className="text-base font-bold text-[#e8e0ff] font-serif">
                {clue.title}
              </h2>
            </div>
            <p className="text-xs text-gray-400 font-mono mt-0.5">
              Attempts: {clue.attempts} / {clue.attempts_max}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs font-mono">
          
          {/* Scene Text / Story Prompt */}
          {clue.scene_text && (
            <p className="text-xs text-[#d5cbf0] font-serif italic border-l-2 border-[#8f7bff] pl-3 py-1 bg-black/20">
              "{clue.scene_text}"
            </p>
          )}

          {/* Interactive Fragment Assembly Board */}
          {expectedOrder.length > 0 && (
            <div className="bg-[#140e24] p-3.5 rounded-lg border border-[#3b2a59] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-mono text-[#cdbfff]">
                  <Layers className="w-4 h-4 text-[#8f7bff]" />
                  <span className="font-bold tracking-wide">
                    {clue.object_id === 'poster' ? 'ASSEMBLE POSTER SCRAPS' : 'FRAGMENT RECONSTRUCTION TRAY'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded border flex items-center gap-1 ${
                    isAligned 
                      ? 'bg-[#18261e] text-[#86efac] border-[#22543d]' 
                      : 'bg-[#261b14] text-[#fdba74] border-[#7c2d12]'
                  }`}>
                    {isAligned ? <Check className="w-3 h-3 text-[#86efac]" /> : <AlertCircle className="w-3 h-3 text-[#fdba74]" />}
                    {isAligned ? 'Seams Aligned' : 'Misaligned'}
                  </span>
                  {!clue.solved && (
                    <button
                      type="button"
                      onClick={resetScrapOrder}
                      title="Reset scrap order"
                      className="p-1 rounded bg-black/40 hover:bg-white/10 text-gray-400 hover:text-white transition"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <p className="text-[11px] text-gray-400">
                Rearrange the {expectedOrder.length} recovered scraps into positions 1, 2, and 3 using the <kbd className="px-1 py-0.5 bg-black/40 rounded border border-white/10 text-white">◀</kbd> / <kbd className="px-1 py-0.5 bg-black/40 rounded border border-white/10 text-white">▶</kbd> buttons (or click two scraps to swap) to piece together the evidence.
              </p>

              {/* 3 Scrap Cards with Real PNG Visuals */}
              <div className="grid grid-cols-3 gap-2">
                {scrapOrder.map((scrapId, index) => {
                  const scrap = SCRAP_DATA[scrapId] || { id: scrapId, label: `Scrap ${scrapId}`, source: 'Recovered' };
                  const isSelected = selectedScrapIndex === index;
                  const imgSrc = SCRAP_IMAGE_MAP[scrapId] || '/parcel_wrapped.png';

                  return (
                    <div
                      key={scrapId}
                      onClick={() => handleScrapClick(index)}
                      className={`relative p-2 rounded-md border transition cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'border-[#8f7bff] bg-[#23173d] ring-1 ring-[#8f7bff] shadow-lg shadow-[#8f7bff]/20'
                          : 'border-[#433066] bg-[#0c0914] hover:border-[#674b9e]'
                      }`}
                    >
                      {/* Top: Position & Move Buttons */}
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/60 text-[#a292cc] border border-white/5">
                          POS {index + 1}
                        </span>
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => moveScrap(index, -1)}
                            className="p-1 rounded bg-black/40 hover:bg-white/20 disabled:opacity-20 text-white transition"
                          >
                            <ArrowLeft className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            disabled={index === scrapOrder.length - 1}
                            onClick={() => moveScrap(index, 1)}
                            className="p-1 rounded bg-black/40 hover:bg-white/20 disabled:opacity-20 text-white transition"
                          >
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Middle: Scrap Visual PNG Preview */}
                      <div className="bg-black/60 p-1 rounded border border-dashed border-[#5a4282] flex flex-col justify-center text-center gap-1">
                        <div className="w-full h-14 rounded overflow-hidden bg-black/80 flex items-center justify-center">
                          <img 
                            src={imgSrc} 
                            alt={scrapId} 
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <span className="text-[10px] text-[#8f7bff] font-bold truncate">
                          {scrap.label || scrapId}
                        </span>
                        {scrap.dateFragment && (
                          <span className="text-[9px] font-black text-gray-300 tracking-wider truncate">
                            "{scrap.dateFragment}"
                          </span>
                        )}
                        {scrap.contentFragment && !scrap.dateFragment && (
                          <span className="text-[9px] font-bold text-gray-300 tracking-wider truncate">
                            "{scrap.contentFragment}"
                          </span>
                        )}
                      </div>

                      {/* Bottom info */}
                      <div className="mt-1 text-[8px] text-gray-500 truncate text-center">
                        {scrap.source}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Visual Puzzle Controls & Assembled Preview */}
          {isImageContrast && (
            <div className="bg-[#140e24] p-4 rounded-lg border border-[#3b2a59] space-y-3">
              <div className="flex items-center justify-between text-xs font-mono text-[#cdbfff]">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-[#8f7bff]" />
                  <span>EXPOSURE & ENHANCEMENT CONTROLS</span>
                </div>
                <button
                  type="button"
                  onClick={() => setInvertVal(!invertVal)}
                  className={`px-2.5 py-0.5 rounded text-[10px] font-mono border transition ${
                    invertVal
                      ? 'bg-[#8f7bff] text-black border-[#8f7bff]'
                      : 'bg-black/40 text-gray-300 border-white/20 hover:border-white/40'
                  }`}
                >
                  {invertVal ? 'Invert Active' : 'Toggle Invert'}
                </button>
              </div>

              {/* Inspection Preview Area */}
              <div
                className={`w-full min-h-[140px] rounded bg-black/70 border overflow-hidden transition-all duration-150 p-3 flex flex-col items-center justify-center ${
                  isAligned ? 'border-[#22543d] bg-black/80' : 'border-[#7c2d12] bg-[#140c0b]'
                }`}
                style={{
                  filter: `contrast(${contrastVal}%) brightness(${brightnessVal}%) ${invertVal ? 'invert(100%)' : ''}`
                }}
              >
                {clue.object_id === 'poster' ? (
                  <div className="w-full text-center space-y-2 select-all">
                    {isAligned ? (
                      <div className="space-y-1">
                        {/* 3 PNG Strips seamlessly connected */}
                        <div className="flex justify-center items-center h-28 rounded overflow-hidden border border-[#22543d] bg-black/60 shadow-lg">
                          <img src="/poster_piece_1.png" alt="Strip A" className="w-1/3 h-full object-cover border-r border-dashed border-gray-700/50" />
                          <img src="/poster_piece_2.png" alt="Strip B" className="w-1/3 h-full object-cover border-r border-dashed border-gray-700/50" />
                          <img src="/poster_piece_3.png" alt="Strip C" className="w-1/3 h-full object-cover" />
                        </div>
                        <p className="text-gray-800 text-xs tracking-widest font-bold">
                          CARNIVAL OF SHADOWS • TEST DATE 07/04/2001
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1.5 opacity-90">
                        <div className="grid grid-cols-3 gap-1 h-24">
                          {scrapOrder.map((sid) => (
                            <div key={sid} className="border border-dashed border-red-500/30 p-1 bg-black/40 rounded flex flex-col justify-between overflow-hidden">
                              <span className="block text-[8px] text-gray-600 font-mono text-left">{sid}</span>
                              <img src={SCRAP_IMAGE_MAP[sid]} alt={sid} className="w-full h-12 object-contain" />
                              <span className="block text-gray-800 font-black text-[10px] truncate">
                                {SCRAP_DATA[sid]?.dateFragment || '...'}
                              </span>
                            </div>
                          ))}
                        </div>
                        <p className="text-[10px] text-red-400 font-mono">
                          [Tear seams do not align. Swap scraps in the tray above.]
                        </p>
                      </div>
                    )}
                  </div>
                ) : clue.object_id === 'portrait' ? (
                  <div className="w-full text-center space-y-2 select-all">
                    {isAligned ? (
                      <div className="space-y-1">
                        <div className="flex justify-center items-center h-28 rounded overflow-hidden border border-[#22543d] bg-black/60 shadow-lg">
                          <img src="/portrait_piece_1.png" alt="Canvas A" className="w-1/3 h-full object-cover border-r border-dashed border-gray-700/50" />
                          <img src="/portrait_piece_2.png" alt="Canvas B" className="w-1/3 h-full object-cover border-r border-dashed border-gray-700/50" />
                          <img src="/portrait_piece_3.png" alt="Canvas C" className="w-1/3 h-full object-cover" />
                        </div>
                        <p className="text-gray-800 text-sm font-black tracking-widest py-1">
                          INSCRIPTION: SHADOW
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="grid grid-cols-3 gap-1 h-24">
                          {scrapOrder.map((sid) => (
                            <div key={sid} className="border border-dashed border-red-500/30 p-1 bg-black/40 rounded flex flex-col justify-between overflow-hidden">
                              <span className="block text-[8px] text-gray-600 font-mono text-left">{sid}</span>
                              <img src={SCRAP_IMAGE_MAP[sid]} alt={sid} className="w-full h-12 object-contain" />
                              <span className="text-gray-800 font-black text-xs">
                                {SCRAP_DATA[sid]?.contentFragment || sid}
                              </span>
                            </div>
                          ))}
                        </div>
                        <p className="text-[10px] text-red-400 font-mono">
                          [Canvas weave does not align. Reorder strips above.]
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-gray-700 font-mono text-xs">
                    Inspect visual evidence. Adjust brightness/contrast.
                  </div>
                )}
              </div>

              {/* Enhancement Sliders */}
              <div className="grid grid-cols-2 gap-4 text-xs font-mono text-gray-300">
                <div>
                  <label className="flex justify-between mb-1">
                    <span>Contrast</span>
                    <span className="text-[#8f7bff]">{contrastVal}%</span>
                  </label>
                  <input
                    type="range"
                    min="50"
                    max="400"
                    value={contrastVal}
                    onChange={(e) => setContrastVal(Number(e.target.value))}
                    className="w-full accent-[#8f7bff]"
                  />
                </div>
                <div>
                  <label className="flex justify-between mb-1">
                    <span>Brightness</span>
                    <span className="text-[#8f7bff]">{brightnessVal}%</span>
                  </label>
                  <input
                    type="range"
                    min="20"
                    max="300"
                    value={brightnessVal}
                    onChange={(e) => setBrightnessVal(Number(e.target.value))}
                    className="w-full accent-[#8f7bff]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Diary / Notebook Text Assembly Preview */}
          {!isImageContrast && expectedOrder.length > 0 && (
            <div className="bg-[#140e24] p-3.5 rounded-lg border border-[#3b2a59] space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-[#cdbfff]">
                <span>CONCATENATED CIPHERTEXT</span>
                <span className={`text-[10px] ${isAligned ? 'text-[#86efac]' : 'text-[#fdba74]'}`}>
                  {isAligned ? '✓ Order Verified' : '⚠ Misaligned'}
                </span>
              </div>
              <div className="p-2.5 rounded bg-black/50 border border-white/5 font-mono text-xs text-[#cdc2eb] select-all">
                {scrapOrder.map(sid => SCRAP_DATA[sid]?.contentFragment || sid).join(' ')}
              </div>
              {clue.hints?.length > 0 && (
                <p className="text-[10px] text-gray-400 italic">
                  Hint: {clue.hints[0].text}
                </p>
              )}
            </div>
          )}

          {/* Clue Prompt */}
          <div className="bg-[#140e24] p-3.5 rounded-lg border border-[#3b2a59]">
            <p className="text-[10px] font-mono text-gray-400 mb-1">PROMPT:</p>
            <p className="text-sm font-semibold text-[#e8e0ff] font-mono">
              {stage.prompt || "Enter the deduced solution:"}
            </p>
          </div>

          {/* Feedback Display */}
          {submissionFeedback && (
            <div className={`p-3 rounded-lg border text-xs font-mono flex items-center gap-2 ${
              submissionFeedback.correct
                ? 'bg-[#18261e] text-[#86efac] border-[#22543d]'
                : 'bg-[#291418] text-[#fca5a5] border-[#7f1d1d]'
            }`}>
              {submissionFeedback.correct ? (
                <CheckCircle className="w-4 h-4 shrink-0 text-[#86efac]" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-[#fca5a5]" />
              )}
              <span>{submissionFeedback.message}</span>
            </div>
          )}

          {/* Answer Form */}
          {clue.solved ? (
            <div className="p-3.5 rounded-lg bg-[#14261b] border border-[#235339] text-center">
              <span className="text-xs font-bold text-[#86efac] font-mono tracking-wider">
                ✓ CASE FILE SOLVED & RECONSTRUCTED
              </span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={answerInput}
                  onChange={(e) => setAnswerInput(e.target.value)}
                  placeholder={
                    clue.object_id === 'poster' 
                      ? "Enter date (e.g. 07/04/2001)..." 
                      : "Enter deduced answer..."
                  }
                  disabled={isSubmitting || (clue.attempts_max && clue.attempts >= clue.attempts_max)}
                  className="flex-1 bg-black/50 border border-[#523d78] focus:border-[#8f7bff] rounded-lg px-3 py-2 text-xs text-[#e8e0ff] font-mono outline-none transition"
                />
                <button
                  type="submit"
                  disabled={isSubmitting || !answerInput.trim() || (clue.attempts_max && clue.attempts >= clue.attempts_max)}
                  className="px-4 py-2 rounded-lg bg-[#8f7bff] text-black font-bold font-mono text-xs flex items-center gap-1.5 hover:bg-[#a696ff] transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit</span>
                </button>
              </div>
            </form>
          )}

        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 bg-[#171029] border-t border-[#433066] flex justify-between items-center text-[11px] font-mono text-gray-400">
          <span>{clue.object_id} investigation terminal</span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded bg-white/10 hover:bg-white/20 text-white transition text-xs"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
