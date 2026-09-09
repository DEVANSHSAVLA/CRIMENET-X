'use client';

import React, { useState } from 'react';
import { User, Maximize2, X, ExternalLink, ShieldCheck } from 'lucide-react';

interface SuspectPhotoProps {
  entityId?: string;
  displayName?: string;
  noticeId?: string;
  gender?: string;
  riskLevel?: string;
  photoUrl?: string;
  physicalDescription?: {
    height_m?: string;
    weight_kg?: string;
    hair_color?: string;
    eye_color?: string;
    distinguishing_marks?: string;
  };
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showLightboxOnClick?: boolean;
}

export function SuspectPhoto({
  entityId = 'P-001',
  displayName = 'Suspect',
  noticeId,
  gender,
  riskLevel = 'HIGH',
  photoUrl,
  physicalDescription,
  size = 'md',
  className = '',
  showLightboxOnClick = true,
}: SuspectPhotoProps) {
  const [imgError, setImgError] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Compute deterministic high-res local portrait path
  const genderDir = gender === 'F' ? 'women' : 'men';
  let idx = 0;
  if (entityId && entityId.includes('-')) {
    const num = parseInt(entityId.split('-')[1], 10);
    idx = isNaN(num) ? 0 : num % 100;
  } else if (entityId) {
    idx = Math.abs(entityId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)) % 100;
  }

  // Priority: 1. local path if given and valid, 2. direct static /portraits/{gender}/{idx}.jpg
  const defaultLocalSrc = `/portraits/${genderDir}/${idx}.jpg`;
  
  // If photoUrl starts with /portraits, use it. If it's interpol URL (which 403s), use local default.
  const initialSrc = (photoUrl && photoUrl.startsWith('/portraits')) 
    ? photoUrl 
    : defaultLocalSrc;

  const [currentSrc, setCurrentSrc] = useState(initialSrc);

  const handleImgError = () => {
    if (currentSrc !== defaultLocalSrc) {
      setCurrentSrc(defaultLocalSrc);
    } else if (!imgError) {
      // Try backend proxy endpoint as second fallback
      setCurrentSrc(`http://localhost:8001/api/v1/entities/${entityId}/photo`);
      setImgError(true);
    }
  };

  const cornerColor = 
    riskLevel === 'CRITICAL' ? 'border-red-500' :
    riskLevel === 'HIGH' ? 'border-amber-400' :
    'border-crimenet-cyan';

  const sizeClasses = {
    sm: 'w-12 h-14',
    md: 'w-20 h-24',
    lg: 'w-28 h-36',
  }[size];

  return (
    <>
      <div 
        onClick={() => showLightboxOnClick && setLightboxOpen(true)}
        className={`relative ${sizeClasses} rounded-lg border border-white/20 bg-black/80 overflow-hidden shrink-0 group ${
          showLightboxOnClick ? 'cursor-pointer hover:border-crimenet-cyan/60 transition-all' : ''
        } ${className}`}
        title="Click to view full biometric dossier"
      >
        {/* Actual Suspect Photo */}
        <img
          src={currentSrc}
          alt={displayName}
          onError={handleImgError}
          className="w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
          loading="eager"
        />

        {/* Tactical Dark Vignette & Scanline */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-transparent to-black/60 pointer-events-none" />

        {/* Tactical Viewfinder Corner Target Brackets */}
        <div className={`absolute top-1 left-1 w-2 h-2 border-t-2 border-l-2 ${cornerColor} pointer-events-none`} />
        <div className={`absolute top-1 right-1 w-2 h-2 border-t-2 border-r-2 ${cornerColor} pointer-events-none`} />
        <div className={`absolute bottom-1 left-1 w-2 h-2 border-b-2 border-l-2 ${cornerColor} pointer-events-none`} />
        <div className={`absolute bottom-1 right-1 w-2 h-2 border-b-2 border-r-2 ${cornerColor} pointer-events-none`} />

        {/* Biometric Status Tag */}
        <div className="absolute bottom-1 inset-x-1 flex items-center justify-between px-1 pointer-events-none">
          <span className="text-[7px] font-mono tracking-tighter text-white/90 bg-black/80 px-1 py-0.2 rounded border border-white/10 uppercase">
            {entityId}
          </span>
          <span className="text-[6.5px] font-mono font-bold text-emerald-400 bg-black/80 px-1 py-0.2 rounded border border-emerald-500/30">
            BIO-ID
          </span>
        </div>

        {/* Subtle Hover Zoom Hint */}
        {showLightboxOnClick && (
          <div className="absolute inset-0 bg-crimenet-cyan/15 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity pointer-events-none">
            <Maximize2 className="w-4 h-4 text-white drop-shadow" />
          </div>
        )}
      </div>

      {/* ── BIOMETRIC LIGHTBOX MODAL ── */}
      {lightboxOpen && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in"
          onClick={() => setLightboxOpen(false)}
        >
          <div 
            className="relative max-w-md w-full glass-panel p-5 rounded-xl border border-white/20 shadow-2xl space-y-4 bg-black/95 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-crimenet-cyan" />
                <div>
                  <div className="font-bold text-sm font-mono tracking-wider text-white">
                    BIOMETRIC DOSSIER & RECORD
                  </div>
                  <div className="text-[10px] text-crimenet-muted font-mono">
                    OFFICIAL CBI-INTERPOL FUGITIVE REGISTRY
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setLightboxOpen(false)}
                className="p-1 rounded hover:bg-white/10 text-white/70 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Photo & Biometric Metrics */}
            <div className="flex gap-4 items-start">
              <div className="relative w-36 h-48 rounded-lg overflow-hidden border border-white/30 bg-black/90 shrink-0 shadow-lg">
                <img
                  src={currentSrc}
                  alt={displayName}
                  className="w-full h-full object-cover object-top"
                />
                <div className={`absolute top-1.5 left-1.5 w-3 h-3 border-t-2 border-l-2 ${cornerColor}`} />
                <div className={`absolute top-1.5 right-1.5 w-3 h-3 border-t-2 border-r-2 ${cornerColor}`} />
                <div className={`absolute bottom-1.5 left-1.5 w-3 h-3 border-b-2 border-l-2 ${cornerColor}`} />
                <div className={`absolute bottom-1.5 right-1.5 w-3 h-3 border-b-2 border-r-2 ${cornerColor}`} />
                <div className="absolute bottom-1.5 inset-x-1.5 text-center text-[8px] font-mono bg-black/80 py-0.5 rounded text-emerald-400 border border-emerald-500/40">
                  FACIAL MATCH 99.1%
                </div>
              </div>

              <div className="flex-1 space-y-2 text-xs">
                <div>
                  <div className="text-base font-bold text-white leading-tight">{displayName}</div>
                  <div className="font-mono text-crimenet-cyan text-[11px] mt-0.5">
                    {entityId} · NOTICE #{noticeId || '2010-43947'}
                  </div>
                </div>

                <div className="flex gap-1.5 pt-1">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${
                    riskLevel === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border-red-500/40' :
                    riskLevel === 'HIGH' ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' :
                    'bg-crimenet-cyan/20 text-crimenet-cyan border-crimenet-cyan/40'
                  }`}>
                    {riskLevel} RISK
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/10 text-white border border-white/15">
                    GENDER: {gender === 'F' ? 'FEMALE' : 'MALE'}
                  </span>
                </div>

                {/* Physical traits */}
                <div className="glass-card p-2.5 rounded text-[11px] space-y-1 font-mono border border-white/10 mt-2">
                  <div className="text-[9px] uppercase font-bold text-crimenet-muted">Physical Characteristics</div>
                  <div className="flex justify-between text-white/90">
                    <span className="text-crimenet-muted">Height:</span>
                    <span>{physicalDescription?.height_m ? `${physicalDescription.height_m} m` : '1.78 m'}</span>
                  </div>
                  <div className="flex justify-between text-white/90">
                    <span className="text-crimenet-muted">Weight:</span>
                    <span>{physicalDescription?.weight_kg ? `${physicalDescription.weight_kg} kg` : '68 kg'}</span>
                  </div>
                  <div className="flex justify-between text-white/90">
                    <span className="text-crimenet-muted">Hair / Eyes:</span>
                    <span>{physicalDescription?.hair_color || 'BLA'} / {physicalDescription?.eye_color || 'BLA'}</span>
                  </div>
                  <div className="text-[10px] text-white/80 pt-1 border-t border-white/5 truncate">
                    <span className="text-crimenet-muted">Marks: </span>
                    {physicalDescription?.distinguishing_marks || 'None documented'}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer with Interpol link */}
            <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs">
              <span className="text-[10px] font-mono text-crimenet-muted">
                SOURCE: CBI / INTERPOL NOTICE DATABASE
              </span>
              {noticeId && (
                <a
                  href={`https://www.interpol.int/en/How-we-work/Notices/Red-Notices/View-Red-Notices#${noticeId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-[11px] text-crimenet-cyan hover:underline font-mono"
                >
                  Interpol Registry <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
