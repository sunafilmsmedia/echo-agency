import { useMemo } from "react";
import { useClients } from "@/hooks/useClients";
import { ClientsMap } from "@/components/dashboard/ClientsMap";
import { lookupCityCoords, type QcRegion } from "@/data/quebec-cities";
import { canonicalizeIndustry } from "@/lib/industry-categories";
import { formatCurrency } from "@/lib/utils";
import { MapPin, Users, DollarSign, AlertCircle } from "lucide-react";
import type { Client } from "@/integrations/supabase/client";

type RegionBucket = {
  region: QcRegion | "Non localisé";
  clients: Client[];
  cities: Set<string>;
  mrr: number;
};

export function SecteursTab() {
  const { data: clients = [], isLoading } = useClients();

  const activeClients = useMemo(
    () => clients.filter((c) => c.status === "active"),
    [clients],
  );

  const regions = useMemo(() => {
    const buckets = new Map<string, RegionBucket>();

    for (const c of activeClients) {
      const coords = lookupCityCoords(c.city);
      const region: RegionBucket["region"] = coords?.region ?? "Non localisé";
      const b = buckets.get(region) ?? {
        region, clients: [], cities: new Set<string>(), mrr: 0,
      };
      b.clients.push(c);
      if (c.city) b.cities.add(c.city);
      b.mrr += c.monthly_recurring_revenue ?? 0;
      buckets.set(region, b);
    }

    return Array.from(buckets.values()).sort((a, b) => {
      // "Non localisé" en dernier peu importe le nombre
      if (a.region === "Non localisé") return 1;
      if (b.region === "Non localisé") return -1;
      return b.clients.length - a.clients.length;
    });
  }, [activeClients]);

  const total = activeClients.length;
  const localized = activeClients.filter((c) => lookupCityCoords(c.city)).length;
  const totalMrr = activeClients.reduce((s, c) => s + (c.monthly_recurring_revenue ?? 0), 0);

  if (isLoading) return <div className="p-6 text-muted-foreground text-sm">Chargement...</div>;

  return (
    <div className="p-6 space-y-6">
      {/* Hero — totaux */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-2xl border border-border/40 bg-card p-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
            <Users className="w-3 h-3" /> Clients actifs
          </p>
          <p className="text-3xl font-bold text-foreground tabular-nums">{total}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {localized}/{total} géolocalisés
          </p>
        </div>
        <div className="rounded-2xl border border-border/40 bg-card p-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
            <MapPin className="w-3 h-3" /> Régions couvertes
          </p>
          <p className="text-3xl font-bold text-foreground tabular-nums">
            {regions.filter((r) => r.region !== "Non localisé").length}
          </p>
          <p className="text-xs text-muted-foreground mt-1">sur 14 régions du Québec</p>
        </div>
        <div className="rounded-2xl border border-border/40 bg-card p-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
            <DollarSign className="w-3 h-3" /> MRR géolocalisé
          </p>
          <p className="text-3xl font-bold text-emerald-400 tabular-nums">
            {formatCurrency(totalMrr)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">portefeuille actif</p>
        </div>
      </div>

      {/* Carte principale */}
      <ClientsMap clients={clients} />

      {/* Breakdown par région */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Répartition par région administrative</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {regions.map((r) => {
            const isUnknown = r.region === "Non localisé";
            const pct = total > 0 ? Math.round((r.clients.length / total) * 100) : 0;

            // Répartition par industrie dans cette région
            const industryBreakdown = new Map<string, { label: string; emoji: string; color: string; count: number }>();
            for (const c of r.clients) {
              const cat = canonicalizeIndustry(c.industry);
              const entry = industryBreakdown.get(cat.key) ?? { label: cat.label, emoji: cat.emoji, color: cat.color, count: 0 };
              entry.count++;
              industryBreakdown.set(cat.key, entry);
            }
            const industries = Array.from(industryBreakdown.values()).sort((a, b) => b.count - a.count);

            return (
              <div
                key={r.region}
                className={`rounded-2xl border p-4 space-y-3 ${
                  isUnknown
                    ? "border-amber-500/40 bg-amber-500/[0.04]"
                    : "border-border/40 bg-card"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold truncate flex items-center gap-1.5 ${isUnknown ? "text-amber-500" : "text-foreground"}`}>
                      {isUnknown && <AlertCircle className="w-3.5 h-3.5" />}
                      {r.region}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {r.cities.size > 0 ? `${r.cities.size} ville${r.cities.size > 1 ? "s" : ""}` : "ville non renseignée"}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-2xl font-bold tabular-nums text-foreground">{r.clients.length}</p>
                    <p className="text-[10px] text-muted-foreground">{pct}%</p>
                  </div>
                </div>

                {/* Villes */}
                {r.cities.size > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {Array.from(r.cities).sort().map((city) => (
                      <span key={city} className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted/30 text-muted-foreground border border-border/40">
                        {city}
                      </span>
                    ))}
                  </div>
                )}

                {/* Industries dans cette région */}
                {industries.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border/30">
                    {industries.map((ind) => (
                      <span
                        key={ind.label}
                        className="text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-1 border"
                        style={{
                          color: ind.color,
                          borderColor: `${ind.color}55`,
                          backgroundColor: `${ind.color}10`,
                        }}
                      >
                        <span>{ind.emoji}</span>
                        <span className="font-medium">{ind.count}</span>
                      </span>
                    ))}
                  </div>
                )}

                {/* MRR de la région */}
                {r.mrr > 0 && (
                  <div className="text-xs text-emerald-400 font-semibold pt-1">
                    {formatCurrency(r.mrr)}/mois
                  </div>
                )}

                {isUnknown && (
                  <p className="text-[10px] text-amber-500/80 leading-relaxed">
                    Édite ces clients pour ajouter leur ville — ils apparaîtront ensuite sur la carte.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
