import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Trophy, TrendingUp, DollarSign, Eye, Video, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ── Client baselines ──────────────────────────────────────────────────────────

interface Client {
  id: string;
  name: string;
  baselineViews: number;
  baselineVideos: number;
}

const CLIENTS: Client[] = [
  { id: "claudia",   name: "Claudia Ménard",          baselineViews: 77_275,    baselineVideos: 0 },
  { id: "emmanuel",  name: "Emmanuel Bouchard",        baselineViews: 98_350,    baselineVideos: 0 },
  { id: "felix",     name: "Félix & Kellie",           baselineViews: 379_800,   baselineVideos: 2 },
  { id: "jf",        name: "Jean-François Alexandre",  baselineViews: 57_400,    baselineVideos: 0 },
  { id: "justin",    name: "Justin Legault",           baselineViews: 190_100,   baselineVideos: 1 },
  { id: "don",       name: "Don de l'auto",            baselineViews: 2_098_740, baselineVideos: 9 },
  { id: "manuel",    name: "Manuel Ramos",             baselineViews: 101_440,   baselineVideos: 0 },
  { id: "mario",     name: "Mario Bisson",             baselineViews: 98_900,    baselineVideos: 0 },
  { id: "martin",    name: "Martin Ross",              baselineViews: 177_860,   baselineVideos: 0 },
  { id: "philippe",  name: "Philippe Laroche",         baselineViews: 80_600,    baselineVideos: 0 },
  { id: "roux",      name: "Roux & Bachand",           baselineViews: 279_580,   baselineVideos: 1 },
  { id: "sylvain",   name: "Sylvain Danis",            baselineViews: 187_080,   baselineVideos: 2 },
];

const PER_CLIENT_CAP = 80;
const MONTHS_FR = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];

// ── Bonus logic ───────────────────────────────────────────────────────────────

function calcViewsBonus(actual: number | null, baseline: number): number {
  if (actual === null) return 0;
  if (actual >= baseline * 1.6) return 40;
  if (actual >= baseline * 1.3) return 25;
  return 0;
}

function calcVideosBonus(actual: number | null, baseline: number): number {
  if (actual === null) return 0;
  const diff = actual - baseline;
  if (diff >= 3) return 40;
  if (diff >= 2) return 25;
  if (diff >= 1) return 15;
  return 0;
}

function clientTotal(viewsBonus: number, videosBonus: number) {
  return Math.min(viewsBonus + videosBonus, PER_CLIENT_CAP);
}

// ── localStorage helpers ──────────────────────────────────────────────────────

interface ClientRow {
  views?: number | null;
  videos?: number | null;
}

interface MonthData {
  [clientId: string]: ClientRow;
}

function storageKey(year: number, month: number) {
  return `kpi_${year}_${String(month).padStart(2,"0")}`;
}

