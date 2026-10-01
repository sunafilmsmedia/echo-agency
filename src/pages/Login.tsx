import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, Mail, ArrowLeft } from "lucide-react";
import { requestLoginCode } from "@/hooks/useTeamAccess";
import { EchoTintedLogo } from "@/components/EchoTintedLogo";

// ─── Connexion employé : code à 6 chiffres reçu par courriel ──────────────────
function CodeLogin({ initialEmail, onDone, onBack }: { initialEmail: string; onDone: () => void; onBack: () => void }) {
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [loading, setLoading] = useState(false);

  const sendCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      await requestLoginCode(email);
      setStep("code");
      toast.success("Code envoyé — vérifie tes courriels");
    } catch (err: any) {
      toast.error(err?.code === "NOT_INVITED"
        ? "Ce courriel n'a pas accès. Demande au responsable de l'agence de t'ajouter."
        : err?.message ?? "Erreur lors de l'envoi du code");
    } finally {
      setLoading(false);
    }
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: code.trim(), type: "email" });
    setLoading(false);
    if (error) toast.error("Code invalide ou expiré");
    else onDone();
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-semibold text-foreground flex items-center gap-2"><Mail className="w-4 h-4 text-primary" /> Connexion par code</p>
        <p className="text-xs text-muted-foreground mt-1">
          {step === "email"
            ? "Entre ton courriel : on t'envoie un code à 6 chiffres. Pas de mot de passe."
            : <>Code envoyé à <span className="text-foreground font-medium">{email}</span>.</>}
        </p>
      </div>

      {step === "email" ? (
        <form onSubmit={sendCode} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code-email">Email</Label>
            <Input id="code-email" type="email" placeholder="vous@agence.com" value={email}
              onChange={(e) => setEmail(e.target.value)} autoComplete="email" autoFocus required />
          </div>
          <Button type="submit" className="w-full shadow-glow" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Recevoir mon code"}
          </Button>
        </form>
      ) : (
        <form onSubmit={verify} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="otp">Code</Label>
            <Input id="otp" inputMode="numeric" autoComplete="one-time-code" placeholder="123456" maxLength={10}
              value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} autoFocus required
              className="text-center font-mono text-xl tracking-[0.4em]" />
          </div>
          <Button type="submit" className="w-full shadow-glow" disabled={loading || code.length < 6}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Se connecter"}
          </Button>
          <button type="button" onClick={() => sendCode()} disabled={loading}
            className="w-full text-xs text-muted-foreground hover:text-primary transition-colors">
            Je n'ai rien reçu — renvoyer un code
          </button>
        </form>
      )}

      <button type="button" onClick={onBack}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors">
        <ArrowLeft className="w-3 h-3" /> Connexion avec mot de passe
      </button>
    </div>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const intent = params.get("intent") || "";
  // If there's an intent (join/create), route through workspace-setup. Otherwise go straight to dashboard.
  const redirect = params.get("redirect") || (intent ? `/workspace-setup?intent=${intent}` : "/dashboard");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"password" | "code">(params.get("mode") === "password" ? "password" : "code");

  // Redirect if already logged in
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate(redirect, { replace: true });
    });
  }, [navigate, redirect]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      navigate(redirect, { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Background glow */}
      <div className="absolute inset-0 bg-gradient-glow pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <EchoTintedLogo color="#7c3aed" pose="waving" size="w-12 h-12" />
            <span className="text-2xl font-bold text-foreground">Echo</span>
          </div>
          <p className="text-muted-foreground text-sm">Connectez-vous à votre espace agency</p>
        </div>

        {/* Card */}
        <div className="card-premium border border-border/50 space-y-6">
          {mode === "code" ? (
            <CodeLogin initialEmail={params.get("email") ?? ""} onDone={() => navigate(redirect, { replace: true })} onBack={() => setMode("password")} />
          ) : (<>
          {/* Email/Password form */}
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="vous@agence.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full shadow-glow" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Se connecter"}
            </Button>
          </form>

          {/* Footer links */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <a href="#" className="hover:text-primary transition-colors">Mot de passe oublié ?</a>
            <Link to="/signup" className="hover:text-primary transition-colors">Créer un compte</Link>
          </div>

          <Button type="button" variant="ghost" className="w-full gap-2 text-xs text-muted-foreground" onClick={() => setMode("code")}>
            <Mail className="w-3.5 h-3.5" /> Se connecter avec un code par courriel
          </Button>
          </>)}
        </div>
      </div>
    </div>
  );
}
