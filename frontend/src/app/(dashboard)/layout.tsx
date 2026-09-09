import { Sidebar } from "@/components/shared/sidebar";
import { DashboardShell } from "@/components/shared/dashboard-shell";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen w-full bg-crimenet-bg overflow-hidden">
      <Sidebar />
      <DashboardShell>
        {children}
      </DashboardShell>
    </div>
  );
}
