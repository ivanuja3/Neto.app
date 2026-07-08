"use client";

import { useState, useRef, useCallback } from "react";
import { createOrder } from "@/lib/db/orders";
import { X, Upload, FileText, CheckCircle2, AlertCircle, ChevronDown } from "lucide-react";
import * as XLSX from "xlsx";

type ColumnKey =
  | "fecha" | "producto" | "cantidad" | "precio_unit" | "costo_unit"
  | "total" | "canal" | "estado_pago" | "ignorar";

const COLUMN_OPTIONS: { value: ColumnKey; label: string }[] = [
  { value: "fecha",       label: "Fecha" },
  { value: "producto",    label: "Nombre del producto" },
  { value: "cantidad",    label: "Cantidad" },
  { value: "precio_unit", label: "Precio unitario" },
  { value: "costo_unit",  label: "Costo unitario" },
  { value: "total",       label: "Total de la venta" },
  { value: "canal",       label: "Canal de venta" },
  { value: "estado_pago", label: "Estado de pago" },
  { value: "ignorar",     label: "— Ignorar columna —" },
];

const CANALES_MAP: Record<string, string> = {
  tiendanube: "tiendanube", "tienda nube": "tiendanube",
  mercadolibre: "mercadolibre", ml: "mercadolibre", meli: "mercadolibre",
  instagram: "instagram", ig: "instagram",
  whatsapp: "whatsapp", wp: "whatsapp",
  web: "web",
};

// Detección automática de columna por nombre de header
function autoDetect(header: string): ColumnKey {
  const h = header.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
  if (/^(fecha|date|dia|f)/.test(h)) return "fecha";
  if (/^(producto|articulo|titulo|item|nombre|descripcion|product|name)/.test(h)) return "producto";
  if (/^(cantidad|qty|unidades|cant|q)/.test(h)) return "cantidad";
  if (/^(precio.?unit|precio.?venta|price.?unit|p.?unit)/.test(h)) return "precio_unit";
  if (/^(costo.?unit|cost.?unit|c.?unit)/.test(h)) return "costo_unit";
  if (/^(total|monto|importe|amount|facturacion|venta|ingresos|revenue)/.test(h)) return "total";
  if (/^(canal|channel|origen|source)/.test(h)) return "canal";
  if (/^(pago|estado|payment|estado.?pago)/.test(h)) return "estado_pago";
  return "ignorar";
}

// Parser CSV simple: maneja comillas, separadores coma/punto y coma/tab
function parseCSV(text: string): string[][] {
  // Remover BOM UTF-8
  const clean = text.replace(/^﻿/, "");
  const lines = clean.split(/\r?\n/).filter((l) => l.trim());
  const sep = lines[0]?.includes(";") ? ";" : lines[0]?.includes("\t") ? "\t" : ",";

  return lines.map((line) => {
    const row: string[] = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; continue; }
      if (ch === '"') { inQ = !inQ; continue; }
      if (ch === sep && !inQ) { row.push(cur.trim()); cur = ""; continue; }
      cur += ch;
    }
    row.push(cur.trim());
    return row;
  });
}

function parseDate(raw: string): string | null {
  if (!raw) return null;
  // yyyy-mm-dd
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  // dd/mm/yyyy or dd-mm-yyyy
  const m = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  // mm/dd/yyyy (fallback)
  const m2 = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (m2) {
    const y = m2[3].length === 2 ? `20${m2[3]}` : m2[3];
    return `${y}-${m2[1].padStart(2, "0")}-${m2[2].padStart(2, "0")}`;
  }
  return null;
}

function parseNum(raw: string): number {
  if (!raw) return 0;
  // Remover símbolo de moneda y espacios
  const clean = raw.replace(/[$\s]/g, "").replace(/\./g, "").replace(",", ".");
  return parseFloat(clean) || 0;
}

function resolveCanal(raw: string): string {
  const k = raw.toLowerCase().trim().replace(/\s+/g, "");
  return CANALES_MAP[k] ?? "other";
}

type ImportRow = {
  fecha: string;
  producto: string;
  cantidad: number;
  precio_unit: number;
  costo_unit: number;
  total: number;
  canal: string;
  estado_pago: "paid" | "not_paid";
  raw: string[];
};

type Props = {
  userId: string;
  onDone: () => void;
  onClose: () => void;
};

type Step = "upload" | "mapping" | "preview" | "importing" | "done";

