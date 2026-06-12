import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Lock, ArrowRight, LogOut, ExternalLink, DollarSign,
  FolderOpen, Lightbulb, Send, User, Sparkles, Calendar as CalendarIcon, Loader2,
  Eye, Target, Trophy, TrendingUp, Wand2, BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase, type AgencySettings, type Client, type ClientJournalEntry } from "@/integrations/supabase/client";
import { useResolveAccessCode, useClientJournal, useAddJournalEntry } from "@/hooks/usePortal";

const SESSION_KEY = "client_portal_session"; // stores access code only

// ── KPI sync helper (still localStorage-backed — kept as-is) ──────────────────

interface KpiSync {
  avgViews: number | null;
  monthsTracked: number;
  latest: number | null;
  previous: number | null;
}

function computeKpiSync(clientId: string, monthsBack = 3): KpiSync {
  const now = new Date();
  const values: { y: number; m: number; views: number }[] = [];
  for (let i = 0; i < monthsBack; i++) {
    let m = now.getMonth() + 1 - i;
    let y = now.getFullYear();
    while (m < 1) { m += 12; y--; }
    try {
      const raw = localStorage.getItem(`kpi_${y}_${String(m).padStart(2, "0")}`);
      if (raw) {
        const data = JSON.parse(raw);
        const row = data?.[clientId];
        if (row?.views != null) values.push({ y, m, views: row.views });
      }
    } catch {}
  }
  if (values.length === 0) return { avgViews: null, monthsTracked: 0, latest: null, previous: null };
  const avg = Math.round(values.reduce((a, b) => a + b.views, 0) / values.length);
  return { avgViews: avg, monthsTracked: values.length, latest: values[0]?.views ?? null, previous: values[1]?.views ?? null };
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function ClientPortal() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [code, setCode] = useState<string | null>(null);

  useEffect(() => {
    const urlCode = params.get("code");
    if (urlCode) {
      const upper = urlCode.toUpperCase();
      setCode(upper);
      localStorage.setItem(SESSION_KEY, upper);
      return;
    }
    const saved = localStorage.getItem(SESSION_KEY);
    if (saved) setCode(saved.toUpperCase());
  }, [params]);

  const { data: snapshot, isLoading, error } = useResolveAccessCode(code);

  const handleLogout = () => {
    localStorage.removeItem(SESSION_KEY);
    setCode(null);
  };

  if (code && isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (code && (!snapshot || error)) {
    // Code invalid — clear and show login
    localStorage.removeItem(SESSION_KEY);
    return <LoginScreen onSubmit={(c) => { setCode(c); localStorage.setItem(SESSION_KEY, c); }} />;
  }

  if (!snapshot) {
    return <LoginScreen onSubmit={(c) => { setCode(c); localStorage.setItem(SESSION_KEY, c); }} />;
  }

  return <PortalView client={snapshot.client} agency={snapshot.agency} onLogout={handleLogout} />;
}

// ── Login screen ──────────────────────────────────────────────────────────────

function LoginScreen({ onSubmit }: { onSubmit: (code: string) => void }) {
  const [input, setInput]     = useState("");
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!input.trim()) return;
    setError("");
    setLoading(true);
    const upper = input.trim().toUpperCase();
    const { data } = await supabase
      .from("client_portal_codes")
      .select("access_code")
      .eq("access_code", upper)
      .maybeSingle();
    setLoading(false);
    if (!data) {
      setError("Code introuvable. Vérifie avec ton agence.");
      return;
    }
    onSubmit(upper);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
      <div className="fixed inset-0 bg-gradient-glow pointer-events-none" />
      <div className="relative w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/15 flex items-center justify-center">
            <Lock className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Portail client</h1>
          <p className="text-sm text-muted-foreground">Entre le code d'accès fourni par ton agence</p>
        </div>
        <div className="rounded-2xl border border-border/50 bg-card p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Code d'accès</label>
            <Input
              autoFocus
              placeholder="ABC123"
              value={input}
              onChange={(e) => { setInput(e.target.value.toUpperCase()); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              className="text-center font-mono text-lg tracking-widest uppercase h-12"
              maxLength={8}
            />
            {error && <p className="text-xs text-rose-400">{error}</p>}
          </div>
          <Button onClick={handleSubmit} disabled={loading || !input.trim()} className="w-full h-11 shadow-glow">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Accéder à mon portail <ArrowRight className="w-4 h-4 ml-1" /></>}
          </Button>
        </div>
        <p className="text-center text-xs text-muted-foreground">Pas de code? Demande-le à ton agence.</p>
      </div>
    </div>
  );
}

