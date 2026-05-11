import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import {
  ChevronDown, ChevronRight, Copy, Loader2, Upload, Send,
  Mic, FileText, Star, Trophy, AlertTriangle, Lightbulb,
  Compass, Package, Crown, Zap, Clock, Filter, Sparkles,
  ChevronUp, Check,
} from "lucide-react";
import Anthropic from "@anthropic-ai/sdk";

// ── Claude helper ─────────────────────────────────────────────────────────────

async function askClaude(prompt: string, onStream?: (t: string) => void): Promise<string> {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Clé Anthropic manquante dans .env");
  const anthropic = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  const response = await anthropic.messages.create({
    model: "claude-opus-4-6", max_tokens: 2000,
    messages: [{ role: "user", content: prompt }],
  });
  return response.content[0].type === "text" ? response.content[0].text : "";
}

// ── Skill definitions ─────────────────────────────────────────────────────────

interface Skill {
  id: string;
  emoji: string;
  label: string;
  description: string;
  systemPrompt: string;
  starters: string[];
  component?: "sales" | "category" | "automation";
}

interface SkillGroup {
  id: string;
  emoji: string;
  label: string;
  children: Skill[];
}

type NavItem = Skill | SkillGroup;
function isGroup(item: NavItem): item is SkillGroup { return "children" in item; }

const NAV: NavItem[] = [
  {
    id: "scaling",
    emoji: "🚀",
    label: "Scaling",
    description: "Stratégies pour faire passer ton agence au niveau supérieur",
    systemPrompt: "Tu es un expert en scaling d'agences de marketing vidéo. Tu aides les fondateurs à structurer leur croissance, automatiser leurs opérations, recruter les bonnes personnes et atteindre leurs objectifs de revenus. Réponds de façon concrète et actionnables.",
    starters: [
      "Comment passer de 10k à 30k$/mois avec mon agence vidéo?",
      "Quelle est la meilleure structure d'équipe pour scaler?",
      "Comment créer des systèmes pour ne plus tout faire moi-même?",
      "Quand et comment recruter mon premier employé?",
    ],
  },
  {
    id: "ads",
    emoji: "🎯",
    label: "Ads Strategy",
    children: [
      {
        id: "ads-scripting",
        emoji: "🎬",
        label: "Scripting vidéo",
        description: "Écris des scripts publicitaires qui convertissent",
        systemPrompt: "Tu es un expert en scripting de publicités vidéo pour agences. Tu crées des scripts courts et percutants qui captent l'attention en 3 secondes, créent de l'émotion et poussent à l'action. Format: Hook → Problème → Solution → Preuve → CTA.",
        starters: [
          "Écris un script de 30 secondes pour un restaurant qui veut plus de réservations",
          "Crée un hook ultra-accrocheur pour une pub e-commerce",
          "Script pour une publicité de service local (plombier, électricien...)",
          "Comment structurer une pub vidéo UGC qui convertit?",
        ],
      },
      {
        id: "ads-static",
        emoji: "🖼️",
        label: "Ads Statique",
        description: "Stratégie et copywriting pour visuels publicitaires",
        systemPrompt: "Tu es un expert en création de publicités statiques (images, carousels) pour les réseaux sociaux. Tu maîtrises le copywriting publicitaire, la hiérarchie visuelle et les principes de conversion. Tu donnes des conseils sur le texte, la structure et la stratégie.",
        starters: [
          "Quel texte mettre sur une pub statique pour un coach fitness?",
          "Comment structurer un carousel Facebook qui génère des leads?",
          "Les meilleures accroches pour des ads immobilier",
          "Comment A/B tester mes visuels publicitaires efficacement?",
        ],
      },
    ],
  },
  {
    id: "content",
    emoji: "✍️",
    label: "Content Coach",
    children: [
      {
        id: "content-brand",
        emoji: "🌟",
        label: "Personal Brand",
        description: "Construis ta marque personnelle et ton autorité",
        systemPrompt: "Tu es un expert en personal branding pour entrepreneurs et fondateurs d'agences. Tu aides à définir un positionnement unique, créer du contenu qui attire des clients et construire une audience engagée. Tu connais les stratégies LinkedIn, Instagram et TikTok.",
        starters: [
          "Comment me différencier en tant que fondateur d'agence vidéo?",
          "Quel type de contenu poster pour attirer des clients haut de gamme?",
          "Crée un plan de contenu pour les 30 prochains jours",
          "Comment raconter mon histoire de façon authentique et magnétique?",
        ],
      },
      {
        id: "content-ideas",
        emoji: "💡",
        label: "Idées de contenu",
        description: "Génère des idées de contenu infinies pour ton niche",
        systemPrompt: "Tu es un générateur d'idées de contenu créatif pour agences et entrepreneurs. Tu produis des idées originales, des angles uniques et des formats engageants adaptés aux différentes plateformes (Instagram, TikTok, LinkedIn, YouTube).",
        starters: [
          "Donne-moi 10 idées de Reels pour une agence vidéo",
          "Idées de contenu viral pour attirer des clients restaurants",
          "20 accroches LinkedIn pour un fondateur d'agence marketing",
          "Idées de contenu éducatif qui montrent mon expertise",
        ],
      },
    ],
  },
  {
    id: "helper",
    emoji: "🤝",
    label: "Little Helper",
    description: "Assistant général — rédaction, feedback, questions diverses",
    systemPrompt: "Tu es un assistant intelligent pour une agence de marketing vidéo. Tu peux aider avec la rédaction d'emails, de propositions commerciales, de contrats, donner du feedback sur des idées, répondre à des questions générales sur le business et la gestion d'agence.",
    starters: [
      "Rédige un email de relance professionnel pour un prospect qui n'a pas répondu",
      "Aide-moi à améliorer cette proposition commerciale",
      "Comment répondre à un client qui se plaint du prix?",
      "Rédige des CGV simples pour mon agence",
    ],
  },
  {
    id: "sales",
    emoji: "🏆",
    label: "Sales Mastery",
    description: "Analyse tes appels et accède à tes scripts de vente",
    systemPrompt: "",
    starters: [],
    component: "sales",
  },
  {
    id: "category",
    emoji: "👑",
    label: "Category Architect",
    description: "Niche, offre irrésistible et positionnement #1",
    systemPrompt: "",
    starters: [],
    component: "category",
  },
  {
    id: "automation",
    emoji: "⚡",
    label: "Automation Advisor",
    description: "Automatise ton agence — Zapier, GHL, Make, Claude",
    systemPrompt: "",
    starters: [],
    component: "automation",
  },
];

