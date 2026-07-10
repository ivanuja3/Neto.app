"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Check, Store, Globe, FileText, Bell, CreditCard } from "lucide-react";
import { AsesoramientoProfesional } from "@/components/asesoramiento-profesional";
import { useAuth } from "@/components/auth-provider";
import { signOut } from "@/lib/auth";
import { getCompany, updateCompany } from "@/lib/db/companies";
import { getIntegrations, deleteIntegration, type Integration } from "@/lib/db/integrations";
import { useCompany } from "@/components/company-provider";
import { INDUSTRIAS } from "@/lib/constants";

const TABS_NEGOCIO = [
  { id: "negocio", label: "Mi negocio", icon: Store },
  { id: "canales", label: "Canales de venta", icon: Globe },
  { id: "impuestos", label: "Datos fiscales", icon: FileText },
] as const;

const TABS_CUENTA = [
  { id: "notificaciones", label: "Alertas", icon: Bell },
  { id: "plan", label: "Plan y facturación", icon: CreditCard },
] as const;

const TABS = [...TABS_NEGOCIO, ...TABS_CUENTA] as const;

type Tab = (typeof TABS)[number]["id"];

function InputField({ label, placeholder, type = "text", value, onChange, hint }: { label: string; placeholder?: string; type?: string; value?: string; onChange?: (v: string) => void; hint?: string }) {
  const controlled = onChange !== undefined;
  return (
    <div>
      <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">{label}</label>
      <input
        type={type}
        {...(controlled ? { value: value ?? "" } : { defaultValue: value })}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        placeholder={placeholder}
        className="w-full bg-[#080E1A] border border-white/[0.08] text-[#F1F5F9] placeholder-[#475569] rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-[#10B981]/50 transition-colors"
      />
      {hint && <p className="text-xs text-[#475569] mt-1">{hint}</p>}
    </div>
  );
}

function SelectField({ label, options, value, onChange }: { label: string; options: { label: string; value: string }[]; value?: string; onChange?: (v: string) => void }) {
  const controlled = onChange !== undefined;
  return (
    <div>
      <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">{label}</label>
      <select
        {...(controlled ? { value: value ?? "" } : { defaultValue: value })}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        className="w-full bg-[#080E1A] border border-white/[0.08] text-[#F1F5F9] rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-[#10B981]/50 transition-colors"
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function Toggle({ label, description, defaultChecked = false }: { label: string; description?: string; defaultChecked?: boolean }) {
  const [on, setOn] = useState(defaultChecked);
  return (
    <div className="flex items-center justify-between gap-4 py-3.5 border-b border-white/[0.04] last:border-b-0">
      <div>
        <p className="text-sm font-medium text-[#F1F5F9]">{label}</p>
        {description && <p className="text-xs text-[#475569] mt-0.5">{description}</p>}
      </div>
      <button
        onClick={() => setOn((v) => !v)}
        className={`relative w-10 h-5.5 rounded-full transition-colors shrink-0 ${on ? "bg-[#10B981]" : "bg-white/10"}`}
        style={{ height: "22px" }}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 rounded-full bg-white shadow transition-transform ${on ? "translate-x-4.5" : ""}`}
          style={{ width: "18px", height: "18px", transform: on ? "translateX(18px)" : "none" }}
        />
      </button>
    </div>
  );
}

function ChannelCard({
  nombre, conectado, plataforma, onConnect, onDisconnect, comingSoon,
}: {
  nombre: string;
  conectado: boolean;
  plataforma: string;
  onConnect?: () => void;
  onDisconnect?: () => void;
  comingSoon?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 bg-[#080E1A] rounded-xl p-4 border border-white/[0.06]">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center text-xs font-bold text-[#94A3B8]">
          {plataforma[0]}
        </div>
        <div>
          <p className="text-sm font-medium text-[#F1F5F9]">{nombre}</p>
          <p className="text-xs text-[#475569]">{plataforma}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {comingSoon ? (
          <span className="text-xs text-[#475569] italic">Próximamente</span>
        ) : conectado ? (
          <span className="text-xs font-semibold bg-[#10B981]/10 text-[#10B981] px-2 py-0.5 rounded">Conectado</span>
        ) : (
          <span className="text-xs text-[#475569]">Sin conectar</span>
        )}
        {!comingSoon && (
          <button
            onClick={conectado ? onDisconnect : onConnect}
            className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
              conectado
                ? "border-white/[0.06] text-[#94A3B8] hover:border-[#EF4444]/30 hover:text-[#EF4444]"
                : "border-[#10B981]/30 text-[#10B981] hover:bg-[#10B981]/5"
            }`}
          >
            {conectado ? "Desconectar" : "Conectar"}
          </button>
        )}
      </div>
    </div>
  );
}

