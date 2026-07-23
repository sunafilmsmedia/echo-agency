import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Trophy, Eye, Video, ArrowLeft, Plus, ChevronDown, X, Check, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useClients } from "@/hooks/useClients";

// ── Employees ─────────────────────────────────────────────────────────────────

interface Employee {
  id: string;
  name: string;
  role: string;
  initials: string;
}

const EMPLOYEES: Employee[] = [
  { id: "sandra", name: "Sandra", role: "Gestionnaire de contenu", initials: "S" },
];

// ── Bonus logic ───────────────────────────────────────────────────────────────

const PER_CLIENT_CAP = 80;
const MONTHS_FR    = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
const MONTHS_SHORT = ["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];
const QUARTERS     = [[1,2,3],[4,5,6],[7,8,9],[10,11,12]];

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

// ── localStorage: KPI client config (baselines) ───────────────────────────────

interface KpiClientConfig {
  [supabaseClientId: string]: { baselineViews: number; baselineVideos: number };
}

function loadKpiConfig(): KpiClientConfig {
  try { return JSON.parse(localStorage.getItem("kpi_client_config") || "{}"); }
  catch { return {}; }
}
function saveKpiConfig(config: KpiClientConfig) {
  localStorage.setItem("kpi_client_config", JSON.stringify(config));
}

// ── localStorage: monthly results ────────────────────────────────────────────

interface ClientRow  { views?: number | null; videos?: number | null; }
interface MonthData  { [clientId: string]: ClientRow; }

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

// ── Dynamic baseline: previous quarter's average ─────────────────────────────
// Each new quarter, the baseline used to compute bonuses = average of the
// previous quarter's actuals for that client. Q4 2025 → Q1 2026, Q1 → Q2, etc.
// Falls back to the manually-configured baseline when no previous data exists.

function previousQuarter(year: number, q: number): { year: number; quarter: number } {
  if (q === 0) return { year: year - 1, quarter: 3 };
  return { year, quarter: q - 1 };
}

function averageForClientInQuarter(
  clientId: string,
  year: number,
  q: number,
  field: "views" | "videos",
): number | null {
  const months = QUARTERS[q];
  const values = months
    .map((m) => loadMonth(year, m)[clientId]?.[field])
    .filter((v): v is number => typeof v === "number" && !isNaN(v));
  if (values.length === 0) return null;
  return Math.round(values.reduce((s, v) => s + v, 0) / values.length);
}

interface DynamicBaseline { value: number; source: string; isManual: boolean; }

function dynamicBaseline(
  clientId: string,
  year: number,
  currentQ: number,
  field: "views" | "videos",
  manualBaseline: number,
): DynamicBaseline {
  const { year: py, quarter: pq } = previousQuarter(year, currentQ);
  const avg = averageForClientInQuarter(clientId, py, pq, field);
  if (avg !== null) {
    return { value: avg, source: `moy. Q${pq + 1} ${py}`, isManual: false };
  }
  return { value: manualBaseline, source: "manuel", isManual: true };
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

// ── Employee KPI detail ───────────────────────────────────────────────────────

function EmployeeKpiDetail({ employee, onBack }: { employee: Employee; onBack: () => void }) {
  const now = new Date();
  const currentQ = Math.floor(now.getMonth() / 3);
  const [year, setYear]       = useState(now.getFullYear());
  const [quarter, setQuarter] = useState(currentQ);
  const qMonths = QUARTERS[quarter];

  const [monthData, setMonthData] = useState<[MonthData,MonthData,MonthData]>(() => [
    loadMonth(now.getFullYear(), qMonths[0]),
    loadMonth(now.getFullYear(), qMonths[1]),
    loadMonth(now.getFullYear(), qMonths[2]),
  ]);

  // KPI config (baselines per Supabase client)
  const [kpiConfig, setKpiConfig] = useState<KpiClientConfig>(loadKpiConfig);

  // "Add to KPI" form
  const [addingId, setAddingId]   = useState<string | null>(null);
  const [addViews, setAddViews]   = useState("");
  const [addVideos, setAddVideos] = useState("");
  const [showAvailable, setShowAvailable] = useState(false);

  // Supabase clients
  const { data: supabaseClients = [], isLoading } = useClients();

  // Auto-remove KPI config for clients that no longer exist in Supabase
  useEffect(() => {
    if (supabaseClients.length === 0) return;
    const ids = new Set(supabaseClients.map(c => c.id));
    let changed = false;
    const cleaned: KpiClientConfig = {};
    for (const [id, cfg] of Object.entries(kpiConfig)) {
      if (ids.has(id)) { cleaned[id] = cfg; }
      else { changed = true; }
    }
    if (changed) { setKpiConfig(cleaned); saveKpiConfig(cleaned); }
  }, [supabaseClients]);

  // Split clients into configured vs available
  const configuredClients = supabaseClients.filter(c => kpiConfig[c.id]);
  const availableClients  = supabaseClients.filter(c =>
    !kpiConfig[c.id] && c.status !== "lost" && c.status !== "completed"
  );

  const navigateQuarter = (delta: number) => {
    let q = quarter + delta, y = year;
    if (q > 3) { q = 0; y++; }
    if (q < 0) { q = 3; y--; }
    const ms = QUARTERS[q];
    setQuarter(q); setYear(y);
    setMonthData([loadMonth(y,ms[0]), loadMonth(y,ms[1]), loadMonth(y,ms[2])]);
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

  const confirmAdd = (clientId: string) => {
    const bv  = parseInt(addViews.replace(/\s/g,""))  || 0;
    const bvd = parseInt(addVideos.replace(/\s/g,"")) || 0;
    const newCfg = { ...kpiConfig, [clientId]: { baselineViews: bv, baselineVideos: bvd } };
    setKpiConfig(newCfg); saveKpiConfig(newCfg);
    setAddingId(null); setAddViews(""); setAddVideos("");
  };

  const removeFromKpi = (clientId: string) => {
    const { [clientId]: _, ...rest } = kpiConfig;
    setKpiConfig(rest); saveKpiConfig(rest);
  };

  // Dynamic baselines per client — computed from previous quarter's average.
  const baselinesByClient: Record<string, { views: DynamicBaseline; videos: DynamicBaseline }> = {};
  configuredClients.forEach((c) => {
    baselinesByClient[c.id] = {
      views:  dynamicBaseline(c.id, year, quarter, "views",  kpiConfig[c.id].baselineViews),
      videos: dynamicBaseline(c.id, year, quarter, "videos", kpiConfig[c.id].baselineVideos),
    };
  });

  // Totals
  const monthTotals = [0,1,2].map(mi =>
    configuredClients.reduce((sum, c) => {
      const row: ClientRow = monthData[mi][c.id] ?? {};
      const bl = baselinesByClient[c.id];
      const vb  = calcViewsBonus(row.views ?? null, bl.views.value);
      const vid = calcVideosBonus(row.videos ?? null, bl.videos.value);
      return sum + clientMonthTotal(vb, vid);
    }, 0)
  );
  const quarterTotal = monthTotals.reduce((a,b) => a+b, 0);
  const fmt = (n: number) => n.toLocaleString("fr-CA");

  return (
    <div className="p-6 space-y-5 max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 rounded-lg border border-border/50 hover:bg-accent transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" /> KPI — {employee.name}
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">Bonus calculés sur 3 mois · payables au trimestre</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigateQuarter(-1)} className="p-1.5 rounded-lg border border-border/50 hover:bg-accent transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="text-center w-52">
            <p className="text-sm font-bold text-foreground">Q{quarter+1} {year}</p>
            <p className="text-[11px] text-muted-foreground">
              {MONTHS_FR[qMonths[0]-1]} · {MONTHS_FR[qMonths[1]-1]} · {MONTHS_FR[qMonths[2]-1]}
            </p>
          </div>
          <button onClick={() => navigateQuarter(1)} className="p-1.5 rounded-lg border border-border/50 hover:bg-accent transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quarter summary bar */}
      <div className="grid grid-cols-4 gap-3">
        {[0,1,2].map(mi => (
          <div key={mi} className="rounded-xl border border-border/40 bg-muted/20 p-4 space-y-0.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{MONTHS_FR[qMonths[mi]-1]}</p>
            <p className="text-2xl font-bold text-foreground">${monthTotals[mi]}</p>
          </div>
        ))}
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-0.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-400">Total payable</p>
          <p className="text-2xl font-bold text-amber-400">${quarterTotal}</p>
          <p className="text-[10px] text-muted-foreground">Q{quarter+1} {year}</p>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" /> Chargement des clients…
        </div>
      )}

      {/* Configured clients table */}
      {!isLoading && configuredClients.length === 0 && (
        <div className="text-center py-10 text-muted-foreground text-sm border border-dashed border-border/50 rounded-xl">
          Aucun client configuré. Ajoute des clients ci-dessous.
        </div>
      )}

      {configuredClients.length > 0 && (
        <div className="space-y-3">
          {/* Column headers */}
          <div className="grid grid-cols-[180px_1fr_1fr_1fr_80px_28px] gap-3 px-4 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <span>Client</span>
            {[0,1,2].map(mi => <span key={mi} className="text-center">{MONTHS_FR[qMonths[mi]-1]}</span>)}
            <span className="text-center">Total Q</span>
            <span />
          </div>

          {configuredClients.map((client) => {
            const bl = baselinesByClient[client.id];
            const months = [0,1,2].map(mi => {
              const row: ClientRow = monthData[mi][client.id] ?? {};
              const views  = row.views  ?? null;
              const videos = row.videos ?? null;
              const vb  = calcViewsBonus(views,  bl.views.value);
              const vid = calcVideosBonus(videos, bl.videos.value);
              const tot = clientMonthTotal(vb, vid);
              return { views, videos, vb, vid, tot, capped: (vb+vid) > PER_CLIENT_CAP };
            });
            const clientQTotal = months.reduce((s,m) => s+m.tot, 0);

            return (
              <div key={client.id} className="rounded-xl border border-border/40 bg-card overflow-hidden hover:border-border/70 transition-colors">
                <div className="grid grid-cols-[180px_1fr_1fr_1fr_80px_28px] gap-3 p-3 items-start">
                  {/* Name + dynamic baseline */}
                  <div className="pt-1">
                    <p className="text-sm font-semibold text-foreground leading-tight">{client.name}</p>
                    <div className="mt-1 space-y-0.5">
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1 flex-wrap">
                        <span>{fmt(bl.views.value)} vues base</span>
                        <span className={`text-[9px] px-1 rounded ${bl.views.isManual ? "bg-muted/40 text-muted-foreground" : "bg-primary/15 text-primary"}`}>
                          {bl.views.source}
                        </span>
                      </p>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1 flex-wrap">
                        <span>{bl.videos.value} vidéos 20k+ base</span>
                        <span className={`text-[9px] px-1 rounded ${bl.videos.isManual ? "bg-muted/40 text-muted-foreground" : "bg-primary/15 text-primary"}`}>
                          {bl.videos.source}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Month columns */}
                  {months.map((m, mi) => (
                    <div key={mi} className="space-y-2">
                      <div className="space-y-1">
                        <label className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Eye className="w-3 h-3"/> Vues
                        </label>
                        <Input type="number" placeholder={fmt(bl.views.value)} value={m.views ?? ""}
                          onChange={e => updateField(mi as 0|1|2, client.id, "views", e.target.value)}
                          className="h-7 text-xs" />
                        <ViewsBadge actual={m.views} baseline={bl.views.value} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Video className="w-3 h-3"/> Vidéos 20k+
                        </label>
                        <Input type="number" placeholder={String(bl.videos.value)} value={m.videos ?? ""}
                          onChange={e => updateField(mi as 0|1|2, client.id, "videos", e.target.value)}
                          className="h-7 text-xs" />
                        <VideosBadge actual={m.videos} baseline={bl.videos.value} />
                      </div>
                      <div className={`text-center rounded-lg py-1.5 ${m.tot > 0 ? "bg-primary/8 border border-primary/20" : "bg-muted/30"}`}>
                        <p className={`text-sm font-bold ${m.tot > 0 ? "text-primary" : "text-muted-foreground"}`}>${m.tot}</p>
                        {m.capped && <p className="text-[9px] text-amber-400">plafonné</p>}
                      </div>
                    </div>
                  ))}

                  {/* Quarter total */}
                  <div className="flex items-center justify-center">
                    <div className={`rounded-xl px-3 py-2 text-center ${clientQTotal > 0 ? "bg-amber-500/10 border border-amber-500/20" : "bg-muted/20"}`}>
                      <p className="text-[10px] text-muted-foreground mb-0.5">3 mois</p>
                      <p className={`text-lg font-bold ${clientQTotal > 0 ? "text-amber-400" : "text-muted-foreground"}`}>${clientQTotal}</p>
                    </div>
                  </div>

                  {/* Remove button */}
                  <div className="flex items-start justify-center pt-1">
                    <button onClick={() => removeFromKpi(client.id)}
                      className="p-1 rounded hover:bg-destructive/10 text-muted-foreground/40 hover:text-destructive transition-colors"
                      title="Retirer du KPI">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Footer totals */}
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
        </div>
      )}

      {/* Available clients to add */}
      {!isLoading && availableClients.length > 0 && (
        <div className="rounded-xl border border-border/40 overflow-hidden">
          <button onClick={() => setShowAvailable(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 bg-muted/20 hover:bg-muted/30 transition-colors text-left">
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-foreground">
                Clients disponibles à ajouter au KPI
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary font-semibold">
                {availableClients.length}
              </span>
            </div>
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showAvailable ? "rotate-180" : ""}`} />
          </button>

          {showAvailable && (
            <div className="divide-y divide-border/30">
              {availableClients.map(client => (
                <div key={client.id} className="px-4 py-3">
                  {addingId === client.id ? (
                    /* Inline form */
                    <div className="space-y-3">
                      <p className="text-sm font-semibold text-foreground">{client.name}</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Eye className="w-3 h-3"/> Baseline vues / mois
                          </label>
                          <Input type="number" placeholder="ex: 77275" value={addViews}
                            onChange={e => setAddViews(e.target.value)} className="h-8 text-sm" autoFocus />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Video className="w-3 h-3"/> Baseline vidéos 20k+ / mois
                          </label>
                          <Input type="number" placeholder="ex: 2" value={addVideos}
                            onChange={e => setAddVideos(e.target.value)} className="h-8 text-sm" />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => confirmAdd(client.id)} className="gap-1.5">
                          <Check className="w-3.5 h-3.5"/> Confirmer
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => { setAddingId(null); setAddViews(""); setAddVideos(""); }}>
                          Annuler
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* Client row */
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">{client.name}</p>
                        <p className="text-[10px] text-muted-foreground capitalize">{client.status?.replace("_"," ")}</p>
                      </div>
                      <Button size="sm" variant="outline" className="gap-1.5 text-xs h-7 border-primary/30 text-primary hover:bg-primary/10"
                        onClick={() => { setAddingId(client.id); setAddViews(""); setAddVideos(""); setShowAvailable(true); }}>
                        <Plus className="w-3 h-3"/> Ajouter au KPI
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Legend */}
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

      {/* Baseline mechanic explainer */}
      <div className="rounded-xl border border-primary/20 bg-primary/[0.03] p-3 text-xs text-muted-foreground">
        <span className="font-semibold text-primary">📊 Baseline dynamique :</span> chaque trimestre, la baseline utilisée pour calculer les bonus = moyenne du trimestre précédent.
        Ex : Q2 = moyenne de Q1 (Jan-Mars). Q3 = moyenne de Q2. Si aucune donnée précédente, on utilise la baseline manuelle initiale.
      </div>

      <p className="text-[10px] text-muted-foreground text-center">
        Max par client : $80 / mois · Max total : $960 / mois · Suna Films Media Inc.
      </p>
    </div>
  );
}

// ── Employee list ─────────────────────────────────────────────────────────────

function EmployeeList({ onSelect }: { onSelect: (e: Employee) => void }) {
  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <div>
        <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-400" /> KPI Équipe
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">Sélectionne un employé pour voir et saisir ses résultats</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {EMPLOYEES.map(emp => (
          <button key={emp.id} onClick={() => onSelect(emp)}
            className="text-left rounded-2xl border border-border/50 bg-card hover:border-primary/40 hover:bg-primary/3 transition-all p-5 group">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                <span className="text-lg font-bold text-primary">{emp.initials}</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{emp.name}</p>
                <p className="text-xs text-muted-foreground">{emp.role}</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Voir les KPI →</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-medium">Actif</span>
            </div>
          </button>
        ))}
        <div className="rounded-2xl border border-dashed border-border/50 bg-muted/10 p-5 flex flex-col items-center justify-center gap-2 opacity-50 cursor-default">
          <div className="w-12 h-12 rounded-full bg-muted/40 flex items-center justify-center">
            <Plus className="w-5 h-5 text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground font-medium">Ajouter un employé</p>
        </div>
      </div>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────

export function KpiTab() {
  const [selected, setSelected] = useState<Employee | null>(null);
  if (selected) return <EmployeeKpiDetail employee={selected} onBack={() => setSelected(null)} />;
  return <EmployeeList onSelect={setSelected} />;
}
