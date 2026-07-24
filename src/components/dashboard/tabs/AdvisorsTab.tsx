import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { askClaudeText } from "@/lib/claude-client";
import { sendMessage, type Message } from "@/lib/ai-tools";
import {
  ArrowLeft, Copy, Loader2, Send, Megaphone, Video, Bot, PhoneCall,
  BarChart3, MessageSquare, Sparkles, DollarSign, Calculator,
} from "lucide-react";
import { ROITab } from "@/components/dashboard/tabs/ROITab";

// ── Workspaces ────────────────────────────────────────────────────────────────

type WorkspaceId =
  | "ads-script"
  | "video-script"
  | "ai-agent"
  | "sales-call"
  | "business-analysis"
  | "roi"
  | "free-chat";

interface Workspace {
  id: WorkspaceId;
  emoji: string;
  label: string;
  description: string;
  icon: any;
  color: string;
}

const WORKSPACES: Workspace[] = [
  {
    id: "ads-script",
    emoji: "📣",
    label: "Script d'Ads",
    description: "Génère 3 variantes de script publicitaire à partir de ton offre et de ton audience.",
    icon: Megaphone,
    color: "text-primary",
  },
  {
    id: "video-script",
    emoji: "🎬",
    label: "Script vidéo organique",
    description: "Structure Hook → Story → CTA pour Reels, TikTok, YouTube Shorts.",
    icon: Video,
    color: "text-emerald-400",
  },
  {
    id: "ai-agent",
    emoji: "🤖",
    label: "Design d'agent IA",
    description: "Propose l'architecture d'un agent IA (inputs, outputs, prompts, garde-fous).",
    icon: Bot,
    color: "text-fuchsia-400",
  },
  {
    id: "sales-call",
    emoji: "📞",
    label: "Analyse d'appel de vente",
    description: "Colle le transcript d'un appel de vente et reçois un debrief structuré.",
    icon: PhoneCall,
    color: "text-amber-400",
  },
  {
    id: "business-analysis",
    emoji: "📊",
    label: "Analyse business",
    description: "Echo lit tes données (revenus, dépenses, clients, KPI) et te conseille.",
    icon: BarChart3,
    color: "text-blue-400",
  },
  {
    id: "roi",
    emoji: "💰",
    label: "ROI Calculator",
    description: "Calcule le ROI d'un client ou d'une campagne.",
    icon: Calculator,
    color: "text-emerald-400",
  },
  {
    id: "free-chat",
    emoji: "💬",
    label: "Chat libre avec Echo",
    description: "Pose n'importe quelle question — Echo a accès à tes données.",
    icon: MessageSquare,
    color: "text-muted-foreground",
  },
];

// ── Root component ────────────────────────────────────────────────────────────

