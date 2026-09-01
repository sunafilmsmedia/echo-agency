import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Trophy, Eye, Video, ArrowLeft, Plus, ChevronDown, X, Check, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useClients } from "@/hooks/useClients";
import { useKpiSync, pushClientMonth, pushClientConfig, pushCorrectionMonth } from "@/hooks/useKpiSync";
import { toast } from "sonner";

// ── Employees ─────────────────────────────────────────────────────────────────

type KpiType = "content" | "ads" | "corrections";

interface Employee {
  id: string;
  name: string;
  role: string;
  initials: string;
  kpiType: KpiType;
}

const EMPLOYEES: Employee[] = [
  { id: "sandra", name: "Sandra", role: "Gestionnaire de contenu", initials: "S", kpiType: "content" },
  { id: "rene",   name: "René",   role: "Gestionnaire d'ads",       initials: "R", kpiType: "ads" },
  { id: "elodie", name: "Élodie", role: "Monteuse vidéo",           initials: "É", kpiType: "corrections" },
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

// ── Ads / CPL ─────────────────────────────────────────────────────────────────
// René: pure results tracking, no bonus tiers. CPL = budget ($) / leads.
function calcCpl(budget: number | null, leads: number | null): number | null {
  if (budget === null || leads === null || leads <= 0) return null;
  return budget / leads;
}

// ── localStorage: KPI client config (baselines) ───────────────────────────────

interface KpiClientConfig {
  [supabaseClientId: string]: {
    baselineViews: number;
    baselineVideos: number;
    // Presence in René's Ads KPI list (no baseline needed — pure results tracking)
    trackedByAds?: boolean;
    // Deprecated: previous CPL-target field. Read for backwards-compat, no longer written.
    baselineCpl?: number;
  };
}

function loadKpiConfig(): KpiClientConfig {
  try { return JSON.parse(localStorage.getItem("kpi_client_config") || "{}"); }
  catch { return {}; }
}
function saveKpiConfig(config: KpiClientConfig) {
  // Local first (sync API stays fast + offline-safe)
  const prev = loadKpiConfig();
  localStorage.setItem("kpi_client_config", JSON.stringify(config));
  // Push only what changed to Supabase (background, non-blocking)
  for (const [clientId, cfg] of Object.entries(config)) {
    const before = prev[clientId];
    const changed = !before
      || before.baselineViews  !== cfg.baselineViews
      || before.baselineVideos !== cfg.baselineVideos
      || (!!before.trackedByAds) !== (!!cfg.trackedByAds);
    if (changed) pushClientConfig(clientId, cfg);
  }
}

// ── localStorage: monthly results ────────────────────────────────────────────

interface ClientRow  {
  views?: number | null;
  videos?: number | null;
  budget?: number | null;   // Rene: ad spend $ for the month
  leads?: number | null;    // Rene: leads generated that month
}
interface MonthData  { [clientId: string]: ClientRow; }

function storageKey(year: number, month: number) {
  return `kpi_${year}_${String(month).padStart(2,"0")}`;
}
function loadMonth(year: number, month: number): MonthData {
  try { const r = localStorage.getItem(storageKey(year,month)); return r ? JSON.parse(r) : {}; }
  catch { return {}; }
}
function saveMonth(year: number, month: number, data: MonthData) {
  const prev = loadMonth(year, month);
  localStorage.setItem(storageKey(year,month), JSON.stringify(data));
  // Diff & push only changed client-rows to Supabase (background, non-blocking)
  for (const [clientId, row] of Object.entries(data)) {
    const before = prev[clientId] ?? {};
    const changed = before.views  !== row.views
                 || before.videos !== row.videos
                 || before.budget !== row.budget
                 || before.leads  !== row.leads;
    if (changed) pushClientMonth(clientId, year, month, row);
  }
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

// ── Content KPI detail (Sandra: views + videos) ──────────────────────────────

function EmployeeKpiDetail({ employee, onBack }: { employee: Employee; onBack: () => void }) {
  if (employee.kpiType === "ads")         return <AdsKpiDetail         employee={employee} onBack={onBack} />;
  if (employee.kpiType === "corrections") return <CorrectionsKpiDetail employee={employee} onBack={onBack} />;
  return <ContentKpiDetail employee={employee} onBack={onBack} />;
}

function ContentKpiDetail({ employee, onBack }: { employee: Employee; onBack: () => void }) {
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

  // Refresh from localStorage after Supabase hydration completes
  useEffect(() => {
    const refresh = () => {
      setMonthData([
        loadMonth(now.getFullYear(), qMonths[0]),
        loadMonth(now.getFullYear(), qMonths[1]),
        loadMonth(now.getFullYear(), qMonths[2]),
      ]);
      setKpiConfig(loadKpiConfig());
    };
    window.addEventListener("kpi-hydrated", refresh);
    return () => window.removeEventListener("kpi-hydrated", refresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, quarter]);

  // "Add to KPI" form
  const [addingId, setAddingId]   = useState<string | null>(null);
  const [addViews, setAddViews]   = useState("");
  const [addVideos, setAddVideos] = useState("");
  const [showAvailable, setShowAvailable] = useState(false);

  // Import content KPI (Sandra) — 4 preset months pré-remplis (avril → août 2026)
  const [importOpen, setImportOpen] = useState(false);
  const [importJson, setImportJson] = useState<string>(SANDRA_AUGUST_2026);
  const [importYear, setImportYear] = useState<number>(2026);
  const [importMonth, setImportMonth] = useState<number>(8);

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
          <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8"
            onClick={() => setImportOpen(true)}>
            <Plus className="w-3.5 h-3.5" /> Importer
          </Button>
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

      {/* Import dialog (Sandra content) */}
      {importOpen && (() => {
        let rows: AdImportRow[] = [];
        let parseError: string | null = null;
        try {
          const parsed = JSON.parse(importJson);
          if (!Array.isArray(parsed)) throw new Error("Le JSON doit être une liste [ … ].");
          rows = parsed;
        } catch (e: any) { parseError = e?.message ?? "JSON invalide"; }
        const preview = rows.map((r) => ({
          reportName: r.name,
          views:  typeof r.views  === "number" ? r.views  : null,
          videos: typeof r.videos === "number" ? r.videos : null,
          match: findClientMatch(r.name || "", supabaseClients as any),
        }));
        const matched = preview.filter((p) => p.match !== null);
        const missed  = preview.filter((p) => p.match === null);

        const loadPreset = (json: string, y: number, m: number) => {
          setImportJson(json); setImportYear(y); setImportMonth(m);
        };

        const confirmImport = () => {
          if (matched.length === 0) return;
          const existing = loadMonth(importYear, importMonth);
          const nextConfig = { ...kpiConfig };
          matched.forEach((p) => {
            const c = p.match!;
            existing[c.id] = {
              ...(existing[c.id] ?? {}),
              ...(p.views  !== null ? { views:  p.views  } : {}),
              ...(p.videos !== null ? { videos: p.videos } : {}),
            };
            // Auto-add to Sandra's config with 0-baseline so client shows in her grid
            if (!nextConfig[c.id]) nextConfig[c.id] = { baselineViews: 0, baselineVideos: 0 };
          });
          saveMonth(importYear, importMonth, existing);
          setKpiConfig(nextConfig); saveKpiConfig(nextConfig);
          // Refresh visible grid if the imported month is in the current quarter
          const idxInQuarter = qMonths.indexOf(importMonth);
          if (year === importYear && idxInQuarter !== -1) {
            setMonthData([
              loadMonth(year, qMonths[0]),
              loadMonth(year, qMonths[1]),
              loadMonth(year, qMonths[2]),
            ]);
          }
          toast.success(`${matched.length} clients importés dans ${MONTHS_FR[importMonth-1]} ${importYear}`);
          setImportOpen(false);
        };

        return (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setImportOpen(false)}>
            <div className="bg-card border border-border/60 rounded-2xl shadow-premium max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}>
              <div className="px-6 py-4 border-b border-border/40 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">Importer des données Content (Sandra)</p>
                  <p className="text-[11px] text-muted-foreground">Presets Avril / Mai / Juin 2026 pré-remplis · match automatique par nom</p>
                </div>
                <button onClick={() => setImportOpen(false)} className="text-muted-foreground hover:text-foreground text-xl">×</button>
              </div>

              <div className="p-6 space-y-4 overflow-y-auto">
                {/* Presets */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Presets Suna Films</label>
                  <div className="flex gap-2 flex-wrap items-center">
                    <Button size="sm" variant="outline" onClick={() => loadPreset(SANDRA_APRIL_2026, 2026, 4)}
                      className={`text-xs h-8 ${importYear === 2026 && importMonth === 4 ? "border-primary text-primary" : ""}`}>
                      📥 Avril 2026
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => loadPreset(SANDRA_MAY_2026, 2026, 5)}
                      className={`text-xs h-8 ${importYear === 2026 && importMonth === 5 ? "border-primary text-primary" : ""}`}>
                      📥 Mai 2026
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => loadPreset(SANDRA_JUNE_2026, 2026, 6)}
                      className={`text-xs h-8 ${importYear === 2026 && importMonth === 6 ? "border-primary text-primary" : ""}`}>
                      📥 Juin 2026
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => loadPreset(SANDRA_AUGUST_2026, 2026, 8)}
                      className={`text-xs h-8 ${importYear === 2026 && importMonth === 8 ? "border-primary text-primary" : ""}`}>
                      📥 Août 2026
                    </Button>
                    <span className="text-[10px] text-muted-foreground mx-1">ou</span>
                    <Button size="sm" onClick={() => {
                      // Bulk import: run all four presets sequentially.
                      const runs: [string, number, number, string][] = [
                        [SANDRA_APRIL_2026,  2026, 4, "Avril"],
                        [SANDRA_MAY_2026,    2026, 5, "Mai"],
                        [SANDRA_JUNE_2026,   2026, 6, "Juin"],
                        [SANDRA_AUGUST_2026, 2026, 8, "Août"],
                      ];
                      let totalMatched = 0;
                      const nextConfig = { ...kpiConfig };
                      runs.forEach(([json, y, m]) => {
                        let parsed: AdImportRow[] = [];
                        try { parsed = JSON.parse(json); } catch { return; }
                        const existing = loadMonth(y, m);
                        parsed.forEach((r) => {
                          const match = findClientMatch(r.name || "", supabaseClients as any);
                          if (!match) return;
                          existing[match.id] = {
                            ...(existing[match.id] ?? {}),
                            ...(typeof r.views  === "number" ? { views:  r.views  } : {}),
                            ...(typeof r.videos === "number" ? { videos: r.videos } : {}),
                          };
                          if (!nextConfig[match.id]) nextConfig[match.id] = { baselineViews: 0, baselineVideos: 0 };
                          totalMatched++;
                        });
                        saveMonth(y, m, existing);
                      });
                      setKpiConfig(nextConfig); saveKpiConfig(nextConfig);
                      setMonthData([
                        loadMonth(year, qMonths[0]),
                        loadMonth(year, qMonths[1]),
                        loadMonth(year, qMonths[2]),
                      ]);
                      toast.success(`${totalMatched} lignes importées sur les 4 mois — sauvegardées dans Supabase`);
                      setImportOpen(false);
                    }} className="gap-1.5 shadow-glow text-xs h-8">
                      <Check className="w-3.5 h-3.5" /> Importer les 4 mois d'un coup
                    </Button>
                  </div>
                </div>

                {/* Target month picker */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Mois cible</label>
                  <div className="flex gap-2 items-center">
                    <select value={importMonth} onChange={(e) => setImportMonth(parseInt(e.target.value, 10))}
                      className="h-8 px-2 rounded-md border border-border/40 bg-background text-xs">
                      {MONTHS_FR.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
                    </select>
                    <Input type="number" value={importYear} onChange={(e) => setImportYear(parseInt(e.target.value, 10) || 2026)}
                      className="h-8 w-24 text-xs" />
                  </div>
                </div>

                {/* JSON textarea */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Données JSON</label>
                  <textarea value={importJson} onChange={(e) => setImportJson(e.target.value)}
                    rows={10}
                    className="w-full text-[11px] font-mono p-3 rounded-lg border border-border/40 bg-background/40 text-foreground" />
                  {parseError && <p className="text-[11px] text-destructive">✗ {parseError}</p>}
                </div>

                {!parseError && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-emerald-400 font-semibold">✓ {matched.length} matché{matched.length > 1 ? "s" : ""}</span>
                      {missed.length > 0 && <span className="text-destructive font-semibold">✗ {missed.length} non trouvé{missed.length > 1 ? "s" : ""}</span>}
                    </div>
                    <div className="rounded-lg border border-border/40 overflow-hidden max-h-64 overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-muted/20 text-[10px] uppercase tracking-wider text-muted-foreground">
                          <tr>
                            <th className="text-left px-3 py-2">Rapport</th>
                            <th className="text-left px-3 py-2">→ Client trouvé</th>
                            <th className="text-right px-3 py-2">Vues</th>
                            <th className="text-right px-3 py-2">Vidéos 20k+</th>
                          </tr>
                        </thead>
                        <tbody>
                          {preview.map((p, i) => (
                            <tr key={i} className={`border-t border-border/30 ${p.match ? "" : "bg-destructive/[0.06]"}`}>
                              <td className="px-3 py-1.5 text-foreground">{p.reportName}</td>
                              <td className={`px-3 py-1.5 ${p.match ? "text-emerald-400" : "text-destructive"}`}>
                                {p.match ? p.match.name : "— non trouvé —"}
                              </td>
                              <td className="px-3 py-1.5 text-right text-muted-foreground">
                                {p.views !== null ? p.views.toLocaleString("fr-CA") : "—"}
                              </td>
                              <td className="px-3 py-1.5 text-right text-muted-foreground">
                                {p.videos !== null ? p.videos : "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              <div className="px-6 py-4 border-t border-border/40 flex items-center justify-end gap-2">
                <Button variant="ghost" onClick={() => setImportOpen(false)}>Annuler</Button>
                <Button onClick={confirmImport} disabled={parseError !== null || matched.length === 0}
                  className="gap-1.5 shadow-glow">
                  <Check className="w-4 h-4" /> Importer {matched.length} ligne{matched.length > 1 ? "s" : ""} dans {MONTHS_FR[importMonth-1]} {importYear}
                </Button>
              </div>
            </div>
          </div>
        );
      })()}

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

// ── Ads KPI detail (René: budget + leads → CPL — pure results, no bonus) ─────

// ─── Ads import — reusable rows for JSON paste ───────────────────────────────

interface AdImportRow { name: string; budget?: number; leads?: number; views?: number; videos?: number }

// August 2026 — from the SFM monthly report generated 1er septembre.
// Includes 2 problem accounts (Claudia, Sacha — 0 leads) intentionally
// so they show up in the ranking chart as red bars.
const AUGUST_2026_ADS_JSON = JSON.stringify(
  [
    { name: "Eli Ibrahim",           budget: 1778.98, leads: 140 },
    { name: "Sylvain Danis",         budget: 1089.02, leads:  84 }, // report: Sylvain Courtier
    { name: "Jean-Philippe Bolduc",  budget:  938.53, leads:  61 },
    { name: "Yannick Charette",      budget: 1254.77, leads:  70 },
    { name: "Martin Ross",           budget: 2005.60, leads:  93 },
    { name: "Luis Ribeiro",          budget: 1247.21, leads:  56 },
    { name: "Alexandre Monfette",    budget: 1113.07, leads:  38 },
    { name: "Philippe Laroche",      budget: 1201.88, leads:  38 },
    { name: "Le Don de l'Auto",      budget: 5579.61, leads: 166 },
    { name: "Manuel",                budget: 1550.60, leads:  46 }, // report: Manuel (Remax)
    { name: "Justin Legault",        budget: 1245.86, leads:  29 },
    { name: "Éloïse Legault",        budget:  995.97, leads:  23 },
    { name: "Roux et Bachand",       budget: 2241.64, leads:  51 },
    { name: "Suna Films Media",      budget: 2663.96, leads:  49 },
    { name: "Claudia Ménard",        budget:  134.83, leads:   0 }, // ⚠ Typeform inactif depuis mars
    { name: "Sacha De Santis",       budget:  182.83, leads:   0 }, // ⚠ aucune conversion configurée
  ], null, 2,
);

// Default pasteable payload — July 2026 from the SFM monthly report.
// Users can overwrite the textarea with any month's data.
const JULY_2026_ADS_JSON = JSON.stringify(
  [
    { name: "Luis Ribeiro",              budget: 1434.31, leads: 86  },
    { name: "Jean-Philippe Bolduc",      budget: 1385.51, leads: 69  },
    { name: "Sylvain Danis",             budget:  587.78, leads: 27  }, // report: Sylvain Courtier
    { name: "Martin Ross",               budget: 1444.44, leads: 66  },
    { name: "Le Don de l'Auto",          budget: 3055.45, leads: 117 },
    { name: "Élie Ibrahim",              budget: 1569.71, leads: 47  }, // report: Eli Ibrahim
    { name: "Yannick Charette",          budget:  742.24, leads: 22  },
    { name: "Roux et Bachand",           budget: 2230.39, leads: 48  }, // report: Ebook publicité RB
    { name: "Emmanuel Bouchard",         budget: 1254.92, leads: 25  },
    { name: "Justin Legault",            budget: 1236.69, leads: 24  },
    { name: "Manuel",                    budget: 1605.09, leads: 29  },
    { name: "Suna Films Media",          budget: 2593.94, leads: 42  }, // c'est nous — notre propre acquisition
    { name: "Philippe Laroche",          budget:  446.64, leads:  5  },
    { name: "Sacha De Santis",           budget: 1333.03, leads:  5  },
    { name: "Kelly et Félix",            leads: 31, views: 500000 },     // report: SBD équipe immobilière · 500k+ vues organiques juillet
  ],
  null, 2,
);

// Sandra content presets — 3 months back-filled from her weekly result tables.
// Chiffres corrigés selon la capture 'Détail par client' du 14 août 2026.
// Corrections vs première passe :
//   · Don de l'Auto Avril : 1 360 000 → 360 000 (typo initial)
//   · Don de l'Auto Mai   : 1 311 000 → 311 000 (typo initial)
//   · Justin Legault Avril: 210 700   → 208 800
//   · Justin Legault Mai/Juin : retirés (données incomplètes)
const SANDRA_APRIL_2026 = JSON.stringify(
  [
    { name: "Claudia Ménard",           views:   82600, videos: 1 },
    { name: "Emmanuel Bouchard",        views:   83200, videos: 0 },
    { name: "Kelly et Félix",           views:  218800, videos: 0 },
    { name: "Jean-François Alexandre",  views:   64300, videos: 0 },
    { name: "Justin Legault",           views:  208800, videos: 0 },
    { name: "Le Don de l'Auto",         views:  360000, videos: 5 },
    { name: "Manuel",                   views:  146600, videos: 0 },
    { name: "Martin Ross",              views:  149500, videos: 0 },
    { name: "Philippe Laroche",         views:   69200, videos: 0 },
    { name: "Roux et Bachand",          views:  112000, videos: 0 },
    { name: "Sylvain Danis",            views:   84400, videos: 0 },
    { name: "Vyncent Ledoux",           views:  747600, videos: 0 },
  ], null, 2,
);
const SANDRA_MAY_2026 = JSON.stringify(
  [
    { name: "Claudia Ménard",           views:  216600, videos: 2 },
    { name: "Emmanuel Bouchard",        views:   87100, videos: 0 },
    { name: "Kelly et Félix",           views:  455400, videos: 2 },
    { name: "Jean-François Alexandre",  views:   66000, videos: 0 },
    // Justin Legault : données incomplètes en mai, retiré
    { name: "Le Don de l'Auto",         views:  311000, videos: 6 },
    { name: "Manuel",                   views:   70600, videos: 0 },
    { name: "Martin Ross",              views:  123600, videos: 1 },
    { name: "Philippe Laroche",         views:   72000, videos: 0 },
    { name: "Roux et Bachand",          views:  223500, videos: 0 },
    { name: "Sylvain Danis",            views:   77100, videos: 0 },
    { name: "Vyncent Ledoux",           views:  592000, videos: 1 },
    { name: "Élie Ibrahim",             views:  327600, videos: 1 },
    { name: "Luis Ribeiro",             views:   56400, videos: 0 },
    { name: "Domaine de la Lumière",    views:   43000, videos: 0 },
  ], null, 2,
);
// Août 2026 — vues Metricool = IG + FB combinées (per report du 1er sept.).
// Videos 20k+ non détaillées dans ce rapport (=0). Comptes sans Metricool
// (Martin Ross, Manuel, Éloïse Legault, Claudia Ménard, Sacha De Santis)
// sont volontairement omis.
const SANDRA_AUGUST_2026 = JSON.stringify(
  [
    { name: "Eli Ibrahim",            views:  216741, videos: 0 },
    { name: "Jean-Philippe Bolduc",   views:  141946, videos: 0 },
    { name: "Yannick Charette",       views:   71511, videos: 0 },
    { name: "Luis Ribeiro",           views:  109775, videos: 0 },
    { name: "Alexandre Monfette",     views:   41351, videos: 0 },
    { name: "Philippe Laroche",       views:  123318, videos: 0 },
    { name: "Le Don de l'Auto",       views: 1258875, videos: 0 },
    { name: "Justin Legault",         views:   91028, videos: 0 },
    { name: "Roux et Bachand",        views:  224060, videos: 0 },
    { name: "Suna Films Media",       views:  183750, videos: 0 },
  ], null, 2,
);

const SANDRA_JUNE_2026 = JSON.stringify(
  [
    { name: "Claudia Ménard",           views:  133700, videos: 1 },
    { name: "Emmanuel Bouchard",        views:  102300, videos: 0 },
    { name: "Kelly et Félix",           views:  200500, videos: 0 },
    // Justin Legault : données incomplètes en juin, retiré
    { name: "Le Don de l'Auto",         views: 1016000, videos: 6 },
    { name: "Martin Ross",              views:  133800, videos: 0 },
    { name: "Philippe Laroche",         views:   57700, videos: 0 },
    { name: "Roux et Bachand",          views:  168900, videos: 0 },
    { name: "Sylvain Danis",            views:  207100, videos: 2 },
    { name: "Vyncent Ledoux",           views:  716100, videos: 1 },
    { name: "Élie Ibrahim",             views:  206900, videos: 0 },
    { name: "Luis Ribeiro",             views:   99200, videos: 0 },
  ], null, 2,
);

// Fuzzy client-name matcher: normalize accents/punctuation/case and do a
// two-way substring test (report name in client name OR vice-versa).
function normalizeName(s: string): string {
  return s.toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
}
function findClientMatch(reportName: string, clients: { id: string; name: string }[]): { id: string; name: string } | null {
  const r = normalizeName(reportName);
  if (r.length === 0) return null;
  // Exact first
  const exact = clients.find((c) => normalizeName(c.name) === r);
  if (exact) return exact;
  // Substring (bidirectional)
  const partial = clients.find((c) => {
    const n = normalizeName(c.name);
    return n.includes(r) || r.includes(n);
  });
  return partial ?? null;
}

// ── Beautiful ranked leads bar chart ────────────────────────────────────────
// Sorted horizontal bars, one per client, colored by CPL tier (matching the
// report's aesthetic: green = excellent, blue = good, amber = watch, red = problem).

function LeadsRanking({
  clients, monthData, qMonths, year,
}: {
  clients: { id: string; name: string }[];
  monthData: [MonthData, MonthData, MonthData];
  qMonths: number[];
  year: number;
}) {
  const [pickedIdx, setPickedIdx] = useState<0 | 1 | 2>(() => {
    // Default: pick the most recent month in the quarter that has any data
    for (let i = 2; i >= 0; i--) {
      const anyData = Object.values(monthData[i]).some((r: any) => (r?.leads ?? 0) > 0 || (r?.budget ?? 0) > 0);
      if (anyData) return i as 0 | 1 | 2;
    }
    return 2 as 0 | 1 | 2;
  });

  const rows = clients.map((c) => {
    const r = (monthData[pickedIdx] as any)[c.id] ?? {};
    const budget = typeof r.budget === "number" ? r.budget : 0;
    const leads  = typeof r.leads  === "number" ? r.leads  : 0;
    const cpl    = leads > 0 ? budget / leads : null;
    return { id: c.id, name: c.name, budget, leads, cpl };
  })
    .filter((r) => r.leads > 0 || r.budget > 0)
    .sort((a, b) => (b.leads - a.leads));

  const maxLeads = Math.max(1, ...rows.map((r) => r.leads));
  const monthLabel = MONTHS_FR[qMonths[pickedIdx] - 1];

  // CPL tier: green ≤25 · blue 25-45 · amber 45-70 · red >70 (matches SFM report)
  const tierColor = (cpl: number | null) => {
    if (cpl === null) return { bg: "bg-muted/40", text: "text-muted-foreground", dot: "bg-muted-foreground" };
    if (cpl <= 25)   return { bg: "bg-emerald-500/70", text: "text-emerald-400",   dot: "bg-emerald-500" };
    if (cpl <= 45)   return { bg: "bg-primary/70",     text: "text-primary",       dot: "bg-primary" };
    if (cpl <= 70)   return { bg: "bg-amber-500/70",   text: "text-amber-400",     dot: "bg-amber-500" };
    return              { bg: "bg-destructive/70",  text: "text-destructive",   dot: "bg-destructive" };
  };

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-border/40 bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Aucune donnée de leads pour {monthLabel} {year}. Importe des données via le bouton « Importer » en haut.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/40 bg-card p-6 space-y-5">
      {/* Header + month picker */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Classement par leads</p>
          <h3 className="text-lg font-semibold text-foreground mt-0.5">
            {monthLabel} {year} · {rows.length} clients actifs
          </h3>
        </div>
        <div className="flex gap-1 rounded-lg border border-border/40 p-0.5">
          {[0, 1, 2].map((mi) => (
            <button key={mi} type="button" onClick={() => setPickedIdx(mi as 0 | 1 | 2)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition ${
                pickedIdx === mi
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}>
              {MONTHS_FR[qMonths[mi] - 1]}
            </button>
          ))}
        </div>
      </div>

      {/* Bars */}
      <div className="space-y-2">
        {rows.map((r, i) => {
          const t = tierColor(r.cpl);
          const widthPct = (r.leads / maxLeads) * 100;
          return (
            <div key={r.id} className="group">
              <div className="grid grid-cols-[24px_180px_1fr_auto] gap-3 items-center">
                <span className="text-[10px] font-bold text-muted-foreground text-right">{i + 1}.</span>
                <span className="text-sm text-foreground font-medium truncate">{r.name}</span>
                <div className="relative h-6 rounded-md bg-muted/25 overflow-hidden">
                  <div className={`h-full rounded-md ${t.bg} transition-all duration-500 ease-out`}
                       style={{ width: `${widthPct}%` }} />
                  <span className="absolute inset-0 flex items-center px-2 text-[11px] font-semibold text-foreground/90">
                    {r.leads} leads
                  </span>
                </div>
                <span className={`text-xs font-bold tabular-nums text-right min-w-[70px] ${t.text}`}>
                  {r.cpl === null ? "—" : `$${r.cpl.toFixed(2)}`}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 pt-3 border-t border-border/30 text-[10px] text-muted-foreground flex-wrap">
        <span>CPL :</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" />Excellent (&lt;25 $)</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-primary" />Bon (25-45 $)</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" />À surveiller (45-70 $)</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-destructive" />Problématique (&gt;70 $)</span>
      </div>
    </div>
  );
}

function AdsKpiDetail({ employee, onBack }: { employee: Employee; onBack: () => void }) {
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

  const [kpiConfig, setKpiConfig] = useState<KpiClientConfig>(loadKpiConfig);
  const [showAvailable, setShowAvailable] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importMonthIdx, setImportMonthIdx] = useState<0|1|2>(0);
  // Default = mois le plus récent disponible dans les presets
  const [importJson, setImportJson] = useState<string>(AUGUST_2026_ADS_JSON);

  // Refresh from localStorage after Supabase hydration completes
  useEffect(() => {
    const refresh = () => {
      setMonthData([
        loadMonth(year, qMonths[0]),
        loadMonth(year, qMonths[1]),
        loadMonth(year, qMonths[2]),
      ]);
      setKpiConfig(loadKpiConfig());
    };
    window.addEventListener("kpi-hydrated", refresh);
    return () => window.removeEventListener("kpi-hydrated", refresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, quarter]);

  const { data: supabaseClients = [], isLoading } = useClients();

  const isTracked = (c: any) =>
    kpiConfig[c.id]?.trackedByAds === true
    // Backwards-compat: clients previously added with a CPL target are still tracked
    || (kpiConfig[c.id]?.baselineCpl !== undefined && (kpiConfig[c.id]?.baselineCpl ?? 0) > 0);

  const configuredClients = supabaseClients.filter(isTracked);
  const availableClients  = supabaseClients.filter((c) =>
    !isTracked(c) && c.status !== "lost" && c.status !== "completed"
  );

  const navigateQuarter = (delta: number) => {
    let q = quarter + delta, y = year;
    if (q > 3) { q = 0; y++; }
    if (q < 0) { q = 3; y--; }
    const ms = QUARTERS[q];
    setQuarter(q); setYear(y);
    setMonthData([loadMonth(y,ms[0]), loadMonth(y,ms[1]), loadMonth(y,ms[2])]);
  };

  const updateField = (mIdx: 0|1|2, clientId: string, field: "budget"|"leads", raw: string) => {
    const val = raw === "" ? null : parseFloat(raw.replace(/\s/g,""));
    const prev = monthData[mIdx][clientId] ?? {};
    const next: MonthData = { ...monthData[mIdx], [clientId]: { ...prev, [field]: (val === null || isNaN(val)) ? null : val } };
    const updated: [MonthData,MonthData,MonthData] = [...monthData] as [MonthData,MonthData,MonthData];
    updated[mIdx] = next;
    setMonthData(updated);
    saveMonth(year, qMonths[mIdx], next);
  };

  const addToKpi = (clientId: string) => {
    const existing = kpiConfig[clientId] ?? { baselineViews: 0, baselineVideos: 0 };
    const newCfg = { ...kpiConfig, [clientId]: { ...existing, trackedByAds: true } };
    setKpiConfig(newCfg); saveKpiConfig(newCfg);
  };

  const removeFromKpi = (clientId: string) => {
    const cfg = kpiConfig[clientId];
    if (!cfg) return;
    const { trackedByAds: _t, baselineCpl: _b, ...rest } = cfg as any;
    const stillNeeded = rest.baselineViews > 0 || rest.baselineVideos > 0;
    const next = { ...kpiConfig };
    if (stillNeeded) next[clientId] = rest as typeof cfg;
    else delete next[clientId];
    setKpiConfig(next); saveKpiConfig(next);
  };

  // Monthly aggregates across all tracked clients
  const monthAggregate = (mi: 0|1|2) => {
    let budget = 0, leads = 0;
    configuredClients.forEach((c) => {
      const row = monthData[mi][c.id] ?? {};
      if (typeof row.budget === "number") budget += row.budget;
      if (typeof row.leads  === "number") leads  += row.leads;
    });
    const cpl = leads > 0 ? budget / leads : null;
    return { budget, leads, cpl };
  };
  const monthly = [0,1,2].map((i) => monthAggregate(i as 0|1|2));
  const qBudget = monthly.reduce((s,m) => s+m.budget, 0);
  const qLeads  = monthly.reduce((s,m) => s+m.leads,  0);
  const qCpl    = qLeads > 0 ? qBudget / qLeads : null;

  const fmt$ = (n: number | null) => n === null ? "—" : `$${n.toLocaleString("fr-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const fmtInt = (n: number) => n.toLocaleString("fr-CA");

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
              <Trophy className="w-5 h-5 text-amber-400" /> Résultats Ads — {employee.name}
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">Suivi du budget, leads et CPL par client · aucun bonus lié</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8"
            onClick={() => setImportOpen(true)}>
            <Plus className="w-3.5 h-3.5" /> Importer
          </Button>
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

      {/* Import dialog */}
      {importOpen && (() => {
        let rows: AdImportRow[] = [];
        let parseError: string | null = null;
        try {
          const parsed = JSON.parse(importJson);
          if (!Array.isArray(parsed)) throw new Error("Le JSON doit être une liste [ … ].");
          rows = parsed;
        } catch (e: any) {
          parseError = e?.message ?? "JSON invalide";
        }
        const preview = rows.map((r) => ({
          reportName: r.name,
          budget: typeof r.budget === "number" ? r.budget : null,
          leads:  typeof r.leads  === "number" ? r.leads  : null,
          views:  typeof r.views  === "number" ? r.views  : null,
          videos: typeof r.videos === "number" ? r.videos : null,
          match: findClientMatch(r.name || "", supabaseClients as any),
        }));
        const matched = preview.filter((p) => p.match !== null);
        const missed  = preview.filter((p) => p.match === null);

        const confirmImport = () => {
          if (matched.length === 0) return;
          const targetMonth = qMonths[importMonthIdx];
          const existing = loadMonth(year, targetMonth);
          const nextConfig = { ...kpiConfig };
          matched.forEach((p) => {
            const c = p.match!;
            existing[c.id] = {
              ...(existing[c.id] ?? {}),
              ...(p.budget !== null ? { budget: p.budget } : {}),
              ...(p.leads  !== null ? { leads:  p.leads  } : {}),
              ...(p.views  !== null ? { views:  p.views  } : {}),
              ...(p.videos !== null ? { videos: p.videos } : {}),
            };
            // Auto-track any imported client on René's list
            if (!nextConfig[c.id]) nextConfig[c.id] = { baselineViews: 0, baselineVideos: 0, trackedByAds: true };
            else nextConfig[c.id] = { ...nextConfig[c.id], trackedByAds: true };
          });
          saveMonth(year, targetMonth, existing);
          setKpiConfig(nextConfig); saveKpiConfig(nextConfig);
          // Refresh local state so grid updates immediately
          setMonthData([
            loadMonth(year, qMonths[0]),
            loadMonth(year, qMonths[1]),
            loadMonth(year, qMonths[2]),
          ]);
          setImportOpen(false);
        };

        return (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setImportOpen(false)}>
            <div className="bg-card border border-border/60 rounded-2xl shadow-premium max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}>
              <div className="px-6 py-4 border-b border-border/40 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">Importer des données Ads</p>
                  <p className="text-[11px] text-muted-foreground">Colle un JSON [ &#123; name, budget, leads &#125; ] · matching automatique par nom de client</p>
                </div>
                <button onClick={() => setImportOpen(false)} className="text-muted-foreground hover:text-foreground text-xl">×</button>
              </div>

              <div className="p-6 space-y-4 overflow-y-auto">
                {/* Presets Suna Films — Ads */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Presets Suna Films</label>
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" variant="outline" onClick={() => setImportJson(JULY_2026_ADS_JSON)} className="text-xs h-8">
                      📥 Juillet 2026
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setImportJson(AUGUST_2026_ADS_JSON)} className="text-xs h-8">
                      📥 Août 2026
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground italic">Sélectionne aussi le mois cible ci-dessous pour matcher le preset chargé.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Mois cible (dans le trimestre affiché)
                  </label>
                  <div className="flex gap-2">
                    {[0,1,2].map((mi) => (
                      <button key={mi} type="button" onClick={() => setImportMonthIdx(mi as 0|1|2)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                          importMonthIdx === mi
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted/20 text-muted-foreground border-border hover:border-primary/50"
                        }`}>
                        {MONTHS_FR[qMonths[mi]-1]} {year}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Données JSON
                  </label>
                  <textarea value={importJson} onChange={(e) => setImportJson(e.target.value)}
                    rows={10}
                    className="w-full text-[11px] font-mono p-3 rounded-lg border border-border/40 bg-background/40 text-foreground" />
                  {parseError && (
                    <p className="text-[11px] text-destructive">✗ {parseError}</p>
                  )}
                </div>

                {!parseError && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-emerald-400 font-semibold">✓ {matched.length} matché{matched.length > 1 ? "s" : ""}</span>
                      {missed.length > 0 && <span className="text-destructive font-semibold">✗ {missed.length} non trouvé{missed.length > 1 ? "s" : ""}</span>}
                    </div>
                    <div className="rounded-lg border border-border/40 overflow-hidden max-h-64 overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-muted/20 text-[10px] uppercase tracking-wider text-muted-foreground">
                          <tr>
                            <th className="text-left px-3 py-2">Rapport</th>
                            <th className="text-left px-3 py-2">→ Client trouvé</th>
                            <th className="text-right px-3 py-2">Budget</th>
                            <th className="text-right px-3 py-2">Leads</th>
                          </tr>
                        </thead>
                        <tbody>
                          {preview.map((p, i) => (
                            <tr key={i} className={`border-t border-border/30 ${p.match ? "" : "bg-destructive/[0.06]"}`}>
                              <td className="px-3 py-1.5 text-foreground">{p.reportName}</td>
                              <td className={`px-3 py-1.5 ${p.match ? "text-emerald-400" : "text-destructive"}`}>
                                {p.match ? p.match.name : "— non trouvé —"}
                              </td>
                              <td className="px-3 py-1.5 text-right text-muted-foreground">
                                {p.budget !== null ? `${p.budget.toFixed(2)} $` : "—"}
                              </td>
                              <td className="px-3 py-1.5 text-right text-muted-foreground">
                                {p.leads !== null ? p.leads : "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {missed.length > 0 && (
                      <p className="text-[10px] text-muted-foreground italic">
                        Les clients non trouvés sont ignorés — vérifie que le nom dans ta liste Client Management contient ou correspond au nom du rapport.
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="px-6 py-4 border-t border-border/40 flex items-center justify-end gap-2">
                <Button variant="ghost" onClick={() => setImportOpen(false)}>Annuler</Button>
                <Button onClick={confirmImport} disabled={parseError !== null || matched.length === 0}
                  className="gap-1.5 shadow-glow">
                  <Check className="w-4 h-4" /> Importer {matched.length} ligne{matched.length > 1 ? "s" : ""} dans {MONTHS_FR[qMonths[importMonthIdx]-1]}
                </Button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Classement par leads — beau graphique en barres horizontales ── */}
      <LeadsRanking
        clients={configuredClients as any}
        monthData={monthData}
        qMonths={qMonths}
        year={year}
      />

      {/* Quarter totals — budget spent, leads generated, avg CPL */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-xl border border-border/40 bg-muted/20 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Budget total Q</p>
          <p className="text-2xl font-bold text-foreground">{fmt$(qBudget)}</p>
        </div>
        <div className="rounded-xl border border-border/40 bg-muted/20 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Leads totaux Q</p>
          <p className="text-2xl font-bold text-foreground">{fmtInt(qLeads)}</p>
        </div>
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-primary mb-1">CPL moyen Q</p>
          <p className="text-2xl font-bold text-primary">{fmt$(qCpl)}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Budget total ÷ leads total</p>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" /> Chargement des clients…
        </div>
      )}

      {!isLoading && configuredClients.length === 0 && (
        <div className="text-center py-10 text-muted-foreground text-sm border border-dashed border-border/50 rounded-xl">
          Aucun client suivi pour Rene. Ajoute-en un ci-dessous.
        </div>
      )}

      {configuredClients.length > 0 && (
        <div className="space-y-3">
          <div className="grid grid-cols-[180px_1fr_1fr_1fr_100px_28px] gap-3 px-4 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <span>Client</span>
            {[0,1,2].map(mi => <span key={mi} className="text-center">{MONTHS_FR[qMonths[mi]-1]}</span>)}
            <span className="text-center">Total Q</span>
            <span />
          </div>

          {configuredClients.map((client) => {
            const months = [0,1,2].map(mi => {
              const row = monthData[mi][client.id] ?? {};
              const budget = row.budget ?? null;
              const leads  = row.leads  ?? null;
              const cpl    = calcCpl(budget, leads);
              return { budget, leads, cpl };
            });
            const clientBudget = months.reduce((s,m) => s + (m.budget ?? 0), 0);
            const clientLeads  = months.reduce((s,m) => s + (m.leads  ?? 0), 0);
            const clientCpl    = clientLeads > 0 ? clientBudget / clientLeads : null;

            return (
              <div key={client.id} className="rounded-xl border border-border/40 bg-card overflow-hidden hover:border-border/70 transition-colors">
                <div className="grid grid-cols-[180px_1fr_1fr_1fr_100px_28px] gap-3 p-3 items-start">
                  <div className="pt-1">
                    <p className="text-sm font-semibold text-foreground leading-tight">{client.name}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 capitalize">{client.status?.replace("_", " ")}</p>
                  </div>

                  {months.map((m, mi) => (
                    <div key={mi} className="space-y-1.5">
                      <div className="space-y-1">
                        <label className="text-[10px] text-muted-foreground">Budget ($)</label>
                        <Input type="number" placeholder="0" value={m.budget ?? ""}
                          onChange={e => updateField(mi as 0|1|2, client.id, "budget", e.target.value)}
                          className="h-7 text-xs" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-muted-foreground">Leads</label>
                        <Input type="number" placeholder="0" value={m.leads ?? ""}
                          onChange={e => updateField(mi as 0|1|2, client.id, "leads", e.target.value)}
                          className="h-7 text-xs" />
                      </div>
                      <div className={`text-center rounded-lg py-1.5 ${m.cpl !== null ? "bg-primary/8 border border-primary/20" : "bg-muted/30"}`}>
                        <p className="text-[9px] text-muted-foreground uppercase">CPL</p>
                        <p className={`text-sm font-bold ${m.cpl !== null ? "text-primary" : "text-muted-foreground"}`}>{fmt$(m.cpl)}</p>
                      </div>
                    </div>
                  ))}

                  <div className="flex items-center justify-center">
                    <div className={`rounded-xl px-3 py-2 text-center min-w-[90px] ${clientCpl !== null ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-muted/20"}`}>
                      <p className="text-[9px] text-muted-foreground uppercase mb-0.5">3 mois</p>
                      <p className="text-[10px] text-muted-foreground">{fmtInt(clientLeads)} leads</p>
                      <p className={`text-sm font-bold ${clientCpl !== null ? "text-emerald-400" : "text-muted-foreground"}`}>{fmt$(clientCpl)}</p>
                    </div>
                  </div>

                  <div className="flex items-start justify-center pt-1">
                    <button onClick={() => removeFromKpi(client.id)}
                      className="p-1 rounded hover:bg-destructive/10 text-muted-foreground/40 hover:text-destructive transition-colors"
                      title="Retirer du suivi Ads">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Available clients */}
      {!isLoading && availableClients.length > 0 && (
        <div className="rounded-xl border border-border/40 overflow-hidden">
          <button onClick={() => setShowAvailable(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 bg-muted/20 hover:bg-muted/30 transition-colors text-left">
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-foreground">
                Clients disponibles à suivre
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
                <div key={client.id} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">{client.name}</p>
                    <p className="text-[10px] text-muted-foreground capitalize">{client.status?.replace("_"," ")}</p>
                  </div>
                  <Button size="sm" variant="outline" className="gap-1.5 text-xs h-7 border-primary/30 text-primary hover:bg-primary/10"
                    onClick={() => addToKpi(client.id)}>
                    <Plus className="w-3 h-3"/> Suivre
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="rounded-xl border border-primary/20 bg-primary/[0.03] p-3 text-xs text-muted-foreground">
        <span className="font-semibold text-primary">💡 Info :</span> le CPL (coût par lead) = budget ÷ leads. Le CPL du trimestre est pondéré (budget total ÷ leads total), plus juste qu'une moyenne des CPL mensuels. Ces chiffres alimentent aussi le <span className="font-semibold text-foreground">Centre Clients</span> pour montrer l'efficacité par client.
      </div>
    </div>
  );
}

// ── Corrections KPI detail (Élodie: erreurs de montage / MOIS → bonus) ──────

const CORRECTION_CATEGORIES: { id: string; label: string }[] = [
  { id: "orthographe",   label: "Orthographe / grammaire" },
  { id: "ponctuation",   label: "Ponctuation / formatage" },
  { id: "sous_titrage",  label: "Sous-titrage inexact" },
  { id: "montage",       label: "Montage / technique" },
  { id: "titre",         label: "Titre erroné" },
];

interface CorrectionMonth {
  total: number;
  categories: Record<string, number>; // Optional per-category counts
  notes?: string;
}

// Storage: { "2026-07": { total, categories, notes }, ... } — one key per employee.
function parseMonthKeyForPush(key: string): { year: number; month: number } {
  const [y, m] = key.split("-");
  return { year: parseInt(y, 10), month: parseInt(m, 10) };
}
function loadCorrections(employeeId: string): Record<string, CorrectionMonth> {
  try {
    const raw = localStorage.getItem(`corr_${employeeId}`);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}
function saveCorrections(employeeId: string, data: Record<string, CorrectionMonth>) {
  const prev = loadCorrections(employeeId);
  localStorage.setItem(`corr_${employeeId}`, JSON.stringify(data));
  // Push only changed months to Supabase (background, non-blocking)
  for (const [monthKey, row] of Object.entries(data)) {
    const before = prev[monthKey];
    const changed = !before
      || before.total !== row.total
      || before.notes !== row.notes
      || JSON.stringify(before.categories ?? {}) !== JSON.stringify(row.categories ?? {});
    if (changed) {
      const { year, month } = parseMonthKeyForPush(monthKey);
      if (!isNaN(year) && !isNaN(month)) pushCorrectionMonth(employeeId, year, month, row);
    }
  }
}

// Month helpers — keys like "2026-07".
function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
function parseMonthKey(key: string): { year: number; month: number } {
  const [y, m] = key.split("-");
  return { year: parseInt(y, 10), month: parseInt(m, 10) };
}
function formatMonthLabel(key: string): string {
  const { year, month } = parseMonthKey(key);
  return new Date(year, month - 1, 1).toLocaleDateString("fr-CA", { month: "long", year: "numeric" });
}
function shiftMonth(key: string, delta: number): string {
  const { year, month } = parseMonthKey(key);
  const d = new Date(year, month - 1 + delta, 1);
  return monthKey(d);
}
function lastNMonthKeys(n: number, from: string): string[] {
  const keys: string[] = [];
  for (let i = n - 1; i >= 0; i--) keys.push(shiftMonth(from, -i));
  return keys;
}

// Bonus tiers — monthly thresholds (roughly 4x the weekly ones from the brief).
// Bonus amounts kept the same ($150 / $100 / $50 / $0) since they were monthly-feeling
// figures in the original scorecard.
function calcCorrectionsBonus(total: number): number {
  if (total <= 12) return 150;
  if (total <= 20) return 100;
  if (total <= 30) return 50;
  return 0;
}
function tierLabel(total: number): { label: string; color: string } {
  if (total <= 12) return { label: "Excellence",  color: "text-emerald-400" };
  if (total <= 20) return { label: "Très bien",   color: "text-primary" };
  if (total <= 30) return { label: "Bien",        color: "text-amber-400" };
  return { label: "À améliorer", color: "text-destructive" };
}

function CorrectionsKpiDetail({ employee, onBack }: { employee: Employee; onBack: () => void }) {
  const [data, setData]     = useState<Record<string, CorrectionMonth>>(() => loadCorrections(employee.id));
  const [currentKey, setCurrentKey] = useState<string>(() => monthKey(new Date()));
  const [showBreakdown, setShowBreakdown] = useState(false);

  // Refresh from localStorage after Supabase hydration
  useEffect(() => {
    const refresh = () => setData(loadCorrections(employee.id));
    window.addEventListener("kpi-hydrated", refresh);
    return () => window.removeEventListener("kpi-hydrated", refresh);
  }, [employee.id]);

  const month  = data[currentKey] ?? { total: 0, categories: {}, notes: "" };
  const bonus  = calcCorrectionsBonus(month.total);
  const tier   = tierLabel(month.total);

  const persist = (next: Record<string, CorrectionMonth>) => {
    setData(next);
    saveCorrections(employee.id, next);
  };

  const setMonth = (patch: Partial<CorrectionMonth>) => {
    const next = { ...data, [currentKey]: { ...(month ?? { total: 0, categories: {} }), ...patch } };
    persist(next);
  };

  const setTotal = (raw: string) => {
    const n = raw === "" ? 0 : Math.max(0, parseInt(raw, 10) || 0);
    setMonth({ total: n });
  };

  const setCategory = (catId: string, raw: string) => {
    const n = raw === "" ? 0 : Math.max(0, parseInt(raw, 10) || 0);
    const nextCats = { ...(month.categories || {}), [catId]: n };
    // If user tracks by category, total = sum of categories.
    const sum = Object.values(nextCats).reduce((s, v) => s + (v || 0), 0);
    setMonth({ categories: nextCats, total: sum });
  };

  // ─── Rolling stats (last 12 months including current) ───
  const last12Keys = lastNMonthKeys(12, currentKey);
  const last12 = last12Keys.map((k) => ({ key: k, month: data[k] ?? { total: 0, categories: {} } }));
  const filledMonths = last12.filter((w) => data[w.key] !== undefined);
  const totalTracked = filledMonths.reduce((s, w) => s + (w.month.total || 0), 0);
  const avg          = filledMonths.length > 0 ? +(totalTracked / filledMonths.length).toFixed(1) : 0;
  const rolling3     = (() => {
    const last3 = lastNMonthKeys(3, currentKey).map((k) => data[k]).filter(Boolean);
    if (last3.length === 0) return 0;
    return +(last3.reduce((s, w) => s + w.total, 0) / last3.length).toFixed(1);
  })();

  const totalsByCategory = CORRECTION_CATEGORIES.map((c) => ({
    ...c,
    total: filledMonths.reduce((s, w) => s + (w.month.categories?.[c.id] || 0), 0),
  }));

  const best  = filledMonths.length > 0 ? filledMonths.reduce((a, b) => (a.month.total <= b.month.total ? a : b)) : null;
  const worst = filledMonths.length > 0 ? filledMonths.reduce((a, b) => (a.month.total >= b.month.total ? a : b)) : null;

  const maxBarValue = Math.max(1, ...last12.map((w) => w.month.total || 0));

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
              <Trophy className="w-5 h-5 text-amber-400" /> Corrections — {employee.name}
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">Bonus mensuel selon le nombre d'erreurs corrigées · échelle progressive</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentKey(shiftMonth(currentKey, -1))} className="p-1.5 rounded-lg border border-border/50 hover:bg-accent transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="text-center w-56">
            <p className="text-sm font-bold text-foreground capitalize">{formatMonthLabel(currentKey)}</p>
            <p className="text-[11px] text-muted-foreground">{currentKey}</p>
          </div>
          <button onClick={() => setCurrentKey(shiftMonth(currentKey, 1))} className="p-1.5 rounded-lg border border-border/50 hover:bg-accent transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Current month card */}
      <div className={`rounded-2xl border-2 p-6 space-y-4 ${bonus > 0 ? "border-primary/40 bg-primary/[0.04]" : "border-border/40 bg-card"}`}>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_260px] gap-6 items-start">
          <div className="space-y-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Corrections ce mois</p>
              <div className="flex items-baseline gap-3 mt-1">
                <Input type="number" min="0" value={month.total || ""}
                  onChange={(e) => setTotal(e.target.value)}
                  className="h-12 text-2xl font-bold w-24 text-center"
                  placeholder="0" />
                <span className={`text-sm font-semibold ${tier.color}`}>{tier.label}</span>
              </div>
            </div>

            <div>
              <button type="button" onClick={() => setShowBreakdown((v) => !v)}
                className="text-[11px] text-primary hover:underline">
                {showBreakdown ? "− Masquer" : "+ Détail par catégorie (optionnel)"}
              </button>
              {showBreakdown && (
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {CORRECTION_CATEGORIES.map((c) => (
                    <div key={c.id} className="flex items-center gap-2">
                      <label className="text-xs text-muted-foreground flex-1">{c.label}</label>
                      <Input type="number" min="0"
                        value={month.categories?.[c.id] || ""}
                        onChange={(e) => setCategory(c.id, e.target.value)}
                        className="h-7 w-16 text-xs text-right" placeholder="0" />
                    </div>
                  ))}
                  <p className="text-[10px] text-muted-foreground italic sm:col-span-2 mt-1">
                    Si tu remplis les catégories, le total se calcule automatiquement à partir de la somme.
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Notes</label>
              <Input value={month.notes || ""} onChange={(e) => setMonth({ notes: e.target.value })}
                placeholder="Ex: mois avec 2 nouveaux clients + tournage supplémentaire"
                className="h-8 text-xs mt-1" />
            </div>
          </div>

          {/* Bonus payable */}
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400 mb-1">Bonus payable</p>
            <p className={`text-4xl font-bold ${bonus > 0 ? "text-amber-400" : "text-muted-foreground"}`}>
              {bonus > 0 ? `${bonus} $` : "0 $"}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">
              {month.total} correction{month.total > 1 ? "s" : ""} · palier « {tier.label} »
            </p>
          </div>
        </div>
      </div>

      {/* Rolling stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile label="Moyenne 12 mois" value={filledMonths.length > 0 ? `${avg}` : "—"} sub="corrections / mois" />
        <StatTile label="Rolling 3 mois" value={rolling3 > 0 ? `${rolling3}` : "—"} sub="baseline dynamique" />
        <StatTile label="Meilleur mois" value={best ? String(best.month.total) : "—"} sub={best ? formatMonthLabel(best.key) : ""} accent="emerald" />
        <StatTile label="Pire mois" value={worst ? String(worst.month.total) : "—"} sub={worst ? formatMonthLabel(worst.key) : ""} accent="destructive" />
      </div>

      {/* Bar chart — last 12 months */}
      <div className="rounded-2xl border border-border/40 bg-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">Évolution — 12 derniers mois</p>
          <p className="text-[11px] text-muted-foreground">
            Ligne pointillée = moyenne ({avg})
          </p>
        </div>
        <div className="relative flex items-end gap-1.5" style={{ height: 180 }}>
          {avg > 0 && (
            <div aria-hidden className="absolute inset-x-0 border-t border-dashed border-primary/50 z-10"
              style={{ bottom: `${(avg / maxBarValue) * 100}%` }} />
          )}
          {last12.map(({ key, month: m }) => {
            const isCurrent = key === currentKey;
            const isAbove = m.total > avg;
            const heightPct = maxBarValue > 0 ? (m.total / maxBarValue) * 100 : 0;
            const tierBonus = calcCorrectionsBonus(m.total);
            const shortLabel = formatMonthLabel(key).split(" ")[0].slice(0, 3);
            return (
              <div key={key} className="flex-1 flex flex-col items-center gap-1 min-w-0 h-full">
                <div className="w-full flex-1 flex items-end">
                  <div
                    className={`w-full rounded-t transition-all cursor-pointer ${
                      isCurrent ? "bg-primary" :
                      m.total === 0 ? "bg-muted/30" :
                      isAbove ? "bg-destructive/60 hover:bg-destructive/80" :
                      "bg-emerald-500/60 hover:bg-emerald-500/80"
                    }`}
                    style={{ height: `${heightPct}%` }}
                    title={`${formatMonthLabel(key)} · ${m.total} corr. · bonus ${tierBonus}$`}
                    onClick={() => setCurrentKey(key)}
                  />
                </div>
                <div className="text-center">
                  <p className={`text-[10px] font-semibold ${isCurrent ? "text-primary" : "text-foreground"}`}>{m.total}</p>
                  <p className="text-[9px] text-muted-foreground truncate w-full capitalize">{shortLabel}</p>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-4 text-[10px] text-muted-foreground pt-2 border-t border-border/30">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/60" /> Sous la moyenne</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-destructive/60" /> Au-dessus</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-primary" /> Mois actif</span>
        </div>
      </div>

      {/* Category breakdown */}
      {totalsByCategory.some((c) => c.total > 0) && (
        <div className="rounded-2xl border border-border/40 bg-card p-6 space-y-3">
          <p className="text-sm font-semibold text-foreground">Répartition des erreurs (12 mois)</p>
          <div className="space-y-2">
            {totalsByCategory
              .filter((c) => c.total > 0)
              .sort((a, b) => b.total - a.total)
              .map((c) => {
                const max = Math.max(1, ...totalsByCategory.map((x) => x.total));
                const pct = (c.total / max) * 100;
                return (
                  <div key={c.id} className="flex items-center gap-3">
                    <div className="w-40 text-xs text-muted-foreground truncate">{c.label}</div>
                    <div className="flex-1 h-2 rounded-full bg-muted/30 overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="w-8 text-right text-sm font-semibold text-foreground">{c.total}</div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Bonus tier legend */}
      <div className="rounded-2xl border border-border/40 bg-muted/20 p-5 space-y-3">
        <p className="text-sm font-semibold text-foreground">Structure des paliers (mensuels)</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Excellence",  range: "0 — 12",   bonus: 150, color: "border-emerald-500/40 bg-emerald-500/5 text-emerald-400" },
            { label: "Très bien",   range: "13 — 20",  bonus: 100, color: "border-primary/40 bg-primary/5 text-primary" },
            { label: "Bien",        range: "21 — 30",  bonus: 50,  color: "border-amber-500/40 bg-amber-500/5 text-amber-400" },
            { label: "À améliorer", range: "31+",      bonus: 0,   color: "border-destructive/40 bg-destructive/5 text-destructive" },
          ].map((t) => (
            <div key={t.label} className={`rounded-xl border p-3 ${t.color}`}>
              <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">{t.label}</p>
              <p className="text-lg font-bold mt-1">+ {t.bonus} $</p>
              <p className="text-[11px] opacity-70">{t.range} corrections / mois</p>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground italic">
          Ce KPI compte les vraies erreurs (orthographe, ponctuation, sous-titrage, technique, titre). Les changements créatifs demandés par le client ne comptent pas.
          Astuce : pour normaliser selon le volume, garder un œil sur le ratio erreurs / vidéo produite.
        </p>
      </div>
    </div>
  );
}

function StatTile({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: "emerald" | "destructive" }) {
  const color = accent === "emerald"
    ? "text-emerald-400"
    : accent === "destructive"
    ? "text-destructive"
    : "text-foreground";
  return (
    <div className="rounded-xl border border-border/40 bg-muted/20 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{sub}</p>}
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
  useKpiSync(); // Hydrates localStorage from Supabase on first mount, once per session
  const [selected, setSelected] = useState<Employee | null>(null);
  if (selected) return <EmployeeKpiDetail employee={selected} onBack={() => setSelected(null)} />;
  return <EmployeeList onSelect={setSelected} />;
}
