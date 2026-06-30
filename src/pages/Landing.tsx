import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Users, Zap, ArrowRight, Check, Shield, Brain, Sparkles,
  Palette, UserCircle, MessagesSquare, MessageCircleQuestion,
} from "lucide-react";
import { LandingChat } from "@/components/landing/LandingChat";
import { EchoTintedLogo } from "@/components/EchoTintedLogo";

const AI_QUESTIONS = [
  "Quels clients rapportent le plus ?",
  "Quels revenus ont augmenté ce mois-ci ?",
  "Quels suivis sont en retard ?",
  "Quelles tâches devraient être prioritaires cette semaine ?",
];

const FEATURE_BLOCKS = [
  {
    num: "01",
    icon: Brain,
    title: "IA intégrée à ton entreprise",
    description: "Pose des questions directement à ton assistant IA. Il analyse tes revenus, tes clients, tes données et tes opérations pour t'aider à prendre de meilleures décisions.",
    questions: AI_QUESTIONS,
  },
  {
    num: "02",
    icon: UserCircle,
    title: "Centre client personnalisé",
    description: "Chaque client peut avoir son propre accès à un portail clair et professionnel. Il voit ses chiffres, ses documents, ses suivis, ses résultats et ses prochaines étapes selon ton type de business.",
    callout: "Résultat : moins de messages inutiles, moins de confusion, plus de transparence.",
  },
  {
    num: "03",
    icon: MessagesSquare,
    title: "Espace équipe intégré",
    description: "Ton équipe discute, reçoit des tâches, suit les priorités et voit ce qui doit être fait. Assigne des tâches à tes employés, suis l'avancement et garde toute l'information au même endroit.",
  },
  {
    num: "04",
    icon: Palette,
    title: "Dashboard à ton image",
    description: "Ton logo. Tes couleurs. Ton nom. Ton expérience client. Ton système interne.",
    callout: "Echo devient ton logiciel, pas juste un outil avec un logo collé dessus.",
  },
];

const FREE_FEATURES = [
  "Création de ton tracker — sans frais",
  "Jusqu'à 2 membres",
  "Dashboard, KPI, tâches, gestion clients",
  "Tous les conseillers IA Claude",
  "Branding standard Echo",
  "Sans Stripe ni intégrations",
];

const PRO_FEATURES = [
  "Tout ce qui est inclus dans Gratuit",
  "Jusqu'à 5 membres",
  "Personnalisation complète (logo, couleurs, nom)",
  "Connexion Stripe — track ton revenu réel",
  "Toutes les intégrations (Google Calendar, etc.)",
];