export function AdvisorsTab() {
  const [selected, setSelected] = useState<Workspace | null>(null);

  if (selected) return <WorkspaceRunner workspace={selected} onBack={() => setSelected(null)} />;

  return (
    <div className="p-8 space-y-6 max-w-6xl mx-auto">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold text-foreground">Marketing Advisors</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Choisis un espace de travail. Chacun est spécialisé — pose une question, remplis un mini-brief, reçois une réponse actionnable.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {WORKSPACES.map((w) => {
          const Icon = w.icon;
          return (
            <button
              key={w.id}
              onClick={() => setSelected(w)}
              className="text-left rounded-2xl border border-border/40 bg-card p-5 space-y-3 hover:border-primary/50 hover:bg-primary/[0.02] transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Icon className={`w-4 h-4 ${w.color}`} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{w.label}</p>
                  <p className="text-[11px] text-muted-foreground">{w.emoji}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{w.description}</p>
              <div className="pt-1 text-[11px] text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                Ouvrir →
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Workspace runner (dispatches to the right form) ──────────────────────────

function WorkspaceRunner({ workspace, onBack }: { workspace: Workspace; onBack: () => void }) {
  const Header = (
    <div className="flex items-center gap-3">
      <button onClick={onBack} className="p-1.5 rounded-lg border border-border/50 hover:bg-accent transition-colors">
        <ArrowLeft className="w-4 h-4" />
      </button>
      <div>
        <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <span>{workspace.emoji}</span> {workspace.label}
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">{workspace.description}</p>
      </div>
    </div>
  );

  if (workspace.id === "roi") {
    return (
      <div className="p-8 space-y-6 max-w-6xl mx-auto">
        {Header}
        <ROITab />
      </div>
    );
  }

  if (workspace.id === "business-analysis") return <BusinessAnalysisWorkspace header={Header} />;
  if (workspace.id === "free-chat")         return <FreeChatWorkspace header={Header} />;
  if (workspace.id === "ads-script")        return <AdsScriptWorkspace header={Header} />;
  if (workspace.id === "video-script")      return <VideoScriptWorkspace header={Header} />;
  if (workspace.id === "ai-agent")          return <AiAgentWorkspace header={Header} />;
  if (workspace.id === "sales-call")        return <SalesCallWorkspace header={Header} />;

  return <div className="p-8">{Header}</div>;
}

// ─── Shared: result panel ────────────────────────────────────────────────────

function ResultPanel({ text, loading }: { text: string; loading: boolean }) {
  const copy = async () => {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    toast.success("Copié");
  };
  return (
    <div className="rounded-2xl border border-primary/30 bg-primary/[0.03] p-6 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <p className="text-xs font-bold uppercase tracking-wider text-primary">Résultat</p>
        </div>
        {text && !loading && (
          <Button size="sm" variant="outline" onClick={copy} className="gap-1.5 text-xs">
            <Copy className="w-3.5 h-3.5" /> Copier
          </Button>
        )}
      </div>
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
          <Loader2 className="w-4 h-4 animate-spin" /> Echo réfléchit…
        </div>
      ) : text ? (
        <pre className="text-sm text-foreground leading-relaxed whitespace-pre-wrap font-sans">{text}</pre>
      ) : (
        <p className="text-xs text-muted-foreground italic">Remplis le brief à gauche et clique sur « Générer ».</p>
      )}
    </div>
  );
}

// ─── Ads Script workspace ────────────────────────────────────────────────────

function AdsScriptWorkspace({ header }: { header: React.ReactNode }) {
  const [product, setProduct]     = useState("");
  const [audience, setAudience]   = useState("");
  const [offer, setOffer]         = useState("");
  const [platform, setPlatform]   = useState("meta");
  const [format, setFormat]       = useState("30s");
  const [tone, setTone]           = useState("direct");
  const [result, setResult]       = useState("");
  const [loading, setLoading]     = useState(false);

  const generate = async () => {
    if (!product.trim() || !audience.trim()) { toast.error("Remplis au moins produit + audience"); return; }
    setLoading(true); setResult("");
    try {
      const prompt = `Tu es un scripteur d'ads senior spécialisé en direct response. Écris 3 variantes de script publicitaire (${format}) pour ${platform === "meta" ? "Meta Ads (Facebook/Instagram)" : platform === "tiktok" ? "TikTok Ads" : "YouTube Ads"}.

Produit / service : ${product}
Audience cible : ${audience}
Offre / call-to-action : ${offer || "Prendre RDV / réserver un appel"}
Ton souhaité : ${tone}

Pour CHAQUE variante, structure :
1. **Hook (3 premières secondes)** — pattern-interrupt, visuel + audio
2. **Problème / promesse** — reformule leur douleur en 1-2 phrases
3. **Solution / preuve** — pourquoi ton offre marche (chiffre, avant/après, témoignage bref)
4. **CTA** — action précise, urgence si pertinent
5. **B-roll suggéré** — 3-4 plans visuels à tourner

Termine avec **1 conseil de test A/B** : quelle variable tester en priorité pour cette audience.`;
      const text = await askClaudeText(prompt, { max_tokens: 2500 });
      setResult(text);
    } catch (e: any) { toast.error(e?.message ?? "Erreur"); }
    finally { setLoading(false); }
  };

  return (
    <div className="p-8 space-y-6 max-w-6xl mx-auto">
      {header}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-border/40 bg-card p-6 space-y-4">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Brief</p>
          <Field label="Produit / service *"     value={product}  onChange={setProduct}  placeholder="Ex: Coaching immobilier pour investisseurs débutants" />
          <Field label="Audience cible *"         value={audience} onChange={setAudience} placeholder="Ex: Femmes 30-45, salariées, veulent générer un revenu passif" />
          <Field label="Offre / CTA"              value={offer}    onChange={setOffer}    placeholder="Ex: Appel gratuit 30 min pour bâtir ton plan sur mesure" />
          <div className="grid grid-cols-3 gap-2">
            <Choice label="Plateforme" value={platform} onChange={setPlatform} options={[
              { id: "meta", label: "Meta" }, { id: "tiktok", label: "TikTok" }, { id: "youtube", label: "YouTube" },
            ]} />
            <Choice label="Format" value={format} onChange={setFormat} options={[
              { id: "15s", label: "15s" }, { id: "30s", label: "30s" }, { id: "60s", label: "60s" },
            ]} />
            <Choice label="Ton" value={tone} onChange={setTone} options={[
              { id: "direct", label: "Direct" }, { id: "storytelling", label: "Story" }, { id: "provocateur", label: "Provoc." },
            ]} />
          </div>
          <Button onClick={generate} disabled={loading} className="w-full gap-2 shadow-glow">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Génère…</> : <><Sparkles className="w-4 h-4" /> Générer 3 variantes</>}
          </Button>
        </div>
        <ResultPanel text={result} loading={loading} />
      </div>
    </div>
  );
}