const REGIMENES = [
  { label: "Responsable Inscripto", value: "responsable_inscripto" },
  { label: "Monotributista", value: "monotributista" },
  { label: "Exento", value: "exento" },
];

const MONEDAS = [
  { label: "ARS (Peso Argentino)", value: "ARS" },
  { label: "USD (Dólar)", value: "USD" },
];

function ConfiguracionPageInner() {
  const { user } = useAuth();
  const { refresh: refreshCompany } = useCompany();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("negocio");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingCompany, setLoadingCompany] = useState(true);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [tnToast, setTnToast] = useState<"success" | "error" | null>(null);

  const [name, setName] = useState("");
  const [cuit, setCuit] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [industry, setIndustry] = useState("ecommerce");
  const [taxRegime, setTaxRegime] = useState("responsable_inscripto");
  const [currency, setCurrency] = useState("ARS");

  const loadIntegrations = useCallback(async () => {
    if (!user) return;
    try {
      const data = await getIntegrations(user.id);
      setIntegrations(data);
    } catch (err) {
      console.error("loadIntegrations error:", err);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getCompany(user.id).then((c) => {
      if (cancelled) return;
      if (c) {
        setName(c.name ?? "");
        setCuit(c.cuit ?? "");
        setEmail(c.email ?? "");
        setPhone(c.phone ?? "");
        setAddress(c.address ?? "");
        setIndustry(c.industry ?? "ecommerce");
        setTaxRegime(c.tax_regime ?? "responsable_inscripto");
        setCurrency(c.currency ?? "ARS");
      }
      setLoadingCompany(false);
    }).catch(() => {
      if (!cancelled) setLoadingCompany(false);
    });
    loadIntegrations();
    return () => { cancelled = true; };
  }, [user, loadIntegrations]);

  // Manejar redirect de OAuth
  useEffect(() => {
    const connected = searchParams.get("connected");
    const error = searchParams.get("error");
    if (connected === "tiendanube") {
      setTab("canales");
      setTnToast("success");
      loadIntegrations();
      router.replace("/configuracion");
      setTimeout(() => setTnToast(null), 4000);
    } else if (error?.startsWith("tn_")) {
      setTab("canales");
      setTnToast("error");
      router.replace("/configuracion");
      setTimeout(() => setTnToast(null), 4000);
    }
  }, [searchParams, loadIntegrations, router]);

  const tnConnected = integrations.some((i) => i.channel === "tiendanube");

  async function handleDisconnectTN() {
    if (!user) return;
    const { error } = await deleteIntegration(user.id, "tiendanube");
    if (error) {
      setTnToast("error");
      setTimeout(() => setTnToast(null), 4000);
      return;
    }
    await loadIntegrations();
  }

  async function handleSave() {
    if (tab === "negocio" && user) {
      setSaving(true);
      try {
        await updateCompany(user.id, {
          name,
          cuit: cuit || null,
          email: email || null,
          phone: phone || null,
          address: address || null,
          industry,
          tax_regime: taxRegime,
          currency,
        });
        setSaved(true);
        refreshCompany();
        setTimeout(() => setSaved(false), 2500);
      } catch (err) {
        console.error("handleSave error:", err);
        setTnToast("error");
        setTimeout(() => setTnToast(null), 4000);
      } finally {
        setSaving(false);
      }
      return;
    }

    // otros tabs no tienen persistencia todavía — no mostrar "Guardado"
  }

  async function handleSignOut() {
    await signOut();
    window.location.href = "/login";
  }

  return (
    <div className="p-6 max-w-[1000px]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#F1F5F9] tracking-tight">Configuración</h1>
          <p className="text-sm text-[#64748B] mt-1">Personalizá Neto.app para tu negocio</p>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Sidebar tabs */}
        <div className="w-44 shrink-0">
          <nav className="space-y-0.5">
            <p className="text-[10px] font-semibold text-[#475569] uppercase tracking-wider px-3 pb-1.5">Mi negocio</p>
            {TABS_NEGOCIO.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors text-left ${
                  tab === id
                    ? "bg-[#10B981]/10 text-[#10B981]"
                    : "text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-white/[0.04]"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </button>
            ))}
            <p className="text-[10px] font-semibold text-[#475569] uppercase tracking-wider px-3 pb-1.5 pt-4">Mi cuenta</p>
            {TABS_CUENTA.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors text-left ${
                  tab === id
                    ? "bg-[#10B981]/10 text-[#10B981]"
                    : "text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-white/[0.04]"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 bg-[#0C1424] border border-white/[0.06] rounded-xl p-6 space-y-5">
          {tab === "negocio" && (
            <>
              <h2 className="text-sm font-semibold text-[#F1F5F9] border-b border-white/[0.06] pb-4">Datos del negocio</h2>
              {loadingCompany ? (
                <p className="text-sm text-[#475569]">Cargando...</p>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <InputField label="Nombre del negocio" value={name} onChange={setName} />
                    <InputField label="CUIT / CUIL" placeholder="20-12345678-9" value={cuit} onChange={setCuit} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <InputField label="Email de contacto" type="email" placeholder="contacto@minegocio.com" value={email} onChange={setEmail} />
                    <InputField label="WhatsApp" placeholder="11 2345 6789" value={phone} onChange={setPhone} hint="Sin el 0 ni el 15. Ej: 11 2345 6789" />
                  </div>
                  <InputField label="Dirección" placeholder="Calle 123, Córdoba" value={address} onChange={setAddress} />
                  <div className="grid grid-cols-2 gap-4">
                    <SelectField label="Rubro" options={INDUSTRIAS} value={industry} onChange={setIndustry} />
                    <SelectField label="Condición frente al IVA" options={REGIMENES} value={taxRegime} onChange={setTaxRegime} />
                  </div>
                  <SelectField label="Moneda base" options={MONEDAS} value={currency} onChange={setCurrency} />
                </>
              )}
            </>
          )}

          {tab === "canales" && (
            <>
              <h2 className="text-sm font-semibold text-[#F1F5F9] border-b border-white/[0.06] pb-4">Canales de venta conectados</h2>

              {tnToast === "success" && (
                <div className="flex items-center gap-2 bg-[#10B981]/10 border border-[#10B981]/20 text-[#10B981] text-sm px-4 py-2.5 rounded-lg">
                  <Check className="w-4 h-4 shrink-0" />
                  Tienda Nube conectada exitosamente
                </div>
              )}
              {tnToast === "error" && (
                <div className="bg-[#EF4444]/10 border border-[#EF4444]/20 text-[#EF4444] text-sm px-4 py-2.5 rounded-lg">
                  No se pudo conectar Tienda Nube. Intentá de nuevo.
                </div>
              )}

              <div className="space-y-3">
                <ChannelCard
                  nombre="Mi tienda online"
                  plataforma="Tienda Nube"
                  conectado={tnConnected}
                  onConnect={() => { if (user?.id) window.location.href = `/api/auth/tiendanube/connect?uid=${user.id}`; }}
                  onDisconnect={handleDisconnectTN}
                />
                <ChannelCard nombre="Perfil MercadoLibre" conectado={false} plataforma="MercadoLibre" comingSoon />
                <ChannelCard nombre="Meta Ads" conectado={false} plataforma="Meta" comingSoon />
                <ChannelCard nombre="Shopify store" conectado={false} plataforma="Shopify" comingSoon />
              </div>
              <div className="mt-4 p-4 bg-[#080E1A] rounded-xl border border-dashed border-white/[0.1] text-center">
                <p className="text-sm text-[#94A3B8]">¿Vendés en otro canal?</p>
                <button className="text-sm text-[#10B981] font-medium mt-1 hover:opacity-80">Agregar canal personalizado +</button>
              </div>
            </>
          )}

          {tab === "impuestos" && (
            <>
              <h2 className="text-sm font-semibold text-[#F1F5F9] border-b border-white/[0.06] pb-4">Configuración fiscal</h2>
              <div className="grid grid-cols-2 gap-4">
                <InputField label="CUIT del contribuyente" placeholder="20-12345678-9" value={cuit} onChange={setCuit} />
                <SelectField
                  label="Categoría monotributo"
                  options={["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K"].map((l) => ({ label: l, value: l }))}
                  value="H"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#94A3B8] mb-2">Jurisdicciones IIBB (Convenio Multilateral)</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    "Buenos Aires", "CABA", "Catamarca", "Chaco", "Chubut",
                    "Córdoba", "Corrientes", "Entre Ríos", "Formosa", "Jujuy",
                    "La Pampa", "La Rioja", "Mendoza", "Misiones", "Neuquén",
                    "Río Negro", "Salta", "San Juan", "San Luis", "Santa Cruz",
                    "Santa Fe", "Santiago del Estero", "Tierra del Fuego", "Tucumán",
                  ].map((j) => (
                    <label key={j} className="flex items-center gap-2 text-xs text-[#94A3B8] cursor-pointer">
                      <input type="checkbox" defaultChecked={["Córdoba", "Buenos Aires", "Santa Fe"].includes(j)}
                        className="accent-[#10B981]" />
                      {j}
                    </label>
                  ))}
                </div>
              </div>
              <InputField label="Alícuota IIBB Córdoba (%)" value="2.5" type="number" hint="Tasa para comercio electrónico en Córdoba 2026" />
            </>
          )}

          {tab === "notificaciones" && (
            <>
              <h2 className="text-sm font-semibold text-[#F1F5F9] border-b border-white/[0.06] pb-4">Alertas automáticas</h2>
              <div>
                <Toggle label="ROAS Real cae por debajo del objetivo" description="Recibís alerta cuando el ROAS real baja del umbral configurado" defaultChecked />
                <Toggle label="Margen Neto mensual negativo" description="Aviso inmediato si el margen neto cae a cero" defaultChecked />
                <Toggle label="Vencimientos fiscales (7 días de anticipación)" defaultChecked />
                <Toggle label="Flujo de caja negativo semanal" description="Alerta si las salidas superan entradas en la semana" defaultChecked />
                <Toggle label="Reporte semanal por email" description="Resumen de KPIs enviado todos los lunes" />
                <Toggle label="Reporte mensual por email" />
              </div>
              <InputField label="Email para alertas" value="ivan@tuempresa.com" type="email" />
              <InputField label="Umbral ROAS Real mínimo" value="2.0" type="number" hint="Se envía alerta cuando el ROAS Real cae por debajo de este valor" />
            </>
          )}

          {tab === "plan" && (
            <>
              <h2 className="text-sm font-semibold text-[#F1F5F9] border-b border-white/[0.06] pb-4">Plan actual</h2>
              <div className="bg-[#080E1A] rounded-xl border border-[#10B981]/20 p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-[#F1F5F9]">Plan Pro</span>
                      <span className="text-xs bg-[#10B981]/15 text-[#10B981] font-bold px-2 py-0.5 rounded">Activo</span>
                    </div>
                    <p className="text-sm text-[#94A3B8] mt-1">Órdenes ilimitadas · IA incluida · Impuestos AR</p>
                    <p className="text-xs text-[#475569] mt-2">Próxima facturación: 15/07/2026</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold font-mono text-[#F1F5F9]">$29</p>
                    <p className="text-xs text-[#475569]">USD / mes</p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">Facturación</p>
                <div className="flex items-center justify-between py-2 border-b border-white/[0.04]">
                  <span className="text-sm text-[#94A3B8]">15/06/2026</span>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-[#F1F5F9] font-mono">$29 USD</span>
                    <span className="text-xs bg-[#10B981]/10 text-[#10B981] px-2 py-0.5 rounded">Pagado</span>
                  </div>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-[#94A3B8]">15/05/2026</span>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-[#F1F5F9] font-mono">$29 USD</span>
                    <span className="text-xs bg-[#10B981]/10 text-[#10B981] px-2 py-0.5 rounded">Pagado</span>
                  </div>
                </div>
              </div>
              <button className="text-sm text-[#EF4444] hover:opacity-80 transition-opacity font-medium">
                Cancelar suscripción
              </button>

              <div className="pt-4 border-t border-white/[0.06]">
                <p className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-3">Cuenta</p>
                <button
                  onClick={handleSignOut}
                  className="text-sm text-[#94A3B8] hover:text-[#F1F5F9] transition-colors font-medium"
                >
                  Cerrar sesión
                </button>
              </div>
            </>
          )}

          {/* Save button bottom */}
          {tab !== "plan" && (
            <div className="pt-2 border-t border-white/[0.06] flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving}
                className={`flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-60 ${
                  saved
                    ? "bg-[#10B981]/10 text-[#10B981]"
                    : "bg-[#10B981] text-[#080E1A] hover:bg-[#0D9268]"
                }`}
              >
                {saved ? <><Check className="w-4 h-4" /> Guardado</> : saving ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="px-6 pb-6 mt-4">
        <AsesoramientoProfesional />
      </div>
    </div>
  );
}

export default function ConfiguracionPage() {
  return (
    <Suspense>
      <ConfiguracionPageInner />
    </Suspense>
  );
}
