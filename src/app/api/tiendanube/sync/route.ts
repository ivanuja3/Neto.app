import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { adminClient } from "@/lib/supabase-admin";

const TN_UA = "Neto/1.0 (soporte.online.home@gmail.com)";
const MAX_PAGES = 20; // 4000 órdenes máx por sync

type TnProductItem = {
  id: number;
  name: string | { es?: string; [k: string]: string | undefined };
  price: string;
  quantity: number;
  sku: string | null;
};

type TnOrder = {
  id: number;
  number: number;
  status: string;
  payment_status: string;
  created_at: string;
  total: string;
  subtotal: string;
  discount: string;
  shipping?: { cost?: string } | null;
  products: TnProductItem[];
  payment_details?: { method?: string } | null;
};

function mapPaymentState(s: string): "paid" | "not_paid" | "partial" | "refunded" {
  if (s === "paid" || s === "authorized") return "paid";
  if (s === "refunded" || s === "voided") return "refunded";
  if (s === "partially_paid") return "partial";
  return "not_paid";
}

function mapOrderState(s: string): "delivered" | "cancelled" | "returned" | "confirmed" | "shipped" {
  if (s === "closed") return "delivered";
  if (s === "cancelled") return "cancelled";
  if (s === "returned") return "returned";
  if (s === "shipped") return "shipped";
  return "confirmed";
}

function tnProductName(name: TnProductItem["name"]): string {
  if (typeof name === "string") return name;
  return name?.es ?? Object.values(name)[0] ?? "Producto";
}

export async function POST(req: NextRequest) {
  // Verificar sesión del usuario vía token
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: { user } } = await anonClient.auth.getUser(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = adminClient();

  // Obtener credenciales de TN
  const { data: intRow } = await (db as ReturnType<typeof adminClient>)
    .from("integrations" as never)
    .select("access_token, store_id")
    .eq("user_id", user.id)
    .eq("channel", "tiendanube")
    .maybeSingle() as unknown as { data: { access_token: string; store_id: string } | null };

  if (!intRow?.access_token) {
    return NextResponse.json({ error: "TN no conectado" }, { status: 404 });
  }

  const { access_token, store_id } = intRow;

  // Obtener order_numbers ya existentes para deduplicar
  const { data: existing } = await (db as ReturnType<typeof adminClient>)
    .from("orders" as never)
    .select("order_number")
    .eq("user_id", user.id)
    .eq("channel", "tiendanube") as unknown as { data: { order_number: string }[] | null };

  const existingNums = new Set((existing ?? []).map((o) => o.order_number));

  let synced = 0;
  let skipped = 0;
  let errors = 0;

  for (let page = 1; page <= MAX_PAGES; page++) {
    const res = await fetch(
      `https://api.tiendanube.com/v1/${store_id}/orders?per_page=200&page=${page}`,
      {
        headers: {
          Authentication: `bearer ${access_token}`,
          "User-Agent": TN_UA,
        },
      }
    );

    if (!res.ok) break;

    const orders: TnOrder[] = await res.json();
    if (!Array.isArray(orders) || orders.length === 0) break;

    for (const tnOrder of orders) {
      const orderNum = String(tnOrder.number);

      // Solo importar órdenes pagadas
      if (tnOrder.payment_status !== "paid" && tnOrder.payment_status !== "authorized") {
        skipped++;
        continue;
      }

      if (existingNums.has(orderNum)) {
        skipped++;
        continue;
      }

      const total     = parseFloat(tnOrder.total)    || 0;
      const subtotal  = parseFloat(tnOrder.subtotal) || 0;
      const discount  = parseFloat(tnOrder.discount) || 0;
      const shipping  = parseFloat(tnOrder.shipping?.cost ?? "0") || 0;
      const orderDate = tnOrder.created_at.split("T")[0];

      const { data: newOrder, error: oErr } = await (db as ReturnType<typeof adminClient>)
        .from("orders" as never)
        .insert({
          user_id:        user.id,
          order_number:   orderNum,
          date:           orderDate,
          channel:        "tiendanube",
          state:          mapOrderState(tnOrder.status),
          amount_subtotal: subtotal,
          amount_discount: discount,
          amount_shipping: shipping,
          amount_tax:     0,
          amount_total:   total,
          amount_cost:    0,
          payment_state:  mapPaymentState(tnOrder.payment_status),
          partner_id:     null,
          notes:          `TN #${tnOrder.id}`,
        })
        .select("id")
        .single() as unknown as { data: { id: string } | null; error: unknown };

      if (oErr || !newOrder) { errors++; continue; }

      // Insertar items
      if (tnOrder.products.length > 0) {
        const items = tnOrder.products.map((p) => ({
          user_id:       user.id,
          order_id:      newOrder.id,
          product_id:    null,
          product_name:  tnProductName(p.name),
          qty:           p.quantity || 1,
          price_unit:    parseFloat(p.price) || 0,
          discount_pct:  0,
          cost_unit:     0,
          price_subtotal: (parseFloat(p.price) || 0) * (p.quantity || 1),
          cost_subtotal: 0,
        }));
        await (db as ReturnType<typeof adminClient>).from("order_items" as never).insert(items);
      }

      existingNums.add(orderNum);
      synced++;
    }

    // TN no paginará si devolvió menos de 200
    if (orders.length < 200) break;
  }

  return NextResponse.json({ synced, skipped, errors });
}
