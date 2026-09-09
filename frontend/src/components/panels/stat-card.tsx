import { cn } from "@/lib/utils";

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  change?: string;
  trend?: "up" | "down" | "neutral";
  className?: string;
  onClick?: () => void;
}

export function StatCard({ icon, label, value, change, trend = "neutral", className, onClick }: StatCardProps) {
  return (
    <div 
      onClick={onClick}
      className={cn(
        "glass-card rounded-xl p-4 flex flex-col gap-2 transition-all duration-200",
        onClick ? "cursor-pointer card-3d hologram-shimmer group active:scale-[0.98] select-none" : "hover-lift-3d",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-white/5 text-crimenet-cyan group-hover:scale-110 group-hover:text-cyan-300 transition-all">
          {icon}
        </div>
        <span className="text-sm font-medium text-crimenet-muted uppercase tracking-wider group-hover:text-white transition-colors">{label}</span>
      </div>
      <div className="flex items-baseline justify-between mt-1">
        <span className="text-2xl font-bold text-white group-hover:text-crimenet-cyan transition-colors font-mono">{value}</span>
        {change && (
          <span className={cn(
            "text-xs font-semibold",
            trend === "up" ? "text-crimenet-crimson" : trend === "down" ? "text-green-400" : "text-crimenet-muted"
          )}>
            {trend === "up" ? "↑" : trend === "down" ? "↓" : "—"} {change}
          </span>
        )}
      </div>
    </div>
  );
}
