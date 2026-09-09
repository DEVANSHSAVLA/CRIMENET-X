import { cn } from "@/lib/utils";
import { TiltCard3D } from "@/components/shared/tilt-card-3d";

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  change?: string;
  trend?: "up" | "down" | "neutral";
  className?: string;
  glowColor?: 'cyan' | 'crimson' | 'amber' | 'purple' | 'emerald' | 'none';
  onClick?: () => void;
}

export function StatCard({ 
  icon, 
  label, 
  value, 
  change, 
  trend = "neutral", 
  className, 
  glowColor = "cyan",
  onClick 
}: StatCardProps) {
  return (
    <TiltCard3D
      onClick={onClick}
      glowColor={glowColor}
      maxTilt={10}
      scale={1.025}
      className={cn(
        "glass-card rounded-2xl p-4 border border-white/10 depth-3d-box transition-all cursor-pointer group select-none",
        className
      )}
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-crimenet-cyan group-hover:scale-110 group-hover:border-cyan-400/40 group-hover:text-cyan-300 transition-all shadow-inner">
            {icon}
          </div>
          <span className="text-xs font-mono font-bold text-crimenet-muted uppercase tracking-wider group-hover:text-white transition-colors">
            {label}
          </span>
        </div>
        <div className="flex items-baseline justify-between mt-1.5" style={{ transform: 'translateZ(8px)' }}>
          <span className="text-2xl font-bold text-white group-hover:text-crimenet-cyan transition-colors font-mono tracking-tight">
            {value}
          </span>
          {change && (
            <span className={cn(
              "text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border",
              trend === "up" 
                ? "bg-red-500/15 border-red-500/30 text-red-400" 
                : trend === "down" 
                ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400" 
                : "bg-white/5 border-white/10 text-crimenet-muted"
            )}>
              {trend === "up" ? "↑" : trend === "down" ? "↓" : "—"} {change}
            </span>
          )}
        </div>
      </div>
    </TiltCard3D>
  );
}
