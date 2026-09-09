'use client';

import React, { useRef, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface TiltCard3DProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  maxTilt?: number;
  scale?: number;
  glowColor?: 'cyan' | 'crimson' | 'amber' | 'purple' | 'emerald' | 'none';
  glare?: boolean;
  className?: string;
  innerClassName?: string;
}

export function TiltCard3D({
  children,
  maxTilt = 12,
  scale = 1.02,
  glowColor = 'cyan',
  glare = true,
  className = '',
  innerClassName = '',
  ...props
}: TiltCard3DProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [transformStyle, setTransformStyle] = useState<string>('');
  const [glarePosition, setGlarePosition] = useState<{ x: number; y: number; opacity: number }>({
    x: 50,
    y: 50,
    opacity: 0,
  });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;

      const tiltX = (0.5 - y) * maxTilt * 2;
      const tiltY = (x - 0.5) * maxTilt * 2;

      setTransformStyle(
        `perspective(1000px) rotateX(${tiltX.toFixed(2)}deg) rotateY(${tiltY.toFixed(2)}deg) scale3d(${scale}, ${scale}, ${scale})`
      );

      if (glare) {
        setGlarePosition({
          x: x * 100,
          y: y * 100,
          opacity: 0.2,
        });
      }
    },
    [maxTilt, scale, glare]
  );

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setTransformStyle('perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)');
    setGlarePosition((prev) => ({ ...prev, opacity: 0 }));
  };

  const glowStyles = {
    cyan: 'hover:shadow-[0_12px_35px_-5px_rgba(0,212,255,0.35),0_0_20px_rgba(0,212,255,0.2)] hover:border-cyan-400/50',
    crimson: 'hover:shadow-[0_12px_35px_-5px_rgba(255,23,68,0.35),0_0_20px_rgba(255,23,68,0.2)] hover:border-red-500/50',
    amber: 'hover:shadow-[0_12px_35px_-5px_rgba(245,158,11,0.35),0_0_20px_rgba(245,158,11,0.2)] hover:border-amber-400/50',
    purple: 'hover:shadow-[0_12px_35px_-5px_rgba(168,85,247,0.35),0_0_20px_rgba(168,85,247,0.2)] hover:border-purple-400/50',
    emerald: 'hover:shadow-[0_12px_35px_-5px_rgba(16,185,129,0.35),0_0_20px_rgba(16,185,129,0.2)] hover:border-emerald-400/50',
    none: '',
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: transformStyle,
        transformStyle: 'preserve-3d',
        transition: isHovered
          ? 'transform 0.08s ease-out'
          : 'transform 0.45s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.45s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
      className={cn(
        'relative rounded-2xl overflow-hidden will-change-transform',
        glowStyles[glowColor],
        className
      )}
      {...props}
    >
      {/* Dynamic Specular Holographic Glare Layer */}
      {glare && (
        <div
          className="pointer-events-none absolute inset-0 z-30 transition-opacity duration-300"
          style={{
            opacity: glarePosition.opacity,
            background: `radial-gradient(circle at ${glarePosition.x}% ${glarePosition.y}%, rgba(255, 255, 255, 0.45) 0%, rgba(0, 212, 255, 0.15) 35%, transparent 70%)`,
          }}
        />
      )}

      <div className={cn('relative z-10 h-full w-full', innerClassName)} style={{ transform: 'translateZ(12px)' }}>
        {children}
      </div>
    </div>
  );
}
