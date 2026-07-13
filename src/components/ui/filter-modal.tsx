"use client";

import { useState, useEffect } from "react";
import { X, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/* ─── Types ─── */
export type ChipSection = {
  type: "chips";
  label: string;
  key: string;
  multi?: boolean;
  options: { value: string; label: string }[];
};

export type RowSection = {
  type: "rows";
  label: string;
  key: string;
  options: { value: string; label: string; icon?: React.ElementType }[];
};

export type FilterSection = ChipSection | RowSection;
export type FilterValues = Record<string, string | string[]>;

interface Props {
  open: boolean;
  onClose: () => void;
  sections: FilterSection[];
  values: FilterValues;
  onApply: (values: FilterValues) => void;
}

function emptyValues(sections: FilterSection[]): FilterValues {
  const v: FilterValues = {};
  sections.forEach((s) => {
    v[s.key] = s.type === "chips" && s.multi ? [] : "";
  });
  return v;
}

function isActive(local: FilterValues, key: string, value: string, multi?: boolean): boolean {
  if (multi) return ((local[key] as string[]) ?? []).includes(value);
  return local[key] === value;
}

export function FilterModal({ open, onClose, sections, values, onApply }: Props) {
  const [local, setLocal] = useState<FilterValues>(values);

  useEffect(() => {
    if (open) setLocal(values);
  }, [open, values]);

  function toggleChip(key: string, value: string, multi: boolean) {
    setLocal((prev) => {
      if (multi) {
        const cur = (prev[key] as string[]) ?? [];
        return { ...prev, [key]: cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value] };
      }
      return { ...prev, [key]: prev[key] === value ? "" : value };
    });
  }

  function selectRow(key: string, value: string) {
    setLocal((prev) => ({ ...prev, [key]: prev[key] === value ? "" : value }));
  }

  function clear() {
    const empty = emptyValues(sections);
    setLocal(empty);
    onApply(empty);
    onClose();
  }

  function apply() {
    onApply(local);
    onClose();
  }

  /* cuenta filtros activos para mostrar badge */
  function countActive(v: FilterValues): number {
    return Object.values(v).filter((val) =>
      Array.isArray(val) ? val.length > 0 : val !== ""
    ).length;
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full sm:w-[420px] bg-[#0C1424] border border-white/[0.08] rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[85vh]"
        style={{ borderTop: "2px solid rgba(16,185,129,0.25)" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.05]">
          <h3 className="text-sm font-semibold text-[#F1F5F9]">Filtros</h3>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/[0.05] hover:bg-white/[0.09] flex items-center justify-center transition-colors"
          >
            <X className="w-3.5 h-3.5 text-[#94A3B8]" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
          {sections.map((section) => (
            <div key={section.key}>
              <p className="text-[11px] font-semibold text-[#475569] uppercase tracking-widest mb-3">
                {section.label}
              </p>

              {section.type === "chips" ? (
                <div className="flex flex-wrap gap-2">
                  {section.options.map((opt) => {
                    const active = isActive(local, section.key, opt.value, section.multi);
                    return (
                      <button
                        key={opt.value}
                        onClick={() => toggleChip(section.key, opt.value, section.multi ?? false)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                          active
                            ? "bg-[#10B981]/15 border-[#10B981]/40 text-[#10B981]"
                            : "bg-transparent border-white/[0.08] text-[#64748B] hover:border-white/[0.18] hover:text-[#94A3B8]"
                        )}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-1.5">
                  {section.options.map((opt) => {
                    const active = isActive(local, section.key, opt.value);
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => selectRow(section.key, opt.value)}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors text-left",
                          active
                            ? "bg-[#10B981]/10 border-[#10B981]/30 text-[#10B981]"
                            : "bg-[#080E1A] border-white/[0.06] text-[#94A3B8] hover:border-white/[0.12] hover:text-[#F1F5F9]"
                        )}
                      >
                        {Icon && <Icon className="w-4 h-4 shrink-0" />}
                        <span className="flex-1 text-[13px]">{opt.label}</span>
                        <ChevronRight className="w-3.5 h-3.5 opacity-30 shrink-0" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-white/[0.05]">
          <button
            onClick={clear}
            className="text-sm text-[#475569] hover:text-[#94A3B8] transition-colors underline underline-offset-2"
          >
            Limpiar filtros
          </button>
          <button
            onClick={apply}
            className="bg-[#F1F5F9] text-[#080E1A] text-sm font-bold px-6 py-2 rounded-xl hover:bg-white transition-colors"
          >
            Filtrar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Helper: botón "Filtrar" para los headers de página ─── */
export function FilterButton({
  onClick,
  activeCount = 0,
}: {
  onClick: () => void;
  activeCount?: number;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-white/[0.08] text-sm text-[#64748B] hover:border-white/[0.16] hover:text-[#94A3B8] transition-colors"
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M1 3h12M3 7h8M5 11h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      Filtrar
      {activeCount > 0 && (
        <span className="w-4 h-4 rounded-full bg-[#10B981] text-[#080E1A] text-[10px] font-bold flex items-center justify-center">
          {activeCount}
        </span>
      )}
    </button>
  );
}
