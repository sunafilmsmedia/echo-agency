// Table interne de villes du Québec (+ quelques régions limitrophes).
// Coordonnées WGS84 (lat, lng) — utilisées pour placer les points sur la carte.
// Ajouter une ville ici est instantané et évite tout appel à une API externe.
//
// Match par normalisation (lowercase + accents supprimés + espaces trim).

export type QcRegion =
  | "Grand Montréal" | "Québec / Chaudière-Appalaches" | "Outaouais"
  | "Estrie" | "Laurentides" | "Lanaudière" | "Montérégie"
  | "Mauricie" | "Centre-du-Québec" | "Saguenay–Lac-Saint-Jean"
  | "Bas-Saint-Laurent" | "Côte-Nord" | "Gaspésie" | "Abitibi-Témiscamingue";

export type CityCoords = { lat: number; lng: number; region: QcRegion };

const RAW: Record<string, CityCoords> = {
  // ─── Grand Montréal ───────────────────────────────
  "Montreal":          { lat: 45.5019, lng: -73.5674, region: "Grand Montréal" },
  "Laval":             { lat: 45.6066, lng: -73.7124, region: "Grand Montréal" },
  "Longueuil":         { lat: 45.5312, lng: -73.5182, region: "Grand Montréal" },
  "Brossard":          { lat: 45.4581, lng: -73.4650, region: "Grand Montréal" },
  "Boucherville":      { lat: 45.5942, lng: -73.4360, region: "Grand Montréal" },
  "Terrebonne":        { lat: 45.6959, lng: -73.6362, region: "Grand Montréal" },
  "Repentigny":        { lat: 45.7422, lng: -73.4501, region: "Grand Montréal" },
  "Mascouche":         { lat: 45.7500, lng: -73.6000, region: "Grand Montréal" },
  "Blainville":        { lat: 45.6667, lng: -73.8833, region: "Grand Montréal" },
  "Boisbriand":        { lat: 45.6167, lng: -73.8333, region: "Grand Montréal" },
  "Saint-Jerome":      { lat: 45.7804, lng: -74.0034, region: "Grand Montréal" },
  "Saint-Bruno-de-Montarville": { lat: 45.5330, lng: -73.3495, region: "Grand Montréal" },
  "Saint-Hubert":      { lat: 45.4952, lng: -73.4197, region: "Grand Montréal" },
  "Saint-Lambert":     { lat: 45.5000, lng: -73.5083, region: "Grand Montréal" },
  "Saint-Constant":    { lat: 45.3667, lng: -73.5833, region: "Grand Montréal" },
  "Sainte-Julie":      { lat: 45.5833, lng: -73.3333, region: "Grand Montréal" },
  "Chambly":           { lat: 45.4442, lng: -73.2833, region: "Grand Montréal" },
  "Vaudreuil-Dorion":  { lat: 45.4000, lng: -74.0333, region: "Grand Montréal" },
  "Chateauguay":       { lat: 45.3833, lng: -73.7500, region: "Grand Montréal" },
  "Mirabel":           { lat: 45.6500, lng: -74.0833, region: "Grand Montréal" },
  "Kirkland":          { lat: 45.4500, lng: -73.8667, region: "Grand Montréal" },
  "Pointe-Claire":     { lat: 45.4500, lng: -73.8167, region: "Grand Montréal" },
  "Beaconsfield":      { lat: 45.4333, lng: -73.8667, region: "Grand Montréal" },
  "Dollard-Des-Ormeaux": { lat: 45.4936, lng: -73.8225, region: "Grand Montréal" },
  "Dorval":            { lat: 45.4472, lng: -73.7550, region: "Grand Montréal" },
  "Baie-D'Urfe":       { lat: 45.4167, lng: -73.9167, region: "Grand Montréal" },
  "Sainte-Anne-de-Bellevue": { lat: 45.4042, lng: -73.9481, region: "Grand Montréal" },
  "Senneville":        { lat: 45.4333, lng: -73.9500, region: "Grand Montréal" },
  "Ile-Perrot":        { lat: 45.3833, lng: -73.9500, region: "Grand Montréal" },
  "Notre-Dame-de-l'Ile-Perrot": { lat: 45.3667, lng: -73.9167, region: "Grand Montréal" },
  "Westmount":         { lat: 45.4833, lng: -73.6000, region: "Grand Montréal" },
  "Mont-Royal":        { lat: 45.5167, lng: -73.6500, region: "Grand Montréal" },
  "Outremont":         { lat: 45.5167, lng: -73.6167, region: "Grand Montréal" },
  "Verdun":            { lat: 45.4581, lng: -73.5686, region: "Grand Montréal" },
  "LaSalle":           { lat: 45.4333, lng: -73.6167, region: "Grand Montréal" },
  "Hampstead":         { lat: 45.4833, lng: -73.6333, region: "Grand Montréal" },
  "Cote-Saint-Luc":    { lat: 45.4667, lng: -73.6667, region: "Grand Montréal" },
  "Anjou":             { lat: 45.6100, lng: -73.5600, region: "Grand Montréal" },
  "Montreal-Est":      { lat: 45.6333, lng: -73.5167, region: "Grand Montréal" },
  "Montreal-Nord":     { lat: 45.6000, lng: -73.6333, region: "Grand Montréal" },
  "Montreal-Ouest":    { lat: 45.4500, lng: -73.6500, region: "Grand Montréal" },

  // ─── Québec / Chaudière-Appalaches ────────────────
  "Quebec":            { lat: 46.8139, lng: -71.2080, region: "Québec / Chaudière-Appalaches" },
  "Levis":             { lat: 46.8033, lng: -71.1783, region: "Québec / Chaudière-Appalaches" },
  "Sainte-Foy":        { lat: 46.7833, lng: -71.2833, region: "Québec / Chaudière-Appalaches" },
  "Beauport":          { lat: 46.8833, lng: -71.1833, region: "Québec / Chaudière-Appalaches" },
  "Charlesbourg":      { lat: 46.8500, lng: -71.2667, region: "Québec / Chaudière-Appalaches" },
  "Saint-Georges":     { lat: 46.1167, lng: -70.6667, region: "Québec / Chaudière-Appalaches" },
  "Thetford Mines":    { lat: 46.1000, lng: -71.3000, region: "Québec / Chaudière-Appalaches" },
  "Saint-Nicolas":     { lat: 46.7000, lng: -71.3667, region: "Québec / Chaudière-Appalaches" },
  "Saint-Romuald":     { lat: 46.7500, lng: -71.2333, region: "Québec / Chaudière-Appalaches" },
  "Charny":            { lat: 46.7167, lng: -71.2667, region: "Québec / Chaudière-Appalaches" },
  "L'Ancienne-Lorette": { lat: 46.8000, lng: -71.3500, region: "Québec / Chaudière-Appalaches" },
  "Cap-Rouge":         { lat: 46.7500, lng: -71.3500, region: "Québec / Chaudière-Appalaches" },
  "Boischatel":        { lat: 46.9000, lng: -71.1333, region: "Québec / Chaudière-Appalaches" },
  "Chateau-Richer":    { lat: 46.9667, lng: -70.9833, region: "Québec / Chaudière-Appalaches" },
  "Sainte-Anne-de-Beaupre": { lat: 47.0167, lng: -70.9333, region: "Québec / Chaudière-Appalaches" },
  "Baie-Saint-Paul":   { lat: 47.4425, lng: -70.4956, region: "Québec / Chaudière-Appalaches" },
  "La Malbaie":        { lat: 47.6547, lng: -70.1517, region: "Québec / Chaudière-Appalaches" },
  "Montmagny":         { lat: 46.9781, lng: -70.5544, region: "Québec / Chaudière-Appalaches" },
  "Sainte-Marie":      { lat: 46.4500, lng: -71.0167, region: "Québec / Chaudière-Appalaches" },
  "Beauceville":       { lat: 46.2167, lng: -70.7833, region: "Québec / Chaudière-Appalaches" },
  "Plessisville":      { lat: 46.2167, lng: -71.7833, region: "Québec / Chaudière-Appalaches" },

  // ─── Outaouais ────────────────────────────────────
  "Gatineau":          { lat: 45.4765, lng: -75.7013, region: "Outaouais" },
  "Hull":              { lat: 45.4300, lng: -75.7200, region: "Outaouais" },
  "Aylmer":            { lat: 45.3833, lng: -75.8333, region: "Outaouais" },

  // ─── Estrie ───────────────────────────────────────
  // (Note: Granby et Cowansville sont administrativement en Montérégie mais
  // souvent perçus comme "région Estrie/Cantons de l'Est" côté marché immo.)
  "Sherbrooke":        { lat: 45.4000, lng: -71.9000, region: "Estrie" },
  "Magog":             { lat: 45.2667, lng: -72.1500, region: "Estrie" },
  "Bromont":           { lat: 45.3167, lng: -72.6500, region: "Estrie" },
  "Coaticook":         { lat: 45.1333, lng: -71.8000, region: "Estrie" },
  "Waterloo":          { lat: 45.3500, lng: -72.5167, region: "Estrie" },
  "Lac-Megantic":      { lat: 45.5825, lng: -70.8792, region: "Estrie" },
  "Windsor":           { lat: 45.5667, lng: -71.9833, region: "Estrie" },
  "East Angus":        { lat: 45.4833, lng: -71.6667, region: "Estrie" },
  "Asbestos":          { lat: 45.7667, lng: -71.9333, region: "Estrie" },
  "Val-des-Sources":   { lat: 45.7667, lng: -71.9333, region: "Estrie" },
  "Granby":            { lat: 45.4000, lng: -72.7333, region: "Montérégie" },

  // ─── Laurentides ──────────────────────────────────
  "Sainte-Agathe-des-Monts":  { lat: 46.0500, lng: -74.2833, region: "Laurentides" },
  "Mont-Tremblant":    { lat: 46.2117, lng: -74.5833, region: "Laurentides" },
  "Sainte-Adele":      { lat: 45.9500, lng: -74.1333, region: "Laurentides" },
  "Val-David":         { lat: 46.0333, lng: -74.2167, region: "Laurentides" },
  "Saint-Sauveur":     { lat: 45.9000, lng: -74.1833, region: "Laurentides" },
  "Piedmont":          { lat: 45.9000, lng: -74.1333, region: "Laurentides" },
  "Prevost":           { lat: 45.8667, lng: -74.0833, region: "Laurentides" },
  "Morin-Heights":     { lat: 45.9000, lng: -74.2333, region: "Laurentides" },
  "Sainte-Anne-des-Lacs": { lat: 45.8500, lng: -74.1333, region: "Laurentides" },
  "Val-Morin":         { lat: 45.9833, lng: -74.2000, region: "Laurentides" },
  "Sainte-Marguerite-du-Lac-Masson": { lat: 46.0333, lng: -74.0833, region: "Laurentides" },
  "Estérel":           { lat: 46.0500, lng: -74.0833, region: "Laurentides" },
  "Labelle":           { lat: 46.2833, lng: -74.7333, region: "Laurentides" },
  "La Conception":     { lat: 46.2000, lng: -74.7000, region: "Laurentides" },
  "Lac-Superieur":     { lat: 46.2333, lng: -74.4667, region: "Laurentides" },
  "Lachute":           { lat: 45.6500, lng: -74.3333, region: "Laurentides" },
  "Mont-Laurier":      { lat: 46.5556, lng: -75.5008, region: "Laurentides" },
  "Riviere-Rouge":     { lat: 46.4167, lng: -74.9000, region: "Laurentides" },
  "Sainte-Sophie":     { lat: 45.8000, lng: -74.0000, region: "Laurentides" },
  "Sainte-Anne-des-Plaines": { lat: 45.7583, lng: -73.8125, region: "Laurentides" },

  // ─── Lanaudière ───────────────────────────────────
  "Joliette":          { lat: 46.0167, lng: -73.4333, region: "Lanaudière" },
  "Rawdon":            { lat: 46.0500, lng: -73.7167, region: "Lanaudière" },
  "L'Assomption":      { lat: 45.8333, lng: -73.4167, region: "Lanaudière" },
  "Saint-Charles-Borromee": { lat: 46.0500, lng: -73.4667, region: "Lanaudière" },
  "Saint-Lin-Laurentides": { lat: 45.8500, lng: -73.7667, region: "Lanaudière" },
  "Berthierville":     { lat: 46.0833, lng: -73.1833, region: "Lanaudière" },
  "Sainte-Julienne":   { lat: 45.9667, lng: -73.7167, region: "Lanaudière" },
  "Saint-Felix-de-Valois": { lat: 46.1667, lng: -73.4167, region: "Lanaudière" },

  // ─── Montérégie ───────────────────────────────────
  "Saint-Hyacinthe":   { lat: 45.6333, lng: -72.9500, region: "Montérégie" },
  "Saint-Jean-sur-Richelieu": { lat: 45.3167, lng: -73.2667, region: "Montérégie" },
  "Sorel-Tracy":       { lat: 46.0333, lng: -73.1167, region: "Montérégie" },
  "Beloeil":           { lat: 45.5667, lng: -73.2000, region: "Montérégie" },
  "Salaberry-de-Valleyfield": { lat: 45.2500, lng: -74.1333, region: "Montérégie" },
  "Candiac":           { lat: 45.3833, lng: -73.5167, region: "Montérégie" },
  "La Prairie":        { lat: 45.4167, lng: -73.5000, region: "Montérégie" },
  "Delson":            { lat: 45.3667, lng: -73.5333, region: "Montérégie" },
  "Saint-Basile-le-Grand": { lat: 45.5333, lng: -73.2833, region: "Montérégie" },
  "McMasterville":     { lat: 45.5500, lng: -73.2333, region: "Montérégie" },
  "Otterburn Park":    { lat: 45.5333, lng: -73.2167, region: "Montérégie" },
  "Mont-Saint-Hilaire": { lat: 45.5667, lng: -73.1833, region: "Montérégie" },
  "Marieville":        { lat: 45.4333, lng: -73.1667, region: "Montérégie" },
  "Farnham":           { lat: 45.2833, lng: -72.9833, region: "Montérégie" },
  "Sutton":            { lat: 45.1000, lng: -72.6167, region: "Montérégie" },
  "Bedford":           { lat: 45.1167, lng: -72.9833, region: "Montérégie" },
  "Saint-Remi":        { lat: 45.2667, lng: -73.6167, region: "Montérégie" },
  "Napierville":       { lat: 45.1833, lng: -73.4000, region: "Montérégie" },
  "Saint-Amable":      { lat: 45.6500, lng: -73.3000, region: "Montérégie" },
  "Vercheres":         { lat: 45.7833, lng: -73.3500, region: "Montérégie" },
  "Contrecoeur":       { lat: 45.8500, lng: -73.2333, region: "Montérégie" },
  "Cowansville":       { lat: 45.2000, lng: -72.7500, region: "Montérégie" },

  // ─── Mauricie ─────────────────────────────────────
  "Trois-Rivieres":    { lat: 46.3432, lng: -72.5432, region: "Mauricie" },
  "Shawinigan":        { lat: 46.5667, lng: -72.7500, region: "Mauricie" },

  // ─── Centre-du-Québec ─────────────────────────────
  "Drummondville":     { lat: 45.8833, lng: -72.4833, region: "Centre-du-Québec" },
  "Victoriaville":     { lat: 46.0500, lng: -71.9667, region: "Centre-du-Québec" },

  // ─── Saguenay-Lac-Saint-Jean ──────────────────────
  "Saguenay":          { lat: 48.4283, lng: -71.0682, region: "Saguenay–Lac-Saint-Jean" },
  "Chicoutimi":        { lat: 48.4283, lng: -71.0682, region: "Saguenay–Lac-Saint-Jean" },
  "Jonquiere":         { lat: 48.4167, lng: -71.2500, region: "Saguenay–Lac-Saint-Jean" },
  "Alma":              { lat: 48.5500, lng: -71.6500, region: "Saguenay–Lac-Saint-Jean" },

  // ─── Bas-Saint-Laurent ────────────────────────────
  "Rimouski":          { lat: 48.4489, lng: -68.5236, region: "Bas-Saint-Laurent" },
  "Riviere-du-Loup":   { lat: 47.8333, lng: -69.5333, region: "Bas-Saint-Laurent" },

  // ─── Côte-Nord ────────────────────────────────────
  "Sept-Iles":         { lat: 50.2000, lng: -66.3833, region: "Côte-Nord" },
  "Baie-Comeau":       { lat: 49.2167, lng: -68.1500, region: "Côte-Nord" },

  // ─── Gaspésie ─────────────────────────────────────
  "Gaspe":             { lat: 48.8333, lng: -64.4833, region: "Gaspésie" },

  // ─── Abitibi-Témiscamingue ────────────────────────
  "Rouyn-Noranda":     { lat: 48.2333, lng: -79.0167, region: "Abitibi-Témiscamingue" },
  "Val-d'Or":          { lat: 48.1000, lng: -77.7833, region: "Abitibi-Témiscamingue" },
};

// Normalise pour matching insensible à la casse/aux accents.
export const normalizeCityName = (raw: string): string =>
  raw.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

// Index rapide : nom normalisé → coords
const INDEX: Record<string, CityCoords> = Object.fromEntries(
  Object.entries(RAW).map(([name, coords]) => [normalizeCityName(name), coords]),
);

export function lookupCityCoords(cityName: string | null | undefined): CityCoords | null {
  if (!cityName) return null;
  return INDEX[normalizeCityName(cityName)] ?? null;
}

// Liste sortée pour un autocomplete éventuel.
export const KNOWN_QUEBEC_CITIES = Object.keys(RAW).sort((a, b) => a.localeCompare(b, "fr"));

// Centre de gravité pour la carte (sud-ouest, où sont ~95 % des clients courtiers).
export const QUEBEC_MAP_CENTER: [number, number] = [46.3, -72.5];
export const QUEBEC_MAP_ZOOM = 6;
