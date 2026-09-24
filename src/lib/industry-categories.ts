// Catégorisation canonique des industries (partagée entre la section "Domaines"
// et la carte du Québec). Chaque entrée : le premier regex qui matche gagne.

export type IndustryCategory = {
  key: string;
  label: string;
  emoji: string;
  color: string;     // hex — pour le point sur la carte + les tuiles de légende
  matches: RegExp[];
};

export const INDUSTRY_CATEGORIES: IndustryCategory[] = [
  { key: "immobilier",   label: "Courtier immobilier",     emoji: "🏠", color: "#8b5cf6", matches: [/immobili/, /courtiere?\s*immo/] },
  { key: "hypothecaire", label: "Courtier hypothécaire",   emoji: "🏦", color: "#f59e0b", matches: [/hypo/, /courtage\s*hypo/] },
  { key: "golf",         label: "Golf",                    emoji: "⛳", color: "#22c55e", matches: [/golf/] },
  { key: "restaurant",   label: "Restaurant / café",       emoji: "🍽️", color: "#ef4444", matches: [/restaur/, /\bcafe\b/, /bistro/] },
  { key: "ecommerce",    label: "E-commerce",              emoji: "🛒", color: "#06b6d4", matches: [/e[-\s]?commerce/, /\bdtc\b/, /shopify/] },
  { key: "coach",        label: "Coach / formation",       emoji: "🎓", color: "#a855f7", matches: [/coach/, /formation/, /training/] },
  { key: "medical",      label: "Médical / dentaire",      emoji: "🩺", color: "#f43f5e", matches: [/medic/, /dentaire/, /dentist/, /clinique/] },
  { key: "services_pro", label: "Services professionnels", emoji: "⚖️", color: "#0ea5e9", matches: [/avocat/, /comptable/, /juridique/, /notaire/] },
  { key: "beaute",       label: "Beauté / bien-être",      emoji: "💆", color: "#ec4899", matches: [/beaute/, /bien\s*etre/, /spa/, /esthet/] },
  { key: "fitness",      label: "Fitness / sport",         emoji: "🏋️", color: "#f97316", matches: [/fitness/, /\bgym\b/, /sport/, /crossfit/] },
  { key: "saas",         label: "SaaS / tech",             emoji: "💻", color: "#3b82f6", matches: [/\bsaas\b/, /\btech\b/, /startup/, /logiciel/] },
  { key: "auto",         label: "Automobile",              emoji: "🚗", color: "#eab308", matches: [/\bauto\b/, /voiture/, /concessionnaire/] },
];

export const OTHER_CATEGORY: IndustryCategory = {
  key: "__other__", label: "Autre", emoji: "✳️", color: "#94a3b8", matches: [],
};

export const UNSPECIFIED_CATEGORY: IndustryCategory = {
  key: "__none__",  label: "Non précisé", emoji: "❓", color: "#64748b", matches: [],
};

const normalize = (s: string) =>
  s.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export function canonicalizeIndustry(raw: string | null | undefined): IndustryCategory {
  if (!raw || !raw.trim()) return UNSPECIFIED_CATEGORY;
  const n = normalize(raw);
  for (const c of INDUSTRY_CATEGORIES) {
    if (c.matches.some((rx) => rx.test(n))) return c;
  }
  return { ...OTHER_CATEGORY, label: raw };
}
