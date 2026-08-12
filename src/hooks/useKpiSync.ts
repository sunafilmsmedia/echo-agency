// Hybrid persistence for KPI data.
// - On app mount we hydrate localStorage from Supabase (source of truth wins).
// - Every write goes through localStorage first (sync API) THEN fires an
//   upsert to Supabase in the background (non-blocking).
// - If Supabase is unreachable, localStorage still works; next hydration
//   will pick up whatever the DB has and merge with local writes.

import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

let hydratedOnce = false;

interface MonthRow {
  views?: number | null;
  videos?: number | null;
  budget?: number | null;
  leads?: number | null;
}

interface ConfigRow {
  baselineViews: number;
  baselineVideos: number;
  trackedByAds?: boolean;
  baselineCpl?: number;
}

interface CorrectionMonth {
  total: number;
  categories: Record<string, number>;
  notes?: string;
}

export function useKpiSync() {
  useEffect(() => {
    if (hydratedOnce) return;
    hydratedOnce = true;

    (async () => {
      try {
        // ── 1. Client monthly rows ──
        const { data: monthRows, error: mErr } = await supabase
          .from("kpi_client_month")
          .select("client_id, year, month, views, videos, budget, leads");

        if (mErr) console.warn("[kpi hydrate] month rows:", mErr.message);
        if (monthRows) {
          const byMonth: Record<string, Record<string, MonthRow>> = {};
          for (const r of monthRows as any[]) {
            const key = `kpi_${r.year}_${String(r.month).padStart(2, "0")}`;
            byMonth[key] ??= {};
            byMonth[key][r.client_id] = {
              views:  r.views  ?? undefined,
              videos: r.videos ?? undefined,
              budget: r.budget !== null ? Number(r.budget) : undefined,
              leads:  r.leads  ?? undefined,
            };
          }
          // Merge into localStorage — Supabase wins for the client IDs it knows.
          for (const [key, monthData] of Object.entries(byMonth)) {
            const existing = safeParse<Record<string, MonthRow>>(localStorage.getItem(key)) ?? {};
            localStorage.setItem(key, JSON.stringify({ ...existing, ...monthData }));
          }
        }

        // ── 2. Client config ──
        const { data: configs, error: cErr } = await supabase
          .from("kpi_client_config")
          .select("client_id, baseline_views, baseline_videos, tracked_by_ads");
        if (cErr) console.warn("[kpi hydrate] config:", cErr.message);
        if (configs) {
          const merged: Record<string, ConfigRow> = safeParse<Record<string, ConfigRow>>(localStorage.getItem("kpi_client_config")) ?? {};
          for (const c of configs as any[]) {
            merged[c.client_id] = {
              baselineViews:  c.baseline_views  ?? 0,
              baselineVideos: c.baseline_videos ?? 0,
              trackedByAds:   !!c.tracked_by_ads,
            };
          }
          localStorage.setItem("kpi_client_config", JSON.stringify(merged));
        }

        // ── 3. Corrections monthly rows (Élodie) ──
        const { data: corr, error: coErr } = await supabase
          .from("kpi_corrections_month")
          .select("employee_id, year, month, total, categories, notes");
        if (coErr) console.warn("[kpi hydrate] corrections:", coErr.message);
        if (corr) {
          const byEmployee: Record<string, Record<string, CorrectionMonth>> = {};
          for (const r of corr as any[]) {
            byEmployee[r.employee_id] ??= {};
            const monthKey = `${r.year}-${String(r.month).padStart(2, "0")}`;
            byEmployee[r.employee_id][monthKey] = {
              total: r.total ?? 0,
              categories: r.categories ?? {},
              notes: r.notes ?? undefined,
            };
          }
          for (const [empId, data] of Object.entries(byEmployee)) {
            const key = `corr_${empId}`;
            const existing = safeParse<Record<string, CorrectionMonth>>(localStorage.getItem(key)) ?? {};
            localStorage.setItem(key, JSON.stringify({ ...existing, ...data }));
          }
        }

        // Broadcast so mounted components can re-read localStorage.
        window.dispatchEvent(new Event("kpi-hydrated"));
      } catch (e: any) {
        console.warn("[kpi hydrate] failed:", e?.message ?? e);
      }
    })();
  }, []);
}

// ── Fire-and-forget push helpers — called by KpiTab's save functions ──

export function pushClientMonth(clientId: string, year: number, month: number, row: MonthRow) {
  supabase.from("kpi_client_month")
    .upsert({
      client_id: clientId,
      year, month,
      views:  row.views  ?? null,
      videos: row.videos ?? null,
      budget: row.budget ?? null,
      leads:  row.leads  ?? null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "client_id,year,month" })
    .then(({ error }) => { if (error) console.warn("[kpi push month]", error.message); });
}

export function pushClientConfig(clientId: string, cfg: ConfigRow) {
  supabase.from("kpi_client_config")
    .upsert({
      client_id: clientId,
      baseline_views:  cfg.baselineViews  ?? 0,
      baseline_videos: cfg.baselineVideos ?? 0,
      tracked_by_ads:  cfg.trackedByAds   ?? false,
      updated_at: new Date().toISOString(),
    }, { onConflict: "client_id" })
    .then(({ error }) => { if (error) console.warn("[kpi push config]", error.message); });
}

export function pushCorrectionMonth(employeeId: string, year: number, month: number, row: CorrectionMonth) {
  supabase.from("kpi_corrections_month")
    .upsert({
      employee_id: employeeId,
      year, month,
      total: row.total ?? 0,
      categories: row.categories ?? {},
      notes: row.notes ?? null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "employee_id,year,month" })
    .then(({ error }) => { if (error) console.warn("[kpi push corr]", error.message); });
}

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}
