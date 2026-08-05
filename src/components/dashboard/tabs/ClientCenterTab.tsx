import { useState, useEffect, useMemo } from "react";
import { useClients, useUpdateClient } from "@/hooks/useClients";
import { useAgencySettings, useUpdateAgencySettings, useClientPortalCodes, useEnsureClientCode, useRegenerateClientCode, useClientJournal, useAddJournalEntry } from "@/hooks/usePortal";
import { EchoTintedLogo } from "@/components/EchoTintedLogo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, formatDate, getContractEndDate, monthsUntil } from "@/lib/utils";
import {
  ExternalLink, FolderOpen, Link, Check, X, Copy, ChevronDown, ChevronUp,
  Users, ClipboardList, Mail, Phone, FileText, Loader2, Sparkles, Lock, RefreshCw,
  BookOpen, Send, User as UserIcon, Calendar as CalendarIcon, Megaphone, FileDown, Eye, Video,
} from "lucide-react";
import type { Client } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { askClaudeText } from "@/lib/claude-client";
import { clientAdsTotals, clientAvgCpl, clientContentTotals, clientMonthSnapshot, clientMomChange } from "@/lib/kpi-ads";
import { downloadClientKpiReport } from "@/lib/kpi-report";

function slugify(s: string): string {
  return s.toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32) || "mon-agence";
}

// ─── Onboarding Data ──────────────────────────────────────────────────────────

const ONBOARDING_QUESTIONS = [
  {
    category: "Objectifs & Vision",
    emoji: "🎯",
    questions: [
      "Quel est ton objectif principal pour les 90 prochains jours?",
      "À quoi ressemble le succès pour toi à la fin de notre contrat?",
      "Quelle est ta cible de revenus mensuelle?",
      "Y a-t-il des délais ou événements importants à prendre en compte?",
    ],
  },
  {
    category: "Public Cible & Marché",
    emoji: "👥",
    questions: [
      "Décris ton client idéal (âge, situation, profession)?",
      "Quel est le problème #1 que tu résous pour eux?",
      "Où ton audience passe-t-elle le plus de temps (réseau social)?",
      "Qui sont tes concurrents directs et qu'est-ce qui te différencie?",
    ],
  },
  {
    category: "Marque & Identité",
    emoji: "🎨",
    questions: [
      "Quels sont les 3 mots qui décrivent le ton de ta marque?",
      "Y a-t-il un style visuel, des couleurs ou des références que tu aimes?",
      "Quels contenus ou créateurs t'inspirent?",
      "Y a-t-il des choses à éviter absolument dans la communication?",
    ],
  },
  {
    category: "Contenu & Logistique",
    emoji: "🎬",
    questions: [
      "As-tu déjà du contenu existant (vidéos, photos, posts)?",
      "Qui sera notre point de contact principal et quel est son rôle?",
      "Quelle est ta disponibilité pour les tournages/appels?",
      "As-tu accès à tous les assets (logo, charte graphique, scripts)?",
    ],
  },
  {
    category: "Accès & Outils",
    emoji: "🔑",
    questions: [
      "Donne-moi accès à ton compte Instagram/TikTok/LinkedIn (Business Manager si Meta Ads)",
      "Partage le lien de ton dossier Google Drive pour les assets",
      "Quels outils utilises-tu déjà (CRM, email, calendrier)?",
      "Y a-t-il d'autres intervenants ou agences avec qui tu travailles?",
    ],
  },
];

const WELCOME_EMAIL_TEMPLATE = `Objet : Bienvenue dans la famille — Lancement de notre collaboration 🚀

Bonjour [Prénom],

Je suis vraiment enthousiaste de démarrer cette aventure avec toi.

À partir d'aujourd'hui, mon équipe et moi sommes entièrement dédiés à faire de [Objectif du client] une réalité.

Voici les prochaines étapes :

1. 📋 Questionnaire d'onboarding — réponds à ce formulaire d'ici [date] pour qu'on puisse personnaliser notre stratégie
2. 📅 Appel de lancement — planifions notre premier call ici : [lien Calendly]
3. 📁 Partage de fichiers — envoie-moi tes assets (logo, visuels, accès) via ce Drive : [lien Drive]

Ce à quoi tu peux t'attendre :
→ Un point hebdomadaire chaque [jour] à [heure]
→ Des livrables dans les délais convenus
→ Une communication transparente à chaque étape

Si tu as des questions avant notre call, je suis disponible par message à tout moment.

Bienvenue officiellement à bord. On va faire de grandes choses ensemble.

[Ton Prénom]
[Nom de l'agence]
[Numéro de téléphone]`;

const KICKOFF_AGENDA = `AGENDA — APPEL DE LANCEMENT
Durée : 60 minutes

─────────────────────────────
[0:00 – 0:05] Introductions & objectif du call

[0:05 – 0:20] Tour d'horizon du client
  • Présentation de l'entreprise et du contexte
  • Historique marketing (ce qui a marché / pas marché)
  • Objectifs prioritaires

[0:20 – 0:35] Stratégie & Plan d'action
  • Présentation de notre approche
  • Premier mois : livrables et jalons
  • Calendrier éditorial et fréquence de contenu

[0:35 – 0:50] Processus de travail
  • Points hebdomadaires (jour et heure fixe)
  • Outil de communication (email, WhatsApp, Slack?)
  • Processus de validation des contenus
  • Délais de retour et de feedback

[0:50 – 0:55] Accès & logistique
  • Vérification des accès (réseaux, Drive, outils)
  • Contacts clés de chaque côté

[0:55 – 1:00] Questions & prochaines étapes
  • Q&A
  • Action items pour les 48h suivantes
─────────────────────────────
AFTER CALL — À envoyer dans les 24h :
  ✓ Résumé du call par email
  ✓ Lien Drive partagé
  ✓ Calendrier des livrables du mois 1`;

