import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ExternalLink, Copy, ChevronRight, ChevronLeft, Upload, Loader2, Trophy, AlertTriangle, Lightbulb, Star, FileText, Mic, Compass, Target, Package, Crown, Zap, Clock, ChevronDown, ChevronUp, Sparkles, Filter } from "lucide-react";
import Anthropic from "@anthropic-ai/sdk";

const ADVISORS = [
  {
    id: "scaling",
    emoji: "🚀",
    title: "Scaling Advisor",
    description: "Stratégies de croissance et scaling pour agences",
    single: true,
    linkKey: "scaling",
  },
  {
    id: "ads",
    emoji: "🎯",
    title: "Ads Strategy",
    description: "Optimisez vos publicités payantes",
    single: false,
    options: [
      { label: "Scripting", key: "adsScripting" },
      { label: "Ads Statique", key: "adsStatique" },
    ],
  },
  {
    id: "content",
    emoji: "✍️",
    title: "Content Coach",
    description: "Stratégie de contenu et personal branding",
    single: false,
    options: [
      { label: "Personal Brand Strategist", key: "contentBrand" },
      { label: "Content Ideas Builder", key: "contentIdeas" },
    ],
  },
  {
    id: "helper",
    emoji: "🤝",
    title: "Little Helper",
    description: "Assistant général et feedback",
    single: true,
    linkKey: "helper",
  },
  {
    id: "sales",
    emoji: "🏆",
    title: "Sales Mastery",
    description: "Analyse tes appels de vente et améliore ton closing",
    single: false,
    custom: true,
  },
  {
    id: "category",
    emoji: "👑",
    title: "Category Architect",
    description: "Crée ton offre, trouve ta niche et deviens le #1 dans ta catégorie",
    single: false,
    custom: true,
  },
  {
    id: "automation",
    emoji: "⚡",
    title: "Automation Advisor",
    description: "Les meilleures automatisations pour ton agence — Zapier, GHL, Make, Claude",
    single: false,
    custom: true,
  },
];

function getLinks(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem("gptLinks") || "{}"); }
  catch { return {}; }
}

function isInIframe() {
  try { return window.self !== window.top; }
  catch { return true; }
}

// ─── Sales Mastery View ───────────────────────────────────────────────────────

interface AnalysisResult {
  score: number;
  scoreLabel: string;
  strengths: string[];
  improvements: string[];
  objections: string[];
  closing: string;
  topTip: string;
}

const SCRIPTS = [
  {
    id: "warm",
    emoji: "🔥",
    label: "Warm Call",
    description: "Premier contact avec un prospect qui te connaît déjà",
    prompt: "Écris un script de warm call (appel à chaud) pour une agence de marketing vidéo qui contacte un prospect qui a déjà interagi avec son contenu ou rempli un formulaire. Le script doit: ouvrir naturellement, qualifier le prospect, pitcher la valeur en 30 secondes, et obtenir un RDV. Inclus les réponses aux objections courantes. Format: sections claires avec [OUVERTURE], [QUALIFICATION], [PITCH], [OBJECTIONS], [CLOSING RDV].",
  },
  {
    id: "closing",
    emoji: "🤝",
    label: "Closing Call",
    description: "Appel final pour convertir le prospect en client",
    prompt: "Écris un script de closing call pour une agence de marketing vidéo. Le prospect a déjà eu un call de découverte et reçu une proposition. Le script doit: récapituler la valeur, gérer les dernières hésitations sur le prix, utiliser des techniques de closing efficaces (urgence, réciprocité, social proof), et obtenir la signature. Format: [RÉCAP VALEUR], [GESTION PRIX], [TECHNIQUES DE CLOSING], [OBJECTIONS FINALES], [SIGNATURE].",
  },
  {
    id: "discovery",
    emoji: "🔍",
    label: "Discovery Call",
    description: "Premier appel pour comprendre les besoins du prospect",
    prompt: "Écris un script de discovery call pour une agence de marketing vidéo. L'objectif est de comprendre les besoins, qualifier le budget et créer une relation de confiance. Inclus les meilleures questions de découverte, comment identifier les pain points, et comment positionner l'agence comme solution. Format: [INTRO], [QUESTIONS DE DÉCOUVERTE], [IDENTIFICATION PAIN POINTS], [PRÉSENTATION AGENCE], [PROCHAINES ÉTAPES].",
  },
  {
    id: "followup",
    emoji: "📞",
    label: "Follow-up Call",
    description: "Relance après une proposition ou un silence",
    prompt: "Écris un script de follow-up call pour une agence de marketing vidéo qui relance un prospect après l'envoi d'une proposition sans réponse. Le script doit être court, direct, créer de l'urgence sans être agressif, et rouvrir la conversation. Inclus aussi un script de follow-up par message texte/WhatsApp. Format: [CALL SCRIPT], [MESSAGE TEXTE], [EMAIL COURT].",
  },
  {
    id: "objections",
    emoji: "🛡️",
    label: "Gestion Objections",
    description: "Réponses aux objections les plus fréquentes",
    prompt: "Écris un guide complet de gestion des objections pour une agence de marketing vidéo. Couvre ces objections: 1) C'est trop cher 2) J'ai besoin d'y réfléchir 3) Je vais en parler à mon associé 4) On a déjà quelqu'un pour ça 5) Je ne vois pas le ROI 6) On n'a pas le budget maintenant. Pour chaque objection: la réponse idéale + une question de recadrage. Format clair avec l'objection en titre.",
  },
];

