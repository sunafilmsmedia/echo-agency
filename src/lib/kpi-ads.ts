// Read-only helpers to expose KPI data (ads + content) outside of KpiTab.
// Storage layout is owned by KpiTab; this module ONLY reads from localStorage.

const QUARTERS = [[1,2,3],[4,5,6],[7,8,9],[10,11,12]];

interface StoredRow {
  budget?: number | null;
  leads?: number | null;
  views?: number | null;
  videos?: number | null;
}

function loadMonth(year: number, month: number): Record<string, StoredRow> {
  try {
    const raw = localStorage.getItem(`kpi_${year}_${String(month).padStart(2, "0")}`);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

// ── Content (Sandra) helpers ─────────────────────────────────────────────────

/** Total views + videos for a client over the last N months (default 3). */
export function clientContentTotals(clientId: string, lookbackMonths = 3): { views: number; videos: number; months: number } {
  const now = new Date();
  let views = 0, videos = 0, months = 0;
  for (let i = 0; i < lookbackMonths; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const row = loadMonth(d.getFullYear(), d.getMonth() + 1)[clientId];
    if (!row) continue;
    let hadData = false;
    if (typeof row.views  === "number") { views  += row.views;  hadData = true; }
    if (typeof row.videos === "number") { videos += row.videos; hadData = true; }
    if (hadData) months++;
  }
  return { views, videos, months };
}

/** Avg monthly views over the last N months (default 3). null if no data. */
export function clientAvgViewsPerMonth(clientId: string, lookbackMonths = 3): number | null {
  const { views, months } = clientContentTotals(clientId, lookbackMonths);
  if (months === 0) return null;
  return Math.round(views / months);
}

/** Sum of budget spent and leads generated for a client over the last N months (default 3). */
export function clientAdsTotals(clientId: string, lookbackMonths = 3): { budget: number; leads: number; months: number } {
  const now = new Date();
  let budget = 0, leads = 0, months = 0;
  for (let i = 0; i < lookbackMonths; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const row = loadMonth(d.getFullYear(), d.getMonth() + 1)[clientId];
    if (!row) continue;
    let hadData = false;
    if (typeof row.budget === "number") { budget += row.budget; hadData = true; }
    if (typeof row.leads  === "number") { leads  += row.leads;  hadData = true; }
    if (hadData) months++;
  }
  return { budget, leads, months };
}

/** Weighted average CPL over the last N months. null if no leads recorded. */
export function clientAvgCpl(clientId: string, lookbackMonths = 3): number | null {
  const { budget, leads } = clientAdsTotals(clientId, lookbackMonths);
  if (leads === 0) return null;
  return Math.round((budget / leads) * 100) / 100;
}

/** Sum of leads for a client over the last N months (default 3). Convenient for tiles. */
export function clientTotalLeads(clientId: string, lookbackMonths = 3): number {
  return clientAdsTotals(clientId, lookbackMonths).leads;
}

/**
 * Data for a specific month, offset from today (0 = current month, 1 = last month, etc.).
 * Returns null when nothing was recorded that month.
 */
export function clientMonthSnapshot(clientId: string, monthOffset = 0): { views: number; videos: number; budget: number; leads: number; cpl: number | null } | null {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);
  const row = loadMonth(d.getFullYear(), d.getMonth() + 1)[clientId];
  if (!row) return null;
  const budget = typeof row.budget === "number" ? row.budget : 0;
  const leads  = typeof row.leads  === "number" ? row.leads  : 0;
  const views  = typeof row.views  === "number" ? row.views  : 0;
  const videos = typeof row.videos === "number" ? row.videos : 0;
  if (budget === 0 && leads === 0 && views === 0 && videos === 0) return null;
  return {
    views, videos, budget, leads,
    cpl: leads > 0 ? Math.round((budget / leads) * 100) / 100 : null,
  };
}

/** Month-over-month % change for a specific metric. null if either month lacks data. */
export function clientMomChange(clientId: string, metric: "budget" | "leads" | "views" | "videos"): number | null {
  const cur = clientMonthSnapshot(clientId, 0);
  const prev = clientMonthSnapshot(clientId, 1);
  if (!cur || !prev) return null;
  const p = prev[metric];
  if (p === 0) return null;
  return Math.round(((cur[metric] - p) / p) * 100);
}
