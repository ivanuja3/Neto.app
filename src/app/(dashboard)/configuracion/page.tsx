"use client";

import { useState } from "react";
import { Check, Store, Globe, FileText, Bell, CreditCard } from "lucide-react";

const TABS = [
  { id: "negocio", label: "Mi negocio", icon: Store },
  { id: "canales", label: "Canales de venta", icon: Globe },
  { id: "impuestos", label: "Datos fiscales", icon: FileText },
  { id: "notificaciones", label: "Alertas", icon: Bell },
  { id: "plan", label: "Plan y facturación", icon: CreditCard },
] as const;

type Tab = (typeof TABS)[number]["id"];

function SaveButton({ saved }: { saved: boolean }) {
  return (
    <button
      className={`flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg transition-colors ${
        saved
          ? "bg-[#10B981]/10 text-[#10B981]"
          : "bg-[#10B981] text-[#080E1A] hover:bg-[#0D9268]"
      }`}
    >
      {saved ? <><Check className="w-4 h-4" /> Guardado</> : "Guardar cambios"}
    </button>
  );
}

function InputField({ label, placeholder, type = "text", value, hint }: { label: string; placeholder?: string; type?: string; value?: string; hint?: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">{label}</label>
      <input
        type={type}
        defaultValue={value}
        placeholder={placeholder}
        className="w-full bg-[#080E1A] border border-white/[0.08] text-[#F1F5F9] placeholder-[#475569] rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-[#10B981]/50 transition-colors"
      />
      {hint && <p className="text-xs text-[#475569] mt-1">{hint}</p>}
    </div>
  );
}

function SelectField({ label, options, value }: { label: string; options: string[]; value?: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">{label}</label>
      <select defaultValue={value} className="w-full bg-[#080E1A] border border-white/[0.08] text-[#F1F5F9] rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-[#10B981]/50 transition-colors">
        {options.map((o) => <option key={o}>{o}</option>)}
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

function ChannelCard({ nombre, conectado, plataforma }: { nombre: string; conectado: boolean; plataforma: string }) {
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
        {conectado ? (
          <span className="text-xs font-semibold bg-[#10B981]/10 text-[#10B981] px-2 py-0.5 rounded">Conectado</span>
        ) : (
          <span className="text-xs text-[#475569]">Sin conectar</span>
        )}
        <button className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
          conectado
            ? "border-white/[0.06] text-[#94A3B8] hover:border-[#EF4444]/30 hover:text-[#EF4444]"
            : "border-[#10B981]/30 text-[#10B981] hover:bg-[#10B981]/5"
        }`}>
          {conectado ? "Desconectar" : "Conectar"}
        </button>
      </div>
    </div>
  );
}

export default function ConfiguracionPage() {
  const [tab, setTab] = useState<Tab>("negocio");
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="p-6 max-w-[1000px]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#F1F5F9] tracking-tight">Configuración</h1>
          <p className="text-sm text-[#64748B] mt-1">Personalizá Neto.app para tu negocio</p>
        </div>
        <SaveButton saved={saved} />
      </div>

      <div className="flex gap-6">
        {/* Sidebar tabs */}
        <div className="w-44 shrink-0">
          <nav className="space-y-0.5">
            {TABS.map(({ id, label, icon: Icon }) => (
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
              <div className="grid grid-cols-2 gap-4">
                <InputField label="Nombre del negocio" value="Mi Marca" />
                <InputField label="CUIT / CUIL" placeholder="20-12345678-9" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <SelectField label="Tipo de negocio" options={["Ecommerce", "Negocio físico", "Mixto"]} value="Mixto" />
                <SelectField label="Rubro" options={["Indumentaria", "Electrónica", "Alimentos", "Hogar", "Otro"]} value="Indumentaria" />
              </div>
              <InputField label="Moneda base" value="ARS (Peso Argentino)" hint="Podés ver métricas en USD usando el tipo de cambio del día." />
              <div className="grid grid-cols-2 gap-4">
                <SelectField label="Provincia fiscal" options={["Córdoba", "Buenos Aires", "Santa Fe", "Mendoza", "Otra"]} value="Córdoba" />
                <SelectField label="Condición frente al IVA" options={["Responsable Inscripto", "Monotributista", "Exento"]} />
              </div>
            </>
          )}

          {tab === "canales" && (
            <>
              <h2 className="text-sm font-semibold text-[#F1F5F9] border-b border-white/[0.06] pb-4">Canales de venta conectados</h2>
              <div className="space-y-3">
                <ChannelCard nombre="Mi tienda online" conectado plataforma="Tienda Nube" />
                <ChannelCard nombre="Perfil MercadoLibre" conectado plataforma="MercadoLibre" />
                <ChannelCard nombre="Local físico" conectado={false} plataforma="Punto de venta" />
                <ChannelCard nombre="Shopify store" conectado={false} plataforma="Shopify" />
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
                <InputField label="CUIT del contribuyente" placeholder="20-12345678-9" />
                <SelectField label="Categoría monotributo" options={["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K"]} value="H" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#94A3B8] mb-2">Jurisdicciones IIBB (Convenio Multilateral)</label>
                <div className="grid grid-cols-3 gap-2">
                  {["Córdoba", "Buenos Aires", "Santa Fe", "Mendoza", "Neuquén", "Tucumán"].map((j) => (
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
                <Toggle label="CM3 mensual negativo" description="Aviso inmediato si el margen neto cae a cero" defaultChecked />
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
            </>
          )}

          {/* Save button bottom */}
          <div className="pt-2 border-t border-white/[0.06] flex justify-end">
            <button
              onClick={handleSave}
              className={`flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg transition-colors ${
                saved
                  ? "bg-[#10B981]/10 text-[#10B981]"
                  : "bg-[#10B981] text-[#080E1A] hover:bg-[#0D9268]"
              }`}
            >
              {saved ? <><Check className="w-4 h-4" /> Guardado</> : "Guardar cambios"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
