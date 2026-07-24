// Builds a month-by-month KPI report for a single client, then renders it
// as a downloadable branded PDF via jsPDF + jspdf-autotable.

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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

const MONTH_LABELS = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];

export interface MonthRow {
  label:   string;
  period:  string; // "2026-07"
  views:   number | null;
  videos:  number | null;
  budget:  number | null;
  leads:   number | null;
  cpl:     number | null;
}

export interface ClientKpiReport {
  months: MonthRow[];       // ordered oldest → newest
  totals: {
    views:  number;
    videos: number;
    budget: number;
    leads:  number;
    cpl:    number | null;
    monthsWithData: number;
  };
}

/** Aggregate the last N months of KPI data for a given client (default 6). */
export function buildClientKpiReport(clientId: string, lookbackMonths = 6): ClientKpiReport {
  const now = new Date();
  const rows: MonthRow[] = [];

  // Walk oldest → newest so the table reads chronologically
  for (let i = lookbackMonths - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear(), m = d.getMonth() + 1;
    const row = loadMonth(y, m)[clientId] ?? {};
    const budget = typeof row.budget === "number" ? row.budget : null;
    const leads  = typeof row.leads  === "number" ? row.leads  : null;
    const cpl    = (budget !== null && leads !== null && leads > 0) ? Math.round((budget / leads) * 100) / 100 : null;

    rows.push({
      label:  `${MONTH_LABELS[d.getMonth()]} ${y}`,
      period: `${y}-${String(m).padStart(2, "0")}`,
      views:  typeof row.views  === "number" ? row.views  : null,
      videos: typeof row.videos === "number" ? row.videos : null,
      budget, leads, cpl,
    });
  }

  const totals = rows.reduce(
    (acc, r) => {
      const hasAny =
        r.views !== null || r.videos !== null || r.budget !== null || r.leads !== null;
      if (hasAny) acc.monthsWithData++;
      acc.views  += r.views  ?? 0;
      acc.videos += r.videos ?? 0;
      acc.budget += r.budget ?? 0;
      acc.leads  += r.leads  ?? 0;
      return acc;
    },
    { views: 0, videos: 0, budget: 0, leads: 0, cpl: null as number | null, monthsWithData: 0 },
  );
  totals.cpl = totals.leads > 0 ? Math.round((totals.budget / totals.leads) * 100) / 100 : null;

  return { months: rows, totals };
}

// ─── PDF generation ──────────────────────────────────────────────────────────

interface PdfClient   { id: string; name: string; industry?: string | null; contract_start_date?: string | null; }
interface PdfAgency   { name: string; color: string; }

const fmtN   = (n: number) => n.toLocaleString("fr-CA");
const fmt$   = (n: number | null) => n === null ? "—" : `${n.toLocaleString("fr-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $`;
const fmt0$  = (n: number) => `${Math.round(n).toLocaleString("fr-CA")} $`;
const dash   = (n: number | null) => n === null ? "—" : fmtN(n);

/** Hex → [r, g, b] 0-255. Fall back to a violet if malformed. */
function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return [124, 58, 237];
  const int = parseInt(m[1], 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}

/** Generate + trigger download of the client's KPI results PDF. */
export function downloadClientKpiReport(client: PdfClient, agency: PdfAgency, lookbackMonths = 6) {
  const report = buildClientKpiReport(client.id, lookbackMonths);
  const [ar, ag, ab] = hexToRgb(agency.color);

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const marginX = 40;
  let y = 50;

  // ─── Header band (agency color) ──
  doc.setFillColor(ar, ag, ab);
  doc.rect(0, 0, pageW, 8, "F");

  // Agency name (top-left)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(120);
  doc.text(agency.name.toUpperCase(), marginX, y);

  // Date (top-right)
  const today = new Date();
  const dateStr = today.toLocaleDateString("fr-CA", { day: "numeric", month: "long", year: "numeric" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(140);
  doc.text(dateStr, pageW - marginX, y, { align: "right" });

  // Title
  y += 40;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.setTextColor(20);
  doc.text("Rapport de résultats", marginX, y);

  y += 26;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(14);
  doc.setTextColor(60);
  doc.text(client.name, marginX, y);

  if (client.industry) {
    y += 16;
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text(client.industry, marginX, y);
  }

  y += 20;
  doc.setDrawColor(230);
  doc.setLineWidth(0.5);
  doc.line(marginX, y, pageW - marginX, y);

  // ─── Key totals summary ──
  y += 26;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(20);
  doc.text("Résumé (" + report.totals.monthsWithData + " mois de données)", marginX, y);

  y += 14;
  const cardW = (pageW - marginX * 2 - 30) / 4;
  const cardH = 60;
  const cards: { label: string; value: string; accent?: boolean }[] = [
    { label: "Vues totales",   value: fmtN(report.totals.views) },
    { label: "Vidéos publiées", value: fmtN(report.totals.videos) },
    { label: "Leads générés",  value: fmtN(report.totals.leads), accent: true },
    { label: "CPL moyen",      value: fmt$(report.totals.cpl),   accent: true },
  ];
  cards.forEach((c, i) => {
    const x = marginX + i * (cardW + 10);
    doc.setDrawColor(230);
    doc.setFillColor(250, 250, 248);
    doc.roundedRect(x, y, cardW, cardH, 6, 6, "FD");
    if (c.accent) {
      doc.setFillColor(ar, ag, ab);
      doc.roundedRect(x, y, cardW, 3, 1, 1, "F");
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(c.label.toUpperCase(), x + 12, y + 20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(20);
    doc.text(c.value, x + 12, y + 44);
  });
  y += cardH + 24;

  // ─── Monthly breakdown table ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(20);
  doc.text("Détail par mois", marginX, y);
  y += 8;

  autoTable(doc, {
    startY: y,
    head: [["Mois", "Vues", "Vidéos", "Budget", "Leads", "CPL"]],
    body: report.months.map((m) => [
      m.label,
      dash(m.views),
      dash(m.videos),
      m.budget !== null ? fmt0$(m.budget) : "—",
      dash(m.leads),
      fmt$(m.cpl),
    ]),
    foot: [[
      "Total",
      fmtN(report.totals.views),
      fmtN(report.totals.videos),
      fmt0$(report.totals.budget),
      fmtN(report.totals.leads),
      fmt$(report.totals.cpl),
    ]],
    margin: { left: marginX, right: marginX },
    styles: { font: "helvetica", fontSize: 10, cellPadding: { top: 8, bottom: 8, left: 10, right: 10 } },
    headStyles: { fillColor: [ar, ag, ab], textColor: 255, fontStyle: "bold", fontSize: 9, halign: "left" },
    footStyles: { fillColor: [245, 245, 240], textColor: 20, fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 100 },
      1: { halign: "right" }, 2: { halign: "right" },
      3: { halign: "right" }, 4: { halign: "right" }, 5: { halign: "right" },
    },
    theme: "plain",
    didDrawPage: () => {
      // Footer
      const pageH = doc.internal.pageSize.getHeight();
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `Généré par Echo pour ${agency.name} · ${dateStr}`,
        pageW / 2, pageH - 20, { align: "center" },
      );
    },
  });

  // ─── Save ──
  const safeName = client.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  doc.save(`rapport-${safeName}-${today.toISOString().slice(0, 10)}.pdf`);
}