function ScriptsSection() {
  const [selected, setSelected] = useState<string | null>(null);
  const [script, setScript] = useState("");
  const [loading, setLoading] = useState(false);
  const [context, setContext] = useState("");

  const generate = async (scriptDef: typeof SCRIPTS[0]) => {
    const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
    if (!apiKey) { toast.error("Clé Anthropic manquante dans .env"); return; }
    setSelected(scriptDef.id);
    setLoading(true);
    setScript("");
    try {
      const anthropic = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
      const contextNote = context.trim() ? `\n\nContexte de l'agence: ${context}` : "";
      const response = await anthropic.messages.create({
        model: "claude-opus-4-6",
        max_tokens: 1500,
        messages: [{ role: "user", content: scriptDef.prompt + contextNote }],
      });
      const text = response.content[0].type === "text" ? response.content[0].text : "";
      setScript(text);
    } catch {
      toast.error("Erreur lors de la génération");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Optional context */}
      <Card className="border-border/40">
        <CardContent className="pt-3 pb-3">
          <p className="text-xs text-muted-foreground mb-1.5">Contexte de ton agence (optionnel — personnalise les scripts)</p>
          <Input
            placeholder="Ex: agence vidéo pour restaurants, ticket moyen 3000$/mois..."
            value={context}
            onChange={(e) => setContext(e.target.value)}
            className="text-xs h-8"
          />
        </CardContent>
      </Card>

      {/* Script cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {SCRIPTS.map((s) => (
          <Card
            key={s.id}
            className="cursor-pointer hover:border-primary/40 hover:shadow-glow transition-all group"
            onClick={() => generate(s)}
          >
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-lg mb-1">{s.emoji}</p>
                  <p className="font-semibold text-sm text-foreground">{s.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>
                </div>
                {loading && selected === s.id
                  ? <Loader2 className="w-4 h-4 animate-spin text-primary flex-shrink-0" />
                  : <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                }
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Generated script */}
      {script && (
        <Card className="border-primary/20">
          <CardContent className="pt-4 pb-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-primary">
                {SCRIPTS.find((s) => s.id === selected)?.emoji} {SCRIPTS.find((s) => s.id === selected)?.label}
              </p>
              <Button
                size="sm" variant="outline" className="gap-1.5 text-xs h-7"
                onClick={() => { navigator.clipboard.writeText(script); toast.success("Script copié!"); }}
              >
                <Copy className="w-3 h-3" /> Copier
              </Button>
            </div>
            <div className="text-xs text-foreground whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto bg-muted/20 rounded-lg p-3 border border-border/30">
              {script}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SalesMasteryView({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<"analyze" | "scripts">("analyze");
  const [transcript, setTranscript] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setTranscript(ev.target?.result as string);
    reader.readAsText(file);
  };

  const analyze = async () => {
    if (!transcript.trim()) { toast.error("Colle ou uploade un transcript d'abord"); return; }
    if (transcript.length < 100) { toast.error("Le transcript est trop court"); return; }

    const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
    if (!apiKey) { toast.error("Clé Anthropic manquante dans .env"); return; }

    setLoading(true);
    setResult(null);

    try {
      const anthropic = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });

      const response = await anthropic.messages.create({
        model: "claude-opus-4-6",
        max_tokens: 1500,
        messages: [{
          role: "user",
          content: `Tu es un expert en vente et closing pour agences de marketing vidéo. Analyse ce transcript d'appel de vente et réponds UNIQUEMENT en JSON valide avec cette structure exacte:

{
  "score": <nombre entre 0 et 100>,
  "scoreLabel": <"Excellent" | "Bon" | "Moyen" | "À améliorer">,
  "strengths": [<3 points forts max, phrases courtes>],
  "improvements": [<3 points à améliorer max, phrases courtes>],
  "objections": [<2-3 objections soulevées et comment elles ont été gérées>],
  "closing": <1 phrase sur la technique de closing utilisée>,
  "topTip": <1 conseil actionnable le plus important pour le prochain appel>
}

TRANSCRIPT:
${transcript.slice(0, 8000)}`,
        }],
      });

      const text = response.content[0].type === "text" ? response.content[0].text : "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Réponse invalide");
      const parsed = JSON.parse(jsonMatch[0]) as AnalysisResult;
      setResult(parsed);
    } catch {
      toast.error("Erreur lors de l'analyse. Réessaie.");
    } finally {
      setLoading(false);
    }
  };

  const scoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-400";
    if (score >= 60) return "text-primary";
    if (score >= 40) return "text-amber-400";
    return "text-destructive";
  };

  return (
    <div className="p-6 space-y-5 max-w-2xl">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ChevronLeft className="w-4 h-4" /> Retour
      </button>
      <div className="flex items-center gap-3">
        <span className="text-2xl">🏆</span>
        <div>
          <h2 className="text-lg font-semibold">Sales Mastery</h2>
          <p className="text-xs text-muted-foreground">Analyse tes appels et accède à tes scripts</p>
        </div>
      </div>

      {/* Tab toggle */}
      <div className="flex gap-1 bg-muted/50 rounded-lg p-1 w-fit">
        <button
          onClick={() => setTab("analyze")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${tab === "analyze" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
        >
          <Mic className="w-3.5 h-3.5" /> Analyser un appel
        </button>
        <button
          onClick={() => setTab("scripts")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${tab === "scripts" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
        >
          <FileText className="w-3.5 h-3.5" /> Scripts de vente
        </button>
      </div>

      {/* Scripts tab */}
      {tab === "scripts" && <ScriptsSection />}

      {/* Analyze tab */}
      {tab === "analyze" && <div className="space-y-5">
      <Card>
        <CardContent className="pt-4 pb-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">Transcript de l'appel</p>
            <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => fileRef.current?.click()}>
              <Upload className="w-3.5 h-3.5" /> Importer .txt
            </Button>
            <input ref={fileRef} type="file" accept=".txt" className="hidden" onChange={handleFile} />
          </div>
          <Textarea
            placeholder="Colle le transcript ici... (ex: Vendeur: Bonjour, comment ça va? Client: Bien merci...)"
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            className="resize-none h-40 text-xs"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{transcript.length} caractères</span>
            <Button onClick={analyze} disabled={loading || !transcript.trim()} className="gap-2 shadow-glow">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyse en cours...</> : "🔍 Analyser l'appel"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Score */}
          <Card className="border-primary/20">
            <CardContent className="pt-5 pb-5 flex items-center gap-6">
              <div className="text-center">
                <p className={`text-5xl font-bold ${scoreColor(result.score)}`}>{result.score}</p>
                <p className="text-xs text-muted-foreground mt-1">/100</p>
              </div>
              <div>
                <p className={`text-xl font-semibold ${scoreColor(result.score)}`}>{result.scoreLabel}</p>
                <p className="text-sm text-muted-foreground mt-1">{result.closing}</p>
              </div>
            </CardContent>
          </Card>

          {/* Top tip */}
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="pt-4 pb-4 flex gap-3">
              <Lightbulb className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-primary mb-1">Conseil #1 pour ton prochain appel</p>
                <p className="text-sm text-foreground">{result.topTip}</p>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Strengths */}
            <Card>
              <CardContent className="pt-4 pb-4 space-y-2">
                <div className="flex items-center gap-2 mb-3">
                  <Trophy className="w-3.5 h-3.5 text-emerald-400" />
                  <p className="text-xs font-semibold text-emerald-400">Points forts</p>
                </div>
                {result.strengths.map((s, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <Star className="w-3 h-3 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-foreground">{s}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Improvements */}
            <Card>
              <CardContent className="pt-4 pb-4 space-y-2">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  <p className="text-xs font-semibold text-amber-400">À améliorer</p>
                </div>
                {result.improvements.map((s, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-amber-400 text-xs flex-shrink-0 mt-0.5">→</span>
                    <p className="text-xs text-foreground">{s}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Objections */}
          {result.objections.length > 0 && (
            <Card>
              <CardContent className="pt-4 pb-4 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground mb-3">Objections & gestion</p>
                {result.objections.map((o, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-destructive text-xs flex-shrink-0 mt-0.5">•</span>
                    <p className="text-xs text-foreground">{o}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Re-analyze */}
          <Button variant="outline" className="w-full" onClick={() => { setResult(null); setTranscript(""); }}>
            Analyser un autre appel
          </Button>
        </div>
      )}
      </div>}
    </div>
  );
}

// ─── Category Architect View ─────────────────────────────────────────────────

const CATEGORY_TABS = [
  { id: "niche",    label: "Trouver ta Niche",     Icon: Compass },
  { id: "offer",   label: "Construire ton Offre",  Icon: Package },
  { id: "category", label: "Créer ta Catégorie",   Icon: Crown },
];

const NICHE_QUESTIONS = [
  { id: "service",   label: "Quel service offres-tu?",                  placeholder: "Ex: vidéos marketing pour des clients locaux..." },
  { id: "who",       label: "À qui tu parles en ce moment?",            placeholder: "Ex: restaurants, coaches, e-commerce..." },
  { id: "result",    label: "Quel résultat concret tu livres?",         placeholder: "Ex: +30% de réservations en 90 jours..." },
  { id: "problem",   label: "Quel est leur plus grand problème?",       placeholder: "Ex: ils ont du mal à attirer de nouveaux clients..." },
  { id: "why",       label: "Pourquoi toi et pas un autre?",            placeholder: "Ex: je suis moi-même dans cette industrie..." },
];

function CategoryArchitectView({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState("niche");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");

  const callClaude = async (prompt: string) => {
    const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
    if (!apiKey) { toast.error("Clé Anthropic manquante dans .env"); return; }
    setLoading(true);
    setResult("");
    try {
      const anthropic = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
      const response = await anthropic.messages.create({
        model: "claude-opus-4-6",
        max_tokens: 2000,
        messages: [{ role: "user", content: prompt }],
      });
      const text = response.content[0].type === "text" ? response.content[0].text : "";
      setResult(text);
    } catch {
      toast.error("Erreur. Réessaie.");
    } finally {
      setLoading(false);
    }
  };

  const context = NICHE_QUESTIONS.map((q) => `${q.label}: ${answers[q.id] || "Non renseigné"}`).join("\n");

  const handleNiche = () => callClaude(`Tu es un expert en positionnement et création de marché pour agences. Basé sur ces informations:

${context}

Génère:
1. **3 sous-niches spécifiques** où cette agence peut devenir #1 (avec score de potentiel /10)
2. **La sous-niche recommandée** avec justification
3. **Le profil client idéal** ultra-précis (ICP)
4. **Les signaux d'achat** à chercher
5. **Pourquoi cette niche est sous-servie** et représente une opportunité

Sois ultra-concret et actionnable. Pas de généralités.`);

  const handleOffer = () => callClaude(`Tu es un expert en création d'offres irrésistibles pour agences. Basé sur ces informations:

${context}

Construis une offre complète:
1. **Nom de l'offre** (accrocheur, orienté résultat)
2. **Le Grand Promise** (résultat principal en 1 phrase)
3. **Ce qui est inclus** (livrables précis)
4. **Les bonifications** (ce qui rend l'offre irrésistible)
5. **La garantie** (pour éliminer le risque)
6. **Le prix suggéré** et justification
7. **Le pitch en 2 phrases** pour vendre cette offre

Rends l'offre si bonne que les prospects se sentent idiots de refuser.`);

  const handleCategory = () => callClaude(`Tu es un expert en création de catégories et positionnement (Category Design). Basé sur ces informations:

${context}

Aide à créer une nouvelle catégorie:
1. **Nom de la catégorie** (quelque chose qui n'existe pas encore)
2. **Le problème qu'elle résout** (que personne d'autre ne nomme)
3. **Le manifeste de la catégorie** (pourquoi l'ancien monde est cassé)
4. **Comment se positionner comme le "Category King"**
5. **Le langage propriétaire** à utiliser (termes que tu inventes et possèdes)
6. **La stratégie de contenu** pour éduquer le marché sur cette catégorie
7. **Exemples de marques** qui ont réussi cela dans d'autres industries

Pense comme un Category Designer, pas comme un marketeur.`);

  const handleGenerate = () => {
    if (tab === "niche") handleNiche();
    else if (tab === "offer") handleOffer();
    else handleCategory();
  };

  const filledCount = NICHE_QUESTIONS.filter((q) => answers[q.id]?.trim()).length;

  return (
    <div className="p-6 space-y-5 max-w-2xl">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ChevronLeft className="w-4 h-4" /> Retour
      </button>
      <div className="flex items-center gap-3">
        <span className="text-2xl">👑</span>
        <div>
          <h2 className="text-lg font-semibold">Category Architect & Positioning</h2>
          <p className="text-xs text-muted-foreground">Crée ton offre, ta niche et deviens le #1 dans ta catégorie</p>
        </div>
      </div>

      {/* Tab toggle */}
      <div className="flex gap-1 bg-muted/50 rounded-lg p-1 w-fit flex-wrap">
        {CATEGORY_TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => { setTab(id); setResult(""); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${tab === id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Icon className="w-3.5 h-3.5" /> {label}
          </button>
        ))}
      </div>

      {/* Context form — always visible */}
      <Card>
        <CardContent className="pt-4 pb-4 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold text-muted-foreground">Contexte de ton agence</p>
            <span className="text-xs text-muted-foreground">{filledCount}/{NICHE_QUESTIONS.length} remplis</span>
          </div>
          {NICHE_QUESTIONS.map((q) => (
            <div key={q.id} className="space-y-1">
              <label className="text-xs text-foreground font-medium">{q.label}</label>
              <Input
                placeholder={q.placeholder}
                value={answers[q.id] ?? ""}
                onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                className="text-xs h-8"
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Generate button */}
      <Button
        onClick={handleGenerate}
        disabled={loading || filledCount < 2}
        className="w-full gap-2 shadow-glow"
      >
        {loading
          ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyse en cours...</>
          : tab === "niche" ? "🔍 Trouver mes meilleures niches"
          : tab === "offer" ? "📦 Construire mon offre irrésistible"
          : "👑 Créer ma catégorie"
        }
      </Button>
      {filledCount < 2 && <p className="text-xs text-muted-foreground text-center">Remplis au moins 2 champs pour commencer</p>}

      {/* Result */}
      {result && (
        <Card className="border-primary/20">
          <CardContent className="pt-4 pb-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-primary">
                {tab === "niche" ? "🔍 Analyse de niches" : tab === "offer" ? "📦 Ton offre" : "👑 Ta catégorie"}
              </p>
              <Button size="sm" variant="outline" className="gap-1.5 text-xs h-7"
                onClick={() => { navigator.clipboard.writeText(result); toast.success("Copié!"); }}>
                <Copy className="w-3 h-3" /> Copier
              </Button>
            </div>
            <div className="text-xs text-foreground whitespace-pre-wrap leading-relaxed max-h-[500px] overflow-y-auto bg-muted/20 rounded-lg p-3 border border-border/30">
              {result}
            </div>
            <Button variant="outline" size="sm" className="w-full" onClick={() => setResult("")}>
              Recommencer
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Automation Advisor View ─────────────────────────────────────────────────

type Difficulty = "Facile" | "Moyen" | "Avancé";

interface Automation {
  id: string;
  name: string;
  description: string;
  tools: string[];
  timeSaved: string;
  difficulty: Difficulty;
  category: string;
  steps: string[];
}

const AUTOMATIONS: Automation[] = [
  // Lead & Prospection
  {
    id: "lead-dm",
    name: "Auto-DM aux nouveaux followers",
    description: "Envoie automatiquement un message de bienvenue à chaque nouveau follower Instagram avec une offre ou un CTA.",
    tools: ["ManyChat", "Instagram"],
    timeSaved: "3h/sem",
    difficulty: "Facile",
    category: "Lead Generation",
    steps: [
      "Crée un compte ManyChat et connecte ton Instagram Business",
      "Va dans Automation → New Flow → Trigger: New Follower",
      "Rédige ton message de bienvenue (ex: 'Salut [Prénom]! Merci de me suivre...')",
      "Ajoute un bouton CTA vers ton lien de prise de RDV ou lead magnet",
      "Active le flow et teste avec un compte test",
    ],
  },
  {
    id: "form-crm",
    name: "Formulaire → CRM automatique",
    description: "Quand un prospect remplit ton formulaire (Typeform, Tally, etc.), il est automatiquement ajouté dans ton CRM avec toutes ses infos.",
    tools: ["Zapier", "Typeform", "GHL / Notion"],
    timeSaved: "2h/sem",
    difficulty: "Facile",
    category: "Lead Generation",
    steps: [
      "Crée un Zap: Trigger = 'New Entry in Typeform'",
      "Action = 'Create Contact in GoHighLevel' (ou ta DB Supabase via webhook)",
      "Mappe les champs: Prénom, Email, Téléphone, Message",
      "Ajoute une 2e action: envoie un email de confirmation au prospect",
      "Test le Zap avec une vraie soumission",
    ],
  },
  {
    id: "ig-comment-dm",
    name: "Commentaire Instagram → DM automatique",
    description: "Quand quelqu'un commente un mot-clé sur tes posts (ex: 'INFO'), il reçoit automatiquement un DM avec ton lien.",
    tools: ["ManyChat"],
    timeSaved: "4h/sem",
    difficulty: "Facile",
    category: "Lead Generation",
    steps: [
      "Dans ManyChat, crée un Flow avec Trigger: Comment on Post",
      "Définis le mot-clé déclencheur (ex: 'GUIDE', 'PRIX', 'INFO')",
      "Configure la réponse publique courte sous le commentaire",
      "Configure le DM avec le lien ou le contenu promis",
      "Publie un post en demandant de commenter ce mot-clé pour tester",
    ],
  },
  // Onboarding
  {
    id: "onboarding-sequence",
    name: "Séquence d'onboarding automatique",
    description: "Quand un client signe et paie, une séquence d'emails s'envoie automatiquement sur 7 jours (bienvenue, accès, kickoff, etc.).",
    tools: ["GHL", "Zapier", "Stripe"],
    timeSaved: "5h/sem",
    difficulty: "Moyen",
    category: "Onboarding Client",
    steps: [
      "Dans GHL, crée un Pipeline et une étape 'Client signé'",
      "Crée un Workflow déclenché quand un contact passe à cette étape",
      "Ajoute les emails: J+0 bienvenue, J+1 accès Drive, J+3 questionnaire, J+7 check-in",
      "Connecte Stripe via Zapier: paiement reçu → déplacer contact dans le pipeline",
      "Teste avec un contact fictif et vérifie les délais",
    ],
  },
  {
    id: "contract-sign",
    name: "Signature contrat → notification + tâches auto",
    description: "Dès qu'un contrat est signé sur DocuSign/PandaDoc, crée automatiquement les tâches de démarrage dans ton outil de gestion.",
    tools: ["Zapier", "PandaDoc", "Notion / Trello"],
    timeSaved: "1h/contrat",
    difficulty: "Moyen",
    category: "Onboarding Client",
    steps: [
      "Zap Trigger: Document Completed in PandaDoc",
      "Action 1: Créer une page client dans Notion avec template prédéfini",
      "Action 2: Créer les tâches standard (setup Drive, envoyer bienvenue, planifier kickoff)",
      "Action 3: Envoyer une notif Slack/WhatsApp à ton équipe",
      "Action 4: Envoyer l'email de bienvenue au client",
    ],
  },
  // Contenu & Livraison
  {
    id: "video-delivery",
    name: "Livraison vidéo automatique",
    description: "Quand tu déposes une vidéo finalisée dans un dossier Drive, le client reçoit automatiquement un email avec le lien.",
    tools: ["Zapier", "Google Drive", "Gmail"],
    timeSaved: "2h/sem",
    difficulty: "Facile",
    category: "Contenu & Livraison",
    steps: [
      "Zap Trigger: New File in Google Drive Folder (dossier 'Livraisons')",
      "Action: Envoyer un email Gmail au client avec le lien du fichier",
      "Personnalise le message: 'Ta vidéo [nom du fichier] est prête!'",
      "Optionnel: ajoute une action pour notifier sur Slack",
      "Organise ton Drive avec un sous-dossier par client pour filtrer",
    ],
  },
  {
    id: "content-repurpose",
    name: "Repurposing de contenu automatisé",
    description: "Quand tu publies une vidéo YouTube, un résumé et des extraits sont automatiquement générés et programmés sur tes autres réseaux.",
    tools: ["Make (Integromat)", "YouTube", "Claude API", "Buffer"],
    timeSaved: "6h/sem",
    difficulty: "Avancé",
    category: "Contenu & Livraison",
    steps: [
      "Dans Make, crée un scénario: Trigger = New Video on YouTube",
      "Récupère la transcription automatique via YouTube Data API",
      "Envoie la transcription à Claude API avec prompt: 'Génère 5 tweets, 1 post LinkedIn et 3 hooks pour ce contenu'",
      "Envoie les posts générés dans Buffer/Later pour programmation",
      "Optionnel: crée aussi une description de Reel pour IG",
    ],
  },
  // Reporting & Admin
  {
    id: "weekly-report",
    name: "Rapport client hebdomadaire automatique",
    description: "Chaque semaine, un rapport est généré et envoyé à tous tes clients actifs avec leurs métriques de la semaine.",
    tools: ["Make", "Google Sheets", "Claude API", "Gmail"],
    timeSaved: "5h/sem",
    difficulty: "Avancé",
    category: "Reporting & Admin",
    steps: [
      "Crée un Google Sheet avec les métriques par client (vues, engagement, leads)",
      "Dans Make, programme un scénario chaque vendredi à 17h",
      "Récupère les données du Sheet pour chaque client",
      "Envoie à Claude API: 'Rédige un résumé en 3 points de ces métriques'",
      "Envoie l'email formaté à chaque client avec leur résumé personnalisé",
    ],
  },
  {
    id: "invoice-auto",
    name: "Facturation automatique mensuelle",
    description: "Le 1er de chaque mois, une facture est automatiquement créée et envoyée à chaque client actif.",
    tools: ["Zapier", "Stripe", "QuickBooks / Wave"],
    timeSaved: "3h/mois",
    difficulty: "Moyen",
    category: "Reporting & Admin",
    steps: [
      "Dans Stripe, active la facturation récurrente pour tes abonnements",
      "Stripe envoie automatiquement les factures par email",
      "Zap optionnel: Invoice Paid → ajouter la transaction dans ton Sheet de suivi",
      "Zap optionnel: Invoice Failed → envoyer un rappel personnalisé au client",
      "Configure les relances automatiques (1j, 3j, 7j après échec)",
    ],
  },
  // Suivi & Rétention
  {
    id: "churn-detection",
    name: "Détection de churn et relance automatique",
    description: "Si un client n'a pas eu de livrables ou d'interaction depuis X jours, tu reçois une alerte et une séquence de re-engagement se déclenche.",
    tools: ["GHL", "Zapier"],
    timeSaved: "Prévient la perte de clients",
    difficulty: "Moyen",
    category: "Suivi & Rétention",
    steps: [
      "Dans GHL, crée un tag 'Inactif 30 jours'",
      "Workflow: si aucune activité depuis 30 jours → ajouter le tag",
      "Déclenche une séquence: email J+0 check-in, J+3 partage de valeur, J+7 appel de suivi",
      "Envoie-toi une notification pour appeler personnellement si pas de réponse",
      "Retire le tag automatiquement si le client répond",
    ],
  },
  {
    id: "review-request",
    name: "Demande d'avis automatique",
    description: "30 jours après le début d'un client, envoie automatiquement une demande d'avis Google ou témoignage vidéo.",
    tools: ["GHL", "Zapier"],
    timeSaved: "1h/sem",
    difficulty: "Facile",
    category: "Suivi & Rétention",
    steps: [
      "Dans GHL, crée un Workflow: Trigger = Contact créé depuis 30 jours",
      "Envoie un email/SMS avec le lien Google Review",
      "Optionnel: propose une petite récompense (ressource gratuite) pour l'avis",
      "Suivi J+7 si pas de réponse: rappel bienveillant",
      "Ajoute les avis reçus dans un Sheet de témoignages pour les réutiliser",
    ],
  },
];

const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  "Facile": "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  "Moyen": "text-amber-400 bg-amber-400/10 border-amber-400/20",
  "Avancé": "text-red-400 bg-red-400/10 border-red-400/20",
};

const CATEGORIES = ["Toutes", ...Array.from(new Set(AUTOMATIONS.map((a) => a.category)))];

function AutomationAdvisorView({ onBack }: { onBack: () => void }) {
  const [filter, setFilter] = useState("Toutes");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiResult, setAiResult] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const filtered = filter === "Toutes" ? AUTOMATIONS : AUTOMATIONS.filter((a) => a.category === filter);

  const askAI = async () => {
    if (!aiPrompt.trim()) return;
    const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
    if (!apiKey) { toast.error("Clé Anthropic manquante dans .env"); return; }
    setAiLoading(true);
    setAiResult("");
    try {
      const anthropic = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
      const response = await anthropic.messages.create({
        model: "claude-opus-4-6",
        max_tokens: 1500,
        messages: [{
          role: "user",
          content: `Tu es un expert en automatisation pour agences de marketing vidéo. Les outils disponibles incluent: Zapier, Make (Integromat), GoHighLevel (GHL), ManyChat, Claude API, Google Drive/Sheets, Stripe, et les APIs des réseaux sociaux.

Question ou situation de l'utilisateur: ${aiPrompt}

Réponds avec:
1. **Les 3 meilleures automatisations** recommandées pour cette situation
2. **Pour chaque automatisation**: outil suggéré + étapes concrètes (pas plus de 5 étapes)
3. **Par où commencer**: quelle automatisation mettre en place en premier et pourquoi

Sois très concret et actionnable. Donne des noms d'outils précis.`,
        }],
      });
      const text = response.content[0].type === "text" ? response.content[0].text : "";
      setAiResult(text);
    } catch {
      toast.error("Erreur. Réessaie.");
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-5 max-w-2xl">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ChevronLeft className="w-4 h-4" /> Retour
      </button>
      <div className="flex items-center gap-3">
        <span className="text-2xl">⚡</span>
        <div>
          <h2 className="text-lg font-semibold">Automation Advisor</h2>
          <p className="text-xs text-muted-foreground">Automatise ton agence — Zapier, GHL, Make, ManyChat, Claude</p>
        </div>
      </div>

      {/* AI section */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-4 pb-4 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <p className="text-sm font-semibold text-primary">Demande à Echo</p>
          </div>
          <p className="text-xs text-muted-foreground">Décris ta situation et reçois des recommandations d'automatisations personnalisées.</p>
          <textarea
            placeholder="Ex: Je passe 3h/semaine à envoyer des mises à jour à mes clients. Comment automatiser ça? J'utilise GHL et Gmail..."
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            className="w-full h-20 text-xs rounded-md border border-input bg-background px-3 py-2 resize-none text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <Button onClick={askAI} disabled={aiLoading || !aiPrompt.trim()} className="w-full gap-2 shadow-glow">
            {aiLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyse...</> : "⚡ Recommande mes automatisations"}
          </Button>
          {aiResult && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-primary">Recommandations</p>
                <Button size="sm" variant="outline" className="gap-1.5 text-xs h-7"
                  onClick={() => { navigator.clipboard.writeText(aiResult); toast.success("Copié!"); }}>
                  <Copy className="w-3 h-3" /> Copier
                </Button>
              </div>
              <div className="text-xs text-foreground whitespace-pre-wrap leading-relaxed bg-card rounded-lg p-3 border border-border/30 max-h-80 overflow-y-auto">
                {aiResult}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Category filter */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <Filter className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
              filter === cat
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border/50 text-muted-foreground hover:border-primary/40 hover:text-foreground"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Automation list */}
      <div className="space-y-2">
        {filtered.map((auto) => (
          <Card key={auto.id} className="border-border/50 hover:border-border/80 transition-colors">
            <CardContent className="pt-0 pb-0">
              <button
                className="w-full flex items-start gap-3 py-4 text-left"
                onClick={() => setExpanded(expanded === auto.id ? null : auto.id)}
              >
                <Zap className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-foreground">{auto.name}</p>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${DIFFICULTY_COLORS[auto.difficulty]}`}>
                        {auto.difficulty}
                      </span>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                        <Clock className="w-3 h-3" /> {auto.timeSaved}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 pr-4">{auto.description}</p>
                  <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                    {auto.tools.map((t) => (
                      <span key={t} className="text-[10px] bg-muted/60 text-muted-foreground px-1.5 py-0.5 rounded">{t}</span>
                    ))}
                  </div>
                </div>
                {expanded === auto.id
                  ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                  : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                }
              </button>

              {expanded === auto.id && (
                <div className="px-7 pb-4 space-y-3">
                  <div className="h-px bg-border/40" />
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Comment faire</p>
                  <div className="space-y-2">
                    {auto.steps.map((step, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <p className="text-xs text-foreground leading-relaxed">{step}</p>
                      </div>
                    ))}
                  </div>
                  <Button
                    size="sm" variant="outline" className="gap-1.5 text-xs h-7"
                    onClick={() => {
                      const text = `${auto.name}\n\n${auto.steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}`;
                      navigator.clipboard.writeText(text);
                      toast.success("Étapes copiées!");
                    }}
                  >
                    <Copy className="w-3 h-3" /> Copier les étapes
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Main AdvisorsTab ─────────────────────────────────────────────────────────

export function AdvisorsTab() {
  const [subView, setSubView] = useState<string | null>(null);
  const [copyDialog, setCopyDialog] = useState<{ url: string; label: string } | null>(null);

  const openAdvisor = (url: string, label: string) => {
    if (!url) { toast.error("Aucun lien GPT configuré. Allez dans Settings."); return; }
    if (isInIframe()) {
      setCopyDialog({ url, label });
    } else {
      window.open(url, "_blank");
    }
  };

  if (copyDialog) {
    return (
      <div className="p-6 max-w-md">
        <Card>
          <CardContent className="pt-6 space-y-4">
            <p className="text-sm font-medium">Ouvrir {copyDialog.label}</p>
            <p className="text-xs text-muted-foreground break-all">{copyDialog.url}</p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 gap-2"
                onClick={() => { navigator.clipboard.writeText(copyDialog.url); toast.success("Lien copié"); }}>
                <Copy className="w-4 h-4" /> Copier le lien
              </Button>
              <Button className="flex-1 gap-2" onClick={() => window.open(copyDialog.url, "_blank")}>
                <ExternalLink className="w-4 h-4" /> Ouvrir
              </Button>
            </div>
            <Button variant="ghost" className="w-full" onClick={() => setCopyDialog(null)}>Retour</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Sales Mastery custom view
  if (subView === "sales") return <SalesMasteryView onBack={() => setSubView(null)} />;

  // Category Architect custom view
  if (subView === "category") return <CategoryArchitectView onBack={() => setSubView(null)} />;

  // Automation Advisor custom view
  if (subView === "automation") return <AutomationAdvisorView onBack={() => setSubView(null)} />;

  if (subView) {
    const advisor = ADVISORS.find((a) => a.id === subView);
    if (!advisor || advisor.single) { setSubView(null); return null; }
    const links = getLinks();
    return (
      <div className="p-6 space-y-4 max-w-lg">
        <button onClick={() => setSubView(null)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="w-4 h-4" /> Retour
        </button>
        <h2 className="text-lg font-semibold">{advisor.title}</h2>
        <div className="space-y-3">
          {advisor.options?.map(({ label, key }) => (
            <Card key={key} className="cursor-pointer hover:border-primary/40 hover:shadow-glow transition-all"
              onClick={() => openAdvisor(links[key], label)}>
              <CardContent className="pt-4 pb-4 flex items-center justify-between">
                <span className="font-medium text-sm">{label}</span>
                <ExternalLink className="w-4 h-4 text-muted-foreground" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4 max-w-2xl">
      <h2 className="text-base font-semibold text-foreground">Conseillers IA</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {ADVISORS.map((advisor) => (
          <Card
            key={advisor.id}
            className="cursor-pointer hover:border-primary/40 hover:shadow-glow transition-all group"
            onClick={() => setSubView(advisor.id)}
          >
            <CardContent className="pt-6 pb-5">
              <div className="text-3xl mb-3">{advisor.emoji}</div>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-foreground text-sm">{advisor.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{advisor.description}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors mt-0.5 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
