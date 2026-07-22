"use client";

import { type LucideIcon, PlusCircle, ArrowRight } from "lucide-react";

interface EmptyStateAction {
  label: string;
  onClick: () => void;
  icon?: LucideIcon;
  variant?: "primary" | "secondary";
}

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  hint?: string;
  action?: { label: string; onClick: () => void };
  actions?: EmptyStateAction[];
  accent?: string;
  size?: "sm" | "md" | "lg";
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  hint,
  action,
  actions,
  accent = "#10B981",
  size = "md",
}: EmptyStateProps) {
  const allActions: EmptyStateAction[] = actions ?? (action ? [{ label: action.label, onClick: action.onClick, icon: PlusCircle }] : []);

  const py = size === "sm" ? "py-10" : size === "lg" ? "py-20" : "py-14";
  const iconSize = size === "sm" ? "w-10 h-10" : "w-14 h-14";
  const iconInner = size === "sm" ? "w-4 h-4" : "w-6 h-6";

  return (
    <div className={`flex flex-col items-center justify-center ${py} px-6 text-center`}>

      {/* Icon with glow */}
      {Icon && (
        <div className="relative mb-5">
          <div
            className="absolute inset-0 rounded-2xl blur-[16px] opacity-30"
            style={{ background: accent }}
          />
          <div
            className={`relative ${iconSize} rounded-2xl flex items-center justify-center`}
            style={{
              background: `${accent}12`,
              border: `1px solid ${accent}22`,
              boxShadow: `0 0 0 1px ${accent}10, inset 0 1px 0 ${accent}14`,
            }}
          >
            <Icon className={iconInner} style={{ color: accent }} />
          </div>
        </div>
      )}

      {/* Text */}
      <p className="text-[15px] font-semibold text-[#C4CDD9] leading-tight">{title}</p>

      {description && (
        <p className="text-sm text-[#475569] mt-2 max-w-xs leading-relaxed">{description}</p>
      )}

      {hint && (
        <p className="text-xs text-[#334155] mt-3 max-w-[260px] leading-relaxed bg-white/[0.03] border border-white/[0.05] rounded-lg px-3 py-2">
          {hint}
        </p>
      )}

      {/* Actions */}
      {allActions.length > 0 && (
        <div className="flex items-center gap-2 mt-6 flex-wrap justify-center">
          {allActions.map((act, i) => {
            const ActIcon = act.icon ?? (i === 0 ? PlusCircle : ArrowRight);
            const isPrimary = i === 0 && act.variant !== "secondary";
            return (
              <button
                key={i}
                onClick={act.onClick}
                className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg transition-all btn-neto"
                style={
                  isPrimary
                    ? { background: accent, color: "#080E1A" }
                    : {
                        background: "rgba(255,255,255,0.04)",
                        color: "#64748B",
                        border: "1px solid rgba(255,255,255,0.06)",
                      }
                }
              >
                <ActIcon className="w-4 h-4" />
                {act.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
