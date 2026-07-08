"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { getCustomers, createCustomer } from "@/lib/db/purchases";
import { Modal, Field, inputCls, SaveButton } from "@/components/ui/modal";
import { PlusCircle, Users, DollarSign } from "lucide-react";
import { formatARS } from "@/lib/mock-data";

type Customer = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  active: boolean;
};

type ClienteRow = {
  id: string;
  nombre: string;
  celular: string;
  documento: string;
  porCobrar: number;
};

function FormCliente({ userId, onSaved, onClose }: { userId: string; onSaved: () => void; onClose: () => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ nombre: "", email: "", celular: "", documento: "" });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nombre.trim()) { setError("El nombre es obligatorio"); return; }
    setSaving(true);
    setError("");
    const { error: dbErr } = await createCustomer({
      user_id: userId,
      name: form.nombre.trim(),
      type: "customer",
      email: form.email.trim() || null,
      phone: form.celular.trim() || null,
      notes: form.documento.trim() || null,
    });
    if (dbErr) { setError("Error al guardar. Intentá de nuevo."); setSaving(false); return; }
    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Nombre o razón social">
        <input value={form.nombre} onChange={(e) => set("nombre", e.target.value)}
          placeholder="Ej: Juan García" className={inputCls} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Email">
          <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)}
            placeholder="cliente@mail.com" className={inputCls} />
        </Field>
        <Field label="Celular">
          <input value={form.celular} onChange={(e) => set("celular", e.target.value)}
            placeholder="+54 9 11 ..." className={inputCls} />
        </Field>
      </div>
      <Field label="DNI / CUIT (opcional)">
        <input value={form.documento} onChange={(e) => set("documento", e.target.value)}
          placeholder="20-12345678-9" className={inputCls} />
      </Field>
      {error && <p className="text-xs text-[#EF4444] bg-[#EF4444]/[0.08] border border-[#EF4444]/20 rounded-lg px-3 py-2">{error}</p>}
      <SaveButton saving={saving} label="Agregar cliente" />
    </form>
  );
}

