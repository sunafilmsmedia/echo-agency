import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Lock, ArrowRight, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAgencySettingsBySlug, useResolveAccessCode } from "@/hooks/usePortal";
import { supabase } from "@/integrations/supabase/client";

export default function ClientLanding() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { data: agency, isLoading } = useAgencySettingsBySlug(slug);
  const [code, setCode]       = useState("");
  const [error, setError]     = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!agency) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
        <div className="text-center max-w-sm space-y-3">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-muted/40 flex items-center justify-center">
            <Lock className="w-6 h-6 text-muted-foreground" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Agence introuvable</h1>
          <p className="text-sm text-muted-foreground">
            Le lien <span className="font-mono">/clients/{slug}</span> ne correspond à aucune agence enregistrée.
          </p>
        </div>
      </div>
    );
  }

  const handleSubmit = async () => {
    if (!code.trim()) return;
    setError("");
    setSubmitting(true);
    const upperCode = code.trim().toUpperCase();
    const { data, error: qError } = await supabase
      .from("client_portal_codes")
      .select("access_code")
      .eq("access_code", upperCode)
      .maybeSingle();
    setSubmitting(false);
    if (qError) { setError("Erreur réseau. Réessaie."); return; }
    if (!data) { setError("Code introuvable. Vérifie avec ton agence."); return; }
    navigate(`/portail?code=${upperCode}`);
  };

  const initials = agency.name.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6 relative">
      <style>{`
        .acc-c    { color: ${agency.color}; }
        .acc-bg   { background-color: ${agency.color}; }
        .acc-soft { background-color: ${agency.color}1a; }
        .acc-border { border-color: ${agency.color}66; }
        .acc-grad { background: linear-gradient(135deg, ${agency.color}, ${agency.color}cc); }
      `}</style>

      <div className="fixed inset-0 pointer-events-none"
        style={{ background: `radial-gradient(circle at 50% 0%, ${agency.color}15, transparent 70%)` }} />

      <div className="relative w-full max-w-md space-y-6">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 mx-auto rounded-3xl acc-grad flex items-center justify-center shadow-2xl"
            style={{ boxShadow: `0 0 40px ${agency.color}40` }}>
            <span className="text-2xl font-bold text-white">{initials}</span>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">{agency.name}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Accède à ton profil client <span className="font-semibold acc-c">{agency.name}</span>
            </p>
          </div>
        </div>

        <div className="rounded-2xl border acc-border bg-card p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Lock className="w-3 h-3" /> Code d'accès personnel
            </label>
            <Input
              autoFocus
              placeholder="ABC123"
              value={code}
              onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              className="text-center font-mono text-lg tracking-widest uppercase h-12"
              maxLength={8}
              style={{ borderColor: error ? "#ef4444" : undefined }}
            />
            {error && <p className="text-xs text-rose-400">{error}</p>}
          </div>
          <Button onClick={handleSubmit} disabled={submitting || !code.trim()}
            className="w-full h-11 acc-bg text-white hover:opacity-90 border-0 gap-2"
            style={{ boxShadow: `0 4px 24px ${agency.color}30` }}>
            {submitting
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <>Se connecter <ArrowRight className="w-4 h-4" /></>
            }
          </Button>
        </div>

        <div className="text-center text-xs text-muted-foreground space-y-1">
          <p>Pas encore de code? Contacte ton équipe {agency.name}.</p>
        </div>

        <div className="text-center pt-4">
          <p className="text-[10px] text-muted-foreground/70 inline-flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5" />
            Propulsé par <span className="font-semibold text-muted-foreground">Echo</span>
          </p>
        </div>
      </div>
    </div>
  );
}
