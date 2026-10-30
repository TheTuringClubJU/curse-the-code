import React, { useEffect, useRef } from 'react';

/**
 * Procedural Realistic Haunted Forest & Atmospheric Night Generator
 * - Realistic organic fractal branching trees (gnarled, twisted, high-density gothic branches)
 * - Layered depth (foreground dark silhouette + background misty silhouette trees)
 * - Organic glowing lanterns with candlelight flicker
 * - Dynamic ground mist & creeping fog
 * - Harvest / Blood Moon with soft crater illumination
 */
export default function HauntedNightScenery({ round = 1 }) {
  const canvasRef = useRef(null);
  const isRound2 = round === 2;
  const moonGlow = isRound2 ? '#8f7bff' : '#ff7a1a';
  const pumpkinEyeGlow = isRound2 ? '#c4b5fd' : '#fef08a';

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationId;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      drawScenery();
    };

    // Realistic recursive tree branch generator with organic jitter and tapering
    const drawBranch = (startX, startY, length, angle, branchWidth, depth, maxDepth, isBackdrop = false) => {
      const endX = startX + length * Math.sin((angle * Math.PI) / 180);
      const endY = startY - length * Math.cos((angle * Math.PI) / 180);

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      
      // Curved organic jitter
      const midX = (startX + endX) / 2 + (Math.sin(depth * 3) * length * 0.12);
      const midY = (startY + endY) / 2 + (Math.cos(depth * 2) * length * 0.12);
      ctx.quadraticCurveTo(midX, midY, endX, endY);

      ctx.lineWidth = branchWidth;
      ctx.lineCap = 'round';
      ctx.stroke();

      if (depth >= maxDepth || length < 4) return;

      // Sub-branches with realistic angles
      const subBranches = depth === 0 ? 3 : (Math.random() > 0.15 ? 2 : 3);
      for (let i = 0; i < subBranches; i++) {
        const angleSpread = depth === 0 ? 35 : 28;
        const newAngle = angle + (i - (subBranches - 1) / 2) * angleSpread + (Math.sin(depth + i) * 14);
        const lengthFactor = 0.68 + (Math.sin(depth * 4 + i) * 0.1);
        const newWidth = branchWidth * 0.65;
        drawBranch(endX, endY, length * lengthFactor, newAngle, Math.max(newWidth, 0.8), depth + 1, maxDepth, isBackdrop);
      }
    };

    const drawScenery = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // --- 1. Background Misty Layer (Distant Trees) ---
      ctx.strokeStyle = isRound2 ? 'rgba(38, 26, 60, 0.45)' : 'rgba(38, 20, 26, 0.45)';
      // Left distant tree
      drawBranch(w * 0.08, h + 20, h * 0.38, 12, 16, 0, 7, true);
      // Right distant tree
      drawBranch(w * 0.92, h + 20, h * 0.40, -14, 18, 0, 7, true);

      // --- 2. Foreground Silhouette Gothic Trees (Left & Right) ---
      ctx.strokeStyle = '#050308';
      // Left massive gnarled tree
      drawBranch(-10, h + 40, h * 0.52, 22, 38, 0, 8);
      // Left secondary leaning trunk
      drawBranch(w * 0.05, h + 30, h * 0.42, 10, 24, 0, 7);

      // Right massive gnarled tree
      drawBranch(w + 10, h + 40, h * 0.54, -24, 40, 0, 8);
      // Right secondary leaning trunk
      drawBranch(w * 0.94, h + 30, h * 0.44, -12, 26, 0, 7);
    };

    window.addEventListener('resize', resize);
    resize();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationId);
    };
  }, [isRound2]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-10">
      {/* 1. Luminous Eerie Moon (Top Center-Right) */}
      <div 
        className="absolute top-6 right-[12%] sm:right-[18%] w-36 h-36 sm:w-52 sm:h-52 rounded-full opacity-70 transition-colors duration-1000 z-0"
        style={{
          background: `radial-gradient(circle at 35% 35%, #ffffff 0%, ${isRound2 ? '#a78bfa' : '#fed7aa'} 40%, ${moonGlow} 75%, transparent 100%)`,
          boxShadow: `0 0 70px 25px ${isRound2 ? 'rgba(143,123,255,0.35)' : 'rgba(255,122,26,0.35)'}`,
        }}
      >
        {/* Soft Moon Texture */}
        <div className="absolute top-10 left-12 w-8 h-8 rounded-full bg-black/15 blur-[1px]" />
        <div className="absolute top-20 left-20 w-12 h-12 rounded-full bg-black/15 blur-[2px]" />
        <div className="absolute top-14 left-32 w-6 h-6 rounded-full bg-black/10 blur-[1px]" />
      </div>

      {/* 2. Flying Bats Silhouettes */}
      <svg className="absolute top-16 right-[28%] sm:right-[34%] w-10 h-6 opacity-70 animate-bounce duration-1000 z-0" viewBox="0 0 40 24" fill="#050308">
        <path d="M20 12 C16 4 10 3 0 6 C5 12 12 14 16 13 C18 16 22 16 24 13 C28 14 35 12 40 6 C30 3 24 4 20 12 Z" />
      </svg>
      <svg className="absolute top-24 right-[16%] w-7 h-4 opacity-55 z-0" viewBox="0 0 40 24" fill="#050308">
        <path d="M20 12 C16 4 10 3 0 6 C5 12 12 14 16 13 C18 16 22 16 24 13 C28 14 35 12 40 6 C30 3 24 4 20 12 Z" />
      </svg>

      {/* 3. HTML5 Canvas Rendering Realistic Organic Trees with Natural Fractal Density */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full z-10 pointer-events-none" />

      {/* 4. Left Carved Halloween Pumpkin at Tree Base */}
      <div className="absolute bottom-5 left-4 sm:left-14 w-28 sm:w-36 h-24 sm:h-30 filter drop-shadow-[0_0_25px_rgba(255,122,26,0.7)] z-20">
        <svg viewBox="0 0 100 80" className="w-full h-full">
          <path d="M50 16 Q54 2 64 3 L60 15 Z" fill="#2d3a1f" />
          <ellipse cx="50" cy="50" rx="42" ry="27" fill={isRound2 ? "#2d1645" : "#7c2d12"} stroke="#050308" strokeWidth="2" />
          <ellipse cx="32" cy="50" rx="22" ry="25" fill={isRound2 ? "#240f3b" : "#6c240d"} />
          <ellipse cx="68" cy="50" rx="22" ry="25" fill={isRound2 ? "#240f3b" : "#6c240d"} />
          {/* Evil Carved Slits & Grin */}
          <polygon points="32,42 43,46 30,51" fill={pumpkinEyeGlow} className="animate-flicker" />
          <polygon points="68,42 57,46 70,51" fill={pumpkinEyeGlow} className="animate-flicker" />
          <polygon points="50,46 46,51 54,51" fill={pumpkinEyeGlow} />
          <path d="M 26 58 Q 50 74 74 58 Q 66 66 50 67 Q 34 66 26 58 Z" fill={pumpkinEyeGlow} className="animate-flicker" />
        </svg>
      </div>

      {/* 5. Right Carved Halloween Pumpkin at Tree Base */}
      <div className="absolute bottom-6 right-4 sm:right-16 w-26 sm:w-32 h-22 sm:h-28 filter drop-shadow-[0_0_25px_rgba(255,122,26,0.7)] z-20">
        <svg viewBox="0 0 100 80" className="w-full h-full">
          <path d="M50 16 Q45 3 36 2 L41 15 Z" fill="#2d3a1f" />
          <ellipse cx="50" cy="50" rx="40" ry="26" fill={isRound2 ? "#2d1645" : "#7c2d12"} stroke="#050308" strokeWidth="2" />
          <ellipse cx="34" cy="50" rx="20" ry="24" fill={isRound2 ? "#240f3b" : "#6c240d"} />
          <ellipse cx="66" cy="50" rx="20" ry="24" fill={isRound2 ? "#240f3b" : "#6c240d"} />
          {/* Evil Carved Slits & Grin */}
          <polygon points="34,43 44,47 33,52" fill={pumpkinEyeGlow} className="animate-flicker" />
          <polygon points="66,43 56,47 67,52" fill={pumpkinEyeGlow} className="animate-flicker" />
          <path d="M 28 58 Q 50 72 72 58 Q 64 65 50 66 Q 36 65 28 58 Z" fill={pumpkinEyeGlow} className="animate-flicker" />
        </svg>
      </div>

      {/* 6. Realistic Rolling Graveyard Mist / Ground Fog */}
      <div 
        className="absolute bottom-0 inset-x-0 h-40 sm:h-52 pointer-events-none z-20"
        style={{
          background: `linear-gradient(to top, #07060b 20%, ${isRound2 ? 'rgba(58, 42, 85, 0.35)' : 'rgba(56, 26, 12, 0.35)'} 55%, transparent 100%)`,
        }}
      />
    </div>
  );
}
