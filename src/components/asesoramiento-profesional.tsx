import { MessageCircle } from "lucide-react";

export function AsesoramientoProfesional() {
  return (
    <div className="mx-6 mb-8 mt-2">
      <div className="bg-[#0C1424] border border-white/[0.06] rounded-2xl px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-white/[0.10] transition-colors">
        <div>
          <p className="text-sm font-semibold text-[#F1F5F9]">Asesoramiento profesional</p>
          <p className="text-xs text-[#64748B] mt-0.5">
            Iván Ujaldón · Contador Público
          </p>
        </div>
        <a
          href="https://wa.me/5493518551669"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#1fb855] active:scale-95 transition-all text-white font-semibold text-sm px-5 py-2.5 rounded-xl shrink-0 shadow-[0_4px_16px_rgba(37,211,102,0.25)]"
        >
          <MessageCircle className="w-4 h-4" />
          Contactar por WhatsApp
        </a>
      </div>
    </div>
  );
}
