import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Lock, ArrowRight, Loader2, Sparkles, Film, Megaphone, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAgencySettingsBySlug } from "@/hooks/usePortal";
import { supabase } from "@/integrations/supabase/client";
import { EchoTintedLogo } from "@/components/EchoTintedLogo";

export default function ClientLanding() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { data: agency, isLoading } = useAgencySettingsBySlug(slug);
  const [code, setCode]       = useState("");
  const [error, setError]     = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!agency) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
        <div className="text-center max-w-sm space-y-3">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-muted/40 flex items-center justify-center">
            <Lock className="w-6 h-6 text-muted-foreground" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Agence introuvable</h1>
          <p className="text-sm text-muted-foreground">
            Le lien <span className="font-mono">/clients/{slug}</span> ne correspond à aucune agence enregistrée.
          </p>
        </div>
      </div>
    );
  }

  const handleSubmit = async () => {
    if (!code.trim()) return;
    setError("");
    setSubmitting(true);
    const upperCode = code.trim().toUpperCase();
    const { data, error: qError } = await supabase
      .from("client_portal_codes")
      .select("access_code")
      .eq("access_code", upperCode)
      .maybeSingle();
    setSubmitting(false);
    if (qError) { setError("Erreur réseau. Réessaie."); return; }
    if (!data) { setError("Code introuvable. Vérifie avec ton agence."); return; }
    navigate(`/portail?code=${upperCode}`);
  };

  return (
    <div className="min-h-screen bg-background text-foreground relative">
      <style>{`
        .acc-c      { color: ${agency.color}; }
        .acc-bg     { background-color: ${agency.color}; }
        .acc-soft   { background-color: ${agency.color}1a; }
        .acc-border { border-color: ${agency.color}66; }
        .acc-grad   { background: linear-gradient(135deg, ${agency.color}, ${agency.color}cc); }
      `}</style>

      <div className="fixed inset-0 pointer-events-none"
        style={{ background: `radial-gradient(circle at 50% 0%, ${agency.color}15, transparent 70%)` }} />

      <div className="relative w-full max-w-3xl mx-auto px-6 py-16 space-y-10">
        {/* Header — logo + agency */}
        <div className="text-center space-y-3">
          <div className="mx-auto inline-block">
            <EchoTintedLogo color={agency.color} size="w-20 h-20" pose="waving" glow />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest acc-c">Espace client</p>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight mt-1">{agency.name}</h1>
          </div>
        </div>

        {/* Welcome hero */}
        <div className="rounded-2xl border acc-border acc-soft p-6 md:p-8 space-y-3 text-center">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Bienvenue dans votre espace client
          </h2>
          <p className="text-base text-foreground">
            Merci de nous faire confiance <span className="text-xl">🤝</span>
          </p>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">
            On a hâte de travailler avec vous. Ce document vous explique comment naviguer votre espace client et ce à quoi vous pouvez vous attendre dans les prochaines semaines.
          </p>
        </div>

        {/* What's in the portal */}
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="text-lg md:text-xl font-bold text-foreground flex items-center justify-center gap-2">
              <span className="text-xl">🖥️</span> Votre Centre Client
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Tout ce dont vous avez besoin se trouve dans votre portail client.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              {
                emoji: "🎬",
                icon: <Film className="w-4 h-4" />,
                title: "Vidéos Client",
                desc: "Tous vos contenus filmés et montés, prêts à télécharger et publier.",
              },
              {
                emoji: "📣",
                icon: <Megaphone className="w-4 h-4" />,
                title: "Vidéos Ads",
                desc: "Vos statistiques de publicités Meta au même endroit.",
              },
              {
                emoji: "📊",
                icon: <BarChart3 className="w-4 h-4" />,
                title: "Stats de Performance",
                desc: "Suivi en temps réel de vos métriques : portée, leads, taux d'engagement.",
              },
            ].map((card) => (
              <div key={card.title}
                className="rounded-2xl border border-border/40 bg-card p-5 space-y-2 hover:border-primary/40 transition-colors">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{card.emoji}</span>
                  <span className="acc-c">{card.icon}</span>
                </div>
                <p className="text-sm font-semibold text-foreground">{card.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Login card */}
        <div className="rounded-2xl border acc-border bg-card p-6 space-y-4 max-w-md mx-auto">
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Lock className="w-3 h-3" /> Code d'accès personnel
            </label>
            <Input
              autoFocus
              placeholder="ABC123"
              value={code}
              onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              className="text-center font-mono text-lg tracking-widest uppercase h-12"
              maxLength={8}
              style={{ borderColor: error ? "#ef4444" : undefined }}
            />
            {error && <p className="text-xs text-rose-400">{error}</p>}
          </div>
          <Button onClick={handleSubmit} disabled={submitting || !code.trim()}
            className="w-full h-11 acc-bg text-white hover:opacity-90 border-0 gap-2"
            style={{ boxShadow: `0 4px 24px ${agency.color}30` }}>
            {submitting
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <>Se connecter <ArrowRight className="w-4 h-4" /></>
            }
          </Button>
          <p className="text-center text-[11px] text-muted-foreground">
            Pas encore de code? Contactez votre équipe {agency.name}.
          </p>
        </div>

        <div className="text-center">
          <p className="text-[10px] text-muted-foreground/70 inline-flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5" />
            Propulsé par <span className="font-semibold text-muted-foreground">Echo</span>
          </p>
        </div>
      </div>
    </div>
  );
}
