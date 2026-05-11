import { ArrowRight, Star } from "lucide-react";

interface HeroSectionProps {
  onBenefitsClick: () => void;
  onLoginClick: () => void;
}

export function HeroSection({ onBenefitsClick, onLoginClick }: HeroSectionProps) {
  return (
    <section className="relative min-h-screen flex items-center justify-center pt-20 px-6 overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 bg-gradient-glow pointer-events-none" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto text-center">
        {/* Rating badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/10 text-sm text-primary mb-8">
          <div className="flex gap-0.5">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-3.5 h-3.5 fill-primary text-primary" />
            ))}
          </div>
          <span>Plateforme #1 des agences vidéo</span>
        </div>

        {/* Headline */}
        <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
          Scale Your Agency with an{" "}
          <span className="glow-text">AI-Powered</span> Team
        </h1>

        <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
          Centralisez vos clients, revenus, tâches et stratégies marketing dans un seul dashboard intelligent.
          Conçu pour les agences de contenu vidéo qui veulent scaler.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button onClick={onBenefitsClick} className="btn-outline-glow">
            Pourquoi Nous Choisir
          </button>
          <button onClick={onLoginClick} className="btn-hero">
            Se connecter <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Floating dashboard preview */}
        <div className="mt-20 relative">
          <div className="animate-float mx-auto max-w-3xl rounded-2xl border border-primary/20 bg-card/80 backdrop-blur p-6 shadow-premium">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-destructive/70" />
              <div className="w-3 h-3 rounded-full bg-amber-500/70" />
              <div className="w-3 h-3 rounded-full bg-primary/70" />
              <div className="flex-1 ml-2 h-5 rounded bg-secondary/50" />
            </div>
            <div className="grid grid-cols-4 gap-3 mb-4">
              {["Clients Actifs", "MRR", "Closing Rate", "Pipeline"].map((label, i) => (
                <div key={label} className="rounded-lg border border-border/50 bg-background/50 p-3">
                  <div className="text-xs text-muted-foreground mb-1">{label}</div>
                  <div className="text-lg font-bold text-primary">
                    {["8", "$12.4k", "50%", "$8.2k"][i]}
                  </div>
                </div>
              ))}
            </div>
            <div className="h-24 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 border border-border/30 flex items-end px-4 pb-2 gap-1">
              {[40, 55, 45, 70, 60, 80, 75, 90, 85, 95, 88, 100].map((h, i) => (
                <div key={i} className="flex-1 bg-primary/60 rounded-t" style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
