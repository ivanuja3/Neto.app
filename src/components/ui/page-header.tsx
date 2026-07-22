"use client";

import { type LucideIcon } from "lucide-react";

interface PageHeaderAction {
  label: string;
  onClick: () => void;
  icon?: LucideIcon;
  variant?: "primary" | "secondary";
}

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  accent?: string;
  badge?: { label: string; color?: string };
  actions?: PageHeaderAction[];
}

export function PageHeader({
  title,
  description,
  icon: Icon,
  accent = "#10B981",
  badge,
  actions = [],
}: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div className="flex items-center gap-3 min-w-0">
        {Icon && (
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: `${accent}14` }}
          >
            <Icon className="w-4 h-4" style={{ color: accent }} />
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-[#F1F5F9] tracking-tight leading-tight">
              {title}
            </h1>
            {badge && (
              <span
                className="text-[9px] font-black uppercase tracking-[0.12em] px-2 py-[3px] rounded-full shrink-0"
                style={{
                  background: `${badge.color ?? accent}18`,
                  color: badge.color ?? accent,
                  border: `1px solid ${badge.color ?? accent}28`,
                }}
              >
                {badge.label}
              </span>
            )}
          </div>
          {description && (
            <p className="text-sm text-[#64748B] mt-0.5 leading-snug">{description}</p>
          )}
        </div>
      </div>

      {actions.length > 0 && (
        <div className="flex items-center gap-2 shrink-0">
          {actions.map((action, i) => {
            const ActionIcon = action.icon;
            const isPrimary = action.variant !== "secondary";
            return (
              <button
                key={i}
                onClick={action.onClick}
                className="flex items-center gap-1.5 text-sm font-semibold px-3.5 py-2 rounded-lg transition-all btn-neto"
                style={
                  isPrimary
                    ? { background: accent, color: "#080E1A" }
                    : {
                        background: "rgba(255,255,255,0.05)",
                        color: "#94A3B8",
                        border: "1px solid rgba(255,255,255,0.07)",
                      }
                }
              >
                {ActionIcon && <ActionIcon className="w-3.5 h-3.5" />}
                {action.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
