import { useState, useRef, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sendMessage, Message } from "@/lib/ai-tools";
import { X, Send, Loader2, Sparkles } from "lucide-react";
import { EchoTintedLogo } from "@/components/EchoTintedLogo";
import { useAgencySettings } from "@/hooks/usePortal";

const SUGGESTIONS = [
  "Ajouter un client Nike à 5000$/mois",
  "Quel est mon MRR ce mois?",
  "Planifier un tournage demain à 10h",
  "Passer le client X en pipeline",
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
          className="fixed right-6 w-80 bg-card border border-border/60 rounded-2xl shadow-premium flex flex-col z-50 overflow-hidden"
          style={{ bottom: 76, height: 480 }}
        >
          {/* Header */}
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border/40 bg-sidebar flex-shrink-0">
            <EchoTintedLogo color={agencyColor} pose={pose} size="w-8 h-8" rounded="rounded-full" />
            <div>
              <p className="text-sm font-semibold text-foreground">Echo AI</p>
              <p className="text-[10px] text-muted-foreground">Gère ton agence par chat</p>
            </div>
            <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {messages.length === 0 && !loading && (
              <div className="text-center pt-6 space-y-3">
                <Sparkles className="w-7 h-7 text-primary/40 mx-auto" />
                <p className="text-xs text-muted-foreground">Dis-moi ce que tu veux faire.</p>
                <div className="space-y-1.5">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => handleSend(s)}
                      className="block w-full text-left text-[11px] px-3 py-2 rounded-lg border border-border/40 hover:border-primary/40 hover:bg-primary/5 text-muted-foreground transition-colors"
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
                  className={`max-w-[88%] text-xs px-3 py-2 rounded-xl leading-relaxed whitespace-pre-wrap ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-none"
                      : "bg-muted/70 text-foreground rounded-bl-none"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}

            {streaming && (
              <div className="flex justify-start">
                <div className="max-w-[88%] text-xs px-3 py-2 rounded-xl rounded-bl-none bg-muted/70 text-foreground leading-relaxed whitespace-pre-wrap">
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
              placeholder="Ajouter un client Nike..."
              className="text-xs h-8"
              disabled={loading}
            />
            <Button
              size="icon"
              className="h-8 w-8 flex-shrink-0"
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
            >
              <Send className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
