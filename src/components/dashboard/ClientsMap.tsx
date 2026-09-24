import { useMemo, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { Client } from "@/integrations/supabase/client";
import { canonicalizeIndustry, INDUSTRY_CATEGORIES, OTHER_CATEGORY, UNSPECIFIED_CATEGORY, type IndustryCategory } from "@/lib/industry-categories";
import { QUEBEC_MAP_CENTER, QUEBEC_MAP_ZOOM } from "@/data/quebec-cities";
import { MapPin } from "lucide-react";

// Esri World Street Map — pas de clé requise, licence "attribution" OK pour dashboards internes.
const ESRI_URL = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}";
const ESRI_ATTR = 'Tiles © Esri';

type MapClient = Client & { latitude: number; longitude: number };

export function ClientsMap({ clients }: { clients: Client[] }) {
  // Ne garde que les clients géolocalisés + actifs (pipeline/perdu = pas dans la carte)
  const geoClients = useMemo<MapClient[]>(
    () => clients.filter((c): c is MapClient =>
      c.status === "active" && c.latitude != null && c.longitude != null,
    ),
    [clients],
  );

  // Groupe par catégorie pour la légende
  const byCategory = useMemo(() => {
    const map = new Map<string, { cat: IndustryCategory; clients: MapClient[] }>();
    for (const c of geoClients) {
      const cat = canonicalizeIndustry(c.industry);
      const bucket = map.get(cat.key) ?? { cat, clients: [] };
      bucket.clients.push(c);
      map.set(cat.key, bucket);
    }
    return Array.from(map.values()).sort((a, b) => b.clients.length - a.clients.length);
  }, [geoClients]);

  // Filtre actif — null = tout afficher
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const visible = activeCat
    ? geoClients.filter((c) => canonicalizeIndustry(c.industry).key === activeCat)
    : geoClients;

  // Nb de clients actifs sans coords → invitation à ajouter la ville
  const missingCoords = clients.filter(
    (c) => c.status === "active" && (c.latitude == null || c.longitude == null),
  ).length;

  return (
    <div className="rounded-2xl border border-border/40 bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border/30">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
            📍 Répartition géographique
          </p>
          <p className="text-sm font-semibold text-foreground mt-0.5">
            {visible.length} client{visible.length > 1 ? "s" : ""} sur la carte
            {activeCat && (
              <span className="text-muted-foreground font-normal">
                {" · "}filtre : {(byCategory.find(b => b.cat.key === activeCat)?.cat.label ?? "")}
                <button onClick={() => setActiveCat(null)} className="ml-2 text-primary underline text-xs">
                  effacer
                </button>
              </span>
            )}
          </p>
        </div>
        {missingCoords > 0 && (
          <p className="text-[10px] text-muted-foreground text-right leading-tight max-w-[180px]">
            {missingCoords} client{missingCoords > 1 ? "s" : ""} actif{missingCoords > 1 ? "s" : ""} sans ville renseignée — ajoute-la dans le formulaire.
          </p>
        )}
      </div>

      {/* Map */}
      <div className="h-[320px] w-full relative">
        <MapContainer
          center={QUEBEC_MAP_CENTER}
          zoom={QUEBEC_MAP_ZOOM}
          scrollWheelZoom
          className="h-full w-full"
          // z-index bas pour rester sous les dropdowns/dialogs (shadcn utilise z-50)
          style={{ zIndex: 0 }}
        >
          <TileLayer url={ESRI_URL} attribution={ESRI_ATTR} />
          {visible.map((c) => {
            const cat = canonicalizeIndustry(c.industry);
            return (
              <CircleMarker
                key={c.id}
                center={[c.latitude, c.longitude]}
                radius={8}
                pathOptions={{
                  color: cat.color,
                  fillColor: cat.color,
                  fillOpacity: 0.75,
                  weight: 2,
                }}
              >
                <Popup>
                  <div className="space-y-1 min-w-[160px]">
                    <p className="font-semibold text-sm">{c.name}</p>
                    <p className="text-xs" style={{ color: cat.color }}>
                      {cat.emoji} {cat.label}
                    </p>
                    {c.city && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {c.city}
                      </p>
                    )}
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>

      {/* Legend — cliquable pour filtrer */}
      {byCategory.length > 0 && (
        <div className="px-5 py-3 border-t border-border/30 flex flex-wrap gap-2">
          {byCategory.map(({ cat, clients: cs }) => {
            const isActive = activeCat === cat.key;
            const isDimmed = activeCat && !isActive;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => setActiveCat(isActive ? null : cat.key)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                  isActive
                    ? "border-transparent text-white"
                    : isDimmed
                    ? "border-border/40 bg-muted/20 text-muted-foreground opacity-50"
                    : "border-border/60 bg-background/40 text-foreground hover:border-foreground/40"
                }`}
                style={isActive ? { backgroundColor: cat.color, borderColor: cat.color } : undefined}
              >
                <span
                  className="inline-block w-2 h-2 rounded-full"
                  style={{ backgroundColor: cat.color }}
                />
                <span>{cat.emoji}</span>
                <span>{cat.label}</span>
                <span className={`tabular-nums ${isActive ? "opacity-90" : "text-muted-foreground"}`}>
                  {cs.length}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