const ONBOARDING_CHECKLIST = [
  { id: "contract", label: "Contrat signé et reçu", category: "Admin" },
  { id: "invoice", label: "Première facture envoyée / paiement reçu", category: "Admin" },
  { id: "welcome_email", label: "Email de bienvenue envoyé", category: "Communication" },
  { id: "kickoff_scheduled", label: "Appel de lancement planifié", category: "Communication" },
  { id: "questionnaire", label: "Questionnaire d'onboarding envoyé", category: "Communication" },
  { id: "drive_shared", label: "Dossier Drive créé et partagé", category: "Outils" },
  { id: "social_access", label: "Accès aux réseaux sociaux obtenus", category: "Outils" },
  { id: "brand_assets", label: "Assets de marque reçus (logo, charte)", category: "Outils" },
  { id: "first_content", label: "Premier contenu planifié / scripté", category: "Contenu" },
  { id: "first_shoot", label: "Premier tournage daté", category: "Contenu" },
  { id: "weekly_cadence", label: "Cadence hebdomadaire établie", category: "Suivi" },
  { id: "reporting_setup", label: "Dashboard de reporting partagé", category: "Suivi" },
];

// ─── Onboarding Tab Content ───────────────────────────────────────────────────

function CopyCard({ title, emoji, content }: { title: string; emoji: string; content: string }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <Card className="border-border/50">
      <CardContent className="pt-4 pb-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">{emoji}</span>
            <p className="text-sm font-semibold text-foreground">{title}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              size="sm" variant="outline" className="gap-1.5 text-xs h-7"
              onClick={() => { navigator.clipboard.writeText(content); toast.success("Copié!"); }}
            >
              <Copy className="w-3 h-3" /> Copier
            </Button>
            <Button
              size="icon" variant="ghost" className="h-7 w-7"
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </Button>
          </div>
        </div>
        {expanded && (
          <div className="text-xs text-foreground whitespace-pre-wrap leading-relaxed bg-muted/20 rounded-lg p-3 border border-border/30 max-h-72 overflow-y-auto">
            {content}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function QuestionsSection() {
  const [expanded, setExpanded] = useState<string | null>(null);

  const allQuestions = ONBOARDING_QUESTIONS.flatMap((c) =>
    c.questions.map((q) => `${c.category}\n• ${q}`)
  ).join("\n\n");

  return (
    <Card className="border-border/50">
      <CardContent className="pt-4 pb-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">❓</span>
            <p className="text-sm font-semibold">Questions d'onboarding</p>
          </div>
          <Button
            size="sm" variant="outline" className="gap-1.5 text-xs h-7"
            onClick={() => { navigator.clipboard.writeText(allQuestions); toast.success("Toutes les questions copiées!"); }}
          >
            <Copy className="w-3 h-3" /> Tout copier
          </Button>
        </div>
        <div className="space-y-2">
          {ONBOARDING_QUESTIONS.map((cat) => (
            <div key={cat.category}>
              <button
                className="w-full flex items-center justify-between py-1.5 text-left group"
                onClick={() => setExpanded(expanded === cat.category ? null : cat.category)}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">{cat.emoji}</span>
                  <span className="text-xs font-medium text-foreground group-hover:text-primary transition-colors">{cat.category}</span>
                  <span className="text-xs text-muted-foreground">({cat.questions.length})</span>
                </div>
                {expanded === cat.category
                  ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                  : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                }
              </button>
              {expanded === cat.category && (
                <div className="ml-6 space-y-1.5 pb-1">
                  {cat.questions.map((q, i) => (
                    <div key={i} className="flex items-start gap-2 group/q">
                      <span className="text-primary text-xs mt-0.5">•</span>
                      <p className="text-xs text-muted-foreground flex-1">{q}</p>
                      <button
                        className="opacity-0 group-hover/q:opacity-100 transition-opacity flex-shrink-0"
                        onClick={() => { navigator.clipboard.writeText(q); toast.success("Question copiée"); }}
                      >
                        <Copy className="w-3 h-3 text-muted-foreground hover:text-primary" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ChecklistSection() {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setChecked((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const categories = [...new Set(ONBOARDING_CHECKLIST.map((i) => i.category))];
  const progress = Math.round((checked.size / ONBOARDING_CHECKLIST.length) * 100);

  return (
    <Card className="border-border/50">
      <CardContent className="pt-4 pb-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">✅</span>
            <p className="text-sm font-semibold">Checklist d'onboarding</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{checked.size}/{ONBOARDING_CHECKLIST.length}</span>
            <Button size="sm" variant="ghost" className="text-xs h-7 text-muted-foreground" onClick={() => setChecked(new Set())}>
              Reset
            </Button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>

        {categories.map((cat) => (
          <div key={cat}>
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1.5">{cat}</p>
            <div className="space-y-1">
              {ONBOARDING_CHECKLIST.filter((i) => i.category === cat).map((item) => (
                <button
                  key={item.id}
                  onClick={() => toggle(item.id)}
                  className="w-full flex items-center gap-2.5 py-1 px-2 rounded-md hover:bg-muted/50 transition-colors text-left"
                >
                  <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
                    checked.has(item.id) ? "bg-primary border-primary" : "border-border/60"
                  }`}>
                    {checked.has(item.id) && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                  </div>
                  <span className={`text-xs transition-colors ${checked.has(item.id) ? "line-through text-muted-foreground" : "text-foreground"}`}>
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function AIPersonalizeSection({ clients }: { clients: { id: string; name: string; industry?: string | null }[] }) {
  const [selectedClient, setSelectedClient] = useState("");
  const [extra, setExtra] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");

  const generate = async () => {
    const client = clients.find((c) => c.id === selectedClient);
    if (!client) { toast.error("Sélectionne un client"); return; }

    setLoading(true);
    setResult("");
    try {
      const text = await askClaudeText(
        `Tu es un expert en onboarding client pour agences de marketing vidéo.

Génère un email de bienvenue personnalisé + 5 questions d'onboarding spécifiques pour ce client:

Client: ${client.name}
Industrie: ${client.industry || "Non précisée"}
Contexte additionnel: ${extra || "Aucun"}

Format:
## Email de bienvenue
[Email complet, ton chaleureux et professionnel]

## Questions d'onboarding spécifiques
1. ...
2. ...
3. ...
4. ...
5. ...

Sois ultra-spécifique à leur industrie et situation. Pas de généralités.`,
        { max_tokens: 1500 },
      );
      setResult(text);
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur. Réessaie.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="pt-4 pb-4 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <p className="text-sm font-semibold text-primary">Personnaliser avec Echo AI</p>
        </div>
        <p className="text-xs text-muted-foreground">Génère un email de bienvenue et des questions sur mesure pour un client spécifique.</p>

        <div className="flex gap-2">
          <select
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
            className="flex-1 h-8 text-xs rounded-md border border-input bg-background px-2 text-foreground"
          >
            <option value="">Sélectionner un client...</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <Input
          placeholder="Contexte additionnel (ex: client dans la restauration, objectif TikTok...)"
          value={extra}
          onChange={(e) => setExtra(e.target.value)}
          className="text-xs h-8"
        />

        <Button onClick={generate} disabled={loading || !selectedClient} className="w-full gap-2 shadow-glow">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Génération...</> : "✨ Générer l'onboarding personnalisé"}
        </Button>

        {result && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-primary">Résultat</p>
              <Button size="sm" variant="outline" className="gap-1.5 text-xs h-7"
                onClick={() => { navigator.clipboard.writeText(result); toast.success("Copié!"); }}>
                <Copy className="w-3 h-3" /> Copier
              </Button>
            </div>
            <div className="text-xs text-foreground whitespace-pre-wrap leading-relaxed bg-card rounded-lg p-3 border border-border/30 max-h-80 overflow-y-auto">
              {result}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const statusColors: Record<string, string> = {
  active: "success",
  pipeline: "default",
  on_hold: "warning",
  lost: "destructive",
  completed: "secondary",
};

// Kept in sync with ClientsTab SERVICE_OPTIONS — used to render chips on
// each client card in the Center. Unknown IDs are simply skipped.
const SERVICE_LABELS: Record<string, { label: string; emoji: string }> = {
  leadgen:          { label: "Lead Gen",       emoji: "🚀" },
  contenu16:        { label: "Contenu 16",     emoji: "🎬" },
  contenu20:        { label: "Contenu 20",     emoji: "🎬" },
  botai_forfait:    { label: "Bot AI",         emoji: "💬" },
  videos:           { label: "Vidéos",         emoji: "🎥" },
  ads:              { label: "Meta Ads",       emoji: "📣" },
  ai:               { label: "Form. IA",       emoji: "🤖" },
  crm:              { label: "CRM",            emoji: "📇" },
  web:              { label: "Landing",        emoji: "🌐" },
  brand_direction:  { label: "Direction",      emoji: "🎨" },
  bot_ai:           { label: "Bot AI",         emoji: "💬" },
  social:           { label: "Contenu org.",   emoji: "📱" },
  personal_brand:   { label: "Marque perso",   emoji: "🎯" },
};

const MONTHS_FR_SHORT = ["Jan","Fév","Mar","Avr","Mai","Juin","Juil","Août","Sept","Oct","Nov","Déc"];

export function ClientCenterTab() {
  const { data: clients = [] } = useClients();
  const updateClient = useUpdateClient();
  const activeClients = clients.filter((c) => c.status === "active");
  const pausedClients = clients.filter((c) => c.status === "on_hold");

  const [activeTab, setActiveTab] = useState<"clients" | "onboarding">("clients");

  // General Drive URL
  const [generalDriveUrl, setGeneralDriveUrl] = useState(
    () => localStorage.getItem("echo_general_drive_url") || ""
  );
  const [showGeneralInput, setShowGeneralInput] = useState(false);
  const [generalInput, setGeneralInput] = useState(generalDriveUrl);

  const saveGeneralDrive = () => {
    localStorage.setItem("echo_general_drive_url", generalInput);
    setGeneralDriveUrl(generalInput);
    setShowGeneralInput(false);
    toast.success("Drive général sauvegardé");
  };

  // Per-client Drive edit
  const [editingDrive, setEditingDrive] = useState<string | null>(null);
  const [driveInput, setDriveInput] = useState("");

  // Portal codes (Supabase)
  const { data: portalCodes = [] } = useClientPortalCodes();
  const ensureCode      = useEnsureClientCode();
  const regenerateCodeMut = useRegenerateClientCode();
  const codeForClient = (clientId: string) => portalCodes.find((c) => c.client_id === clientId)?.access_code ?? null;

  const [portalShown, setPortalShown] = useState<string | null>(null);
  const [journalClient, setJournalClient] = useState<Client | null>(null);

  const openPortalPanel = async (clientId: string) => {
    setPortalShown(clientId);
    if (!codeForClient(clientId)) {
      await ensureCode.mutateAsync(clientId);
    }
  };
  const regenerateCode = (clientId: string) => regenerateCodeMut.mutate(clientId);

  // Agency settings (Supabase)
  const { data: agencyData } = useAgencySettings();
  const updateAgency = useUpdateAgencySettings();

  const [agencyName, setAgencyName]   = useState("Mon Agence");
  const [agencySlug, setAgencySlug]   = useState("mon-agence");
  const [agencyColor, setAgencyColor] = useState("#7c3aed");
  const [agencyScriptGpt, setAgencyScriptGpt]   = useState("");
  const [agencyBrandGuide, setAgencyBrandGuide] = useState("");
  const [editingAgency, setEditingAgency] = useState(false);

  useEffect(() => {
    if (!agencyData) return;
    setAgencyName(agencyData.name);
    setAgencySlug(agencyData.slug);
    setAgencyColor(agencyData.color);
    setAgencyScriptGpt(agencyData.script_gpt_url ?? "");
    setAgencyBrandGuide(agencyData.brand_guide_url ?? "");
  }, [agencyData]);

  const publicUrl = `${window.location.origin}/clients/${agencySlug}`;

  const saveAgencySettings = () => {
    const cleanSlug = slugify(agencySlug);
    updateAgency.mutate({
      name:            agencyName.trim() || "Mon Agence",
      slug:            cleanSlug,
      color:           agencyColor,
      script_gpt_url:  agencyScriptGpt.trim() || null,
      brand_guide_url: agencyBrandGuide.trim() || null,
    }, {
      onSuccess: () => { setAgencySlug(cleanSlug); setEditingAgency(false); }
    });
  };

  const startEdit = (clientId: string, currentUrl: string | null) => {
    setEditingDrive(clientId);
    setDriveInput(currentUrl ?? "");
  };

  const cancelEdit = () => { setEditingDrive(null); setDriveInput(""); };

  const saveDrive = async (clientId: string) => {
    try {
      await updateClient.mutateAsync({ id: clientId, google_drive_url: driveInput || null });
      toast.success("Drive connecté");
      cancelEdit();
    } catch {
      toast.error("Erreur lors de la sauvegarde");
    }
  };

  return (
    <div className="p-6 space-y-5 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Centre Client</h2>
        {activeTab === "clients" && (
          <div className="flex items-center gap-2">
            {generalDriveUrl && (
              <Button size="sm" variant="outline" className="gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
                onClick={() => window.open(generalDriveUrl, "_blank")}>
                <FolderOpen className="w-3.5 h-3.5" /> Drive Général
              </Button>
            )}
            <Button size="sm" variant="ghost" className="gap-1.5 text-xs text-muted-foreground"
              onClick={() => { setShowGeneralInput(!showGeneralInput); setGeneralInput(generalDriveUrl); }}>
              <Link className="w-3.5 h-3.5" />
              {generalDriveUrl ? "Changer" : "Connecter Drive Général"}
            </Button>
          </div>
        )}
      </div>

      {/* Tab toggle */}
      <div className="flex gap-1 bg-muted/50 rounded-lg p-1 w-fit">
        <button
          onClick={() => setActiveTab("clients")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${activeTab === "clients" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
        >
          <Users className="w-3.5 h-3.5" /> Clients actifs
        </button>
        <button
          onClick={() => setActiveTab("onboarding")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${activeTab === "onboarding" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
        >
          <ClipboardList className="w-3.5 h-3.5" /> Onboarding
        </button>
      </div>

      {/* ── CLIENTS TAB ── */}
      {activeTab === "clients" && (
        <div className="space-y-3">

          {/* Public client landing — shareable link */}
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="pt-4 pb-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <EchoTintedLogo color={agencyColor} size="w-9 h-9" rounded="rounded-xl" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Lien public pour tes clients</p>
                    <p className="text-[11px] text-muted-foreground">À partager par email ou à embed sur ton site web. Chaque client utilise son code pour entrer.</p>
                  </div>
                </div>
                <Button size="sm" variant="ghost" className="text-xs text-muted-foreground"
                  onClick={() => setEditingAgency(!editingAgency)}>
                  {editingAgency ? "Annuler" : "Configurer"}
                </Button>
              </div>

              {!editingAgency ? (
                <>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 rounded-md bg-card border border-border/50 text-xs text-foreground font-mono truncate">
                      {publicUrl}
                    </code>
                    <Button size="sm" variant="outline" className="gap-1.5 text-xs h-9"
                      onClick={() => { navigator.clipboard.writeText(publicUrl); toast.success("Lien copié"); }}>
                      <Copy className="w-3 h-3" /> Copier
                    </Button>
                    <Button size="sm" className="gap-1.5 text-xs h-9 bg-amber-500 hover:bg-amber-500/90 text-white border-0"
                      onClick={() => window.open(publicUrl, "_blank")}>
                      <ExternalLink className="w-3 h-3" /> Aperçu
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground italic">
                    Tes clients verront : <span className="font-semibold text-foreground">« Accède à ton profil client {agencyName} »</span>
                    {" · "}couleur <span className="inline-block w-2 h-2 rounded-full align-middle ml-0.5" style={{ background: agencyColor }} />
                  </p>
                </>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Nom de l'agence</label>
                      <Input value={agencyName}
                        onChange={(e) => { setAgencyName(e.target.value); setAgencySlug(slugify(e.target.value)); }}
                        placeholder="SFM" className="h-9 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">URL slug</label>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-muted-foreground font-mono">/clients/</span>
                        <Input value={agencySlug}
                          onChange={(e) => setAgencySlug(e.target.value.toLowerCase())}
                          placeholder="sfm" className="h-9 text-sm font-mono" />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Couleur de marque</label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={agencyColor}
                        onChange={(e) => setAgencyColor(e.target.value)}
                        className="w-12 h-9 rounded-md cursor-pointer border-0 bg-transparent" />
                      <span className="text-xs text-muted-foreground font-mono">{agencyColor.toUpperCase()}</span>
                      <div className="flex gap-1 ml-auto">
                        {["#7c3aed","#2563eb","#ea580c","#dc2626","#059669","#ca8a04","#000000"].map(c => (
                          <button key={c} onClick={() => setAgencyColor(c)}
                            className="w-6 h-6 rounded-md border-2 transition-all"
                            style={{ background: c, borderColor: agencyColor === c ? "white" : "transparent" }} />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                      Lien GPT — Machine à scripts vidéo
                    </label>
                    <Input value={agencyScriptGpt}
                      onChange={(e) => setAgencyScriptGpt(e.target.value)}
                      placeholder="https://chatgpt.com/g/..." className="h-9 text-xs font-mono" />
                    <p className="text-[10px] text-muted-foreground">Apparaîtra dans le portail de chaque client pour qu'ils puissent scripter leurs vidéos.</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                      Guide privé — URL
                    </label>
                    <Input value={agencyBrandGuide}
                      onChange={(e) => setAgencyBrandGuide(e.target.value)}
                      placeholder="https://tonsite.com/guide" className="h-9 text-xs font-mono" />
                    <p className="text-[10px] text-muted-foreground">Guide exclusif partagé avec tes clients dans leur portail (frameworks, stratégies, etc.).</p>
                  </div>
                  <Button onClick={saveAgencySettings} className="w-full gap-1.5"
                    style={{ background: agencyColor, color: "white" }}>
                    <Check className="w-4 h-4" /> Enregistrer
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {showGeneralInput && (
            <Card>
              <CardContent className="pt-4 pb-4 flex gap-2">
                <Input autoFocus placeholder="https://drive.google.com/drive/folders/..."
                  value={generalInput} onChange={(e) => setGeneralInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") saveGeneralDrive(); if (e.key === "Escape") setShowGeneralInput(false); }}
                  className="text-xs" />
                <Button onClick={saveGeneralDrive}><Check className="w-4 h-4" /></Button>
                <Button variant="ghost" onClick={() => setShowGeneralInput(false)}><X className="w-4 h-4" /></Button>
              </CardContent>
            </Card>
          )}

          {(() => {
            const renderClientCard = (client: any) => (
              <Card key={client.id} className="hover:border-border/80 transition-colors">
                <CardContent className="pt-4 pb-4 space-y-3">
                  <div className="flex items-center gap-4">
                    <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-primary font-bold text-sm">{client.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm text-foreground">{client.name}</p>
                        <Badge variant={statusColors[client.status] as any}>{client.status}</Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                        {client.industry && <span>{client.industry}</span>}
                        {client.monthly_recurring_revenue && (
                          <span className="text-foreground font-medium">{formatCurrency(client.monthly_recurring_revenue)}/mois</span>
                        )}
                        {(() => {
                          const end = getContractEndDate(client.contract_start_date, client.contract_length_months, client.contract_end_date);
                          const left = monthsUntil(end);
                          if (left === null) return client.contract_start_date ? <span>Depuis {formatDate(client.contract_start_date)}</span> : null;
                          const color = left < 0 ? "text-destructive" : left <= 1 ? "text-destructive" : left <= 3 ? "text-amber-400" : "text-emerald-400";
                          return (
                            <span className={color}>
                              {left < 0 ? "Contrat expiré" : `${left} mois restants`}
                            </span>
                          );
                        })()}
                      </div>

                      {/* Services chips (from client.services) */}
                      {(client.services ?? []).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {(client.services as string[] ?? []).slice(0, 6).map((sid) => {
                            const meta = SERVICE_LABELS[sid];
                            if (!meta) return null;
                            return (
                              <span key={sid} className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted/40 text-foreground/80 border border-border/40">
                                {meta.emoji} {meta.label}
                              </span>
                            );
                          })}
                        </div>
                      )}

                      {/* This-month KPIs with MoM comparison */}
                      {(() => {
                        const thisMonth = clientMonthSnapshot(client.id, 0);
                        const ads3m     = clientAdsTotals(client.id, 3);
                        const content3m = clientContentTotals(client.id, 3);
                        const avgCpl3m  = clientAvgCpl(client.id, 3);
                        const hasAny    = thisMonth || ads3m.months > 0 || content3m.months > 0;
                        if (!hasAny) return null;

                        const mm = MONTHS_FR_SHORT[new Date().getMonth()];
                        const leadsMoM  = clientMomChange(client.id, "leads");
                        const budgetMoM = clientMomChange(client.id, "budget");

                        return (
                          <div className="mt-3 rounded-lg border border-border/40 bg-muted/10 px-3 py-2 space-y-1.5">
                            {/* This month row */}
                            {thisMonth && (
                              <div className="flex items-center gap-3 text-[11px] flex-wrap">
                                <span className="text-[9px] font-bold uppercase tracking-wider text-primary">{mm}</span>
                                {thisMonth.budget > 0 && (
                                  <span className="text-foreground">
                                    Budget : <span className="font-semibold">{formatCurrency(thisMonth.budget)}</span>
                                    {budgetMoM !== null && (
                                      <span className={`ml-1 text-[10px] ${budgetMoM >= 0 ? "text-emerald-400" : "text-destructive"}`}>
                                        {budgetMoM >= 0 ? "▲" : "▼"}{Math.abs(budgetMoM)}%
                                      </span>
                                    )}
                                  </span>
                                )}
                                {thisMonth.leads > 0 && (
                                  <span className="text-foreground">
                                    Leads : <span className="font-semibold">{thisMonth.leads}</span>
                                    {leadsMoM !== null && (
                                      <span className={`ml-1 text-[10px] ${leadsMoM >= 0 ? "text-emerald-400" : "text-destructive"}`}>
                                        {leadsMoM >= 0 ? "▲" : "▼"}{Math.abs(leadsMoM)}%
                                      </span>
                                    )}
                                  </span>
                                )}
                                {thisMonth.cpl !== null && (
                                  <span className="text-foreground">
                                    CPL : <span className="font-semibold">${thisMonth.cpl.toFixed(2)}</span>
                                  </span>
                                )}
                              </div>
                            )}
                            {/* 3-month totals row */}
                            {(ads3m.months > 0 || content3m.months > 0) && (
                              <div className="flex items-center gap-1.5 flex-wrap text-[10px] text-muted-foreground pt-1 border-t border-border/30">
                                <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/70">3M</span>
                                {content3m.views > 0 && (
                                  <span className="flex items-center gap-1"><Eye className="w-2.5 h-2.5" />{content3m.views.toLocaleString("fr-CA")} vues</span>
                                )}
                                {content3m.videos > 0 && (
                                  <span className="flex items-center gap-1"><Video className="w-2.5 h-2.5" />{content3m.videos} vidéos</span>
                                )}
                                {ads3m.leads > 0 && (
                                  <span className="flex items-center gap-1"><Megaphone className="w-2.5 h-2.5" />{ads3m.leads} leads</span>
                                )}
                                {ads3m.budget > 0 && (
                                  <span>· {formatCurrency(ads3m.budget)} dépensé</span>
                                )}
                                {avgCpl3m !== null && (
                                  <span>· CPL moyen ${avgCpl3m.toFixed(2)}</span>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {client.google_drive_url && (
                        <Button size="sm" variant="ghost" className="gap-1.5 text-xs text-primary hover:bg-primary/10"
                          onClick={() => window.open(client.google_drive_url!, "_blank")}>
                          <FolderOpen className="w-3.5 h-3.5" /> Drive
                        </Button>
                      )}
                      <Button size="sm" variant="outline"
                        className={`gap-1.5 text-xs ${client.google_drive_url ? "border-primary/30 text-primary" : "border-border/50 text-muted-foreground"}`}
                        onClick={() => startEdit(client.id, client.google_drive_url)}>
                        <Link className="w-3.5 h-3.5" />
                        {client.google_drive_url ? "Changer" : "Connecter Drive"}
                      </Button>
                      <Button size="sm" variant="outline"
                        className="gap-1.5 text-xs border-primary/30 text-primary hover:bg-primary/10"
                        onClick={() => {
                          try {
                            downloadClientKpiReport(
                              { id: client.id, name: client.name, industry: client.industry, contract_start_date: client.contract_start_date },
                              { name: agencyData?.name ?? "Mon Agence", color: agencyData?.color ?? "#7c3aed" },
                              6,
                            );
                            toast.success("Rapport téléchargé");
                          } catch (e: any) {
                            toast.error(e?.message ?? "Erreur PDF");
                          }
                        }}>
                        <FileDown className="w-3.5 h-3.5" />
                        Rapport
                      </Button>
                      <Button size="sm" variant="outline"
                        className="gap-1.5 text-xs border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"
                        onClick={() => setJournalClient(client)}>
                        <BookOpen className="w-3.5 h-3.5" />
                        Carnet
                      </Button>
                      <Button size="sm" variant="outline"
                        className="gap-1.5 text-xs border-amber-500/40 text-amber-400 hover:bg-amber-500/10"
                        onClick={() => portalShown === client.id ? setPortalShown(null) : openPortalPanel(client.id)}>
                        <Lock className="w-3.5 h-3.5" />
                        Portail
                      </Button>
                    </div>
                  </div>
                  {editingDrive === client.id && (
                    <div className="flex gap-2 pt-1">
                      <Input autoFocus placeholder="https://drive.google.com/drive/folders/..."
                        value={driveInput} onChange={(e) => setDriveInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") saveDrive(client.id); if (e.key === "Escape") cancelEdit(); }}
                        className="text-xs h-8" />
                      <Button size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => saveDrive(client.id)} disabled={updateClient.isPending}>
                        <Check className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 flex-shrink-0" onClick={cancelEdit}>
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}

                  {/* Portal access panel */}
                  {portalShown === client.id && (
                    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 space-y-3 mt-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2">
                          <Lock className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-xs font-semibold text-foreground">Portail client</p>
                            <p className="text-[10px] text-muted-foreground">Partage le code ci-dessous avec {client.name} pour qu'il accède à son espace.</p>
                          </div>
                        </div>
                        <button onClick={() => setPortalShown(null)} className="text-muted-foreground hover:text-foreground">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {(() => {
                        const code = codeForClient(client.id);
                        if (!code) {
                          return (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Génération du code…
                            </div>
                          );
                        }
                        return (
                          <>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 px-3 py-2 rounded-md bg-card border border-border/50 font-mono text-base text-foreground text-center tracking-widest font-bold">
                                {code}
                              </div>
                              <Button size="icon" variant="outline" className="h-9 w-9 flex-shrink-0"
                                onClick={() => { navigator.clipboard.writeText(code); toast.success("Code copié"); }}
                                title="Copier le code">
                                <Copy className="w-3.5 h-3.5" />
                              </Button>
                              <Button size="icon" variant="outline" className="h-9 w-9 flex-shrink-0"
                                onClick={() => regenerateCode(client.id)} title="Régénérer un nouveau code">
                                <RefreshCw className="w-3.5 h-3.5" />
                              </Button>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-2">
                              <Button size="sm" className="flex-1 gap-1.5 bg-amber-500 hover:bg-amber-500/90 text-white border-0"
                                onClick={() => window.open(`/portail?code=${code}`, "_blank")}>
                                <ExternalLink className="w-3.5 h-3.5" />
                                Ouvrir le portail (aperçu)
                              </Button>
                              <Button size="sm" variant="outline" className="flex-1 gap-1.5"
                                onClick={() => {
                                  const url = `${window.location.origin}/portail?code=${code}`;
                                  navigator.clipboard.writeText(url);
                                  toast.success("Lien copié — prêt à envoyer");
                                }}>
                                <Copy className="w-3.5 h-3.5" />
                                Copier le lien d'invitation
                              </Button>
                            </div>
                          </>
                        );
                      })()}

                      <p className="text-[10px] text-muted-foreground italic">
                        Le client verra : son forfait ({client.monthly_recurring_revenue ? formatCurrency(client.monthly_recurring_revenue) + "/mois" : "à définir"}), son Drive {client.google_drive_url ? "✓" : "(non configuré)"}, et un carnet d'idées partagé.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );

            if (activeClients.length === 0 && pausedClients.length === 0) {
              return (
                <Card>
                  <CardContent className="pt-8 pb-8 flex flex-col items-center text-center gap-3">
                    <EchoTintedLogo color={agencyColor} pose="sitting" size="w-20 h-20" />
                    <p className="text-muted-foreground text-sm">Aucun client actif pour l'instant.<br/>Ajoute ton premier client depuis Client Management.</p>
                  </CardContent>
                </Card>
              );
            }

            return (
              <div className="space-y-6">
                {/* Active section */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-foreground">Clients actifs</h3>
                    <Badge variant="success" className="text-xs">{activeClients.length}</Badge>
                  </div>
                  {activeClients.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic px-1">Aucun client actif pour l'instant.</p>
                  ) : (
                    <div className="space-y-3">
                      {activeClients.map(renderClientCard)}
                    </div>
                  )}
                </div>

                {/* Paused section */}
                {pausedClients.length > 0 && (
                  <div className="space-y-3 pt-4 border-t border-border/40">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">En pause</h3>
                      <Badge variant="warning" className="text-xs">{pausedClients.length}</Badge>
                    </div>
                    <div className="space-y-3 opacity-75">
                      {pausedClients.map(renderClientCard)}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* ── ONBOARDING TAB ── */}
      {activeTab === "onboarding" && (
        <div className="space-y-4">
          {/* AI personalization */}
          <AIPersonalizeSection clients={activeClients.map((c) => ({ id: c.id, name: c.name, industry: c.industry }))} />

          {/* Questions */}
          <QuestionsSection />

          {/* Templates */}
          <CopyCard
            emoji="📧"
            title="Template email de bienvenue"
            content={WELCOME_EMAIL_TEMPLATE}
          />
          <CopyCard
            emoji="📋"
            title="Agenda d'appel de lancement (kickoff)"
            content={KICKOFF_AGENDA}
          />

          {/* Checklist */}
          <ChecklistSection />
        </div>
      )}

      {/* ── Journal slide-in panel ── */}
      {journalClient && (
        <ClientJournalPanel
          client={journalClient}
          agencyColor={agencyColor}
          onClose={() => setJournalClient(null)}
        />
      )}
    </div>
  );
}

// ── Client Journal Panel (slides in from the right) ──────────────────────────

function ClientJournalPanel({ client, agencyColor, onClose }: {
  client: Client; agencyColor: string; onClose: () => void;
}) {
  const { data: entries = [], isLoading } = useClientJournal(client.id);
  const addEntry = useAddJournalEntry();
  const [text, setText] = useState("");

  const submit = () => {
    if (!text.trim()) return;
    addEntry.mutate(
      { client_id: client.id, content: text.trim(), author: "agency" },
      { onSuccess: () => setText("") }
    );
  };

  // Group entries by month (YYYY-MM)
  const grouped = useMemo(() => {
    const map = new Map<string, typeof entries>();
    for (const e of entries) {
      const monthKey = e.entry_date.slice(0, 7); // YYYY-MM
      if (!map.has(monthKey)) map.set(monthKey, []);
      map.get(monthKey)!.push(e);
    }
    return Array.from(map.entries()).sort(([a], [b]) => b.localeCompare(a));
  }, [entries]);

  const monthLabel = (key: string) => {
    const [y, m] = key.split("-").map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString("fr-CA", { month: "long", year: "numeric" });
  };
  const formatTime = (iso: string) =>
    new Date(iso).toLocaleString("fr-CA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-background/40 backdrop-blur-sm z-40 animate-in fade-in"
        onClick={onClose} />

      {/* Panel */}
      <aside className="fixed top-0 right-0 h-full w-full sm:w-[480px] bg-card border-l border-border/50 shadow-2xl z-50 flex flex-col animate-in slide-in-from-right">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/40"
          style={{ background: `linear-gradient(135deg, ${agencyColor}15, transparent)` }}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: `${agencyColor}25` }}>
              <BookOpen className="w-4 h-4" style={{ color: agencyColor }} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-foreground truncate">Carnet d'idées</p>
              <p className="text-[11px] text-muted-foreground truncate">{client.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Entries (grouped by month) */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : grouped.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <BookOpen className="w-8 h-8 mx-auto text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Aucune entrée encore.</p>
              <p className="text-xs text-muted-foreground/70">Les idées de {client.name} apparaîtront ici dès qu'il les ajoute sur son portail.</p>
            </div>
          ) : (
            grouped.map(([monthKey, monthEntries]) => (
              <div key={monthKey}>
                <div className="sticky top-0 -mt-1 mb-3 z-10 bg-card/95 backdrop-blur-sm py-1.5">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-3.5 h-3.5" style={{ color: agencyColor }} />
                    <h3 className="text-xs font-bold uppercase tracking-wider capitalize" style={{ color: agencyColor }}>
                      {monthLabel(monthKey)}
                    </h3>
                    <span className="text-[10px] text-muted-foreground">· {monthEntries.length} {monthEntries.length === 1 ? "entrée" : "entrées"}</span>
                  </div>
                </div>
                <div className="space-y-3 pl-1 border-l-2" style={{ borderColor: `${agencyColor}33` }}>
                  {monthEntries.map((e) => {
                    const isClient = e.author === "client";
                    return (
                      <div key={e.id} className="pl-4 -ml-0.5 relative">
                        <div className="absolute -left-[7px] top-2 w-3 h-3 rounded-full border-2 border-card"
                          style={{ background: isClient ? agencyColor : `${agencyColor}40` }} />
                        <div className="flex items-baseline gap-2 mb-1.5">
                          <span className="text-xs font-bold text-foreground">{isClient ? client.name.split(" ")[0] : "Toi (Agence)"}</span>
                          <span className="text-[10px] text-muted-foreground">{formatTime(e.created_at)}</span>
                          {!isClient && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider"
                              style={{ background: `${agencyColor}1a`, color: agencyColor }}>
                              Agence
                            </span>
                          )}
                        </div>
                        <div className={`rounded-lg px-3 py-2 text-sm leading-relaxed ${isClient ? "bg-muted/40 text-foreground" : "text-foreground border"}`}
                          style={!isClient ? { background: `${agencyColor}0a`, borderColor: `${agencyColor}33` } : {}}>
                          {e.content}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* New entry — agency reply */}
        <div className="border-t border-border/40 p-4 bg-muted/10">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: agencyColor }}>
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="flex-1 space-y-2">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit(); }}
                placeholder={`Répondre à ${client.name.split(" ")[0]} ou ajouter une idée…`}
                rows={3}
                className="w-full bg-background border border-border/50 rounded-lg p-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 resize-none"
              />
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-muted-foreground">⌘+Enter pour envoyer</p>
                <Button onClick={submit} disabled={!text.trim() || addEntry.isPending} size="sm"
                  className="gap-1.5 text-white border-0 hover:opacity-90"
                  style={{ background: agencyColor }}>
                  {addEntry.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Send className="w-3.5 h-3.5" /> Publier</>}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