// ── Portal view ───────────────────────────────────────────────────────────────

function PortalView({ client, agency, onLogout }: { client: Client; agency: AgencySettings; onLogout: () => void }) {
  const monthlyFee     = client.monthly_recurring_revenue ?? 0;
  const monthlyViews   = (client as any).monthly_views ?? undefined;
  const costPerLead    = (client as any).cost_per_lead ?? undefined;
  const driveUrl       = client.google_drive_url ?? undefined;
  const scriptGptUrl   = agency.script_gpt_url ?? undefined;
  const brandGuideUrl  = agency.brand_guide_url ?? undefined;
  const agencyName     = agency.name;
  const agencyColor    = agency.color;

  const { data: entries = [] } = useClientJournal(client.id);
  const addEntry = useAddJournalEntry();
  const [newEntry, setNewEntry] = useState("");

  // KPI sync (still localStorage)
  const kpi = useMemo(() => computeKpiSync(client.id, 3), [client.id]);
  const displayedViews = kpi.avgViews ?? monthlyViews ?? null;
  const viewsFromKpi   = kpi.avgViews !== null;
  const trendPct = (kpi.latest !== null && kpi.previous !== null && kpi.previous > 0)
    ? Math.round(((kpi.latest - kpi.previous) / kpi.previous) * 100)
    : null;

  const todayKey = new Date().toISOString().split("T")[0];

  const submitEntry = () => {
    if (!newEntry.trim()) return;
    addEntry.mutate(
      { client_id: client.id, content: newEntry.trim(), author: "client" },
      { onSuccess: () => setNewEntry("") },
    );
  };

  // Group entries by date (using entry_date)
  const grouped = useMemo(() => {
    const map = new Map<string, ClientJournalEntry[]>();
    for (const e of entries) {
      const key = e.entry_date;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return Array.from(map.entries()).sort(([a], [b]) => b.localeCompare(a));
  }, [entries]);

  const formatDate = (iso: string) => {
    if (iso === todayKey) return "Aujourd'hui";
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (iso === yesterday.toISOString().split("T")[0]) return "Hier";
    const [y, mo, d] = iso.split("-").map(Number);
    const dt = new Date(y, mo - 1, d);
    return dt.toLocaleDateString("fr-CA", { weekday: "long", day: "numeric", month: "long" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <style>{`
        .acc-c { color: ${agencyColor}; }
        .acc-bg { background-color: ${agencyColor}; }
        .acc-bg-soft { background-color: ${agencyColor}1a; }
        .acc-border { border-color: ${agencyColor}66; }
      `}</style>

      <div className="fixed inset-0 bg-gradient-glow pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 border-b border-border/40 bg-background/80 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl acc-bg flex items-center justify-center">
              <span className="text-sm font-bold text-white">{client.name.charAt(0)}</span>
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">{client.name}</p>
              <p className="text-[11px] text-muted-foreground">Portail · powered by {agencyName}</p>
            </div>
          </div>
          <button onClick={onLogout} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <LogOut className="w-3.5 h-3.5" /> Se déconnecter
          </button>
        </div>
      </header>

      <main className="relative z-10 max-w-4xl mx-auto px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Bonjour, {client.name.split(" ")[0]} 👋</h1>
          <p className="text-sm text-muted-foreground mt-1">Voici ton espace personnel avec {agencyName}</p>
        </div>

        {/* 3 stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-border/50 bg-card p-5 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg acc-bg-soft flex items-center justify-center">
                <DollarSign className="w-4 h-4 acc-c" />
              </div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Forfait mensuel</p>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-foreground">${monthlyFee.toLocaleString("fr-CA")}</span>
              <span className="text-xs text-muted-foreground">/mois</span>
            </div>
          </div>

          <div className="rounded-2xl border border-border/50 bg-card p-5 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg acc-bg-soft flex items-center justify-center">
                <Eye className="w-4 h-4 acc-c" />
              </div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex-1">Vues moyennes / mois</p>
              {viewsFromKpi && (
                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                  style={{ background: `${agencyColor}1a`, color: agencyColor }}>
                  <Trophy className="w-2.5 h-2.5 inline mr-0.5" /> KPI
                </span>
              )}
            </div>
            {displayedViews !== null ? (
              <>
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-2xl font-bold text-foreground">{displayedViews.toLocaleString("fr-CA")}</span>
                  {trendPct !== null && trendPct !== 0 && (
                    <span className={`text-[10px] font-semibold ${trendPct > 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      <TrendingUp className={`w-2.5 h-2.5 inline ${trendPct < 0 ? "rotate-180" : ""}`} />
                      {trendPct > 0 ? "+" : ""}{trendPct}%
                    </span>
                  )}
                </div>
              </>
            ) : (
              <p className="text-xs text-muted-foreground italic">Données en attente</p>
            )}
          </div>

          <div className="rounded-2xl border border-border/50 bg-card p-5 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg acc-bg-soft flex items-center justify-center">
                <Target className="w-4 h-4 acc-c" />
              </div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Coût par lead moyen</p>
            </div>
            {costPerLead !== undefined && costPerLead !== null ? (
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-foreground">${Number(costPerLead).toFixed(2)}</span>
                <span className="text-xs text-muted-foreground">/ lead</span>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">Données en attente</p>
            )}
          </div>
        </div>

        {/* Resources — 3 cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Drive */}
          <div className="rounded-2xl border border-border/50 bg-card p-5 space-y-3 flex flex-col">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg acc-bg-soft flex items-center justify-center">
                <FolderOpen className="w-4 h-4 acc-c" />
              </div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tes vidéos & ressources</p>
            </div>
            <p className="text-sm text-foreground flex-1">Accède à toutes tes vidéos finalisées sur Google Drive.</p>
            {driveUrl ? (
              <a href={driveUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 acc-c text-sm font-semibold hover:underline">
                Ouvrir mon dossier Drive <ExternalLink className="w-3.5 h-3.5" />
              </a>
            ) : (
              <p className="text-xs text-muted-foreground italic">Ton agence n'a pas encore configuré ton dossier.</p>
            )}
          </div>

          {/* Script GPT */}
          <div className="rounded-2xl border acc-border bg-card p-5 space-y-3 flex flex-col"
            style={{ background: `linear-gradient(135deg, ${agencyColor}08, transparent)` }}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg acc-bg-soft flex items-center justify-center">
                <Wand2 className="w-4 h-4 acc-c" />
              </div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Machine à scripts vidéo</p>
            </div>
            <p className="text-sm text-foreground flex-1">
              On te partage les idées dans ton carnet — utilise ce GPT pour les scripter quand tu veux participer.
            </p>
            {scriptGptUrl ? (
              <a href={scriptGptUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg acc-bg text-white text-sm font-semibold hover:opacity-90 transition-opacity self-start">
                <Wand2 className="w-3.5 h-3.5" />
                Ouvrir la machine à scripts
                <ExternalLink className="w-3 h-3 opacity-80" />
              </a>
            ) : (
              <p className="text-xs text-muted-foreground italic">Ton agence n'a pas encore configuré cette section.</p>
            )}
          </div>

          {/* Brand guide */}
          <div className="rounded-2xl border acc-border bg-card p-5 space-y-3 flex flex-col"
            style={{ background: `linear-gradient(135deg, ${agencyColor}08, transparent)` }}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg acc-bg-soft flex items-center justify-center">
                <BookOpen className="w-4 h-4 acc-c" />
              </div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Guide privé</p>
            </div>
            <p className="text-sm text-foreground flex-1">
              Notre guide exclusif pour nos clients — stratégies, frameworks et meilleures pratiques pour construire ta marque.
            </p>
            {brandGuideUrl ? (
              <a href={brandGuideUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg acc-bg text-white text-sm font-semibold hover:opacity-90 transition-opacity self-start">
                <BookOpen className="w-3.5 h-3.5" />
                Lire le guide
                <ExternalLink className="w-3 h-3 opacity-80" />
              </a>
            ) : (
              <p className="text-xs text-muted-foreground italic">Ton agence n'a pas encore configuré cette section.</p>
            )}
          </div>
        </div>

        {/* Journal */}
        <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border/40 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 acc-c" />
            <div>
              <h2 className="text-sm font-bold text-foreground">Carnet d'idées partagé</h2>
              <p className="text-[11px] text-muted-foreground">Ajoute des idées, updates, retours — {agencyName} les voit et y répond.</p>
            </div>
          </div>

          <div className="px-5 py-4 border-b border-border/40 bg-muted/20">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full acc-bg flex items-center justify-center flex-shrink-0">
                <User className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="flex-1 space-y-2">
                <textarea
                  value={newEntry}
                  onChange={(e) => setNewEntry(e.target.value)}
                  placeholder="Une idée, un update, une vie qui s'est passée aujourd'hui…"
                  className="w-full bg-background border border-border/50 rounded-lg p-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/50 resize-none"
                  rows={2}
                />
                <div className="flex justify-end">
                  <Button onClick={submitEntry} disabled={!newEntry.trim() || addEntry.isPending} size="sm" className="acc-bg text-white border-0 hover:opacity-90 gap-1.5">
                    {addEntry.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <><Send className="w-3.5 h-3.5" /> Publier</>}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="divide-y divide-border/30">
            {grouped.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-muted-foreground">
                Aucune entrée pour l'instant. Partage ta première idée!
              </div>
            ) : (
              grouped.map(([date, dayEntries]) => (
                <div key={date} className="px-5 py-4">
                  <div className="flex items-center gap-2 mb-3">
                    <CalendarIcon className="w-3.5 h-3.5 text-muted-foreground" />
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{formatDate(date)}</p>
                  </div>
                  <div className="space-y-3">
                    {dayEntries.map(entry => (
                      <JournalEntryRow key={entry.id} entry={entry} agencyName={agencyName} agencyColor={agencyColor} />
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <p className="text-center text-[10px] text-muted-foreground">
          Portail propulsé par <span className="font-semibold text-foreground">Echo</span>
        </p>
      </main>
    </div>
  );
}

function JournalEntryRow({ entry, agencyName, agencyColor }: {
  entry: ClientJournalEntry; agencyName: string; agencyColor: string;
}) {
  const isClient = entry.author === "client";
  const time = new Date(entry.created_at).toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: isClient ? agencyColor : `${agencyColor}1a` }}>
        {isClient ? (
          <User className="w-3.5 h-3.5 text-white" />
        ) : (
          <Sparkles className="w-3.5 h-3.5" style={{ color: agencyColor }} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-xs font-semibold text-foreground">{isClient ? "Toi" : agencyName}</span>
          <span className="text-[10px] text-muted-foreground">{time}</span>
          {!isClient && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wider"
              style={{ background: `${agencyColor}1a`, color: agencyColor }}>
              Agence
            </span>
          )}
        </div>
        <div className={`rounded-xl p-3 text-sm leading-relaxed ${isClient ? "bg-muted/40 text-foreground" : "border"}`}
          style={!isClient ? { background: `${agencyColor}0a`, borderColor: `${agencyColor}33`, color: "var(--foreground)" } : {}}>
          {entry.content}
        </div>
      </div>
    </div>
  );
}
