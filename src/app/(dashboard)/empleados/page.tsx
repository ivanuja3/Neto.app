"use client";

import { useState, useEffect } from "react";
import { PlusCircle, Users, Pencil, Trash2, Phone, Mail, Briefcase, UserCheck } from "lucide-react";
import { Modal, Field, inputCls, selectCls, SaveButton } from "@/components/ui/modal";
import { useAuth } from "@/components/auth-provider";
import {
  getEmployees,
  upsertEmployee,
  deleteEmployee as dbDeleteEmployee,
} from "@/lib/db/employees";
import type { Employee } from "@/lib/types/database";

/* ─── Types ─── */
type Rol = "Administrador" | "Vendedor" | "Almacén" | "Cajero" | "Repartidor" | "Otro";

interface Empleado {
  id: string;
  nombre: string;
  rol: Rol;
  email: string;
  celular: string;
  fechaIngreso: string;
  activo: boolean;
}

const ROLES: Rol[] = ["Administrador", "Vendedor", "Almacén", "Cajero", "Repartidor", "Otro"];

function todayStr() {
  // toISOString() da la fecha en UTC — entre las 21:00 y 23:59 hora
  // Argentina (UTC-3) ya devuelve el día siguiente.
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/* ─── Conversores DB ↔ local ─── */
function dbToLocal(e: Employee): Empleado {
  return {
    id: e.id,
    nombre: e.nombre,
    rol: e.rol as Rol,
    email: e.email ?? "",
    celular: e.celular ?? "",
    fechaIngreso: e.fecha_ingreso,
    activo: e.activo,
  };
}

function localToDb(e: Omit<Empleado, "id">, userId: string): Omit<Employee, "id" | "created_at" | "updated_at"> {
  return {
    user_id: userId,
    nombre: e.nombre,
    rol: e.rol,
    email: e.email || null,
    celular: e.celular || null,
    fecha_ingreso: e.fechaIngreso,
    activo: e.activo,
  };
}

/* ─── Formulario ─── */
const EMPTY_FORM = { nombre: "", rol: "Vendedor" as Rol, email: "", celular: "", fechaIngreso: todayStr(), activo: true };

function FormEmpleado({
  initial,
  onSave,
  onClose,
}: {
  initial?: Partial<Empleado>;
  onSave: (data: Omit<Empleado, "id">) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({ ...EMPTY_FORM, ...initial });
  const [error, setError] = useState("");

  const set = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nombre.trim()) { setError("El nombre es obligatorio"); return; }
    onSave({ ...form, nombre: form.nombre.trim(), email: form.email.trim(), celular: form.celular.trim() });
    onClose();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Nombre completo">
        <input
          value={form.nombre}
          onChange={(e) => set("nombre", e.target.value)}
          placeholder="Ej: María González"
          className={inputCls}
          autoFocus
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Rol / Cargo">
          <select value={form.rol} onChange={(e) => set("rol", e.target.value as Rol)} className={selectCls}>
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </Field>
        <Field label="Fecha de ingreso">
          <input
            type="date"
            value={form.fechaIngreso}
            onChange={(e) => set("fechaIngreso", e.target.value)}
            className={inputCls}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Email (opcional)">
          <input
            type="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder="mail@ejemplo.com"
            className={inputCls}
          />
        </Field>
        <Field label="Celular (opcional)">
          <input
            value={form.celular}
            onChange={(e) => set("celular", e.target.value)}
            placeholder="+54 9 11 ..."
            className={inputCls}
          />
        </Field>
      </div>

      <div className="flex items-center gap-3 px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl">
        <button
          type="button"
          onClick={() => set("activo", !form.activo)}
          className={`w-10 h-5 rounded-full transition-colors relative shrink-0 ${form.activo ? "bg-[#10B981]" : "bg-[#334155]"}`}
        >
          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.activo ? "translate-x-5" : "translate-x-0.5"}`} />
        </button>
        <span className="text-sm text-[#94A3B8]">
          Empleado <span className={form.activo ? "text-[#10B981]" : "text-[#475569]"}>{form.activo ? "activo" : "inactivo"}</span>
        </span>
      </div>

      {error && (
        <p className="text-xs text-[#EF4444] bg-[#EF4444]/[0.08] border border-[#EF4444]/20 rounded-lg px-3 py-2">{error}</p>
      )}
      <SaveButton saving={false} label={initial?.id ? "Guardar cambios" : "Agregar empleado"} />
    </form>
  );
}

/* ─── Página principal ─── */
export default function EmpleadosPage() {
  const { user } = useAuth();
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [selected, setSelected] = useState<Empleado | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function load() {
    setLoading(true);
    const rows = await getEmployees(user!.id);
    setEmpleados(rows.map(dbToLocal));
    setLoading(false);
  }

  async function handleAdd(data: Omit<Empleado, "id">) {
    if (!user) return;
    const saved = await upsertEmployee(localToDb(data, user.id));
    if (saved) setEmpleados((prev) => [dbToLocal(saved), ...prev]);
  }

  async function handleEdit(data: Omit<Empleado, "id">) {
    if (!selected || !user) return;
    const saved = await upsertEmployee({ id: selected.id, ...localToDb(data, user.id) });
    if (saved) setEmpleados((prev) => prev.map((e) => e.id === selected.id ? dbToLocal(saved) : e));
  }

  async function toggleActivo(id: string) {
    if (!user) return;
    const emp = empleados.find((e) => e.id === id);
    if (!emp) return;
    const saved = await upsertEmployee({ id, ...localToDb({ ...emp, activo: !emp.activo }, user.id) });
    if (saved) setEmpleados((prev) => prev.map((e) => e.id === id ? dbToLocal(saved) : e));
  }

  async function handleDelete(id: string) {
    if (!user || !confirm("¿Eliminar este empleado?")) return;
    const ok = await dbDeleteEmployee(id, user.id);
    if (ok) setEmpleados((prev) => prev.filter((e) => e.id !== id));
  }

  const activos   = empleados.filter((e) => e.activo).length;
  const inactivos = empleados.length - activos;
  const roles     = [...new Set(empleados.map((e) => e.rol))].length;

  const kpis = [
    { label: "Total empleados",  value: String(empleados.length), sub: `${activos} activo${activos !== 1 ? "s" : ""}`, color: "#3B82F6", icon: Users },
    { label: "Activos",          value: String(activos),          sub: "trabajando actualmente",                        color: "#10B981", icon: UserCheck },
    { label: "Inactivos",        value: String(inactivos),        sub: inactivos === 0 ? "todos activos" : "sin actividad", color: inactivos > 0 ? "#F59E0B" : "#475569", icon: Users },
    { label: "Roles distintos",  value: String(roles),            sub: "en el equipo",                                  color: "#8B5CF6", icon: Briefcase },
  ];

  if (loading) return (
    <div className="p-6 space-y-4 max-w-[1200px]">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="h-14 skeleton rounded-xl" />
      ))}
    </div>
  );

  return (
    <div className="p-6 pb-12 space-y-6 max-w-[1200px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#F1F5F9] tracking-tight">Empleados</h1>
          <div className="flex items-center gap-3 mt-1.5">
            <span className="text-sm text-[#64748B]">
              Total <span className="text-[#F1F5F9] font-semibold">{empleados.length}</span>
            </span>
            <span className="text-[#334155]">|</span>
            <span className="text-sm text-[#64748B]">
              Activos <span className="text-[#10B981] font-semibold">{activos}</span>
            </span>
          </div>
        </div>
        <button
          onClick={() => { setSelected(null); setModal("add"); }}
          className="flex items-center gap-2 text-sm bg-[#10B981] text-[#080E1A] font-semibold px-4 py-2 rounded-lg hover:bg-[#0D9268] transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          Agregar empleado
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="bg-[#0C1424] border border-white/[0.06] rounded-xl p-5 hover:border-white/[0.10] transition-colors">
              <div className="flex items-start justify-between mb-3">
                <p className="text-sm text-[#94A3B8]">{k.label}</p>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${k.color}18` }}>
                  <Icon className="w-[14px] h-[14px]" style={{ color: k.color }} />
                </div>
              </div>
              <p className="text-2xl font-bold tabular-nums" style={{ color: k.color }}>{k.value}</p>
              <p className="text-xs text-[#475569] mt-1">{k.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Lista */}
      <div className="bg-[#0C1424] border border-white/[0.06] rounded-xl overflow-hidden">
        {empleados.length === 0 ? (
          <div className="flex items-center justify-between px-5 py-4">
            <p className="text-sm text-[#475569]">Sin empleados registrados</p>
            <button
              onClick={() => { setSelected(null); setModal("add"); }}
              className="text-sm font-semibold text-[#10B981] hover:text-[#34D399] transition-colors"
            >
              Agregar el primero
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-[1fr_120px_160px_140px_80px_80px] px-5 py-3 border-b border-white/[0.04] bg-white/[0.01]">
              {["Empleado", "Rol", "Email", "Celular", "Desde", ""].map((h) => (
                <p key={h} className="text-[11px] font-semibold text-[#334155] uppercase tracking-wide">{h}</p>
              ))}
            </div>
            <div className="divide-y divide-white/[0.04]">
              {empleados.map((e) => (
                <div key={e.id} className="grid grid-cols-[1fr_120px_160px_140px_80px_80px] items-center px-5 py-4 hover:bg-white/[0.02] transition-colors">
                  {/* Nombre + estado */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-[#111E30] border border-white/[0.06] flex items-center justify-center shrink-0">
                      <span className="text-[11px] font-bold text-[#64748B]">
                        {e.nombre.slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-[#F1F5F9] truncate">{e.nombre}</p>
                      {!e.activo && (
                        <span className="text-[10px] font-bold text-[#F59E0B] bg-[#F59E0B]/10 px-1.5 py-0.5 rounded">
                          Inactivo
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Rol */}
                  <span className="text-xs font-medium text-[#475569] bg-white/[0.04] border border-white/[0.06] px-2 py-1 rounded-lg w-fit">
                    {e.rol}
                  </span>
                  {/* Email */}
                  <div className="flex items-center gap-1.5 min-w-0">
                    {e.email ? (
                      <>
                        <Mail className="w-3 h-3 text-[#334155] shrink-0" />
                        <p className="text-[12px] text-[#475569] truncate">{e.email}</p>
                      </>
                    ) : (
                      <p className="text-[12px] text-[#334155]">—</p>
                    )}
                  </div>
                  {/* Celular */}
                  <div className="flex items-center gap-1.5">
                    {e.celular ? (
                      <>
                        <Phone className="w-3 h-3 text-[#334155] shrink-0" />
                        <p className="text-[12px] text-[#475569]">{e.celular}</p>
                      </>
                    ) : (
                      <p className="text-[12px] text-[#334155]">—</p>
                    )}
                  </div>
                  {/* Fecha */}
                  <p className="text-[11px] text-[#475569] tabular-nums">{e.fechaIngreso}</p>
                  {/* Acciones */}
                  <div className="flex items-center gap-1 justify-end">
                    <button
                      onClick={() => toggleActivo(e.id)}
                      title={e.activo ? "Desactivar" : "Activar"}
                      className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
                        e.activo
                          ? "text-[#10B981] hover:bg-[#10B981]/10"
                          : "text-[#475569] hover:bg-white/[0.06]"
                      }`}
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => { setSelected(e); setModal("edit"); }}
                      className="w-6 h-6 rounded-lg flex items-center justify-center text-[#475569] hover:bg-white/[0.06] hover:text-[#94A3B8] transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(e.id)}
                      className="w-6 h-6 rounded-lg flex items-center justify-center text-[#475569] hover:bg-[#EF4444]/10 hover:text-[#EF4444] transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Modales */}
      <Modal open={modal === "add"} title="Agregar empleado" onClose={() => setModal(null)}>
        <FormEmpleado onSave={handleAdd} onClose={() => setModal(null)} />
      </Modal>
      <Modal open={modal === "edit" && !!selected} title="Editar empleado" onClose={() => setModal(null)}>
        {selected && <FormEmpleado initial={selected} onSave={handleEdit} onClose={() => setModal(null)} />}
      </Modal>
    </div>
  );
}
