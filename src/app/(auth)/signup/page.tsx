"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Mail } from "lucide-react";
import { signUp } from "@/lib/auth";

const PLANES = [
  { id: "starter", label: "Starter", precio: "$19/mes", limite: "Hasta 300 órdenes/mes" },
  { id: "pro", label: "Pro", precio: "$29/mes", limite: "Órdenes ilimitadas", popular: true },
];

export default function SignupPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [plan, setPlan] = useState("pro");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleStep1(e: React.FormEvent) {
    e.preventDefault();
    setStep(2);
  }

  async function handleStep2(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { data, error } = await signUp(email, password, firstName, lastName);

    if (error) {
      setError(error.message === "User already registered"
        ? "Ya existe una cuenta con ese email"
        : "No pudimos crear tu cuenta. Probá de nuevo.");
      setLoading(false);
      return;
    }

    setLoading(false);

    if (data.session) {
      window.location.href = "/dashboard";
    } else {
      setStep(3);
    }
  }

  return (
    <div className="w-full max-w-sm">
      {/* Logo */}
      <div className="flex items-center gap-3 justify-center mb-8">
        <div className="w-9 h-9 rounded-xl bg-[#10B981] flex items-center justify-center">
          <span className="text-[#080E1A] font-black text-base font-mono">N</span>
        </div>
        <span className="text-xl font-bold text-[#F1F5F9] tracking-tight">
          Neto<span className="text-[#10B981]">.app</span>
        </span>
      </div>

      {/* Steps */}
      {step < 3 && (
        <div className="flex items-center gap-2 justify-center mb-6">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  s <= step ? "bg-[#10B981] text-[#080E1A]" : "bg-white/[0.06] text-[#475569]"
                }`}
              >
                {s < step ? <Check className="w-3.5 h-3.5" /> : s}
              </div>
              {s < 2 && <div className={`w-12 h-px ${step > s ? "bg-[#10B981]" : "bg-white/[0.06]"}`} />}
            </div>
          ))}
        </div>
      )}

      <div className="bg-[#0C1424] border border-white/[0.06] rounded-2xl p-7">
        {step === 1 && (
          <>
            <div className="mb-6">
              <h1 className="text-lg font-bold text-[#F1F5F9]">Creá tu cuenta</h1>
              <p className="text-sm text-[#94A3B8] mt-1">14 días gratis, sin tarjeta de crédito</p>
            </div>
            <form onSubmit={handleStep1} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">Nombre</label>
                  <input required type="text" placeholder="Iván" value={firstName} onChange={(e) => setFirstName(e.target.value)}
                    className="w-full bg-[#080E1A] border border-white/[0.08] text-[#F1F5F9] placeholder-[#475569] rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-[#10B981]/50 transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">Apellido</label>
                  <input required type="text" placeholder="Ujaldón" value={lastName} onChange={(e) => setLastName(e.target.value)}
                    className="w-full bg-[#080E1A] border border-white/[0.08] text-[#F1F5F9] placeholder-[#475569] rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-[#10B981]/50 transition-colors" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">Email</label>
                <input required type="email" placeholder="ivan@tuempresa.com" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#080E1A] border border-white/[0.08] text-[#F1F5F9] placeholder-[#475569] rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-[#10B981]/50 transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">Contraseña</label>
                <input required minLength={8} type="password" placeholder="Mín. 8 caracteres" value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#080E1A] border border-white/[0.08] text-[#F1F5F9] placeholder-[#475569] rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-[#10B981]/50 transition-colors" />
              </div>
              <button type="submit"
                className="w-full flex items-center justify-center gap-2 bg-[#10B981] text-[#080E1A] font-semibold py-2.5 rounded-lg text-sm hover:bg-[#0D9268] transition-colors">
                Siguiente <ArrowRight className="w-4 h-4" />
              </button>
              <p className="text-[11px] text-[#475569] text-center leading-relaxed">
                Al crear tu cuenta aceptás los{" "}
                <Link href="/terminos" className="text-[#94A3B8] hover:text-[#10B981] underline underline-offset-2">Términos de servicio</Link>
                {" "}y la{" "}
                <Link href="/privacidad" className="text-[#94A3B8] hover:text-[#10B981] underline underline-offset-2">Política de privacidad</Link>.
              </p>
            </form>
          </>
        )}

        {step === 2 && (
          <>
            <div className="mb-6">
              <h1 className="text-lg font-bold text-[#F1F5F9]">Elegí tu plan</h1>
              <p className="text-sm text-[#94A3B8] mt-1">Los primeros 14 días son gratis en cualquier plan</p>
            </div>
            <div className="space-y-3 mb-5">
              {PLANES.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPlan(p.id)}
                  className={`w-full text-left rounded-xl border p-4 transition-colors ${
                    plan === p.id
                      ? "border-[#10B981]/50 bg-[#10B981]/5"
                      : "border-white/[0.06] hover:border-white/10"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[#F1F5F9]">{p.label}</span>
                        {p.popular && (
                          <span className="text-[10px] font-bold bg-[#10B981]/15 text-[#10B981] px-1.5 py-0.5 rounded">
                            Popular
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#475569] mt-0.5">{p.limite}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold font-mono text-[#F1F5F9]">{p.precio}</span>
                      <div
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          plan === p.id ? "border-[#10B981] bg-[#10B981]" : "border-white/20"
                        }`}
                      >
                        {plan === p.id && <div className="w-1.5 h-1.5 rounded-full bg-[#080E1A]" />}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {error && (
              <p className="text-xs text-[#EF4444] bg-[#EF4444]/[0.08] border border-[#EF4444]/20 rounded-lg px-3 py-2 mb-4">
                {error}
              </p>
            )}

            <form onSubmit={handleStep2}>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-[#10B981] text-[#080E1A] font-semibold py-2.5 rounded-lg text-sm hover:bg-[#0D9268] transition-colors disabled:opacity-60"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-[#080E1A]/30 border-t-[#080E1A] rounded-full animate-spin" />
                ) : (
                  <>Empezar prueba gratuita <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </form>
          </>
        )}

        {step === 3 && (
          <div className="text-center py-2">
            <div className="w-12 h-12 rounded-full bg-[#10B981]/10 flex items-center justify-center mx-auto mb-4">
              <Mail className="w-6 h-6 text-[#10B981]" />
            </div>
            <h1 className="text-lg font-bold text-[#F1F5F9]">Confirmá tu email</h1>
            <p className="text-sm text-[#94A3B8] mt-2">
              Te mandamos un link a <span className="text-[#F1F5F9] font-medium">{email}</span>.
              Hacé clic ahí para activar tu cuenta.
            </p>
          </div>
        )}
      </div>

      {step < 3 && (
        <p className="text-center text-sm text-[#475569] mt-6">
          ¿Ya tenés cuenta?{" "}
          <Link href="/login" className="text-[#10B981] hover:opacity-80 font-medium transition-opacity">
            Iniciá sesión
          </Link>
        </p>
      )}
    </div>
  );
}
