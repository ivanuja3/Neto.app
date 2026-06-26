"use client";

import { useState } from "react";
import { Send, Bot, Sparkles } from "lucide-react";

const SUGGESTED = [
  "¿Cuál es mi producto más rentable este mes?",
  "¿Estoy gastando demasiado en ads?",
  "¿Cuánto necesito vender para cubrir mis costos fijos?",
  "Explicame mi CM3 en palabras simples",
];

type Message = { role: "user" | "assistant"; content: string };

const WELCOME: Message = {
  role: "assistant",
  content:
    "Hola! Soy Neto IA, tu asesor financiero inteligente. Tengo acceso a todas tus métricas del mes: ingresos, márgenes, ROAS real, costos y más.\n\n¿En qué puedo ayudarte hoy?",
};

export default function IAPage() {
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState("");

  function sendMessage(text: string) {
    if (!text.trim()) return;
    const userMsg: Message = { role: "user", content: text };
    const assistantMsg: Message = {
      role: "assistant",
      content:
        "Esta función estará disponible una vez que conectes tu cuenta a Supabase y configures la API de Claude. Por ahora estás viendo un preview de la interfaz.",
    };
    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput("");
  }

  return (
    <div className="flex flex-col h-full max-h-screen p-6">
      {/* Header */}
      <div className="mb-5 shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 rounded-xl bg-[#10B981] blur-[8px] opacity-50" />
            <div className="relative w-8 h-8 rounded-xl bg-gradient-to-br from-[#10B981] to-[#0D9268] flex items-center justify-center">
              <Bot className="w-4 h-4 text-[#020A10]" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-[#F1F5F9]">Neto IA</h1>
              <span className="text-[9px] font-bold bg-gradient-to-r from-[#10B981]/20 to-[#06B6D4]/15 text-[#34D399] border border-[#10B981]/20 px-1.5 py-[3px] rounded-md tracking-wide">
                Beta
              </span>
            </div>
            <p className="text-xs text-[#64748B] mt-0.5">Preguntale a tu asesor financiero con IA</p>
          </div>
        </div>
      </div>

      {/* Chat window */}
      <div className="flex-1 overflow-y-auto bg-[#0C1424] border border-white/[0.06] rounded-2xl p-5 space-y-5 mb-4 min-h-0">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
          >
            {msg.role === "assistant" && (
              <div className="relative shrink-0 mt-0.5">
                <div className="absolute inset-0 rounded-lg bg-[#10B981] blur-[5px] opacity-40" />
                <div className="relative w-7 h-7 rounded-lg bg-gradient-to-br from-[#10B981] to-[#0D9268] flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5 text-[#020A10]" />
                </div>
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-line ${
                msg.role === "user"
                  ? "bg-gradient-to-br from-[#10B981]/15 to-[#10B981]/8 text-[#F1F5F9] rounded-tr-sm border border-[#10B981]/15"
                  : "bg-[#111E30] text-[#94A3B8] rounded-tl-sm border border-white/[0.05]"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
      </div>

      {/* Suggested questions */}
      {messages.length === 1 && (
        <div className="flex flex-wrap gap-2 mb-3 shrink-0">
          {SUGGESTED.map((s) => (
            <button
              key={s}
              onClick={() => sendMessage(s)}
              className="text-xs bg-[#0C1424] border border-white/[0.07] text-[#94A3B8] hover:text-[#F1F5F9] hover:border-[#10B981]/30 hover:bg-[#10B981]/5 rounded-xl px-3.5 py-2 transition-all duration-150"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2 shrink-0">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
          placeholder="Preguntá sobre tus métricas..."
          className="flex-1 bg-[#0C1424] border border-white/[0.07] text-[#F1F5F9] placeholder-[#475569] rounded-2xl px-4 py-3 text-sm focus:border-[#10B981]/40 focus:bg-[#0D1625] transition-all"
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={!input.trim()}
          className="bg-[#10B981] text-[#020A10] rounded-2xl px-4 py-3 hover:bg-[#0D9268] active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(16,185,129,0.2)]"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
