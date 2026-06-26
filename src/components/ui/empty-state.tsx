"use client";

import { PlusCircle, type LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      {Icon && (
        <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mb-4">
          <Icon className="w-5 h-5 text-[#475569]" />
        </div>
      )}
      <p className="text-sm font-semibold text-[#94A3B8]">{title}</p>
      {description && <p className="text-xs text-[#475569] mt-1.5 max-w-xs">{description}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-5 flex items-center gap-2 text-sm bg-[#10B981] text-[#080E1A] font-semibold px-4 py-2 rounded-lg hover:bg-[#0D9268] transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          {action.label}
        </button>
      )}
    </div>
  );
}
