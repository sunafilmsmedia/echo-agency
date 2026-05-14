import { useState } from "react";
import { ChevronLeft, ChevronRight, Trophy, Eye, Video, DollarSign } from "lucide-react";
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
const MONTHS_SHORT = ["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];
const QUARTERS = [[1,2,3],[4,5,6],[7,8,9],[10,11,12]];

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

function clientMonthTotal(vb: number, vid: number) {
  return Math.min(vb + vid, PER_CLIENT_CAP);
}

// ── localStorage helpers ──────────────────────────────────────────────────────

interface ClientRow { views?: number | null; videos?: number | null; }
interface MonthData { [clientId: string]: ClientRow; }

function storageKey(year: number, month: number) {
  return `kpi_${year}_${String(month).padStart(2,"0")}`;
}
function loadMonth(year: number, month: number): MonthData {
  try { const r = localStorage.getItem(storageKey(year,month)); return r ? JSON.parse(r) : {}; }
  catch { return {}; }
}
function saveMonth(year: number, month: number, data: MonthData) {
  localStorage.setItem(storageKey(year,month), JSON.stringify(data));
}

// ── Tier badges ───────────────────────────────────────────────────────────────

function ViewsBadge({ actual, baseline }: { actual: number | null; baseline: number }) {
  if (actual === null) return <span className="text-[10px] text-muted-foreground/40">—</span>;
  if (actual >= baseline * 1.6) return <span className="text-[10px] font-semibold text-emerald-400">+60% · $40</span>;
  if (actual >= baseline * 1.3) return <span className="text-[10px] font-semibold text-primary">+30% · $25</span>;
  return <span className="text-[10px] text-muted-foreground">baseline</span>;
}

function VideosBadge({ actual, baseline }: { actual: number | null; baseline: number }) {
  if (actual === null) return <span className="text-[10px] text-muted-foreground/40">—</span>;
  const diff = actual - baseline;
  if (diff >= 3) return <span className="text-[10px] font-semibold text-emerald-400">+3 · $40</span>;
  if (diff >= 2) return <span className="text-[10px] font-semibold text-amber-400">+2 · $25</span>;
  if (diff >= 1) return <span className="text-[10px] font-semibold text-primary">+1 · $15</span>;
  return <span className="text-[10px] text-muted-foreground">baseline</span>;
}

// ── Main component ────────────────────────────────────────────────────────────

export function KpiTab() {
  const now = new Date();
  const currentQ = Math.floor((now.getMonth()) / 3); // 0-3
  const [year, setYear]       = useState(now.getFullYear());
  const [quarter, setQuarter] = useState(currentQ); // 0-3

  // monthData[0|1|2] = MonthData for that quarter month
  const qMonths = QUARTERS[quarter]; // e.g. [4,5,6]

  const [monthData, setMonthData] = useState<[MonthData, MonthData, MonthData]>(() => [
    loadMonth(year, qMonths[0]),
    loadMonth(year, qMonths[1]),
    loadMonth(year, qMonths[2]),
  ]);

  const navigateQuarter = (delta: number) => {
    let q = quarter + delta;
    let y = year;
    if (q > 3) { q = 0; y++; }
    if (q < 0) { q = 3; y--; }
    const ms = QUARTERS[q];
    setQuarter(q);
    setYear(y);
    setMonthData([loadMonth(y, ms[0]), loadMonth(y, ms[1]), loadMonth(y, ms[2])]);
  };

  const updateField = (mIdx: 0|1|2, clientId: string, field: "views"|"videos", raw: string) => {
    const val = raw === "" ? null : parseInt(raw.replace(/\s/g,""), 10);
    const prev = monthData[mIdx][clientId] ?? {};
    const next: MonthData = { ...monthData[mIdx], [clientId]: { ...prev, [field]: isNaN(val as number) ? null : val } };
    const updated: [MonthData,MonthData,MonthData] = [...monthData] as [MonthData,MonthData,MonthData];
    updated[mIdx] = next;
    setMonthData(updated);
    saveMonth(year, qMonths[mIdx], next);
  };

  // Per-month totals across all clients
  const monthTotals = [0,1,2].map(mi =>
    CLIENTS.reduce((sum, c) => {
      const row: ClientRow = monthData[mi][c.id] ?? {};
      const vb  = calcViewsBonus(row.views ?? null, c.baselineViews);
      const vid = calcVideosBonus(row.videos ?? null, c.baselineVideos);
      return sum + clientMonthTotal(vb, vid);
    }, 0)
  );
  const quarterTotal = monthTotals.reduce((a,b) => a+b, 0);

  const fmt = (n: number) => n.toLocaleString("fr-CA");

  return (
    <div className="p-6 space-y-5 max-w-6xl mx-auto">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" /> KPI — Sandra
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">Bonus calculés sur 3 mois · payables au trimestre</p>
        </div>

        {/* Quarter nav */}
        <div className="flex items-center gap-2">
          <button onClick={() => navigateQuarter(-1)}
            className="p-1.5 rounded-lg border border-border/50 hover:bg-accent transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="text-center w-52">
            <p className="text-sm font-bold text-foreground">Q{quarter+1} {year}</p>
            <p className="text-[11px] text-muted-foreground">
              {MONTHS_FR[qMonths[0]-1]} · {MONTHS_FR[qMonths[1]-1]} · {MONTHS_FR[qMonths[2]-1]}
            </p>
          </div>
          <button onClick={() => navigateQuarter(1)}
            className="p-1.5 rounded-lg border border-border/50 hover:bg-accent transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Quarter summary bar ── */}
      <div className="grid grid-cols-4 gap-3">
        {[0,1,2].map(mi => (
          <div key={mi} className="rounded-xl border border-border/40 bg-muted/20 p-4 space-y-0.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {MONTHS_FR[qMonths[mi]-1]}
            </p>
            <p className="text-2xl font-bold text-foreground">${monthTotals[mi]}</p>
          </div>
        ))}
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-0.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-400">Total payable</p>
          <p className="text-2xl font-bold text-amber-400">${quarterTotal}</p>
          <p className="text-[10px] text-muted-foreground">Q{quarter+1} {year}</p>
        </div>
      </div>

      {/* ── Client cards ── */}
      <div className="space-y-3">
        {/* Column headers */}
        <div className="grid grid-cols-[180px_1fr_1fr_1fr_80px] gap-3 px-4 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          <span>Client</span>
          {[0,1,2].map(mi => (
            <span key={mi} className="text-center">{MONTHS_FR[qMonths[mi]-1]}</span>
          ))}
          <span className="text-center">Total Q</span>
        </div>

        {CLIENTS.map((client) => {
          // Compute per-month bonuses for this client
          const months = [0,1,2].map(mi => {
            const row: ClientRow = monthData[mi][client.id] ?? {};
            const views  = row.views  ?? null;
            const videos = row.videos ?? null;
            const vb  = calcViewsBonus(views, client.baselineViews);
            const vid = calcVideosBonus(videos, client.baselineVideos);
            const tot = clientMonthTotal(vb, vid);
            return { views, videos, vb, vid, tot, capped: (vb+vid) > PER_CLIENT_CAP };
          });
          const clientQuarterTotal = months.reduce((s, m) => s + m.tot, 0);

          return (
            <div key={client.id} className="rounded-xl border border-border/40 bg-card overflow-hidden hover:border-border/70 transition-colors">
              <div className="grid grid-cols-[180px_1fr_1fr_1fr_80px] gap-3 p-3 items-start">

                {/* Client name */}
                <div className="pt-1">
                  <p className="text-sm font-semibold text-foreground leading-tight">{client.name}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {fmt(client.baselineViews)} vues base
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {client.baselineVideos} vidéos 20k+ base
                  </p>
                </div>

                {/* Month columns */}
                {months.map((m, mi) => (
                  <div key={mi} className="space-y-2">
                    {/* Views input */}
                    <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Eye className="w-3 h-3"/> Vues
                      </label>
                      <Input
                        type="number"
                        placeholder={fmt(client.baselineViews)}
                        value={m.views ?? ""}
                        onChange={e => updateField(mi as 0|1|2, client.id, "views", e.target.value)}
                        className="h-7 text-xs"
                      />
                      <ViewsBadge actual={m.views} baseline={client.baselineViews} />
                    </div>
                    {/* Videos input */}
                    <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Video className="w-3 h-3"/> Vidéos 20k+
                      </label>
                      <Input
                        type="number"
                        placeholder={String(client.baselineVideos)}
                        value={m.videos ?? ""}
                        onChange={e => updateField(mi as 0|1|2, client.id, "videos", e.target.value)}
                        className="h-7 text-xs"
                      />
                      <VideosBadge actual={m.videos} baseline={client.baselineVideos} />
                    </div>
                    {/* Month bonus */}
                    <div className={`text-center rounded-lg py-1.5 ${m.tot > 0 ? "bg-primary/8 border border-primary/20" : "bg-muted/30"}`}>
                      <p className={`text-sm font-bold ${m.tot > 0 ? "text-primary" : "text-muted-foreground"}`}>
                        ${m.tot}
                      </p>
                      {m.capped && <p className="text-[9px] text-amber-400">plafonné</p>}
                    </div>
                  </div>
                ))}

                {/* Quarter total for this client */}
                <div className="flex items-center justify-center">
                  <div className={`rounded-xl px-3 py-2 text-center ${clientQuarterTotal > 0 ? "bg-amber-500/10 border border-amber-500/20" : "bg-muted/20"}`}>
                    <p className="text-[10px] text-muted-foreground mb-0.5">3 mois</p>
                    <p className={`text-lg font-bold ${clientQuarterTotal > 0 ? "text-amber-400" : "text-muted-foreground"}`}>
                      ${clientQuarterTotal}
                    </p>
                  </div>
                </div>

              </div>
            </div>
          );
        })}
      </div>

      {/* ── Footer total row ── */}
      <div className="grid grid-cols-4 gap-3 pt-2 border-t border-border/40">
        {[0,1,2].map(mi => (
          <div key={mi} className="text-center">
            <p className="text-[10px] text-muted-foreground">{MONTHS_SHORT[qMonths[mi]-1]}</p>
            <p className="text-base font-bold text-foreground">${monthTotals[mi]}</p>
          </div>
        ))}
        <div className="text-center rounded-xl bg-amber-500/10 border border-amber-500/20 py-2">
          <p className="text-[10px] text-amber-400 font-semibold">PAYABLE</p>
          <p className="text-xl font-bold text-amber-400">${quarterTotal}</p>
        </div>
      </div>

      {/* ── Legend ── */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="rounded-xl border border-border/40 bg-muted/20 p-3 space-y-1.5">
          <p className="font-semibold text-foreground flex items-center gap-1.5"><Eye className="w-3.5 h-3.5"/> Bonus Vues</p>
          <p className="text-muted-foreground"><span className="text-primary font-medium">+30% baseline</span> = $25 &nbsp;·&nbsp; <span className="text-emerald-400 font-medium">+60%</span> = $40</p>
        </div>
        <div className="rounded-xl border border-border/40 bg-muted/20 p-3 space-y-1.5">
          <p className="font-semibold text-foreground flex items-center gap-1.5"><Video className="w-3.5 h-3.5"/> Bonus Vidéos 20k+</p>
          <p className="text-muted-foreground"><span className="text-primary font-medium">+1</span> = $15 &nbsp;·&nbsp; <span className="text-amber-400 font-medium">+2</span> = $25 &nbsp;·&nbsp; <span className="text-emerald-400 font-medium">+3</span> = $40</p>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground text-center">
        Max par client : $80 / mois · Max total : $960 / mois · Suna Films Media Inc.
      </p>
    </div>
  );
}
