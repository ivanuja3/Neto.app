"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import {
  getCostCenters, createCostCenter, renameCostCenter, setCostCenterActive,
  getCostCenterTransfers, createCostCenterTransfer, deleteCostCenterTransfer, computeBalances,
} from "@/lib/db/cost-centers";
import { getOrders } from "@/lib/db/orders";
import { getExpenses } from "@/lib/db/analytics";
import { Modal, Field, inputCls, selectCls, SaveButton } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { PlusCircle, Landmark, ArrowLeftRight, Pencil, Trash2, EyeOff, Eye, Info } from "lucide-react";
import { formatARS } from "@/lib/mock-data";

type CenterRow = {
  id: string;
  name: string;
  active: boolean;
  ingresos: number;
  gastos: number;
  saldo: number; // transferencias: + le deben, - debe
};

type TransferRow = {
  id: string;
  date: string;
  amount: number;
  notes: string | null;
  fromId: string;
  toId: string;
  fromName: string;
  toName: string;
};

/* ── Form nueva/editar caja ── */
function FormCaja({
  userId, initial, centerId, onSaved, onClose,
}: {
  userId: string;
  initial?: { name: string; active: boolean };
  centerId?: string;
  onSaved: () => void;
  onClose: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");
  const [name, setName]     = useState(initial?.name ?? "");
  const [active, setActive] = useState(initial?.active ?? true);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Ponele un nombre"); return; }
    setSaving(true);
    setError("");
    if (centerId) {
      const { error: dbErr } = await renameCostCenter(centerId, userId, name.trim());
      if (!dbErr && active !== initial?.active) await setCostCenterActive(centerId, userId, active);
      if (dbErr) { setError("Error al guardar. Intentá de nuevo."); setSaving(false); return; }
    } else {
      const { error: dbErr } = await createCostCenter(userId, name.trim());
      if (dbErr) { setError("Error al guardar. Intentá de nuevo."); setSaving(false); return; }
    }
    onSaved();
    onClose();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Nombre de la caja / unidad de negocio">
        <input value={name} onChange={(e) => setName(e.target.value)}
          placeholder="Ej: Colegio, Salón de eventos" className={inputCls} />
      </Field>
      {centerId && (
        <button
          type="button"
          onClick={() => setActive((a) => !a)}
          className="flex items-center gap-2 text-xs text-[#94A3B8] hover:text-[#F1F5F9] transition-colors"
        >
          {active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          {active ? "Activa — se puede seguir asignando" : "Inactiva — no aparece para asignar nuevos movimientos"}
        </button>
      )}
      {error && <p className="text-xs text-[#EF4444] bg-[#EF4444]/[0.08] border border-[#EF4444]/20 rounded-lg px-3 py-2">{error}</p>}
      <SaveButton saving={saving} label={centerId ? "Guardar cambios" : "Crear caja"} />
    </form>
  );
}

/* ── Form nueva transferencia ── */
function FormTransferencia({
  userId, centers, onSaved, onClose,
}: {
  userId: string;
  centers: CenterRow[];
  onSaved: () => void;
  onClose: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");
  const [form, setForm] = useState({
    fecha: new Date().toISOString().split("T")[0],
    desde: centers[0]?.id ?? "",
    hasta: centers[1]?.id ?? centers[0]?.id ?? "",
    monto: "",
    notas: "",
  });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.desde || !form.hasta) { setError("Elegí las dos cajas"); return; }
    if (form.desde === form.hasta)  { setError("Tienen que ser dos cajas distintas"); return; }
    if (!form.monto || parseFloat(form.monto) <= 0) { setError("Ingresá un monto válido"); return; }
    setSaving(true);
    setError("");
    const { error: dbErr } = await createCostCenterTransfer({
      user_id: userId,
      date: form.fecha,
      from_cost_center_id: form.desde,
      to_cost_center_id: form.hasta,
      amount: parseFloat(form.monto),
      notes: form.notas.trim() || null,
    });
    if (dbErr) { setError("Error al guardar. Intentá de nuevo."); setSaving(false); return; }
    onSaved();
    onClose();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Le presta plata (de)">
          <select value={form.desde} onChange={(e) => set("desde", e.target.value)} className={selectCls}>
            {centers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="La recibe (a)">
          <select value={form.hasta} onChange={(e) => set("hasta", e.target.value)} className={selectCls}>
            {centers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Monto ($)">
          <input type="number" min="0" step="0.01" value={form.monto}
            onChange={(e) => set("monto", e.target.value)} placeholder="150000" className={inputCls} />
        </Field>
        <Field label="Fecha">
          <input type="date" value={form.fecha} onChange={(e) => set("fecha", e.target.value)} className={inputCls} />
        </Field>
      </div>
      <Field label="Notas (opcional)">
        <input value={form.notas} onChange={(e) => set("notas", e.target.value)}
          placeholder="Ej: cubrir sueldos de febrero" className={inputCls} />
      </Field>
      {error && <p className="text-xs text-[#EF4444] bg-[#EF4444]/[0.08] border border-[#EF4444]/20 rounded-lg px-3 py-2">{error}</p>}
      <SaveButton saving={saving} label="Registrar transferencia" />
    </form>
  );
}

export default function CentrosCostoPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [centers, setCenters] = useState<CenterRow[]>([]);
  const [sinAsignar, setSinAsignar] = useState({ ingresos: 0, gastos: 0 });
  const [transfers, setTransfers] = useState<TransferRow[]>([]);
  const [rawCenters, setRawCenters] = useState<{ id: string; name: string; active: boolean }[]>([]);
  const [modalCaja, setModalCaja] = useState(false);
  const [editingCaja, setEditingCaja] = useState<{ id: string; name: string; active: boolean } | null>(null);
  const [modalTransfer, setModalTransfer] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = () => setRefreshKey((k) => k + 1);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    async function load() {
      try {
        const [ccRes, trRes, ordRes, expRes] = await Promise.all([
          getCostCenters(user!.id),
          getCostCenterTransfers(user!.id),
          getOrders(user!.id),
          getExpenses(user!.id),
        ]);
        if (cancelled) return;

        const rawCc = ccRes.data ?? [];
        setRawCenters(rawCc);

        const orders = ordRes.data ?? [];
        const expenses = expRes.data ?? [];

        const ingresosMap: Record<string, number> = {};
        let ingresosSinAsignar = 0;
        for (const o of orders) {
          if (o.state === "cancelled" || o.state === "returned") continue;
          const amt = Number(o.amount_total);
          if (o.cost_center_id) ingresosMap[o.cost_center_id] = (ingresosMap[o.cost_center_id] ?? 0) + amt;
          else ingresosSinAsignar += amt;
        }

        const gastosMap: Record<string, number> = {};
        let gastosSinAsignar = 0;
        for (const e of expenses as { amount: number; cost_center_id: string | null }[]) {
          const amt = Number(e.amount);
          if (e.cost_center_id) gastosMap[e.cost_center_id] = (gastosMap[e.cost_center_id] ?? 0) + amt;
          else gastosSinAsignar += amt;
        }

        const transfersData = trRes.data ?? [];
        const balances = computeBalances(transfersData);

        setCenters(rawCc.map((c) => ({
          id: c.id,
          name: c.name,
          active: c.active,
          ingresos: ingresosMap[c.id] ?? 0,
          gastos: gastosMap[c.id] ?? 0,
          saldo: balances[c.id] ?? 0,
        })));
        setSinAsignar({ ingresos: ingresosSinAsignar, gastos: gastosSinAsignar });

        setTransfers(transfersData.map((t) => ({
          id: t.id,
          date: t.date,
          amount: Number(t.amount),
          notes: t.notes,
          fromId: t.from_cost_center_id,
          toId: t.to_cost_center_id,
          fromName: t.from_center?.name ?? "—",
          toName: t.to_center?.name ?? "—",
        })));
      } catch (err) {
        console.error("CentrosCostoPage load error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [user, refreshKey]);

  const activeCenters = centers.filter((c) => c.active);
  const hayTransferenciasPosibles = activeCenters.length >= 2;

  return (
    <div className="p-6 pb-12 space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#F1F5F9] tracking-tight">Centros de costo</h1>
          <p className="text-sm text-[#64748B] mt-1">
            Separá ingresos y gastos por unidad de negocio, y llevá la cuenta de qué caja le prestó plata a cuál.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hayTransferenciasPosibles && (
            <button
              onClick={() => setModalTransfer(true)}
              className="flex items-center gap-2 text-sm border border-white/[0.08] text-[#94A3B8] font-medium px-4 py-2 rounded-lg hover:bg-white/[0.04] transition-colors"
            >
              <ArrowLeftRight className="w-4 h-4" />
              Nueva transferencia
            </button>
          )}
          <button
            onClick={() => setModalCaja(true)}
            className="flex items-center gap-2 text-sm bg-[#10B981] text-[#080E1A] font-semibold px-4 py-2 rounded-lg hover:bg-[#0D9268] transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            Nueva caja
          </button>
        </div>
      </div>

      {/* Sin cajas todavía */}
      {!loading && centers.length === 0 && (
        <EmptyState
          icon={Landmark}
          title="Todavía no creaste ninguna caja"
          description="Si tu negocio tiene más de una unidad (ej: dos locales, o un rubro que sostiene a otro), creá una caja por cada una para separar sus números y trackear préstamos entre ellas."
          action={{ label: "Crear primera caja", onClick: () => setModalCaja(true) }}
        />
      )}

      {/* Grid de cajas */}
      {(loading || centers.length > 0) && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-[#0C1424] border border-white/[0.06] rounded-xl p-5">
              <div className="h-4 skeleton w-28 mb-4" />
              <div className="h-6 skeleton w-32 mb-2" />
              <div className="h-6 skeleton w-32" />
            </div>
          )) : centers.map((c) => {
            const neto = c.ingresos - c.gastos;
            return (
              <div key={c.id} className={`bg-[#0C1424] border rounded-xl p-5 transition-colors ${c.active ? "border-white/[0.06] hover:border-white/[0.12]" : "border-white/[0.03] opacity-60"}`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-[#10B981]/[0.12]">
                      <Landmark className="w-4 h-4 text-[#10B981]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[14px] font-semibold text-[#F1F5F9] truncate">{c.name}</p>
                      {!c.active && <span className="text-[10px] text-[#475569]">Inactiva</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => setEditingCaja({ id: c.id, name: c.name, active: c.active })}
                    className="text-[#475569] hover:text-[#94A3B8] transition-colors shrink-0"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Ingresos</span>
                    <span className="font-mono text-[#F1F5F9]">{formatARS(c.ingresos)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748B]">Gastos</span>
                    <span className="font-mono text-[#EF4444]">-{formatARS(c.gastos)}</span>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center justify-between">
                  <span className="text-xs text-[#475569]">Resultado</span>
                  <span className="text-sm font-mono font-bold" style={{ color: neto >= 0 ? "#10B981" : "#EF4444" }}>
                    {formatARS(neto)}
                  </span>
                </div>

                {c.saldo !== 0 && (
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="text-[#475569]">{c.saldo > 0 ? "Le deben" : "Debe"}</span>
                    <span className="font-mono font-semibold" style={{ color: c.saldo > 0 ? "#3B82F6" : "#F59E0B" }}>
                      {formatARS(Math.abs(c.saldo))}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Sin asignar */}
      {!loading && (sinAsignar.ingresos > 0 || sinAsignar.gastos > 0) && (
        <div className="flex items-start gap-3 bg-white/[0.02] border border-white/[0.06] rounded-xl px-5 py-4">
          <Info className="w-4 h-4 text-[#475569] shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-[#94A3B8]">
              {formatARS(sinAsignar.ingresos)} en ventas y {formatARS(sinAsignar.gastos)} en gastos sin caja asignada
            </p>
            <p className="text-xs text-[#475569] mt-0.5">
              Se cargaron sin elegir una caja — asigná una al crearlos (en Ventas y en Costos) para que entren en estos totales.
            </p>
          </div>
        </div>
      )}

      {/* Transferencias entre cajas */}
      {!loading && centers.length > 0 && (
        <div className="bg-[#0C1424] border border-white/[0.06] rounded-xl">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
            <div>
              <h2 className="text-sm font-semibold text-[#F1F5F9]">Transferencias entre cajas</h2>
              <p className="text-xs text-[#475569] mt-0.5">Préstamos de plata de una caja a otra — así no se pierden en la memoria</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.04]">
                  {["Fecha", "De", "A", "Monto", "Notas", ""].map((col) => (
                    <th key={col} className="text-left text-xs font-medium text-[#475569] px-5 py-3">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {transfers.length === 0 ? (
                  <tr><td colSpan={6} className="px-5 py-8 text-center text-sm text-[#475569]">Sin transferencias registradas todavía</td></tr>
                ) : (
                  transfers.map((t, i) => (
                    <tr key={t.id} className={`group hover:bg-white/[0.02] transition-colors ${i < transfers.length - 1 ? "border-b border-white/[0.04]" : ""}`}>
                      <td className="px-5 py-3.5 font-mono text-[12px] text-[#94A3B8]">{t.date}</td>
                      <td className="px-5 py-3.5 text-[13px] text-[#F1F5F9]">{t.fromName}</td>
                      <td className="px-5 py-3.5 text-[13px] text-[#F1F5F9]">{t.toName}</td>
                      <td className="px-5 py-3.5 font-mono font-semibold text-[#F1F5F9]">{formatARS(t.amount)}</td>
                      <td className="px-5 py-3.5 text-[12px] text-[#94A3B8] max-w-[220px] truncate">{t.notes ?? "—"}</td>
                      <td className="px-5 py-3.5">
                        <button
                          onClick={async () => { await deleteCostCenterTransfer(t.id, user!.id); refresh(); }}
                          className="text-[#475569] hover:text-[#EF4444] transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal nueva/editar caja */}
      <Modal open={modalCaja} onClose={() => setModalCaja(false)} title="Nueva caja">
        <FormCaja userId={user?.id ?? ""} onSaved={refresh} onClose={() => setModalCaja(false)} />
      </Modal>
      <Modal open={!!editingCaja} onClose={() => setEditingCaja(null)} title="Editar caja">
        {editingCaja && (
          <FormCaja
            userId={user?.id ?? ""}
            initial={{ name: editingCaja.name, active: editingCaja.active }}
            centerId={editingCaja.id}
            onSaved={refresh}
            onClose={() => setEditingCaja(null)}
          />
        )}
      </Modal>

      {/* Modal nueva transferencia */}
      <Modal open={modalTransfer} onClose={() => setModalTransfer(false)} title="Nueva transferencia entre cajas">
        <FormTransferencia
          userId={user?.id ?? ""}
          centers={rawCenters.filter((c) => c.active).map((c) => ({ id: c.id, name: c.name, active: c.active, ingresos: 0, gastos: 0, saldo: 0 }))}
          onSaved={refresh}
          onClose={() => setModalTransfer(false)}
        />
      </Modal>
    </div>
  );
}
