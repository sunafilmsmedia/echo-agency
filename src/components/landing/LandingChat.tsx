import { useState } from "react";
import {
  Send, Sparkles, ArrowRight, Check, DollarSign, Users, TrendingDown,
  Brain, ExternalLink, Loader2, Palette,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ── Options ───────────────────────────────────────────────────────────────────

const PURPOSES = [
  { id: "revenue",  label: "Track mon revenu",                       icon: DollarSign },
  { id: "clients",  label: "Voir combien me rapportent mes clients", icon: Users      },
  { id: "expenses", label: "Track mes dépenses",                     icon: TrendingDown },
  { id: "ai",       label: "Optimiser ma business avec l'IA",        icon: Brain      },
];

const REVENUE_RANGES = [
  { id: "0-5",    label: "Moins de 5 000 $",    sample: 2_840  },
  { id: "5-15",   label: "5 000 $ – 15 000 $",  sample: 8_950  },
  { id: "15-50",  label: "15 000 $ – 50 000 $", sample: 27_400 },
  { id: "50+",    label: "Plus de 50 000 $",    sample: 78_200 },
];

const COLOR_PALETTE = [
  "#7c3aed", "#2563eb", "#0891b2", "#059669",
  "#ca8a04", "#ea580c", "#dc2626", "#db2777",
  "#9333ea", "#1e40af", "#0f766e", "#15803d",
  "#a16207", "#c2410c", "#991b1b", "#be185d",
];

interface Props { onCreateClick: () => void; }

export function LandingChat({ onCreateClick }: Props) {
  const [step, setStep] = useState<0|1|2|3|4|5>(0);

  const [businessName, setBusinessName] = useState("");
  const [services, setServices]         = useState("");
  const [revenue, setRevenue]           = useState("");
  const [color1, setColor1]             = useState("#7c3aed");
  const [color2, setColor2]             = useState("#0891b2");
  const [purposes, setPurposes]         = useState<string[]>([]);
  const [generating, setGenerating]     = useState(false);

  const togglePurpose = (id: string) => {
    setPurposes(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  };

  const advance = (to?: 0|1|2|3|4|5) => {
    setStep(to ?? ((step + 1) as 0|1|2|3|4|5));
  };

  const finishAndOpenPreview = () => {
    setGenerating(true);
    const sample = REVENUE_RANGES.find(r => r.id === revenue)?.sample ?? 12_000;
    const data = {
      businessName: businessName.trim(),
      services: services.trim(),
      revenue,
      revenueSample: sample,
      color1, color2,
      purposes,
    };
    sessionStorage.setItem("echo_preview_data", JSON.stringify(data));
    setTimeout(() => {
      setGenerating(false);
      window.open("/preview", "_blank");
    }, 800);
  };

  const initials = businessName.trim().charAt(0).toUpperCase() || "M";
  const displayName = businessName.trim() || "MonEntreprise";
  const revenueLabel = REVENUE_RANGES.find(r => r.id === revenue)?.label || "";

  return (
    <div className="relative rounded-3xl border border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden shadow-2xl shadow-primary/5">

      {/* Chat header */}
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border/40 bg-gradient-to-r from-primary/10 to-transparent">
        <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-bold text-foreground">Echo</p>
          <p className="text-[11px] text-muted-foreground">Construis ton tracker en 60 secondes</p>
        </div>
        <div className="ml-auto flex items-center gap-1">
          {[0,1,2,3,4,5].map(i => (
            <div key={i} className={`w-1.5 h-1.5 rounded-full transition-colors ${step >= i ? "bg-primary" : "bg-border/50"}`} />
          ))}
        </div>
      </div>

      {/* Conversation */}
      <div className="p-5 space-y-4 max-h-[560px] overflow-y-auto">

        {/* Q1 — Business name ──────────────────────── */}
        <ChatBubble from="echo">Comment s'appelle ta business?</ChatBubble>
        {step === 0 ? (
          <div className="flex gap-2 pl-10">
            <Input autoFocus placeholder="ex: Suna Films Media" value={businessName}
              onChange={e => setBusinessName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && businessName.trim()) advance(1); }}
              className="h-10" />
            <Button onClick={() => advance(1)} disabled={!businessName.trim()} size="icon" className="h-10 w-10 flex-shrink-0">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <ChatBubble from="user">{businessName}</ChatBubble>
        )}

        {/* Q2 — Services ───────────────────────────── */}
        {step >= 1 && (
          <>
            <ChatBubble from="echo">Que vends-tu? Quels services offres-tu?</ChatBubble>
            {step === 1 ? (
              <div className="flex gap-2 pl-10">
                <Input autoFocus placeholder="ex: vidéos marketing, coaching, consulting SaaS" value={services}
                  onChange={e => setServices(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && services.trim()) advance(2); }}
                  className="h-10" />
                <Button onClick={() => advance(2)} disabled={!services.trim()} size="icon" className="h-10 w-10 flex-shrink-0">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <ChatBubble from="user">{services}</ChatBubble>
            )}
          </>
        )}

        {/* Q3 — Monthly revenue ────────────────────── */}
        {step >= 2 && (
          <>
            <ChatBubble from="echo">Quel est ton revenu mensuel actuel?</ChatBubble>
            {step === 2 ? (
              <div className="pl-10 grid grid-cols-2 gap-2">
                {REVENUE_RANGES.map(r => (
                  <button key={r.id}
                    onClick={() => { setRevenue(r.id); setTimeout(() => advance(3), 200); }}
                    className={`px-3 py-2.5 rounded-xl border text-sm transition-all ${
                      revenue === r.id
                        ? "border-primary/60 bg-primary/10 text-foreground"
                        : "border-border/50 bg-muted/20 text-foreground hover:border-primary/30"
                    }`}>
                    {r.label}
                  </button>
                ))}
              </div>
            ) : (
              <ChatBubble from="user">{revenueLabel}</ChatBubble>
            )}
          </>
        )}

        {/* Q4 — Brand colors ───────────────────────── */}
        {step >= 3 && (
          <>
            <ChatBubble from="echo">
              Choisis tes 2 couleurs de marque
              <span className="block text-[11px] text-muted-foreground mt-0.5">Elles habilleront ton tracker</span>
            </ChatBubble>
            {step === 3 ? (
              <div className="pl-10 space-y-3">
                <ColorSelector label="Couleur principale" value={color1} onChange={setColor1} />
                <ColorSelector label="Couleur secondaire" value={color2} onChange={setColor2} />
                <Button onClick={() => advance(4)} className="w-full">
                  Continuer <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            ) : (
              <ChatBubble from="user">
                <div className="flex items-center gap-2">
                  <span>Mes couleurs:</span>
                  <span className="w-4 h-4 rounded-full border border-border/60" style={{ background: color1 }} />
                  <span className="w-4 h-4 rounded-full border border-border/60" style={{ background: color2 }} />
                </div>
              </ChatBubble>
            )}
          </>
        )}

        {/* Q5 — Purposes ───────────────────────────── */}
        {step >= 4 && (
          <>
            <ChatBubble from="echo">
              Que veux-tu faire avec ton tracker?
              <span className="block text-[11px] text-muted-foreground mt-0.5">Coche tout ce qui s'applique</span>
            </ChatBubble>
            {step === 4 ? (
              <div className="pl-10 space-y-2">
                {PURPOSES.map(p => {
                  const Icon = p.icon;
                  const checked = purposes.includes(p.id);
                  return (
                    <button key={p.id} onClick={() => togglePurpose(p.id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl border text-left text-sm transition-all ${
                        checked
                          ? "border-primary/60 bg-primary/10 text-foreground"
                          : "border-border/50 bg-muted/20 text-foreground hover:border-primary/30"
                      }`}>
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                        checked ? "border-primary bg-primary" : "border-muted-foreground/40"
                      }`}>
                        {checked && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                      </div>
                      <Icon className={`w-3.5 h-3.5 ${checked ? "text-primary" : "text-muted-foreground"}`} />
                      {p.label}
                    </button>
                  );
                })}
                <Button onClick={() => advance(5)} disabled={purposes.length === 0} className="w-full mt-2">
                  Voir mon site <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            ) : (
              <ChatBubble from="user">
                {purposes.map(id => PURPOSES.find(p => p.id === id)?.label).filter(Boolean).join(", ")}
              </ChatBubble>
            )}
          </>
        )}

        {/* Final — Open preview ────────────────────── */}
        {step >= 5 && (
          <>
            <ChatBubble from="echo">
              🎉 Tout est prêt! Ton site <span className="font-semibold">{displayName}</span> est généré avec ton branding et tes données.
            </ChatBubble>

            <div className="pl-10 space-y-3">
              {/* Mini preview chip */}
              <div className="rounded-xl border border-border/50 bg-background p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `linear-gradient(135deg, ${color1}, ${color2})` }}>
                  <span className="text-sm font-bold text-white">{initials}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">{displayName} <span className="text-[10px] font-normal text-muted-foreground">by Echo</span></p>
                  <p className="text-[11px] text-muted-foreground truncate">{services}</p>
                </div>
              </div>

              {/* Big CTA to open preview */}
              <Button onClick={finishAndOpenPreview} disabled={generating}
                className="w-full h-12 text-base shadow-glow gap-2"
                style={{ background: `linear-gradient(135deg, ${color1}, ${color2})`, color: "white" }}>
                {generating ? (
                  <><Loader2 className="w-4 h-4 animate-spin"/> Génération de ton site…</>
                ) : (
                  <>Ouvrir mon site personnalisé <ExternalLink className="w-4 h-4" /></>
                )}
              </Button>
              <p className="text-[11px] text-muted-foreground text-center">
                ⏱ Tu auras 40 secondes pour le découvrir gratuitement
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function ChatBubble({ from, children }: { from: "echo" | "user"; children: React.ReactNode }) {
  if (from === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-tr-md bg-primary/15 border border-primary/20 px-3.5 py-2 text-sm text-foreground">
          {children}
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-2">
      <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
        <Sparkles className="w-3 h-3 text-primary" />
      </div>
      <div className="max-w-[85%] rounded-2xl rounded-tl-md bg-muted/40 border border-border/40 px-3.5 py-2 text-sm text-foreground">
        {children}
      </div>
    </div>
  );
}

function ColorSelector({ label, value, onChange }: { label: string; value: string; onChange: (c: string) => void }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-[11px] text-muted-foreground flex items-center gap-1.5">
          <Palette className="w-3 h-3"/> {label}
        </label>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground font-mono">{value.toUpperCase()}</span>
          <input type="color" value={value} onChange={e => onChange(e.target.value)}
            className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent" />
        </div>
      </div>
      <div className="grid grid-cols-8 gap-1.5">
        {COLOR_PALETTE.map(c => (
          <button key={c} onClick={() => onChange(c)}
            className={`aspect-square rounded-md border-2 transition-all ${value === c ? "border-foreground scale-110" : "border-transparent hover:scale-105"}`}
            style={{ background: c }} />
        ))}
      </div>
    </div>
  );
}
