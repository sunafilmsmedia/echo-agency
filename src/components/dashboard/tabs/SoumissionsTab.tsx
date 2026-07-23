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
  const [view, setView] = useState<"list" | "new" | "detail" | "forfaits">("list");
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
    onOpen={(id) => { setSelectedId(id); setView("detail"); }}
    onDelete={remove}
  />;
}

// ─── List view ──────────────────────────────────────────────────────────────

function SubmissionsList({ submissions, onNew, onForfaits, onOpen, onDelete }: {
  submissions: Submission[]; onNew: () => void; onForfaits: () => void; onOpen: (id: string) => void; onDelete: (id: string) => void;
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
          <Button onClick={onForfaits} variant="outline" className="gap-2">
            <FileText className="w-4 h-4" /> Nos forfaits
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


// ─── Nos forfaits — vue de référence pour l'équipe de vente ─────────────────

interface PackageDef {
  id: "systeme" | "croissance" | "domination";
  name: string;
  monthly: number;
  installQuarter: number;   // Option B — 4 mois payés d'avance, prix unique
  installMonthly: number;   // Option B — équivalent mensuel avec le −10%
  flexMonthly: number;      // Option C — mois à mois (+15%)
  promise: string;
  includes: string[];
  featured?: boolean;
  note?: string;
}

const PACKAGES_LIST: PackageDef[] = [
  {
    id: "systeme",
    name: "Système",
    monthly: 2800,
    installQuarter: 10080, installMonthly: 2520,
    flexMonthly: 3200,
    promise: "Des rendez-vous qualifiés, sans t'impliquer.",
    includes: [
      "1 tournage aux 2 mois (demi-journée) — banque de 10 à 16 vidéos",
      "5 à 8 vidéos publiées par mois",
      "Gestion Meta Ads complète — création, tests, opti hebdo",
      "Logiciel AI de qualification personnalisé + dashboard client",
      "Suivi structuré des leads jusqu'au RDV",
    ],
    note: "Implication client : une demi-journée aux 2 mois.",
  },
  {
    id: "croissance",
    name: "Croissance",
    monthly: 3400,
    installQuarter: 12240, installMonthly: 3060,
    flexMonthly: 3900,
    promise: "Notoriété + leads. Ta marque travaille pour toi.",
    includes: [
      "Tout le forfait Système (incluant le logiciel AI)",
      "1 tournage par mois — 10 à 15 vidéos publiées",
      "1 campagne Meta Ads — création, lancement, gestion continue",
      "Stratégie de contenu + idées sur mesure",
      "Coaching caméra pour être percutant à l'écran",
    ],
    featured: true,
  },
  {
    id: "domination",
    name: "Domination",
    monthly: 4000,
    installQuarter: 14400, installMonthly: 3600,
    flexMonthly: 4600,
    promise: "On devient ton département marketing.",
    includes: [
      "Tout le forfait Croissance",
      "15 à 20 vidéos par mois — 1 tournage mensuel",
      "2 à 3 campagnes Meta Ads simultanées",
      "CRM personnalisé et adapté à ton processus",
      "Logiciel AI version avancée + accès prioritaire nouveautés SFM",
    ],
    note: "Interne : envisager frais de setup unique (1 500-2 500 $) pour couvrir le build du CRM, prix mensuel inchangé.",
  },
];

const CLOSING_SCRIPT = `T'as trois façons de travailler avec nous. La plupart partent sur 6 mois — c'est le temps réaliste pour que le système donne son plein rendement. Si tu veux le meilleur deal pis régler ça d'un coup, l'installation 4 mois te donne 10 % de rabais. Pis si tu veux juste tester, le mois-à-mois existe, mais il coûte 15 % de plus.`;

function ForfaitsView({ onBack }: { onBack: () => void }) {
  const fmt = (n: number) => n.toLocaleString("fr-CA");

  const copyScript = async () => {
    await navigator.clipboard.writeText(CLOSING_SCRIPT);
    toast.success("Script de closing copié");
  };

  return (
    <div className="p-8 space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 rounded-lg border border-border/50 hover:bg-accent transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" /> Nos forfaits
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">Structure Suna Films — référence rapide pour ton équipe de vente</p>
          </div>
        </div>
      </div>

      {/* 3 package cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {PACKAGES_LIST.map((p) => (
          <div key={p.id}
            className={`relative rounded-2xl border-2 p-6 space-y-4 flex flex-col ${
              p.featured
                ? "border-primary/60 bg-primary/[0.06] shadow-glow"
                : "border-border/40 bg-card"
            }`}>
            {p.featured && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider">
                ★ Le plus populaire
              </span>
            )}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {p.id === "systeme" ? "Palier 1" : p.id === "croissance" ? "Palier 2" : "Palier 3"}
              </p>
              <h3 className="text-2xl font-bold text-foreground mt-1">{p.name}</h3>
              <p className="text-sm text-muted-foreground mt-1 italic">« {p.promise} »</p>
            </div>
            <div className="pt-1">
              <p className={`text-4xl font-bold tracking-tight ${p.featured ? "text-primary" : "text-foreground"}`}>
                {fmt(p.monthly)} $<span className="text-sm font-normal text-muted-foreground">/mois</span>
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Engagement 6 mois — prix affiché</p>
            </div>
            <ul className="space-y-2 flex-1">
              {p.includes.map((inc, i) => (
                <li key={i} className="text-xs text-foreground flex items-start gap-2">
                  <Check className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${p.featured ? "text-primary" : "text-emerald-400"}`} />
                  <span>{inc}</span>
                </li>
              ))}
            </ul>
            {p.note && (
              <p className="text-[10px] text-muted-foreground italic pt-3 border-t border-border/30">{p.note}</p>
            )}
          </div>
        ))}
      </div>

      {/* AI blurb */}
      <div className="rounded-xl border border-primary/20 bg-primary/[0.03] p-4 flex items-start gap-3">
        <div className="text-2xl">🤖</div>
        <div>
          <p className="text-sm font-semibold text-foreground">Inclus dans tous les forfaits</p>
          <p className="text-xs text-muted-foreground mt-0.5">Notre logiciel AI de qualification des leads avec ton propre dashboard — le client voit en temps réel ce que son investissement génère.</p>
        </div>
      </div>

      {/* Payment options */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Trois façons de travailler ensemble</h3>
          <p className="text-sm text-muted-foreground mt-0.5">Un système contenu + publicité donne son plein rendement en 3 à 6 mois. Le pricing est bâti autour de ça.</p>
        </div>

        {/* Option A */}
        <div className="rounded-2xl border border-border/40 bg-card p-5 space-y-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-primary mb-0.5">Option A · STANDARD</p>
              <h4 className="text-base font-bold text-foreground">Engagement 6 mois</h4>
              <p className="text-xs text-muted-foreground">Le prix affiché. Facturation mensuelle simple. Renouvellement au choix après 6 mois.</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border/40">
                  <th className="text-left py-2 font-semibold">Forfait</th>
                  <th className="text-right py-2 font-semibold">Prix mensuel</th>
                </tr>
              </thead>
              <tbody>
                {PACKAGES_LIST.map((p) => (
                  <tr key={p.id} className="border-b border-border/20 last:border-0">
                    <td className="py-2 text-foreground">{p.name}</td>
                    <td className="py-2 text-right font-semibold text-foreground">{fmt(p.monthly)} $/mois</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Option B */}
        <div className="rounded-2xl border-2 border-emerald-500/40 bg-emerald-500/[0.04] p-5 space-y-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 mb-0.5">Option B · MEILLEUR DEAL</p>
              <h4 className="text-base font-bold text-foreground">Installation — 4 mois payés d'avance (−10 %)</h4>
              <p className="text-xs text-muted-foreground">Un paiement au départ · Ensuite mois à mois au prix régulier (pas +15 %) · Annulation avec préavis 30 jours.</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border/40">
                  <th className="text-left py-2 font-semibold">Forfait</th>
                  <th className="text-right py-2 font-semibold">Paiement unique</th>
                  <th className="text-right py-2 font-semibold">Équivalent mensuel</th>
                  <th className="text-right py-2 font-semibold">Ensuite</th>
                </tr>
              </thead>
              <tbody>
                {PACKAGES_LIST.map((p) => (
                  <tr key={p.id} className="border-b border-border/20 last:border-0">
                    <td className="py-2 text-foreground">{p.name}</td>
                    <td className="py-2 text-right font-bold text-emerald-400">{fmt(p.installQuarter)} $</td>
                    <td className="py-2 text-right text-muted-foreground">{fmt(p.installMonthly)} $/mois</td>
                    <td className="py-2 text-right text-muted-foreground">{fmt(p.monthly)} $/mois</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-emerald-400/80 italic border-t border-border/30 pt-2">
            ⚠ Fenêtre de churn au mois 5 — prévoir bilan de résultats au mois 3 + offre de conversion vers engagement 6 mois.
          </p>
        </div>

        {/* Option C */}
        <div className="rounded-2xl border border-border/40 bg-card p-5 space-y-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400 mb-0.5">Option C · FLEXIBLE</p>
              <h4 className="text-base font-bold text-foreground">Mois à mois (+15 %)</h4>
              <p className="text-xs text-muted-foreground">Aucun engagement long terme. Premier + dernier mois à la signature. Annulation en tout temps, préavis 30 jours.</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border/40">
                  <th className="text-left py-2 font-semibold">Forfait</th>
                  <th className="text-right py-2 font-semibold">Prix mensuel</th>
                </tr>
              </thead>
              <tbody>
                {PACKAGES_LIST.map((p) => (
                  <tr key={p.id} className="border-b border-border/20 last:border-0">
                    <td className="py-2 text-foreground">{p.name}</td>
                    <td className="py-2 text-right font-semibold text-amber-400">{fmt(p.flexMonthly)} $/mois</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Closing script */}
      <div className="rounded-2xl border-2 border-fuchsia-500/30 bg-fuchsia-500/[0.03] p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-fuchsia-400 mb-1">🎯 Angle de closing</p>
            <p className="text-xs text-muted-foreground">Ce que tu dis quand tu présentes les 3 options au prospect.</p>
          </div>
          <Button size="sm" variant="outline" onClick={copyScript} className="gap-1.5 flex-shrink-0">
            <Copy className="w-3.5 h-3.5" /> Copier
          </Button>
        </div>
        <blockquote className="text-sm text-foreground italic leading-relaxed border-l-2 border-fuchsia-500/40 pl-4">
          « {CLOSING_SCRIPT} »
        </blockquote>
      </div>

      {/* Internal note */}
      <div className="rounded-xl border border-border/40 bg-muted/20 p-4 text-xs text-muted-foreground space-y-1.5">
        <p className="font-semibold text-foreground">📌 Rappel interne · pricing décidé</p>
        <p>Plafond à 4 000 $/mois. Rétention long terme &gt; ticket max. Un client à 3 400-4 000 $ qui reste 2-3 ans vaut plus qu'un client à 6 800 $ qui part à 8 mois.</p>
        <p>Le vrai KPI : <span className="text-foreground font-medium">revenu par tournage</span>. Système = 5 600 $ par tournage (65 % plus payant que Croissance). Système est le moteur économique de l'agence ; Croissance et Domination sont des upsells de relation.</p>
      </div>
    </div>
  );
}
