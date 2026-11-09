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
    if (!ctx) return; // Guard for headless test environments (jsdom/CI)
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

      {/* 4. Left Vintage Iron Kerosene Lantern at Tree Base */}
      <div className="absolute bottom-5 left-4 sm:left-14 w-16 sm:w-20 h-28 sm:h-36 filter drop-shadow-[0_0_25px_rgba(212,160,64,0.7)] z-20">
        <svg viewBox="0 0 60 100" className="w-full h-full">
          {/* Iron Hood & Handle */}
          <path d="M 20 18 Q 30 6 40 18" stroke="#3d2c1d" strokeWidth="3" fill="none" />
          <rect x="18" y="18" width="24" height="8" rx="2" fill="#221810" stroke="#554028" strokeWidth="1.5" />
          {/* Glass Chamber with Kerosene Flame */}
          <rect x="15" y="26" width="30" height="42" rx="4" fill="rgba(255, 180, 80, 0.15)" stroke="#3d2c1d" strokeWidth="2" />
          <ellipse cx="30" cy="52" rx="6" ry="12" fill="#ffd77a" className="animate-pulse" />
          <ellipse cx="30" cy="54" rx="3" ry="7" fill="#fff" />
          {/* Iron Base */}
          <rect x="12" y="68" width="36" height="12" rx="3" fill="#18110b" stroke="#3d2c1d" strokeWidth="2" />
        </svg>
      </div>

      {/* 5. Right Vintage Iron Kerosene Lantern at Tree Base */}
      <div className="absolute bottom-6 right-4 sm:right-16 w-16 sm:w-20 h-28 sm:h-36 filter drop-shadow-[0_0_25px_rgba(212,160,64,0.7)] z-20">
        <svg viewBox="0 0 60 100" className="w-full h-full">
          {/* Iron Hood & Handle */}
          <path d="M 20 18 Q 30 6 40 18" stroke="#3d2c1d" strokeWidth="3" fill="none" />
          <rect x="18" y="18" width="24" height="8" rx="2" fill="#221810" stroke="#554028" strokeWidth="1.5" />
          {/* Glass Chamber with Kerosene Flame */}
          <rect x="15" y="26" width="30" height="42" rx="4" fill="rgba(255, 180, 80, 0.15)" stroke="#3d2c1d" strokeWidth="2" />
          <ellipse cx="30" cy="52" rx="6" ry="12" fill="#ffd77a" className="animate-pulse" />
          <ellipse cx="30" cy="54" rx="3" ry="7" fill="#fff" />
          {/* Iron Base */}
          <rect x="12" y="68" width="36" height="12" rx="3" fill="#18110b" stroke="#3d2c1d" strokeWidth="2" />
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
