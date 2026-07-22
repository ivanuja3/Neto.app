import { Sidebar } from "@/components/sidebar";
import { AuthGuard } from "@/components/auth-guard";
import { GuidedTour } from "@/components/guided-tour";
import { GuitafixOfferModal } from "@/components/guitafix-offer-modal";
import { CompanyProvider } from "@/components/company-provider";
import { TrialBanner } from "@/components/trial-banner";
import { PageTransition } from "@/components/page-transition";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <CompanyProvider>
        <div className="flex h-screen overflow-hidden bg-[#080E1A]">
          <Sidebar />
          <main
            className="flex-1 overflow-y-auto overflow-x-hidden min-w-0 pt-14 lg:pt-0 relative flex flex-col"
            style={{
              backgroundImage: [
                "linear-gradient(to bottom, rgba(16,185,129,0.07) 0%, transparent 280px)",
                "radial-gradient(ellipse 60% 200px at 30% 0%, rgba(16,185,129,0.06) 0%, transparent 100%)",
              ].join(", "),
            }}
          >
            {/* Firma verde — línea de acento en el tope del contenido (solo desktop) */}
            <div className="hidden lg:block absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#10B981]/0 via-[#10B981]/40 to-[#10B981]/0 pointer-events-none" />
            <TrialBanner />
            <PageTransition>{children}</PageTransition>
          </main>
          <GuidedTour />
          <GuitafixOfferModal />
        </div>
      </CompanyProvider>
    </AuthGuard>
  );
}