const BUSINESS_FEATURES = [
  "Tout ce qui est inclus dans Pro",
  "Jusqu'à 10 membres",
  "KPI multi-employés avancé",
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
        @keyframes echoHeroFloat {
          0%, 100% { transform: translateY(0px) rotate(-3deg); }
          25%      { transform: translateY(-6px) rotate(0deg); }
          50%      { transform: translateY(-10px) rotate(3deg); }
          75%      { transform: translateY(-6px) rotate(0deg); }
        }
        @keyframes echoHeroGlow {
          0%, 100% { filter: drop-shadow(0 12px 32px rgba(16, 185, 129, 0.35)) drop-shadow(0 0 40px rgba(16, 185, 129, 0.25)); }
          50%      { filter: drop-shadow(0 18px 48px rgba(16, 185, 129, 0.55)) drop-shadow(0 0 60px rgba(16, 185, 129, 0.45)); }
        }
        .echo-avatar {
          animation: echoFloat 4s ease-in-out infinite, echoGlow 3s ease-in-out infinite;
        }
        .echo-hero {
          animation: echoHeroFloat 5s ease-in-out infinite, echoHeroGlow 4s ease-in-out infinite;
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
          <div className="relative echo-avatar">
            <EchoTintedLogo color="#10b981" pose="waving" size="w-16 h-16" untinted />
            <Sparkles className="echo-spark absolute top-0 right-0 w-4 h-4 text-primary" />
          </div>
          <span className="font-bold text-2xl text-foreground tracking-tight">Echo</span>
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
      <section className="relative z-10 text-center px-6 pt-8 pb-12 max-w-3xl mx-auto">
        {/* Giant Echo — the hero mascot */}
        <div className="echo-hero inline-block mb-6">
          <EchoTintedLogo color="#10b981" pose="waving" size="w-44 h-44 sm:w-56 sm:h-56" untinted />
        </div>

        <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-3 py-1 mb-6">
          <Sparkles className="w-3 h-3 text-primary" />
          <span className="text-xs text-primary font-medium">Salut! Je suis Echo, ton centre de contrôle business</span>
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-5 tracking-tight">
          Ton centre de contrôle business.<br />
          <span className="text-primary">Propulsé par l'IA. À ton image.</span>
        </h1>
        <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto mb-4">
          On crée ton application personnalisée avec ton logo, tes couleurs et ton univers de marque, pour centraliser tes chiffres, tes clients, ton équipe et tes opérations au même endroit.
        </p>
        <p className="text-sm sm:text-base text-muted-foreground/80 max-w-2xl mx-auto mb-10">
          À l'intérieur, une IA intégrée analyse tes revenus, tes clients, tes performances et tes tâches pour t'aider à mieux comprendre ce qui se passe dans ton entreprise — <span className="text-foreground font-medium">et surtout quoi faire ensuite</span>.
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

      {/* Detailed features — 4 pillars */}
      <section className="relative z-10 px-6 py-20 max-w-6xl mx-auto">
        <div className="text-center mb-14 space-y-2">
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-widest">Tout ce qu'Echo fait pour toi</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
            4 piliers pour <span className="text-primary">centraliser ton business</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {FEATURE_BLOCKS.map(({ num, icon: Icon, title, description, questions, callout }) => (
            <div key={num}
              className="group relative p-7 rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm hover:border-primary/40 hover:bg-card transition-all space-y-4 flex flex-col">
              {/* Number badge */}
              <span className="absolute top-5 right-5 text-5xl font-black text-primary/10 group-hover:text-primary/20 transition-colors leading-none">
                {num}
              </span>

              {/* Icon */}
              <div className="w-12 h-12 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center">
                <Icon className="w-6 h-6 text-primary" />
              </div>

              {/* Title */}
              <h3 className="text-lg font-bold text-foreground tracking-tight">{title}</h3>

              {/* Description */}
              <p className="text-sm text-muted-foreground leading-relaxed flex-1">{description}</p>

              {/* AI question examples */}
              {questions && (
                <div className="rounded-xl bg-primary/5 border border-primary/15 p-3 space-y-1.5">
                  {questions.map((q) => (
                    <div key={q} className="flex items-start gap-2 text-xs text-foreground">
                      <MessageCircleQuestion className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                      <span className="italic">"{q}"</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Callout */}
              {callout && (
                <div className="rounded-lg bg-primary/8 border-l-2 border-primary px-3 py-2">
                  <p className="text-xs text-foreground font-medium leading-relaxed">{callout}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="relative z-10 px-6 py-16 max-w-5xl mx-auto">
        <p className="text-center text-xs text-muted-foreground font-semibold uppercase tracking-widest mb-10">Tarifs simples</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

          {/* Free */}
          <div className="p-6 rounded-2xl border border-border/50 bg-card space-y-5 flex flex-col">
            <div>
              <p className="text-sm font-semibold text-muted-foreground mb-1">Gratuit</p>
              <div className="flex items-end gap-1">
                <span className="text-4xl font-bold text-foreground">0 $</span>
                <span className="text-muted-foreground text-sm mb-1.5">/mois</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Tracker de base, sans frais</p>
            </div>
            <ul className="space-y-2 flex-1">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                  <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span>{f}</span>
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

          {/* Pro (most popular) */}
          <div className="relative p-6 rounded-2xl border-2 border-primary/50 bg-card space-y-5 overflow-hidden flex flex-col shadow-glow">
            <div className="absolute top-3 right-3 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">
              POPULAIRE
            </div>
            <div>
              <p className="text-sm font-semibold text-primary mb-1">Pro</p>
              <div className="flex items-end gap-1">
                <span className="text-4xl font-bold text-foreground">27 $</span>
                <span className="text-muted-foreground text-sm mb-1.5">/mois</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Tout débloqué pour une petite équipe</p>
            </div>
            <ul className="space-y-2 flex-1">
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                  <Check className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <Button
              className="w-full shadow-glow"
              onClick={() => navigate("/login?intent=create&plan=pro")}
            >
              Choisir Pro <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>

          {/* Business */}
          <div className="p-6 rounded-2xl border border-border/50 bg-card space-y-5 flex flex-col">
            <div>
              <p className="text-sm font-semibold text-muted-foreground mb-1">Business</p>
              <div className="flex items-end gap-1">
                <span className="text-4xl font-bold text-foreground">57 $</span>
                <span className="text-muted-foreground text-sm mb-1.5">/mois</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Pour les équipes grandissantes</p>
            </div>
            <ul className="space-y-2 flex-1">
              {BUSINESS_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                  <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <Button
              variant="outline"
              className="w-full border-primary/40 text-primary hover:bg-primary/10"
              onClick={() => navigate("/login?intent=create&plan=business")}
            >
              Choisir Business
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
          <EchoTintedLogo color="#10b981" size="w-7 h-7" untinted />
          <span className="text-sm font-semibold text-foreground">Echo</span>
          <span className="text-xs text-muted-foreground">— Ton centre de contrôle business, propulsé par l'IA</span>
        </div>
        <p className="text-xs text-muted-foreground">© 2026 Echo. Tous droits réservés.</p>
      </footer>
    </div>
  );
}
