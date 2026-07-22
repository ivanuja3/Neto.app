"use client";

import { MessageCircle, Clock } from "lucide-react";
import { useCompany } from "@/components/company-provider";

const WA_BILLING = "https://wa.me/5493518551669?text=" + encodeURIComponent(
  "Hola Iván! Se me venció el trial de Neto.app y quiero seguir usándolo."
);

export default function BillingPage() {
  const { company } = useCompany();
  const expired = company?.subscription_status === "past_due" || company?.subscription_status === "canceled";

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-sm w-full text-center">
        <div className="w-14 h-14 rounded-2xl bg-[#10B981]/10 flex items-center justify-center mx-auto mb-5">
          <Clock className="w-7 h-7 text-[#10B981]" />
        </div>
        <h1 className="text-lg font-bold text-[#F1F5F9]">
          {expired ? "Tu período de prueba terminó" : "Activá tu plan para seguir"}
        </h1>
        <p className="text-sm text-[#94A3B8] mt-2 leading-relaxed">
          Todavía no tenés un plan activo en Neto. Escribime por WhatsApp y te lo activo al toque.
        </p>
        <a
          href={WA_BILLING}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-flex items-center justify-center gap-2 bg-[#10B981] text-[#080E1A] font-semibold py-2.5 px-5 rounded-lg text-sm hover:bg-[#0D9268] transition-colors"
        >
          <MessageCircle className="w-4 h-4" />
          Escribirle a Iván
        </a>
      </div>
    </div>
  );
}