// ─── Video Script (organique) workspace ──────────────────────────────────────

function VideoScriptWorkspace({ header }: { header: React.ReactNode }) {
  const [topic, setTopic]     = useState("");
  const [insight, setInsight] = useState("");
  const [audience, setAudience] = useState("");
  const [format, setFormat]   = useState("reel");
  const [duration, setDuration] = useState("60");
  const [result, setResult]   = useState("");
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (!topic.trim()) { toast.error("Remplis au moins le sujet"); return; }
    setLoading(true); setResult("");
    try {
      const prompt = `Tu es un scripteur de contenu court-format qui a scoré des millions de vues. Écris un script pour ${format === "reel" ? "Instagram Reel" : format === "tiktok" ? "TikTok" : "YouTube Short"} de ${duration} secondes.

Sujet : ${topic}
Insight/prise de position : ${insight || "à extraire du sujet — trouve l'angle contrarien ou surprenant"}
Audience : ${audience || "grand public"}

Livre :
1. **HOOK (3s)** — 3 versions différentes du hook (pattern-interrupt, question, statistique choc)
2. **STORY / CORPS** — beat par beat avec le timing (0-3s, 3-15s, etc.). Précise ce qui se DIT et ce qui se VOIT (B-roll).
3. **CTA** — l'action précise (follow, save, commenter, DM)
4. **Caption** — texte à mettre sous la vidéo avec les 3 premiers hashtags à tester
5. **Titre / cover thumbnail** — 3 suggestions

Format serré, actionnable, adapté au ${format}.`;
      const text = await askClaudeText(prompt, { max_tokens: 2000 });
      setResult(text);
    } catch (e: any) { toast.error(e?.message ?? "Erreur"); }
    finally { setLoading(false); }
  };

  return (
    <div className="p-8 space-y-6 max-w-6xl mx-auto">
      {header}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-border/40 bg-card p-6 space-y-4">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Brief</p>
          <Field label="Sujet de la vidéo *"     value={topic}    onChange={setTopic}    placeholder="Ex: Pourquoi les gens paient trop cher leur hypothèque" />
          <Field label="Insight / angle unique"   value={insight}  onChange={setInsight}  placeholder="Ex: 80% des courtiers vendent le taux, pas le vrai coût total" />
          <Field label="Audience"                 value={audience} onChange={setAudience} placeholder="Ex: Propriétaires 35-55 qui renouvellent leur hypothèque" />
          <div className="grid grid-cols-2 gap-2">
            <Choice label="Format" value={format} onChange={setFormat} options={[
              { id: "reel", label: "Reel" }, { id: "tiktok", label: "TikTok" }, { id: "shorts", label: "Shorts" },
            ]} />
            <Choice label="Durée" value={duration} onChange={setDuration} options={[
              { id: "30", label: "30s" }, { id: "60", label: "60s" }, { id: "90", label: "90s" },
            ]} />
          </div>
          <Button onClick={generate} disabled={loading} className="w-full gap-2 shadow-glow">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Génère…</> : <><Sparkles className="w-4 h-4" /> Générer le script</>}
          </Button>
        </div>
        <ResultPanel text={result} loading={loading} />
      </div>
    </div>
  );
}

