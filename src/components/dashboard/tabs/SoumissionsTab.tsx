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
  const [view, setView] = useState<"list" | "new" | "detail" | "calculator">("list");
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

  if (view === "calculator") {
    return <CalculatorWizard onCancel={() => setView("list")} />;
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
    onCalculator={() => setView("calculator")}
    onOpen={(id) => { setSelectedId(id); setView("detail"); }}
    onDelete={remove}
  />;
}

// ─── List view ──────────────────────────────────────────────────────────────

function SubmissionsList({ submissions, onNew, onCalculator, onOpen, onDelete }: {
  submissions: Submission[]; onNew: () => void; onCalculator: () => void; onOpen: (id: string) => void; onDelete: (id: string) => void;
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
        <div className="flex items-center gap-2">
          <Button onClick={onCalculator} variant="outline" className="gap-2">
            <Sparkles className="w-4 h-4" /> Calculateur découverte
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

// ─── Calculateur de forfait — post-appel découverte ─────────────────────────
// Prospect answers ~6 questions → recommend package + payment format + generate
// a strategy prompt to paste into Claude/ChatGPT/Gamma.

interface PackageDef {
  id: "systeme" | "croissance" | "domination";
  name: string;
  tagline: string;
  monthly: number;         // Standard 6-month price
  flexMonthly: number;     // Mois-à-mois (+15%)
  includes: string[];
  fitFor: string;
}

const PACKAGES: PackageDef[] = [
  {
    id: "systeme",
    name: "Système",
    tagline: "Le socle content + ads pour générer des résultats.",
    monthly: 2800, flexMonthly: 3200,
    includes: [
      "1 tournage aux 2 mois — banque de 10 à 16 vidéos",
      "5 à 8 vidéos publiées/mois",
      "Gestion Meta Ads complète (création, tests, opti hebdo)",
      "Logiciel AI de qualification + dashboard client",
      "Suivi structuré des leads jusqu'au RDV",
    ],
    fitFor: "Le pro occupé qui veut des résultats sans une 2e job.",
  },
  {
    id: "croissance",
    name: "Croissance",
    tagline: "Notoriété + leads. Ta marque travaille pour toi.",
    monthly: 3400, flexMonthly: 3900,
    includes: [
      "Tout le forfait Système",
      "1 tournage/mois · 10 à 15 vidéos publiées",
      "1 campagne Meta Ads (création + gestion continue)",
      "Stratégie de contenu + idées sur mesure",
      "Coaching caméra pour être percutant",
    ],
    fitFor: "Devenir LA référence de son marché tout en générant des leads chaque semaine.",
  },
  {
    id: "domination",
    name: "Domination",
    tagline: "On devient ton département marketing.",
    monthly: 4000, flexMonthly: 4600,
    includes: [
      "Tout le forfait Croissance",
      "15 à 20 vidéos/mois · 1 tournage mensuel",
      "2 à 3 campagnes Meta Ads simultanées",
      "CRM personnalisé adapté à ton processus",
      "Logiciel AI version avancée + accès prioritaire nouveautés",
    ],
    fitFor: "Dominer son marché avec une machine complète (contenu, pub, CRM, suivi).",
  },
];

type PaymentId = "standard" | "flexible";
interface PaymentDef {
  id: PaymentId;
  name: string;
  summary: string;
  detail: string;
  multiplier: number; // Applied on the monthly rate
}
const PAYMENTS: PaymentDef[] = [
  {
    id: "standard",
    name: "Standard — Engagement 6 mois",
    summary: "Le prix affiché. Le temps réaliste pour installer, tester et rentabiliser.",
    detail: "Facturation mensuelle simple · Renouvellement au choix après 6 mois",
    multiplier: 1.0,
  },
  {
    id: "flexible",
    name: "Flexible — Mois à mois",
    summary: "Aucun engagement long terme. La flexibilité a un prix (+15 %).",
    detail: "Premier et dernier mois payés à la signature · Annulation avec préavis 30 jours",
    multiplier: 1.15,
  },
];

interface CalcAnswers {
  prospectName: string;
  budget: "" | "lt3k" | "3to4k" | "4to5k" | "gt5k";
  domain: "" | "immobilier" | "hypothecaire" | "autre";
  domainOther: string;
  objectives: string[];           // multi
  urgency: "" | "immediate" | "1to3m" | "6mplus";
  hasCrm: boolean;
  hasSetter: boolean;
  hasContent: boolean;
  runsAdsAlready: boolean;
  commitPreference: "" | "engage6" | "flexible" | "unsure";
  currentLeadsPerWeek: string;
  notes: string;
}

const OBJECTIVE_OPTIONS = [
  { id: "leads",       label: "Plus de leads qualifiés" },
  { id: "notoriete",   label: "Notoriété / autorité" },
  { id: "conversion",  label: "Convertir mieux (closing)" },
  { id: "domination",  label: "Dominer mon marché" },
  { id: "systeme",     label: "Bâtir un système marketing" },
];

function recommendPackage(a: CalcAnswers): { pkg: PackageDef; reasons: string[] } {
  const reasons: string[] = [];
  let score = { systeme: 0, croissance: 0, domination: 0 };

  // Budget = strongest signal
  switch (a.budget) {
    case "lt3k":  score.systeme += 5; reasons.push("Budget < 3 000 $ → Système est la porte d'entrée réaliste."); break;
    case "3to4k": score.croissance += 4; score.systeme += 2; reasons.push("Budget 3-4k $ → Croissance offre le meilleur rapport."); break;
    case "4to5k": score.croissance += 3; score.domination += 3; reasons.push("Budget 4-5k $ → Croissance ou Domination selon les objectifs."); break;
    case "gt5k":  score.domination += 5; reasons.push("Budget > 5k $ → Domination pleinement financé."); break;
  }

  // Objectives
  if (a.objectives.includes("domination")) { score.domination += 3; reasons.push("Objectif « dominer le marché » → Domination."); }
  if (a.objectives.includes("notoriete"))  { score.croissance += 2; reasons.push("Notoriété → Croissance apporte stratégie contenu + coaching caméra."); }
  if (a.objectives.includes("systeme"))    { score.systeme += 1; score.croissance += 1; }
  if (a.objectives.length >= 3)            { score.domination += 1; reasons.push("Plusieurs objectifs → l'écosystème complet est plus efficace."); }

  // Infrastructure signals
  if (!a.hasCrm && a.objectives.includes("conversion")) {
    score.domination += 2;
    reasons.push("Pas de CRM + focus conversion → CRM personnalisé de Domination est un accélérateur.");
  }
  if (a.hasCrm && score.domination > 0) {
    score.domination -= 1;
    reasons.push("CRM déjà en place → pas besoin de Domination juste pour le CRM.");
  }
  if (!a.hasContent) { score.croissance += 1; reasons.push("Aucun contenu régulier → la banque de vidéos change tout."); }
  if (a.runsAdsAlready) { reasons.push("Ads déjà en cours → on optimise ce qui existe."); }
  if (a.hasSetter && score.domination > 0) { score.domination -= 0.5; reasons.push("Setter déjà en place → réduit le gap avec Domination."); }

  // Urgency: immédiat + budget ok → push slightly higher
  if (a.urgency === "immediate" && (a.budget === "4to5k" || a.budget === "gt5k")) {
    score.domination += 1;
    reasons.push("Démarrage immédiat + budget solide → maximiser la vitesse d'exécution.");
  }
  if (a.urgency === "6mplus" && a.budget === "lt3k") {
    score.systeme += 1;
  }

  const winner = (Object.keys(score) as Array<keyof typeof score>).reduce((a, b) => score[a] >= score[b] ? a : b);
  const pkg = PACKAGES.find((p) => p.id === winner)!;
  return { pkg, reasons };
}

function recommendPayment(a: CalcAnswers, pkg: PackageDef): { fmt: PaymentDef; reason: string } {
  if (a.commitPreference === "engage6") {
    return { fmt: PAYMENTS[0], reason: "Le prospect est prêt à s'engager 6 mois → Standard (prix optimal)." };
  }
  if (a.commitPreference === "flexible") {
    return { fmt: PAYMENTS[1], reason: "Le prospect veut de la flexibilité → Mois à mois (+15 %)." };
  }
  // Unsure or empty → heuristic
  if (a.urgency === "immediate" && (a.budget === "3to4k" || a.budget === "4to5k" || a.budget === "gt5k")) {
    return { fmt: PAYMENTS[0], reason: "Démarrage immédiat + budget confortable → propose Standard, plus rentable." };
  }
  if (pkg.id === "systeme" && a.budget === "lt3k") {
    return { fmt: PAYMENTS[1], reason: "Budget serré et hésitations → Flexible pour lever la friction (quitte à repasser en Standard après 2-3 mois)." };
  }
  return { fmt: PAYMENTS[0], reason: "Par défaut, Standard est plus économique et aligné sur le temps réel d'obtention des résultats." };
}

function buildStrategyPrompt(a: CalcAnswers, pkg: PackageDef, fmt: PaymentDef, agencyName: string): string {
  const domainLabel =
    a.domain === "immobilier"   ? "Courtier immobilier" :
    a.domain === "hypothecaire" ? "Courtier hypothécaire" :
    a.domain === "autre"        ? (a.domainOther || "Autre secteur") : "Non spécifié";
  const objectivesLabel = a.objectives.length
    ? a.objectives.map((o) => OBJECTIVE_OPTIONS.find((opt) => opt.id === o)?.label).filter(Boolean).join(", ")
    : "Non précisés";
  const infra: string[] = [];
  if (a.hasCrm) infra.push("CRM en place");
  if (a.hasSetter) infra.push("Setter en place");
  if (a.hasContent) infra.push("Contenu vidéo régulier");
  if (a.runsAdsAlready) infra.push("Ads déjà en cours");
  const infraStr = infra.length ? infra.join(" · ") : "Aucune infrastructure marketing en place";

  const monthlyPrice = pkg.monthly * fmt.multiplier;

  return `Tu es un stratège marketing senior chez ${agencyName}. Prépare une stratégie ultra-personnalisée pour ce prospect qu'on vient de qualifier.

═══ CONTEXTE PROSPECT ═══
Nom : ${a.prospectName || "Prospect"}
Secteur : ${domainLabel}
Objectifs déclarés : ${objectivesLabel}
Urgence : ${a.urgency === "immediate" ? "Démarrer ASAP" : a.urgency === "1to3m" ? "1 à 3 mois" : a.urgency === "6mplus" ? "6 mois +" : "Non précisée"}
Budget mensuel : ${a.budget === "lt3k" ? "< 3 000 $" : a.budget === "3to4k" ? "3 000 - 4 000 $" : a.budget === "4to5k" ? "4 000 - 5 000 $" : a.budget === "gt5k" ? "> 5 000 $" : "Non précisé"}
Leads actuels : ${a.currentLeadsPerWeek ? `${a.currentLeadsPerWeek}/semaine` : "Non précisé"}
Infrastructure existante : ${infraStr}
${a.notes ? `\nNotes de l'appel :\n${a.notes}` : ""}

═══ RECOMMANDATION SYSTÈME ═══
Forfait recommandé : ${pkg.name} — ${pkg.monthly.toLocaleString("fr-CA")} $/mois (base 6 mois)
Ce qui est inclus :
${pkg.includes.map((s) => `  • ${s}`).join("\n")}
Cible du forfait : ${pkg.fitFor}

Format de paiement recommandé : ${fmt.name}
${fmt.summary}
Prix appliqué : ${monthlyPrice.toLocaleString("fr-CA")} $/mois (${fmt.detail})

═══ CE QUE JE VEUX DE TOI ═══
1. **Diagnostic 30 secondes** — reformule où en est le prospect en 3 phrases percutantes qui montrent qu'on l'a compris.

2. **Stratégie 6 mois** — mois par mois, ce qu'on livre et pourquoi. Sois spécifique aux objectifs "${objectivesLabel}" et au secteur ${domainLabel}. Pas de généralités.

3. **Angles de contenu (5 idées)** — 5 concepts vidéo précis adaptés à ${domainLabel} qui devraient bien performer sur Meta Ads. Format : Hook → Structure → CTA pour chaque.

4. **Ciblage Meta Ads** — audiences précises à tester (démographie, intérêts, comportements) pour ${domainLabel} au Québec. Priorise 3 audiences chaudes + 2 froides.

5. **KPI trimestriels réalistes** — vu son point de départ (${a.currentLeadsPerWeek ? `${a.currentLeadsPerWeek} leads/sem actuellement` : "leads actuels non précisés"}) et le forfait ${pkg.name}, quels résultats viser à 3 mois et 6 mois ? Sois honnête, pas de promesses irréalistes.

6. **Objections probables + réponses** — 4 objections qu'il va soulever face à ${monthlyPrice.toLocaleString("fr-CA")} $/mois sur 6 mois, avec la réponse à chaque.

Ton : direct, terrain, chiffres concrets. Zéro corporate. Sois un stratège qui a déjà closé 100 prospects dans ce secteur.`;
}

function CalculatorWizard({ onCancel }: { onCancel: () => void }) {
  const { data: agency } = useAgencySettings();
  const agencyName = agency?.name ?? "Mon Agence";

  const [a, setA] = useState<CalcAnswers>({
    prospectName: "",
    budget: "",
    domain: "",
    domainOther: "",
    objectives: [],
    urgency: "",
    hasCrm: false,
    hasSetter: false,
    hasContent: false,
    runsAdsAlready: false,
    commitPreference: "",
    currentLeadsPerWeek: "",
    notes: "",
  });
  const [computed, setComputed] = useState<null | {
    pkg: PackageDef; reasons: string[]; fmt: PaymentDef; fmtReason: string; prompt: string;
  }>(null);

  const canCompute = a.budget !== "" && a.domain !== "" && a.objectives.length > 0;

  const compute = () => {
    const { pkg, reasons } = recommendPackage(a);
    const { fmt, reason: fmtReason } = recommendPayment(a, pkg);
    const prompt = buildStrategyPrompt(a, pkg, fmt, agencyName);
    setComputed({ pkg, reasons, fmt, fmtReason, prompt });
    setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }), 100);
  };

  const toggleObj = (id: string) => {
    setA((s) => ({ ...s, objectives: s.objectives.includes(id) ? s.objectives.filter((x) => x !== id) : [...s.objectives, id] }));
  };

  const copyPrompt = async () => {
    if (!computed) return;
    await navigator.clipboard.writeText(computed.prompt);
    toast.success("Prompt copié — colle-le dans Claude, ChatGPT ou Gamma");
  };

  const openTool = (url: string) => {
    if (computed) navigator.clipboard.writeText(computed.prompt).catch(() => {});
    window.open(url, "_blank");
  };

  return (
    <div className="p-8 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onCancel} className="p-1.5 rounded-lg border border-border/50 hover:bg-accent transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" /> Calculateur découverte
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">Réponds pour lui après l'appel — on te recommande forfait, paiement et un prompt stratégie prêt à coller.</p>
          </div>
        </div>
      </div>

      {/* Questionnaire */}
      <div className="rounded-2xl border border-border/40 bg-card p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Nom du prospect</Label>
            <Input value={a.prospectName} onChange={(e) => setA({ ...a, prospectName: e.target.value })}
              placeholder="Ex: Randy Bergeron" className="text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Leads actuels / semaine</Label>
            <Input value={a.currentLeadsPerWeek} onChange={(e) => setA({ ...a, currentLeadsPerWeek: e.target.value })}
              placeholder="Ex: 3" className="text-sm" />
          </div>
        </div>

        {/* Domain */}
        <div className="space-y-1.5">
          <Label className="text-xs">Domaine <span className="text-destructive">*</span></Label>
          <div className="flex flex-wrap gap-2">
            {[
              { id: "immobilier",   label: "🏠 Courtier immobilier" },
              { id: "hypothecaire", label: "🏦 Courtier hypothécaire" },
              { id: "autre",        label: "✳️ Autre" },
            ].map((opt) => (
              <button key={opt.id} type="button"
                onClick={() => setA({ ...a, domain: opt.id as any })}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                  a.domain === opt.id ? "bg-primary text-primary-foreground border-primary" : "bg-muted/20 text-muted-foreground border-border hover:border-primary/50"
                }`}>
                {opt.label}
              </button>
            ))}
          </div>
          {a.domain === "autre" && (
            <Input value={a.domainOther} onChange={(e) => setA({ ...a, domainOther: e.target.value })}
              placeholder="Précise le secteur" className="text-sm mt-2" />
          )}
        </div>

        {/* Budget */}
        <div className="space-y-1.5">
          <Label className="text-xs">Budget mensuel disponible <span className="text-destructive">*</span></Label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { id: "lt3k",  label: "< 3 000 $" },
              { id: "3to4k", label: "3 000 - 4 000 $" },
              { id: "4to5k", label: "4 000 - 5 000 $" },
              { id: "gt5k",  label: "> 5 000 $" },
            ].map((b) => (
              <button key={b.id} type="button"
                onClick={() => setA({ ...a, budget: b.id as any })}
                className={`px-3 py-2 rounded-lg text-xs font-medium border transition ${
                  a.budget === b.id ? "bg-primary text-primary-foreground border-primary" : "bg-muted/20 text-muted-foreground border-border hover:border-primary/50"
                }`}>
                {b.label}
              </button>
            ))}
          </div>
        </div>

        {/* Objectives */}
        <div className="space-y-1.5">
          <Label className="text-xs">Objectifs principaux <span className="text-destructive">*</span> <span className="text-muted-foreground">(plusieurs possibles)</span></Label>
          <div className="flex flex-wrap gap-2">
            {OBJECTIVE_OPTIONS.map((o) => {
              const active = a.objectives.includes(o.id);
              return (
                <button key={o.id} type="button" onClick={() => toggleObj(o.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                    active ? "bg-primary text-primary-foreground border-primary" : "bg-muted/20 text-muted-foreground border-border hover:border-primary/50"
                  }`}>
                  {o.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Urgency */}
        <div className="space-y-1.5">
          <Label className="text-xs">Urgence de démarrage</Label>
          <div className="flex flex-wrap gap-2">
            {[
              { id: "immediate", label: "🔥 Immédiat / ASAP" },
              { id: "1to3m",     label: "🗓️ 1 à 3 mois" },
              { id: "6mplus",    label: "🐢 6 mois +" },
            ].map((u) => (
              <button key={u.id} type="button"
                onClick={() => setA({ ...a, urgency: u.id as any })}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                  a.urgency === u.id ? "bg-primary text-primary-foreground border-primary" : "bg-muted/20 text-muted-foreground border-border hover:border-primary/50"
                }`}>
                {u.label}
              </button>
            ))}
          </div>
        </div>

        {/* Infrastructure */}
        <div className="space-y-1.5">
          <Label className="text-xs">Infrastructure déjà en place</Label>
          <div className="flex flex-wrap gap-2">
            {[
              { key: "hasCrm",         label: "📇 CRM structuré" },
              { key: "hasSetter",      label: "📞 Setter / téléphoniste" },
              { key: "hasContent",     label: "🎥 Contenu vidéo régulier" },
              { key: "runsAdsAlready", label: "📣 Meta Ads en cours" },
            ].map((c) => {
              const active = (a as any)[c.key] as boolean;
              return (
                <button key={c.key} type="button"
                  onClick={() => setA({ ...a, [c.key]: !active } as CalcAnswers)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                    active ? "bg-primary text-primary-foreground border-primary" : "bg-muted/20 text-muted-foreground border-border hover:border-primary/50"
                  }`}>
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Commitment preference */}
        <div className="space-y-1.5">
          <Label className="text-xs">Préférence d'engagement</Label>
          <div className="flex flex-wrap gap-2">
            {[
              { id: "engage6",  label: "✅ Prêt à s'engager 6 mois" },
              { id: "flexible", label: "🔓 Veut rester flexible" },
              { id: "unsure",   label: "🤷 Pas sûr — à discuter" },
            ].map((c) => (
              <button key={c.id} type="button"
                onClick={() => setA({ ...a, commitPreference: c.id as any })}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                  a.commitPreference === c.id ? "bg-primary text-primary-foreground border-primary" : "bg-muted/20 text-muted-foreground border-border hover:border-primary/50"
                }`}>
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <Label className="text-xs">Notes de l'appel (contexte, objections, tone)</Label>
          <Textarea value={a.notes} onChange={(e) => setA({ ...a, notes: e.target.value })}
            rows={3} placeholder="Ex: A un associé qui décide. Sceptique face aux ads. A déjà été brûlé par une agence." className="text-sm" />
        </div>

        <div className="flex items-center justify-end pt-2 border-t border-border/30">
          <Button onClick={compute} disabled={!canCompute} className="gap-2 shadow-glow">
            <Sparkles className="w-4 h-4" /> Calculer la recommandation
          </Button>
        </div>
      </div>

      {/* Recommendation */}
      {computed && (
        <div className="space-y-4">
          {/* Package */}
          <div className="rounded-2xl border-2 border-primary/40 bg-primary/[0.04] p-6 space-y-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-primary mb-1">Forfait recommandé</p>
                <h3 className="text-2xl font-bold text-foreground">{computed.pkg.name}</h3>
                <p className="text-sm text-muted-foreground mt-0.5">{computed.pkg.tagline}</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-primary">{(computed.pkg.monthly * computed.fmt.multiplier).toLocaleString("fr-CA")} $</p>
                <p className="text-[11px] text-muted-foreground">/mois · {computed.fmt.name}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Inclus</p>
                <ul className="space-y-1">
                  {computed.pkg.includes.map((inc, i) => (
                    <li key={i} className="text-xs text-foreground flex items-start gap-1.5">
                      <Check className="w-3 h-3 text-primary flex-shrink-0 mt-0.5" /> {inc}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Pourquoi ce forfait</p>
                <ul className="space-y-1">
                  {computed.reasons.map((r, i) => (
                    <li key={i} className="text-xs text-muted-foreground">→ {r}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Payment */}
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.04] p-5 space-y-2">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 mb-1">Format de paiement recommandé</p>
                <h3 className="text-lg font-bold text-foreground">{computed.fmt.name}</h3>
                <p className="text-xs text-muted-foreground">{computed.fmt.summary}</p>
              </div>
              <p className="text-xs text-muted-foreground text-right max-w-xs">{computed.fmt.detail}</p>
            </div>
            <p className="text-xs text-muted-foreground italic pt-2 border-t border-border/30">→ {computed.fmtReason}</p>
          </div>

          {/* Strategy prompt */}
          <div className="rounded-2xl border-2 border-fuchsia-500/30 bg-fuchsia-500/[0.03] p-6 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-fuchsia-400 mb-0.5">Prompt stratégie prêt à coller</p>
                <p className="text-xs text-muted-foreground">Copie-le et colle-le dans Claude, ChatGPT ou Gamma pour générer la stratégie personnalisée.</p>
              </div>
              <Button onClick={copyPrompt} className="gap-2 shadow-glow flex-shrink-0">
                <Copy className="w-4 h-4" /> Copier
              </Button>
            </div>
            <Textarea value={computed.prompt} readOnly rows={16}
              className="text-xs font-mono leading-relaxed bg-background/50" />
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => openTool("https://claude.ai/new")} className="gap-1.5 text-xs">
                <ExternalLink className="w-3 h-3" /> Claude
              </Button>
              <Button variant="outline" size="sm" onClick={() => openTool("https://chat.openai.com/")} className="gap-1.5 text-xs">
                <ExternalLink className="w-3 h-3" /> ChatGPT
              </Button>
              <Button variant="outline" size="sm" onClick={() => openTool("https://gamma.app/create")} className="gap-1.5 text-xs">
                <ExternalLink className="w-3 h-3" /> Gamma
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
