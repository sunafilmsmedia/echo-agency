import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Users, Zap, ArrowRight, LogOut } from "lucide-react";

type Intent = "choose" | "join" | "create";

export default function WorkspaceSetup() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [intent, setIntent] = useState<Intent>(() => {
    const p = params.get("intent");
    if (p === "join" || p === "create") return p;
    return "choose";
  });

  const [loading, setLoading] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [userEmail, setUserEmail] = useState("");

  // Check auth + existing workspace
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { navigate("/login", { replace: true }); return; }
      setUserEmail(data.user.email ?? "");
    });

    // Check if user already belongs to a workspace
    checkExistingWorkspace();
  }, []);

  const checkExistingWorkspace = async () => {
    const { data: member } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .limit(1)
      .maybeSingle();
    if (member?.workspace_id) {
      navigate("/dashboard", { replace: true });
    }
  };

  const handleJoin = async () => {
    if (!inviteCode.trim()) { toast.error("Entre un code d'invitation"); return; }
    setLoading(true);
    try {
      // Look up workspace by invite code
      const { data: workspace, error } = await supabase
        .from("workspaces")
        .select("id, name, max_members")
        .eq("invite_code", inviteCode.trim().toUpperCase())
        .maybeSingle();

      if (error || !workspace) {
        toast.error("Code invalide. Vérifie avec le propriétaire de l'espace.");
        return;
      }

      // Check member count
      const { count } = await supabase
        .from("workspace_members")
        .select("*", { count: "exact", head: true })
        .eq("workspace_id", workspace.id);

      if ((count ?? 0) >= workspace.max_members) {
        toast.error("Cet espace a atteint son nombre maximum de membres.");
        return;
      }

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      // Add member
      const { error: memberError } = await supabase
        .from("workspace_members")
        .insert({ workspace_id: workspace.id, user_id: user.user.id, role: "member" });

      if (memberError) {
        if (memberError.code === "23505") {
          toast.error("Tu es déjà membre de cet espace.");
        } else {
          throw memberError;
        }
        return;
      }

      toast.success(`Bienvenue dans l'espace "${workspace.name}"!`);
      navigate("/dashboard", { replace: true });
    } catch (e) {
      toast.error("Une erreur s'est produite. Réessaie.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!workspaceName.trim()) { toast.error("Entre un nom pour ton espace"); return; }
    setLoading(true);
    try {
      // Create Stripe checkout session via Edge Function
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { workspaceName: workspaceName.trim() },
      });

      if (error || !data?.url) {
        toast.error("Erreur lors de la création du checkout. Vérifie ta clé Stripe.");
        return;
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch {
      toast.error("Une erreur s'est produite. Réessaie.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-glow pointer-events-none" />

      <div className="relative z-10 w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2.5 mb-2">
            <img src="/echo-avatar.png" alt="Echo" className="w-9 h-9 rounded-xl object-cover" />
            <span className="text-xl font-bold text-foreground">Echo</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {intent === "choose" && "Rejoins un espace ou crée le tien"}
            {intent === "join" && "Rejoindre un espace existant"}
            {intent === "create" && "Créer ton espace"}
          </p>
        </div>

        {/* ── CHOOSE ── */}
        {intent === "choose" && (
          <div className="space-y-3">
            <button
              onClick={() => setIntent("join")}
              className="w-full group flex items-center gap-4 p-4 rounded-xl border border-border/60 bg-card hover:border-primary/40 hover:bg-primary/5 transition-all text-left"
            >
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm text-foreground">Rejoindre un espace</p>
                <p className="text-xs text-muted-foreground">Gratuit — tu as reçu un code d'invitation</p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </button>

            <button
              onClick={() => setIntent("create")}
              className="w-full group flex items-center gap-4 p-4 rounded-xl border-2 border-primary/40 bg-card hover:border-primary hover:bg-primary/5 transition-all text-left relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none" />
              <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
                <Zap className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm text-foreground">Créer mon espace</p>
                <p className="text-xs text-muted-foreground">Gratuit · Pro 27$/mo · Business 57$/mo</p>
              </div>
              <ArrowRight className="w-4 h-4 text-primary group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        )}

        {/* ── JOIN ── */}
        {intent === "join" && (
          <div className="card-premium border border-border/50 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                <Users className="w-4.5 h-4.5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-semibold text-sm">Rejoindre un espace</p>
                <p className="text-xs text-muted-foreground">Entre le code partagé par le propriétaire</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="code">Code d'invitation</Label>
              <Input
                id="code"
                placeholder="Ex: ABC123"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                className="text-center font-mono text-lg tracking-widest uppercase"
                maxLength={8}
                autoFocus
              />
              <p className="text-xs text-muted-foreground text-center">
                Demande le code au propriétaire de l'espace
              </p>
            </div>

            <Button onClick={handleJoin} disabled={loading || !inviteCode.trim()} className="w-full shadow-glow">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Rejoindre l'espace"}
            </Button>

            <button
              onClick={() => setIntent("choose")}
              className="block w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Retour
            </button>
          </div>
        )}

        {/* ── CREATE ── */}
        {intent === "create" && (
          <div className="card-premium border border-border/50 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center">
                <Zap className="w-4.5 h-4.5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-sm">Créer ton espace</p>
                <p className="text-xs text-muted-foreground">Choisis ton plan à l'étape suivante · Annulable à tout moment</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Nom de l'espace</Label>
              <Input
                id="name"
                placeholder="Ex: Studio Visuel, Agence Moovio..."
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                autoFocus
              />
            </div>

            {/* What's included */}
            <div className="bg-muted/30 rounded-lg p-3 space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground mb-2">Ce qui est inclus</p>
              {[
                "Dashboard complet + IA intégrée",
                "Jusqu'à 2 membres dans ton équipe",
                "Google Calendar & Stripe sync",
                "Tous les conseillers IA (Sales, Category, Automation...)",
              ].map((f) => (
                <div key={f} className="flex items-center gap-2 text-xs text-foreground">
                  <div className="w-1 h-1 rounded-full bg-primary flex-shrink-0" />
                  {f}
                </div>
              ))}
            </div>

            <Button onClick={handleCreate} disabled={loading || !workspaceName.trim()} className="w-full shadow-glow gap-2">
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Redirection vers Stripe...</>
                : <>Continuer vers le paiement <ArrowRight className="w-4 h-4" /></>
              }
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              Paiement sécurisé via Stripe. Aucune carte requise pour l'essai.
            </p>

            <button
              onClick={() => setIntent("choose")}
              className="block w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Retour
            </button>
          </div>
        )}

        {/* Logged in as */}
        <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
          <span>Connecté en tant que <span className="text-foreground">{userEmail}</span></span>
          <button onClick={handleLogout} className="flex items-center gap-1 hover:text-destructive transition-colors">
            <LogOut className="w-3 h-3" /> Déconnexion
          </button>
        </div>
      </div>
    </div>
  );
}
