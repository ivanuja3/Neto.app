"use client";

import { useState, useRef, useCallback } from "react";
import { createProduct, registerStockMove } from "@/lib/db/products";
import { X, Upload, CheckCircle2, AlertCircle, ChevronDown } from "lucide-react";
import * as XLSX from "xlsx";

type ColKey = "nombre" | "sku" | "precio" | "price_cash" | "price_installments" | "costo" | "categoria" | "stock" | "ignorar";

const COL_OPTIONS: { value: ColKey; label: string }[] = [
  { value: "nombre",             label: "Nombre del producto" },
  { value: "sku",                label: "SKU / Código" },
  { value: "precio",             label: "Precio lista" },
  { value: "price_cash",         label: "Precio efectivo / contado" },
  { value: "price_installments", label: "Precio cuotas" },
  { value: "costo",              label: "Costo unitario" },
  { value: "categoria",          label: "Categoría / Tipo" },
  { value: "stock",              label: "Stock inicial" },
  { value: "ignorar",            label: "— Ignorar columna —" },
];

function autoDetect(header: string): ColKey {
  const h = header.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
  if (/^(nombre|producto|descripcion|articulo|item|name|product)/.test(h)) return "nombre";
  if (/^(sku|codigo|code|ref|referencia|barcode)/.test(h))                 return "sku";
  if (/efectivo|contado/.test(h))                                           return "price_cash";
  if (/cuota|instalment|installment/.test(h))                               return "price_installments";
  if (/^(precio.?de.?lista|list.?price|precio lista)/.test(h))             return "precio";
  if (/^(precio|price|pvp|precio.?venta)/.test(h))                         return "precio";
  if (/^(costo|cost|precio.?costo|standard.?cost)/.test(h))                return "costo";
  if (/^(tipo|categoria|category|rubro|tipo.?de.?producto)/.test(h))       return "categoria";
  if (/^(stock|inventario|cantidad|qty|unidades|existencias)/.test(h))     return "stock";
  return "ignorar";
}

