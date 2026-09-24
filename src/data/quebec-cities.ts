// Table interne de villes du Québec (+ quelques régions limitrophes).
// Coordonnées WGS84 (lat, lng) — utilisées pour placer les points sur la carte.
// Ajouter une ville ici est instantané et évite tout appel à une API externe.
//
// Match par normalisation (lowercase + accents supprimés + espaces trim).

export type CityCoords = { lat: number; lng: number };

const RAW: Record<string, CityCoords> = {
  // ─── Grand Montréal ───────────────────────────────
  "Montreal":          { lat: 45.5019, lng: -73.5674 },
  "Laval":             { lat: 45.6066, lng: -73.7124 },
  "Longueuil":         { lat: 45.5312, lng: -73.5182 },
  "Brossard":          { lat: 45.4581, lng: -73.4650 },
  "Boucherville":      { lat: 45.5942, lng: -73.4360 },
  "Terrebonne":        { lat: 45.6959, lng: -73.6362 },
  "Repentigny":        { lat: 45.7422, lng: -73.4501 },
  "Mascouche":         { lat: 45.7500, lng: -73.6000 },
  "Blainville":        { lat: 45.6667, lng: -73.8833 },
  "Boisbriand":        { lat: 45.6167, lng: -73.8333 },
  "Saint-Jerome":      { lat: 45.7804, lng: -74.0034 },
  "Saint-Bruno-de-Montarville": { lat: 45.5330, lng: -73.3495 },
  "Saint-Hubert":      { lat: 45.4952, lng: -73.4197 },
  "Saint-Lambert":     { lat: 45.5000, lng: -73.5083 },
  "Saint-Constant":    { lat: 45.3667, lng: -73.5833 },
  "Sainte-Julie":      { lat: 45.5833, lng: -73.3333 },
  "Chambly":           { lat: 45.4442, lng: -73.2833 },
  "Vaudreuil-Dorion":  { lat: 45.4000, lng: -74.0333 },
  "Chateauguay":       { lat: 45.3833, lng: -73.7500 },
  "Mirabel":           { lat: 45.6500, lng: -74.0833 },
  "Kirkland":          { lat: 45.4500, lng: -73.8667 },
  "Pointe-Claire":     { lat: 45.4500, lng: -73.8167 },
  "Beaconsfield":      { lat: 45.4333, lng: -73.8667 },
  "Dollard-Des-Ormeaux": { lat: 45.4936, lng: -73.8225 },

  // ─── Québec / Chaudière-Appalaches ────────────────
  "Quebec":            { lat: 46.8139, lng: -71.2080 },
  "Levis":             { lat: 46.8033, lng: -71.1783 },
  "Sainte-Foy":        { lat: 46.7833, lng: -71.2833 },
  "Beauport":          { lat: 46.8833, lng: -71.1833 },
  "Charlesbourg":      { lat: 46.8500, lng: -71.2667 },
  "Saint-Georges":     { lat: 46.1167, lng: -70.6667 },
  "Thetford Mines":    { lat: 46.1000, lng: -71.3000 },

  // ─── Outaouais ────────────────────────────────────
  "Gatineau":          { lat: 45.4765, lng: -75.7013 },
  "Hull":              { lat: 45.4300, lng: -75.7200 },
  "Aylmer":            { lat: 45.3833, lng: -75.8333 },

  // ─── Estrie ───────────────────────────────────────
  "Sherbrooke":        { lat: 45.4000, lng: -71.9000 },
  "Magog":             { lat: 45.2667, lng: -72.1500 },
  "Granby":            { lat: 45.4000, lng: -72.7333 },
  "Bromont":           { lat: 45.3167, lng: -72.6500 },
  "Cowansville":       { lat: 45.2000, lng: -72.7500 },

  // ─── Laurentides ──────────────────────────────────
  "Sainte-Agathe-des-Monts":  { lat: 46.0500, lng: -74.2833 },
  "Mont-Tremblant":    { lat: 46.2117, lng: -74.5833 },
  "Sainte-Adele":      { lat: 45.9500, lng: -74.1333 },
  "Val-David":         { lat: 46.0333, lng: -74.2167 },

  // ─── Lanaudière ───────────────────────────────────
  "Joliette":          { lat: 46.0167, lng: -73.4333 },
  "Rawdon":            { lat: 46.0500, lng: -73.7167 },

  // ─── Montérégie ───────────────────────────────────
  "Saint-Hyacinthe":   { lat: 45.6333, lng: -72.9500 },
  "Saint-Jean-sur-Richelieu": { lat: 45.3167, lng: -73.2667 },
  "Sorel-Tracy":       { lat: 46.0333, lng: -73.1167 },
  "Beloeil":           { lat: 45.5667, lng: -73.2000 },
  "Salaberry-de-Valleyfield": { lat: 45.2500, lng: -74.1333 },

  // ─── Mauricie ─────────────────────────────────────
  "Trois-Rivieres":    { lat: 46.3432, lng: -72.5432 },
  "Shawinigan":        { lat: 46.5667, lng: -72.7500 },

  // ─── Centre-du-Québec ─────────────────────────────
  "Drummondville":     { lat: 45.8833, lng: -72.4833 },
  "Victoriaville":     { lat: 46.0500, lng: -71.9667 },

  // ─── Saguenay-Lac-Saint-Jean ──────────────────────
  "Saguenay":          { lat: 48.4283, lng: -71.0682 },
  "Chicoutimi":        { lat: 48.4283, lng: -71.0682 },
  "Jonquiere":         { lat: 48.4167, lng: -71.2500 },
  "Alma":              { lat: 48.5500, lng: -71.6500 },

  // ─── Bas-Saint-Laurent / Côte-Nord / Gaspésie ─────
  "Rimouski":          { lat: 48.4489, lng: -68.5236 },
  "Riviere-du-Loup":   { lat: 47.8333, lng: -69.5333 },
  "Sept-Iles":         { lat: 50.2000, lng: -66.3833 },
  "Gaspe":             { lat: 48.8333, lng: -64.4833 },
  "Baie-Comeau":       { lat: 49.2167, lng: -68.1500 },
  "Rouyn-Noranda":     { lat: 48.2333, lng: -79.0167 },
  "Val-d'Or":          { lat: 48.1000, lng: -77.7833 },
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
