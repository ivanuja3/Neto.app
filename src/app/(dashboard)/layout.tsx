import { Sidebar } from "@/components/sidebar";
import { AsesoramientoProfesional } from "@/components/asesoramiento-profesional";
import { AuthGuard } from "@/components/auth-guard";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden bg-[#080E1A]">
        <Sidebar />
        <main
          className="flex-1 overflow-y-auto overflow-x-hidden min-w-0 pt-14 lg:pt-0"
          style={{
            backgroundImage:
              "linear-gradient(to bottom, rgba(16,185,129,0.035) 0%, transparent 220px)",
          }}
        >
          {children}
          <AsesoramientoProfesional />
        </main>
      </div>
    </AuthGuard>
  );
}
