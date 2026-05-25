import { useEffect, useState, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Users, Calendar, Calculator, UserCircle,
  CheckSquare, TrendingUp, Brain, Settings, MessagesSquare, Trophy,
  Bell, LogOut, GripVertical, DollarSign, ArrowUpRight, ArrowDownRight,
  Send, Hash, Sparkles, Lock, ArrowRight, Clock, Search, Filter,
  ChevronRight, MoreVertical, Star, Eye, Video, Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface PreviewData {
  businessName: string;
  services: string;
  revenue: string;
  revenueSample: number;
  color1: string;
  color2: string;
  purposes: string[];
}

const COUNTDOWN_SECONDS = 40;

// ── Random pools ──────────────────────────────────────────────────────────────

const FIRST_NAMES = [
  "Antoine","Sophie","Camille","Julien","Sarah","Maxime","Léa","Hugo","Manon",
  "Étienne","Chloé","Olivier","Inès","Raphaël","Mathilde","Lucas","Noémie","Élise",
  "Théo","Émilie","Adrien","Charlotte","Vincent","Juliette","Nicolas","Alice",
];
const TEAM_ROLES = [
  "Gestionnaire de contenu","Editor","Account Manager","Stratège marketing",
  "Designer","Développeur","Community manager","Coordinateur de projets",
];
const CLIENT_NAMES = [
  "Acme Corp","Studio Lumière","Nordik Café","TechSavvy Inc.","Bellevue Group",
  "Atelier Vert","Bistro Marcel","Verso Studio","Atlas Conseil","Maison Rivière",
  "Crescent Studio","Vega Industries","Lumen Agency","Nordic Pulse","Forêt Noire",
  "Pixel Forge","Orion Labs","Bleu Marine Co.","Solstice Group","Habitat 18",
  "Vélocité Plus","Mosaïque Studio","Ardent Coffee","Voltage Media","Verdure Conseil",
  "Boréal Films","Symphonie Web","Phare Digital","Trame Studio","Cap Nord",
];

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

// ── Main component ────────────────────────────────────────────────────────────

type TabId = "dashboard" | "clients" | "calendar" | "roi" | "center" | "tasks" | "revenue" | "advisors" | "team" | "kpi" | "settings";

export default function Preview() {
  const navigate = useNavigate();
  const [data, setData] = useState<PreviewData | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_SECONDS);
  const [locked, setLocked] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("echo_preview_data");
    if (!raw) { navigate("/", { replace: true }); return; }
    setData(JSON.parse(raw));
  }, [navigate]);

  // Countdown timer
  useEffect(() => {
    if (!data || locked) return;
    intervalRef.current = window.setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) {
          if (intervalRef.current) window.clearInterval(intervalRef.current);
          setLocked(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) window.clearInterval(intervalRef.current); };
  }, [data, locked]);

  if (!data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const { businessName, services, color1, color2, revenueSample, purposes } = data;
  const initials = businessName.charAt(0).toUpperCase();
  const progress = (secondsLeft / COUNTDOWN_SECONDS) * 100;
  const clientCount =
    revenueSample < 10_000 ? 5 :
    revenueSample < 20_000 ? 9 :
    revenueSample < 30_000 ? 13 :
    revenueSample < 45_000 ? 17 :
    revenueSample < 60_000 ? 22 : 28;

  return (
    <div className="min-h-screen bg-background text-foreground relative">
      <style>{`
        .user-c1 { color: ${color1}; }
        .user-bg-c1 { background-color: ${color1}; }
        .user-bg-c1-soft { background-color: ${color1}1a; }
        .user-border-c1 { border-color: ${color1}66; }
        .user-c2 { color: ${color2}; }
        .user-bg-c2 { background-color: ${color2}; }
        .user-bg-c2-soft { background-color: ${color2}1a; }
        .user-grad { background: linear-gradient(135deg, ${color1}, ${color2}); }
      `}</style>

      <div className={`flex h-screen overflow-hidden transition-all duration-500 ${locked ? "blur-md pointer-events-none select-none" : ""}`}>

        {/* ═════ Sidebar ═════ */}
        <Sidebar businessName={businessName} initials={initials} activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* ═════ Main ═════ */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header tab={activeTab} services={services} />
          <main className="flex-1 overflow-y-auto">
            <div className="p-6 max-w-6xl mx-auto">
              <TabContent tab={activeTab} data={data} clientCount={clientCount} />
              <div className="h-24" />
            </div>
          </main>
        </div>
      </div>

      {/* ═════ Sticky timer ═════ */}
      {!locked && (
        <div className="fixed bottom-0 left-0 right-0 z-40 px-6 pb-5">
          <div className="max-w-2xl mx-auto rounded-2xl border user-border-c1 bg-card/95 backdrop-blur-md shadow-2xl shadow-black/40 p-3.5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full user-bg-c1-soft flex items-center justify-center">
                <Clock className="w-4 h-4 user-c1" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground">
                  Aperçu gratuit · <span className="user-c1 font-bold">{secondsLeft}s</span> restantes
                </p>
                <p className="text-[10px] text-muted-foreground">Navigue dans ton tracker avant qu'il ne se verrouille</p>
              </div>
              <Button size="sm" onClick={() => navigate("/login?intent=create")}
                className="user-bg-c1 text-white hover:opacity-90 border-0 text-xs">
                Le rendre réel · 57$/mois <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
            <div className="h-1 rounded-full bg-muted/40 overflow-hidden">
              <div className="h-full user-bg-c1 transition-all duration-1000 ease-linear" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* ═════ Lock overlay ═════ */}
      {locked && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-background/40">
          <div className="max-w-md w-full rounded-3xl border-2 user-border-c1 bg-card shadow-2xl shadow-black/60 p-8 text-center space-y-5">
            <div className="w-16 h-16 mx-auto rounded-full user-grad flex items-center justify-center">
              <Lock className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">Le temps est écoulé!</h2>
              <p className="text-sm text-muted-foreground mt-2">
                Tu as adoré <span className="font-bold text-foreground">{businessName}</span>?
              </p>
            </div>
            <div className="rounded-2xl user-bg-c1-soft border user-border-c1 p-4 space-y-1.5 text-left">
              <p className="text-xs font-semibold user-c1 uppercase tracking-wider">Ce que tu obtiens</p>
              <p className="text-sm text-foreground">✓ Ton tracker personnalisé, prêt à utiliser</p>
              <p className="text-sm text-foreground">✓ IA Claude intégrée partout</p>
              <p className="text-sm text-foreground">✓ Jusqu'à 2 membres dans ton équipe</p>
              <p className="text-sm text-foreground">✓ Annulation à tout moment</p>
            </div>
            <Button onClick={() => navigate("/login?intent=create")}
              className="w-full h-12 text-base shadow-glow user-bg-c1 text-white hover:opacity-90 border-0 gap-2">
              Faire de {businessName} une réalité · 57$/mois
              <ArrowRight className="w-4 h-4" />
            </Button>
            <button onClick={() => { setLocked(false); setSecondsLeft(20); }}
              className="text-[11px] text-muted-foreground hover:text-foreground transition-colors">
              Donne-moi 20 secondes de plus
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

const TABS: { id: TabId; icon: any; label: string }[] = [
  { id: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { id: "clients",   icon: Users,           label: "Clients" },
  { id: "calendar",  icon: Calendar,        label: "Calendrier" },
  { id: "roi",       icon: Calculator,      label: "ROI Calculator" },
  { id: "center",    icon: UserCircle,      label: "Client Center" },
  { id: "tasks",     icon: CheckSquare,     label: "Tâches du jour" },
  { id: "revenue",   icon: TrendingUp,      label: "Revenue & Growth" },
  { id: "advisors",  icon: Brain,           label: "Marketing Advisors" },
  { id: "team",      icon: MessagesSquare,  label: "Équipe & Canaux" },
  { id: "kpi",       icon: Trophy,          label: "KPI Équipe" },
  { id: "settings",  icon: Settings,        label: "Settings" },
];

function Sidebar({ businessName, initials, activeTab, setActiveTab }: {
  businessName: string; initials: string; activeTab: TabId; setActiveTab: (t: TabId) => void;
}) {
  return (
    <aside className="w-60 flex-shrink-0 flex flex-col border-r border-sidebar-border bg-sidebar">
      <div className="flex items-center gap-2 px-4 py-5 border-b border-sidebar-border">
        <div className="w-8 h-8 rounded-lg user-grad flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-bold text-white">{initials}</span>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-sidebar-foreground truncate">{businessName}</p>
          <p className="text-[10px] text-muted-foreground">by Echo</p>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {TABS.map(item => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button key={item.id} onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm text-left transition-colors ${
                active ? "user-bg-c1-soft user-c1 font-medium" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50"
              }`}>
              <GripVertical className="w-3 h-3 text-muted-foreground/30 flex-shrink-0" />
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="p-3 border-t border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-2 rounded-lg bg-sidebar-accent/40">
          <div className="w-7 h-7 rounded-full user-grad flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">T</span>
          </div>
          <p className="text-xs text-sidebar-foreground truncate flex-1">toi@{businessName.toLowerCase().replace(/\s/g,"")}.com</p>
          <LogOut className="w-3.5 h-3.5 text-muted-foreground" />
        </div>
      </div>
    </aside>
  );
}

// ── Header ────────────────────────────────────────────────────────────────────

function Header({ tab, services }: { tab: TabId; services: string }) {
  const label = TABS.find(t => t.id === tab)?.label || "Dashboard";
  return (
    <header className="flex items-center justify-between px-6 py-3.5 border-b border-border/40 bg-background/80 backdrop-blur-sm flex-shrink-0">
      <div>
        <h1 className="text-base font-semibold text-foreground">{label}</h1>
        <p className="text-[11px] text-muted-foreground">{services}</p>
      </div>
      <div className="flex items-center gap-2">
        <button className="p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground">
          <Bell className="w-4 h-4" />
        </button>
        <Button size="sm" className="user-bg-c1 text-white hover:opacity-90 border-0">
          Nouveau projet
        </Button>
      </div>
    </header>
  );
}

// ── Tab content router ────────────────────────────────────────────────────────

function TabContent({ tab, data, clientCount }: { tab: TabId; data: PreviewData; clientCount: number }) {
  switch (tab) {
    case "dashboard": return <DashboardTab data={data} clientCount={clientCount} />;
    case "clients":   return <ClientsTab data={data} clientCount={clientCount} />;
    case "kpi":       return <KpiPreviewTab data={data} clientCount={clientCount} />;
    case "team":      return <TeamPreviewTab data={data} />;
    case "advisors":  return <AdvisorsTab data={data} clientCount={clientCount} />;
    default:          return <PlaceholderTab tab={tab} data={data} />;
  }
}

// ── Tab: Dashboard ────────────────────────────────────────────────────────────

function DashboardTab({ data, clientCount }: { data: PreviewData; clientCount: number }) {
  const { businessName, color1, color2, revenueSample } = data;
  const monthlyExpenses = Math.round(revenueSample * 0.35);
  const profit = revenueSample - monthlyExpenses;
  const growthPct = 18;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-3">
        <StatCard label="Revenue mensuel" value={`$${revenueSample.toLocaleString("fr-CA")}`} trend={`+${growthPct}%`} positive icon={DollarSign} color={color1} />
        <StatCard label="Clients actifs"  value={String(clientCount)} trend="+3 ce mois" positive icon={Users} color={color2} />
        <StatCard label="Dépenses"        value={`$${monthlyExpenses.toLocaleString("fr-CA")}`} trend="-8%" positive={false} icon={ArrowDownRight} color={color1} />
        <StatCard label="Profit net"      value={`$${profit.toLocaleString("fr-CA")}`} trend={`+${Math.round(growthPct * 1.3)}%`} positive icon={ArrowUpRight} color={color2} />
      </div>

      <div className="rounded-2xl border border-border/40 bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Croissance des 7 derniers mois</h3>
            <p className="text-[11px] text-muted-foreground">Revenue mensuel pour {businessName}</p>
          </div>
          <span className="text-[10px] user-c1 font-bold uppercase tracking-wider">↑ {growthPct}% YoY</span>
        </div>
        <div className="flex items-end gap-2 h-32">
          {[35, 42, 38, 55, 60, 75, 88].map((h, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full user-grad rounded-t-lg" style={{ height: `${h}%`, opacity: 0.5 + (i * 0.07) }} />
              <span className="text-[9px] text-muted-foreground">{["Nov","Déc","Jan","Fév","Mar","Avr","Mai"][i]}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl border border-border/40 bg-card p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-3">Prochaines tâches</p>
          <div className="space-y-2">
            {["Appel client #14", "Brief campagne LinkedIn", "Review du contrat Acme"].map(t => (
              <div key={t} className="flex items-center gap-2 text-sm text-foreground">
                <div className="w-4 h-4 rounded border-2 border-muted-foreground/40" />
                {t}
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border user-border-c1 user-bg-c1-soft p-5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 user-c1" />
            <p className="text-xs uppercase tracking-wider font-semibold user-c1">Insight Claude</p>
          </div>
          <p className="text-sm text-foreground leading-relaxed">
            Ton client le plus rentable génère <span className="font-bold">42%</span> de ton revenu. Considère diversifier ton portfolio.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Tab: Clients (FULL LIST + DETAIL) ─────────────────────────────────────────

function ClientsTab({ data, clientCount }: { data: PreviewData; clientCount: number }) {
  const { color1, revenueSample } = data;
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const clients = useMemo(() => {
    const pool = shuffle(CLIENT_NAMES).slice(0, clientCount);
    return pool.map((name, i) => {
      const factor = [0.18, 0.14, 0.12, 0.10, 0.08, 0.07, 0.06, 0.05][i % 8];
      return {
        id: i + 1,
        name,
        mrr: Math.round(revenueSample * factor),
        status: (i % 5 === 0 ? "pipeline" : i % 7 === 0 ? "on_hold" : "active") as "active"|"pipeline"|"on_hold",
        months: 3 + ((i * 7) % 22),
      };
    });
  }, [clientCount, revenueSample]);

  const filtered = clients.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
  const selected = selectedId ? clients.find(c => c.id === selectedId) : null;

  if (selected) {
    // Detail view
    return (
      <div className="space-y-4">
        <button onClick={() => setSelectedId(null)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowRight className="w-3.5 h-3.5 rotate-180" /> Retour aux clients
        </button>
        <div className="rounded-2xl border border-border/40 bg-card p-6 space-y-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl user-bg-c1-soft flex items-center justify-center">
                <span className="text-lg font-bold user-c1">{selected.name[0]}</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">{selected.name}</h2>
                <p className="text-xs text-muted-foreground">Client #{selected.id} · {selected.months} mois</p>
              </div>
            </div>
            <StatusBadge status={selected.status} color={color1} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <DetailCell label="MRR" value={`$${selected.mrr.toLocaleString("fr-CA")}`} />
            <DetailCell label="Vidéos/mois" value="4" />
            <DetailCell label="Prochaine séance" value="15 juin" />
          </div>
          <div className="rounded-xl bg-muted/30 p-4 space-y-2">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Notes</p>
            <p className="text-sm text-foreground">Client engagé depuis {selected.months} mois. Focus sur croissance organique.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Rechercher un client…" value={search} onChange={e => setSearch(e.target.value)}
            className="h-9 pl-9 text-sm" />
        </div>
        <Button variant="outline" size="sm" className="h-9 gap-1.5">
          <Filter className="w-3.5 h-3.5" /> Filtrer
        </Button>
        <Button size="sm" className="h-9 user-bg-c1 text-white border-0 gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Nouveau client
        </Button>
      </div>

      {/* Client list */}
      <div className="rounded-2xl border border-border/40 bg-card overflow-hidden">
        <div className="grid grid-cols-[40px_1fr_100px_100px_80px_40px] gap-3 px-4 py-2.5 bg-muted/40 border-b border-border/40 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          <span>#</span><span>Client</span><span className="text-right">MRR</span><span>Statut</span><span>Durée</span><span/>
        </div>
        <div className="divide-y divide-border/30">
          {filtered.map(c => (
            <button key={c.id} onClick={() => setSelectedId(c.id)}
              className="w-full grid grid-cols-[40px_1fr_100px_100px_80px_40px] gap-3 px-4 py-3 items-center text-left hover:bg-muted/20 transition-colors">
              <span className="text-xs text-muted-foreground font-mono">#{c.id}</span>
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg user-bg-c1-soft flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold user-c1">{c.name[0]}</span>
                </div>
                <span className="text-sm font-medium text-foreground truncate">{c.name}</span>
              </div>
              <span className="text-sm font-bold text-foreground text-right">${c.mrr.toLocaleString("fr-CA")}</span>
              <StatusBadge status={c.status} color={color1} />
              <span className="text-xs text-muted-foreground">{c.months} mois</span>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">Aucun client trouvé</div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status, color }: { status: string; color: string }) {
  const map: Record<string, { label: string; bg: string; text: string }> = {
    active:    { label: "Actif",    bg: "bg-emerald-500/10", text: "text-emerald-400" },
    pipeline:  { label: "Pipeline", bg: "", text: "" },
    on_hold:   { label: "En pause", bg: "bg-amber-500/10", text: "text-amber-400" },
  };
  const cfg = map[status] || map.active;
  if (status === "pipeline") {
    return <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: `${color}1a`, color }}>{cfg.label}</span>;
  }
  return <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>;
}

function DetailCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/40 bg-muted/20 p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
      <p className="text-lg font-bold text-foreground mt-0.5">{value}</p>
    </div>
  );
}

// ── Tab: KPI ──────────────────────────────────────────────────────────────────

function KpiPreviewTab({ data, clientCount }: { data: PreviewData; clientCount: number }) {
  const { color1 } = data;
  const team = useMemo(() => {
    const names = shuffle(FIRST_NAMES).slice(0, Math.min(3, Math.max(1, Math.floor(clientCount / 4))));
    const roles = shuffle(TEAM_ROLES);
    return names.map((n, i) => ({ name: n, role: roles[i % roles.length], bonus: [80, 65, 100][i % 3] }));
  }, [clientCount]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border/40 bg-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 user-c1" />
          <h3 className="text-base font-semibold text-foreground">KPI Équipe — Q2 2026</h3>
          <span className="ml-auto text-xs font-bold user-c1 user-bg-c1-soft px-3 py-1 rounded-full">Total payable: $245</span>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {["Avril","Mai","Juin"].map((m, i) => (
            <div key={m} className="rounded-xl border border-border/40 bg-muted/20 p-4">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{m}</p>
              <p className="text-2xl font-bold text-foreground">${[80, 95, 70][i]}</p>
            </div>
          ))}
          <div className="rounded-xl border user-border-c1 user-bg-c1-soft p-4">
            <p className="text-[10px] user-c1 uppercase tracking-wider font-semibold">Total payable</p>
            <p className="text-2xl font-bold user-c1">$245</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Performance par employé</p>
        {team.map((p, i) => (
          <div key={p.name} className="rounded-2xl border border-border/40 bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full user-grad flex items-center justify-center">
                  <span className="text-sm font-bold text-white">{p.name[0]}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{p.name}</p>
                  <p className="text-[11px] text-muted-foreground">{p.role}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground">Bonus trimestre</p>
                <p className="text-xl font-bold user-c1">${p.bonus}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {["Avril","Mai","Juin"].map((m, mi) => (
                <div key={m} className="rounded-lg bg-muted/30 p-2 text-center">
                  <p className="text-[9px] text-muted-foreground">{m}</p>
                  <p className="text-sm font-bold text-foreground">${[25, 40, 15][mi]}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Tab: Team ─────────────────────────────────────────────────────────────────

function TeamPreviewTab({ data }: { data: PreviewData }) {
  const { businessName, services, color1, color2, revenueSample } = data;
  const team = useMemo(() => shuffle(FIRST_NAMES).slice(0, 2), []);

  return (
    <div className="rounded-2xl border border-border/40 bg-card overflow-hidden">
      <div className="flex h-[500px]">
        <div className="w-48 border-r border-border/40 bg-muted/20 p-3 space-y-1">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold px-2 mb-2">Canaux</p>
          {[
            { name: "général", active: true },
            { name: "stratégie" },
            { name: "clients" },
            { name: "feedback" },
            { name: "ressources" },
          ].map(c => (
            <div key={c.name} className={`flex items-center gap-1.5 px-2 py-1.5 rounded text-sm ${c.active ? "user-bg-c1-soft user-c1 font-semibold" : "text-muted-foreground hover:bg-muted/30"}`}>
              <Hash className="w-3 h-3" /> {c.name}
            </div>
          ))}
          <div className="pt-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold px-2 mb-2">Direct</p>
            {team.map(name => (
              <div key={name} className="flex items-center gap-2 px-2 py-1.5 rounded text-sm text-muted-foreground hover:bg-muted/30">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> {name}
              </div>
            ))}
          </div>
        </div>
        <div className="flex-1 flex flex-col">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/40">
            <Hash className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-sm font-semibold text-foreground">général</span>
            <span className="text-[10px] text-muted-foreground ml-1">· 2 membres en ligne</span>
          </div>
          <div className="flex-1 p-4 space-y-4 overflow-y-auto">
            <ChatMessage author={team[0]} color={color1} time="09:14" message={`Bonjour! ${revenueSample > 15000 ? `On a passé le cap des $15k ce mois 🎉` : `Bon début de mois`}`} />
            <ChatMessage author={team[1] || team[0]} color={color2} time="09:21" message={`Top! Je finalise la prochaine campagne pour ${services}.`} />
            <ChatMessage author="Toi" color={color1} time="09:32" message="Parfait, on fait le brief demain à 9h?" isMe />
            <ChatMessage author={team[0]} color={color1} time="10:05" message={`Ça marche. Je prépare le dossier ${businessName} ce soir.`} />
            <ChatMessage author={team[1] || team[0]} color={color2} time="10:18" message="Vu! Je vous envoie les visuels dans la journée 👍" />
          </div>
          <div className="p-3 border-t border-border/40 flex items-center gap-2">
            <input className="flex-1 bg-muted/30 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 border-0 focus:outline-none" placeholder="Écrire un message…" />
            <button className="p-2 rounded-lg user-bg-c1 text-white">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Tab: Advisors ─────────────────────────────────────────────────────────────

function AdvisorsTab({ data, clientCount }: { data: PreviewData; clientCount: number }) {
  const { businessName, services, revenueSample } = data;

  return (
    <div className="rounded-2xl border user-border-c1 user-bg-c1-soft p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl user-grad flex items-center justify-center">
          <Brain className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-base font-bold text-foreground">Claude — Marketing Advisor</h3>
          <p className="text-xs text-muted-foreground">Conseiller IA personnalisé pour {businessName}</p>
        </div>
      </div>

      <div className="rounded-xl bg-card border border-border/40 p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-7 h-7 rounded-full user-bg-c1-soft flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-3.5 h-3.5 user-c1" />
          </div>
          <div className="text-sm text-foreground leading-relaxed space-y-2.5">
            <p>
              <span className="font-semibold">Analyse de {businessName}:</span> Avec un revenu de ${revenueSample.toLocaleString("fr-CA")}/mois et {clientCount} clients actifs, ton revenu moyen par client est de <span className="font-bold user-c1">${Math.round(revenueSample/clientCount).toLocaleString("fr-CA")}</span>.
            </p>
            <div>
              <span className="font-semibold user-c1">3 actions prioritaires :</span>
              <ul className="mt-1.5 space-y-1 list-disc list-inside text-foreground/90">
                <li>Augmente tes prix de 15% sur les nouveaux clients ({services})</li>
                <li>Crée 2 cas d'étude pour augmenter ta conversion</li>
                <li>Automatise ton onboarding pour gagner 4h/semaine</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Questions suggérées</p>
        <div className="flex flex-wrap gap-2">
          {[
            "Comment scaler à $50k/mois?",
            "Améliorer mes ads",
            "Stratégie de contenu",
            "Optimiser mes conversions",
            "Plan d'embauche pour 6 mois",
          ].map(q => (
            <button key={q} className="text-xs px-3 py-1.5 rounded-full bg-card border user-border-c1 user-c1 font-medium hover:user-bg-c1-soft">
              {q}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Tab: Placeholder ──────────────────────────────────────────────────────────

function PlaceholderTab({ tab, data }: { tab: TabId; data: PreviewData }) {
  const tabInfo = TABS.find(t => t.id === tab);
  const Icon = tabInfo?.icon || LayoutDashboard;
  return (
    <div className="rounded-2xl border-2 border-dashed border-border/50 bg-muted/10 p-12 text-center space-y-4">
      <div className="w-16 h-16 mx-auto rounded-2xl user-bg-c1-soft flex items-center justify-center">
        <Icon className="w-7 h-7 user-c1" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-foreground">{tabInfo?.label}</h3>
        <p className="text-sm text-muted-foreground mt-1">Cette section est entièrement personnalisable pour <span className="text-foreground font-medium">{data.businessName}</span></p>
      </div>
      <p className="text-xs text-muted-foreground max-w-sm mx-auto">Débloque le tracker complet pour configurer cette section selon les besoins de ton équipe.</p>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value, trend, positive, icon: Icon, color }: {
  label: string; value: string; trend: string; positive: boolean; icon: any; color: string;
}) {
  return (
    <div className="rounded-2xl border border-border/40 bg-card p-4 space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}1a` }}>
          <Icon className="w-3.5 h-3.5" style={{ color }} />
        </div>
        <span className={`text-[10px] font-semibold ${positive ? "text-emerald-400" : "text-rose-400"}`}>{trend}</span>
      </div>
      <div>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="text-xl font-bold text-foreground">{value}</p>
      </div>
    </div>
  );
}

function ChatMessage({ author, color, time, message, isMe }: {
  author: string; color: string; time: string; message: string; isMe?: boolean;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `${color}33` }}>
        <span className="text-xs font-bold" style={{ color }}>{author[0]}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold text-foreground">{author}{isMe ? " (toi)" : ""}</span>
          <span className="text-[10px] text-muted-foreground">{time}</span>
        </div>
        <p className="text-sm text-foreground/90 leading-relaxed mt-0.5">{message}</p>
      </div>
    </div>
  );
}
