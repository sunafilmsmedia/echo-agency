import { useState } from "react";
import {
  Send, Sparkles, ArrowRight, Check, Lock, DollarSign, Users, TrendingDown,
  Brain, BarChart3, Trophy, MessageSquare, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const PURPOSES = [
  { id: "revenue",  label: "Track mon revenu",                       icon: DollarSign },
  { id: "clients",  label: "Voir combien me rapportent mes clients", icon: Users      },
  { id: "expenses", label: "Track mes dépenses",                     icon: TrendingDown },
  { id: "ai",       label: "Optimiser ma business avec l'IA",        icon: Brain      },
];

const TEAM_SIZES = [
  { id: "solo",  label: "Juste moi"     },
  { id: "small", label: "2 à 5 membres" },
  { id: "med",   label: "6 à 10 membres"},
  { id: "big",   label: "10+ membres"   },
];

interface Props { onCreateClick: () => void; }

export function LandingChat({ onCreateClick }: Props) {
  const [step, setStep]                 = useState<0|1|2|3>(0);
  const [businessName, setBusinessName] = useState("");
  const [purposes, setPurposes]         = useState<string[]>([]);
  const [teamSize, setTeamSize]         = useState("");
  const [generating, setGenerating]     = useState(false);
  const [blurred, setBlurred]           = useState(false);

  const togglePurpose = (id: string) => {
    setPurposes(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  };

  const nextStep = () => {
    if (step === 2) {
      setGenerating(true);
      setTimeout(() => { setGenerating(false); setStep(3); }, 1200);
    } else {
      setStep((step + 1) as 0|1|2|3);
    }
  };

  const initials = businessName.trim().charAt(0).toUpperCase() || "M";
  const displayName = businessName.trim() || "MonEntreprise";
  const teamLabel = TEAM_SIZES.find(t => t.id === teamSize)?.label || "";

  return (
    <div className="relative rounded-3xl border border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden shadow-2xl shadow-primary/5">

      {/* Chat header */}
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border/40 bg-gradient-to-r from-primary/10 to-transparent">
        <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-bold text-foreground">Echo</p>
          <p className="text-[11px] text-muted-foreground">Construis ton tracker en 30 secondes</p>
        </div>
        <div className="ml-auto flex items-center gap-1">
          {[0,1,2,3].map(i => (
            <div key={i} className={`w-1.5 h-1.5 rounded-full transition-colors ${step >= i ? "bg-primary" : "bg-border/50"}`} />
          ))}
        </div>
      </div>

      {/* Conversation */}
      <div className="p-5 space-y-4 max-h-[480px] overflow-y-auto">

        {/* Q1 ───────────────────────────────────────── */}
        <ChatBubble from="echo">Comment s'appelle ta business?</ChatBubble>
        {step === 0 ? (
          <div className="flex gap-2 pl-10">
            <Input
              autoFocus
              placeholder="ex: Suna Films Media"
              value={businessName}
              onChange={e => setBusinessName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && businessName.trim()) nextStep(); }}
              className="h-10"
            />
            <Button onClick={nextStep} disabled={!businessName.trim()} size="icon" className="h-10 w-10 flex-shrink-0">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <ChatBubble from="user">{businessName}</ChatBubble>
        )}

        {/* Q2 ───────────────────────────────────────── */}
        {step >= 1 && (
          <>
            <ChatBubble from="echo">
              Parfait! Pourquoi veux-tu utiliser ton tracker?
              <span className="block text-[11px] text-muted-foreground mt-0.5">Coche tout ce qui s'applique</span>
            </ChatBubble>
            {step === 1 ? (
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
                <Button onClick={nextStep} disabled={purposes.length === 0} className="w-full mt-2">
                  Continuer <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            ) : (
              <ChatBubble from="user">
                {purposes.map(id => PURPOSES.find(p => p.id === id)?.label).filter(Boolean).join(", ")}
              </ChatBubble>
            )}
          </>
        )}

        {/* Q3 ───────────────────────────────────────── */}
        {step >= 2 && (
          <>
            <ChatBubble from="echo">Combien êtes-vous dans l'équipe?</ChatBubble>
            {step === 2 ? (
              <div className="pl-10 grid grid-cols-2 gap-2">
                {TEAM_SIZES.map(t => (
                  <button key={t.id} onClick={() => setTeamSize(t.id)}
                    className={`px-3 py-2 rounded-xl border text-sm transition-all ${
                      teamSize === t.id
                        ? "border-primary/60 bg-primary/10 text-foreground"
                        : "border-border/50 bg-muted/20 text-foreground hover:border-primary/30"
                    }`}>
                    {t.label}
                  </button>
                ))}
                <Button onClick={nextStep} disabled={!teamSize} className="col-span-2 mt-1">
                  {generating ? (
                    <><Loader2 className="w-4 h-4 mr-1 animate-spin"/> Création de ton tracker…</>
                  ) : (
                    <>Voir mon tracker <ArrowRight className="w-4 h-4 ml-1" /></>
                  )}
                </Button>
              </div>
            ) : (
              <ChatBubble from="user">{teamLabel}</ChatBubble>
            )}
          </>
        )}

        {/* Preview ──────────────────────────────────── */}
        {step >= 3 && (
          <>
            <ChatBubble from="echo">
              🎉 Voici ton tracker personnalisé!
              <span className="block text-[11px] text-muted-foreground mt-0.5">Clique dessus pour explorer</span>
            </ChatBubble>

            {/* Mockup */}
            <div className="pl-10">
              <div className="relative rounded-2xl border border-border/50 bg-background overflow-hidden cursor-pointer"
                onClick={() => setBlurred(true)}>

                {/* Header */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40 bg-muted/30">
                  <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center">
                    <span className="text-xs font-bold text-primary">{initials}</span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-bold text-sm text-foreground">{displayName}</span>
                    <span className="text-[10px] text-muted-foreground">by Echo</span>
                  </div>
                </div>

                {/* Widget cards based on purposes */}
                <div className={`p-3 grid gap-2 ${blurred ? "blur-md scale-[0.98]" : ""} transition-all`}>
                  <div className="grid grid-cols-2 gap-2">
                    {purposes.includes("revenue") && (
                      <MockCard icon={DollarSign} label="Revenue" value="$12,847" trend="+18%" color="emerald" />
                    )}
                    {purposes.includes("clients") && (
                      <MockCard icon={Users} label="Clients actifs" value="12" trend="+3 ce mois" color="primary" />
                    )}
                    {purposes.includes("expenses") && (
                      <MockCard icon={TrendingDown} label="Dépenses" value="$3,210" trend="-8%" color="amber" />
                    )}
                    {purposes.includes("ai") && (
                      <MockCard icon={Brain} label="AI Conseils" value="3 nouveaux" trend="aujourd'hui" color="primary" />
                    )}
                    {purposes.length === 0 && (
                      <>
                        <MockCard icon={DollarSign} label="Revenue" value="$12,847" trend="+18%" color="emerald" />
                        <MockCard icon={Users} label="Clients" value="12" trend="+3" color="primary" />
                      </>
                    )}
                  </div>

                  {/* Mini chart */}
                  <div className="rounded-lg border border-border/40 bg-muted/20 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Croissance</span>
                      <BarChart3 className="w-3 h-3 text-muted-foreground" />
                    </div>
                    <div className="flex items-end gap-1 h-12">
                      {[40,55,42,68,75,82,90].map((h, i) => (
                        <div key={i} className="flex-1 bg-primary/40 rounded-t" style={{ height: `${h}%` }} />
                      ))}
                    </div>
                  </div>

                  {/* AI advisor message */}
                  {purposes.includes("ai") && (
                    <div className="rounded-lg border border-primary/20 bg-primary/5 p-2.5 flex gap-2">
                      <Brain className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
                      <p className="text-[11px] text-foreground leading-snug">
                        <span className="font-semibold">Claude:</span> Ton client {displayName === "MonEntreprise" ? "principal" : "le plus rentable"} génère 40% de ton revenu. Considère diversifier.
                      </p>
                    </div>
                  )}

                  {/* Team if larger */}
                  {teamSize && teamSize !== "solo" && (
                    <div className="flex items-center gap-2 px-1">
                      <Users className="w-3 h-3 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground">Équipe: {teamLabel}</span>
                      <div className="flex -space-x-1.5 ml-1">
                        {Array.from({ length: Math.min(4, teamSize === "small" ? 3 : teamSize === "med" ? 4 : 5) }).map((_, i) => (
                          <div key={i} className="w-4 h-4 rounded-full bg-primary/30 border border-background" />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Blur overlay CTA */}
                {blurred && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/40 backdrop-blur-sm">
                    <div className="text-center max-w-xs p-5 space-y-3 rounded-2xl border border-primary/30 bg-card shadow-2xl shadow-primary/20">
                      <div className="w-12 h-12 mx-auto rounded-full bg-primary/15 flex items-center justify-center">
                        <Lock className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground">Fais-en une réalité</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Déploie <span className="text-foreground font-semibold">{displayName}</span> dès maintenant
                        </p>
                      </div>
                      <Button className="w-full shadow-glow" onClick={onCreateClick}>
                        Créer pour 57$/mois <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                      <button onClick={() => setBlurred(false)}
                        className="text-[11px] text-muted-foreground hover:text-foreground transition-colors">
                        ← Continuer à explorer
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Suggestion below mockup */}
              {!blurred && (
                <button onClick={() => setBlurred(true)}
                  className="mt-3 w-full text-xs text-muted-foreground hover:text-primary transition-colors flex items-center justify-center gap-1.5">
                  <Sparkles className="w-3 h-3" /> Prêt à faire de ton site une réalité?
                </button>
              )}
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

function MockCard({ icon: Icon, label, value, trend, color }: {
  icon: any; label: string; value: string; trend: string; color: "emerald"|"primary"|"amber";
}) {
  const colorMap = {
    emerald: "text-emerald-400",
    primary: "text-primary",
    amber:   "text-amber-400",
  };
  return (
    <div className="rounded-lg border border-border/40 bg-card p-2.5 space-y-0.5">
      <div className="flex items-center justify-between">
        <Icon className={`w-3 h-3 ${colorMap[color]}`} />
        <span className={`text-[9px] ${colorMap[color]} font-semibold`}>{trend}</span>
      </div>
      <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-base font-bold text-foreground leading-tight">{value}</p>
    </div>
  );
}
