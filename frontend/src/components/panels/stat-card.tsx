import { cn } from "@/lib/utils";

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  change?: string;
  trend?: "up" | "down" | "neutral";
  className?: string;
}

export function StatCard({ icon, label, value, change, trend = "neutral", className }: StatCardProps) {
  return (
    <div className={cn("glass-card rounded-xl p-4 flex flex-col gap-2 hover:bg-white/5 transition-colors", className)}>
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-white/5 text-crimenet-cyan">
          {icon}
        </div>
        <span className="text-sm font-medium text-crimenet-muted uppercase tracking-wider">{label}</span>
      </div>
      <div className="flex items-baseline justify-between mt-1">
        <span className="text-2xl font-bold text-white">{value}</span>
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
