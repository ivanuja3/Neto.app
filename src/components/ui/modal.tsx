"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: string;
}

export function Modal({ open, onClose, title, children, width = "max-w-md" }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Overlay */}
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        />
        {/* Panel */}
        <div className={`relative w-full ${width} bg-[#0C1424] border border-white/[0.08] rounded-2xl shadow-2xl`}>
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
            <h2 className="text-[15px] font-semibold text-[#F1F5F9]">{title}</h2>
            <button
              onClick={onClose}
              className="text-[#475569] hover:text-[#94A3B8] transition-colors p-1 rounded-lg hover:bg-white/[0.05]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          {/* Content */}
          <div className="px-6 py-5">{children}</div>
        </div>
      </div>
    </div>
  );
}

/* ── Form field primitives ── */
export function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">{label}</label>
      {children}
      {error && <p className="text-[11px] text-[#EF4444] mt-1">{error}</p>}
    </div>
  );
}

export const inputCls =
  "w-full bg-[#080E1A] border border-white/[0.08] text-[#F1F5F9] placeholder-[#475569] rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-[#10B981]/50 transition-colors";

export const selectCls =
  "w-full bg-[#080E1A] border border-white/[0.08] text-[#F1F5F9] rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-[#10B981]/50 transition-colors appearance-none cursor-pointer";

export function SaveButton({ saving, label = "Guardar" }: { saving: boolean; label?: string }) {
  return (
    <button
      type="submit"
      disabled={saving}
      className="w-full bg-[#10B981] text-[#080E1A] font-semibold py-2.5 rounded-lg text-sm hover:bg-[#0D9268] transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
    >
      {saving ? (
        <span className="w-4 h-4 border-2 border-[#080E1A]/30 border-t-[#080E1A] rounded-full animate-spin" />
      ) : (
        label
      )}
    </button>
  );
}
