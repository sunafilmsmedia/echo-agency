import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Users, Zap, BarChart3, Brain, Calendar, CheckSquare,
  ArrowRight, Check, Shield, Star,
} from "lucide-react";

const FEATURES = [
  { icon: Users,       label: "Gestion clients",       desc: "Suivi complet de chaque client, MRR, statut, Drive connecté" },
  { icon: Brain,       label: "Conseillers IA",         desc: "Sales Mastery, Category Architect, Automation Advisor et plus" },
  { icon: BarChart3,   label: "Revenue & Stripe",       desc: "MRR en temps réel, pipeline, métriques de croissance" },
  { icon: Calendar,    label: "Calendrier Google",      desc: "Sync bidirectionnel avec Google Calendar" },
  { icon: Zap,         label: "Automatisations",        desc: "Zapier, GHL, Make — guides pas à pas pour tout automatiser" },
  { icon: CheckSquare, label: "Tâches quotidiennes",    desc: "Focus sur ce qui compte chaque jour" },
];

const FREE_FEATURES = [
  "Accès complet au dashboard",
  "Jusqu'à 3 membres",
  "Tous les conseillers IA",
  "Gestion clients illimitée",
  "Rejoindre sur invitation",
];

const PRO_FEATURES = [
  "Tout ce qui est inclus dans Gratuit",
  "Créer et gérer ton espace",
  "Inviter jusqu'à 3 membres",
  "Google Calendar sync",
  "Stripe revenue tracking",
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
      {/* Background glow */}
      <div className="fixed inset-0 bg-gradient-glow pointer-events-none" />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-2.5">
          <img src="/echo-avatar.png" alt="Echo" className="w-8 h-8 rounded-lg object-cover" />
          <span className="font-bold text-lg text-foreground">Echo</span>
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

      {/* Hero */}
      <section className="relative z-10 text-center px-6 pt-20 pb-16 max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-3 py-1 mb-6">
          <Star className="w-3 h-3 text-primary" />
          <span className="text-xs text-primary font-medium">La plateforme pour agences de marketing vidéo</span>
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-6">
          Gère ton agence.<br />
          <span className="text-primary">Automatisée.</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10">
          Dashboard tout-en-un avec IA intégrée. Clients, revenus, calendrier, conseillers IA — tout ce dont tu as besoin pour scaler ton agence vidéo.
        </p>

        {/* Main CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center flex-wrap">
          <button
            onClick={() => navigate("/login?intent=join")}
            className="group relative w-full sm:w-auto"
          >
            <div className="flex flex-col items-center gap-1 px-8 py-4 rounded-2xl border-2 border-border/60 bg-card hover:border-primary/40 hover:bg-primary/5 transition-all">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="font-semibold text-foreground">Rejoindre un espace</span>
              </div>
              <span className="text-xs text-muted-foreground">Gratuit · Jusqu'à 3 membres</span>
            </div>
          </button>

          <button
            onClick={() => navigate("/login?intent=create")}
            className="group relative w-full sm:w-auto"
          >
            <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-primary/60 rounded-2xl blur opacity-40 group-hover:opacity-70 transition-opacity" />
            <div className="relative flex flex-col items-center gap-1 px-8 py-4 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                <span className="font-semibold">Créer mon espace</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
              <span className="text-xs text-primary-foreground/80">57 $/mois · Facturation Stripe</span>
            </div>
          </button>
        </div>

        {/* Already have an account */}
        <div className="mt-6 flex items-center justify-center gap-3">
          <div className="h-px w-16 bg-border/50" />
          <button
            onClick={() => navigate("/login")}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors group"
          >
            Déjà un espace ?
            <span className="font-semibold text-foreground group-hover:text-primary transition-colors">Se connecter</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
          <div className="h-px w-16 bg-border/50" />
        </div>
      </section>

      {/* Features grid */}
      <section className="relative z-10 px-6 py-16 max-w-5xl mx-auto">
        <p className="text-center text-xs text-muted-foreground font-semibold uppercase tracking-widest mb-10">Ce qui est inclus</p>
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

          {/* Free / Join */}
          <div className="p-6 rounded-2xl border border-border/50 bg-card space-y-5">
            <div>
              <p className="text-sm font-semibold text-muted-foreground mb-1">Membre</p>
              <div className="flex items-end gap-1">
                <span className="text-4xl font-bold text-foreground">Gratuit</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Sur invitation d'un espace existant</p>
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
              onClick={() => navigate("/login?intent=join")}
            >
              Rejoindre un espace
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
              <p className="text-xs text-muted-foreground mt-1">Crée et gère ton propre espace</p>
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
              Créer mon espace <ArrowRight className="w-4 h-4 ml-1" />
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
          <img src="/echo-avatar.png" alt="Echo" className="w-5 h-5 rounded object-cover" />
          <span className="text-sm font-semibold text-foreground">Echo</span>
        </div>
        <p className="text-xs text-muted-foreground">© 2026 Echo Agency Platform. Tous droits réservés.</p>
      </footer>
    </div>
  );
}
