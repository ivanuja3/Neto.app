"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { getProducts } from "@/lib/db/products";
import {
  getQuotes as dbGetQuotes,
  saveQuote as dbSaveQuote,
  deleteQuote as dbDeleteQuote,
  type QuoteWithItems,
} from "@/lib/db/quotes";
import { formatARS } from "@/lib/mock-data";
import type { Product, QuoteItem as DBQuoteItem } from "@/lib/types/database";
import {
  PlusCircle,
  Search,
  X,
  ClipboardList,
  Copy,
  Trash2,
  ChevronDown,
  ShoppingCart,
  FileDown,
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react";

/* ── Tipos locales ── */
type PriceMode = "cash" | "list" | "installments";

interface QuoteItem {
  id: string;
  productId: string;
  name: string;
  sku: string | null;
  qty: number;
  priceUnit: number;
  priceCash: number | null;
  priceList: number;
  priceInstallments: number | null;
  priceMode: PriceMode;
}

type QuoteState = "draft" | "sent" | "accepted" | "rejected";

interface Quote {
  id: string;
  number: string;
  clientName: string;
  date: string;
  validDays: number;
  state: QuoteState;
  items: QuoteItem[];
  notes: string;
}

/* ── Helpers ── */
function newId() {
  return Math.random().toString(36).slice(2);
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function quoteNumber(n: number) {
  return `PPTO-${String(n).padStart(4, "0")}`;
}

/* ── Conversores DB ↔ local ── */
function dbItemToLocal(item: DBQuoteItem): QuoteItem {
  return {
    id: item.id,
    productId: item.product_id ?? "",
    name: item.product_name,
    sku: item.sku,
    qty: item.qty,
    priceUnit: item.price_unit,
    priceMode: item.price_mode as PriceMode,
    priceList: item.price_list,
    priceCash: item.price_cash,
    priceInstallments: item.price_installments,
  };
}

function dbToLocal(q: QuoteWithItems): Quote {
  return {
    id: q.id,
    number: q.number,
    clientName: q.client_name,
    date: q.date,
    validDays: q.valid_days,
    state: q.state,
    notes: q.notes,
    items: (q.items ?? [])
      .slice()
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map(dbItemToLocal),
  };
}

function localItemToDb(item: QuoteItem): Omit<DBQuoteItem, "id"> {
  return {
    quote_id: "",
    user_id: "",
    product_id: item.productId || null,
    product_name: item.name,
    sku: item.sku,
    qty: item.qty,
    price_unit: item.priceUnit,
    price_mode: item.priceMode,
    price_list: item.priceList,
    price_cash: item.priceCash,
    price_installments: item.priceInstallments,
    sort_order: 0,
  };
}

function itemTotal(item: QuoteItem) {
  return item.qty * item.priceUnit;
}

function quoteTotal(items: QuoteItem[]) {
  return items.reduce((s, i) => s + itemTotal(i), 0);
}

const STATE_CONFIG: Record<QuoteState, { label: string; color: string; Icon: React.ElementType }> = {
  draft:    { label: "Borrador",  color: "text-[#94A3B8] bg-[#94A3B8]/10",  Icon: Clock },
  sent:     { label: "Enviado",   color: "text-[#F59E0B] bg-[#F59E0B]/10",  Icon: Clock },
  accepted: { label: "Aceptado",  color: "text-[#10B981] bg-[#10B981]/10",  Icon: CheckCircle2 },
  rejected: { label: "Rechazado", color: "text-[#EF4444] bg-[#EF4444]/10",  Icon: XCircle },
};

/* ── Componente principal ── */
export default function PresupuestosPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [editing, setEditing] = useState<Quote | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  /* typeahead */
  const [prodSearch, setProdSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const prodResults = products
    .filter((p) =>
      prodSearch.length >= 1 &&
      (p.name.toLowerCase().includes(prodSearch.toLowerCase()) ||
        (p.sku ?? "").toLowerCase().includes(prodSearch.toLowerCase()))
    )
    .slice(0, 10);

  async function loadQuotes() {
    if (!user) return;
    setLoading(true);
    const rows = await dbGetQuotes(user.id);
    setQuotes(rows.map(dbToLocal));
    setLoading(false);
  }

  useEffect(() => {
    if (!user) return;
    getProducts(user.id).then((ps) => setProducts(ps ?? []));
    loadQuotes();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  /* Nueva cotización */
  function newQuote() {
    const q: Quote = {
      id: newId(),
      number: quoteNumber(quotes.length + 1),
      clientName: "",
      date: todayStr(),
      validDays: 10,
      state: "draft",
      items: [],
      notes: "",
    };
    setEditing(q);
    setShowForm(true);
  }

  /* Agregar producto al presupuesto */
  function addProduct(p: Product) {
    if (!editing) return;
    const item: QuoteItem = {
      id: newId(),
      productId: p.id,
      name: p.name,
      sku: p.sku,
      qty: 1,
      priceList: p.list_price,
      priceCash: p.price_cash,
      priceInstallments: p.price_installments,
      priceUnit: p.price_cash ?? p.list_price,
      priceMode: p.price_cash ? "cash" : "list",
    };
    setEditing((prev) => prev ? { ...prev, items: [...prev.items, item] } : prev);
    setProdSearch("");
    setShowDropdown(false);
  }

  function removeItem(itemId: string) {
    setEditing((prev) => prev ? { ...prev, items: prev.items.filter((i) => i.id !== itemId) } : prev);
  }

  function updateItem(itemId: string, patch: Partial<QuoteItem>) {
    setEditing((prev) =>
      prev
        ? {
            ...prev,
            items: prev.items.map((i) =>
              i.id === itemId ? { ...i, ...patch } : i
            ),
          }
        : prev
    );
  }

  function setPriceMode(item: QuoteItem, mode: PriceMode) {
    const priceUnit =
      mode === "cash" ? (item.priceCash ?? item.priceList) :
      mode === "installments" ? (item.priceInstallments ?? item.priceList) :
      item.priceList;
    updateItem(item.id, { priceMode: mode, priceUnit });
  }

  async function saveQuote() {
    if (!editing || !user) return;
    setSaving(true);
    const quoteRow = {
      id: editing.id,
      user_id: user.id,
      number: editing.number,
      client_name: editing.clientName,
      date: editing.date,
      valid_days: editing.validDays,
      state: editing.state,
      notes: editing.notes,
      amount_total: quoteTotal(editing.items),
    };
    const itemRows = editing.items.map(localItemToDb);
    const saved = await dbSaveQuote(user.id, quoteRow, itemRows);
    setSaving(false);
    if (!saved) return;
    const local = dbToLocal(saved);
    setQuotes((prev) => {
      const exists = prev.find((q) => q.id === local.id);
      return exists ? prev.map((q) => (q.id === local.id ? local : q)) : [local, ...prev];
    });
    setShowForm(false);
    setEditing(null);
  }

  function openQuote(q: Quote) {
    setEditing({ ...q });
    setShowForm(true);
  }

  async function duplicateQuote(q: Quote) {
    if (!user) return;
    const copy: Quote = {
      ...q,
      id: newId(),
      number: quoteNumber(quotes.length + 1),
      date: todayStr(),
      state: "draft",
      items: q.items.map((i) => ({ ...i, id: newId() })),
    };
    const quoteRow = {
      id: copy.id,
      user_id: user.id,
      number: copy.number,
      client_name: copy.clientName,
      date: copy.date,
      valid_days: copy.validDays,
      state: copy.state,
      notes: copy.notes,
      amount_total: quoteTotal(copy.items),
    };
    const saved = await dbSaveQuote(user.id, quoteRow, copy.items.map(localItemToDb));
    if (saved) setQuotes((prev) => [dbToLocal(saved), ...prev]);
  }

  async function deleteQuote(id: string) {
    if (!user || !confirm("¿Eliminar este presupuesto?")) return;
    await dbDeleteQuote(id, user.id);
    setQuotes((prev) => prev.filter((q) => q.id !== id));
  }

  const total = editing ? quoteTotal(editing.items) : 0;

  /* ── UI ── */
  return (
    <div className="min-h-screen bg-[#080E1A]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.05]">
        <div>
          <h1 className="text-2xl font-bold text-[#F1F5F9] tracking-tight">Presupuestos</h1>
          <p className="text-xs text-[#475569] mt-0.5">Cotizaciones y propuestas comerciales</p>
        </div>
        <button
          onClick={newQuote}
          className="flex items-center gap-2 bg-[#10B981] hover:bg-[#059669] text-[#080E1A] text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          Nuevo presupuesto
        </button>
      </div>

      {/* Stats rápidas */}
      <div className="grid grid-cols-4 gap-0 border-b border-white/[0.05]">
        {[
          { label: "Total",     val: quotes.length,                                     suffix: "" },
          { label: "Enviados",  val: quotes.filter((q) => q.state === "sent").length,   suffix: "" },
          { label: "Aceptados", val: quotes.filter((q) => q.state === "accepted").length, suffix: "" },
          {
            label: "$ Aceptados",
            val: formatARS(quotes.filter((q) => q.state === "accepted").reduce((s, q) => s + quoteTotal(q.items), 0)),
            suffix: "",
          },
        ].map((s, i) => (
          <div key={i} className="px-6 py-4 border-r border-white/[0.05] last:border-r-0">
            <p className="text-xs text-[#475569]">{s.label}</p>
            <p className="text-2xl font-bold text-[#F1F5F9] mt-1">{s.val}{s.suffix}</p>
          </div>
        ))}
      </div>

      {/* Lista */}
      {quotes.length === 0 ? (
        <div className="flex items-center justify-between px-5 py-4 bg-[#0C1424] border border-white/[0.06] rounded-xl">
          <p className="text-sm text-[#475569]">Sin presupuestos todavía</p>
          <button onClick={newQuote} className="text-sm font-semibold text-[#10B981] hover:text-[#34D399] transition-colors">
            Crear el primero
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-6 px-6 py-2 bg-white/[0.01] border-b border-white/[0.04]">
            {["N°", "Cliente", "Fecha", "Total", "Estado", ""].map((h) => (
              <p key={h} className="text-[11px] font-medium text-[#334155] uppercase tracking-wide">{h}</p>
            ))}
          </div>
          {quotes.map((q) => {
            const { label, color, Icon } = STATE_CONFIG[q.state];
            return (
              <div
                key={q.id}
                className="grid grid-cols-6 items-center px-6 py-4 border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
              >
                <p className="text-[13px] font-mono text-[#94A3B8]">{q.number}</p>
                <p className="text-[13px] font-semibold text-[#F1F5F9] truncate pr-2">
                  {q.clientName || <span className="text-[#334155] italic">Sin cliente</span>}
                </p>
                <p className="text-[13px] text-[#475569]">{q.date}</p>
                <p className="text-[13px] font-mono font-semibold text-[#F1F5F9]">
                  {formatARS(quoteTotal(q.items))}
                </p>
                <span className={`flex items-center gap-1.5 w-fit text-[11px] font-semibold px-2.5 py-1 rounded-full ${color}`}>
                  <Icon className="w-3 h-3" />
                  {label}
                </span>
                <div className="flex items-center gap-1 justify-end">
                  <button
                    onClick={() => openQuote(q)}
                    className="text-[12px] text-[#3B82F6] hover:text-[#60A5FA] font-semibold transition-colors px-2"
                  >
                    Ver
                  </button>
                  <button
                    onClick={() => duplicateQuote(q)}
                    className="p-1.5 rounded-lg text-[#475569] hover:text-[#94A3B8] hover:bg-white/[0.04] transition-colors"
                    title="Duplicar"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => deleteQuote(q.id)}
                    className="p-1.5 rounded-lg text-[#475569] hover:text-[#EF4444] hover:bg-[#EF4444]/[0.06] transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </>
      )}

      {/* Panel lateral de edición */}
      {showForm && editing && (
        <div className="fixed inset-0 z-50 flex">
          {/* backdrop */}
          <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={() => { setShowForm(false); setEditing(null); }} />

          {/* Panel */}
          <div className="w-full max-w-2xl h-full bg-[#0C1424] border-l border-white/[0.08] flex flex-col shadow-2xl overflow-hidden">
            {/* Panel header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] shrink-0">
              <div>
                <h2 className="text-base font-bold text-[#F1F5F9]">{editing.number}</h2>
                <p className="text-xs text-[#475569] mt-0.5">
                  {editing.items.length} {editing.items.length === 1 ? "producto" : "productos"} · {formatARS(total)}
                </p>
              </div>
              <button onClick={() => { setShowForm(false); setEditing(null); }} className="text-[#475569] hover:text-[#94A3B8] transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Panel body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* Datos del cliente */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-[#475569] block mb-1.5">Cliente</label>
                  <input
                    value={editing.clientName}
                    onChange={(e) => setEditing((p) => p ? { ...p, clientName: e.target.value } : p)}
                    placeholder="Nombre del cliente"
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-[#F1F5F9] focus:outline-none focus:border-[#3B82F6]/40"
                  />
                </div>
                <div>
                  <label className="text-xs text-[#475569] block mb-1.5">Fecha</label>
                  <input
                    type="date"
                    value={editing.date}
                    onChange={(e) => setEditing((p) => p ? { ...p, date: e.target.value } : p)}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-[#F1F5F9] focus:outline-none focus:border-[#3B82F6]/40"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-[#475569] block mb-1.5">Validez (días)</label>
                  <input
                    type="number"
                    value={editing.validDays}
                    onChange={(e) => setEditing((p) => p ? { ...p, validDays: +e.target.value } : p)}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-[#F1F5F9] focus:outline-none focus:border-[#3B82F6]/40"
                  />
                </div>
                <div>
                  <label className="text-xs text-[#475569] block mb-1.5">Estado</label>
                  <div className="relative">
                    <select
                      value={editing.state}
                      onChange={(e) => setEditing((p) => p ? { ...p, state: e.target.value as QuoteState } : p)}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-[#F1F5F9] focus:outline-none focus:border-[#3B82F6]/40 appearance-none"
                    >
                      <option value="draft">Borrador</option>
                      <option value="sent">Enviado</option>
                      <option value="accepted">Aceptado</option>
                      <option value="rejected">Rechazado</option>
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#475569] pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Buscar productos */}
              <div>
                <label className="text-xs text-[#475569] block mb-1.5">Agregar producto</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#475569]" />
                  <input
                    value={prodSearch}
                    onChange={(e) => { setProdSearch(e.target.value); setShowDropdown(true); }}
                    onFocus={() => setShowDropdown(true)}
                    onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                    placeholder="Buscar por nombre o código..."
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg pl-9 pr-4 py-2 text-sm text-[#F1F5F9] focus:outline-none focus:border-[#3B82F6]/40"
                  />
                  {showDropdown && prodResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-[#0C1424] border border-white/[0.10] rounded-xl shadow-2xl z-20 overflow-hidden">
                      {prodResults.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onMouseDown={() => addProduct(p)}
                          className="w-full flex items-start gap-3 px-4 py-3 hover:bg-white/[0.04] text-left border-b border-white/[0.04] last:border-b-0"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] text-[#F1F5F9] font-medium truncate">{p.name}</p>
                            <p className="text-[11px] text-[#475569] font-mono">{p.sku ?? "Sin código"}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-[12px] font-mono font-semibold text-[#10B981]">
                              ${(p.price_cash ?? p.list_price).toLocaleString("es-AR")}
                            </p>
                            {p.price_installments && (
                              <p className="text-[10px] font-mono text-[#F59E0B]">
                                cuotas ${p.price_installments.toLocaleString("es-AR")}
                              </p>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {showDropdown && prodSearch.length >= 1 && prodResults.length === 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-[#0C1424] border border-white/[0.08] rounded-xl px-4 py-3 text-xs text-[#475569]">
                      Sin resultados para &quot;{prodSearch}&quot;
                    </div>
                  )}
                </div>
              </div>

              {/* Items */}
              {editing.items.length > 0 ? (
                <div>
                  <p className="text-xs text-[#475569] mb-2">Ítems del presupuesto</p>
                  <div className="space-y-2">
                    {editing.items.map((item) => (
                      <div key={item.id} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-semibold text-[#F1F5F9] truncate">{item.name}</p>
                            {item.sku && <p className="text-[10px] font-mono text-[#475569]">{item.sku}</p>}
                          </div>
                          <button onClick={() => removeItem(item.id)} className="text-[#475569] hover:text-[#EF4444] transition-colors shrink-0">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Precio modo */}
                        <div className="flex gap-1.5 mb-2 flex-wrap">
                          {([
                            { mode: "cash" as PriceMode, label: "Efectivo", price: item.priceCash, color: "text-[#10B981] border-[#10B981]/30 bg-[#10B981]/10" },
                            { mode: "list" as PriceMode, label: "Lista", price: item.priceList, color: "text-[#94A3B8] border-white/[0.14] bg-white/[0.04]" },
                            { mode: "installments" as PriceMode, label: "Cuotas", price: item.priceInstallments, color: "text-[#F59E0B] border-[#F59E0B]/30 bg-[#F59E0B]/10" },
                          ] as const).filter((opt) => opt.price != null).map((opt) => (
                            <button
                              key={opt.mode}
                              type="button"
                              onClick={() => setPriceMode(item, opt.mode)}
                              className={`text-[10px] font-semibold border rounded-lg px-2 py-1 transition-all ${
                                item.priceMode === opt.mode ? opt.color : "text-[#334155] border-white/[0.06] bg-transparent hover:border-white/[0.12]"
                              }`}
                            >
                              {opt.label} ${(opt.price!).toLocaleString("es-AR")}
                            </button>
                          ))}
                        </div>

                        {/* Qty + precio */}
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <p className="text-[10px] text-[#475569] mb-1">Cantidad</p>
                            <input
                              type="number"
                              min={1}
                              value={item.qty}
                              onChange={(e) => updateItem(item.id, { qty: Math.max(1, +e.target.value) })}
                              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-1.5 text-sm text-[#F1F5F9] text-center focus:outline-none"
                            />
                          </div>
                          <div>
                            <p className="text-[10px] text-[#475569] mb-1">Precio unit.</p>
                            <input
                              type="number"
                              min={0}
                              value={item.priceUnit}
                              onChange={(e) => updateItem(item.id, { priceUnit: +e.target.value, priceMode: "list" })}
                              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-1.5 text-sm text-[#F1F5F9] text-center font-mono focus:outline-none"
                            />
                          </div>
                          <div>
                            <p className="text-[10px] text-[#475569] mb-1">Subtotal</p>
                            <p className="text-sm font-mono font-bold text-[#10B981] py-1.5 text-center">
                              {formatARS(itemTotal(item))}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Total */}
                  <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/[0.08]">
                    <span className="text-sm font-semibold text-[#94A3B8]">Total del presupuesto</span>
                    <span className="text-xl font-bold tabular-nums text-[#F1F5F9]">{formatARS(total)}</span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 border border-dashed border-white/[0.08] rounded-xl gap-2">
                  <ClipboardList className="w-6 h-6 text-[#1E2D3D]" />
                  <p className="text-xs text-[#334155]">Buscá productos para agregar al presupuesto</p>
                </div>
              )}

              {/* Notas */}
              <div>
                <label className="text-xs text-[#475569] block mb-1.5">Notas / observaciones</label>
                <textarea
                  value={editing.notes}
                  onChange={(e) => setEditing((p) => p ? { ...p, notes: e.target.value } : p)}
                  placeholder="Condiciones, medidas especiales, tiempo de entrega..."
                  rows={3}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-[#F1F5F9] resize-none focus:outline-none focus:border-[#3B82F6]/40"
                />
              </div>
            </div>

            {/* Panel footer */}
            <div className="px-6 py-4 border-t border-white/[0.06] shrink-0 flex items-center justify-between gap-3 bg-[#080E1A]">
              <div className="flex gap-2">
                <button
                  className="flex items-center gap-1.5 text-xs text-[#475569] hover:text-[#94A3B8] transition-colors px-3 py-2 rounded-lg hover:bg-white/[0.04] border border-white/[0.06]"
                  title="Exportar PDF (próximamente)"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  Exportar PDF
                </button>
                {editing.state === "accepted" && (
                  <button className="flex items-center gap-1.5 text-xs text-[#10B981] hover:text-[#34D399] transition-colors px-3 py-2 rounded-lg hover:bg-[#10B981]/[0.06] border border-[#10B981]/20">
                    <ShoppingCart className="w-3.5 h-3.5" />
                    Convertir en venta
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowForm(false); setEditing(null); }}
                  className="text-sm text-[#475569] hover:text-[#94A3B8] px-4 py-2 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveQuote}
                  disabled={saving}
                  className="text-sm font-semibold bg-[#10B981] hover:bg-[#059669] text-[#080E1A] px-5 py-2 rounded-xl transition-colors disabled:opacity-60"
                >
                  {saving ? "Guardando…" : "Guardar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
