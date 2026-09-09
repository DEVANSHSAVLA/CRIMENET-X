import { cn } from "@/lib/utils";

interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  glowColor?: "cyan" | "crimson" | "amber" | "none";
  title?: string;
}

export function GlassPanel({ children, className, glowColor = "none", title, ...props }: GlassPanelProps) {
  const glowClass = glowColor !== "none" ? `glow-${glowColor}` : "";

  return (
    <div 
      className={cn(
        "glass-panel rounded-2xl overflow-hidden flex flex-col transition-all duration-300 depth-3d-box hover:border-white/30 hover:shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_30px_rgba(0,212,255,0.12)] border border-white/10", 
        glowClass, 
        className
      )} 
      {...props}
    >
      {title && (
        <div className="border-b border-white/10 bg-white/5 px-4 py-2.5 flex items-center justify-between">
          <h3 className="text-xs font-mono font-bold tracking-wider text-crimenet-cyan uppercase flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-crimenet-cyan animate-pulse" />
            {title}
          </h3>
          <span className="text-[9px] font-mono text-crimenet-muted opacity-60">CRIMENET-3D</span>
        </div>
      )}
      <div className="flex-1 p-4 overflow-y-auto scrollbar-dark">
        {children}
      </div>
    </div>
  );
}
