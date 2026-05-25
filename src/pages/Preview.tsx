import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Users, Calendar, Calculator, UserCircle,
  CheckSquare, TrendingUp, Brain, Settings, MessagesSquare, Trophy,
  Bell, LogOut, GripVertical, DollarSign, ArrowUpRight, ArrowDownRight,
  Send, Hash, Sparkles, Lock, ArrowRight, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";

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

export default function Preview() {
  const navigate = useNavigate();
  const [data, setData] = useState<PreviewData | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_SECONDS);
  const [locked, setLocked] = useState(false);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("echo_preview_data");
    if (!raw) {
      navigate("/", { replace: true });
      return;
    }
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

  // Derived sample data
  const clientCount =
    revenueSample < 10_000 ? 5 :
    revenueSample < 20_000 ? 9 :
    revenueSample < 30_000 ? 13 :
    revenueSample < 45_000 ? 17 :
    revenueSample < 60_000 ? 22 : 28;
  const monthlyExpenses = Math.round(revenueSample * 0.35);
  const profit = revenueSample - monthlyExpenses;
  const growthPct = 18;

  return (
    <div className="min-h-screen bg-background text-foreground relative">
      {/* Color CSS overrides (apply user's colors to accents) */}
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

      {/* ═══ Dashboard mockup ═══ */}
      <div className={`flex h-screen overflow-hidden transition-all duration-500 ${locked ? "blur-md pointer-events-none select-none" : ""}`}>

        {/* Sidebar */}
        <aside className="w-60 flex-shrink-0 flex flex-col border-r border-sidebar-border bg-sidebar">
          {/* Logo with user branding */}
          <div className="flex items-center gap-2 px-4 py-5 border-b border-sidebar-border">
            <div className="w-8 h-8 rounded-lg user-grad flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-white">{initials}</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-sidebar-foreground truncate">{businessName}</p>
              <p className="text-[10px] text-muted-foreground">by Echo</p>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
            {[
              { icon: LayoutDashboard, label: "Dashboard",         active: true  },
              { icon: Users,           label: "Clients" },
              { icon: Calendar,        label: "Calendrier" },
              { icon: Calculator,      label: "ROI Calculator" },
              { icon: UserCircle,      label: "Client Center" },
              { icon: CheckSquare,     label: "Tâches du jour" },
              { icon: TrendingUp,      label: "Revenue & Growth" },
              { icon: Brain,           label: "Marketing Advisors" },
              { icon: MessagesSquare,  label: "Équipe & Canaux" },
              { icon: Trophy,          label: "KPI Équipe" },
              { icon: Settings,        label: "Settings" },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm cursor-default ${
                    item.active ? "user-bg-c1-soft user-c1 font-medium" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50"
                  }`}>
                  <GripVertical className="w-3 h-3 text-muted-foreground/30 flex-shrink-0" />
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{item.label}</span>
                </div>
              );
            })}
          </nav>

          {/* User */}
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

        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <header className="flex items-center justify-between px-6 py-3.5 border-b border-border/40 bg-background/80 backdrop-blur-sm flex-shrink-0">
            <div>
              <h1 className="text-base font-semibold text-foreground">Dashboard</h1>
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

          {/* Scrollable content with all sections */}
          <main className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-8 max-w-6xl mx-auto">

              {/* ── Hero stats ── */}
              <section>
                <div className="grid grid-cols-4 gap-3">
                  <StatCard label="Revenue mensuel" value={`$${revenueSample.toLocaleString("fr-CA")}`}
                    trend={`+${growthPct}%`} positive icon={DollarSign} color={color1} />
                  <StatCard label="Clients actifs" value={String(clientCount)}
                    trend="+3 ce mois" positive icon={Users} color={color2} />
                  <StatCard label="Dépenses" value={`$${monthlyExpenses.toLocaleString("fr-CA")}`}
                    trend="-8%" positive={false} icon={ArrowDownRight} color={color1} />
                  <StatCard label="Profit net" value={`$${profit.toLocaleString("fr-CA")}`}
                    trend={`+${Math.round(growthPct * 1.3)}%`} positive icon={ArrowUpRight} color={color2} />
                </div>
              </section>

              {/* ── Revenue chart ── */}
              <section className="rounded-2xl border border-border/40 bg-card p-5">
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
              </section>

              {/* ── KPI section ── */}
              {(purposes.includes("revenue") || purposes.length === 0) && (
                <section className="rounded-2xl border border-border/40 bg-card p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 user-c1" />
                    <h3 className="text-sm font-semibold text-foreground">KPI Équipe — Q2 2026</h3>
                    <span className="ml-auto text-[10px] font-bold user-c1 user-bg-c1-soft px-2 py-0.5 rounded-full">Total payable: $245</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {["Avril","Mai","Juin"].map((m, i) => (
                      <div key={m} className="rounded-xl border border-border/40 bg-muted/20 p-3">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{m}</p>
                        <p className="text-xl font-bold text-foreground">${[80, 95, 70][i]}</p>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2 pt-2">
                    {["Sandra · Gestionnaire", "Marc · Editor", "Sophie · Account Manager"].slice(0, clientCount > 8 ? 3 : 2).map((person, i) => (
                      <div key={person} className="flex items-center justify-between p-2.5 rounded-lg border border-border/30 bg-muted/10">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full user-grad flex items-center justify-center">
                            <span className="text-[10px] font-bold text-white">{person[0]}</span>
                          </div>
                          <span className="text-xs font-medium text-foreground">{person}</span>
                        </div>
                        <span className="text-xs font-bold user-c1">${[80, 65, 100][i]}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* ── Team chat ── */}
              <section className="rounded-2xl border border-border/40 bg-card overflow-hidden">
                <div className="flex h-72">
                  {/* Channels sidebar */}
                  <div className="w-48 border-r border-border/40 bg-muted/20 p-3 space-y-1">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold px-2 mb-2">Canaux</p>
                    {[
                      { name: "général", active: true },
                      { name: "stratégie" },
                      { name: "clients" },
                      { name: "feedback" },
                    ].map(c => (
                      <div key={c.name} className={`flex items-center gap-1.5 px-2 py-1.5 rounded text-sm ${c.active ? "user-bg-c1-soft user-c1 font-semibold" : "text-muted-foreground"}`}>
                        <Hash className="w-3 h-3" /> {c.name}
                      </div>
                    ))}
                  </div>
                  {/* Messages */}
                  <div className="flex-1 flex flex-col">
                    <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/40">
                      <Hash className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-sm font-semibold text-foreground">général</span>
                      <span className="text-[10px] text-muted-foreground ml-1">· 2 membres en ligne</span>
                    </div>
                    <div className="flex-1 p-4 space-y-3 overflow-hidden">
                      <ChatMessage author="Sandra" color={color1} time="10:42" message={`On a dépassé les objectifs ce mois! ${revenueSample > 15000 ? "Plus de $15k de revenu 🎉" : "Bonne tendance"}`} />
                      <ChatMessage author="Marc" color={color2} time="10:45" message={`Top! Je prépare la prochaine campagne pour ${services}.`} />
                      <ChatMessage author="Toi" color={color1} time="10:48" message="Parfait, on fait le brief demain à 9h?" isMe />
                    </div>
                    <div className="p-3 border-t border-border/40 flex items-center gap-2">
                      <input className="flex-1 bg-muted/30 rounded-lg px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 border-0 focus:outline-none" placeholder="Écrire un message…" />
                      <button className="p-1.5 rounded-lg user-bg-c1 text-white">
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              {/* ── AI Advisor ── */}
              {(purposes.includes("ai") || purposes.length === 0) && (
                <section className="rounded-2xl border user-border-c1 user-bg-c1-soft p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg user-grad flex items-center justify-center">
                      <Brain className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">Claude — Marketing Advisor</h3>
                      <p className="text-[11px] text-muted-foreground">Conseiller IA personnalisé pour {businessName}</p>
                    </div>
                  </div>
                  <div className="rounded-xl bg-card border border-border/40 p-4 space-y-3">
                    <div className="flex items-start gap-2">
                      <div className="w-6 h-6 rounded-full user-bg-c1-soft flex items-center justify-center flex-shrink-0">
                        <Sparkles className="w-3 h-3 user-c1" />
                      </div>
                      <div className="text-xs text-foreground leading-relaxed">
                        <span className="font-semibold">Analyse de {businessName}:</span> Avec un revenu de ${revenueSample.toLocaleString("fr-CA")}/mois et {clientCount} clients actifs, ton revenu moyen par client est de ${Math.round(revenueSample/clientCount).toLocaleString("fr-CA")}.
                        <span className="block mt-1.5">
                          <span className="font-semibold user-c1">3 actions prioritaires:</span>
                          <span className="block mt-1">→ Augmente tes prix de 15% sur les nouveaux clients ({services})</span>
                          <span className="block">→ Crée 2 cas d'étude pour augmenter ta conversion</span>
                          <span className="block">→ Automatise ton onboarding pour gagner 4h/semaine</span>
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {["Comment scaler à $50k/mois?", "Améliorer mes ads", "Stratégie de contenu"].map(q => (
                      <button key={q} className="text-[10px] px-2.5 py-1 rounded-full user-bg-c1-soft user-c1 font-medium border user-border-c1">
                        {q}
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {/* ── Clients table ── */}
              {(purposes.includes("clients") || purposes.length === 0) && (
                <section className="rounded-2xl border border-border/40 bg-card overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-border/40 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">Clients actifs</h3>
                      <p className="text-[11px] text-muted-foreground">{clientCount} clients · {services}</p>
                    </div>
                    <Button size="sm" variant="outline" className="text-xs h-7 user-border-c1 user-c1">+ Nouveau client</Button>
                  </div>
                  <div className="divide-y divide-border/30">
                    {[
                      { name: "Acme Corp",       rev: Math.round(revenueSample * 0.28) },
                      { name: "Studio Lumière",  rev: Math.round(revenueSample * 0.22) },
                      { name: "Nordik Café",     rev: Math.round(revenueSample * 0.18) },
                      { name: "TechSavvy Inc.",  rev: Math.round(revenueSample * 0.15) },
                      { name: "Bellevue Group",  rev: Math.round(revenueSample * 0.10) },
                    ].slice(0, clientCount < 5 ? clientCount : 5).map((c, i) => (
                      <div key={c.name} className="px-5 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg user-bg-c1-soft flex items-center justify-center">
                            <span className="text-xs font-bold user-c1">{c.name[0]}</span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{c.name}</p>
                            <p className="text-[10px] text-muted-foreground">Actif · 6 mois</p>
                          </div>
                        </div>
                        <span className="text-sm font-bold text-foreground">${c.rev.toLocaleString("fr-CA")}/mo</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Bottom padding so timer doesn't cover content */}
              <div className="h-24" />
            </div>
          </main>
        </div>
      </div>

      {/* ═══ Sticky timer ═══ */}
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
                <p className="text-[10px] text-muted-foreground">Explore ton tracker avant qu'il ne se verrouille</p>
              </div>
              <Button size="sm" onClick={() => navigate("/login?intent=create")}
                className="user-bg-c1 text-white hover:opacity-90 border-0 text-xs">
                Le rendre réel · 57$/mois <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
            <div className="h-1 rounded-full bg-muted/40 overflow-hidden">
              <div className="h-full user-bg-c1 transition-all duration-1000 ease-linear"
                style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* ═══ Lock overlay ═══ */}
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
    <div className="flex items-start gap-2">
      <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}33` }}>
        <span className="text-[10px] font-bold" style={{ color }}>{author[0]}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-semibold text-foreground">{author}{isMe ? " (toi)" : ""}</span>
          <span className="text-[9px] text-muted-foreground">{time}</span>
        </div>
        <p className="text-xs text-foreground/90 leading-snug mt-0.5">{message}</p>
      </div>
    </div>
  );
}
