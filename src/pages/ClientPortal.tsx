import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Lock, ArrowRight, LogOut, ExternalLink, DollarSign,
  FolderOpen, Lightbulb, Send, User, Sparkles, Calendar as CalendarIcon, Loader2,
  Eye, Target, Trophy, TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ── Types ─────────────────────────────────────────────────────────────────────

interface PortalData {
  clientId: string;
  clientName: string;
  monthlyFee: number;
  monthlyViews?: number;
  costPerLead?: number;
  driveUrl?: string;
  agencyName: string;
  agencyColor: string;
}

interface JournalEntry {
  id: string;
  date: string; // YYYY-MM-DD
  content: string;
  author: "client" | "agency";
  timestamp: number;
}

// ── localStorage helpers ──────────────────────────────────────────────────────

const SESSION_KEY = "client_portal_session";

function lookupCode(code: string): PortalData | null {
  // Demo mode
  if (code.toUpperCase() === "DEMO01") {
    return {
      clientId: "demo-client",
      clientName: "Studio Lumière",
      monthlyFee: 2_400,
      monthlyViews: 187_400,
      costPerLead: 12.40,
      driveUrl: "https://drive.google.com/drive/folders/exemple",
      agencyName: "Ton Agence",
      agencyColor: "#7c3aed",
    };
  }
  try {
    const raw = localStorage.getItem(`client_portal_${code.toUpperCase()}`);
    if (!raw) return null;
    return JSON.parse(raw) as PortalData;
  } catch { return null; }
}

function loadJournal(clientId: string): JournalEntry[] {
  try {
    const raw = localStorage.getItem(`client_journal_${clientId}`);
    return raw ? JSON.parse(raw) : seedDemoJournalIfNeeded(clientId);
  } catch { return []; }
}

function saveJournal(clientId: string, entries: JournalEntry[]) {
  localStorage.setItem(`client_journal_${clientId}`, JSON.stringify(entries));
}

// ── KPI sync — reads KPI Équipe data to compute the avg views for this client ──

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
  return {
    avgViews: avg,
    monthsTracked: values.length,
    latest: values[0]?.views ?? null,
    previous: values[1]?.views ?? null,
  };
}

function seedDemoJournalIfNeeded(clientId: string): JournalEntry[] {
  if (clientId !== "demo-client") return [];
  const today = new Date();
  const day = (offset: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() - offset);
    return d.toISOString().split("T")[0];
  };
  const entries: JournalEntry[] = [
    { id: "1", date: day(0), content: "Idée: faire une vidéo qui montre notre nouveau processus de production. Ça pourrait montrer notre savoir-faire et rassurer les nouveaux prospects.", author: "client", timestamp: Date.now() - 3_600_000 },
    { id: "2", date: day(0), content: "Super idée! Je l'ajoute au plan de contenu pour le mois prochain. On peut filmer la semaine du 8 juin si tu es dispo?", author: "agency", timestamp: Date.now() - 1_800_000 },
    { id: "3", date: day(2), content: "On a eu un client très satisfait hier qui a parlé de nous sur LinkedIn. Peut-être un témoignage en vidéo?", author: "client", timestamp: Date.now() - 200_000_000 },
    { id: "4", date: day(5), content: "Pensé à une nouvelle direction visuelle pour les Reels — plus brut, moins léché. Qu'est-ce que t'en penses?", author: "client", timestamp: Date.now() - 432_000_000 },
  ];
  saveJournal(clientId, entries);
  return entries;
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function ClientPortal() {
  const [params] = useSearchParams();
  const [session, setSession] = useState<PortalData | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);

  useEffect(() => {
    // Try URL ?code= first
    const urlCode = params.get("code");
    if (urlCode) {
      const data = lookupCode(urlCode);
      if (data) {
        setSession(data);
        localStorage.setItem(SESSION_KEY, JSON.stringify(data));
        setLoadingSession(false);
        return;
      }
    }
    // Try saved session
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) setSession(JSON.parse(raw));
    } catch {}
    setLoadingSession(false);
  }, [params]);

  const handleLogout = () => {
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
  };

  if (loadingSession) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    return <LoginScreen onLogin={(d) => {
      setSession(d);
      localStorage.setItem(SESSION_KEY, JSON.stringify(d));
    }} />;
  }

  return <PortalView session={session} onLogout={handleLogout} />;
}