function loadMonth(year: number, month: number): MonthData {
  try {
    const raw = localStorage.getItem(storageKey(year, month));
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveMonth(year: number, month: number, data: MonthData) {
  localStorage.setItem(storageKey(year, month), JSON.stringify(data));
}

function monthTotal(data: MonthData): number {
  return CLIENTS.reduce((sum, c) => {
    const row: ClientRow = data[c.id] ?? {};
    const vb = calcViewsBonus(row.views ?? null, c.baselineViews);
    const vid = calcVideosBonus(row.videos ?? null, c.baselineVideos);
    return sum + clientTotal(vb, vid);
  }, 0);
}

// ── Tier badge ────────────────────────────────────────────────────────────────

function ViewsBadge({ actual, baseline }: { actual: number | null; baseline: number }) {
  if (actual === null) return <span className="text-muted-foreground text-xs">—</span>;
  if (actual >= baseline * 1.6) return <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">+60% · $40</span>;
  if (actual >= baseline * 1.3) return <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/15 text-primary">+30% · $25</span>;
  return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted/50 text-muted-foreground">Baseline</span>;
}

function VideosBadge({ actual, baseline }: { actual: number | null; baseline: number }) {
  if (actual === null) return <span className="text-muted-foreground text-xs">—</span>;
  const diff = actual - baseline;
  if (diff >= 3) return <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">+3 · $40</span>;
  if (diff >= 2) return <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400">+2 · $25</span>;
  if (diff >= 1) return <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/15 text-primary">+1 · $15</span>;
  return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted/50 text-muted-foreground">Baseline</span>;
}

// ── Main component ────────────────────────────────────────────────────────────

export function KpiTab() {
  const now = new Date();
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-12
  const [data, setData]   = useState<MonthData>(() => loadMonth(now.getFullYear(), now.getMonth() + 1));

  const navigateMonth = (delta: number) => {
    let m = month + delta;
    let y = year;
    if (m > 12) { m = 1; y++; }
    if (m < 1)  { m = 12; y--; }
    setMonth(m);
    setYear(y);
    setData(loadMonth(y, m));
  };

  const updateField = (clientId: string, field: "views" | "videos", raw: string) => {
    const val = raw === "" ? null : parseInt(raw.replace(/\s/g, ""), 10);
    const prev = data[clientId] ?? {};
    const next: MonthData = {
      ...data,
      [clientId]: { ...prev, [field]: isNaN(val as number) ? null : val },
    };
    setData(next);
    saveMonth(year, month, next);
  };

  // Quarterly totals: current month + 2 previous months
  const quarterMonths = useMemo(() => {
    const result: { year: number; month: number; label: string; total: number }[] = [];
    for (let i = 2; i >= 0; i--) {
      let m = month - i;
      let y = year;
      if (m < 1) { m += 12; y--; }
      const d = loadMonth(y, m);
      result.push({ year: y, month: m, label: `${MONTHS_FR[m-1]} ${y}`, total: monthTotal(d) });
    }
    return result;
  }, [year, month, data]);

  const quarterTotal = quarterMonths.reduce((s, m) => s + m.total, 0);
  const currentMonthTotal = monthTotal(data);

  const fmt = (n: number) => n.toLocaleString("fr-CA");

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" /> KPI — Sandra
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">Calcul automatique des bonus mensuels · payables aux 3 mois</p>
        </div>
        {/* Month nav */}
        <div className="flex items-center gap-2">
          <button onClick={() => navigateMonth(-1)}
            className="p-1.5 rounded-lg border border-border/50 hover:bg-accent transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold text-foreground w-36 text-center">
            {MONTHS_FR[month-1]} {year}
          </span>
          <button onClick={() => navigateMonth(1)}
            className="p-1.5 rounded-lg border border-border/50 hover:bg-accent transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Quarter summary cards ── */}
      <div className="grid grid-cols-4 gap-3">
        {quarterMonths.map((qm, i) => (
          <div key={i} className={`rounded-xl border p-4 space-y-1 ${i === 2 ? "border-primary/30 bg-primary/5" : "border-border/40 bg-muted/20"}`}>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{qm.label}</p>
            <p className={`text-2xl font-bold ${i === 2 ? "text-primary" : "text-foreground"}`}>
              ${qm.total}
            </p>
            {i === 2 && <p className="text-[10px] text-muted-foreground">mois actuel</p>}
          </div>
        ))}
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-400">Total payable</p>
          <p className="text-2xl font-bold text-amber-400">${quarterTotal}</p>
          <p className="text-[10px] text-muted-foreground">cumul 3 mois</p>
        </div>
      </div>

      {/* ── KPI Table ── */}
      <div className="rounded-xl border border-border/40 overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[200px_1fr_80px_1fr_80px_80px] gap-3 px-4 py-2.5 bg-muted/40 border-b border-border/40 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          <span>Client</span>
          <span className="flex items-center gap-1"><Eye className="w-3 h-3"/> Vues réelles</span>
          <span>Bonus vues</span>
          <span className="flex items-center gap-1"><Video className="w-3 h-3"/> Vidéos 20k+</span>
          <span>Bonus vid.</span>
          <span className="flex items-center gap-1"><DollarSign className="w-3 h-3"/> Total</span>
        </div>

        {/* Rows */}
        <div className="divide-y divide-border/30">
          {CLIENTS.map((client) => {
            const row: ClientRow = data[client.id] ?? {};
            const views = row.views ?? null;
            const videos = row.videos ?? null;
            const vb  = calcViewsBonus(views, client.baselineViews);
            const vid = calcVideosBonus(videos, client.baselineVideos);
            const tot = clientTotal(vb, vid);
            const isCapped = (vb + vid) > PER_CLIENT_CAP;

            return (
              <div key={client.id}
                className="grid grid-cols-[200px_1fr_80px_1fr_80px_80px] gap-3 px-4 py-3 items-center hover:bg-muted/10 transition-colors">
                {/* Name */}
                <div>
                  <p className="text-sm font-medium text-foreground truncate">{client.name}</p>
                  <p className="text-[10px] text-muted-foreground">{fmt(client.baselineViews)} base · {client.baselineVideos} vid.</p>
                </div>

                {/* Views input */}
                <div className="flex flex-col gap-1">
                  <Input
                    type="number"
                    placeholder={fmt(client.baselineViews)}
                    value={views ?? ""}
                    onChange={e => updateField(client.id, "views", e.target.value)}
                    className="h-8 text-sm"
                  />
                  <ViewsBadge actual={views} baseline={client.baselineViews} />
                </div>

                {/* Views bonus */}
                <div className="text-center">
                  <span className={`text-sm font-semibold ${vb > 0 ? "text-emerald-400" : "text-muted-foreground"}`}>
                    {vb > 0 ? `$${vb}` : "—"}
                  </span>
                </div>

                {/* Videos input */}
                <div className="flex flex-col gap-1">
                  <Input
                    type="number"
                    placeholder={String(client.baselineVideos)}
                    value={videos ?? ""}
                    onChange={e => updateField(client.id, "videos", e.target.value)}
                    className="h-8 text-sm"
                  />
                  <VideosBadge actual={videos} baseline={client.baselineVideos} />
                </div>

                {/* Videos bonus */}
                <div className="text-center">
                  <span className={`text-sm font-semibold ${vid > 0 ? "text-emerald-400" : "text-muted-foreground"}`}>
                    {vid > 0 ? `$${vid}` : "—"}
                  </span>
                </div>

                {/* Client total */}
                <div className="text-center">
                  {tot > 0 ? (
                    <div>
                      <span className="text-sm font-bold text-foreground">${tot}</span>
                      {isCapped && (
                        <span className="block text-[9px] text-amber-400 font-medium">plafonné</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">$0</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Table footer total */}
        <div className="grid grid-cols-[200px_1fr_80px_1fr_80px_80px] gap-3 px-4 py-3 bg-muted/40 border-t border-border/40">
          <span className="text-sm font-semibold text-foreground">Total du mois</span>
          <span />
          <span />
          <span />
          <span />
          <span className="text-center text-sm font-bold text-primary">${currentMonthTotal}</span>
        </div>
      </div>

      {/* ── Legend ── */}
      <div className="grid grid-cols-2 gap-4 text-xs">
        <div className="rounded-xl border border-border/40 bg-muted/20 p-4 space-y-2">
          <p className="font-semibold text-foreground flex items-center gap-1.5"><Eye className="w-3.5 h-3.5"/> Bonus Vues</p>
          <div className="space-y-1 text-muted-foreground">
            <p><span className="text-primary font-medium">+30%</span> de la baseline = <span className="font-medium text-foreground">$25</span></p>
            <p><span className="text-emerald-400 font-medium">+60%</span> de la baseline = <span className="font-medium text-foreground">$40</span></p>
          </div>
        </div>
        <div className="rounded-xl border border-border/40 bg-muted/20 p-4 space-y-2">
          <p className="font-semibold text-foreground flex items-center gap-1.5"><Video className="w-3.5 h-3.5"/> Bonus Vidéos 20k+</p>
          <div className="space-y-1 text-muted-foreground">
            <p><span className="text-primary font-medium">+1 vidéo</span> = <span className="font-medium text-foreground">$15</span></p>
            <p><span className="text-amber-400 font-medium">+2 vidéos</span> = <span className="font-medium text-foreground">$25</span></p>
            <p><span className="text-emerald-400 font-medium">+3 vidéos</span> = <span className="font-medium text-foreground">$40</span></p>
          </div>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground text-center">
        Maximum par client : $80 / mois · Maximum total : $960 / mois · Payable aux 3 mois · Suna Films Media Inc.
      </p>
    </div>
  );
}
