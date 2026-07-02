import { useEffect, useRef, useState } from "react";
import { useClients } from "@/hooks/useClients";
import { useAgencySettings } from "@/hooks/usePortal";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Plus, Sparkles, ExternalLink, Loader2, Copy, Trash2, Wand2, ArrowLeft, Check, Presentation, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { EchoTintedLogo } from "@/components/EchoTintedLogo";

// ─── Types & storage ─────────────────────────────────────────────────────────

interface Submission {
  id: string;
  clientId: string;
  clientName: string;
  projectType: string;
  duration: string;
  budget: string;
  extraNotes: string;
  prompt: string;
  status: "draft" | "generating" | "ready" | "error";
  gammaUrl?: string;
  gammaId?: string;
  error?: string;
  createdAt: number;
}

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
  const [view, setView] = useState<"list" | "new" | "detail">("list");
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
    onOpen={(id) => { setSelectedId(id); setView("detail"); }}
    onDelete={remove}
  />;
}

// ─── List view ──────────────────────────────────────────────────────────────

function SubmissionsList({ submissions, onNew, onOpen, onDelete }: {
  submissions: Submission[]; onNew: () => void; onOpen: (id: string) => void; onDelete: (id: string) => void;
}) {
  return (
    <div className="p-8 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Presentation className="w-5 h-5 text-primary" /> Soumissions
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">Génère des propositions commerciales avec Gamma AI</p>
        </div>
        <Button onClick={onNew} className="gap-2 shadow-glow">
          <Plus className="w-4 h-4" /> Nouvelle soumission
        </Button>
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
                  <p className="text-sm font-semibold text-foreground truncate">{s.clientName}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{s.projectType || "Projet non spécifié"}</p>
                </div>
                <StatusBadge status={s.status} />
              </div>
              {s.budget && (
                <p className="text-xs text-muted-foreground">Budget: <span className="text-foreground font-medium">{s.budget}</span></p>
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
    draft:      { label: "Brouillon",  cls: "bg-muted/40 text-muted-foreground" },
    generating: { label: "Génération", cls: "bg-primary/15 text-primary" },
    ready:      { label: "Prête",      cls: "bg-emerald-500/15 text-emerald-400" },
    error:      { label: "Erreur",     cls: "bg-destructive/15 text-destructive" },
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
  const activeClients = clients.filter((c) => c.status === "active" || c.status === "pipeline");

  const [clientId, setClientId] = useState<string>("");
  const [projectType, setProjectType] = useState("");
  const [duration, setDuration] = useState("");
  const [budget, setBudget] = useState("");
  const [extraNotes, setExtraNotes] = useState("");

  const selectedClient = clients.find((c) => c.id === clientId);
  const agencyName = agency?.name ?? "Mon Agence";

  const buildPrompt = () => {
    const c = selectedClient;
    return `Crée une proposition commerciale professionnelle et visuellement percutante pour un client, présentée par l'agence "${agencyName}".

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CLIENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Nom : ${c?.name ?? "Client"}
${c?.industry ? `Industrie : ${c.industry}` : ""}
${c?.monthly_recurring_revenue ? `Revenu mensuel connu : ${formatCurrency(c.monthly_recurring_revenue)}` : ""}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROJET PROPOSÉ
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Type de projet : ${projectType}
${duration ? `Durée : ${duration}` : ""}
${budget ? `Budget cible : ${budget}` : ""}

${extraNotes ? `━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NOTES ADDITIONNELLES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${extraNotes}
` : ""}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STRUCTURE ATTENDUE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Slide de garde avec le nom du client
2. Compréhension du besoin
3. Notre approche / méthodologie
4. Livrables et échéancier
5. Investissement (${budget || "à définir"})
6. Pourquoi ${agencyName}
7. Prochaines étapes

Ton : professionnel, chaleureux, orienté résultats.
Format : présentation moderne avec visuels marquants.
Couleur d'accent : ${agency?.color ?? "#7c3aed"}`;
  };

  const canSubmit = clientId && projectType.trim();

  const handleCreate = async () => {
    if (!canSubmit) return;
    const sub: Submission = {
      id: crypto.randomUUID(),
      clientId,
      clientName: selectedClient?.name ?? "Client",
      projectType: projectType.trim(),
      duration: duration.trim(),
      budget: budget.trim(),
      extraNotes: extraNotes.trim(),
      prompt: buildPrompt(),
      status: "draft",
      createdAt: Date.now(),
    };
    onCreate(sub);
    toast.success("Soumission créée — génère-la avec Gamma sur la page suivante");
  };

  return (
    <div className="p-8 space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <button onClick={onCancel} className="p-1.5 rounded-lg border border-border/40 hover:bg-accent">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h2 className="text-xl font-semibold text-foreground">Nouvelle soumission</h2>
          <p className="text-sm text-muted-foreground">Les infos client sont auto-remplies depuis ton CRM</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border/40 bg-card p-6 space-y-5">
        {/* Client */}
        <div className="space-y-1.5">
          <Label className="text-xs">Client</Label>
          <select value={clientId} onChange={(e) => setClientId(e.target.value)}
            className="w-full h-10 text-sm rounded-md border border-input bg-background px-3 text-foreground">
            <option value="">Sélectionner un client…</option>
            {activeClients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}{c.industry ? ` · ${c.industry}` : ""}</option>
            ))}
          </select>
          {selectedClient && (
            <p className="text-[11px] text-muted-foreground pt-1">
              Auto-rempli : {selectedClient.industry ?? "industrie non renseignée"}
              {selectedClient.monthly_recurring_revenue ? ` · MRR actuel: ${formatCurrency(selectedClient.monthly_recurring_revenue)}` : ""}
            </p>
          )}
        </div>

        {/* Project type */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Type de projet <span className="text-destructive">*</span></Label>
            <Input value={projectType} onChange={(e) => setProjectType(e.target.value)}
              placeholder="Ex: Vidéo de marque + 12 Reels" className="text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Durée</Label>
            <Input value={duration} onChange={(e) => setDuration(e.target.value)}
              placeholder="Ex: 3 mois" className="text-sm" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Budget cible</Label>
          <Input value={budget} onChange={(e) => setBudget(e.target.value)}
            placeholder="Ex: 4 500 $ / mois" className="text-sm" />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Notes / contexte additionnel <span className="text-muted-foreground">(optionnel)</span></Label>
          <Textarea value={extraNotes} onChange={(e) => setExtraNotes(e.target.value)}
            placeholder="Ex: Client existant qui veut étendre à TikTok, priorité au ROI mesurable…" rows={3} />
        </div>

        <div className="flex items-center justify-between pt-2">
          <p className="text-[10px] text-muted-foreground italic">
            Branding auto : logo + couleurs de <span className="text-foreground font-medium">{agencyName}</span>
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onCancel}>Annuler</Button>
            <Button onClick={handleCreate} disabled={!canSubmit} className="gap-2">
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
  const [prompt, setPrompt] = useState(submission.prompt);
  const [gammaUrlInput, setGammaUrlInput] = useState(submission.gammaUrl ?? "");
  const [generating, setGenerating] = useState(false);
  const pollTimer = useRef<number | null>(null);

  const hasApiKey = !!agency?.gamma_api_key;

  // Kick off generation via the Edge Function → returns generationId → then poll
  const generateWithGamma = async () => {
    if (!hasApiKey) {
      toast.error("Configure d'abord ta clé Gamma dans Settings → Intégrations");
      return;
    }
    setGenerating(true);
    onUpdate({ ...submission, prompt, status: "generating", error: undefined });
    try {
      const { data, error } = await supabase.functions.invoke("generate-gamma-submission?action=create", {
        body: { inputText: prompt },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.message ?? data.error);
      if (!data?.generationId) throw new Error("Réponse Gamma invalide");
      const genId = data.generationId as string;
      onUpdate({ ...submission, prompt, status: "generating", gammaId: genId, error: undefined });
      toast.success("Génération lancée sur Gamma — j'affiche le lien dès qu'elle est prête");
      pollStatus(genId);
    } catch (e: any) {
      setGenerating(false);
      const msg = e?.message ?? "Erreur inconnue";
      onUpdate({ ...submission, prompt, status: "error", error: msg });
      toast.error(msg);
    }
  };

  const pollStatus = (genId: string) => {
    const tick = async () => {
      try {
        const { data, error } = await supabase.functions.invoke(`generate-gamma-submission?action=status&id=${genId}`, { method: "GET" as any });
        if (error) throw new Error(error.message);
        if (data?.error) throw new Error(data.message ?? data.error);
        if (data?.status === "completed" && data?.gammaUrl) {
          setGenerating(false);
          onUpdate({ ...submission, prompt, gammaId: genId, gammaUrl: data.gammaUrl, status: "ready" });
          toast.success("Présentation prête!");
          return;
        }
        if (data?.status === "failed") {
          setGenerating(false);
          onUpdate({ ...submission, prompt, gammaId: genId, status: "error", error: "Gamma a échoué la génération" });
          toast.error("Gamma a échoué la génération");
          return;
        }
        // still pending/processing → poll again
        pollTimer.current = window.setTimeout(tick, 4000);
      } catch (e: any) {
        setGenerating(false);
        const msg = e?.message ?? "Erreur de polling";
        onUpdate({ ...submission, prompt, gammaId: genId, status: "error", error: msg });
        toast.error(msg);
      }
    };
    tick();
  };

  useEffect(() => {
    // Resume polling if a generation is in progress
    if (submission.status === "generating" && submission.gammaId && !pollTimer.current) {
      setGenerating(true);
      pollStatus(submission.gammaId);
    }
    return () => {
      if (pollTimer.current) { window.clearTimeout(pollTimer.current); pollTimer.current = null; }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveGammaUrl = () => {
    if (!gammaUrlInput.trim()) return;
    onUpdate({ ...submission, gammaUrl: gammaUrlInput.trim(), status: "ready" });
    toast.success("Lien Gamma sauvegardé");
  };

  const copyPrompt = () => {
    navigator.clipboard.writeText(prompt);
    toast.success("Prompt copié");
  };

  return (
    <div className="p-8 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 rounded-lg border border-border/40 hover:bg-accent">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-xl font-semibold text-foreground">{submission.clientName}</h2>
            <p className="text-sm text-muted-foreground">{submission.projectType}</p>
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
      <div className="grid grid-cols-3 gap-3">
        <MetaCell label="Durée" value={submission.duration || "—"} />
        <MetaCell label="Budget" value={submission.budget || "—"} />
        <MetaCell label="Créée le" value={new Date(submission.createdAt).toLocaleDateString("fr-CA", { day: "numeric", month: "short" })} />
      </div>

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

      {/* Prompt editor */}
      <div className="rounded-2xl border border-border/40 bg-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground">Brief Gamma</h3>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={copyPrompt} className="gap-1.5 text-xs">
              <Copy className="w-3.5 h-3.5" /> Copier
            </Button>
          </div>
        </div>
        <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={14}
          className="text-xs font-mono leading-relaxed" />
        <p className="text-[10px] text-muted-foreground">
          Ce prompt sera envoyé à l'API Gamma. Ajuste-le si tu veux un ton différent ou plus de détails.
        </p>
        {!hasApiKey ? (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 flex items-start gap-3">
            <KeyRound className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground">Clé Gamma requise</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Va dans <span className="font-medium text-foreground">Settings → Intégrations → Gamma AI</span> pour coller ta clé API.
              </p>
            </div>
          </div>
        ) : (
          <Button onClick={generateWithGamma} disabled={generating} className="w-full gap-2 shadow-glow">
            {generating
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Génération en cours…</>
              : <><Sparkles className="w-4 h-4" /> Générer avec Gamma</>
            }
          </Button>
        )}
        {submission.error && (
          <p className="text-xs text-destructive">{submission.error}</p>
        )}
      </div>

      {/* Manual URL capture — fallback if you generated on gamma.app directly */}
      <div className="rounded-2xl border border-border/40 bg-card p-6 space-y-3">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground">Ou colle un lien Gamma existant</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Si tu as généré la présentation directement sur gamma.app, colle l'URL ici pour l'associer à cette soumission.
        </p>
        <div className="flex gap-2">
          <Input value={gammaUrlInput} onChange={(e) => setGammaUrlInput(e.target.value)}
            placeholder="https://gamma.app/docs/..." className="text-sm font-mono" />
          <Button onClick={saveGammaUrl} disabled={!gammaUrlInput.trim()} variant="outline" className="gap-1.5">
            <Check className="w-4 h-4" /> Associer
          </Button>
        </div>
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
