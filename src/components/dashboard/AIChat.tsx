import { useState, useRef, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sendMessage, Message } from "@/lib/ai-tools";
import { X, Send, Loader2, Sparkles } from "lucide-react";
import { EchoTintedLogo } from "@/components/EchoTintedLogo";
import { useAgencySettings } from "@/hooks/usePortal";

const SUGGESTIONS = [
  "📊 Comment vont mes revenus vs le mois dernier ?",
  "💸 Analyse mes dépenses — où je peux couper ?",
  "🎯 Qui sont mes 3 meilleurs clients ce trimestre ?",
  "⚠️ Quels contrats expirent bientôt ?",
  "📅 Que devrais-je faire cette semaine en priorité ?",
];

export function AIChat() {
  const qc = useQueryClient();
  const { data: agency } = useAgencySettings();
  const agencyColor = agency?.color || "#7c3aed";
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Pose changes based on state: thinking when AI is processing, default otherwise
  const pose = loading ? "thinking" as const : "default" as const;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  const handleSend = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput("");
    const userMsg: Message = { role: "user", content: msg };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    setStreaming("");

    try {
      const reply = await sendMessage(messages, msg, (partial) => setStreaming(partial));
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      setStreaming("");
      // Refresh all cached data so UI reflects changes immediately
      qc.invalidateQueries();
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Une erreur s'est produite. Vérifie ta clé API Anthropic dans le fichier .env." },
      ]);
      setStreaming("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-6 rounded-full shadow-glow transition-all z-50 hover:opacity-90 overflow-hidden"
        style={{ width: 52, height: 52 }}
        aria-label="Echo AI"
      >
        {open ? (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <X className="w-5 h-5 text-muted-foreground" />
          </div>
        ) : (
          <EchoTintedLogo color={agencyColor} pose={pose} size="w-full h-full" rounded="rounded-full" />
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          className="fixed right-6 bg-card border border-border/60 rounded-2xl shadow-premium flex flex-col z-50 overflow-hidden"
          style={{ bottom: 76, width: 440, maxWidth: "calc(100vw - 32px)", height: "min(640px, calc(100vh - 120px))" }}
        >
          {/* Header */}
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border/40 bg-sidebar flex-shrink-0">
            <EchoTintedLogo color={agencyColor} pose={pose} size="w-8 h-8" rounded="rounded-full" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">Echo AI</p>
              <p className="text-[10px] text-muted-foreground truncate">Analyse tes données · gère ton agence</p>
            </div>
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse flex-shrink-0" />
            <button onClick={() => setMessages([])}
              className="text-[10px] text-muted-foreground hover:text-foreground px-2 py-1 rounded border border-border/40 hover:border-border transition-colors">
              Reset
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {messages.length === 0 && !loading && (
              <div className="pt-4 pb-2 space-y-3">
                <div className="text-center space-y-1.5">
                  <Sparkles className="w-6 h-6 text-primary mx-auto" />
                  <p className="text-sm font-semibold text-foreground">Salut ! Je connais tes chiffres.</p>
                  <p className="text-[11px] text-muted-foreground">Pose-moi n'importe quoi sur tes clients, revenus, dépenses, KPI…</p>
                </div>
                <div className="space-y-1.5 pt-1">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => handleSend(s)}
                      className="block w-full text-left text-[11.5px] px-3 py-2.5 rounded-lg border border-border/40 hover:border-primary/50 hover:bg-primary/5 text-foreground transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[92%] text-[13px] px-3.5 py-2.5 rounded-xl leading-relaxed whitespace-pre-wrap ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-none"
                      : "bg-muted/60 text-foreground rounded-bl-none border border-border/40"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}

            {streaming && (
              <div className="flex justify-start">
                <div className="max-w-[92%] text-[13px] px-3.5 py-2.5 rounded-xl rounded-bl-none bg-muted/60 text-foreground leading-relaxed whitespace-pre-wrap border border-border/40">
                  {streaming}
                </div>
              </div>
            )}

            {loading && !streaming && (
              <div className="flex justify-start">
                <div className="px-3 py-2.5 rounded-xl rounded-bl-none bg-muted/70">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-border/40 flex gap-2 flex-shrink-0 bg-card">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder="Pose une question ou demande une action..."
              className="text-[13px] h-9"
              disabled={loading}
            />
            <Button
              size="icon"
              className="h-9 w-9 flex-shrink-0"
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