const inputCls = "w-full bg-[#0A1628] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-[#F1F5F9] focus:outline-none focus:border-[#10B981]/50 focus:ring-1 focus:ring-[#10B981]/20";

export function CsvImport({ userId, onDone, onClose }: Props) {
  const [step,    setStep]    = useState<Step>("upload");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows,    setRows]    = useState<string[][]>([]);
  const [mapping, setMapping] = useState<ColumnKey[]>([]);
  const [parsed,  setParsed]  = useState<ImportRow[]>([]);
  const [progress, setProgress] = useState(0);
  const [result,  setResult]  = useState({ synced: 0, errors: 0 });
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadFile = useCallback((file: File) => {
    const isExcel = /\.(xlsx|xls)$/i.test(file.name);
    const reader = new FileReader();

    reader.onload = (e) => {
      let allRows: string[][];

      if (isExcel) {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array", cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        // header:1 devuelve arrays de celdas, defval:"" rellena vacíos
        const raw: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", raw: false });
        allRows = raw.map((row) => (row as unknown[]).map((c) => String(c ?? "").trim()));
      } else {
        const text = e.target?.result as string;
        allRows = parseCSV(text);
      }

      // Filtrar filas completamente vacías y filas de solo separadores
      const cleaned = allRows.filter((r) => r.some((c) => c.trim()));
      if (cleaned.length < 2) return;

      const [hdrs, ...dataRows] = cleaned;
      setHeaders(hdrs);
      setRows(dataRows.filter((r) => r.some((c) => c)));
      setMapping(hdrs.map(autoDetect));
      setStep("mapping");
    };

    if (isExcel) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file, "UTF-8");
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && /\.(csv|xlsx|xls)$/i.test(file.name)) loadFile(file);
  }, [loadFile]);

  function buildPreview() {
    const hasTotal      = mapping.includes("total");
    const hasPrecioUnit = mapping.includes("precio_unit");

    const result: ImportRow[] = [];
    for (const row of rows) {
      const get = (k: ColumnKey): string => {
        const idx = mapping.indexOf(k);
        return idx >= 0 ? (row[idx] ?? "") : "";
      };

      const fechaRaw = get("fecha");
      const fecha = parseDate(fechaRaw) ?? new Date().toISOString().split("T")[0];

      const qty = Math.max(1, Math.round(parseNum(get("cantidad")) || 1));
      const precioUnit = parseNum(get("precio_unit"));
      const costoUnit  = parseNum(get("costo_unit"));
      const total      = hasTotal
        ? parseNum(get("total"))
        : hasPrecioUnit
        ? precioUnit * qty
        : 0;

      if (total <= 0 && !hasPrecioUnit) continue; // fila vacía

      result.push({
        fecha,
        producto:   get("producto") || "Producto importado",
        cantidad:   qty,
        precio_unit: precioUnit || (qty > 0 ? total / qty : 0),
        costo_unit:  costoUnit,
        total:       total || precioUnit * qty,
        canal:       resolveCanal(get("canal") || "other"),
        estado_pago: get("estado_pago").toLowerCase().includes("pend") ? "not_paid" : "paid",
        raw:         row,
      });
    }
    setParsed(result);
    setStep("preview");
  }

  async function runImport() {
    setStep("importing");
    let synced = 0;
    let errors = 0;

    for (let i = 0; i < parsed.length; i++) {
      const r = parsed[i];
      const priceUnit  = r.precio_unit || r.total;
      const priceTotal = r.total || priceUnit * r.cantidad;
      const costTotal  = r.costo_unit * r.cantidad;

      const res = await createOrder(
        {
          user_id:         userId,
          date:            r.fecha,
          channel:         r.canal as "tiendanube" | "mercadolibre" | "whatsapp" | "instagram" | "web" | "other",
          state:           "delivered",
          amount_subtotal: priceTotal,
          amount_discount: 0,
          amount_shipping: 0,
          amount_tax:      0,
          amount_total:    priceTotal,
          amount_cost:     costTotal,
          payment_state:   r.estado_pago,
          partner_id:      null,
          order_number:    null,
          notes:           "Importado desde CSV",
        },
        [{
          user_id:       userId,
          order_id:      "",
          product_id:    null,
          product_name:  r.producto,
          qty:           r.cantidad,
          price_unit:    priceUnit,
          discount_pct:  0,
          cost_unit:     r.costo_unit,
          price_subtotal: priceTotal,
          cost_subtotal:  costTotal,
        }]
      );

      if (res) synced++; else errors++;
      setProgress(Math.round(((i + 1) / parsed.length) * 100));
    }

    setResult({ synced, errors });
    setStep("done");
    onDone();
  }

  /* ── Render ── */
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(6,13,25,0.85)", backdropFilter: "blur(6px)" }}>
      <div className="bg-[#0C1424] border border-white/[0.08] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <div>
            <h2 className="text-[15px] font-semibold text-[#F1F5F9]">Importar ventas desde CSV</h2>
            <p className="text-[12px] text-[#475569] mt-0.5">
              {step === "upload" && "Subí tu archivo CSV de MercadoLibre, Excel u otra fuente"}
              {step === "mapping" && `${rows.length} filas detectadas — Configurá el mapeo de columnas`}
              {step === "preview" && `${parsed.length} ventas listas para importar`}
              {step === "importing" && `Importando... ${progress}%`}
              {step === "done" && "Importación completada"}
            </p>
          </div>
          <button onClick={onClose} className="text-[#475569] hover:text-[#F1F5F9] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* STEP 1: Upload */}
          {step === "upload" && (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className="cursor-pointer rounded-xl border-2 border-dashed transition-all flex flex-col items-center justify-center py-16 gap-4"
              style={{ borderColor: dragging ? "#10B981" : "rgba(255,255,255,0.08)", background: dragging ? "rgba(16,185,129,0.04)" : "rgba(255,255,255,0.02)" }}
            >
              <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "rgba(16,185,129,0.1)" }}>
                <Upload className="w-6 h-6 text-[#10B981]" />
              </div>
              <div className="text-center">
                <p className="text-[14px] font-semibold text-[#F1F5F9]">Arrastrá tu archivo o hacé click para seleccionar</p>
                <p className="text-[12px] text-[#475569] mt-1">Excel (.xlsx · .xls) o CSV — cualquier fuente</p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 text-[11px] text-[#334155]">
                {["Tu Excel propio", "MercadoLibre", "Tienda Nube", "Google Sheets", "Sistema anterior"].map((s) => (
                  <span key={s} className="px-2.5 py-1 rounded-full border border-white/[0.06]">{s}</span>
                ))}
              </div>
              <input ref={fileRef} type="file"
                accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) loadFile(f); }} />
            </div>
          )}

          {/* STEP 2: Mapping */}
          {step === "mapping" && (
            <div className="space-y-4">
              <p className="text-[12px] text-[#64748B]">Verificá que cada columna del archivo corresponda al campo correcto. Neto detectó lo que pudo automáticamente.</p>
              <div className="space-y-2">
                {headers.map((h, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-mono text-[#94A3B8] truncate">{h}</p>
                      <p className="text-[10px] text-[#334155] mt-0.5 truncate">
                        Ej: {rows.slice(0, 3).map((r) => r[i] ?? "").filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <div className="relative w-52 shrink-0">
                      <select
                        value={mapping[i]}
                        onChange={(e) => setMapping((m) => { const n = [...m]; n[i] = e.target.value as ColumnKey; return n; })}
                        className={inputCls + " appearance-none pr-8"}
                      >
                        {COLUMN_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#475569] pointer-events-none" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 3: Preview */}
          {step === "preview" && (
            <div className="space-y-4">
              <div className="overflow-x-auto rounded-lg border border-white/[0.06]">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      {["Fecha", "Producto", "Cant.", "Precio", "Costo", "Total", "Canal"].map((h) => (
                        <th key={h} className="text-left text-[11px] text-[#475569] px-4 py-2.5 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.slice(0, 8).map((r, i) => (
                      <tr key={i} className={i < parsed.slice(0,8).length - 1 ? "border-b border-white/[0.04]" : ""}>
                        <td className="px-4 py-2.5 text-[#94A3B8] font-mono">{r.fecha}</td>
                        <td className="px-4 py-2.5 text-[#F1F5F9] max-w-[160px] truncate">{r.producto}</td>
                        <td className="px-4 py-2.5 text-[#94A3B8] font-mono">{r.cantidad}</td>
                        <td className="px-4 py-2.5 text-[#94A3B8] font-mono">${r.precio_unit.toLocaleString("es-AR")}</td>
                        <td className="px-4 py-2.5 text-[#94A3B8] font-mono">{r.costo_unit > 0 ? `$${r.costo_unit.toLocaleString("es-AR")}` : "—"}</td>
                        <td className="px-4 py-2.5 text-[#10B981] font-mono font-semibold">${r.total.toLocaleString("es-AR")}</td>
                        <td className="px-4 py-2.5 text-[#94A3B8] capitalize">{r.canal}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsed.length > 8 && (
                <p className="text-[11px] text-[#475569] text-center">
                  Mostrando 8 de {parsed.length} filas
                </p>
              )}
              <div className="p-4 rounded-xl border border-[#10B981]/20 bg-[#10B981]/[0.04] flex items-start gap-3">
                <FileText className="w-4 h-4 text-[#10B981] mt-0.5 shrink-0" />
                <div>
                  <p className="text-[13px] font-semibold text-[#F1F5F9]">
                    {parsed.length} ventas listas para importar
                  </p>
                  <p className="text-[11px] text-[#64748B] mt-0.5">
                    Las ventas sin costo unitario se guardarán con costo $0 — podés editarlo después.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Importing */}
          {step === "importing" && (
            <div className="flex flex-col items-center justify-center py-12 gap-6">
              <div className="w-16 h-16 rounded-full border-2 border-[#10B981]/20 flex items-center justify-center relative">
                <span className="text-lg font-bold font-mono text-[#10B981]">{progress}%</span>
                <svg className="absolute inset-0 w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                  <circle cx="32" cy="32" r="29" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="2" />
                  <circle cx="32" cy="32" r="29" fill="none" stroke="#10B981" strokeWidth="2"
                    strokeDasharray={`${2 * Math.PI * 29}`}
                    strokeDashoffset={`${2 * Math.PI * 29 * (1 - progress / 100)}`}
                    className="transition-all duration-300" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-[14px] font-semibold text-[#F1F5F9]">Importando ventas...</p>
                <p className="text-[12px] text-[#475569] mt-1">
                  {Math.round(progress / 100 * parsed.length)} de {parsed.length} procesadas
                </p>
              </div>
            </div>
          )}

          {/* STEP 5: Done */}
          {step === "done" && (
            <div className="flex flex-col items-center justify-center py-12 gap-5">
              <div className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: "rgba(16,185,129,0.1)" }}>
                <CheckCircle2 className="w-8 h-8 text-[#10B981]" />
              </div>
              <div className="text-center">
                <p className="text-[18px] font-bold text-[#F1F5F9]">
                  ¡{result.synced} ventas importadas!
                </p>
                {result.errors > 0 && (
                  <p className="text-[12px] text-[#F59E0B] mt-1 flex items-center justify-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {result.errors} filas con error (datos inválidos o incompletos)
                  </p>
                )}
                <p className="text-[13px] text-[#64748B] mt-2">
                  Ya aparecen en tu dashboard y en los análisis.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-white/[0.06] flex items-center justify-between gap-3">
          <button onClick={onClose}
            className="text-sm text-[#475569] hover:text-[#94A3B8] transition-colors">
            {step === "done" ? "Cerrar" : "Cancelar"}
          </button>
          <div className="flex gap-3">
            {step === "mapping" && (
              <button onClick={() => setStep("upload")}
                className="text-sm px-4 py-2 rounded-lg border border-white/[0.08] text-[#94A3B8] hover:border-white/[0.15] transition-colors">
                Volver
              </button>
            )}
            {step === "preview" && (
              <button onClick={() => setStep("mapping")}
                className="text-sm px-4 py-2 rounded-lg border border-white/[0.08] text-[#94A3B8] hover:border-white/[0.15] transition-colors">
                Volver
              </button>
            )}
            {step === "mapping" && (
              <button onClick={buildPreview}
                className="text-sm font-semibold px-5 py-2 rounded-lg text-[#080E1A] bg-[#10B981] hover:opacity-90 transition-opacity">
                Ver vista previa →
              </button>
            )}
            {step === "preview" && (
              <button onClick={runImport}
                className="text-sm font-semibold px-5 py-2 rounded-lg text-[#080E1A] bg-[#10B981] hover:opacity-90 transition-opacity">
                Importar {parsed.length} ventas
              </button>
            )}
            {step === "done" && (
              <button onClick={onClose}
                className="text-sm font-semibold px-5 py-2 rounded-lg text-[#080E1A] bg-[#10B981] hover:opacity-90 transition-opacity">
                Listo
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
