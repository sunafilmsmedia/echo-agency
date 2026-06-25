import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EchoTintedLogo } from "@/components/EchoTintedLogo";

// Generate a random 6-char invite code
function generateCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Generate a URL-friendly slug from workspace name
function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "-" + Math.random().toString(36).substring(2, 6);
}

export default function WorkspaceSuccess() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const workspaceName = params.get("name") || "Mon Agence";

  const [status, setStatus] = useState<"creating" | "done" | "error">("creating");
  const [inviteCode, setInviteCode] = useState("");

  useEffect(() => {
    createWorkspace();
  }, []);

  const createWorkspace = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login", { replace: true }); return; }

      // Check if workspace already exists for this user (avoid duplicate on refresh)
      const { data: existingMember } = await supabase
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (existingMember?.workspace_id) {
        navigate("/dashboard", { replace: true });
        return;
      }

      const code = generateCode();
      const slug = slugify(workspaceName);

      // Create workspace
      const { data: workspace, error: wsError } = await supabase
        .from("workspaces")
        .insert({
          name: workspaceName,
          slug,
          owner_id: user.id,
          invite_code: code,
          subscription_status: "active",
          plan: "pro",
          max_members: 3,
        })
        .select()
        .single();

      if (wsError) throw wsError;

      // Add owner as member
      const { error: memberError } = await supabase
        .from("workspace_members")
        .insert({ workspace_id: workspace.id, user_id: user.id, role: "owner" });

      if (memberError) throw memberError;

      setInviteCode(code);
      setStatus("done");
    } catch (e) {
      console.error(e);
      setStatus("error");
    }
  };

  if (status === "creating") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <EchoTintedLogo color="#7c3aed" pose="thinking" size="w-24 h-24" glow />
          <p className="text-sm text-muted-foreground">Création de ton espace...</p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-sm">
          <EchoTintedLogo color="#dc2626" pose="thinking" size="w-20 h-20" />
          <p className="text-foreground font-semibold">Une erreur s'est produite</p>
          <p className="text-sm text-muted-foreground">Ton paiement a bien été traité. Contacte le support pour activer ton espace.</p>
          <Button onClick={() => navigate("/workspace-setup")}>Réessayer</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-glow pointer-events-none" />
      <div className="relative z-10 w-full max-w-md text-center space-y-6">
        {/* Success: Echo jumping for joy */}
        <div className="flex items-center justify-center gap-2">
          <EchoTintedLogo color="#10b981" pose="jumping" size="w-28 h-28" glow />
          <div className="w-12 h-12 rounded-full bg-emerald-400/15 border border-emerald-400/30 flex items-center justify-center -ml-4">
            <Check className="w-6 h-6 text-emerald-400" />
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-foreground mb-1">Ton espace est prêt! 🎉</h1>
          <p className="text-muted-foreground text-sm">"{workspaceName}" a été créé avec succès.</p>
        </div>

        {/* Invite code */}
        <div className="card-premium border border-border/50 space-y-3">
          <p className="text-sm font-semibold text-foreground">Ton code d'invitation</p>
          <p className="text-xs text-muted-foreground">Partage ce code avec les membres de ton équipe (max 3)</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-muted/50 rounded-lg py-3 text-center font-mono text-2xl font-bold text-primary tracking-widest">
              {inviteCode}
            </div>
            <Button
              size="icon"
              variant="outline"
              className="h-12 w-12 flex-shrink-0"
              onClick={() => { navigator.clipboard.writeText(inviteCode); toast.success("Code copié!"); }}
            >
              <Copy className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Ils pourront entrer ce code sur <strong>echo.app/workspace-setup</strong>
          </p>
        </div>

        <Button className="w-full shadow-glow" onClick={() => navigate("/dashboard", { replace: true })}>
          Accéder à mon dashboard →
        </Button>
      </div>
    </div>
  );
}