// ─── AI Agent designer workspace ─────────────────────────────────────────────

function AiAgentWorkspace({ header }: { header: React.ReactNode }) {
  const [goal, setGoal]         = useState("");
  const [inputs, setInputs]     = useState("");
  const [outputs, setOutputs]   = useState("");
  const [constraints, setConstraints] = useState("");
  const [result, setResult]     = useState("");
  const [loading, setLoading]   = useState(false);

  const generate = async () => {
    if (!goal.trim()) { toast.error("Décris ce que l'agent doit faire"); return; }
    setLoading(true); setResult("");
    try {
      const prompt = `Tu es un architecte d'agents IA (Claude, GPT, LangChain, n8n, Zapier AI). Conçois un agent qui accomplit :

Objectif : ${goal}
Inputs disponibles : ${inputs || "à définir"}
Outputs attendus : ${outputs || "à définir"}
Contraintes : ${constraints || "aucune"}

Livre :

1. **Description en 2 phrases** — ce que fait l'agent, pour qui, avec quel bénéfice.

2. **Architecture** — schéma étape par étape :
   - Trigger (comment il démarre)
   - Étapes intermédiaires (avec outil utilisé à chaque étape)
   - Sortie finale (format, destination)

3. **System prompt complet** — le prompt exact à donner au LLM, avec ton, format de réponse, règles, exemples.

4. **Tools / intégrations nécessaires** — liste avec pourquoi chacun.

5. **Garde-fous** — 3-5 checks pour éviter les dérapages (validation, quota, hallucinations).

6. **Métriques de succès** — comment on saura que l'agent marche (taux d'automatisation, temps sauvé, précision).

7. **MVP en 1 semaine** — la version la plus simple à builder d'abord, avec la stack recommandée (Zapier / Make / n8n / code custom).`;
      const text = await askClaudeText(prompt, { max_tokens: 3000 });
      setResult(text);
    } catch (e: any) { toast.error(e?.message ?? "Erreur"); }
    finally { setLoading(false); }
  };

  return (
    <div className="p-8 space-y-6 max-w-6xl mx-auto">
      {header}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-border/40 bg-card p-6 space-y-4">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Brief</p>
          <TextField label="Objectif de l'agent *" value={goal}
            onChange={setGoal} rows={2}
            placeholder="Ex: Qualifier automatiquement les leads entrants avant qu'ils passent au sales." />
          <TextField label="Inputs (données/déclencheurs)" value={inputs}
            onChange={setInputs} rows={2}
            placeholder="Ex: Nouveau lead depuis formulaire web, email + téléphone + réponses à 5 questions." />
          <TextField label="Outputs (livrables)" value={outputs}
            onChange={setOutputs} rows={2}
            placeholder="Ex: Score de 1-10 + tag dans CRM + Slack au sales si score >= 7." />
          <TextField label="Contraintes" value={constraints}
            onChange={setConstraints} rows={2}
            placeholder="Ex: Doit tourner en < 5s, coût max 0,05$/lead, français uniquement." />
          <Button onClick={generate} disabled={loading} className="w-full gap-2 shadow-glow">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Design en cours…</> : <><Bot className="w-4 h-4" /> Designer l'agent</>}
          </Button>
        </div>
        <ResultPanel text={result} loading={loading} />
      </div>
    </div>
  );
}