export default function ClientesPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [modal, setModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = () => setRefreshKey((k) => k + 1);

  useEffect(() => {
    if (!user) return;
    getCustomers(user.id).then((res) => {
      setCustomers(res.data ?? []);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  }, [user, refreshKey]);

  const clientes: ClienteRow[] = customers.map((c) => ({
    id: c.id,
    nombre: c.name,
    celular: c.phone ?? "—",
    documento: c.notes ?? "—",
    porCobrar: 0,
  }));

  const totalPorCobrar = clientes.reduce((s, c) => s + c.porCobrar, 0);
  const conDeuda = clientes.filter((c) => c.porCobrar > 0).length;

  return (
    <div className="p-6 pb-12 space-y-6 max-w-[1200px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#F1F5F9] tracking-tight">Clientes</h1>
          {!loading && (
            <div className="flex items-center gap-4 mt-1.5">
              <span className="text-sm text-[#64748B]">
                Total de clientes <span className="text-[#F1F5F9] font-semibold ml-1">{clientes.length}</span>
              </span>
              <span className="text-[#334155]">|</span>
              <span className="text-sm text-[#64748B]">
                Total por cobrar{" "}
                <span className={`font-semibold ml-1 ${totalPorCobrar > 0 ? "text-[#F59E0B]" : "text-[#10B981]"}`}>
                  {formatARS(totalPorCobrar)}
                </span>
              </span>
            </div>
          )}
        </div>
        <button
          onClick={() => setModal(true)}
          className="flex items-center gap-2 text-sm bg-[#10B981] text-[#080E1A] font-semibold px-4 py-2 rounded-lg hover:bg-[#0D9268] transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          Agregar cliente
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-[#0C1424] border border-white/[0.06] rounded-xl p-5 animate-pulse">
            <div className="h-3.5 bg-white/[0.07] rounded w-24 mb-3" />
            <div className="h-7 bg-white/[0.07] rounded w-28 mb-2" />
            <div className="h-3 bg-white/[0.07] rounded w-20" />
          </div>
        )) : (
          [
            {
              label: "Total de clientes",
              value: String(clientes.length),
              sub: "registrados en el sistema",
              color: "#3B82F6",
              icon: Users,
            },
            {
              label: "Total por cobrar",
              value: formatARS(totalPorCobrar),
              sub: "saldo pendiente total",
              color: totalPorCobrar > 0 ? "#F59E0B" : "#10B981",
              icon: DollarSign,
            },
            {
              label: "Clientes con deuda",
              value: String(conDeuda),
              sub: conDeuda === 0 ? "todos al día" : `de ${clientes.length} clientes`,
              color: conDeuda > 0 ? "#EF4444" : "#10B981",
              icon: Users,
            },
          ].map((k) => {
            const Icon = k.icon;
            return (
              <div key={k.label} className="bg-[#0C1424] border border-white/[0.06] rounded-xl p-5 hover:border-white/[0.12] transition-colors cursor-default">
                <p className="text-sm text-[#94A3B8]">{k.label}</p>
                <p className="text-2xl font-bold font-mono mt-3" style={{ color: k.color }}>{k.value}</p>
                <p className="text-xs text-[#475569] mt-1">{k.sub}</p>
              </div>
            );
          })
        )}
      </div>

      {/* Tabla */}
      <div className="bg-[#0C1424] border border-white/[0.06] rounded-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <h2 className="text-sm font-semibold text-[#F1F5F9]">Directorio de clientes</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.04]">
                {["Estado", "Nombre", "Celular", "Documento", "Total por cobrar", ""].map((col) => (
                  <th key={col} className="text-left text-xs font-medium text-[#475569] px-5 py-3">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-white/[0.04]">
                    {Array.from({ length: 6 }).map((__, j) => (
                      <td key={j} className="px-5 py-3.5"><div className="h-4 bg-white/[0.06] rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : clientes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white/[0.04] flex items-center justify-center">
                        <Users className="w-5 h-5 text-[#475569]" />
                      </div>
                      <p className="text-sm text-[#475569]">Todavía no tenés clientes registrados</p>
                      <button onClick={() => setModal(true)}
                        className="text-xs text-[#10B981] hover:opacity-80 transition-opacity font-semibold">
                        + Agregar primer cliente
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                clientes.map((c, i) => (
                  <tr key={c.id} className={`hover:bg-white/[0.02] transition-colors ${i < clientes.length - 1 ? "border-b border-white/[0.04]" : ""}`}>
                    <td className="px-5 py-3.5">
                      <span className={`w-2 h-2 rounded-full inline-block ${c.porCobrar > 0 ? "bg-[#EF4444]" : "bg-[#10B981]"}`} />
                    </td>
                    <td className="px-5 py-3.5 text-[13px] font-medium text-[#F1F5F9]">{c.nombre}</td>
                    <td className="px-5 py-3.5 text-[12px] text-[#94A3B8]">{c.celular}</td>
                    <td className="px-5 py-3.5 text-[12px] text-[#94A3B8]">{c.documento}</td>
                    <td className="px-5 py-3.5 font-mono text-[12px]">
                      <span style={{ color: c.porCobrar > 0 ? "#F59E0B" : "#10B981" }}>
                        {c.porCobrar > 0 ? formatARS(c.porCobrar) : "Al día"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <button className="text-[11px] text-[#475569] hover:text-[#94A3B8] transition-colors">Detalle</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && clientes.length > 0 && (
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-white/[0.06] bg-white/[0.02]">
            <span className="text-sm font-semibold text-[#94A3B8]">{clientes.length} clientes</span>
            <span className="text-sm font-mono font-bold text-[#F59E0B]">
              {formatARS(totalPorCobrar)}{" "}
              <span className="text-[#475569] font-normal">por cobrar</span>
            </span>
          </div>
        )}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Agregar cliente">
        <FormCliente userId={user?.id ?? ""} onSaved={refresh} onClose={() => setModal(false)} />
      </Modal>
    </div>
  );
}
