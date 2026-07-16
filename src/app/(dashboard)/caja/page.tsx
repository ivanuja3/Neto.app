"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "@/components/auth-provider";
import { getProducts, registerStockMove } from "@/lib/db/products";
import { createOrder } from "@/lib/db/orders";
import { getCustomers } from "@/lib/db/purchases";
import { formatARS } from "@/lib/mock-data";
import type { Product, ProductCategory } from "@/lib/types/database";
import {
  Search, X, Plus, Minus, Trash2, ScanLine, ShoppingBag,
  CheckCircle2, ChevronRight, Zap,
} from "lucide-react";

/* ── Tipos ── */
interface CartItem {
  productId: string;
  name: string;
  sku: string | null;
  qty: number;
  priceUnit: number;
  priceCash: number | null;
  priceList: number;
  priceInstallments: number | null;
  cost: number;
}

type PriceMode = "cash" | "list" | "installments";

const METODOS = [
  { key: "cash",            label: "Efectivo",       short: "EFE" },
  { key: "debit",           label: "Débito",          short: "DEB" },
  { key: "transfer",        label: "Transferencia",   short: "TRF" },
  { key: "mercadopago",     label: "MercadoPago",     short: "MP"  },
  { key: "installments_3",  label: "3 cuotas",        short: "3C"  },
  { key: "installments_6",  label: "6 cuotas",        short: "6C"  },
  { key: "installments_12", label: "12 cuotas",       short: "12C" },
  { key: "other",           label: "Otro",            short: "OTR" },
];

function itemSubtotal(i: CartItem) { return i.qty * i.priceUnit; }
function cartTotal(items: CartItem[]) { return items.reduce((s, i) => s + itemSubtotal(i), 0); }
function cartCost(items: CartItem[])  { return items.reduce((s, i) => s + i.qty * i.cost, 0); }