// ─── Sales call analyzer workspace ───────────────────────────────────────────

function SalesCallWorkspace({ header }: { header: React.ReactNode }) {
  const [transcript, setTranscript] = useState("");
  const [context, setContext]       = useState("");
  const [outcome, setOutcome]       = useState("undecided");
  const [result, setResult]         = useState("");
  const [loading, setLoading]       = useState(false);

  const generate = async () => {
    if (transcript.trim().length < 100) { toast.error("Colle un transcript plus complet (min 100 chars)"); return; }
    setLoading(true); setResult("");
    try {
      const prompt = `Tu es un coach de vente senior. Analyse ce transcript d'appel et livre un debrief structuré.

CONTEXTE : ${context || "Non précisé"}
ISSUE DE L'APPEL : ${outcome === "closed" ? "Client a signé" : outcome === "lost" ? "Client a dit non" : outcome === "followup" ? "En suivi (pas encore décidé)" : "Non précisée"}

TRANSCRIPT :
"""
${transcript}
"""

Livre :

1. **Résumé 30 secondes** — profil du prospect, sa vraie douleur, son budget, son timing.

2. **Ce que le vendeur a bien fait** — 3 moments précis avec citation. Sois spécifique.

3. **Ce qui a raté ou pu être mieux** — 3 moments précis avec citation + ce qu'il aurait dû dire à la place. Sois direct, pas complaisant.

4. **Objections soulevées** — liste + réponse actuelle du vendeur + réponse recommandée pour la prochaine fois.

5. **Signaux d'achat vs signaux de fuite** — 3 de chaque, avec le timestamp/moment.

6. **Suivi recommandé** — action précise dans les 24-48h, texte du courriel/DM à envoyer (prêt à copier).

7. **Score global : X / 10** — avec 1 phrase de justification.

Ton : coach franc, pas de bullshit. Français Québec.`;
      const text = await askClaudeText(prompt, { max_tokens: 3000 });
      setResult(text);
    } catch (e: any) { toast.error(e?.message ?? "Erreur"); }
    finally { setLoading(false); }
  };

  return (
    <div className="p-8 space-y-6 max-w-6xl mx-auto">
      {header}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-border/40 bg-card p-6 space-y-4">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Brief</p>
          <Field label="Contexte de l'appel"
            value={context} onChange={setContext}
            placeholder="Ex: Discovery call de 30 min avec courtier immo qui vient d'un ad Meta." />
          <Choice label="Issue de l'appel"
            value={outcome} onChange={setOutcome} options={[
              { id: "closed",    label: "Signé" },
              { id: "followup",  label: "Suivi" },
              { id: "lost",      label: "Perdu" },
              { id: "undecided", label: "Autre" },
            ]} />
          <TextField label="Transcript de l'appel *" value={transcript}
            onChange={setTranscript} rows={12}
            placeholder="Colle le transcript ici (Otter, Fireflies, transcription manuelle...)." />
          <Button onClick={generate} disabled={loading} className="w-full gap-2 shadow-glow">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyse…</> : <><PhoneCall className="w-4 h-4" /> Analyser l'appel</>}
          </Button>
        </div>
        <ResultPanel text={result} loading={loading} />
      </div>
    </div>
  );
}

// ─── Business analysis workspace (uses ai-tools with data access) ────────────

