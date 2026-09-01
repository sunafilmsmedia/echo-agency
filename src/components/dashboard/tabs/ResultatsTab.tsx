import { useState, useEffect } from "react";
import { BarChart3, ChevronLeft, ChevronRight, Eye, Video, Megaphone, DollarSign, Users as UsersIcon } from "lucide-react";
import { useClients } from "@/hooks/useClients";
import { useKpiSync } from "@/hooks/useKpiSync";

// ─── Storage read helpers (same layout as KpiTab) ────────────────────────────
interface Row { views?: number | null; videos?: number | null; budget?: number | null; leads?: number | null; }
type MonthMap = Record<string, Row>;

function loadMonth(year: number, month: number): MonthMap {
  try {
    const raw = localStorage.getItem(`kpi_${year}_${String(month).padStart(2, "0")}`);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

const MONTHS_FR = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];

type Range = "current" | "3m" | "6m" | "ytd" | "year";

export function ResultatsTab() {
  useKpiSync(); // makes sure Supabase data is hydrated

  const { data: supabaseClients = [], isLoading } = useClients();
  const now = new Date();
  const [range, setRange]   = useState<Range>("ytd");
  const [year, setYear]     = useState<number>(now.getFullYear());
  const [month, setMonth]   = useState<number>(now.getMonth() + 1); // used when range === "current"

  // Refresh when Supabase hydration completes (event fired by useKpiSync)
  const [, setTick] = useState(0);
  useEffect(() => {
    const refresh = () => setTick((t) => t + 1);
    window.addEventListener("kpi-hydrated", refresh);
    return () => window.removeEventListener("kpi-hydrated", refresh);
  }, []);

  // Which months to iterate depending on the range
  const monthsToScan: { year: number; month: number }[] = (() => {
    if (range === "current") return [{ year, month }];
    if (range === "3m") return Array.from({ length: 3 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      return { year: d.getFullYear(), month: d.getMonth() + 1 };
    });
    if (range === "6m") return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      return { year: d.getFullYear(), month: d.getMonth() + 1 };
    });
    if (range === "ytd") {
      const list: { year: number; month: number }[] = [];
      for (let m = 1; m <= now.getMonth() + 1; m++) list.push({ year: now.getFullYear(), month: m });
      return list;
    }
    // year === specific year, all 12 months
    return Array.from({ length: 12 }, (_, i) => ({ year, month: i + 1 }));
  })();

  // Aggregate per client + grand totals
  const aggregated = (() => {
    const per: Record<string, { views: number; videos: number; budget: number; leads: number; monthsWithData: number }> = {};
    let tViews = 0, tVideos = 0, tBudget = 0, tLeads = 0;
    const clientsWithAny = new Set<string>();

    for (const { year: y, month: m } of monthsToScan) {
      const monthData = loadMonth(y, m);
      for (const [clientId, row] of Object.entries(monthData)) {
        per[clientId] ??= { views: 0, videos: 0, budget: 0, leads: 0, monthsWithData: 0 };
        let hasAny = false;
        if (typeof row.views  === "number") { per[clientId].views  += row.views;  tViews  += row.views;  hasAny = true; }
        if (typeof row.videos === "number") { per[clientId].videos += row.videos; tVideos += row.videos; hasAny = true; }
        if (typeof row.budget === "number") { per[clientId].budget += row.budget; tBudget += row.budget; hasAny = true; }
        if (typeof row.leads  === "number") { per[clientId].leads  += row.leads;  tLeads  += row.leads;  hasAny = true; }
        if (hasAny) { per[clientId].monthsWithData++; clientsWithAny.add(clientId); }
      }
    }

    const rows = Object.entries(per).map(([clientId, r]) => {
      const client = supabaseClients.find((c) => c.id === clientId);
      return {
        clientId,
        name: client?.name ?? "Client inconnu",
        industry: client?.industry ?? null,
        status: client?.status ?? null,
        ...r,
        cpl: r.leads > 0 ? r.budget / r.leads : null,
      };
    })
    .filter((r) => r.views > 0 || r.videos > 0 || r.budget > 0 || r.leads > 0)
    .sort((a, b) => (b.views + b.leads * 1000) - (a.views + a.leads * 1000));

    return {
      rows,
      totals: {
        views: tViews, videos: tVideos, budget: tBudget, leads: tLeads,
        activeClients: clientsWithAny.size,
        cpl: tLeads > 0 ? tBudget / tLeads : null,
      },
    };
  })();

  const fmtN  = (n: number) => n.toLocaleString("fr-CA");
  const fmt$  = (n: number) => `${n.toLocaleString("fr-CA", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} $`;
  const fmt$2 = (n: number | null) => n === null ? "—" : `${n.toLocaleString("fr-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $`;

  const rangeLabel = (() => {
    if (range === "current") return `${MONTHS_FR[month - 1]} ${year}`;
    if (range === "3m")      return `3 derniers mois`;
    if (range === "6m")      return `6 derniers mois`;
    if (range === "ytd")     return `Année en cours (${now.getFullYear()}, ${now.getMonth() + 1} mois)`;
    return `Année ${year}`;
  })();

  const maxViews = Math.max(1, ...aggregated.rows.map((r) => r.views));
  const maxLeads = Math.max(1, ...aggregated.rows.map((r) => r.leads));

  // CPL tier color — matches the SFM monthly report legend
  const cplTier = (cpl: number | null) => {
    if (cpl === null) return { color: "text-muted-foreground", dot: "bg-muted-foreground" };
    if (cpl <= 25) return { color: "text-emerald-400", dot: "bg-emerald-500" };
    if (cpl <= 45) return { color: "text-primary",     dot: "bg-primary" };
    if (cpl <= 70) return { color: "text-amber-400",   dot: "bg-amber-500" };
    return              { color: "text-destructive",  dot: "bg-destructive" };
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-5 h-5 text-primary" />
          <div>
            <h2 className="text-xl font-semibold text-foreground">Résultats</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Vue consolidée par client — vues, vidéos, budget Meta et leads</p>
          </div>
        </div>

        {/* Range switcher */}
        <div className="flex items-center gap-1 rounded-lg border border-border/40 p-0.5">
          {[
            { id: "current", label: "1 mois" },
            { id: "3m",      label: "3 mois" },
            { id: "6m",      label: "6 mois" },
            { id: "ytd",     label: "YTD" },
            { id: "year",    label: "Année" },
          ].map((opt) => (
            <button key={opt.id} onClick={() => setRange(opt.id as Range)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                range === opt.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Month/Year picker when range === current or year */}
      {(range === "current" || range === "year") && (
        <div className="flex items-center gap-2">
          <button onClick={() => {
            if (range === "current") {
              const d = new Date(year, month - 2, 1);
              setYear(d.getFullYear()); setMonth(d.getMonth() + 1);
            } else setYear(year - 1);
          }} className="p-1.5 rounded-lg border border-border/50 hover:bg-accent">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold text-foreground min-w-[180px] text-center">
            {range === "current" ? `${MONTHS_FR[month - 1]} ${year}` : `${year}`}
          </span>
          <button onClick={() => {
            if (range === "current") {
              const d = new Date(year, month, 1);
              setYear(d.getFullYear()); setMonth(d.getMonth() + 1);
            } else setYear(year + 1);
          }} className="p-1.5 rounded-lg border border-border/50 hover:bg-accent">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Hero totals card */}
      <div
        className="relative rounded-2xl border-2 border-primary/40 bg-primary/[0.04] p-6 overflow-hidden"
        style={{ boxShadow: "0 0 80px -20px rgba(147,51,234,0.35)" }}
      >
        <div aria-hidden className="absolute -top-10 -right-10 w-48 h-48 rounded-full pointer-events-none"
             style={{ background: "radial-gradient(circle, rgba(147,51,234,0.35), transparent 65%)", filter: "blur(30px)" }} />
        <div className="relative space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">
                📊 Total portefeuille · {rangeLabel}
              </p>
              <p className="text-sm text-muted-foreground">
                {aggregated.totals.activeClients} client{aggregated.totals.activeClients > 1 ? "s" : ""} avec données · {aggregated.rows.length} lignes agrégées
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <BigTile icon={<Eye />}       label="Vues totales"     value={fmtN(aggregated.totals.views)}  accent="primary" />
            <BigTile icon={<Video />}     label="Vidéos 20k+"      value={fmtN(aggregated.totals.videos)} accent="primary" />
            <BigTile icon={<DollarSign/>} label="Budget dépensé"   value={fmt$(aggregated.totals.budget)} accent="destructive" />
            <BigTile icon={<Megaphone/>}  label="Leads générés"    value={fmtN(aggregated.totals.leads)}  accent="emerald" />
            <BigTile icon={<UsersIcon/>}  label="CPL moyen"        value={fmt$2(aggregated.totals.cpl)}   accent="primary" hint="Budget ÷ leads" />
          </div>
        </div>
      </div>

      {/* Per-client table */}
      <div className="rounded-2xl border border-border/40 bg-card overflow-hidden">
        <div className="px-6 py-4 border-b border-border/40 flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">Détail par client</p>
          <p className="text-[11px] text-muted-foreground">Trié par volume (vues + leads)</p>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Chargement des clients…</div>
        ) : aggregated.rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            Aucune donnée sur cette période. Vérifie l'import KPI ou change la plage.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/20 text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-6 py-3 font-semibold">Client</th>
                  <th className="text-right px-3 py-3 font-semibold">Vues</th>
                  <th className="text-right px-3 py-3 font-semibold">Vidéos 20k+</th>
                  <th className="text-right px-3 py-3 font-semibold">Budget</th>
                  <th className="text-right px-3 py-3 font-semibold">Leads</th>
                  <th className="text-right px-6 py-3 font-semibold">CPL</th>
                </tr>
              </thead>
              <tbody>
                {aggregated.rows.map((r) => {
                  const tier = cplTier(r.cpl);
                  const vw   = (r.views / maxViews) * 100;
                  const lw   = (r.leads / maxLeads) * 100;
                  return (
                    <tr key={r.clientId} className="border-t border-border/30 hover:bg-muted/10 transition-colors">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`w-1.5 h-1.5 rounded-full ${tier.dot}`} />
                          <div>
                            <p className="text-sm font-medium text-foreground">{r.name}</p>
                            {r.industry && <p className="text-[10px] text-muted-foreground">{r.industry}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-muted/30 overflow-hidden">
                            <div className="h-full bg-primary/60 rounded-full" style={{ width: `${vw}%` }} />
                          </div>
                          <span className="tabular-nums text-foreground min-w-[70px] text-right">{r.views > 0 ? fmtN(r.views) : "—"}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-foreground">
                        {r.videos > 0 ? r.videos : "—"}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">
                        {r.budget > 0 ? fmt$(r.budget) : "—"}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-muted/30 overflow-hidden">
                            <div className="h-full bg-emerald-500/60 rounded-full" style={{ width: `${lw}%` }} />
                          </div>
                          <span className="tabular-nums text-foreground min-w-[40px] text-right">{r.leads > 0 ? fmtN(r.leads) : "—"}</span>
                        </div>
                      </td>
                      <td className={`px-6 py-3 text-right font-semibold tabular-nums ${tier.color}`}>
                        {fmt$2(r.cpl)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-muted/10">
                <tr className="border-t-2 border-border/60">
                  <td className="px-6 py-3 text-sm font-bold text-foreground">Total portefeuille</td>
                  <td className="px-3 py-3 text-right font-bold text-foreground tabular-nums">{fmtN(aggregated.totals.views)}</td>
                  <td className="px-3 py-3 text-right font-bold text-foreground tabular-nums">{fmtN(aggregated.totals.videos)}</td>
                  <td className="px-3 py-3 text-right font-bold text-destructive tabular-nums">{fmt$(aggregated.totals.budget)}</td>
                  <td className="px-3 py-3 text-right font-bold text-emerald-400 tabular-nums">{fmtN(aggregated.totals.leads)}</td>
                  <td className="px-6 py-3 text-right font-bold text-primary tabular-nums">{fmt$2(aggregated.totals.cpl)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* CPL tier legend */}
      <div className="flex items-center gap-4 text-[11px] text-muted-foreground flex-wrap">
        <span>CPL :</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" />Excellent (&lt;25 $)</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-primary" />Bon (25-45 $)</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" />À surveiller (45-70 $)</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-destructive" />Problématique (&gt;70 $)</span>
      </div>
    </div>
  );
}

// ── Big tile helper (hero card) ─────────────────────────────────────────────
function BigTile({ icon, label, value, accent, hint }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: "primary" | "emerald" | "destructive";
  hint?: string;
}) {
  const color = accent === "emerald"
    ? "text-emerald-400"
    : accent === "destructive"
    ? "text-destructive"
    : "text-primary";
  const iconBg = accent === "emerald"
    ? "bg-emerald-500/10 border-emerald-500/25"
    : accent === "destructive"
    ? "bg-destructive/10 border-destructive/25"
    : "bg-primary/10 border-primary/25";
  return (
    <div className="rounded-xl border border-border/40 bg-background/40 p-4 space-y-2">
      <div className="flex items-center gap-2">
        <div className={`w-6 h-6 rounded-md border flex items-center justify-center ${iconBg}`}>
          <span className={`w-3.5 h-3.5 ${color}`}>{icon}</span>
        </div>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
      </div>
      <p className={`text-2xl font-bold tracking-tight tabular-nums ${color}`}>{value}</p>
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
