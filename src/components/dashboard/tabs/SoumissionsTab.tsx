import { useEffect, useState } from "react";
import { useClients } from "@/hooks/useClients";
import { useAgencySettings } from "@/hooks/usePortal";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Plus, ExternalLink, Copy, Trash2, Wand2, ArrowLeft, Check, Presentation, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { EchoTintedLogo } from "@/components/EchoTintedLogo";

// ─── Types & storage ─────────────────────────────────────────────────────────

type OfferService = "ads" | "ai" | "videos" | "crm" | "setter" | "social" | "web" | "seo";

type ResultKpi = "vues" | "leads" | "soumissions" | "clients" | "evaluations" | "rdv" | "ventes" | "revenu" | "engagement" | "followers";

const RESULT_KPI_OPTIONS: { id: ResultKpi; label: string; emoji: string }[] = [
  { id: "vues",        label: "Vues",             emoji: "👁️" },
  { id: "leads",       label: "Leads",            emoji: "🎯" },
  { id: "soumissions", label: "Soumissions",      emoji: "📄" },
  { id: "clients",     label: "Nouveaux clients", emoji: "👤" },
  { id: "evaluations", label: "Évaluations",      emoji: "⭐" },
  { id: "rdv",         label: "RDV",              emoji: "📅" },
  { id: "ventes",      label: "Ventes / Signatures", emoji: "💰" },
  { id: "revenu",      label: "Revenu",           emoji: "💵" },
  { id: "engagement",  label: "Engagement",       emoji: "❤️" },
  { id: "followers",   label: "Followers",        emoji: "👥" },
];

interface Submission {
  id: string;
  clientId: string;
  clientName: string;
  // Structured brief
  prospectName: string;
  domain: string;
  pricePerMonth: string;
  monthsTotal: string;
  services: OfferService[];
  mainGoal: string;
  resultKpis: ResultKpi[];
  kpiTargets: Partial<Record<ResultKpi, string>>;
  expectedResults: string;
  deliverables: string;
  timeline: string;
  nextMeeting: string;
  extraNotes: string;
  // Generated brief for Gamma
  prompt: string;
  // Follow-up email template (auto-generated, editable)
  followupEmail?: string;
  status: "draft" | "generating" | "ready" | "error";
  gammaUrl?: string;
  gammaId?: string;
  error?: string;
  createdAt: number;
}

// TODO: once agencies can define their specialty when creating their Echo workspace,
// load these dynamically from agency_settings.specialty_domains.
const DOMAIN_OPTIONS = [
  "Courtier immobilier",
  "Courtier hypothécaire",
  "Restaurant / Café",
  "E-commerce / DTC",
  "Coach / Formation en ligne",
  "Cabinet médical / dentaire",
  "Services professionnels (avocat, comptable)",
  "Beauté / Bien-être",
  "Fitness / Coaching sportif",
  "SaaS / Tech",
  "Autre",
];

const SERVICE_OPTIONS: { id: OfferService; label: string; emoji: string; desc: string; longDesc: string }[] = [
  { id: "videos", label: "Vidéos",         emoji: "🎬", desc: "Production vidéo, reels, YouTube",
    longDesc: "Production vidéo professionnelle : Reels, TikTok, YouTube long format, publicités, contenu de marque. Tournage, montage, script, sous-titrage, distribution multiplateforme." },
  { id: "ads",    label: "Ads",            emoji: "🎯", desc: "Meta / Google / TikTok Ads",
    longDesc: "Campagnes publicitaires performantes sur Meta (Facebook/Instagram), Google, TikTok. Stratégie, créatifs, ciblage précis, A/B testing, optimisation continue basée sur les métriques de conversion." },
  { id: "ai",     label: "Formulaire IA",  emoji: "🤖", desc: "Qualification de leads via formulaire intelligent",
    longDesc: "Formulaire de qualification codé avec IA intégrée (PAS un chatbot). L'IA analyse les réponses en temps réel pour scorer et qualifier chaque prospect — questions dynamiques, adaptation à la réponse précédente, filtrage automatique des leads non-qualifiés. Les leads qualifiés sont envoyés directement à ton CRM avec leur score et un résumé." },
  { id: "crm",    label: "CRM",            emoji: "📇", desc: "Mise en place & optimisation",
    longDesc: "Configuration et automatisation de CRM (GoHighLevel, HubSpot, ou custom). Pipelines de vente, workflows, séquences email/SMS automatisées, dashboards de performance." },
  { id: "setter", label: "Setter",         emoji: "☎️", desc: "Prise de RDV / DM outbound",
    longDesc: "Équipe de setters dédiée qui contacte tes leads par DM ou téléphone pour prendre les RDV directement dans ton calendrier. Scripts optimisés, suivi rigoureux, taux de conversion mesuré." },
  { id: "social", label: "Social Media",   emoji: "📱", desc: "Gestion de contenu quotidien",
    longDesc: "Gestion complète de tes réseaux sociaux : calendrier de contenu, publication quotidienne, engagement communauté, veille concurrentielle, stratégie multi-plateformes." },
  { id: "web",    label: "Site Web",       emoji: "🌐", desc: "Landing page, funnel",
    longDesc: "Site web / landing page / funnel optimisés pour la conversion. Design sur mesure, chargement rapide, SEO on-page, tracking pixel, A/B tests, mobile-first." },
  { id: "seo",    label: "SEO",            emoji: "🔎", desc: "Référencement organique",
    longDesc: "Référencement organique pour dominer les résultats Google. Audit technique, stratégie de contenu, backlinks, optimisation locale, suivi de positions et de trafic." },
];

const STORAGE_KEY = "echo_submissions";

