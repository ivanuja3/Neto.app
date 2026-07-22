import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase-admin";
import { verifyTnWebhook } from "@/lib/tn-webhook";

const TN_UA = "Neto/1.0 (soporte.online.home@gmail.com)";

type TnWebhookBody = {
  store_id: number;
  event: string;
  id: number;
};

type TnOrderDetail = {
  id: number;
  number: number;
  status: string;
  payment_status: string;
  created_at: string;
  total: string;
  subtotal: string;
  discount: string;
  shipping?: { cost?: string } | null;
  products: Array<{
    name: string | { es?: string; [k: string]: string | undefined };
    price: string;
    quantity: number;
    sku: string | null;
  }>;
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

function resolveProductName(name: TnOrderDetail["products"][0]["name"]): string {
  if (typeof name === "string") return name;
  return name?.es ?? Object.values(name ?? {})[0] ?? "Producto";
}

export async function POST(req: NextRequest) {
  const { valid, body: parsed } = await verifyTnWebhook(req);
  if (!valid) return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  if (!parsed) return NextResponse.json({ ok: false }, { status: 400 });
  const body = parsed as TnWebhookBody;

  // Solo procesar órdenes pagadas
  if (!body.event?.includes("order")) {
    return NextResponse.json({ ok: true, skipped: "non-order event" });
  }

  const storeId = String(body.store_id);
  const orderId = body.id;
  if (!storeId || !orderId) return NextResponse.json({ ok: false }, { status: 400 });

  const db = adminClient();

  // Buscar qué usuario tiene esta tienda conectada
  const { data: intRow } = await (db as ReturnType<typeof adminClient>)
    .from("integrations" as never)
    .select("user_id, access_token")
    .eq("channel", "tiendanube")
    .eq("store_id", storeId)
    .maybeSingle() as unknown as { data: { user_id: string; access_token: string } | null };

  if (!intRow) return NextResponse.json({ ok: true, skipped: "store not found" });

  const { user_id, access_token } = intRow;

  // Obtener detalle completo de la orden desde TN
  const res = await fetch(
    `https://api.tiendanube.com/v1/${storeId}/orders/${orderId}`,
    {
      headers: {
        Authentication: `bearer ${access_token}`,
        "User-Agent": TN_UA,
      },
    }
  );

  if (!res.ok) return NextResponse.json({ ok: false, error: "TN fetch failed" }, { status: 502 });

  const tnOrder: TnOrderDetail = await res.json();

  // Solo importar si está pagada
  if (tnOrder.payment_status !== "paid" && tnOrder.payment_status !== "authorized") {
    return NextResponse.json({ ok: true, skipped: "not paid" });
  }

  const orderNum = String(tnOrder.number);

  const total    = parseFloat(tnOrder.total)    || 0;
  const subtotal = parseFloat(tnOrder.subtotal) || 0;
  const discount = parseFloat(tnOrder.discount) || 0;
  const shipping = parseFloat(tnOrder.shipping?.cost ?? "0") || 0;
  const orderDate = tnOrder.created_at.split("T")[0];

  // upsert con ON CONFLICT DO NOTHING (constraint orders_user_channel_number_unique)
  // en vez de "leer si existe, después insertar" — ese patrón tiene una
  // ventana de carrera si el webhook se reintenta o se solapa con un sync manual.
  const { data: newOrder, error } = await (db as ReturnType<typeof adminClient>)
    .from("orders" as never)
    .upsert(
      {
        user_id,
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
      },
      { onConflict: "user_id,channel,order_number", ignoreDuplicates: true }
    )
    .select("id")
    .maybeSingle() as unknown as { data: { id: string } | null; error: unknown };

  if (error) return NextResponse.json({ ok: false, error: "insert failed" }, { status: 500 });
  if (!newOrder) return NextResponse.json({ ok: true, skipped: "duplicate" });

  if (tnOrder.products.length > 0) {
    const items = tnOrder.products.map((p) => ({
      user_id,
      order_id:      newOrder.id,
      product_id:    null,
      product_name:  resolveProductName(p.name),
      qty:           p.quantity || 1,
      price_unit:    parseFloat(p.price) || 0,
      discount_pct:  0,
      cost_unit:     0,
      price_subtotal: (parseFloat(p.price) || 0) * (p.quantity || 1),
      cost_subtotal: 0,
    }));
    await (db as ReturnType<typeof adminClient>).from("order_items" as never).insert(items);
  }

  return NextResponse.json({ ok: true, synced: orderNum });
}