function BusinessAnalysisWorkspace({ header }: { header: React.ReactNode }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [streaming, setStreaming] = useState("");

  const suggestions = [
    "📊 Analyse mes revenus des 6 derniers mois — tendance et projection",
    "💸 Où sont mes plus grosses dépenses ? Suggère où couper.",
    "🎯 Qui sont mes 5 meilleurs clients par MRR ?",
    "⚠️ Quels clients risquent le plus de churner ?",
    "📈 Compare mon closing rate ce mois vs le mois dernier",
    "🔥 Qu'est-ce que je devrais faire cette semaine en priorité ?",
  ];

  const send = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: msg }]);
    setLoading(true); setStreaming("");
    try {
      const reply = await sendMessage(messages, msg, (partial) => setStreaming(partial));
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      setStreaming("");
    } catch (e: any) {
      setMessages((prev) => [...prev, { role: "assistant", content: `Erreur : ${e?.message ?? "unknown"}` }]);
      setStreaming("");
    } finally { setLoading(false); }
  };

  return (
    <div className="p-8 space-y-6 max-w-4xl mx-auto">
      {header}

      <div className="rounded-2xl border border-primary/30 bg-primary/[0.03] p-6 space-y-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" />
          <p className="text-xs font-bold uppercase tracking-wider text-primary">Echo a accès à tes données</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Revenus, dépenses, clients, KPI, intégrations. Pose une question — je vais chercher les vraies valeurs et te répondre avec.
        </p>
      </div>

      {messages.length === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {suggestions.map((s) => (
            <button key={s} onClick={() => send(s)}
              className="text-left text-xs px-4 py-3 rounded-lg border border-border/40 hover:border-primary/50 hover:bg-primary/[0.03] text-foreground transition-colors">
              {s}
            </button>
          ))}
        </div>
      )}

      {messages.length > 0 && (
        <div className="rounded-2xl border border-border/40 bg-card p-6 space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] text-sm px-4 py-3 rounded-xl leading-relaxed whitespace-pre-wrap ${
                m.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-none"
                  : "bg-muted/40 text-foreground rounded-bl-none border border-border/40"
              }`}>
                {m.content}
              </div>
            </div>
          ))}
          {streaming && (
            <div className="flex justify-start">
              <div className="max-w-[85%] text-sm px-4 py-3 rounded-xl rounded-bl-none bg-muted/40 text-foreground leading-relaxed whitespace-pre-wrap border border-border/40">
                {streaming}
              </div>
            </div>
          )}
          {loading && !streaming && (
            <div className="flex justify-start">
              <div className="px-4 py-3 rounded-xl rounded-bl-none bg-muted/40 border border-border/40">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
        </div>
      )}

      <div className="sticky bottom-4 flex gap-2 rounded-2xl border border-border/40 bg-card/95 backdrop-blur p-3 shadow-lg">
        <Input value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
          placeholder="Pose ta question business…" className="text-sm" disabled={loading} />
        <Button onClick={() => send()} disabled={loading || !input.trim()} className="gap-1.5">
          <Send className="w-4 h-4" /> Envoyer
        </Button>
      </div>
    </div>
  );
}

// ─── Free chat (same underlying tool-enabled AI, blank slate) ────────────────

function FreeChatWorkspace({ header }: { header: React.ReactNode }) {
  return <BusinessAnalysisWorkspace header={header} />;
}

// ─── Reusable form primitives ────────────────────────────────────────────────

function Field({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="text-sm" />
    </div>
  );
}

function TextField({ label, value, onChange, placeholder, rows = 3 }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={rows} className="text-sm" />
    </div>
  );
}

function Choice({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void;
  options: { id: string; label: string }[];
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="flex flex-wrap gap-1">
        {options.map((o) => (
          <button key={o.id} type="button" onClick={() => onChange(o.id)}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition ${
              value === o.id ? "bg-primary text-primary-foreground border-primary" : "bg-muted/20 text-muted-foreground border-border hover:border-primary/50"
            }`}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