function loadSubmissions(): Submission[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
  catch { return []; }
}
function saveSubmissions(list: Submission[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

// ─── Main component ─────────────────────────────────────────────────────────

export function SoumissionsTab() {
  const [submissions, setSubmissions] = useState<Submission[]>(() => loadSubmissions());
  const [view, setView] = useState<"list" | "new" | "detail" | "forfaits" | "calculator">("list");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => saveSubmissions(submissions), [submissions]);

  const selected = submissions.find((s) => s.id === selectedId) ?? null;

  const upsert = (sub: Submission) => {
    setSubmissions((prev) => {
      const idx = prev.findIndex((s) => s.id === sub.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = sub; return next; }
      return [sub, ...prev];
    });
  };
  const remove = (id: string) => {
    setSubmissions((prev) => prev.filter((s) => s.id !== id));
    setSelectedId(null);
    setView("list");
  };

  if (view === "forfaits") {
    return <ForfaitsView onBack={() => setView("list")} />;
  }

  if (view === "calculator") {
    return <CalculatorView onBack={() => setView("list")} />;
  }

  if (view === "new") {
    return <NewSubmissionForm
      onCancel={() => setView("list")}
      onCreate={(sub) => { upsert(sub); setSelectedId(sub.id); setView("detail"); }}
    />;
  }

  if (view === "detail" && selected) {
    return <SubmissionDetail
      submission={selected}
      onBack={() => setView("list")}
      onUpdate={upsert}
      onDelete={() => remove(selected.id)}
    />;
  }

  return <SubmissionsList
    submissions={submissions}
    onNew={() => setView("new")}
    onForfaits={() => setView("forfaits")}
    onCalculator={() => setView("calculator")}
    onOpen={(id) => { setSelectedId(id); setView("detail"); }}
    onDelete={remove}
  />;
}

// ─── List view ──────────────────────────────────────────────────────────────

function SubmissionsList({ submissions, onNew, onForfaits, onCalculator, onOpen, onDelete }: {
  submissions: Submission[]; onNew: () => void; onForfaits: () => void; onCalculator: () => void; onOpen: (id: string) => void; onDelete: (id: string) => void;
}) {
  return (
    <div className="p-8 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Presentation className="w-5 h-5 text-primary" /> Soumissions
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">Génère des propositions commerciales avec Gamma AI</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button onClick={onForfaits} variant="outline" className="gap-2">
            <FileText className="w-4 h-4" /> Nos forfaits
          </Button>
          <Button onClick={onCalculator} variant="outline" className="gap-2">
            <Wand2 className="w-4 h-4" /> Calculateur
          </Button>
          <Button onClick={onNew} className="gap-2 shadow-glow">
            <Plus className="w-4 h-4" /> Nouvelle soumission
          </Button>
        </div>
      </div>

      {submissions.length === 0 ? (
        <Card>
          <CardContent className="pt-10 pb-10 flex flex-col items-center text-center gap-3">
            <EchoTintedLogo color="#7c3aed" pose="sitting" size="w-24 h-24" />
            <p className="text-sm text-foreground font-medium">Aucune soumission pour l'instant</p>
            <p className="text-xs text-muted-foreground max-w-sm">
              Crée ta première proposition commerciale. Echo pré-remplit les infos du client, tu ajoutes le projet, Gamma génère la présentation.
            </p>
            <Button onClick={onNew} className="mt-3 gap-2">
              <Sparkles className="w-4 h-4" /> Ma première soumission
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {submissions.map((s) => (
            <div key={s.id}
              className="rounded-2xl border border-border/40 bg-card p-5 space-y-3 cursor-pointer hover:border-primary/40 transition-colors"
              onClick={() => onOpen(s.id)}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground truncate">{s.prospectName || s.clientName}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{s.domain || "Domaine non spécifié"}</p>
                </div>
                <StatusBadge status={s.status} />
              </div>
              {s.services?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {s.services.slice(0, 4).map((sv) => {
                    const opt = SERVICE_OPTIONS.find(o => o.id === sv);
                    if (!opt) return null;
                    return (
                      <span key={sv} className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted/40 text-foreground/80">
                        {opt.emoji} {opt.label}
                      </span>
                    );
                  })}
                  {s.services.length > 4 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted/30 text-muted-foreground">+{s.services.length - 4}</span>
                  )}
                </div>
              )}
              {s.pricePerMonth && s.monthsTotal && (
                <p className="text-xs text-muted-foreground">
                  <span className="text-foreground font-medium">{s.pricePerMonth} $/mo × {s.monthsTotal} mois</span>
                </p>
              )}
              <div className="flex items-center justify-between pt-2 border-t border-border/30">
                <p className="text-[10px] text-muted-foreground">
                  {new Date(s.createdAt).toLocaleDateString("fr-CA", { day: "numeric", month: "short", year: "numeric" })}
                </p>
                <button onClick={(e) => { e.stopPropagation(); if (confirm(`Supprimer la soumission pour ${s.clientName}?`)) onDelete(s.id); }}
                  className="text-muted-foreground/60 hover:text-destructive transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: Submission["status"] }) {
  const map: Record<Submission["status"], { label: string; cls: string }> = {
    draft:      { label: "Brouillon",   cls: "bg-muted/40 text-muted-foreground" },
    generating: { label: "En cours",    cls: "bg-primary/15 text-primary" },
    ready:      { label: "Prête",       cls: "bg-emerald-500/15 text-emerald-400" },
    error:      { label: "Erreur",      cls: "bg-destructive/15 text-destructive" },
  };
  const cfg = map[status];
  return (
    <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${cfg.cls}`}>
      {status === "generating" && <Loader2 className="w-2.5 h-2.5 inline mr-0.5 animate-spin" />}
      {cfg.label}
    </span>
  );
}

// ─── New submission form ────────────────────────────────────────────────────

function NewSubmissionForm({ onCancel, onCreate }: {
  onCancel: () => void; onCreate: (s: Submission) => void;
}) {
  const { data: clients = [] } = useClients();
  const { data: agency } = useAgencySettings();

  // "Existing client" or new prospect
  const [clientId, setClientId]           = useState<string>("");
  const [prospectName, setProspectName]   = useState("");
  const [domainChoice, setDomainChoice]   = useState<string>("");
  const [domainOther, setDomainOther]     = useState<string>("");
  const [pricePerMonth, setPricePerMonth] = useState("");
  const [monthsTotal, setMonthsTotal]     = useState("");
  const [services, setServices]           = useState<OfferService[]>([]);
  const [mainGoal, setMainGoal]           = useState("");
  const [resultKpis, setResultKpis]       = useState<ResultKpi[]>([]);
  const [kpiTargets, setKpiTargets]       = useState<Partial<Record<ResultKpi, string>>>({});
  const [expectedResults, setExpectedResults] = useState("");
  const [deliverables, setDeliverables]   = useState("");
  const [timeline, setTimeline]           = useState("");
  const [nextMeeting, setNextMeeting]     = useState("");
  const [extraNotes, setExtraNotes]       = useState("");

  const domain = domainChoice === "Autre" ? domainOther : domainChoice;

  const selectedClient = clients.find((c) => c.id === clientId);
  const agencyName = agency?.name ?? "Mon Agence";

  // When user picks an existing client, auto-fill prospectName + domain
  const pickClient = (id: string) => {
    setClientId(id);
    const c = clients.find((cl) => cl.id === id);
    if (c) {
      if (!prospectName) setProspectName(c.name);
      if (!domainChoice && c.industry) {
        const match = DOMAIN_OPTIONS.find((d) => d.toLowerCase() === c.industry!.toLowerCase());
        if (match) setDomainChoice(match);
        else { setDomainChoice("Autre"); setDomainOther(c.industry); }
      }
      if (!pricePerMonth && c.monthly_recurring_revenue) setPricePerMonth(String(c.monthly_recurring_revenue));
    }
  };

  const toggleService = (s: OfferService) => {
    setServices((prev) => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };
  const toggleKpi = (k: ResultKpi) => {
    setResultKpis((prev) => prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k]);
    setKpiTargets((prev) => {
      if (k in prev) { const { [k]: _, ...rest } = prev; return rest; }
      return { ...prev, [k]: "" };
    });
  };
  const setKpiTarget = (k: ResultKpi, v: string) => {
    setKpiTargets((prev) => ({ ...prev, [k]: v }));
  };

  const totalContract = () => {
    const p = parseFloat(pricePerMonth) || 0;
    const m = parseFloat(monthsTotal) || 0;
    return p * m;
  };

  const buildPrompt = () => {
    const total = totalContract();
    const selectedOpts = services.map((s) => SERVICE_OPTIONS.find(o => o.id === s)).filter(Boolean) as typeof SERVICE_OPTIONS;
    const serviceLabels = selectedOpts.map((o) => o.label).join(", ") || "Services à définir";
    const serviceDetails = selectedOpts.length > 0
      ? selectedOpts.map((o) => `  • ${o.label} — ${o.longDesc}`).join("\n")
      : "";
    return `Crée une proposition commerciale professionnelle et visuellement percutante, présentée par l'agence "${agencyName}".

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROSPECT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Nom : ${prospectName}
${domain ? `Domaine / Industrie : ${domain}` : ""}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OFFRE PROPOSÉE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Services inclus : ${serviceLabels}

Description détaillée de chaque service :
${serviceDetails}
${pricePerMonth ? `Investissement mensuel : ${pricePerMonth} $ / mois` : ""}
${monthsTotal ? `Durée du contrat : ${monthsTotal} mois` : ""}
${total > 0 ? `Valeur totale du contrat : ${total.toLocaleString("fr-CA")} $` : ""}
${mainGoal ? `\nObjectif principal du prospect : ${mainGoal}` : ""}
${resultKpis.length ? `\nKPIs à mettre en avant :\n${resultKpis.map((k) => {
      const opt = RESULT_KPI_OPTIONS.find(o => o.id === k);
      const target = kpiTargets[k];
      return `  • ${opt?.label ?? k}${target ? ` : ${target}` : ""}`;
    }).join("\n")}` : ""}
${expectedResults ? `\nRésultats prévus / promesse chiffrée : ${expectedResults}` : ""}
${deliverables ? `\nLivrables clés : ${deliverables}` : ""}
${timeline ? `\nCalendrier / échéancier : ${timeline}` : ""}
${extraNotes ? `\nNotes additionnelles : ${extraNotes}` : ""}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STRUCTURE ATTENDUE (10-14 slides)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Slide de garde — logo, nom du prospect, date
2. Résumé exécutif — pourquoi ce partenariat
3. Compréhension du besoin (${domain || "leur domaine"})
4. Notre approche — méthodologie ${agencyName}
5. Détail de l'offre — chaque service listé (${serviceLabels})
6. Livrables mois par mois
7. Résultats prévus & KPIs${expectedResults ? ` (${expectedResults})` : ""}
8. Investissement — ${pricePerMonth ? `${pricePerMonth} $/mois × ${monthsTotal || "?"} mois = ${total > 0 ? total.toLocaleString("fr-CA") + " $" : "à définir"}` : "à définir"}
9. Calendrier de démarrage
10. Pourquoi ${agencyName} — preuves & résultats
11. Prochaines étapes & signature
12. Contact

Ton : professionnel, direct, orienté résultats mesurables. Éviter le jargon corporate.
Format : présentation moderne, aérée, avec 1-2 chiffres clés par slide.
Couleur d'accent : ${agency?.color ?? "#7c3aed"}`;
  };

  const canSubmit = prospectName.trim().length > 1 && services.length > 0;

  const handleCreate = () => {
    if (!canSubmit) return;
    const sub: Submission = {
      id: crypto.randomUUID(),
      clientId,
      clientName: selectedClient?.name ?? prospectName.trim(),
      prospectName: prospectName.trim(),
      domain: domain.trim(),
      pricePerMonth: pricePerMonth.trim(),
      monthsTotal: monthsTotal.trim(),
      services,
      mainGoal: mainGoal.trim(),
      resultKpis,
      kpiTargets,
      expectedResults: expectedResults.trim(),
      deliverables: deliverables.trim(),
      timeline: timeline.trim(),
      nextMeeting: nextMeeting.trim(),
      extraNotes: extraNotes.trim(),
      prompt: buildPrompt(),
      status: "draft",
      createdAt: Date.now(),
    };
    onCreate(sub);
    toast.success("Soumission créée — génère la présentation sur la page suivante");
  };

  const total = totalContract();

  return (
    <div className="p-8 space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <button onClick={onCancel} className="p-1.5 rounded-lg border border-border/40 hover:bg-accent">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h2 className="text-xl font-semibold text-foreground">Nouvelle soumission</h2>
          <p className="text-sm text-muted-foreground">Remplis le brief — Gamma générera la présentation pour toi</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border/40 bg-card p-6 space-y-6">
        {/* ── Section 1: Prospect ── */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full">1 · Prospect</span>
          </div>

          {clients.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs">Client existant <span className="text-muted-foreground">(optionnel — pré-remplit les champs)</span></Label>
              <select value={clientId} onChange={(e) => pickClient(e.target.value)}
                className="w-full h-10 text-sm rounded-md border border-input bg-background px-3 text-foreground">
                <option value="">— Nouveau prospect —</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}{c.industry ? ` · ${c.industry}` : ""}</option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Nom du prospect <span className="text-destructive">*</span></Label>
              <Input value={prospectName} onChange={(e) => setProspectName(e.target.value)}
                placeholder="Ex: Studio Lumière" className="text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Domaine du prospect</Label>
              <select value={domainChoice} onChange={(e) => setDomainChoice(e.target.value)}
                className="w-full h-10 text-sm rounded-md border border-input bg-background px-3 text-foreground">
                <option value="">— Choisir un domaine —</option>
                {DOMAIN_OPTIONS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              {domainChoice === "Autre" && (
                <Input value={domainOther} onChange={(e) => setDomainOther(e.target.value)}
                  placeholder="Précise le domaine…" className="text-sm mt-1.5" autoFocus />
              )}
            </div>
          </div>
        </div>

        {/* ── Section 2: Offre ── */}
        <div className="space-y-4 pt-2 border-t border-border/30">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full">2 · Offre</span>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Services inclus <span className="text-destructive">*</span></Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {SERVICE_OPTIONS.map((opt) => {
                const active = services.includes(opt.id);
                return (
                  <button key={opt.id} type="button" onClick={() => toggleService(opt.id)}
                    className={`text-left p-3 rounded-lg border transition-all ${active
                      ? "border-primary bg-primary/8 shadow-sm"
                      : "border-border/40 bg-muted/10 hover:border-border/70"}`}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-base leading-none">{opt.emoji}</span>
                      {active && <Check className="w-3 h-3 text-primary" />}
                    </div>
                    <p className={`text-xs font-semibold ${active ? "text-foreground" : "text-foreground/80"}`}>{opt.label}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{opt.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Section 3: Investissement ── */}
        <div className="space-y-4 pt-2 border-t border-border/30">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full">3 · Investissement</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Prix par mois ($)</Label>
              <Input type="number" value={pricePerMonth} onChange={(e) => setPricePerMonth(e.target.value)}
                placeholder="Ex: 4500" className="text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Total de mois</Label>
              <Input type="number" value={monthsTotal} onChange={(e) => setMonthsTotal(e.target.value)}
                placeholder="Ex: 6" className="text-sm" />
            </div>
          </div>

          {total > 0 && (
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Valeur totale du contrat</span>
              <span className="text-lg font-bold text-primary">{total.toLocaleString("fr-CA")} $</span>
            </div>
          )}
        </div>

        {/* ── Section 4: Contexte ── */}
        <div className="space-y-4 pt-2 border-t border-border/30">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full">4 · Contexte <span className="text-muted-foreground">(optionnel)</span></span>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Objectif principal du prospect</Label>
            <Input value={mainGoal} onChange={(e) => setMainGoal(e.target.value)}
              placeholder="Ex: Doubler les réservations d'ici 3 mois" className="text-sm" />
          </div>

          <div className="space-y-3">
            <Label className="text-xs">KPIs à mettre en avant <span className="text-muted-foreground">(click pour activer, tape la cible chiffrée)</span></Label>

            {/* All chips */}
            <div className="flex flex-wrap gap-1.5">
              {RESULT_KPI_OPTIONS.map((k) => {
                const active = resultKpis.includes(k.id);
                return (
                  <button key={k.id} type="button" onClick={() => toggleKpi(k.id)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-all ${active
                      ? "bg-primary/15 border-primary/50 text-primary font-semibold"
                      : "bg-muted/20 border-border/40 text-foreground/80 hover:border-border/70"}`}>
                    {k.emoji} {k.label}
                  </button>
                );
              })}
            </div>

            {/* Target inputs for selected KPIs */}
            {resultKpis.length > 0 && (
              <div className="rounded-xl border border-border/40 bg-muted/10 p-3 space-y-2">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Cibles chiffrées</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {resultKpis.map((id) => {
                    const opt = RESULT_KPI_OPTIONS.find(o => o.id === id);
                    if (!opt) return null;
                    return (
                      <div key={id} className="flex items-center gap-2">
                        <span className="text-xs w-32 flex-shrink-0 flex items-center gap-1.5">
                          <span>{opt.emoji}</span>
                          <span className="text-foreground font-medium">{opt.label}</span>
                        </span>
                        <Input value={kpiTargets[id] ?? ""} onChange={(e) => setKpiTarget(id, e.target.value)}
                          placeholder="Ex: 500/mois, +30%…" className="h-8 text-xs" />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Résultats prévus <span className="text-muted-foreground">(ta promesse chiffrée)</span></Label>
            <Textarea value={expectedResults} onChange={(e) => setExpectedResults(e.target.value)}
              placeholder="Ex:&#10;- +30% de nouvelles demandes en 90 jours&#10;- 15 leads qualifiés/mois via ads&#10;- 3-5 dossiers signés supplémentaires par mois"
              rows={3} className="text-sm" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Livrables clés (bullet points)</Label>
            <Textarea value={deliverables} onChange={(e) => setDeliverables(e.target.value)}
              placeholder="- 8 Reels / mois&#10;- 2 vidéos long format&#10;- Campagne Meta Ads $500/mois" rows={3} className="text-sm" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Calendrier / échéancier</Label>
              <Input value={timeline} onChange={(e) => setTimeline(e.target.value)}
                placeholder="Ex: Démarrage 15 juillet" className="text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Prochaine rencontre <span className="text-muted-foreground">(inclus dans l'email)</span></Label>
              <Input value={nextMeeting} onChange={(e) => setNextMeeting(e.target.value)}
                placeholder="Ex: mardi 15 juillet à 10h" className="text-sm" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Notes additionnelles</Label>
            <Textarea value={extraNotes} onChange={(e) => setExtraNotes(e.target.value)}
              placeholder="Ex: Prospect existant qui veut étendre à TikTok, priorité au ROI mesurable…" rows={2} className="text-sm" />
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-border/30">
          <p className="text-[10px] text-muted-foreground italic">
            Branding : logo + couleurs de <span className="text-foreground font-medium">{agencyName}</span>
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onCancel}>Annuler</Button>
            <Button onClick={handleCreate} disabled={!canSubmit} className="gap-2 shadow-glow">
              <Check className="w-4 h-4" /> Créer la soumission
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Submission detail — generate with Gamma ────────────────────────────────

function SubmissionDetail({ submission, onBack, onUpdate, onDelete }: {
  submission: Submission; onBack: () => void; onUpdate: (s: Submission) => void; onDelete: () => void;
}) {
  const { data: agency } = useAgencySettings();
  const agencyName = agency?.name ?? "Mon Agence";

  const [prompt, setPrompt] = useState(submission.prompt);
  const [gammaUrlInput, setGammaUrlInput] = useState(submission.gammaUrl ?? "");

  // Auto-generated follow-up email — 4 variations (tu/vous mix), short & casual
  const [variantIdx, setVariantIdx] = useState(0);

  const emailVariants = (() => {
    const firstName = (submission.prospectName || submission.clientName).split(" ")[0];
    const url = submission.gammaUrl;
    const meeting = submission.nextMeeting;

    // Variation 1 — tu, direct
    const v1 = `Salut ${firstName},

Ça a été un plaisir d'échanger avec toi.${url ? `\n\nTu peux consulter la proposition complète ici :\n${url}` : ""}

N'hésite pas à me revenir avec tes questions — ${meeting ? `on se voit ${meeting}` : "on se reparle bientôt"}.

À bientôt,
${agencyName}`;

    // Variation 2 — vous (pluriel, plusieurs interlocuteurs)
    const v2 = `Bonjour ${firstName},

C'était un plaisir d'échanger avec vous.${url ? `\n\nVoici la proposition complète :\n${url}` : ""}

Prenez le temps de la regarder — ${meeting ? `on se revoit ${meeting}` : "je vous relance dans les prochains jours"}.

Au plaisir,
${agencyName}`;

    // Variation 3 — vous formel mais chaleureux
    const v3 = `Bonjour ${firstName},

Merci pour votre temps aujourd'hui, ça a été très agréable.${url ? `\n\nComme convenu, voici la proposition :\n${url}` : ""}

N'hésitez pas à me revenir avec vos questions${meeting ? ` — à ${meeting}` : ""}.

À très vite,
${agencyName}`;

    // Variation 4 — tu, très court
    const v4 = `Hey ${firstName},

Vraiment content de notre échange.${url ? `\n\nLa proposition est ici :\n${url}` : ""}

${meeting ? `On se voit ${meeting}` : "On se reparle bientôt"} — reviens-moi avec tes questions entre-temps.

${agencyName}`;

    return [v1, v2, v3, v4];
  })();

  const defaultEmail = emailVariants[variantIdx];

  const [emailBody, setEmailBody] = useState(submission.followupEmail ?? defaultEmail);

  // Re-generate the email whenever key submission fields change or variant switches
  // (and the user hasn't manually edited it since last generation)
  useEffect(() => {
    if (!submission.followupEmail) setEmailBody(defaultEmail);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submission.gammaUrl, submission.services.length, submission.pricePerMonth, submission.monthsTotal, submission.nextMeeting, variantIdx]);

  const cycleVariant = () => {
    setVariantIdx((i) => (i + 1) % emailVariants.length);
    // Force regeneration even if the user had edited — this is an explicit "give me another"
    onUpdate({ ...submission, followupEmail: undefined });
  };

  const copyEmail = async () => {
    await navigator.clipboard.writeText(emailBody);
    toast.success("Email copié");
  };

  const saveEmail = () => {
    onUpdate({ ...submission, followupEmail: emailBody });
    toast.success("Email de suivi sauvegardé");
  };

  const resetEmail = () => {
    setEmailBody(defaultEmail);
    onUpdate({ ...submission, followupEmail: undefined });
    toast.success("Email réinitialisé au template auto");
  };

  const openMailClient = () => {
    const firstName = (submission.prospectName || submission.clientName).split(" ")[0];
    const subject = `Notre proposition pour ${firstName}`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`;
  };

  // Persist prompt edits automatically on blur
  useEffect(() => {
    if (prompt !== submission.prompt) {
      const t = setTimeout(() => onUpdate({ ...submission, prompt }), 500);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prompt]);

  const copyPrompt = async () => {
    await navigator.clipboard.writeText(prompt);
    toast.success("Prompt copié — colle-le dans ton outil de présentation IA");
  };

  const openTool = (baseUrl: string, urlParam?: string) => {
    // Copy prompt first so user can paste immediately
    navigator.clipboard.writeText(prompt).catch(() => {});
    const url = urlParam ? `${baseUrl}?${urlParam}=${encodeURIComponent(prompt.slice(0, 8000))}` : baseUrl;
    window.open(url, "_blank");
    onUpdate({ ...submission, prompt, status: submission.status === "draft" ? "generating" : submission.status });
    toast.success("Prompt copié dans le presse-papier + outil ouvert");
  };

  const saveGammaUrl = () => {
    if (!gammaUrlInput.trim()) return;
    onUpdate({ ...submission, gammaUrl: gammaUrlInput.trim(), status: "ready" });
    toast.success("Lien de la présentation sauvegardé");
  };

  return (
    <div className="p-8 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 rounded-lg border border-border/40 hover:bg-accent">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-xl font-semibold text-foreground">{submission.prospectName || submission.clientName}</h2>
            <p className="text-sm text-muted-foreground">{submission.domain || "Domaine non spécifié"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={submission.status} />
          <Button variant="ghost" size="icon" onClick={() => { if (confirm("Supprimer cette soumission?")) onDelete(); }}
            className="text-muted-foreground hover:text-destructive">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Meta */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetaCell label="Prix/mois" value={submission.pricePerMonth ? `${submission.pricePerMonth} $` : "—"} />
        <MetaCell label="Durée" value={submission.monthsTotal ? `${submission.monthsTotal} mois` : "—"} />
        <MetaCell label="Total contrat"
          value={(() => {
            const p = parseFloat(submission.pricePerMonth) || 0;
            const m = parseFloat(submission.monthsTotal) || 0;
            const t = p * m;
            return t > 0 ? `${t.toLocaleString("fr-CA")} $` : "—";
          })()} />
        <MetaCell label="Services" value={String(submission.services?.length ?? 0)} />
      </div>
      {submission.services?.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {submission.services.map((sv) => {
            const opt = SERVICE_OPTIONS.find(o => o.id === sv);
            if (!opt) return null;
            return (
              <span key={sv} className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium">
                {opt.emoji} {opt.label}
              </span>
            );
          })}
        </div>
      )}

      {/* Ready state — show the deck */}
      {submission.status === "ready" && submission.gammaUrl && (
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/5 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Check className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-bold text-foreground">Soumission prête à envoyer</h3>
          </div>
          <a href={submission.gammaUrl} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-400 hover:underline">
            Ouvrir la présentation Gamma <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <div className="flex gap-2 pt-2 border-t border-emerald-500/20">
            <Button size="sm" variant="outline"
              onClick={() => { navigator.clipboard.writeText(submission.gammaUrl!); toast.success("Lien copié"); }}
              className="gap-1.5">
              <Copy className="w-3.5 h-3.5" /> Copier le lien
            </Button>
          </div>
        </div>
      )}

      {/* Ready state — show the deck */}
      {submission.status === "ready" && submission.gammaUrl && (
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/5 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Check className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-bold text-foreground">Soumission prête à envoyer</h3>
          </div>
          <a href={submission.gammaUrl} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-400 hover:underline break-all">
            {submission.gammaUrl} <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}

      {/* Prompt editor */}
      <div className="rounded-2xl border border-border/40 bg-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground">Ton prompt de soumission</h3>
          </div>
          <Button size="sm" onClick={copyPrompt} className="gap-1.5 shadow-glow">
            <Copy className="w-3.5 h-3.5" /> Copier le prompt
          </Button>
        </div>
        <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={16}
          className="text-xs font-mono leading-relaxed" />
        <p className="text-[10px] text-muted-foreground">
          Modifie le prompt si tu veux ajuster le ton ou les détails. Sauvegarde auto.
        </p>
      </div>

      {/* Quick-open with AI tools */}
      <div className="rounded-2xl border border-border/40 bg-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground">Générer la présentation</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Un click ouvre l'outil et copie ton prompt dans le presse-papier — tu n'as qu'à coller (Cmd+V).
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() => openTool("https://gamma.app/create/generate")}
            className="group flex flex-col items-start gap-1.5 p-4 rounded-xl border border-border/40 bg-muted/10 hover:border-fuchsia-500/50 hover:bg-fuchsia-500/5 transition-all text-left"
          >
            <div className="flex items-center gap-2 w-full">
              <Presentation className="w-4 h-4 text-fuchsia-400" />
              <span className="text-sm font-bold text-foreground">Gamma</span>
              <ExternalLink className="w-3 h-3 text-muted-foreground ml-auto group-hover:text-foreground" />
            </div>
            <p className="text-[11px] text-muted-foreground">Meilleur pour présentations design</p>
          </button>

          <button
            onClick={() => openTool("https://claude.ai/new")}
            className="group flex flex-col items-start gap-1.5 p-4 rounded-xl border border-border/40 bg-muted/10 hover:border-orange-500/50 hover:bg-orange-500/5 transition-all text-left"
          >
            <div className="flex items-center gap-2 w-full">
              <Wand2 className="w-4 h-4 text-orange-400" />
              <span className="text-sm font-bold text-foreground">Claude</span>
              <ExternalLink className="w-3 h-3 text-muted-foreground ml-auto group-hover:text-foreground" />
            </div>
            <p className="text-[11px] text-muted-foreground">Meilleur pour rédaction fine</p>
          </button>

          <button
            onClick={() => openTool("https://chatgpt.com/")}
            className="group flex flex-col items-start gap-1.5 p-4 rounded-xl border border-border/40 bg-muted/10 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all text-left"
          >
            <div className="flex items-center gap-2 w-full">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-bold text-foreground">ChatGPT</span>
              <ExternalLink className="w-3 h-3 text-muted-foreground ml-auto group-hover:text-foreground" />
            </div>
            <p className="text-[11px] text-muted-foreground">Polyvalent, avec GPTs custom</p>
          </button>
        </div>
      </div>

      {/* Manual URL capture */}
      <div className="rounded-2xl border border-border/40 bg-card p-6 space-y-3">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground">Lien de la présentation finale</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Une fois ta présentation créée, colle son URL ici pour la retrouver facilement.
        </p>
        <div className="flex gap-2">
          <Input value={gammaUrlInput} onChange={(e) => setGammaUrlInput(e.target.value)}
            placeholder="https://gamma.app/docs/... ou toute autre URL" className="text-sm font-mono" />
          <Button onClick={saveGammaUrl} disabled={!gammaUrlInput.trim()} variant="outline" className="gap-1.5">
            <Check className="w-4 h-4" /> Sauvegarder
          </Button>
        </div>
      </div>

      {/* ── Étape finale : Email de suivi ── */}
      <div className="rounded-2xl border-2 border-primary/30 bg-primary/[0.03] p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/15 px-2 py-0.5 rounded-full">ÉTAPE FINALE</span>
            <h3 className="text-sm font-bold text-foreground">Email de suivi à envoyer</h3>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={cycleVariant}
              className="text-[11px] text-primary hover:underline transition-colors font-medium">
              🔀 Autre variation ({variantIdx + 1}/{emailVariants.length})
            </button>
            <button onClick={resetEmail}
              className="text-[11px] text-muted-foreground hover:text-primary transition-colors">
              Réinitialiser
            </button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Template pré-rempli avec le nom, le lien de la proposition et la prochaine rencontre. 4 variations disponibles (tu / vous, court / chaleureux) — clique « Autre variation » pour changer. Modifie librement puis copie.
        </p>
        <Textarea value={emailBody} onChange={(e) => setEmailBody(e.target.value)}
          onBlur={saveEmail}
          rows={14} className="text-sm leading-relaxed" />
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={copyEmail} className="gap-2 shadow-glow">
            <Copy className="w-4 h-4" /> Copier l'email
          </Button>
          <Button onClick={openMailClient} variant="outline" className="gap-2">
            <ExternalLink className="w-4 h-4" /> Ouvrir dans mon client mail
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground italic">
          Auto-sauvegardé quand tu quittes la textarea.
        </p>
      </div>
    </div>
  );
}

function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/40 bg-muted/20 p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
      <p className="text-sm font-medium text-foreground mt-0.5">{value}</p>
    </div>
  );
}




// ─── Nos forfaits — page de référence (structure 2a) ────────────────────────

// ── Section 1 : HERO (Forfait 01) ──
// Overriding local Blue + Orange accents since dashboard --primary is agency-configurable
// and we need explicit color contrast between F1 (bleu) and F2 (orange) per spec.

const BLUE = { text: "text-blue-400", bg: "bg-blue-500", bgHover: "hover:bg-blue-600", border: "border-blue-500/40", bgSoft: "bg-blue-500/[0.06]", dot: "bg-blue-500" };
const ORNG = { text: "text-orange-400", bg: "bg-orange-500", bgHover: "hover:bg-orange-600", border: "border-orange-500/40", bgSoft: "bg-orange-500/[0.06]", dot: "bg-orange-500" };

interface ToolItem { name: string; icon: React.ReactNode }

const TOOLS: ToolItem[] = [
  { name: "Meta",         icon: <MetaMark /> },
  { name: "Claude",       icon: <StarburstMark /> },
  { name: "GoHighLevel",  icon: <ArrowsUpMark /> },
  { name: "Metricool",    icon: <InfinityMark /> },
  { name: "ClickUp",      icon: <ClickUpMark /> },
  { name: "Instagram",    icon: <InstagramSVG /> },
  { name: "Facebook",     icon: <FacebookSVG /> },
  { name: "TikTok",       icon: <TikTokMark /> },
  { name: "YouTube",      icon: <YouTubeSVG /> },
];

function ForfaitsView({ onBack }: { onBack: () => void }) {
  return (
    <div className="p-8 space-y-20 max-w-6xl mx-auto text-foreground">
      <style>{`
        @keyframes marquee-scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .marquee-track { animation: marquee-scroll 34s linear infinite; }
        @keyframes crm-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
        .crm-dot { animation: crm-pulse 1.6s ease-in-out infinite; }
      `}</style>

      {/* Header (back) */}
      <div className="flex items-center gap-3 -mt-2">
        <button onClick={onBack} className="p-1.5 rounded-lg border border-border/50 hover:bg-accent transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <span className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">Nos forfaits</span>
      </div>

      {/* ═════════ 1 · HERO — Forfait 01 ═════════ */}
      <section className="flex flex-col items-center text-center gap-8 pt-4">
        <p className={`text-[11px] font-mono uppercase tracking-widest ${BLUE.text}`}>
          Forfait 01 · Génération de rendez-vous
        </p>
        <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold uppercase tracking-tight leading-[0.95] max-w-[9ch]">
          Ta machine<br />à rendez-vous
        </h1>

        {/* 3-line pricing block */}
        <div className="w-[420px] max-w-full divide-y divide-border/30 border-y border-border/30">
          {[
            { label: "Installation",   value: "Une seule fois" },
            { label: "Gestion",        value: "Chaque mois"    },
            { label: "Renouvellement", value: "Aux 2 mois"     },
          ].map((line) => (
            <div key={line.label} className="flex items-center justify-between py-3 text-sm">
              <span className="font-mono text-muted-foreground">{line.label}</span>
              <span className="text-foreground font-medium">{line.value}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-5">
          <button className={`${BLUE.bg} ${BLUE.bgHover} text-white text-sm font-semibold px-5 py-3 rounded-full transition-colors`}>
            Réserver un appel
          </button>
          <a href="#inclus" className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground transition-colors">
            Voir comment ça marche
          </a>
        </div>
      </section>

      {/* ═════════ 2 · TOOLS BANNER ═════════ */}
      <section className="space-y-8">
        <p className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
          Sur quoi c'est bâti
        </p>

        {/* Marquee */}
        <div className="relative overflow-hidden"
             style={{
               maskImage: "linear-gradient(90deg, transparent 0%, black 8%, black 92%, transparent 100%)",
               WebkitMaskImage: "linear-gradient(90deg, transparent 0%, black 8%, black 92%, transparent 100%)",
             }}>
          <div className="marquee-track flex gap-12 w-max whitespace-nowrap">
            {[...TOOLS, ...TOOLS].map((t, i) => (
              <div key={i} className="flex items-center gap-2.5 shrink-0">
                <span className="w-5 h-5 text-foreground opacity-85 flex items-center justify-center">{t.icon}</span>
                <span className="text-sm font-medium text-foreground opacity-85">{t.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 3 cards below */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { title: "Acquisition payante", desc: "Meta Ads gérées : création, tests d'angles, opti hebdo." },
            { title: "Automatisation & IA",  desc: "GoHighLevel + Claude : qualification, séquences, suivi jusqu'au RDV." },
            { title: "Publication & suivi", desc: "Metricool + ClickUp : programmation, dashboards, rapports mensuels." },
          ].map((c) => (
            <div key={c.title} className="rounded-xl border border-border/40 p-5 bg-card/40">
              <p className="text-sm font-semibold text-foreground">{c.title}</p>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{c.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═════════ SECTION 01 · CE QUI EST INCLUS ═════════ */}
      <section id="inclus" className="space-y-10">
        <div className="flex items-baseline gap-6">
          <span className="text-[11px] font-mono text-muted-foreground">01</span>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Ce qui est inclus</h2>
        </div>

        <IncludedBlock
          title="À la signature"
          items={[
            "Audit de départ (marché, offre, objectifs)",
            "CRM personnalisé (pipelines, tags, workflows)",
            "Automatisations SMS + courriel",
            "Landing page de conversion",
            "Tracking Pixel Meta + CAPI serveur",
            "Logiciel IA de qualification personnalisé",
            "Dashboard client en direct",
            "Premier tournage (demi-journée) + premier lot de créatifs",
          ]}
        />
        <IncludedBlock
          title="Chaque mois"
          items={[
            "Gestion Meta Ads complète (création, tests, opti hebdo)",
            "Nouvelles ads statiques (2 à 3 par mois)",
            "Maintenance du CRM + automatisations",
            "Suivi structuré des leads jusqu'au RDV",
            "Rapport mensuel de performance",
            "Call de review + ajustements stratégiques",
            "Support prioritaire (Slack / courriel)",
            "Optimisation continue des angles publicitaires",
          ]}
        />
        <IncludedBlock
          title="À chaque 2 mois"
          items={[
            "1 tournage vidéo (demi-journée) — déplacement inclus",
            "Nouveau lot de créatifs vidéo",
            "Renouvellement des angles publicitaires",
            "Session stratégique de recalibrage",
          ]}
        />
      </section>

      {/* ═════════ SECTION 02 · LE PREMIER MOIS ═════════ */}
      <section className="space-y-10">
        <div className="flex items-baseline gap-6">
          <span className="text-[11px] font-mono text-muted-foreground">02</span>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Le premier mois</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { label: "Semaine 1", title: "Kickoff & audit",     sentence: "On aligne les objectifs, on récupère les accès, on définit les angles à tester." },
            { label: "Semaine 2", title: "Build & tracking",    sentence: "CRM configuré, landing en ligne, Pixel + CAPI installés, automatisations en place." },
            { label: "Semaine 3", title: "Tournage & créatifs", sentence: "Premier tournage sur ta demi-journée, montage rapide, premières ads produites." },
            { label: "Semaine 4+", title: "Launch & opti",      sentence: "Ads en ligne, mesures quotidiennes, ajustements en continu, premiers RDV qualifiés." },
          ].map((w) => (
            <div key={w.label} className="pt-6 border-t border-border/40">
              <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{w.label}</p>
              <p className="mt-3 text-lg font-semibold text-foreground">{w.title}</p>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{w.sentence}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═════════ SECTION 04 · FORFAIT 02 (ORANGE) ═════════ */}
      <section
        className={`-mx-8 px-8 py-16 space-y-12 ${ORNG.bgSoft} border-y ${ORNG.border}`}
      >
        {/* Header */}
        <div className="flex flex-col items-start gap-3">
          <p className={`text-[11px] font-mono uppercase tracking-widest ${ORNG.text}`}>
            Forfait 02 · Contenu et visibilité
          </p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground max-w-2xl">
            Ton nom devient <span style={{ fontFamily: "Georgia, serif" }} className="italic text-orange-400">la référence</span>.
          </h2>
        </div>

        {/* Pastilles horizontales */}
        <div className="flex items-center gap-4 flex-wrap">
          {["Être vu", "Créer de la confiance", "Générer des prospects"].map((step, i, arr) => (
            <div key={step} className="flex items-center gap-4">
              <span className={`px-4 py-2 rounded-full border ${ORNG.border} ${ORNG.bgSoft} text-sm ${ORNG.text} font-medium`}>
                {step}
              </span>
              {i < arr.length - 1 && <ArrowRightIcon className={`w-4 h-4 ${ORNG.text} opacity-70`} />}
            </div>
          ))}
        </div>

        {/* Choisis ton rythme */}
        <div>
          <p className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground mb-4">Choisis ton rythme</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: "Format 8", videos: "8 vidéos publiées / mois",  price: "3 200 $", note: "Pour maintenir une présence solide." },
              { label: "Format 10", videos: "10 vidéos publiées / mois", price: "3 500 $", note: "Pour dominer ta niche — le plus populaire." , featured: true },
            ].map((f) => (
              <div key={f.label} className={`rounded-2xl border-2 p-6 ${f.featured ? `${ORNG.border}` : "border-border/40"} bg-card/40`}>
                <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{f.label}</p>
                <p className={`text-3xl font-bold mt-2 ${f.featured ? ORNG.text : "text-foreground"}`}>{f.price}<span className="text-sm text-muted-foreground font-normal">/mois</span></p>
                <p className="text-sm text-foreground mt-3">{f.videos}</p>
                <p className="text-xs text-muted-foreground mt-1">{f.note}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 4 axes complémentaires */}
        <div>
          <p className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground mb-4">4 axes complémentaires</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { title: "Stratégie",    desc: "Angles, positionnement, calendrier 50/30/20 (éducation/preuve/offre)." },
              { title: "Création",     desc: "Tournage aux 2 mois, montage, sous-titrage, adaptation par plateforme." },
              { title: "Acquisition",  desc: "Ads vidéo + statiques, gestion Meta complète pour amplifier le contenu." },
              { title: "Accompagnement", desc: "Coaching caméra à chaque tournage + review stratégique mensuelle." },
            ].map((a) => (
              <div key={a.title} className={`rounded-xl border ${ORNG.border} p-5 bg-card/40`}>
                <p className="text-sm font-semibold text-foreground">{a.title}</p>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{a.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Sur mesure */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 items-end pt-4">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground mb-3">Sur mesure</p>
            <ul className="space-y-2 text-sm text-foreground">
              <li>· Volume plus élevé (15 à 20 vidéos / mois)</li>
              <li>· CRM personnalisé (upsell disponible dès le mois 3)</li>
              <li>· Bot AI conversationnel + landing page dédiée</li>
            </ul>
          </div>
          <button className={`${ORNG.bg} ${ORNG.bgHover} text-white text-sm font-semibold px-5 py-3 rounded-full transition-colors`}>
            Discuter de ce forfait
          </button>
        </div>
      </section>

      {/* ═════════ SECTION 05 · COMPARAISON ═════════ */}
      <section className="space-y-8">
        <div className="flex items-baseline gap-6">
          <span className="text-[11px] font-mono text-muted-foreground">05</span>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Comparaison</h2>
        </div>

        <div className="rounded-2xl border border-border/40 overflow-hidden">
          {/* Header row */}
          <div className="grid grid-cols-[300px_1fr_1fr] gap-4 px-6 py-4 bg-muted/20 border-b border-border/40 items-center">
            <span className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">Dimension</span>
            <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${BLUE.bgSoft} border ${BLUE.border} text-xs font-medium ${BLUE.text} w-fit`}>
              <span className={`w-1.5 h-1.5 rounded-full ${BLUE.dot}`} /> Forfait 01
            </span>
            <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${ORNG.bgSoft} border ${ORNG.border} text-xs font-medium ${ORNG.text} w-fit`}>
              <span className={`w-1.5 h-1.5 rounded-full ${ORNG.dot}`} /> Forfait 02
            </span>
          </div>

          {/* Rows */}
          {[
            { dim: "Objectif",              f1: "Générer des RDV qualifiés rapidement",       f2: "Bâtir la marque + générer sur le long terme" },
            { dim: "Résultats visibles",    f1: "En 4 à 8 semaines",                          f2: "En 3 à 6 mois" },
            { dim: "Contenu vidéo",         f1: "1 tournage / 2 mois",                        f2: "1 tournage / mois · 8 à 10 vidéos publiées" },
            { dim: "Publicités Meta",       f1: "Gestion complète incluse",                    f2: "Gestion complète incluse" },
            { dim: "CRM + automatisations", f1: "Sur mesure, inclus dès la signature",         f2: "Upsell à partir du mois 3" },
            { dim: "Logiciel IA",           f1: "Qualification personnalisée + dashboard",     f2: "Qualification personnalisée + dashboard" },
            { dim: "Ton implication",       f1: "1 demi-journée / 2 mois",                    f2: "1 demi-journée / mois + coaching caméra" },
          ].map((row) => (
            <div key={row.dim} className="grid grid-cols-[300px_1fr_1fr] gap-4 px-6 py-4 border-b border-border/30 last:border-0 items-start text-sm">
              <span className="text-muted-foreground font-medium">{row.dim}</span>
              <span className="text-foreground">{row.f1}</span>
              <span className="text-foreground">{row.f2}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ═════════ CTA FINAL ═════════ */}
      <section className="flex items-end justify-between pt-10 border-t border-border/40 gap-6 flex-wrap">
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight max-w-xl">
          On regarde ensemble <span style={{ fontFamily: "Georgia, serif" }} className={`italic ${BLUE.text}`}>ce qui te va</span>.
        </h2>
        <button className={`${BLUE.bg} ${BLUE.bgHover} text-white text-sm font-semibold px-6 py-3.5 rounded-full transition-colors inline-flex items-center gap-2`}>
          Réserver un appel
          <ArrowRightIcon className="w-4 h-4" />
        </button>
      </section>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function IncludedBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[250px_1fr] gap-6">
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 divide-y sm:divide-y-0 divide-border/20 border-t border-border/20">
        {items.map((it, i) => (
          <li key={i} className="flex items-start gap-3 py-3 text-sm text-foreground border-t sm:border-t border-border/20 first:border-t-0 sm:first:border-t sm:[&:nth-child(2)]:border-t">
            <Check className="w-3.5 h-3.5 text-foreground/50 flex-shrink-0 mt-1" />
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

// Brand marks — all white / currentColor for uniform white-on-dark treatment.
function MetaMark()      { return <svg viewBox="0 0 32 24" fill="currentColor"><path d="M16 6.5C13 2.5 10 1 7 2.5 3 4.5 2 10 4 15c1.5 4 4 6 7 6 2 0 4-1 5-2.5 1 1.5 3 2.5 5 2.5 3 0 5.5-2 7-6 2-5 1-10.5-3-12.5-3-1.5-6 0-9 4zm-9 8c-1-3 0-6 2-7 1.5-.7 3.5.3 5 2.5-.7 1.7-1.5 3.5-2.3 4.7C10.5 16 9 16.5 8 16c-.5-.3-1-1-1-1.5zm18 0c0 .5-.5 1.2-1 1.5-1 .5-2.5 0-3.7-1.3-.8-1.2-1.6-3-2.3-4.7 1.5-2.2 3.5-3.2 5-2.5 2 1 3 4 2 7z"/></svg>; }
function StarburstMark() { return <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2v6L15 5l1 1-3 3h6v2h-6l3 3-1 1-3-3v6h-2v-6l-3 3-1-1 3-3H3v-2h6L6 6l1-1 3 3V2z"/></svg>; }
function ArrowsUpMark()  { return <svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 20V10l3-3 3 3v10H4zm7 0V6l3-3 3 3v14h-6zm7 0V13l2-2 2 2v7h-4z"/></svg>; }
function InfinityMark()  { return <svg viewBox="0 0 32 16" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M8 8c0-3 2-5 5-5s5 2 5 5-2 5-5 5-5-2-5-5m10 0c0-3 2-5 5-5s5 2 5 5-2 5-5 5-5-2-5-5" transform="translate(-4)"/></svg>; }
function ClickUpMark()   { return <svg viewBox="0 0 24 24" fill="currentColor"><path d="M2 18l3.5-2.7c1.9 2.5 4 3.6 6.4 3.6 2.4 0 4.5-1.1 6.4-3.6L21.9 18C19.2 21.4 16 23 12 23s-7.2-1.6-10-5zM12 5.6L6.1 10.7l-2.8-3.2L12 0l8.7 7.5-2.8 3.2L12 5.6z"/></svg>; }
function TikTokMark()    { return <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.6 6.3c-1.7-.2-3.2-1-4.2-2.3-.5-.7-.9-1.5-1-2.4h-3.5v13.9c0 1.5-1.2 2.7-2.7 2.7-1.5 0-2.7-1.2-2.7-2.7 0-1.5 1.2-2.7 2.7-2.7.3 0 .6.1.9.2v-3.5c-.3-.1-.6-.1-.9-.1-3.4 0-6.2 2.8-6.2 6.2S4.7 21.8 8.1 21.8s6.2-2.8 6.2-6.2V8.9c1.5 1 3.3 1.6 5.3 1.6V7c0-.2 0-.5 0-.7z"/></svg>; }
function InstagramSVG()  { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.4a4 4 0 1 1-7.9 1.2 4 4 0 0 1 7.9-1.2"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>; }
function FacebookSVG()   { return <svg viewBox="0 0 24 24" fill="currentColor"><path d="M22 12a10 10 0 1 0-11.6 9.9v-7H8v-3h2.4V9.8c0-2.4 1.4-3.7 3.6-3.7 1 0 2.1.2 2.1.2v2.3h-1.2c-1.2 0-1.5.7-1.5 1.5V12h2.6l-.4 3h-2.2v7A10 10 0 0 0 22 12z"/></svg>; }
function YouTubeSVG()    { return <svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.6 3.6 12 3.6 12 3.6s-7.6 0-9.4.5A3 3 0 0 0 .5 6.2C0 8 0 12 0 12s0 4 .5 5.8a3 3 0 0 0 2.1 2.1c1.8.5 9.4.5 9.4.5s7.6 0 9.4-.5a3 3 0 0 0 2.1-2.1C24 16 24 12 24 12s0-4-.5-5.8zM9.6 15.6V8.4l6.3 3.6-6.3 3.6z"/></svg>; }
// ─── Calculateur de prix — forfait + extras ─────────────────────────────────
// Installation = fixe. Le mensuel s'ajuste selon les extras cochés.
// Les prix des extras sont éditables inline (aucune source de vérité codée en dur).

interface BasePackage {
  id: "leadgen" | "contenu16" | "contenu20";
  name: string;
  installation: number;       // 0 pour les packages sans install
  installationLabel?: string; // ex: "10 000 $ une fois" or "1 500 $ démarrage"
  monthly: number;            // Prix mensuel de base après installation
  installIncludesFirstMonths?: number; // Lead Gen: install couvre les 4 premiers mois
  engagement: string;         // "12 mois", "6 mois"
}

const BASE_PACKAGES: BasePackage[] = [
  {
    id: "leadgen",
    name: "Lead Gen",
    installation: 10000,
    installationLabel: "10 000 $ (inclut les 4 premiers mois)",
    monthly: 2500,
    installIncludesFirstMonths: 4,
    engagement: "12 mois",
  },
  {
    id: "contenu16",
    name: "Contenu — Format 16 (8 vidéos/mois)",
    installation: 1500,
    installationLabel: "1 500 $ démarrage (offert si 4 mois payés d'avance)",
    monthly: 3200,
    engagement: "6 mois",
  },
  {
    id: "contenu20",
    name: "Contenu — Format 20 (10 vidéos/mois) ★",
    installation: 1500,
    installationLabel: "1 500 $ démarrage (offert si 4 mois payés d'avance)",
    monthly: 3500,
    engagement: "6 mois",
  },
];

interface ExtraDef {
  id: string;
  label: string;
  defaultMonthly: number;
  defaultOneTime: number;
}
const DEFAULT_EXTRAS: ExtraDef[] = [
  { id: "botai",       label: "Bot AI conversationnel", defaultMonthly: 500, defaultOneTime: 1500 },
  { id: "crm",         label: "CRM personnalisé",       defaultMonthly: 500, defaultOneTime: 1500 },
  { id: "landing",     label: "Landing page",           defaultMonthly: 200, defaultOneTime: 1000 },
  { id: "contenuOrg",  label: "Contenu organique",      defaultMonthly: 800, defaultOneTime: 0 },
  { id: "gestionPage", label: "Gestion de page",        defaultMonthly: 400, defaultOneTime: 0 },
  { id: "marquePerso", label: "Marque personnelle",     defaultMonthly: 600, defaultOneTime: 0 },
];

interface ExtraLine {
  id: string;
  label: string;
  monthly: number;
  oneTime: number;
  enabled: boolean;
}

function CalculatorView({ onBack }: { onBack: () => void }) {
  const [packageId, setPackageId] = useState<BasePackage["id"]>("leadgen");
  const [waiveStartup, setWaiveStartup] = useState(false); // Contenu: 4 mois payés d'avance → démarrage offert
  const [prepaidMonths, setPrepaidMonths] = useState<string>("");   // Lead Gen: ignoré (couvert par install)
  const [extras, setExtras] = useState<ExtraLine[]>(
    DEFAULT_EXTRAS.map((e) => ({ id: e.id, label: e.label, monthly: e.defaultMonthly, oneTime: e.defaultOneTime, enabled: false })),
  );
  const [customLabel,   setCustomLabel]   = useState("");
  const [customMonthly, setCustomMonthly] = useState("");
  const [customOneTime, setCustomOneTime] = useState("");

  const pkg = BASE_PACKAGES.find((p) => p.id === packageId)!;
  const isLeadGen  = pkg.id === "leadgen";
  const isContenu  = pkg.id.startsWith("contenu");

  const fmt = (n: number) => n.toLocaleString("fr-CA");

  // Installation effective : Lead Gen = fixe. Contenu = 1500 sauf si waived.
  const effectiveInstall = isContenu && waiveStartup ? 0 : pkg.installation;

  // Mensuel de base — Lead Gen à partir du mois 5, Contenu dès le mois 1
  const baseMonthly = pkg.monthly;

  // Extras enabled
  const activeExtras = extras.filter((e) => e.enabled);
  const extrasMonthly = activeExtras.reduce((s, e) => s + (Number(e.monthly) || 0), 0);
  const extrasOneTime = activeExtras.reduce((s, e) => s + (Number(e.oneTime) || 0), 0);

  const totalMonthly = baseMonthly + extrasMonthly;
  const totalOneTime = effectiveInstall + extrasOneTime;

  // Pour le contrat total : sur la durée d'engagement (12 mois Lead Gen, 6 mois Contenu)
  const engagementMonths = isLeadGen ? 12 : 6;
  const monthsChargedRecurring = isLeadGen
    ? engagementMonths - (pkg.installIncludesFirstMonths ?? 0)  // Lead Gen : install couvre M1-M4
    : engagementMonths;
  const contractTotal = totalOneTime + (totalMonthly * monthsChargedRecurring);

  const toggleExtra = (id: string) =>
    setExtras((prev) => prev.map((e) => (e.id === id ? { ...e, enabled: !e.enabled } : e)));

  const updateExtra = (id: string, field: "monthly" | "oneTime", value: string) => {
    const n = parseFloat(value.replace(/\s/g, "")) || 0;
    setExtras((prev) => prev.map((e) => (e.id === id ? { ...e, [field]: n } : e)));
  };

  const addCustom = () => {
    if (!customLabel.trim()) return;
    const m = parseFloat(customMonthly.replace(/\s/g, "")) || 0;
    const o = parseFloat(customOneTime.replace(/\s/g, "")) || 0;
    setExtras((prev) => [
      ...prev,
      { id: `custom-${Date.now()}`, label: customLabel.trim(), monthly: m, oneTime: o, enabled: true },
    ]);
    setCustomLabel(""); setCustomMonthly(""); setCustomOneTime("");
  };

  const removeExtra = (id: string) => {
    // On ne peut supprimer que les customs; les extras par défaut sont juste désactivés
    if (DEFAULT_EXTRAS.some((d) => d.id === id)) return;
    setExtras((prev) => prev.filter((e) => e.id !== id));
  };

  const resetAll = () => {
    setExtras(DEFAULT_EXTRAS.map((e) => ({ id: e.id, label: e.label, monthly: e.defaultMonthly, oneTime: e.defaultOneTime, enabled: false })));
    setWaiveStartup(false);
    setPrepaidMonths("");
    toast.success("Calculateur réinitialisé");
  };

  const copyBreakdown = async () => {
    const lines: string[] = [
      `SOUMISSION — ${pkg.name}`,
      `Engagement : ${pkg.engagement}`,
      ``,
    ];
    if (effectiveInstall > 0) {
      lines.push(`Installation : ${fmt(effectiveInstall)} $`);
    }
    if (isContenu && waiveStartup) {
      lines.push(`Démarrage : offert (4 mois payés d'avance)`);
    }
    lines.push(`Mensuel de base : ${fmt(baseMonthly)} $`);
    if (isLeadGen) lines.push(`  (à partir du mois 5 — l'installation couvre les 4 premiers mois)`);
    if (activeExtras.length > 0) {
      lines.push(``, `Extras :`);
      activeExtras.forEach((e) => {
        const parts: string[] = [];
        if (e.monthly > 0) parts.push(`${fmt(e.monthly)} $/mois`);
        if (e.oneTime > 0) parts.push(`${fmt(e.oneTime)} $ setup`);
        lines.push(`  • ${e.label} — ${parts.join(" + ")}`);
      });
    }
    lines.push(``, `TOTAL MENSUEL : ${fmt(totalMonthly)} $`);
    if (totalOneTime > 0) lines.push(`TOTAL SETUP  : ${fmt(totalOneTime)} $`);
    lines.push(``, `Contrat total (${engagementMonths} mois) : ${fmt(contractTotal)} $`);
    await navigator.clipboard.writeText(lines.join("\n"));
    toast.success("Détail copié");
  };

  return (
    <div className="p-8 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 rounded-lg border border-border/50 hover:bg-accent transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-primary" /> Calculateur de prix
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Installation fixe · le mensuel s'ajuste selon les extras cochés
            </p>
          </div>
        </div>
        <Button onClick={resetAll} variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1.5">
          <Trash2 className="w-3.5 h-3.5" /> Réinitialiser
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
        {/* ─── LEFT : configuration ─── */}
        <div className="space-y-6">
          {/* Package picker */}
          <div className="rounded-2xl border border-border/40 bg-card p-5 space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">1 · Choisis le forfait</p>
            <div className="space-y-2">
              {BASE_PACKAGES.map((p) => (
                <button key={p.id} type="button" onClick={() => setPackageId(p.id)}
                  className={`w-full text-left rounded-xl border p-3 flex items-center justify-between gap-3 transition ${
                    packageId === p.id
                      ? "border-primary bg-primary/5"
                      : "border-border/40 hover:border-primary/40"
                  }`}>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{p.name}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {p.installationLabel && <>Installation : {p.installationLabel} · </>}
                      Mensuel : {fmt(p.monthly)} $ · Engagement {p.engagement}
                    </p>
                  </div>
                  <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                    packageId === p.id ? "border-primary bg-primary" : "border-border"
                  }`} />
                </button>
              ))}
            </div>

            {/* Contenu-specific: waive startup */}
            {isContenu && (
              <label className="flex items-start gap-2 pt-2 border-t border-border/30 cursor-pointer">
                <input type="checkbox" checked={waiveStartup}
                  onChange={(e) => setWaiveStartup(e.target.checked)}
                  className="mt-1 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-foreground">4 mois payés d'avance → démarrage 1 500 $ offert</p>
                  <p className="text-[10px] text-muted-foreground">Retire les 1 500 $ du total installation.</p>
                </div>
              </label>
            )}
            {isContenu && waiveStartup && (
              <div className="space-y-1">
                <Label className="text-[10px]">Nombre de mois payés d'avance (optionnel)</Label>
                <Input type="number" value={prepaidMonths} onChange={(e) => setPrepaidMonths(e.target.value)}
                  placeholder="4" className="h-8 text-xs w-24" />
              </div>
            )}
          </div>

          {/* Extras */}
          <div className="rounded-2xl border border-border/40 bg-card p-5 space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">2 · Ajoute des extras</p>
            <p className="text-[11px] text-muted-foreground">
              Coche ceux qui s'appliquent. Les prix sont éditables — ajuste selon la négociation.
            </p>

            <div className="space-y-2">
              {extras.map((e) => (
                <div key={e.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition ${
                    e.enabled ? "border-primary/40 bg-primary/5" : "border-border/40 bg-transparent"
                  }`}>
                  <input type="checkbox" checked={e.enabled} onChange={() => toggleExtra(e.id)}
                    className="flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{e.label}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <Input type="number" value={e.monthly || ""}
                        onChange={(ev) => updateExtra(e.id, "monthly", ev.target.value)}
                        disabled={!e.enabled}
                        placeholder="0"
                        className="h-8 w-20 text-xs text-right" />
                      <span className="text-[10px] text-muted-foreground">$/mois</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Input type="number" value={e.oneTime || ""}
                        onChange={(ev) => updateExtra(e.id, "oneTime", ev.target.value)}
                        disabled={!e.enabled}
                        placeholder="0"
                        className="h-8 w-20 text-xs text-right" />
                      <span className="text-[10px] text-muted-foreground">$ setup</span>
                    </div>
                    {!DEFAULT_EXTRAS.some((d) => d.id === e.id) && (
                      <button type="button" onClick={() => removeExtra(e.id)}
                        className="text-muted-foreground/60 hover:text-destructive transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Custom extra */}
            <div className="pt-3 border-t border-border/30 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Extra sur mesure</p>
              <div className="flex flex-wrap gap-2 items-end">
                <div className="flex-1 min-w-[180px] space-y-1">
                  <Label className="text-[10px]">Libellé</Label>
                  <Input value={customLabel} onChange={(e) => setCustomLabel(e.target.value)}
                    placeholder="Ex: Refonte site vitrine" className="h-8 text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">$/mois</Label>
                  <Input type="number" value={customMonthly} onChange={(e) => setCustomMonthly(e.target.value)}
                    placeholder="0" className="h-8 w-24 text-xs text-right" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">$ setup</Label>
                  <Input type="number" value={customOneTime} onChange={(e) => setCustomOneTime(e.target.value)}
                    placeholder="0" className="h-8 w-24 text-xs text-right" />
                </div>
                <Button onClick={addCustom} disabled={!customLabel.trim()} size="sm" className="h-8 gap-1.5">
                  <Plus className="w-3.5 h-3.5" /> Ajouter
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* ─── RIGHT : sticky total ─── */}
        <div className="lg:sticky lg:top-6 space-y-4">
          <div className="rounded-2xl border-2 border-primary/40 bg-primary/[0.04] p-6 space-y-4 shadow-glow">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">Total</p>
              <p className="text-4xl font-bold text-primary tracking-tight">{fmt(totalMonthly)} $<span className="text-sm text-muted-foreground font-normal">/mois</span></p>
              {isLeadGen && (
                <p className="text-[10px] text-muted-foreground mt-1">à partir du mois 5</p>
              )}
              {extrasMonthly > 0 && (
                <p className="text-[11px] text-emerald-400 mt-1">
                  + {fmt(extrasMonthly)} $ d'extras vs base {fmt(baseMonthly)} $
                </p>
              )}
            </div>

            {totalOneTime > 0 && (
              <div className="pt-3 border-t border-border/30">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Total setup / installation</p>
                <p className="text-2xl font-bold text-foreground">{fmt(totalOneTime)} $</p>
                <p className="text-[10px] text-muted-foreground mt-1">Fixe · ne change pas avec les extras récurrents</p>
              </div>
            )}

            <div className="pt-3 border-t border-border/30 space-y-1 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Base mensuelle</span>
                <span>{fmt(baseMonthly)} $</span>
              </div>
              {extrasMonthly > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>+ Extras récurrents</span>
                  <span>{fmt(extrasMonthly)} $</span>
                </div>
              )}
              {effectiveInstall > 0 && (
                <div className="flex justify-between text-muted-foreground pt-1">
                  <span>Installation</span>
                  <span>{fmt(effectiveInstall)} $</span>
                </div>
              )}
              {extrasOneTime > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>+ Setup extras</span>
                  <span>{fmt(extrasOneTime)} $</span>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-border/30">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Contrat total ({engagementMonths} mois)</p>
              <p className="text-xl font-bold text-foreground">{fmt(contractTotal)} $</p>
              {isLeadGen && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  {fmt(effectiveInstall + extrasOneTime)} $ installation + ({monthsChargedRecurring} mois × {fmt(totalMonthly)} $)
                </p>
              )}
            </div>
          </div>

          <Button onClick={copyBreakdown} className="w-full gap-2 shadow-glow">
            <Copy className="w-4 h-4" /> Copier le détail
          </Button>
        </div>
      </div>
    </div>
  );
}
