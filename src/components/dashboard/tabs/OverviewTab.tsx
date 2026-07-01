import { useClients } from "@/hooks/useClients";
import { useRevenueMetrics } from "@/hooks/useRevenueMetrics";
import { formatCurrency, getDayOfYear } from "@/lib/utils";
import { Users, DollarSign, Target, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EchoTintedLogo } from "@/components/EchoTintedLogo";
import { useAgencySettings } from "@/hooks/usePortal";

const ECHO_TIPS = [
  "Contactez vos clients inactifs depuis plus de 30 jours pour prévenir le churn.",
  "Un upsell bien placé peut augmenter votre MRR de 20% sans nouveau client.",
  "La règle 80/20 : 80% de vos revenus viennent de 20% de vos clients.",
  "Automatisez vos rapports pour gagner 5h/semaine minimum.",
  "Un témoignage client bien placé peut doubler votre taux de closing.",
  "Testez une augmentation de prix de 15% sur vos nouveaux clients ce mois-ci.",
  "Créez un package premium — les clients qui paient plus partent moins.",
  "Votre prochaine étude de cas client peut valoir 10 nouveaux prospects.",
];

export function OverviewTab() {
  const { data: clients = [] } = useClients();
  const { data: metrics } = useRevenueMetrics();
  const { data: agency } = useAgencySettings();
  const agencyColor = agency?.color || "#7c3aed";

  const activeClients = clients.filter((c) => c.status === "active");
  const pipelineClients = clients.filter((c) => c.status === "pipeline");
  const mrr = metrics?.total_revenue ?? activeClients.reduce((s, c) => s + (c.monthly_recurring_revenue ?? 0), 0);
  const pipelineValue = pipelineClients.reduce((s, c) => s + (c.monthly_recurring_revenue ?? 0), 0);

  const tip = ECHO_TIPS[getDayOfYear() % ECHO_TIPS.length];

  const stats = [
    {
      label: "Clients Actifs",
      value: activeClients.length.toString(),
      sub: "+1/semaine",
      icon: Users,
      color: "text-primary",
    },
    {
      label: "MRR Récurrent",
      value: formatCurrency(mrr),
      sub: `Pipeline: ${formatCurrency(pipelineValue)}`,
      icon: DollarSign,
      color: "text-emerald-400",
    },
    {
      label: "Taux de Closing",
      value: `${metrics?.closing_rate ?? 50}%`,
      sub: "4 RDV/semaine",
      icon: Target,
      color: "text-amber-400",
    },
    {
      label: "Leads Générés",
      value: `${metrics?.leads_per_week ?? 10}/sem`,
      sub: `${pipelineClients.length} en pipeline`,
      icon: TrendingUp,
      color: "text-blue-400",
    },
  ];

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Echo advice — subtle, spacious */}
      <div className="rounded-2xl border border-border/30 bg-card p-5 flex items-start gap-4">
        <EchoTintedLogo color={agencyColor} pose="thinking" size="w-10 h-10" rounded="rounded-full" />
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-primary mb-1">Conseil du jour · Echo</p>
          <p className="text-sm text-foreground leading-relaxed">{tip}</p>
        </div>
      </div>

      {/* KPI Stats — cleaner, less noisy */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, sub, icon: Icon, color }) => (
          <div key={label} className="rounded-2xl border border-border/30 bg-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
              <div className="w-7 h-7 rounded-lg bg-muted/40 flex items-center justify-center">
                <Icon className={`w-3.5 h-3.5 ${color}`} />
              </div>
            </div>
            <p className="text-3xl font-bold text-foreground tracking-tight">{value}</p>
            <p className="text-[11px] text-muted-foreground">{sub}</p>
          </div>
        ))}
      </div>

      {/* Recent activity + Client progress */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-2xl border border-border/30 bg-card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/30">
            <h3 className="text-sm font-semibold text-foreground">Activité Récente</h3>
            <button className="text-[11px] text-muted-foreground hover:text-primary transition-colors">Tout voir</button>
          </div>
          <div className="divide-y divide-border/20">
            {[
              { emoji: "✅", text: "Contrat signé — Client A", time: "Il y a 2h" },
              { emoji: "🎬", text: "Tournage planifié — Client B", time: "Il y a 5h" },
              { emoji: "💰", text: "Paiement reçu — $2,400", time: "Hier" },
              { emoji: "📞", text: "Call de suivi — Client C", time: "Hier" },
              { emoji: "📝", text: "Stratégie mise à jour — Client D", time: "Il y a 2j" },
            ].map(({ emoji, text, time }) => (
              <div key={text} className="flex items-center gap-3 px-5 py-3 text-sm hover:bg-muted/20 transition-colors">
                <span className="text-base">{emoji}</span>
                <span className="flex-1 text-foreground">{text}</span>
                <span className="text-muted-foreground text-[11px]">{time}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border/30 bg-card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/30">
            <h3 className="text-sm font-semibold text-foreground">Clients — Progrès</h3>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{activeClients.length} actifs</span>
          </div>
          <div className="p-5 space-y-3.5">
            {activeClients.slice(0, 5).map((client) => {
              const match = client.notes?.match(/(\d+)%/);
              const progress = match ? parseInt(match[1]) : 0;
              return (
                <div key={client.id}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-foreground truncate font-medium">{client.name}</span>
                    <span className="text-muted-foreground">{progress}%</span>
                  </div>
                  <div className="h-1 rounded-full bg-muted/50 overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${Math.max(progress, 2)}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {activeClients.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">Aucun client actif</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