// Flatten for lookup
function allSkills(nav: NavItem[]): Skill[] {
  return nav.flatMap(item => isGroup(item) ? item.children : [item]);
}

// ── Generic Claude Chat Panel ─────────────────────────────────────────────────

function ClaudeChat({ skill }: { skill: Skill }) {
  const [input, setInput] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [usedStarter, setUsedStarter] = useState<string | null>(null);

  const ask = async (question: string) => {
    if (!question.trim() || loading) return;
    setLoading(true);
    setResponse("");
    setUsedStarter(question);
    try {
      const fullPrompt = `${skill.systemPrompt}\n\n${question}`;
      const result = await askClaude(fullPrompt);
      setResponse(result);
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur Claude");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Starters */}
      {!response && !loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {skill.starters.map((s) => (
            <button key={s} onClick={() => { setInput(s); ask(s); }}
              className="text-left text-xs px-3 py-2.5 rounded-lg border border-border/50 bg-muted/30 hover:border-primary/40 hover:bg-primary/5 text-muted-foreground hover:text-foreground transition-all">
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2">
        <Textarea
          placeholder={`Pose une question à Claude sur ${skill.label}...`}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(input); } }}
          className="resize-none h-20 text-sm"
          disabled={loading}
        />
        <Button onClick={() => ask(input)} disabled={loading || !input.trim()} className="flex-shrink-0 h-20 px-4">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Claude réfléchit...
        </div>
      )}

      {/* Response */}
      {response && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">{usedStarter}</p>
            <div className="flex gap-1.5">
              <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs"
                onClick={() => { navigator.clipboard.writeText(response); toast.success("Copié!"); }}>
                <Copy className="w-3 h-3" /> Copier
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs"
                onClick={() => { setResponse(""); setInput(""); setUsedStarter(null); }}>
                Nouvelle question
              </Button>
            </div>
          </div>
          <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed bg-muted/20 rounded-xl p-4 border border-border/30 max-h-[500px] overflow-y-auto">
            {response}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sales Mastery ─────────────────────────────────────────────────────────────

interface AnalysisResult {
  score: number; scoreLabel: string; strengths: string[];
  improvements: string[]; objections: string[]; closing: string; topTip: string;
}

const SCRIPTS = [
  { id: "warm", emoji: "🔥", label: "Warm Call", description: "Premier contact avec un prospect chaud", prompt: "Écris un script de warm call pour une agence de marketing vidéo. Format: [OUVERTURE], [QUALIFICATION], [PITCH], [OBJECTIONS], [CLOSING RDV]." },
  { id: "closing", emoji: "🤝", label: "Closing Call", description: "Appel final pour convertir en client", prompt: "Écris un script de closing call pour une agence vidéo. Format: [RÉCAP VALEUR], [GESTION PRIX], [TECHNIQUES DE CLOSING], [OBJECTIONS FINALES], [SIGNATURE]." },
  { id: "discovery", emoji: "🔍", label: "Discovery Call", description: "Comprendre les besoins du prospect", prompt: "Écris un script de discovery call pour une agence vidéo. Format: [INTRO], [QUESTIONS DE DÉCOUVERTE], [IDENTIFICATION PAIN POINTS], [PRÉSENTATION AGENCE], [PROCHAINES ÉTAPES]." },
  { id: "followup", emoji: "📞", label: "Follow-up", description: "Relance après un silence", prompt: "Écris un script de follow-up call + message texte pour une agence vidéo après une proposition sans réponse. Format: [CALL SCRIPT], [MESSAGE TEXTE], [EMAIL COURT]." },
  { id: "objections", emoji: "🛡️", label: "Objections", description: "Réponses aux objections fréquentes", prompt: "Guide complet de gestion des objections pour agence vidéo: 1) Trop cher 2) J'y réfléchis 3) J'en parle à mon associé 4) On a déjà quelqu'un 5) Pas de budget maintenant. Réponse idéale + question de recadrage pour chaque." },
];

function SalesMasteryPanel() {
  const [tab, setTab] = useState<"analyze" | "scripts">("analyze");
  const [transcript, setTranscript] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [selectedScript, setSelectedScript] = useState<string | null>(null);
  const [scriptText, setScriptText] = useState("");
  const [scriptLoading, setScriptLoading] = useState(false);
  const [context, setContext] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const analyze = async () => {
    if (!transcript.trim() || transcript.length < 100) { toast.error("Transcript trop court"); return; }
    setLoading(true); setResult(null);
    try {
      const text = await askClaude(`Tu es un expert en vente pour agences vidéo. Analyse ce transcript et réponds UNIQUEMENT en JSON:
{"score":<0-100>,"scoreLabel":"Excellent|Bon|Moyen|À améliorer","strengths":[<3 max>],"improvements":[<3 max>],"objections":[<2-3>],"closing":"<technique utilisée>","topTip":"<conseil #1>"}
TRANSCRIPT: ${transcript.slice(0, 8000)}`);
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) throw new Error();
      setResult(JSON.parse(match[0]));
    } catch { toast.error("Erreur d'analyse. Réessaie."); }
    finally { setLoading(false); }
  };

  const generateScript = async (s: typeof SCRIPTS[0]) => {
    setSelectedScript(s.id); setScriptLoading(true); setScriptText("");
    try {
      const ctx = context.trim() ? `\nContexte agence: ${context}` : "";
      setScriptText(await askClaude(s.prompt + ctx));
    } catch { toast.error("Erreur génération"); }
    finally { setScriptLoading(false); }
  };

  const scoreColor = (n: number) => n >= 80 ? "text-emerald-400" : n >= 60 ? "text-primary" : n >= 40 ? "text-amber-400" : "text-destructive";

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="flex gap-1 bg-muted/50 rounded-lg p-1 w-fit">
        {[{id:"analyze",label:"Analyser un appel",icon:Mic},{id:"scripts",label:"Scripts de vente",icon:FileText}].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id as any)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${tab===t.id?"bg-card text-foreground shadow-sm":"text-muted-foreground hover:text-foreground"}`}>
            <t.icon className="w-3.5 h-3.5"/> {t.label}
          </button>
        ))}
      </div>

      {tab === "analyze" && (
        <div className="space-y-4">
          <Card><CardContent className="pt-4 pb-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Transcript de l'appel</p>
              <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={()=>fileRef.current?.click()}>
                <Upload className="w-3.5 h-3.5"/> Importer .txt
              </Button>
              <input ref={fileRef} type="file" accept=".txt" className="hidden"
                onChange={e=>{const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=ev=>setTranscript(ev.target?.result as string);r.readAsText(f);}}/>
            </div>
            <Textarea placeholder="Colle le transcript ici..." value={transcript} onChange={e=>setTranscript(e.target.value)} className="h-36 text-xs resize-none"/>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{transcript.length} caractères</span>
              <Button onClick={analyze} disabled={loading||!transcript.trim()} className="gap-2 shadow-glow">
                {loading?<><Loader2 className="w-4 h-4 animate-spin"/>Analyse...</>:"🔍 Analyser l'appel"}
              </Button>
            </div>
          </CardContent></Card>

          {result && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card className="border-primary/20"><CardContent className="pt-5 pb-5 flex items-center gap-4">
                  <div className="text-center">
                    <p className={`text-5xl font-bold ${scoreColor(result.score)}`}>{result.score}</p>
                    <p className="text-xs text-muted-foreground mt-1">/100</p>
                  </div>
                  <div>
                    <p className={`text-xl font-semibold ${scoreColor(result.score)}`}>{result.scoreLabel}</p>
                    <p className="text-xs text-muted-foreground mt-1">{result.closing}</p>
                  </div>
                </CardContent></Card>
                <Card className="border-primary/30 bg-primary/5"><CardContent className="pt-4 pb-4 flex gap-3">
                  <Lightbulb className="w-4 h-4 text-primary flex-shrink-0 mt-0.5"/>
                  <div><p className="text-xs font-semibold text-primary mb-1">Conseil #1</p><p className="text-sm">{result.topTip}</p></div>
                </CardContent></Card>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Card><CardContent className="pt-4 pb-4 space-y-2">
                  <div className="flex items-center gap-2 mb-2"><Trophy className="w-3.5 h-3.5 text-emerald-400"/><p className="text-xs font-semibold text-emerald-400">Points forts</p></div>
                  {result.strengths.map((s,i)=><div key={i} className="flex gap-2"><Star className="w-3 h-3 text-emerald-400 flex-shrink-0 mt-0.5"/><p className="text-xs">{s}</p></div>)}
                </CardContent></Card>
                <Card><CardContent className="pt-4 pb-4 space-y-2">
                  <div className="flex items-center gap-2 mb-2"><AlertTriangle className="w-3.5 h-3.5 text-amber-400"/><p className="text-xs font-semibold text-amber-400">À améliorer</p></div>
                  {result.improvements.map((s,i)=><div key={i} className="flex gap-2"><span className="text-amber-400 text-xs flex-shrink-0">→</span><p className="text-xs">{s}</p></div>)}
                </CardContent></Card>
              </div>
              <Button variant="outline" className="w-full" onClick={()=>{setResult(null);setTranscript("");}}>Analyser un autre appel</Button>
            </div>
          )}
        </div>
      )}

      {tab === "scripts" && (
        <div className="space-y-4">
          <Card className="border-border/40"><CardContent className="pt-3 pb-3">
            <p className="text-xs text-muted-foreground mb-1.5">Contexte (optionnel)</p>
            <Input placeholder="Ex: agence vidéo pour restaurants, ticket 3000$/mois..." value={context} onChange={e=>setContext(e.target.value)} className="text-xs h-8"/>
          </CardContent></Card>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {SCRIPTS.map(s=>(
              <Card key={s.id} className="cursor-pointer hover:border-primary/40 transition-all group" onClick={()=>generateScript(s)}>
                <CardContent className="pt-4 pb-4 flex items-start justify-between">
                  <div><p className="text-base mb-1">{s.emoji}</p><p className="font-semibold text-sm">{s.label}</p><p className="text-xs text-muted-foreground mt-0.5">{s.description}</p></div>
                  {scriptLoading&&selectedScript===s.id?<Loader2 className="w-4 h-4 animate-spin text-primary"/>:<ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors"/>}
                </CardContent>
              </Card>
            ))}
          </div>
          {scriptText && (
            <Card className="border-primary/20"><CardContent className="pt-4 pb-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-primary">{SCRIPTS.find(s=>s.id===selectedScript)?.emoji} {SCRIPTS.find(s=>s.id===selectedScript)?.label}</p>
                <Button size="sm" variant="outline" className="gap-1.5 text-xs h-7" onClick={()=>{navigator.clipboard.writeText(scriptText);toast.success("Copié!");}}>
                  <Copy className="w-3 h-3"/> Copier
                </Button>
              </div>
              <div className="text-xs whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto bg-muted/20 rounded-lg p-3 border border-border/30">{scriptText}</div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

// ── Category Architect ────────────────────────────────────────────────────────

const CAT_TABS = [
  { id:"niche", label:"Trouver ta Niche", Icon:Compass },
  { id:"offer", label:"Construire ton Offre", Icon:Package },
  { id:"category", label:"Créer ta Catégorie", Icon:Crown },
];
const CAT_QUESTIONS = [
  { id:"service", label:"Quel service offres-tu?", placeholder:"Ex: vidéos marketing pour clients locaux..." },
  { id:"who", label:"À qui tu parles?", placeholder:"Ex: restaurants, coaches, e-commerce..." },
  { id:"result", label:"Quel résultat concret tu livres?", placeholder:"Ex: +30% de réservations en 90 jours..." },
  { id:"problem", label:"Leur plus grand problème?", placeholder:"Ex: du mal à attirer de nouveaux clients..." },
  { id:"why", label:"Pourquoi toi et pas un autre?", placeholder:"Ex: je suis moi-même dans cette industrie..." },
];

function CategoryArchitectPanel() {
  const [tab, setTab] = useState("niche");
  const [answers, setAnswers] = useState<Record<string,string>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const filled = CAT_QUESTIONS.filter(q=>answers[q.id]?.trim()).length;

  const ctx = CAT_QUESTIONS.map(q=>`${q.label}: ${answers[q.id]||"Non renseigné"}`).join("\n");

  const prompts: Record<string,string> = {
    niche: `Expert en positionnement pour agences. Basé sur:\n${ctx}\n\nGénère: 1. 3 sous-niches spécifiques avec score /10 2. La sous-niche recommandée 3. ICP ultra-précis 4. Signaux d'achat 5. Pourquoi cette niche est sous-servie.`,
    offer: `Expert en offres irrésistibles pour agences. Basé sur:\n${ctx}\n\nConstruis: 1. Nom de l'offre 2. Le Grand Promise 3. Ce qui est inclus 4. Bonifications 5. Garantie 6. Prix suggéré 7. Pitch en 2 phrases.`,
    category: `Expert en Category Design. Basé sur:\n${ctx}\n\nCrée: 1. Nom de la catégorie 2. Le problème qu'elle résout 3. Manifeste 4. Positionnement Category King 5. Langage propriétaire 6. Stratégie de contenu 7. Exemples inspirants.`,
  };

  const generate = async () => {
    setLoading(true); setResult("");
    try { setResult(await askClaude(prompts[tab])); }
    catch(e:any){ toast.error(e?.message??"Erreur"); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-5">
      <div className="flex gap-1 bg-muted/50 rounded-lg p-1 w-fit flex-wrap">
        {CAT_TABS.map(({id,label,Icon})=>(
          <button key={id} onClick={()=>{setTab(id);setResult("");}}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${tab===id?"bg-card text-foreground shadow-sm":"text-muted-foreground hover:text-foreground"}`}>
            <Icon className="w-3.5 h-3.5"/> {label}
          </button>
        ))}
      </div>
      <Card><CardContent className="pt-4 pb-4 space-y-3">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-semibold text-muted-foreground">Contexte</p>
          <span className="text-xs text-muted-foreground">{filled}/{CAT_QUESTIONS.length}</span>
        </div>
        {CAT_QUESTIONS.map(q=>(
          <div key={q.id} className="space-y-1">
            <label className="text-xs text-foreground font-medium">{q.label}</label>
            <Input placeholder={q.placeholder} value={answers[q.id]??""} onChange={e=>setAnswers(p=>({...p,[q.id]:e.target.value}))} className="text-xs h-8"/>
          </div>
        ))}
      </CardContent></Card>
      <Button onClick={generate} disabled={loading||filled<2} className="w-full gap-2 shadow-glow">
        {loading?<><Loader2 className="w-4 h-4 animate-spin"/>Génération...</>
          :tab==="niche"?"🔍 Trouver mes meilleures niches"
          :tab==="offer"?"📦 Construire mon offre irrésistible"
          :"👑 Créer ma catégorie"}
      </Button>
      {filled<2&&<p className="text-xs text-muted-foreground text-center">Remplis au moins 2 champs</p>}
      {result&&(
        <Card className="border-primary/20"><CardContent className="pt-4 pb-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-primary">{tab==="niche"?"🔍 Analyse":tab==="offer"?"📦 Offre":"👑 Catégorie"}</p>
            <Button size="sm" variant="outline" className="gap-1.5 text-xs h-7" onClick={()=>{navigator.clipboard.writeText(result);toast.success("Copié!");}}>
              <Copy className="w-3 h-3"/> Copier
            </Button>
          </div>
          <div className="text-xs whitespace-pre-wrap leading-relaxed max-h-[500px] overflow-y-auto bg-muted/20 rounded-lg p-3 border border-border/30">{result}</div>
          <Button variant="outline" size="sm" className="w-full" onClick={()=>setResult("")}>Recommencer</Button>
        </CardContent></Card>
      )}
    </div>
  );
}

// ── Automation Advisor ────────────────────────────────────────────────────────

type Difficulty = "Facile"|"Moyen"|"Avancé";
interface Automation { id:string;name:string;description:string;tools:string[];timeSaved:string;difficulty:Difficulty;category:string;steps:string[]; }

const AUTOMATIONS: Automation[] = [
  { id:"lead-dm", name:"Auto-DM nouveaux followers", description:"Message de bienvenue automatique à chaque nouveau follower Instagram.", tools:["ManyChat","Instagram"], timeSaved:"3h/sem", difficulty:"Facile", category:"Lead Generation", steps:["Crée un compte ManyChat et connecte ton Instagram Business","Va dans Automation → New Flow → Trigger: New Follower","Rédige ton message de bienvenue avec CTA","Ajoute un bouton vers ton lien de prise de RDV","Active et teste avec un compte test"] },
  { id:"form-crm", name:"Formulaire → CRM automatique", description:"Quand un prospect remplit ton formulaire, il est ajouté dans ton CRM.", tools:["Zapier","Typeform","GHL"], timeSaved:"2h/sem", difficulty:"Facile", category:"Lead Generation", steps:["Zap Trigger: New Entry in Typeform","Action: Create Contact in GoHighLevel","Mappe les champs (Prénom, Email, Téléphone)","Ajoute une action: email de confirmation au prospect","Teste avec une vraie soumission"] },
  { id:"ig-comment", name:"Commentaire → DM automatique", description:"Un mot-clé en commentaire déclenche un DM automatique.", tools:["ManyChat"], timeSaved:"4h/sem", difficulty:"Facile", category:"Lead Generation", steps:["Dans ManyChat, Trigger: Comment on Post","Définis le mot-clé (GUIDE, PRIX, INFO)","Configure la réponse publique sous le commentaire","Configure le DM avec le lien promis","Publie un post en demandant de commenter"] },
  { id:"onboarding", name:"Séquence onboarding automatique", description:"Quand un client signe, une séquence emails s'envoie sur 7 jours.", tools:["GHL","Zapier","Stripe"], timeSaved:"5h/sem", difficulty:"Moyen", category:"Onboarding", steps:["Dans GHL, crée une étape 'Client signé' dans ton Pipeline","Crée un Workflow déclenché à cette étape","Ajoute emails: J+0 bienvenue, J+1 accès Drive, J+3 questionnaire","Connecte Stripe via Zapier: paiement → déplacer contact","Teste avec un contact fictif"] },
  { id:"video-delivery", name:"Livraison vidéo automatique", description:"Quand tu déposes une vidéo dans Drive, le client reçoit un email.", tools:["Zapier","Google Drive","Gmail"], timeSaved:"2h/sem", difficulty:"Facile", category:"Contenu", steps:["Zap Trigger: New File in Google Drive Folder 'Livraisons'","Action: envoyer Gmail au client avec le lien","Personnalise: 'Ta vidéo [nom] est prête!'","Optionnel: notif Slack en plus","Organise Drive avec sous-dossiers par client"] },
  { id:"weekly-report", name:"Rapport client hebdomadaire", description:"Chaque vendredi, un rapport est généré et envoyé à tous tes clients.", tools:["Make","Google Sheets","Claude API","Gmail"], timeSaved:"5h/sem", difficulty:"Avancé", category:"Reporting", steps:["Google Sheet avec métriques par client","Dans Make, scénario déclenché chaque vendredi","Récupère les données du Sheet","Envoie à Claude API: résumer en 3 points","Email formaté à chaque client avec son résumé"] },
  { id:"churn", name:"Détection de churn automatique", description:"Si un client est inactif depuis 30 jours, une relance se déclenche.", tools:["GHL"], timeSaved:"Prévient la perte de clients", difficulty:"Moyen", category:"Rétention", steps:["Dans GHL, crée un tag 'Inactif 30 jours'","Workflow: si aucune activité → ajouter le tag","Déclenche séquence: check-in J+0, valeur J+3, call J+7","Notif pour appeler personnellement si pas de réponse","Retire le tag automatiquement si le client répond"] },
  { id:"review", name:"Demande d'avis automatique", description:"30 jours après le début, une demande d'avis Google s'envoie.", tools:["GHL"], timeSaved:"1h/sem", difficulty:"Facile", category:"Rétention", steps:["Workflow: Trigger = Contact créé depuis 30 jours","Email/SMS avec lien Google Review","Propose une ressource gratuite pour l'avis","Suivi J+7 si pas de réponse","Collecte les avis dans un Sheet de témoignages"] },
];

const DIFF_COLORS: Record<Difficulty,string> = { "Facile":"text-emerald-400 bg-emerald-400/10 border-emerald-400/20", "Moyen":"text-amber-400 bg-amber-400/10 border-amber-400/20", "Avancé":"text-red-400 bg-red-400/10 border-red-400/20" };
const CATS = ["Toutes", ...Array.from(new Set(AUTOMATIONS.map(a=>a.category)))];

function AutomationPanel() {
  const [filter, setFilter] = useState("Toutes");
  const [expanded, setExpanded] = useState<string|null>(null);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiResult, setAiResult] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const filtered = filter==="Toutes"?AUTOMATIONS:AUTOMATIONS.filter(a=>a.category===filter);

  const askAI = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true); setAiResult("");
    try {
      setAiResult(await askClaude(`Expert en automatisation pour agences vidéo (Zapier, Make, GHL, ManyChat, Claude API). Question: ${aiPrompt}\n\nDonne: 1. Les 3 meilleures automatisations pour cette situation 2. Pour chaque: outil + 5 étapes concrètes 3. Par où commencer en premier.`));
    } catch(e:any){ toast.error(e?.message??"Erreur"); }
    finally { setAiLoading(false); }
  };

  return (
    <div className="space-y-5">
      <Card className="border-primary/20 bg-primary/5"><CardContent className="pt-4 pb-4 space-y-3">
        <div className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary"/><p className="text-sm font-semibold text-primary">Recommandations personnalisées</p></div>
        <textarea placeholder="Décris ta situation: Je passe 3h/sem à envoyer des updates à mes clients..."
          value={aiPrompt} onChange={e=>setAiPrompt(e.target.value)}
          className="w-full h-16 text-xs rounded-md border border-input bg-background px-3 py-2 resize-none text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"/>
        <Button onClick={askAI} disabled={aiLoading||!aiPrompt.trim()} className="w-full gap-2 shadow-glow">
          {aiLoading?<><Loader2 className="w-4 h-4 animate-spin"/>Analyse...</>:"⚡ Recommande mes automatisations"}
        </Button>
        {aiResult&&(
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <p className="text-xs font-semibold text-primary">Recommandations</p>
              <Button size="sm" variant="outline" className="gap-1.5 text-xs h-7" onClick={()=>{navigator.clipboard.writeText(aiResult);toast.success("Copié!");}}>
                <Copy className="w-3 h-3"/> Copier
              </Button>
            </div>
            <div className="text-xs whitespace-pre-wrap leading-relaxed bg-card rounded-lg p-3 border border-border/30 max-h-72 overflow-y-auto">{aiResult}</div>
          </div>
        )}
      </CardContent></Card>

      <div className="flex items-center gap-1.5 flex-wrap">
        <Filter className="w-3.5 h-3.5 text-muted-foreground"/>
        {CATS.map(cat=>(
          <button key={cat} onClick={()=>setFilter(cat)}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${filter===cat?"bg-primary text-primary-foreground border-primary":"border-border/50 text-muted-foreground hover:border-primary/40"}`}>
            {cat}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.map(auto=>(
          <Card key={auto.id} className="border-border/50 hover:border-border/80 transition-colors">
            <CardContent className="pt-0 pb-0">
              <button className="w-full flex items-start gap-3 py-4 text-left" onClick={()=>setExpanded(expanded===auto.id?null:auto.id)}>
                <Zap className="w-4 h-4 text-primary flex-shrink-0 mt-0.5"/>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <p className="text-sm font-semibold">{auto.name}</p>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${DIFF_COLORS[auto.difficulty]}`}>{auto.difficulty}</span>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Clock className="w-3 h-3"/>{auto.timeSaved}</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{auto.description}</p>
                  <div className="flex gap-1 mt-1.5 flex-wrap">
                    {auto.tools.map(t=><span key={t} className="text-[10px] bg-muted/60 text-muted-foreground px-1.5 py-0.5 rounded">{t}</span>)}
                  </div>
                </div>
                {expanded===auto.id?<ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5"/>:<ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5"/>}
              </button>
              {expanded===auto.id&&(
                <div className="px-7 pb-4 space-y-3">
                  <div className="h-px bg-border/40"/>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Comment faire</p>
                  <div className="space-y-2">
                    {auto.steps.map((step,i)=>(
                      <div key={i} className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i+1}</span>
                        <p className="text-xs leading-relaxed">{step}</p>
                      </div>
                    ))}
                  </div>
                  <Button size="sm" variant="outline" className="gap-1.5 text-xs h-7"
                    onClick={()=>{navigator.clipboard.writeText(auto.steps.map((s,i)=>`${i+1}. ${s}`).join("\n"));toast.success("Étapes copiées!");}}>
                    <Copy className="w-3 h-3"/> Copier les étapes
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

// ── Main AdvisorsTab ──────────────────────────────────────────────────────────

export function AdvisorsTab() {
  const [selectedId, setSelectedId] = useState<string>("scaling");
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set(["ads","content"]));

  const toggleGroup = (id: string) => setOpenGroups(prev => {
    const s = new Set(prev);
    s.has(id) ? s.delete(id) : s.add(id);
    return s;
  });

  const skills = allSkills(NAV);
  const selected = skills.find(s => s.id === selectedId) ?? skills[0];

  const renderPanel = () => {
    if (selected.component === "sales") return <SalesMasteryPanel />;
    if (selected.component === "category") return <CategoryArchitectPanel />;
    if (selected.component === "automation") return <AutomationPanel />;
    return <ClaudeChat skill={selected} />;
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Left nav ── */}
      <aside className="w-52 flex-shrink-0 border-r border-border/40 bg-sidebar overflow-y-auto py-3 px-2">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-2">Skills Claude</p>
        <div className="space-y-0.5">
          {NAV.map(item => {
            if (isGroup(item)) {
              const open = openGroups.has(item.id);
              return (
                <div key={item.id}>
                  <button onClick={() => toggleGroup(item.id)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50 transition-colors">
                    <span className="text-base leading-none">{item.emoji}</span>
                    <span className="flex-1 text-left font-medium">{item.label}</span>
                    {open ? <ChevronDown className="w-3.5 h-3.5"/> : <ChevronRight className="w-3.5 h-3.5"/>}
                  </button>
                  {open && (
                    <div className="ml-3 pl-2 border-l border-border/40 mt-0.5 space-y-0.5">
                      {item.children.map(child => (
                        <button key={child.id} onClick={() => setSelectedId(child.id)}
                          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${selectedId===child.id?"bg-sidebar-accent text-sidebar-foreground font-medium":"text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50"}`}>
                          <span className="text-sm leading-none">{child.emoji}</span>
                          <span className="truncate">{child.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            }
            return (
              <button key={item.id} onClick={() => setSelectedId(item.id)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${selectedId===item.id?"bg-sidebar-accent text-sidebar-foreground font-medium":"text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50"}`}>
                <span className="text-base leading-none">{item.emoji}</span>
                <span className="flex-1 text-left truncate">{item.label}</span>
              </button>
            );
          })}
        </div>
      </aside>

      {/* ── Right content ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-6 space-y-5">
          {/* Header */}
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <span className="text-2xl">{selected.emoji}</span>
              <h2 className="text-lg font-semibold text-foreground">{selected.label}</h2>
            </div>
            <p className="text-sm text-muted-foreground">{selected.description}</p>
          </div>
          <div className="h-px bg-border/40"/>
          {renderPanel()}
        </div>
      </div>
    </div>
  );
}