/* ── Componente principal ── */
export default function CajaPage() {
  const { user } = useAuth();

  /* Productos */
  const [products,   setProducts]   = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [catFilter,  setCatFilter]  = useState("");
  const [search,     setSearch]     = useState("");
  const [loading,    setLoading]    = useState(true);

  /* Carrito */
  const [cart,       setCart]       = useState<CartItem[]>([]);
  const [priceMode,  setPriceMode]  = useState<PriceMode>("cash");
  const [metodo,     setMetodo]     = useState("cash");

  /* Clientes */
  const [clientList,       setClientList]       = useState<{ id: string; name: string }[]>([]);
  const [partnerId,        setPartnerId]        = useState<string | null>(null);
  const [partnerSearch,    setPartnerSearch]    = useState("");
  const [showPartnerDrop,  setShowPartnerDrop]  = useState(false);

  /* Checkout */
  const [completing, setCompleting] = useState(false);
  const [success,    setSuccess]    = useState<{ total: number; metodo: string } | null>(null);
  const [efectivo,   setEfectivo]   = useState("");

  const searchRef = useRef<HTMLInputElement>(null);

  /* Carga clientes */
  useEffect(() => {
    if (!user) return;
    getCustomers(user.id).then((res) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setClientList((res.data ?? []).map((c: any) => ({ id: c.id, name: c.name })));
    });
  }, [user]);

  /* Carga de productos */
  useEffect(() => {
    if (!user) return;
    getProducts(user.id).then((res) => {
      const ps: Product[] = (res as unknown as { data: Product[] | null }).data ?? [];
      setProducts(ps);
      const cats = [...new Set(ps.map((p) => p.category_id).filter(Boolean))] as string[];
      setCategories(cats);
      setLoading(false);
    });
  }, [user]);

  /* Filtrado */
  const filtered = products.filter((p) => {
    const matchSearch = search.length === 0 ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.sku ?? "").toLowerCase().includes(search.toLowerCase());
    const matchCat = !catFilter || p.category_id === catFilter;
    return matchSearch && matchCat && p.active;
  });

  /* Precio según modo */
  function resolvePrice(p: Product): number {
    if (priceMode === "cash" && p.price_cash)         return p.price_cash;
    if (priceMode === "installments" && p.price_installments) return p.price_installments;
    return p.list_price;
  }

  /* Agregar al carrito */
  const addToCart = useCallback((p: Product) => {
    const price = resolvePrice(p);
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === p.id);
      if (existing) {
        return prev.map((i) => i.productId === p.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, {
        productId: p.id,
        name: p.name,
        sku: p.sku,
        qty: 1,
        priceUnit: price,
        priceCash: p.price_cash,
        priceList: p.list_price,
        priceInstallments: p.price_installments,
        cost: p.standard_cost,
      }];
    });
    setSearch("");
    setTimeout(() => searchRef.current?.focus(), 50);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priceMode]);

  function updateQty(productId: string, delta: number) {
    setCart((prev) =>
      prev.map((i) => i.productId === productId
        ? { ...i, qty: Math.max(1, i.qty + delta) }
        : i
      )
    );
  }

  function removeItem(productId: string) {
    setCart((prev) => prev.filter((i) => i.productId !== productId));
  }

  const filteredClients = clientList
    .filter((c) => !partnerSearch || c.name.toLowerCase().includes(partnerSearch.toLowerCase()))
    .slice(0, 6);

  function selectPartner(c: { id: string; name: string }) {
    setPartnerId(c.id);
    setPartnerSearch(c.name);
    setShowPartnerDrop(false);
  }

  function clearPartner() {
    setPartnerId(null);
    setPartnerSearch("");
  }

  function clearCart() {
    setCart([]);
    setSearch("");
    setEfectivo("");
    clearPartner();
    setTimeout(() => searchRef.current?.focus(), 50);
  }

  /* Lector de barras: Enter en el input busca por SKU exacto */
  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter" || !search.trim()) return;
    const bySkuExact = products.find(
      (p) => (p.sku ?? "").toLowerCase() === search.trim().toLowerCase()
    );
    if (bySkuExact) { addToCart(bySkuExact); return; }
    if (filtered.length === 1) addToCart(filtered[0]);
  }

  /* Cobrar */
  async function handleCobrar() {
    if (!user || cart.length === 0) return;
    setCompleting(true);
    try {
      const total = cartTotal(cart);
      const cost  = cartCost(cart);
      const order = await createOrder(
        {
          user_id: user.id,
          partner_id: partnerId,
          order_number: null,
          date: new Date().toISOString().slice(0, 10),
          state: "delivered",
          channel: "other",
          amount_subtotal: total,
          amount_discount: 0,
          amount_shipping: 0,
          amount_tax: 0,
          amount_total: total,
          amount_cost: cost,
          payment_state: "paid",
          payment_method: metodo,
          notes: "Venta por caja POS",
        },
        cart.map((i) => ({
          user_id: user.id,
          order_id: "",
          product_id: i.productId,
          product_name: i.name,
          qty: i.qty,
          price_unit: i.priceUnit,
          discount_pct: 0,
          cost_unit: i.cost,
          price_subtotal: itemSubtotal(i),
          cost_subtotal: i.qty * i.cost,
        }))
      );

      if (order) {
        await Promise.all(
          cart.map((i) =>
            registerStockMove({
              user_id: user.id,
              product_id: i.productId,
              type: "out",
              qty: i.qty,
              cost_unit: i.cost,
              ref_type: "order",
              ref_id: order.id,
              date: order.date,
              notes: null,
            })
          )
        );
      }

      setSuccess({ total, metodo });
      clearCart();
    } catch (err) {
      console.error("Caja cobrar error:", err);
    } finally {
      setCompleting(false);
    }
  }

  const total = cartTotal(cart);
  const vuelto = metodo === "cash" && efectivo
    ? Math.max(0, Number(efectivo.replace(/\D/g, "")) - total)
    : null;

  /* ── Pantalla de éxito ── */
  if (success) {
    const metodoLabel = METODOS.find((m) => m.key === success.metodo)?.label ?? success.metodo;
    return (
      <div className="h-screen bg-[#080E1A] flex flex-col items-center justify-center gap-6 px-8">
        <div className="w-20 h-20 rounded-full bg-[#10B981]/15 flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10 text-[#10B981]" />
        </div>
        <div className="text-center">
          <p className="text-3xl font-bold font-mono text-[#F1F5F9]">{formatARS(success.total)}</p>
          <p className="text-sm text-[#475569] mt-2">{metodoLabel} · Venta registrada</p>
        </div>
        <button
          onClick={() => setSuccess(null)}
          className="mt-4 bg-[#10B981] hover:bg-[#059669] text-[#080E1A] font-bold text-sm px-8 py-3 rounded-xl transition-colors flex items-center gap-2"
        >
          <Zap className="w-4 h-4" />
          Nueva venta
        </button>
      </div>
    );
  }

  /* ── Layout principal ── */
  return (
    <div className="h-screen bg-[#080E1A] flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.05] shrink-0">
        <ScanLine className="w-4 h-4 text-[#10B981] shrink-0" />
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#475569]" />
          <input
            ref={searchRef}
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Buscar producto o escanear código de barras..."
            className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl pl-9 pr-4 py-2 text-sm text-[#F1F5F9] placeholder-[#334155] focus:outline-none focus:border-[#10B981]/40 focus:bg-white/[0.07] transition-all"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#475569] hover:text-[#94A3B8]">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Modo precio global */}
        <div className="flex gap-1 ml-2">
          {([
            { mode: "cash" as PriceMode,         label: "Efectivo",    color: "text-[#10B981] border-[#10B981]/30 bg-[#10B981]/10" },
            { mode: "list" as PriceMode,          label: "Lista",       color: "text-[#94A3B8] border-white/[0.14] bg-white/[0.04]" },
            { mode: "installments" as PriceMode,  label: "Cuotas",      color: "text-[#F59E0B] border-[#F59E0B]/30 bg-[#F59E0B]/10" },
          ]).map((opt) => (
            <button key={opt.mode} onClick={() => setPriceMode(opt.mode)}
              className={`text-[11px] font-semibold border rounded-lg px-2.5 py-1 transition-all ${
                priceMode === opt.mode ? opt.color : "text-[#334155] border-white/[0.06] hover:border-white/[0.12] hover:text-[#475569]"
              }`}>
              {opt.label}
            </button>
          ))}
        </div>

        <p className="ml-auto text-xs text-[#334155] font-mono shrink-0">
          {new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>

      {/* Body: izquierda productos, derecha carrito */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Panel izquierdo: productos ── */}
        <div className="flex-1 flex flex-col overflow-hidden border-r border-white/[0.05]">
          {/* Category chips */}
          {categories.length > 0 && (
            <div className="flex gap-2 px-4 py-2.5 border-b border-white/[0.04] overflow-x-auto shrink-0">
              <button onClick={() => setCatFilter("")}
                className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
                  !catFilter ? "bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30" : "text-[#475569] border-white/[0.08] hover:border-white/[0.16]"
                }`}>
                Todos
              </button>
              {categories.map((c) => (
                <button key={c} onClick={() => setCatFilter(catFilter === c ? "" : c)}
                  className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
                    catFilter === c ? "bg-[#3B82F6]/15 text-[#3B82F6] border-[#3B82F6]/30" : "text-[#475569] border-white/[0.08] hover:border-white/[0.16]"
                  }`}>
                  {c}
                </button>
              ))}
            </div>
          )}

          {/* Grid de productos */}
          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="bg-white/[0.04] rounded-xl h-24 animate-pulse" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                <ShoppingBag className="w-8 h-8 text-[#1E2D3D]" />
                <p className="text-sm text-[#475569] font-semibold">
                  {search ? `Sin resultados para "${search}"` : "Sin productos"}
                </p>
                {!search && (
                  <p className="text-xs text-[#334155]">Importá productos desde Inventario para usarlos en caja</p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {filtered.map((p) => {
                  const price = resolvePrice(p);
                  const inCart = cart.find((i) => i.productId === p.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => addToCart(p)}
                      className={`relative text-left p-3 rounded-xl border transition-all group ${
                        inCart
                          ? "bg-[#10B981]/[0.08] border-[#10B981]/25 hover:bg-[#10B981]/[0.14]"
                          : "bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.07] hover:border-white/[0.14]"
                      }`}
                    >
                      {inCart && (
                        <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#10B981] text-[#080E1A] text-[10px] font-bold flex items-center justify-center">
                          {inCart.qty}
                        </span>
                      )}
                      <p className="text-[12px] font-semibold text-[#F1F5F9] leading-snug line-clamp-2 pr-6">{p.name}</p>
                      {p.sku && <p className="text-[10px] text-[#334155] font-mono mt-1">{p.sku}</p>}
                      <p className={`text-[13px] font-mono font-bold mt-2 ${
                        priceMode === "cash" ? "text-[#10B981]" : priceMode === "installments" ? "text-[#F59E0B]" : "text-[#94A3B8]"
                      }`}>
                        {formatARS(price)}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Panel derecho: carrito ── */}
        <div className="w-[340px] shrink-0 flex flex-col bg-[#060D19]">
          {/* Cart header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.05] shrink-0">
            <p className="text-sm font-semibold text-[#F1F5F9]">
              Carrito
              {cart.length > 0 && <span className="ml-2 text-xs font-normal text-[#475569]">{cart.length} {cart.length === 1 ? "ítem" : "ítems"}</span>}
            </p>
            {cart.length > 0 && (
              <button onClick={clearCart} className="text-[11px] text-[#475569] hover:text-[#EF4444] transition-colors flex items-center gap-1">
                <Trash2 className="w-3 h-3" />
                Limpiar
              </button>
            )}
          </div>

          {/* Items */}
          <div className="flex-1 overflow-y-auto">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
                <ShoppingBag className="w-8 h-8 text-[#1E2D3D]" />
                <p className="text-xs text-[#334155]">Seleccioná o escaneá productos para agregarlos al carrito</p>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {cart.map((item) => (
                  <div key={item.productId} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="text-[12px] font-semibold text-[#F1F5F9] leading-snug flex-1 min-w-0 truncate">{item.name}</p>
                      <button onClick={() => removeItem(item.productId)} className="text-[#475569] hover:text-[#EF4444] transition-colors shrink-0 mt-0.5">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-0 bg-white/[0.04] rounded-lg border border-white/[0.08] overflow-hidden">
                        <button onClick={() => updateQty(item.productId, -1)}
                          className="w-7 h-7 flex items-center justify-center text-[#475569] hover:text-[#F1F5F9] hover:bg-white/[0.06] transition-colors">
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-8 text-center text-[13px] font-mono font-semibold text-[#F1F5F9]">{item.qty}</span>
                        <button onClick={() => updateQty(item.productId, 1)}
                          className="w-7 h-7 flex items-center justify-center text-[#475569] hover:text-[#F1F5F9] hover:bg-white/[0.06] transition-colors">
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <p className="text-[13px] font-mono font-bold text-[#F1F5F9]">
                        {formatARS(itemSubtotal(item))}
                      </p>
                    </div>
                    <p className="text-[10px] text-[#334155] mt-1 font-mono">{formatARS(item.priceUnit)} × {item.qty}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Checkout */}
          <div className="border-t border-white/[0.06] px-4 pt-3 pb-4 space-y-3 shrink-0">
            {/* Cliente opcional */}
            <div className="relative">
              {partnerId ? (
                <div className="flex items-center justify-between bg-[#10B981]/[0.08] border border-[#10B981]/20 rounded-lg px-3 py-2">
                  <span className="text-xs font-medium text-[#10B981] truncate">{partnerSearch}</span>
                  <button onClick={clearPartner} className="text-[#10B981]/60 hover:text-[#10B981] ml-2 shrink-0 transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <input
                    value={partnerSearch}
                    onChange={(e) => { setPartnerSearch(e.target.value); setShowPartnerDrop(true); }}
                    onFocus={() => setShowPartnerDrop(true)}
                    onBlur={() => setTimeout(() => setShowPartnerDrop(false), 150)}
                    placeholder="Cliente (opcional)"
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-[#F1F5F9] placeholder-[#334155] focus:outline-none focus:border-white/[0.16] transition-colors"
                  />
                  {showPartnerDrop && filteredClients.length > 0 && (
                    <div className="absolute bottom-full mb-1 left-0 right-0 bg-[#0C1424] border border-white/[0.10] rounded-lg overflow-hidden shadow-xl z-20">
                      {filteredClients.map((c) => (
                        <button
                          key={c.id}
                          onMouseDown={() => selectPartner(c)}
                          className="w-full text-left px-3 py-2 text-xs text-[#94A3B8] hover:bg-white/[0.06] hover:text-[#F1F5F9] transition-colors"
                        >
                          {c.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Total */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#475569]">Total</span>
              <span className="text-2xl font-bold tabular-nums text-[#F1F5F9]">{formatARS(total)}</span>
            </div>

            {/* Método de pago */}
            <div className="grid grid-cols-4 gap-1.5">
              {METODOS.map((m) => (
                <button key={m.key} onClick={() => setMetodo(m.key)}
                  className={`py-1.5 rounded-lg text-[10px] font-bold border transition-all ${
                    metodo === m.key
                      ? "bg-[#3B82F6]/15 text-[#3B82F6] border-[#3B82F6]/30"
                      : "text-[#475569] border-white/[0.08] hover:border-white/[0.16] hover:text-[#94A3B8]"
                  }`}>
                  {m.short}
                </button>
              ))}
            </div>

            {/* Efectivo recibido + vuelto */}
            {metodo === "cash" && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#475569] shrink-0">Recibido</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={efectivo}
                    onChange={(e) => setEfectivo(e.target.value.replace(/\D/g, ""))}
                    placeholder="0"
                    className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5 text-sm text-[#F1F5F9] font-mono text-right focus:outline-none focus:border-[#10B981]/40"
                  />
                </div>
                {vuelto !== null && vuelto > 0 && (
                  <div className="flex items-center justify-between bg-[#10B981]/[0.08] rounded-lg px-3 py-1.5">
                    <span className="text-xs text-[#10B981]">Vuelto</span>
                    <span className="text-sm font-mono font-bold text-[#10B981]">{formatARS(vuelto)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Botón cobrar */}
            <button
              onClick={handleCobrar}
              disabled={cart.length === 0 || completing}
              className="w-full py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed bg-[#10B981] hover:bg-[#059669] text-[#080E1A]"
            >
              {completing ? (
                <span className="animate-pulse">Procesando...</span>
              ) : (
                <>
                  <ChevronRight className="w-4 h-4" />
                  Cobrar {cart.length > 0 ? formatARS(total) : ""}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
