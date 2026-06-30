import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Política de privacidad — Neto.app",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-base font-bold text-[#F1F5F9] mb-2">{title}</h2>
      <div className="text-sm text-[#94A3B8] leading-relaxed space-y-3">{children}</div>
    </section>
  );
}

export default function PrivacidadPage() {
  return (
    <div className="min-h-screen bg-[#080E1A]">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-[#10B981] hover:opacity-80 transition-opacity mb-8">
          <ArrowLeft className="w-3.5 h-3.5" /> Volver
        </Link>

        <h1 className="text-2xl font-bold text-[#F1F5F9] tracking-tight mb-1">Política de privacidad</h1>
        <p className="text-xs text-[#475569] mb-10">Última actualización: junio de 2026</p>

        <Section title="1. Qué datos recopilamos">
          <p>
            Recopilamos los datos que cargás directamente: información de tu cuenta (nombre, email), datos de tu
            negocio (razón social, CUIT, rubro) y los datos operativos que ingresás para usar el Servicio (ventas,
            costos, productos, proveedores, campañas publicitarias).
          </p>
        </Section>

        <Section title="2. Cómo usamos tus datos">
          <p>
            Usamos esta información exclusivamente para operar el Servicio: calcular tus métricas financieras,
            generar reportes, enviarte alertas que configures y brindarte soporte. No vendemos tus datos a terceros.
          </p>
        </Section>

        <Section title="3. Dónde se almacenan">
          <p>
            Tus datos se almacenan en infraestructura de Supabase, con controles de acceso a nivel de fila que
            garantizan que solo vos podés ver y modificar la información de tu cuenta.
          </p>
        </Section>

        <Section title="4. Cookies y sesión">
          <p>
            Utilizamos almacenamiento local del navegador para mantener tu sesión iniciada. No usamos cookies de
            seguimiento publicitario propias.
          </p>
        </Section>

        <Section title="5. Tus derechos">
          <p>
            Podés acceder, corregir o eliminar tus datos en cualquier momento desde Configuración, o solicitándolo a{" "}
            <a href="mailto:soporte@neto.app" className="text-[#10B981] hover:opacity-80">soporte@neto.app</a>. Si
            cancelás tu cuenta, tus datos se eliminan de acuerdo a nuestras políticas de retención.
          </p>
        </Section>

        <Section title="6. Terceros">
          <p>
            Si conectás canales de venta o publicidad (por ejemplo Meta Ads, Tienda Nube, MercadoLibre), compartimos
            con esos servicios únicamente lo necesario para sincronizar la información que vos autorices.
          </p>
        </Section>

        <Section title="7. Cambios en esta política">
          <p>
            Podemos actualizar esta política ocasionalmente. Los cambios importantes se notificarán por email o
            dentro de la aplicación.
          </p>
        </Section>

        <Section title="8. Contacto">
          <p>
            Para consultas sobre privacidad, escribinos a{" "}
            <a href="mailto:soporte@neto.app" className="text-[#10B981] hover:opacity-80">soporte@neto.app</a>.
          </p>
        </Section>
      </div>
    </div>
  );
}
