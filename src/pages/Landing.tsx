import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Users, Zap, BarChart3, Brain, Calendar, CheckSquare,
  ArrowRight, Check, Shield, Star, Palette, Sparkles, LayoutDashboard,
} from "lucide-react";
import { LandingChat } from "@/components/landing/LandingChat";

const FEATURES = [
  { icon: Palette,         label: "100% personnalisable",  desc: "Ton logo, tes couleurs, ton nom — ton tracker reflète ta marque" },
  { icon: Brain,            label: "IA intégrée",           desc: "Claude répond à tes questions business, analyse, conseille en temps réel" },
  { icon: BarChart3,        label: "Revenue tracking",      desc: "MRR, pipeline, croissance — métriques en temps réel" },
  { icon: Users,            label: "Gestion clients",       desc: "CRM léger, statuts, contrats, documents stratégiques" },
  { icon: CheckSquare,      label: "KPI & équipe",          desc: "Track la perf de chaque membre, bonus auto-calculés" },
  { icon: LayoutDashboard,  label: "Dashboard modulable",   desc: "Onglets déplaçables, sections protégées par PIN, à ton goût" },
];

const FREE_FEATURES = [
  "Création de ton tracker — sans frais",
  "Jusqu'à 2 membres par espace",
  "Dashboard, KPI, tâches, gestion clients",
  "Tous les conseillers IA Claude",
  "Branding standard Echo (non personnalisable)",
  "Sans connexion Stripe ni intégrations",
];

const PRO_FEATURES = [
  "Tout ce qui est inclus dans Gratuit",
  "Personnalisation complète (logo, couleurs, nom)",
  "Connexion Stripe — track ton revenu mensuel",
  "Toutes les intégrations (Google Calendar, etc.)",
  "Jusqu'à 10 membres dans ton équipe",
  "Support prioritaire",
];