function parseCSV(text: string): string[][] {
  const clean = text.replace(/^﻿/, "");
  const lines = clean.split(/\r?\n/).filter((l) => l.trim());
  const sep = lines[0]?.includes(";") ? ";" : lines[0]?.includes("\t") ? "\t" : ",";
  return lines.map((line) => {
    const row: string[] = [];
    let cur = ""; let inQ = false;
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

function parseNum(raw: string): number {
  return parseFloat(raw.replace(/[$\s]/g, "").replace(/\./g, "").replace(",", ".")) || 0;
}

type ImportRow = { nombre: string; sku: string; precio: number; price_cash: number | null; price_installments: number | null; costo: number; categoria: string; stock: number };

const inputCls = "w-full bg-[#0A1628] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-[#F1F5F9] focus:outline-none focus:border-[#10B981]/50";

type Props = { userId: string; onDone: () => void; onClose: () => void };
type Step  = "upload" | "mapping" | "preview" | "importing" | "done";

export function ProductImport({ userId, onDone, onClose }: Props) {
  const [step,     setStep]     = useState<Step>("upload");
  const [headers,  setHeaders]  = useState<string[]>([]);
  const [rows,     setRows]     = useState<string[][]>([]);
  const [mapping,  setMapping]  = useState<ColKey[]>([]);
  const [parsed,   setParsed]   = useState<ImportRow[]>([]);
  const [progress, setProgress] = useState(0);
  const [result,   setResult]   = useState({ synced: 0, errors: 0 });
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadFile = useCallback((file: File) => {
    const isExcel = /\.(xlsx|xls)$/i.test(file.name);
    const reader  = new FileReader();
    reader.onload = (e) => {
      let allRows: string[][];
      if (isExcel) {
        const wb  = XLSX.read(new Uint8Array(e.target?.result as ArrayBuffer), { type: "array", cellDates: true });
        const ws  = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "", raw: false });
        allRows = (raw as unknown[][]).map((r) => r.map((c) => String(c ?? "").trim()));
      } else {
        allRows = parseCSV(e.target?.result as string);
      }
      const cleaned = allRows.filter((r) => r.some((c) => c.trim()));
      if (cleaned.length < 2) return;
      const [hdrs, ...data] = cleaned;
      setHeaders(hdrs);
      setRows(data.filter((r) => r.some((c) => c)));
      setMapping(hdrs.map(autoDetect));
      setStep("mapping");
    };
    isExcel ? reader.readAsArrayBuffer(file) : reader.readAsText(file, "UTF-8");
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && /\.(csv|xlsx|xls)$/i.test(f.name)) loadFile(f);
  }, [loadFile]);

  function buildPreview() {
    const result: ImportRow[] = [];
    for (const row of rows) {
      const get = (k: ColKey) => { const i = mapping.indexOf(k); return i >= 0 ? (row[i] ?? "") : ""; };
      const nombre = get("nombre").trim();
      if (!nombre) continue;
      const pCash  = parseNum(get("price_cash"));
      const pInst  = parseNum(get("price_installments"));
      result.push({
        nombre,
        sku:                get("sku").trim(),
        precio:             parseNum(get("precio")),
        price_cash:         pCash  > 0 ? pCash  : null,
        price_installments: pInst  > 0 ? pInst  : null,
        costo:              parseNum(get("costo")),
        categoria:          get("categoria").trim(),
        stock:              Math.round(parseNum(get("stock"))) || 0,
      });
    }
    setParsed(result);
    setStep("preview");
  }

  async function runImport() {
    setStep("importing");
    let synced = 0; let errors = 0;
    const today = new Date().toISOString().split("T")[0];

    for (let i = 0; i < parsed.length; i++) {
      const r = parsed[i];
      const { data: prod, error } = await createProduct({
        user_id:            userId,
        name:               r.nombre,
        sku:                r.sku || `SKU-${Date.now()}-${i}`,
        category_id:        null,
        list_price:         r.precio,
        price_cash:         r.price_cash,
        price_installments: r.price_installments,
        standard_cost:      r.costo,
        active:             true,
        type:               "physical",
        notes:              r.categoria ? `Tipo: ${r.categoria}` : null,
        barcode:            null,
        image_url:          null,
      });

      if (error || !prod) { errors++; setProgress(Math.round(((i + 1) / parsed.length) * 100)); continue; }

      if (r.stock > 0) {
        await registerStockMove({
          user_id:    userId,
          product_id: prod.id,
          type:       "in",
          qty:        r.stock,
          date:       today,
          cost_unit:  r.costo,
          notes:      "Stock inicial importado",
          ref_type:   "manual",
          ref_id:     null,
        }).catch(() => null);
      }

      synced++;
      setProgress(Math.round(((i + 1) / parsed.length) * 100));
    }
    setResult({ synced, errors });
    setStep("done");
    onDone();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(6,13,25,0.85)", backdropFilter: "blur(6px)" }}>
      <div className="bg-[#0C1424] border border-white/[0.08] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <div>
            <h2 className="text-[15px] font-semibold text-[#F1F5F9]">Importar catálogo de productos</h2>
            <p className="text-[12px] text-[#475569] mt-0.5">
              {step === "upload"    && "Excel o CSV con tu catálogo de productos"}
              {step === "mapping"   && `${rows.length} productos detectados — Configurá las columnas`}
              {step === "preview"   && `${parsed.length} productos listos para importar`}
              {step === "importing" && `Importando... ${progress}%`}
              {step === "done"      && "Importación completada"}
            </p>
          </div>
          <button onClick={onClose} className="text-[#475569] hover:text-[#F1F5F9] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Upload */}
          {step === "upload" && (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className="cursor-pointer rounded-xl border-2 border-dashed flex flex-col items-center justify-center py-16 gap-4 transition-all"
              style={{ borderColor: dragging ? "#10B981" : "rgba(255,255,255,0.08)", background: dragging ? "rgba(16,185,129,0.04)" : "rgba(255,255,255,0.02)" }}
            >
              <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "rgba(16,185,129,0.1)" }}>
                <Upload className="w-6 h-6 text-[#10B981]" />
              </div>
              <div className="text-center">
                <p className="text-[14px] font-semibold text-[#F1F5F9]">Arrastrá tu archivo o hacé click</p>
                <p className="text-[12px] text-[#475569] mt-1">Excel (.xlsx) o CSV — cualquier formato</p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 text-[11px] text-[#334155]">
                {["Tu lista de precios", "Catálogo Excel", "Export de sistema anterior", "Google Sheets"].map((s) => (
                  <span key={s} className="px-2.5 py-1 rounded-full border border-white/[0.06]">{s}</span>
                ))}
              </div>
              <p className="text-[11px] text-[#334155] text-center max-w-sm">
                Columnas sugeridas: <span className="text-[#475569]">Nombre · SKU · Precio de venta · Costo unitario · Stock inicial</span>
              </p>
              <input ref={fileRef} type="file"
                accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) loadFile(f); }} />
            </div>
          )}

          {/* Mapping */}
          {step === "mapping" && (
            <div className="space-y-4">
              <p className="text-[12px] text-[#64748B]">Asigná cada columna al campo correspondiente. Al menos <strong className="text-[#F1F5F9]">Nombre</strong> es obligatorio.</p>
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
                        onChange={(e) => setMapping((m) => { const n = [...m]; n[i] = e.target.value as ColKey; return n; })}
                        className={inputCls + " appearance-none pr-8"}
                      >
                        {COL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#475569] pointer-events-none" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Preview */}
          {step === "preview" && (
            <div className="space-y-4">
              <div className="overflow-x-auto rounded-lg border border-white/[0.06]">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      {["Nombre", "SKU", "Efectivo", "Lista", "Cuotas", "Costo", "Stock", "Tipo"].map((h) => (
                        <th key={h} className="text-left text-[11px] text-[#475569] px-4 py-2.5 font-medium whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.slice(0, 8).map((r, i) => {
                      const fmt = (v: number | null) => v && v > 0 ? `$${v.toLocaleString("es-AR")}` : "—";
                      return (
                        <tr key={i} className={i < Math.min(parsed.length, 8) - 1 ? "border-b border-white/[0.04]" : ""}>
                          <td className="px-4 py-2.5 text-[#F1F5F9] font-medium max-w-[180px] truncate">{r.nombre}</td>
                          <td className="px-4 py-2.5 text-[#64748B] font-mono whitespace-nowrap">{r.sku || "—"}</td>
                          <td className="px-4 py-2.5 text-[#10B981] font-mono whitespace-nowrap">{fmt(r.price_cash)}</td>
                          <td className="px-4 py-2.5 text-[#94A3B8] font-mono whitespace-nowrap">{fmt(r.precio)}</td>
                          <td className="px-4 py-2.5 text-[#F59E0B] font-mono whitespace-nowrap">{fmt(r.price_installments)}</td>
                          <td className="px-4 py-2.5 text-[#475569] font-mono whitespace-nowrap">{fmt(r.costo)}</td>
                          <td className="px-4 py-2.5 text-[#94A3B8] font-mono">{r.stock > 0 ? r.stock : "—"}</td>
                          <td className="px-4 py-2.5 text-[#64748B] truncate max-w-[90px]">{r.categoria || "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {parsed.length > 8 && <p className="text-[11px] text-[#475569] text-center">Mostrando 8 de {parsed.length} productos</p>}
              <div className="p-4 rounded-xl border border-[#10B981]/20 bg-[#10B981]/[0.04]">
                <p className="text-[13px] font-semibold text-[#F1F5F9]">{parsed.length} productos listos para importar</p>
                <p className="text-[11px] text-[#64748B] mt-0.5">Productos con stock inicial generarán un movimiento de entrada automáticamente.</p>
              </div>
            </div>
          )}

          {/* Importing */}
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
              <p className="text-[14px] font-semibold text-[#F1F5F9]">Importando productos...</p>
            </div>
          )}

          {/* Done */}
          {step === "done" && (
            <div className="flex flex-col items-center justify-center py-12 gap-5">
              <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "rgba(16,185,129,0.1)" }}>
                <CheckCircle2 className="w-8 h-8 text-[#10B981]" />
              </div>
              <div className="text-center">
                <p className="text-[18px] font-bold text-[#F1F5F9]">¡{result.synced} productos importados!</p>
                {result.errors > 0 && (
                  <p className="text-[12px] text-[#F59E0B] mt-1 flex items-center justify-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> {result.errors} filas con error
                  </p>
                )}
                <p className="text-[13px] text-[#64748B] mt-2">Ya aparecen en Inventario. Podés editar precios y costos desde la tabla.</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/[0.06] flex items-center justify-between">
          <button onClick={onClose} className="text-sm text-[#475569] hover:text-[#94A3B8] transition-colors">
            {step === "done" ? "Cerrar" : "Cancelar"}
          </button>
          <div className="flex gap-3">
            {step === "mapping" && <>
              <button onClick={() => setStep("upload")} className="text-sm px-4 py-2 rounded-lg border border-white/[0.08] text-[#94A3B8] hover:border-white/[0.15] transition-colors">Volver</button>
              <button onClick={buildPreview} disabled={!mapping.includes("nombre")} className="text-sm font-semibold px-5 py-2 rounded-lg text-[#080E1A] bg-[#10B981] hover:opacity-90 disabled:opacity-40 transition-opacity">Ver vista previa →</button>
            </>}
            {step === "preview" && <>
              <button onClick={() => setStep("mapping")} className="text-sm px-4 py-2 rounded-lg border border-white/[0.08] text-[#94A3B8] hover:border-white/[0.15] transition-colors">Volver</button>
              <button onClick={runImport} className="text-sm font-semibold px-5 py-2 rounded-lg text-[#080E1A] bg-[#10B981] hover:opacity-90 transition-opacity">Importar {parsed.length} productos</button>
            </>}
            {step === "done" && <button onClick={onClose} className="text-sm font-semibold px-5 py-2 rounded-lg text-[#080E1A] bg-[#10B981] hover:opacity-90 transition-opacity">Listo</button>}
          </div>
        </div>
      </div>
    </div>
  );
}
