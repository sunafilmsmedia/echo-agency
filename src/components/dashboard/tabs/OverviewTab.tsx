import { useClients } from "@/hooks/useClients";
import { useRevenueMetrics, useRevenueMetricsYTD } from "@/hooks/useRevenueMetrics";
import { useExpenseItems } from "@/hooks/useExpenseItems";
import { formatCurrency, getDayOfYear, getContractEndDate, monthsUntil } from "@/lib/utils";
import { Users, DollarSign, Target, TrendingUp, AlertTriangle, Clock, DollarSign as DollarIcon, TrendingDown, PauseCircle } from "lucide-react";
import { EchoTintedLogo } from "@/components/EchoTintedLogo";
import { useAgencySettings } from "@/hooks/usePortal";
import { useCurrentUser, displayFirstName } from "@/hooks/useCurrentUser";

// Salutation qui suit l'heure de la journée — meilleure UX que "Bonjour" fixe.
function greetingForNow(): string {
  const h = new Date().getHours();
  if (h < 5)  return "Bonne nuit";
  if (h < 12) return "Bonjour";
  if (h < 18) return "Bon après-midi";
  return "Bonsoir";
}

const MONTHS_FR_SHORT = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];

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
  const { data: ytdMetrics = [] } = useRevenueMetricsYTD();
  const { data: expenseItems = [] } = useExpenseItems();
  const { data: agency } = useAgencySettings();
  const currentUser = useCurrentUser();
  const agencyColor = agency?.color || "#7c3aed";
  // Priorité : nom du user connecté (metadata du signup) → fallback prénom de l'owner
  // d'agence pour les comptes créés avant la refonte signup (ex: Josué).
  const firstName   = displayFirstName(currentUser, agency?.owner_first_name);
  const greeting    = greetingForNow();
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth(); // 0-indexed

  // Reconstitue les 12 mois de l'année en cours à partir du YTD, même les mois
  // absents de la DB (revenue = 0 mais on veut la barre visible).
  const monthlyRevenue = Array.from({ length: 12 }, (_, i) => {
    const startPrefix = `${currentYear}-${String(i + 1).padStart(2, "0")}`;
    const found = ytdMetrics.find((m) => m.period_start.startsWith(startPrefix));
    return {
      monthIdx: i,
      label: MONTHS_FR_SHORT[i],
      total: (found?.total_revenue ?? 0) + (found?.extra_revenue ?? 0),
      isFuture: i > currentMonth,
    };
  });
  const ytdTotal = monthlyRevenue.reduce((s, m) => s + m.total, 0);
  const monthsElapsed = currentMonth + 1;
  const monthlyAvg = monthsElapsed > 0 ? ytdTotal / monthsElapsed : 0;
  const maxMonth = Math.max(...monthlyRevenue.map((m) => m.total), 1); // guard div/0

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
      {/* Hero salutation — revenu YTD + rythme mensuel + snapshot */}
      <div
        className="relative rounded-2xl border overflow-hidden"
        style={{ borderColor: `${agencyColor}55`, background: `linear-gradient(135deg, ${agencyColor}12, ${agencyColor}03 55%)` }}
      >
        {/* Glow décoratif */}
        <div
          aria-hidden
          className="absolute -top-16 -right-16 w-64 h-64 rounded-full pointer-events-none"
          style={{ background: `radial-gradient(circle, ${agencyColor}35, transparent 70%)`, filter: "blur(40px)" }}
        />

        <div className="relative grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-6 p-6 md:p-7">
          {/* ─── Left column: greeting + YTD total ─── */}
          <div className="space-y-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: agencyColor }}>
                Aperçu {currentYear}
              </p>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground mt-1 tracking-tight">
                {greeting}{firstName ? `, ${firstName}` : ""} 👋
              </h1>
              <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                Voici combien tu as fait cette année.
              </p>
            </div>

            <div className="flex items-baseline gap-3 flex-wrap">
              <p className="text-4xl md:text-5xl font-bold tabular-nums" style={{ color: agencyColor }}>
                {formatCurrency(ytdTotal)}
              </p>
              <p className="text-xs text-muted-foreground">
                sur <span className="font-semibold text-foreground">{monthsElapsed} mois</span>
                {" · "}moyenne <span className="font-semibold text-foreground">{formatCurrency(monthlyAvg)}/mois</span>
              </p>
            </div>

            {/* Mini stats en pastilles */}
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="text-xs px-2.5 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary flex items-center gap-1.5">
                <Users className="w-3 h-3" /> {activeClients.length} clients actifs
              </span>
              <span className="text-xs px-2.5 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 flex items-center gap-1.5">
                <DollarSign className="w-3 h-3" /> {formatCurrency(mrr)}/mois MRR
              </span>
              {pipelineClients.length > 0 && (
                <span className="text-xs px-2.5 py-1 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 flex items-center gap-1.5">
                  <TrendingUp className="w-3 h-3" /> {pipelineClients.length} au pipeline
                </span>
              )}
            </div>
          </div>

          {/* ─── Right column: bar chart par mois ─── */}
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
              Par mois — {currentYear}
            </p>
            <div className="flex items-end gap-1.5 h-[140px]">
              {monthlyRevenue.map((m) => {
                const heightPct = m.total > 0 ? Math.max(4, (m.total / maxMonth) * 100) : 2;
                const isCurrent = m.monthIdx === currentMonth;
                return (
                  <div key={m.monthIdx} className="flex-1 flex flex-col items-center gap-1 min-w-0 group">
                    <div className="w-full flex-1 flex items-end relative">
                      <div
                        className="w-full rounded-t transition-all duration-500"
                        title={`${m.label} : ${formatCurrency(m.total)}`}
                        style={{
                          height: `${heightPct}%`,
                          background: m.isFuture
                            ? "hsl(var(--muted-foreground) / 0.15)"
                            : isCurrent
                            ? `linear-gradient(180deg, ${agencyColor}, ${agencyColor}aa)`
                            : `${agencyColor}88`,
                          border: isCurrent ? `1px solid ${agencyColor}` : "none",
                        }}
                      />
                      {/* Tooltip on hover — small floating chip above the bar */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                        <div className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-foreground text-background">
                          {formatCurrency(m.total)}
                        </div>
                      </div>
                    </div>
                    <span
                      className={`text-[9px] uppercase tracking-wider ${
                        m.isFuture ? "text-muted-foreground/40" : isCurrent ? "font-bold" : "text-muted-foreground"
                      }`}
                      style={isCurrent ? { color: agencyColor } : undefined}
                    >
                      {m.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

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
