import { useState, useEffect } from "react";
import { useRevenueMetrics, useRevenueMetricsHistory, useRevenueMetricsYTD, useUpdateRevenueMetrics, useUpdateRevenueMetricsForPeriod } from "@/hooks/useRevenueMetrics";
import { useExpenseItems, useCreateExpenseItem, useDeleteExpenseItem } from "@/hooks/useExpenseItems";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { formatCurrency } from "@/lib/utils";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { ChevronDown, Plus, Trash2, TrendingUp, DollarSign, AlertTriangle, Zap, RefreshCw, Pencil, Check, X, History } from "lucide-react";
import { useStripeRevenue } from "@/hooks/useStripeRevenue";
import { useClients } from "@/hooks/useClients";
import { useCalendlyRdvCount } from "@/hooks/useCalendlyRdvCount";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const EXPENSE_CATEGORIES = [
  { key: "salaires_employes",  label: "Salaires Employés" },
  { key: "salaires_direction", label: "Salaires Direction" },
  { key: "systemes_logiciels", label: "Systèmes & Logiciels" },
  { key: "frais_bureau",       label: "Frais de Bureau" },
  { key: "marketing_publicites", label: "Marketing & Publicités" },
  { key: "commodites",         label: "Commodités" },
  { key: "transport",          label: "Transport" },
];

