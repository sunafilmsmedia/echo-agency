import { Shield, Briefcase, TrendingUp, Zap, Target, LayoutDashboard, ArrowRight, ChevronUp } from "lucide-react";

const benefits = [
  {
    icon: Shield,
    title: "Sécurité Premium",
    description: "Vos données clients et revenus protégés avec une authentification Supabase de niveau entreprise.",
  },
  {
    icon: Briefcase,
    title: "10+ Années d'Expertise",
    description: "Conçu par des experts en agences vidéo qui comprennent les vrais défis du terrain.",
  },
  {
    icon: TrendingUp,
    title: "Expérience Terrain",
    description: "Chaque fonctionnalité vient d'un besoin réel. Pas de features inutiles, que du concret.",
  },
  {
    icon: Zap,
    title: "IA Instantanée",
    description: "Organisez vos tâches et obtenez des conseils marketing en temps réel grâce à l'IA intégrée.",
  },
  {
    icon: Target,
    title: "Stratégies Optimisées",
    description: "Accès direct à vos conseillers IA spécialisés : Scaling, Ads, Contenu et Assistant.",
  },
  {
    icon: LayoutDashboard,
    title: "Interface Premium",
    description: "Un dashboard sombre et élégant conçu pour vous donner envie de travailler tous les jours.",
  },
];

interface BenefitsSectionProps {
  onBackToTop: () => void;
  onGetStarted: () => void;
}

export function BenefitsSection({ onBackToTop, onGetStarted }: BenefitsSectionProps) {
  return (
    <section id="benefits" className="py-24 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Pourquoi choisir <span className="glow-text">Echo</span> ?
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Tout ce dont une agence vidéo moderne a besoin pour scaler, en un seul endroit.
          </p>
        </div>

        {/* Benefits grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {benefits.map(({ icon: Icon, title, description }) => (
            <div key={title} className="card-premium group hover:border-primary/30 hover:shadow-glow transition-all duration-300">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground">{title}</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center space-y-4">
          <button onClick={onGetStarted} className="btn-hero text-base px-8 py-4">
            Commencer Maintenant <ArrowRight className="w-5 h-5" />
          </button>
          <div>
            <button
              onClick={onBackToTop}
              className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1"
            >
              <ChevronUp className="w-4 h-4" /> Retour en haut
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
