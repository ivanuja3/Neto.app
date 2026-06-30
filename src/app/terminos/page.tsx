import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Términos de servicio — Neto.app",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-base font-bold text-[#F1F5F9] mb-2">{title}</h2>
      <div className="text-sm text-[#94A3B8] leading-relaxed space-y-3">{children}</div>
    </section>
  );
}

export default function TerminosPage() {
  return (
    <div className="min-h-screen bg-[#080E1A]">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-[#10B981] hover:opacity-80 transition-opacity mb-8">
          <ArrowLeft className="w-3.5 h-3.5" /> Volver
        </Link>

        <h1 className="text-2xl font-bold text-[#F1F5F9] tracking-tight mb-1">Términos de servicio</h1>
        <p className="text-xs text-[#475569] mb-10">Última actualización: junio de 2026</p>

        <Section title="1. Aceptación de los términos">
          <p>
            Al crear una cuenta y usar Neto.app (&quot;el Servicio&quot;), aceptás estos términos en su totalidad. Si no
            estás de acuerdo, no debés utilizar el Servicio.
          </p>
        </Section>

        <Section title="2. Descripción del servicio">
          <p>
            Neto.app es una herramienta de gestión financiera para negocios y ecommerce que permite registrar ventas,
            costos, márgenes y métricas de rentabilidad sobre datos cargados por el propio usuario. No constituye
            asesoramiento contable, impositivo ni legal profesional.
          </p>
        </Section>

        <Section title="3. Cuenta de usuario">
          <p>
            Sos responsable de mantener la confidencialidad de tu contraseña y de toda actividad que ocurra dentro de
            tu cuenta. Debés notificarnos de inmediato ante cualquier uso no autorizado.
          </p>
        </Section>

        <Section title="4. Planes, prueba gratuita y facturación">
          <p>
            Neto.app ofrece distintos planes pagos con un período de prueba gratuito inicial. Los precios, ciclos de
            facturación y medios de pago habilitados se muestran al momento de la contratación dentro de la
            aplicación. Podés cancelar tu suscripción en cualquier momento desde Configuración; la cancelación
            tiene efecto al final del período ya abonado.
          </p>
        </Section>

        <Section title="5. Uso aceptable">
          <p>
            No está permitido usar el Servicio para fines ilícitos, intentar vulnerar su seguridad, ni revender o
            redistribuir el acceso sin autorización expresa.
          </p>
        </Section>

        <Section title="6. Propiedad de los datos">
          <p>
            Los datos que cargás (ventas, costos, productos, información de tu negocio) son de tu propiedad. Vos
            sos responsable de su exactitud. Podés exportarlos o solicitar su eliminación en cualquier momento.
          </p>
        </Section>

        <Section title="7. Limitación de responsabilidad">
          <p>
            El Servicio se ofrece &quot;tal cual&quot;. No garantizamos disponibilidad ininterrumpida ni nos hacemos
            responsables por decisiones de negocio tomadas en base a la información generada por la plataforma.
          </p>
        </Section>

        <Section title="8. Modificaciones">
          <p>
            Podemos actualizar estos términos eventualmente. Si los cambios son sustanciales, te avisaremos por
            email o dentro de la aplicación.
          </p>
        </Section>

        <Section title="9. Ley aplicable">
          <p>Estos términos se rigen por las leyes de la República Argentina.</p>
        </Section>

        <Section title="10. Contacto">
          <p>
            Ante cualquier consulta sobre estos términos, escribinos a{" "}
            <a href="mailto:soporte@neto.app" className="text-[#10B981] hover:opacity-80">soporte@neto.app</a>.
          </p>
        </Section>
      </div>
    </div>
  );
}
