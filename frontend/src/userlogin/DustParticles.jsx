import React from 'react';

export default function DustParticles() {
  const particles = [
    { top: '15%', left: '20%', delay: '0s', duration: '9s', size: '2px' },
    { top: '35%', left: '75%', delay: '2s', duration: '12s', size: '3px' },
    { top: '65%', left: '10%', delay: '4s', duration: '8s', size: '2px' },
    { top: '80%', left: '85%', delay: '1s', duration: '11s', size: '2px' },
    { top: '25%', left: '50%', delay: '5s', duration: '14s', size: '4px' },
    { top: '55%', left: '40%', delay: '3s', duration: '10s', size: '3px' },
    { top: '70%', left: '60%', delay: '6s', duration: '13s', size: '2px' },
    { top: '10%', left: '90%', delay: '7s', duration: '15s', size: '3px' },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {particles.map((p, idx) => (
        <div
          key={idx}
          className="absolute rounded-full bg-[#ffaa55] opacity-25 dust-mote blur-[0.5px]"
          style={{
            top: p.top,
            left: p.left,
            width: p.size,
            height: p.size,
            animationDelay: p.delay,
            animationDuration: p.duration,
          }}
        />
      ))}
    </div>
  );
}
