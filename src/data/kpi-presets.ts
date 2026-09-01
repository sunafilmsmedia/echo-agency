// Suna Films Media — presets KPI (Sandra content + René ads) importés depuis
// les rapports mensuels internes. Utilisés par KpiTab (dialogs d'import) ET
// par ResultatsTab (bouton 'Seed' en un clic).

export interface KpiPresetRow {
  name: string;
  views?: number;
  videos?: number;
  budget?: number;
  leads?: number;
}

export interface KpiPresetMonth {
  label: string;   // "Avril 2026"
  year: number;
  month: number;   // 1-12
  rows: KpiPresetRow[];
}

// ── Sandra (content: views + videos 20k+) ─────────────────────────────────

export const SANDRA_APRIL_2026_ROWS: KpiPresetRow[] = [
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
];

export const SANDRA_MAY_2026_ROWS: KpiPresetRow[] = [
  { name: "Claudia Ménard",           views:  216600, videos: 2 },
  { name: "Emmanuel Bouchard",        views:   87100, videos: 0 },
  { name: "Kelly et Félix",           views:  455400, videos: 2 },
  { name: "Jean-François Alexandre",  views:   66000, videos: 0 },
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
];

export const SANDRA_JUNE_2026_ROWS: KpiPresetRow[] = [
  { name: "Claudia Ménard",           views:  133700, videos: 1 },
  { name: "Emmanuel Bouchard",        views:  102300, videos: 0 },
  { name: "Kelly et Félix",           views:  200500, videos: 0 },
  { name: "Le Don de l'Auto",         views: 1016000, videos: 6 },
  { name: "Martin Ross",              views:  133800, videos: 0 },
  { name: "Philippe Laroche",         views:   57700, videos: 0 },
  { name: "Roux et Bachand",          views:  168900, videos: 0 },
  { name: "Sylvain Danis",            views:  207100, videos: 2 },
  { name: "Vyncent Ledoux",           views:  716100, videos: 1 },
  { name: "Élie Ibrahim",             views:  206900, videos: 0 },
  { name: "Luis Ribeiro",             views:   99200, videos: 0 },
];

export const SANDRA_AUGUST_2026_ROWS: KpiPresetRow[] = [
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
];

// ── René (ads: budget + leads) ────────────────────────────────────────────

export const RENE_JULY_2026_ROWS: KpiPresetRow[] = [
  { name: "Luis Ribeiro",              budget: 1434.31, leads: 86  },
  { name: "Jean-Philippe Bolduc",      budget: 1385.51, leads: 69  },
  { name: "Sylvain Danis",             budget:  587.78, leads: 27  },
  { name: "Martin Ross",               budget: 1444.44, leads: 66  },
  { name: "Le Don de l'Auto",          budget: 3055.45, leads: 117 },
  { name: "Élie Ibrahim",              budget: 1569.71, leads: 47  },
  { name: "Yannick Charette",          budget:  742.24, leads: 22  },
  { name: "Roux et Bachand",           budget: 2230.39, leads: 48  },
  { name: "Emmanuel Bouchard",         budget: 1254.92, leads: 25  },
  { name: "Justin Legault",            budget: 1236.69, leads: 24  },
  { name: "Manuel",                    budget: 1605.09, leads: 29  },
  { name: "Suna Films Media",          budget: 2593.94, leads: 42  },
  { name: "Philippe Laroche",          budget:  446.64, leads:  5  },
  { name: "Sacha De Santis",           budget: 1333.03, leads:  5  },
  { name: "Kelly et Félix",            leads: 31, views: 500000 },
];

export const RENE_AUGUST_2026_ROWS: KpiPresetRow[] = [
  { name: "Eli Ibrahim",           budget: 1778.98, leads: 140 },
  { name: "Sylvain Danis",         budget: 1089.02, leads:  84 },
  { name: "Jean-Philippe Bolduc",  budget:  938.53, leads:  61 },
  { name: "Yannick Charette",      budget: 1254.77, leads:  70 },
  { name: "Martin Ross",           budget: 2005.60, leads:  93 },
  { name: "Luis Ribeiro",          budget: 1247.21, leads:  56 },
  { name: "Alexandre Monfette",    budget: 1113.07, leads:  38 },
  { name: "Philippe Laroche",      budget: 1201.88, leads:  38 },
  { name: "Le Don de l'Auto",      budget: 5579.61, leads: 166 },
  { name: "Manuel",                budget: 1550.60, leads:  46 },
  { name: "Justin Legault",        budget: 1245.86, leads:  29 },
  { name: "Éloïse Legault",        budget:  995.97, leads:  23 },
  { name: "Roux et Bachand",       budget: 2241.64, leads:  51 },
  { name: "Suna Films Media",      budget: 2663.96, leads:  49 },
  { name: "Claudia Ménard",        budget:  134.83, leads:   0 },
  { name: "Sacha De Santis",       budget:  182.83, leads:   0 },
];

export const ALL_PRESETS: KpiPresetMonth[] = [
  { label: "Sandra · Avril 2026",  year: 2026, month: 4, rows: SANDRA_APRIL_2026_ROWS },
  { label: "Sandra · Mai 2026",    year: 2026, month: 5, rows: SANDRA_MAY_2026_ROWS },
  { label: "Sandra · Juin 2026",   year: 2026, month: 6, rows: SANDRA_JUNE_2026_ROWS },
  { label: "Sandra · Août 2026",   year: 2026, month: 8, rows: SANDRA_AUGUST_2026_ROWS },
  { label: "René · Juillet 2026",  year: 2026, month: 7, rows: RENE_JULY_2026_ROWS },
  { label: "René · Août 2026",     year: 2026, month: 8, rows: RENE_AUGUST_2026_ROWS },
];