export function RevenueTab() {
  const { data: metrics, isLoading } = useRevenueMetrics();
  const { data: stripe, isLoading: stripeLoading, refetch: refetchStripe } = useStripeRevenue();
  const qc = useQueryClient();
  const { data: history = [] } = useRevenueMetricsHistory();
  const { data: ytd = [] } = useRevenueMetricsYTD();
  const { data: expenseItems = [] } = useExpenseItems();
  const updateMetrics = useUpdateRevenueMetrics();
  const updateMetricsForPeriod = useUpdateRevenueMetricsForPeriod();
  const createExpense = useCreateExpenseItem();
  const deleteExpense = useDeleteExpenseItem();

  const [extraRevenue, setExtraRevenue] = useState(0);
  const [extraExpenses, setExtraExpenses] = useState(0);
  const [mrrGoal, setMrrGoal] = useState(0);
  const [yearlyGoal, setYearlyGoal] = useState(0);
  const [editingMetrics, setEditingMetrics] = useState(false);
  const [growthForm, setGrowthForm] = useState({ leads_per_week: 0, rdv_per_week: 0, closing_rate: 50, clients_per_week: 0 });

  // ─── Auto-computed growth metrics ────────────────────────────
  const { data: allClients = [] } = useClients();
  const growthAuto = (() => {
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd   = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const daysElapsed = (today.getDate());
    const weeksElapsed = Math.max(1, daysElapsed / 7);

    // New active clients created this month
    const newThisMonth = allClients.filter((c) => {
      if (!c.created_at) return false;
      const d = new Date(c.created_at);
      return d >= monthStart && d <= monthEnd && c.status === "active";
    }).length;

    // Churn this month: ONLY clients passed to "lost" this month.
    // "on_hold" = pause temporaire → pas un churn.
    // "completed" = contrat terminé naturellement → pas un churn non plus.
    const churnedThisMonth = allClients.filter((c) => {
      if (c.status !== "lost" || !c.updated_at) return false;
      const d = new Date(c.updated_at);
      return d >= monthStart && d <= monthEnd;
    }).length;

    // Denominator = active + churned this month (clients that were "on the books" this month)
    const activeNow = allClients.filter((c) => c.status === "active").length;
    const denomForChurn = activeNow + churnedThisMonth;
    const churnRate = denomForChurn > 0 ? Math.round((churnedThisMonth / denomForChurn) * 100) : 0;

    return {
      clientsPerMonth: newThisMonth,
      clientsPerWeek: +(newThisMonth / weeksElapsed).toFixed(1),
      churnRate,
      activeNow,
      churnedThisMonth,
    };
  })();

  // ─── Calendly RDV/week (live from API) ───────────────────────
  const calendly = useCalendlyRdvCount();
  const [newExpense, setNewExpense] = useState<{ category: string; label: string; amount: string } | null>(null);
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (metrics) {
      setExtraRevenue(metrics.extra_revenue ?? 0);
      setExtraExpenses(metrics.extra_expenses ?? 0);
      setMrrGoal(metrics.mrr_goal ?? 0);
      setYearlyGoal(metrics.yearly_goal ?? 0);
      setGrowthForm({
        leads_per_week: metrics.leads_per_week ?? 0,
        rdv_per_week: metrics.rdv_per_week ?? 0,
        closing_rate: metrics.closing_rate ?? 50,
        clients_per_week: metrics.clients_per_week ?? 0,
      });
    }
  }, [metrics]);

  const mrr = metrics?.total_revenue ?? 0;
  const recurringExpenses = expenseItems.reduce((s, i) => s + i.amount, 0);
  const totalExpenses = recurringExpenses + extraExpenses;
  const totalRevenue = mrr + extraRevenue;
  const netProfit = totalRevenue - totalExpenses;

  // Auto-sync when expense items change (create/delete) — extras stay untouched here,
  // they have their own explicit save handlers.
  useEffect(() => {
    if (!metrics) return;
    const catTotals: Record<string, number> = {};
    EXPENSE_CATEGORIES.forEach(({ key }) => {
      catTotals[key] = expenseItems.filter((i) => i.category === key).reduce((s, i) => s + i.amount, 0);
    });
    updateMetrics.mutate({ monthly_expenses: recurringExpenses + extraExpenses, ...catTotals });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expenseItems]);

  // Explicit save on blur / Enter — persists into the current month row,
  // stays there forever (rolls into monthly history + YTD totals).
  const saveExtraRevenue = () => {
    updateMetrics.mutate({ extra_revenue: extraRevenue }, {
      onSuccess: () => toast.success(
        extraRevenue > 0
          ? `+ ${formatCurrency(extraRevenue)} sauvegardés au revenu du mois`
          : "Extra retiré du revenu du mois"
      ),
    });
  };

  const saveExtraExpenses = () => {
    updateMetrics.mutate({
      extra_expenses: extraExpenses,
      monthly_expenses: recurringExpenses + extraExpenses,
    }, {
      onSuccess: () => toast.success(
        extraExpenses > 0
          ? `+ ${formatCurrency(extraExpenses)} sauvegardés aux dépenses du mois`
          : "Extra retiré des dépenses du mois"
      ),
    });
  };

  // Chart data
  const chartData = history.slice(-12).map((m) => ({
    month: new Date(m.period_start).toLocaleDateString("fr-CA", { month: "short" }),
    revenue: m.total_revenue + m.extra_revenue,
    expenses: m.monthly_expenses,
  }));

  // Add projections
  if (chartData.length >= 2) {
    const rates = chartData.slice(1).map((d, i) => (chartData[i].revenue > 0 ? d.revenue / chartData[i].revenue : 1));
    const avgRate = rates.reduce((s, r) => s + r, 0) / rates.length;
    const lastRevenue = chartData[chartData.length - 1].revenue;
    for (let i = 1; i <= 3; i++) {
      chartData.push({
        month: `+${i}m`,
        revenue: Math.round(lastRevenue * Math.pow(avgRate, i)),
        expenses: 0,
      });
    }
  }

  // YTD
  const now = new Date();
  const monthsElapsed = now.getMonth() + 1;
  const ytdRevenue   = ytd.reduce((s, m) => s + m.total_revenue + m.extra_revenue, 0);
  const ytdExpenses  = ytd.reduce((s, m) => s + m.monthly_expenses, 0);
  const yearlyProjection = monthsElapsed > 0 ? (ytdRevenue / monthsElapsed) * 12 : 0;
  // Annual expenses: actual YTD + run-rate × remaining months
  const annualExpenses   = ytdExpenses + (totalExpenses * (12 - monthsElapsed));

  const saveGrowthMetrics = () => {
    updateMetrics.mutate(growthForm);
    setEditingMetrics(false);
  };

  const toggleCategory = (key: string) => {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Chargement...</div>;

  return (
    <div className="p-6 space-y-6">
      {/* Stripe live data */}
      <Card className="border-violet-500/20 bg-gradient-to-r from-violet-500/5 to-transparent">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-violet-400" />
              <span>Stripe — Données en temps réel</span>
              {stripe && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
            </div>
            <button
              onClick={() => refetchStripe()}
              className="text-muted-foreground hover:text-foreground transition-colors"
              disabled={stripeLoading}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${stripeLoading ? "animate-spin" : ""}`} />
            </button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stripeLoading ? (
            <p className="text-xs text-muted-foreground">Connexion à Stripe...</p>
          ) : stripe ? (
            <div className="space-y-4">
              {/* KPIs */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-card/60 rounded-lg p-3 border border-border/40">
                  <p className="text-xs text-muted-foreground">MRR Stripe</p>
                  <p className="text-xl font-bold text-violet-400 mt-0.5">{formatCurrency(stripe.mrr)}</p>
                </div>
                <div className="bg-card/60 rounded-lg p-3 border border-border/40">
                  <p className="text-xs text-muted-foreground">Abonnés actifs</p>
                  <p className="text-xl font-bold text-foreground mt-0.5">{stripe.activeCount}</p>
                </div>
              </div>

              {/* Monthly revenue bars */}
              <div>
                <p className="text-xs text-muted-foreground mb-2">Revenus des 6 derniers mois</p>
                <div className="space-y-1.5">
                  {stripe.monthlyRevenue.map((m) => {
                    const max = Math.max(...stripe.monthlyRevenue.map((x) => x.revenue), 1);
                    return (
                      <div key={m.month} className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-16 flex-shrink-0">{m.month}</span>
                        <div className="flex-1 h-2 bg-muted/40 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-violet-400 rounded-full transition-all"
                            style={{ width: `${(m.revenue / max) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-foreground w-16 text-right flex-shrink-0">
                          {formatCurrency(m.revenue)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Recent charges */}
              {stripe.recentCharges.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Paiements récents</p>
                  <div className="space-y-1.5">
                    {stripe.recentCharges.slice(0, 5).map((c) => (
                      <div key={c.id} className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground truncate flex-1">{c.description}</span>
                        <span className="text-muted-foreground mx-2 flex-shrink-0">{c.date}</span>
                        <span className="text-emerald-400 font-medium flex-shrink-0">{formatCurrency(c.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-destructive">Erreur de connexion Stripe. Vérifie ta clé dans les secrets Supabase.</p>
          )}
        </CardContent>
      </Card>

      {/* Top metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {/* MRR Récurrent — with highlighted extra overlay */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground mb-1">MRR Récurrent</p>
            {extraRevenue > 0 && (
              <p className="text-xs font-bold text-emerald-400 mb-0.5">
                = {formatCurrency(mrr + extraRevenue)} <span className="text-[10px] font-normal opacity-80">(+{formatCurrency(extraRevenue)} extra)</span>
              </p>
            )}
            <p className="text-lg font-bold text-foreground">{formatCurrency(mrr)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{metrics?.active_clients_count ?? 0} clients</p>
          </CardContent>
        </Card>

        {/* Extra ce mois — editable input, saves on blur + Enter */}
        <Card className={extraRevenue > 0 ? "border-emerald-500/40 bg-emerald-500/[0.03]" : ""}>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground mb-1">Extra ce mois</p>
            <Input
              type="number"
              value={extraRevenue}
              onChange={(e) => setExtraRevenue(Number(e.target.value))}
              onBlur={saveExtraRevenue}
              onKeyDown={(e) => { if (e.key === "Enter") { e.currentTarget.blur(); } }}
              className={`h-7 text-sm font-bold p-1 ${extraRevenue > 0 ? "text-emerald-400" : "text-foreground"}`}
            />
            <p className="text-[10px] mt-1 italic text-muted-foreground">
              {extraRevenue > 0 ? <span className="text-emerald-400">✓ sauvegardé pour ce mois</span> : "Entrée / Tab pour sauvegarder"}
            </p>
          </CardContent>
        </Card>

        {[
          { label: "Revenu Total", value: formatCurrency(totalRevenue), sub: null },
          { label: "Pipeline", value: formatCurrency(metrics?.pipeline_value ?? 0), sub: `${metrics?.pipeline_clients_count ?? 0} clients` },
          { label: "MRR Potentiel", value: formatCurrency(mrr + (metrics?.projected_pipeline_revenue ?? 0)), sub: null },
          { label: "Profit Net", value: formatCurrency(netProfit), sub: null, profit: true },
        ].map(({ label, value, sub, profit }) => (
          <Card key={label} className={profit ? (netProfit >= 0 ? "border-emerald-500/30" : "border-destructive/30") : ""}>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground mb-1">{label}</p>
              <p className={`text-lg font-bold ${profit ? (netProfit >= 0 ? "text-emerald-400" : "text-destructive") : "text-foreground"}`}>
                {value}
              </p>
              {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Revenue chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center justify-between">
            <span className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" /> Évolution des Revenus</span>
            <span className="text-xs text-muted-foreground font-normal">— Projection 3 mois</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(158 100% 72%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(158 100% 72%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 5% 18%)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(215 15% 55%)" }} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(215 15% 55%)" }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ backgroundColor: "hsl(240 6% 9%)", border: "1px solid hsl(240 5% 18%)", borderRadius: 8 }}
                formatter={(v: number) => [formatCurrency(v), "Revenu"]}
              />
              <Area type="monotone" dataKey="revenue" stroke="hsl(158 100% 72%)" fill="url(#revGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
          {/* ── Projections annuelles — grosses cartes très visibles ── */}
          <div className="mt-5 pt-5 border-t border-border/40">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                🎯 Projections fin d'année {new Date().getFullYear()}
              </h4>
              <span className="text-[10px] text-muted-foreground italic">
                basé sur {monthsElapsed} mois écoulés
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Revenu projeté */}
              <div className="rounded-xl border-2 border-emerald-500/30 bg-emerald-500/[0.04] p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400/80 mb-1">
                  Revenu annuel projeté
                </p>
                <p className="text-2xl font-bold text-emerald-400 tracking-tight">
                  {formatCurrency(yearlyProjection)}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  YTD {formatCurrency(ytdRevenue)} extrapolé × 12
                </p>
              </div>

              {/* Dépenses projetées */}
              <div className="rounded-xl border-2 border-destructive/30 bg-destructive/[0.04] p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-destructive/80 mb-1">
                  Dépenses annuelles projetées
                </p>
                <p className="text-2xl font-bold text-destructive tracking-tight">
                  {formatCurrency(annualExpenses)}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  YTD {formatCurrency(ytdExpenses)} + {formatCurrency(totalExpenses)}/mois × {12 - monthsElapsed}
                </p>
              </div>

              {/* Profit projeté */}
              {(() => {
                const yearlyProfit = yearlyProjection - annualExpenses;
                const isPositive = yearlyProfit >= 0;
                return (
                  <div className={`rounded-xl border-2 p-4 ${isPositive ? "border-primary/40 bg-primary/[0.04]" : "border-destructive/50 bg-destructive/[0.06]"}`}>
                    <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${isPositive ? "text-primary/80" : "text-destructive/80"}`}>
                      Profit annuel projeté
                    </p>
                    <p className={`text-2xl font-bold tracking-tight ${isPositive ? "text-primary" : "text-destructive"}`}>
                      {isPositive ? "" : "−"}{formatCurrency(Math.abs(yearlyProfit))}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Marge : {yearlyProjection > 0 ? Math.round((yearlyProfit / yearlyProjection) * 100) : 0}%
                    </p>
                  </div>
                );
              })()}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Editable monthly history */}
      <MonthlyHistoryCard
        history={history}
        updateForPeriod={(period_start, total_revenue, monthly_expenses) =>
          updateMetricsForPeriod.mutate({ period_start, total_revenue, extra_revenue: 0, monthly_expenses })}
      />

      {/* Growth metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center justify-between">
            Métriques de Croissance
            <Button size="sm" variant="ghost" onClick={() => editingMetrics ? saveGrowthMetrics() : setEditingMetrics(true)}>
              {editingMetrics ? "Sauvegarder" : "Modifier"}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Leads/semaine — manuel */}
            <MetricCell label="Leads/semaine">
              {editingMetrics ? (
                <Input type="number" value={growthForm.leads_per_week}
                  onChange={(e) => setGrowthForm({ ...growthForm, leads_per_week: Number(e.target.value) })}
                  className="h-8 text-sm" />
              ) : (
                <p className="font-semibold text-sm">{growthForm.leads_per_week}</p>
              )}
            </MetricCell>

            {/* RDV/semaine — Calendly auto */}
            <MetricCell label="RDV/semaine" badge={
              calendly.data ? "Calendly" :
              calendly.isLoading ? "…" :
              calendly.isError ? "Manuel" : "Manuel"
            }>
              {calendly.data ? (
                <p className="font-semibold text-sm text-primary">{calendly.data.perWeek}</p>
              ) : editingMetrics ? (
                <Input type="number" value={growthForm.rdv_per_week}
                  onChange={(e) => setGrowthForm({ ...growthForm, rdv_per_week: Number(e.target.value) })}
                  className="h-8 text-sm" />
              ) : (
                <p className="font-semibold text-sm">{growthForm.rdv_per_week}</p>
              )}
            </MetricCell>

            {/* Closing (%) — manuel */}
            <MetricCell label="Closing (%)">
              {editingMetrics ? (
                <Input type="number" value={growthForm.closing_rate}
                  onChange={(e) => setGrowthForm({ ...growthForm, closing_rate: Number(e.target.value) })}
                  className="h-8 text-sm" />
              ) : (
                <p className="font-semibold text-sm">{growthForm.closing_rate}%</p>
              )}
            </MetricCell>

            {/* Clients/semaine — auto */}
            <MetricCell label="Clients/semaine" badge="Auto">
              <p className="font-semibold text-sm text-primary">{growthAuto.clientsPerWeek}</p>
            </MetricCell>
          </div>

          {/* Second row: auto-computed monthly stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-3 border-t border-border/40">
            <MetricCell label="Nouveaux clients / mois" badge="Auto">
              <p className="font-semibold text-sm text-primary">{growthAuto.clientsPerMonth}</p>
            </MetricCell>
            <MetricCell label="Clients actifs" badge="Auto">
              <p className="font-semibold text-sm">{growthAuto.activeNow}</p>
            </MetricCell>
            <MetricCell label="Churn / mois" badge="Auto">
              <p className="font-semibold text-sm">{growthAuto.churnedThisMonth}</p>
            </MetricCell>
            <MetricCell label="Taux de churn" badge="Auto">
              <p className={`font-semibold text-sm ${
                growthAuto.churnRate >= 10 ? "text-destructive" :
                growthAuto.churnRate >= 5  ? "text-amber-400" :
                "text-emerald-400"
              }`}>{growthAuto.churnRate}%</p>
            </MetricCell>
          </div>

          {calendly.isError && (
            <p className="text-[10px] text-amber-400">
              ⚠ Calendly non connecté ou clé invalide. Va dans Réglages pour l'activer.
            </p>
          )}
          {!calendly.data && !calendly.isLoading && !calendly.isError && (
            <p className="text-[10px] text-muted-foreground italic">
              💡 Connecte Calendly dans Réglages pour compter automatiquement tes RDV/semaine.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Expense breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-primary" /> Dépenses Détaillées
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {EXPENSE_CATEGORIES.map(({ key, label }) => {
            const items = expenseItems.filter((i) => i.category === key);
            const total = items.reduce((s, i) => s + i.amount, 0);
            const isOpen = openCategories.has(key);

            return (
              <Collapsible key={key} open={isOpen} onOpenChange={() => toggleCategory(key)}>
                <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 rounded-lg hover:bg-accent/50 transition-colors text-sm">
                  <span className="font-medium">{label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{formatCurrency(total)}</span>
                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="ml-3 mt-1 space-y-1.5 border-l border-border/40 pl-4 pb-2">
                    {items.map((item) => (
                      <div key={item.id} className="flex items-center gap-2 text-sm">
                        <span className="flex-1 text-muted-foreground">{item.label}</span>
                        <span>{formatCurrency(item.amount)}</span>
                        <button onClick={() => deleteExpense.mutate(item.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    {newExpense?.category === key ? (
                      <div className="flex items-center gap-2">
                        <Input
                          placeholder="Label"
                          value={newExpense.label}
                          onChange={(e) => setNewExpense({ ...newExpense, label: e.target.value })}
                          className="h-7 text-xs flex-1"
                        />
                        <Input
                          type="number"
                          placeholder="$"
                          value={newExpense.amount}
                          onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                          className="h-7 text-xs w-24"
                        />
                        <Button
                          size="sm"
                          className="h-7 text-xs px-2"
                          onClick={() => {
                            if (newExpense.label && newExpense.amount) {
                              createExpense.mutate({ category: key, label: newExpense.label, amount: Number(newExpense.amount) });
                              setNewExpense(null);
                            }
                          }}
                        >OK</Button>
                        <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setNewExpense(null)}>✕</Button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setNewExpense({ category: key, label: "", amount: "" })}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                      >
                        <Plus className="w-3 h-3" /> Ajouter un détail
                      </button>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}

          {/* Dépenses extra du mois — saves on blur + Enter */}
          <div className="flex items-center justify-between px-3 py-2.5 mt-2 rounded-lg border border-dashed border-amber-500/30 bg-amber-500/[0.03]">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">Dépenses extra ce mois</p>
              <p className="text-[10px] text-muted-foreground">
                Coûts ponctuels non récurrents. {extraExpenses > 0 ? <span className="text-amber-400">✓ sauvegardé pour ce mois</span> : "Entrée / Tab pour sauvegarder."}
              </p>
            </div>
            <Input
              type="number"
              value={extraExpenses}
              onChange={(e) => setExtraExpenses(Number(e.target.value))}
              onBlur={saveExtraExpenses}
              onKeyDown={(e) => { if (e.key === "Enter") { e.currentTarget.blur(); } }}
              placeholder="0"
              className={`h-8 w-28 text-sm font-bold text-right ${extraExpenses > 0 ? "text-amber-400" : "text-foreground"}`}
            />
          </div>

          <div className="pt-3 border-t border-border/40 space-y-1.5 text-sm">
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Dépenses récurrentes</span>
              <span>{formatCurrency(recurringExpenses)}</span>
            </div>
            {extraExpenses > 0 && (
              <div className="flex items-center justify-between text-amber-400">
                <span>+ Extra ce mois</span>
                <span>{formatCurrency(extraExpenses)}</span>
              </div>
            )}
            <div className="flex items-center justify-between font-semibold pt-1.5 border-t border-border/30">
              <span>Total Dépenses</span>
              <span className="text-destructive">{formatCurrency(totalExpenses)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Goals + Warnings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Objectifs</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">MRR Goal</span>
                <span>{formatCurrency(mrr)} / <Input
                  type="number"
                  value={mrrGoal}
                  onChange={(e) => setMrrGoal(Number(e.target.value))}
                  onBlur={() => updateMetrics.mutate({ mrr_goal: mrrGoal })}
                  className="inline-block w-24 h-5 text-xs p-1"
                /></span>
              </div>
              <Progress value={mrrGoal > 0 ? Math.min(100, (mrr / mrrGoal) * 100) : 0} />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">Objectif Annuel</span>
                <span>{formatCurrency(yearlyProjection)} / <Input
                  type="number"
                  value={yearlyGoal}
                  onChange={(e) => setYearlyGoal(Number(e.target.value))}
                  onBlur={() => updateMetrics.mutate({ yearly_goal: yearlyGoal })}
                  className="inline-block w-24 h-5 text-xs p-1"
                /></span>
              </div>
              <Progress value={yearlyGoal > 0 ? Math.min(100, (yearlyProjection / yearlyGoal) * 100) : 0} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-400" /> Alertes Scaling</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {totalRevenue > 0 && totalExpenses / totalRevenue > 0.6 && (
              <div className="text-destructive text-xs p-2 rounded bg-destructive/10">⚠️ Dépenses &gt;60% des revenus</div>
            )}
            {totalRevenue > 0 && totalExpenses / totalRevenue > 0.4 && totalExpenses / totalRevenue <= 0.6 && (
              <div className="text-amber-400 text-xs p-2 rounded bg-amber-400/10">⚡ Dépenses &gt;40% des revenus</div>
            )}
            {mrrGoal > 0 && mrr < mrrGoal * 0.8 && (
              <div className="text-amber-400 text-xs p-2 rounded bg-amber-400/10">📉 MRR en dessous de 80% de l'objectif</div>
            )}
            {netProfit >= 0 && totalExpenses / totalRevenue <= 0.4 && mrr >= mrrGoal * 0.8 && (
              <div className="text-emerald-400 text-xs p-2 rounded bg-emerald-400/10">✅ Tout va bien — continuez!</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── Editable monthly history card ─────────────────────────────────────────────

function MonthlyHistoryCard({
  history,
  updateForPeriod,
}: {
  history: any[];
  updateForPeriod: (period_start: string, total_revenue: number, monthly_expenses: number) => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [editRevenue, setEditRevenue]   = useState("");
  const [editExpenses, setEditExpenses] = useState("");

  // Build all months of current year up to current month, most recent first
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-12
  // Build date strings manually to avoid UTC/local timezone shifts
  const periodStartFor = (m: number) => `${currentYear}-${String(m).padStart(2, "0")}-01`;
  const currentPeriodStart = periodStartFor(currentMonth);

  const allMonths: { period_start: string; existing: any | null }[] = [];
  for (let m = 1; m <= currentMonth; m++) {
    const period_start = periodStartFor(m);
    const existing = history.find((h: any) => h.period_start === period_start) ?? null;
    allMonths.push({ period_start, existing });
  }
  allMonths.reverse();

  const monthLabel = (iso: string) => {
    const [y, mo] = iso.split("-").map(Number);
    return new Date(y, mo - 1, 1).toLocaleDateString("fr-CA", { month: "long", year: "numeric" });
  };

  const startEdit = (period_start: string, existing: any) => {
    setEditing(period_start);
    setEditRevenue(existing ? String(existing.total_revenue + existing.extra_revenue) : "");
    setEditExpenses(existing ? String(existing.monthly_expenses) : "");
  };
  const cancelEdit = () => { setEditing(null); setEditRevenue(""); setEditExpenses(""); };
  const saveEdit = (period_start: string) => {
    const rev = Number(editRevenue) || 0;
    const exp = Number(editExpenses) || 0;
    updateForPeriod(period_start, rev, exp);
    cancelEdit();
  };
  const applyMargin = (margin: number) => {
    const rev = Number(editRevenue) || 0;
    if (rev > 0) setEditExpenses(String(Math.round(rev * (1 - margin / 100))));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <History className="w-4 h-4 text-primary" /> Historique mensuel {currentYear} (modifiable)
          </span>
          <span className="text-xs text-muted-foreground font-normal">Corrige une valeur si elle est inexacte</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="divide-y divide-border/30">
          {allMonths.map(({ period_start, existing }) => {
            const total    = existing ? (existing.total_revenue + existing.extra_revenue) : 0;
            const expenses = existing ? existing.monthly_expenses : 0;
            const profit   = total - expenses;
            const margin   = total > 0 ? Math.round((profit / total) * 100) : 0;
            const isCurrent  = period_start === currentPeriodStart;
            const isEditing  = editing === period_start;
            const isMissing  = !existing;

            return (
              <div key={period_start} className="py-2.5">
                {/* Row header */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium capitalize text-foreground">{monthLabel(period_start)}</p>
                      {isCurrent && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary font-semibold uppercase tracking-wider">
                          En cours
                        </span>
                      )}
                      {isMissing && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-semibold uppercase tracking-wider">
                          Non rempli
                        </span>
                      )}
                    </div>
                    {!isMissing && !isEditing && (
                      <p className="text-[10px] text-muted-foreground">
                        Dépenses: {formatCurrency(expenses)} · Profit: {formatCurrency(profit)}
                        {total > 0 && <span className={`ml-1 font-semibold ${margin >= 30 ? "text-emerald-400" : margin >= 15 ? "text-amber-400" : "text-destructive"}`}>({margin}%)</span>}
                      </p>
                    )}
                  </div>

                  {!isEditing && (
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold font-mono ${isMissing ? "text-muted-foreground" : "text-foreground"}`}>
                        {isMissing ? "—" : formatCurrency(total)}
                      </span>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-primary"
                        onClick={() => startEdit(period_start, existing)}>
                        <Pencil className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Inline edit form */}
                {isEditing && (
                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Revenu total</label>
                      <Input autoFocus type="number" placeholder="35000"
                        value={editRevenue}
                        onChange={(e) => setEditRevenue(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") saveEdit(period_start); if (e.key === "Escape") cancelEdit(); }}
                        className="h-8 text-sm font-mono" />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold flex items-center justify-between">
                        Dépenses
                        <button onClick={() => applyMargin(30)} className="text-[9px] text-primary hover:underline font-bold normal-case"
                          title="Auto-remplir avec une marge de 30%">
                          Auto 30% marge
                        </button>
                      </label>
                      <Input type="number" placeholder="24500"
                        value={editExpenses}
                        onChange={(e) => setEditExpenses(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") saveEdit(period_start); if (e.key === "Escape") cancelEdit(); }}
                        className="h-8 text-sm font-mono" />
                    </div>
                    <div className="sm:col-span-2 flex items-center gap-2 justify-end">
                      <Button size="sm" variant="ghost" onClick={cancelEdit} className="gap-1.5"><X className="w-3.5 h-3.5"/> Annuler</Button>
                      <Button size="sm" onClick={() => saveEdit(period_start)} className="gap-1.5"><Check className="w-3.5 h-3.5"/> Enregistrer</Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <p className="text-[10px] text-muted-foreground mt-3 italic">
          La projection annuelle utilise ces valeurs. Une correction ici améliore la précision.
        </p>
      </CardContent>
    </Card>
  );
}


function MetricCell({ label, badge, children }: { label: string; badge?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        {badge && (
          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider">
            {badge}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}
