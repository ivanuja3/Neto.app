"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowLeft, Mail } from "lucide-react";
import { sendPasswordReset } from "@/lib/auth";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await sendPasswordReset(email);

    setLoading(false);

    if (error) {
      setError("No pudimos enviar el email. Probá de nuevo.");
      return;
    }

    setSent(true);
  }

  return (
    <div className="w-full max-w-sm">
      <div className="flex items-center gap-3 justify-center mb-8">
        <div className="w-9 h-9 rounded-xl bg-[#10B981] flex items-center justify-center">
          <span className="text-[#080E1A] font-black text-base font-mono">N</span>
        </div>
        <span className="text-xl font-bold text-[#F1F5F9] tracking-tight">
          Neto<span className="text-[#10B981]">.app</span>
        </span>
      </div>

      <div className="bg-[#0C1424] border border-white/[0.06] rounded-2xl p-7">
        {sent ? (
          <div className="text-center py-2">
            <div className="w-12 h-12 rounded-full bg-[#10B981]/10 flex items-center justify-center mx-auto mb-4">
              <Mail className="w-6 h-6 text-[#10B981]" />
            </div>
            <h1 className="text-lg font-bold text-[#F1F5F9]">Revisá tu email</h1>
            <p className="text-sm text-[#94A3B8] mt-2">
              Te mandamos un link a <span className="text-[#F1F5F9] font-medium">{email}</span> para
              restablecer tu contraseña.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h1 className="text-lg font-bold text-[#F1F5F9]">Recuperar contraseña</h1>
              <p className="text-sm text-[#94A3B8] mt-1">
                Te mandamos un link para crear una nueva contraseña.
              </p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">Email</label>
                <input
                  type="email"
                  required
                  placeholder="ivan@tuempresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#080E1A] border border-white/[0.08] text-[#F1F5F9] placeholder-[#475569] rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-[#10B981]/50 transition-colors"
                />
              </div>

              {error && (
                <p className="text-xs text-[#EF4444] bg-[#EF4444]/[0.08] border border-[#EF4444]/20 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-[#10B981] text-[#080E1A] font-semibold py-2.5 rounded-lg text-sm hover:bg-[#0D9268] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-[#080E1A]/30 border-t-[#080E1A] rounded-full animate-spin" />
                ) : (
                  <>Enviar link <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </form>
          </>
        )}
      </div>

      <p className="text-center text-sm text-[#475569] mt-6">
        <Link href="/login" className="text-[#10B981] hover:opacity-80 font-medium transition-opacity inline-flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Volver a iniciar sesión
        </Link>
      </p>
    </div>
  );
}
