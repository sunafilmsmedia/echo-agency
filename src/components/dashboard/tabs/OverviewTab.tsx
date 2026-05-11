import { useClients } from "@/hooks/useClients";
import { useRevenueMetrics } from "@/hooks/useRevenueMetrics";
import { formatCurrency, getDayOfYear } from "@/lib/utils";
import { Users, DollarSign, Target, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
    <div className="p-6 space-y-6">
      {/* Echo advice */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <img src="/echo-avatar.png" alt="Echo" className="w-10 h-10 rounded-full object-cover border border-primary/30 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-primary mb-1">Conseil du jour — Echo</p>
              <p className="text-sm text-muted-foreground">{tip}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, sub, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="pt-5">
              <div className="flex items-start justify-between mb-3">
                <p className="text-xs text-muted-foreground font-medium">{label}</p>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-muted-foreground mt-1">{sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent activity (static) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">Activité Récente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { emoji: "✅", text: "Contrat signé — Client A", time: "Il y a 2h" },
              { emoji: "🎬", text: "Tournage planifié — Client B", time: "Il y a 5h" },
              { emoji: "💰", text: "Paiement reçu — $2,400", time: "Hier" },
              { emoji: "📞", text: "Call de suivi — Client C", time: "Hier" },
              { emoji: "📝", text: "Stratégie mise à jour — Client D", time: "Il y a 2j" },
            ].map(({ emoji, text, time }) => (
              <div key={text} className="flex items-center gap-3 text-sm">
                <span className="text-base">{emoji}</span>
                <span className="flex-1 text-foreground">{text}</span>
                <span className="text-muted-foreground text-xs">{time}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Clients — Progrès</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeClients.slice(0, 5).map((client) => {
              const match = client.notes?.match(/(\d+)%/);
              const progress = match ? parseInt(match[1]) : 0;
              return (
                <div key={client.id}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-foreground truncate">{client.name}</span>
                    <span className="text-muted-foreground">{progress}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {activeClients.length === 0 && (
              <p className="text-xs text-muted-foreground">Aucun client actif</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
