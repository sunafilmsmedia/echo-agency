import { useClients } from "@/hooks/useClients";
import { useRevenueMetrics } from "@/hooks/useRevenueMetrics";
import { useExpenseItems } from "@/hooks/useExpenseItems";
import { formatCurrency, getDayOfYear, getContractEndDate, monthsUntil } from "@/lib/utils";
import { Users, DollarSign, Target, TrendingUp, AlertTriangle, Clock, DollarSign as DollarIcon, TrendingDown, PauseCircle } from "lucide-react";
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

type UrgencySeverity = "high" | "medium" | "low";
interface Urgency {
  id: string;
  severity: UrgencySeverity;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  detail: string;
}

export function OverviewTab() {
  const { data: clients = [] } = useClients();
  const { data: metrics } = useRevenueMetrics();
  const { data: expenseItems = [] } = useExpenseItems();
  const { data: agency } = useAgencySettings();
  const agencyColor = agency?.color || "#7c3aed";

  const activeClients = clients.filter((c) => c.status === "active");
  const pipelineClients = clients.filter((c) => c.status === "pipeline");
  const mrr = metrics?.total_revenue ?? activeClients.reduce((s, c) => s + (c.monthly_recurring_revenue ?? 0), 0);
  const pipelineValue = pipelineClients.reduce((s, c) => s + (c.monthly_recurring_revenue ?? 0), 0);

  const tip = ECHO_TIPS[getDayOfYear() % ECHO_TIPS.length];

  // ─── Urgences ──────────────────────────────────────────────────────────────
  const urgencies: Urgency[] = (() => {
    const list: Urgency[] = [];

    // 1. Contracts ending in ≤ 2 months
    activeClients.forEach((c) => {
      const endDate = getContractEndDate(c.contract_start_date, c.contract_length_months, c.contract_end_date);
      const left = monthsUntil(endDate);
      if (left === null) return;
      if (left < 0) {
        list.push({
          id: `contract-exp-${c.id}`,
          severity: "high",
          icon: Clock,
          title: `Contrat expiré — ${c.name}`,
          detail: "Relance urgente pour renouveler.",
        });
      } else if (left <= 1) {
        list.push({
          id: `contract-1m-${c.id}`,
          severity: "high",
          icon: Clock,
          title: `Contrat fini dans ${left} mois — ${c.name}`,
          detail: "Prépare la proposition de renouvellement.",
        });
      } else if (left <= 2) {
        list.push({
          id: `contract-2m-${c.id}`,
          severity: "medium",
          icon: Clock,
          title: `Contrat fini dans ${left} mois — ${c.name}`,
          detail: "Bon moment pour un check-in de satisfaction.",
        });
      }
    });

    // 2. Total expenses vs MRR
    const totalExpenses = expenseItems.reduce((s, i) => s + i.amount, 0) + (metrics?.extra_expenses ?? 0);
    if (mrr > 0) {
      const expenseRatio = totalExpenses / mrr;
      if (expenseRatio >= 0.9) {
        list.push({
          id: "expense-critical",
          severity: "high",
          icon: TrendingDown,
          title: `Dépenses à ${Math.round(expenseRatio * 100)}% du MRR`,
          detail: `${formatCurrency(totalExpenses)} de charges pour ${formatCurrency(mrr)} de revenu récurrent.`,
        });
      } else if (expenseRatio >= 0.7) {
        list.push({
          id: "expense-warning",
          severity: "medium",
          icon: DollarIcon,
          title: `Dépenses élevées : ${Math.round(expenseRatio * 100)}% du MRR`,
          detail: "Regarde où tu peux couper — la marge se serre.",
        });
      }
    }

    // 3. Clients on hold
    const onHold = clients.filter((c) => c.status === "on_hold");
    onHold.forEach((c) => {
      list.push({
        id: `hold-${c.id}`,
        severity: "medium",
        icon: PauseCircle,
        title: `En pause — ${c.name}`,
        detail: "Relance ou change le statut si ce n'est plus d'actualité.",
      });
    });

    // 4. Pipeline stagnant (updated > 30 days ago)
    const now = Date.now();
    pipelineClients.forEach((c) => {
      if (!c.updated_at) return;
      const daysSince = (now - new Date(c.updated_at).getTime()) / 86_400_000;
      if (daysSince > 30) {
        list.push({
          id: `pipeline-stale-${c.id}`,
          severity: "low",
          icon: AlertTriangle,
          title: `Pipeline sans nouvelle — ${c.name}`,
          detail: `Aucune activité depuis ${Math.round(daysSince)} jours.`,
        });
      }
    });

    // 5. No active clients at all
    if (activeClients.length === 0 && clients.length > 0) {
      list.push({
        id: "no-active",
        severity: "high",
        icon: Users,
        title: "Aucun client actif",
        detail: "Convertis un prospect du pipeline pour rétablir le MRR.",
      });
    }

    // Sort by severity: high → medium → low
    const rank = { high: 0, medium: 1, low: 2 };
    return list.sort((a, b) => rank[a.severity] - rank[b.severity]);
  })();

  const severityStyles: Record<UrgencySeverity, { border: string; bg: string; icon: string; badge: string; badgeText: string }> = {
    high:   { border: "border-destructive/40",  bg: "bg-destructive/5",  icon: "text-destructive",  badge: "bg-destructive/15 text-destructive",  badgeText: "URGENT" },
    medium: { border: "border-amber-500/40",    bg: "bg-amber-500/5",    icon: "text-amber-400",    badge: "bg-amber-500/15 text-amber-400",      badgeText: "À SURVEILLER" },
    low:    { border: "border-blue-500/30",     bg: "bg-blue-500/5",     icon: "text-blue-400",     badge: "bg-blue-500/15 text-blue-400",        badgeText: "INFO" },
  };

  // Progress = current value / target. Clamped 0..1. Used to render the
  // ambient bar-in-background of each KPI card.
  const clip = (x: number) => Math.max(0, Math.min(1, x));

  const clientsGoal = Math.max(activeClients.length + pipelineClients.length, 10);
  const mrrGoal     = metrics?.mrr_goal && metrics.mrr_goal > 0 ? metrics.mrr_goal : Math.max(mrr * 1.25, 5000);
  const closingRate = metrics?.closing_rate ?? 50;
  const leadsWeek   = metrics?.leads_per_week ?? 0;
  const leadsGoal   = Math.max(leadsWeek * 1.5, 20);

  const stats = [
    {
      label: "Clients Actifs",
      value: activeClients.length.toString(),
      sub: `sur ${clientsGoal} suivis · ${Math.round(clip(activeClients.length / clientsGoal) * 100)}%`,
      icon: Users,
      color: "text-primary",
      progress: clip(activeClients.length / clientsGoal),
    },
    {
      label: "MRR Récurrent",
      value: formatCurrency(mrr),
      sub: metrics?.mrr_goal
        ? `${Math.round(clip(mrr / mrrGoal) * 100)}% de ${formatCurrency(mrrGoal)}`
        : `Pipeline : ${formatCurrency(pipelineValue)}`,
      icon: DollarSign,
      color: "text-emerald-400",
      progress: clip(mrr / mrrGoal),
    },
    {
      label: "Taux de Closing",
      value: `${closingRate}%`,
      sub: `Cible : 100%`,
      icon: Target,
      color: "text-amber-400",
      progress: clip(closingRate / 100),
    },
    {
      label: "Leads Générés",
      value: `${leadsWeek}/sem`,
      sub: `${pipelineClients.length} en pipeline · cible ${leadsGoal}/sem`,
      icon: TrendingUp,
      color: "text-blue-400",
      progress: clip(leadsWeek / leadsGoal),
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

      {/* KPI Stats — with ambient background progress bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, sub, icon: Icon, color, progress }) => (
          <div key={label} className="relative rounded-2xl border border-border/30 bg-card p-5 space-y-3 overflow-hidden">
            {/* Background progress fill — left-to-right, subtle green wash */}
            <div
              aria-hidden
              className="absolute inset-y-0 left-0 transition-all duration-700 ease-out pointer-events-none"
              style={{
                width: `${progress * 100}%`,
                background: `linear-gradient(90deg, hsl(var(--primary) / 0.14) 0%, hsl(var(--primary) / 0.05) 70%, transparent 100%)`,
              }}
            />
            {/* Bottom accent line — matches the fill width */}
            <div
              aria-hidden
              className="absolute bottom-0 left-0 h-[2px] transition-all duration-700 ease-out pointer-events-none"
              style={{
                width: `${progress * 100}%`,
                background: `linear-gradient(90deg, hsl(var(--primary) / 0.8), hsl(var(--primary) / 0.3))`,
              }}
            />
            {/* Content */}
            <div className="relative flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
              <div className="w-7 h-7 rounded-lg bg-background/60 backdrop-blur flex items-center justify-center border border-border/40">
                <Icon className={`w-3.5 h-3.5 ${color}`} />
              </div>
            </div>
            <p className="relative text-3xl font-bold text-foreground tracking-tight">{value}</p>
            <p className="relative text-[11px] text-muted-foreground">{sub}</p>
          </div>
        ))}
      </div>

      {/* Urgences + Client progress */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-2xl border border-border/30 bg-card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/30">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive" /> Urgences
            </h3>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
              {urgencies.length === 0 ? "Tout est OK" : `${urgencies.length} à traiter`}
            </span>
          </div>
          {urgencies.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-3xl mb-2">✅</p>
              <p className="text-sm text-foreground font-medium">Aucune urgence en vue</p>
              <p className="text-xs text-muted-foreground mt-1">Contrats en règle, dépenses sous contrôle, pipeline actif.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/20 max-h-[420px] overflow-y-auto">
              {urgencies.map((u) => {
                const s = severityStyles[u.severity];
                const Icon = u.icon;
                return (
                  <div key={u.id} className={`flex items-start gap-3 px-5 py-3.5 text-sm border-l-2 ${s.border} ${s.bg} hover:bg-muted/10 transition-colors`}>
                    <div className={`mt-0.5 ${s.icon}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${s.badge}`}>
                          {s.badgeText}
                        </span>
                        <p className="text-sm font-medium text-foreground truncate">{u.title}</p>
                      </div>
                      <p className="text-[11px] text-muted-foreground">{u.detail}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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