// ── Login screen ──────────────────────────────────────────────────────────────

function LoginScreen({ onLogin }: { onLogin: (d: PortalData) => void }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = () => {
    if (!code.trim()) return;
    setError("");
    setLoading(true);
    setTimeout(() => {
      const data = lookupCode(code.trim());
      if (!data) {
        setError("Code introuvable. Vérifie avec ton agence.");
        setLoading(false);
        return;
      }
      onLogin(data);
    }, 400);
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
              value={code}
              onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              className="text-center font-mono text-lg tracking-widest uppercase h-12"
              maxLength={8}
            />
            {error && <p className="text-xs text-rose-400">{error}</p>}
          </div>
          <Button onClick={handleSubmit} disabled={loading || !code.trim()} className="w-full h-11 shadow-glow">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Accéder à mon portail <ArrowRight className="w-4 h-4 ml-1" /></>}
          </Button>
        </div>

        <div className="text-center text-xs text-muted-foreground space-y-1">
          <p>Pas de code? Demande-le à ton agence.</p>
          <button onClick={() => setCode("DEMO01")} className="text-primary hover:underline">
            Tester avec le code DEMO01
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Portal view ───────────────────────────────────────────────────────────────

function PortalView({ session, onLogout }: { session: PortalData; onLogout: () => void }) {
  const { clientId, clientName, monthlyFee, monthlyViews, costPerLead, driveUrl, agencyName, agencyColor } = session;
  const [entries, setEntries] = useState<JournalEntry[]>(() => loadJournal(clientId));
  const [newEntry, setNewEntry] = useState("");

  // Sync with KPI Équipe data (auto-computed avg views)
  const kpi = useMemo(() => computeKpiSync(clientId, 3), [clientId]);
  // KPI overrides static value if data exists
  const displayedViews = kpi.avgViews ?? monthlyViews ?? null;
  const viewsFromKpi   = kpi.avgViews !== null;
  const trendPct = (kpi.latest !== null && kpi.previous !== null && kpi.previous > 0)
    ? Math.round(((kpi.latest - kpi.previous) / kpi.previous) * 100)
    : null;

  const todayKey = new Date().toISOString().split("T")[0];

  const addEntry = () => {
    if (!newEntry.trim()) return;
    const entry: JournalEntry = {
      id: String(Date.now()),
      date: todayKey,
      content: newEntry.trim(),
      author: "client",
      timestamp: Date.now(),
    };
    const updated = [entry, ...entries];
    setEntries(updated);
    saveJournal(clientId, updated);
    setNewEntry("");
  };

  // Group entries by date, sorted newest first
  const grouped = useMemo(() => {
    const sorted = [...entries].sort((a, b) => b.timestamp - a.timestamp);
    const map = new Map<string, JournalEntry[]>();
    for (const e of sorted) {
      if (!map.has(e.date)) map.set(e.date, []);
      map.get(e.date)!.push(e);
    }
    return Array.from(map.entries());
  }, [entries]);

  const formatDate = (iso: string) => {
    if (iso === todayKey) return "Aujourd'hui";
    const d = new Date(iso);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (iso === yesterday.toISOString().split("T")[0]) return "Hier";
    return d.toLocaleDateString("fr-CA", { weekday: "long", day: "numeric", month: "long" });
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
              <span className="text-sm font-bold text-white">{clientName.charAt(0)}</span>
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">{clientName}</p>
              <p className="text-[11px] text-muted-foreground">Portail · powered by {agencyName}</p>
            </div>
          </div>
          <button onClick={onLogout} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <LogOut className="w-3.5 h-3.5" /> Se déconnecter
          </button>
        </div>
      </header>

      <main className="relative z-10 max-w-4xl mx-auto px-6 py-8 space-y-6">

        {/* Welcome */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Bonjour, {clientName.split(" ")[0]} 👋</h1>
          <p className="text-sm text-muted-foreground mt-1">Voici ton espace personnel avec {agencyName}</p>
        </div>

        {/* Performance metrics — 3 stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Monthly fee */}
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
            <p className="text-[10px] text-muted-foreground">Prochain renouvellement le 1er du mois</p>
          </div>

          {/* Monthly views — synced with KPI Équipe */}
          <div className="rounded-2xl border border-border/50 bg-card p-5 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg acc-bg-soft flex items-center justify-center">
                <Eye className="w-4 h-4 acc-c" />
              </div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex-1">Vues moyennes / mois</p>
              {viewsFromKpi && (
                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                  style={{ background: `${agencyColor}1a`, color: agencyColor }}
                  title="Synchronisé avec le KPI Équipe">
                  <Trophy className="w-2.5 h-2.5 inline mr-0.5" /> KPI
                </span>
              )}
            </div>
            {displayedViews !== null ? (
              <>
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-2xl font-bold text-foreground">{displayedViews.toLocaleString("fr-CA")}</span>
                  {trendPct !== null && trendPct !== 0 && (
                    <span className={`text-[10px] font-semibold flex items-center gap-0.5 ${trendPct > 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      <TrendingUp className={`w-2.5 h-2.5 ${trendPct < 0 ? "rotate-180" : ""}`} />
                      {trendPct > 0 ? "+" : ""}{trendPct}%
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {viewsFromKpi
                    ? `Moyenne sur ${kpi.monthsTracked} mois — tracké par ${agencyName}`
                    : "Toutes plateformes confondues"}
                </p>
              </>
            ) : (
              <p className="text-xs text-muted-foreground italic">Données en attente</p>
            )}
          </div>

          {/* Cost per lead */}
          <div className="rounded-2xl border border-border/50 bg-card p-5 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg acc-bg-soft flex items-center justify-center">
                <Target className="w-4 h-4 acc-c" />
              </div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Coût par lead moyen</p>
            </div>
            {costPerLead !== undefined ? (
              <>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-foreground">${costPerLead.toFixed(2)}</span>
                  <span className="text-xs text-muted-foreground">/ lead</span>
                </div>
                <p className="text-[10px] text-muted-foreground">Performance des campagnes</p>
              </>
            ) : (
              <p className="text-xs text-muted-foreground italic">Données en attente</p>
            )}
          </div>
        </div>

        {/* Drive link — full width below */}
        <div className="rounded-2xl border border-border/50 bg-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg acc-bg-soft flex items-center justify-center">
              <FolderOpen className="w-4 h-4 acc-c" />
            </div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tes vidéos & ressources</p>
          </div>
          <p className="text-sm text-foreground">Accède à toutes tes vidéos finalisées sur Google Drive.</p>
          {driveUrl ? (
            <a href={driveUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 acc-c text-sm font-semibold hover:underline">
              Ouvrir mon dossier Drive <ExternalLink className="w-3.5 h-3.5" />
            </a>
          ) : (
            <p className="text-xs text-muted-foreground italic">Ton agence n'a pas encore configuré ton dossier.</p>
          )}
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

          {/* New entry input */}
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
                  <Button onClick={addEntry} disabled={!newEntry.trim()} size="sm" className="acc-bg text-white border-0 hover:opacity-90 gap-1.5">
                    <Send className="w-3.5 h-3.5" /> Publier
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Timeline */}
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

// ── Journal entry row ─────────────────────────────────────────────────────────

function JournalEntryRow({ entry, agencyName, agencyColor }: {
  entry: JournalEntry; agencyName: string; agencyColor: string;
}) {
  const isClient = entry.author === "client";
  const time = new Date(entry.timestamp).toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" });

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