export default function Landing() {
  const navigate = useNavigate();
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate("/workspace-setup", { replace: true });
      else setCheckingAuth(false);
    });
  }, [navigate]);

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Echo avatar animations */}
      <style>{`
        @keyframes echoFloat {
          0%, 100% { transform: translateY(0px) rotate(-2deg); }
          50%      { transform: translateY(-4px) rotate(2deg); }
        }
        @keyframes echoGlow {
          0%, 100% { box-shadow: 0 0 0 3px hsl(var(--primary) / 0.20), 0 0 24px hsl(var(--primary) / 0.30); }
          50%      { box-shadow: 0 0 0 5px hsl(var(--primary) / 0.35), 0 0 40px hsl(var(--primary) / 0.55); }
        }
        @keyframes echoSpark {
          0%, 100% { opacity: 0; transform: scale(0.6) rotate(0deg); }
          50%      { opacity: 1; transform: scale(1.2) rotate(180deg); }
        }
        .echo-avatar {
          animation: echoFloat 4s ease-in-out infinite, echoGlow 3s ease-in-out infinite;
        }
        .echo-spark {
          animation: echoSpark 2.5s ease-in-out infinite;
        }
      `}</style>

      {/* Background glow */}
      <div className="fixed inset-0 bg-gradient-glow pointer-events-none" />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img src="/echo-avatar.png" alt="Echo" className="echo-avatar w-12 h-12 rounded-2xl object-cover" />
            <Sparkles className="echo-spark absolute -top-1 -right-1 w-3.5 h-3.5 text-primary" />
          </div>
          <span className="font-bold text-xl text-foreground tracking-tight">Echo</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="border-border/50 hover:border-primary/40"
          onClick={() => navigate("/login")}
        >
          Se connecter
        </Button>
      </nav>

      {/* Hero with embedded chat (Lovable-style) */}
      <section className="relative z-10 text-center px-6 pt-16 pb-12 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-3 py-1 mb-6">
          <Sparkles className="w-3 h-3 text-primary" />
          <span className="text-xs text-primary font-medium">Construis ton propre AI Business Tracker</span>
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-5 tracking-tight">
          Ton dashboard business.<br />
          <span className="text-primary">À ton image.</span>
        </h1>
        <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto mb-10">
          Crée ton application personnalisée — ton logo, tes couleurs, ton nom — avec une IA Claude intégrée partout.
        </p>

        {/* Chat — the centerpiece */}
        <div className="max-w-2xl mx-auto">
          <LandingChat onCreateClick={() => navigate("/login?intent=create")} />
        </div>

        {/* Secondary actions below chat */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm">
          <button
            onClick={() => navigate("/login?intent=create&plan=free")}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors group"
          >
            <Users className="w-3.5 h-3.5" />
            Démarrer gratuitement
            <span className="text-xs text-muted-foreground/60">(2 membres max)</span>
          </button>
          <span className="text-muted-foreground/30">·</span>
          <button
            onClick={() => navigate("/login")}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors group"
          >
            Déjà un compte?
            <span className="font-semibold text-foreground group-hover:text-primary transition-colors">Se connecter</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </section>

      {/* Features grid */}
      <section className="relative z-10 px-6 py-16 max-w-5xl mx-auto">
        <p className="text-center text-xs text-muted-foreground font-semibold uppercase tracking-widest mb-10">Ce que tu peux construire</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map(({ icon: Icon, label, desc }) => (
            <div key={label} className="p-5 rounded-xl border border-border/50 bg-card/50 hover:border-primary/30 transition-colors">
              <Icon className="w-5 h-5 text-primary mb-3" />
              <p className="font-semibold text-sm text-foreground mb-1">{label}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="relative z-10 px-6 py-16 max-w-4xl mx-auto">
        <p className="text-center text-xs text-muted-foreground font-semibold uppercase tracking-widest mb-10">Tarifs simples</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

          {/* Free / Create basic */}
          <div className="p-6 rounded-2xl border border-border/50 bg-card space-y-5">
            <div>
              <p className="text-sm font-semibold text-muted-foreground mb-1">Gratuit</p>
              <div className="flex items-end gap-1">
                <span className="text-4xl font-bold text-foreground">0 $</span>
                <span className="text-muted-foreground text-sm mb-1.5">/mois</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Crée ton tracker de base, sans frais</p>
            </div>
            <ul className="space-y-2">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-foreground">
                  <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Button
              variant="outline"
              className="w-full border-border/60 hover:border-primary/40"
              onClick={() => navigate("/login?intent=create&plan=free")}
            >
              Démarrer gratuitement
            </Button>
          </div>

          {/* Pro / Create */}
          <div className="relative p-6 rounded-2xl border-2 border-primary/50 bg-card space-y-5 overflow-hidden">
            <div className="absolute top-3 right-3 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">
              POPULAIRE
            </div>
            <div>
              <p className="text-sm font-semibold text-primary mb-1">Fondateur</p>
              <div className="flex items-end gap-1">
                <span className="text-4xl font-bold text-foreground">57 $</span>
                <span className="text-muted-foreground text-sm mb-1.5">/mois</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Tracker complet, personnalisé, sans limites</p>
            </div>
            <ul className="space-y-2">
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-foreground">
                  <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Button
              className="w-full shadow-glow"
              onClick={() => navigate("/login?intent=create")}
            >
              Créer mon tracker <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="relative z-10 px-6 py-12 max-w-2xl mx-auto text-center space-y-3">
        <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" /> Paiement sécurisé Stripe</span>
          <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5" /> Annulation à tout moment</span>
          <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" /> Accès immédiat après paiement</span>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/40 px-6 py-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <img src="/echo-avatar.png" alt="Echo" className="echo-avatar w-6 h-6 rounded-lg object-cover" />
          <span className="text-sm font-semibold text-foreground">Echo</span>
          <span className="text-xs text-muted-foreground">— Construis ton AI Business Tracker</span>
        </div>
        <p className="text-xs text-muted-foreground">© 2026 Echo. Tous droits réservés.</p>
      </footer>
    </div>
  );
}
