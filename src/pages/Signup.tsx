import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, KeyRound } from "lucide-react";
import { EchoTintedLogo } from "@/components/EchoTintedLogo";

export default function Signup() {
  const navigate = useNavigate();

  const [fullName, setFullName]   = useState("");
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]     = useState(false);

  // Si déjà loggué → dashboard
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate("/dashboard", { replace: true });
    });
  }, [navigate]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !password || !inviteCode.trim()) {
      toast.error("Tous les champs sont requis.");
      return;
    }
    if (password.length < 8) {
      toast.error("Mot de passe : 8 caractères minimum.");
      return;
    }
    setLoading(true);

    // 1) Vérifie que le code d'invitation existe (case-insensitive)
    const normalizedCode = inviteCode.trim().toUpperCase();
    const { data: agency, error: agencyErr } = await supabase
      .from("agency_settings")
      .select("id, name")
      .eq("invite_code", normalizedCode)
      .maybeSingle();

    if (agencyErr || !agency) {
      setLoading(false);
      toast.error("Code d'invitation invalide. Contacte l'admin de l'agence pour le récupérer.");
      return;
    }

    // 2) Crée le compte auth avec le nom en metadata
    const { error: signupErr } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          agency_id: agency.id,
        },
      },
    });

    setLoading(false);

    if (signupErr) {
      toast.error(signupErr.message);
      return;
    }

    toast.success(`Compte créé — bienvenue chez ${agency.name} !`);
    // Selon la config Supabase (confirm email on/off), on peut être auto-loggué ou non.
    // Dans les 2 cas, la redirection vers /login couvre les cas.
    setTimeout(() => navigate("/dashboard", { replace: true }), 800);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-glow pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <EchoTintedLogo color="#7c3aed" pose="waving" size="w-12 h-12" />
            <span className="text-2xl font-bold text-foreground">Echo</span>
          </div>
          <p className="text-muted-foreground text-sm">Rejoindre un espace agency avec un code d'invitation</p>
        </div>

        <div className="card-premium border border-border/50 space-y-5">
          <form onSubmit={handleSignup} className="space-y-4">
            {/* Nom */}
            <div className="space-y-2">
              <Label htmlFor="fullName">Prénom & nom</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Josué Molano Uribe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
                required
              />
            </div>

            {/* Email */}
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

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe (min. 8 caractères)</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Invite Code */}
            <div className="space-y-2">
              <Label htmlFor="inviteCode" className="flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-primary" />
                Code d'invitation
              </Label>
              <Input
                id="inviteCode"
                type="text"
                placeholder="ABC123"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                className="font-mono tracking-widest uppercase text-center"
                maxLength={8}
                required
              />
              <p className="text-[10px] text-muted-foreground">
                Fourni par l'admin de ton agence.
              </p>
            </div>

            <Button type="submit" className="w-full shadow-glow" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Créer mon compte"}
            </Button>
          </form>

          <div className="text-center text-xs text-muted-foreground">
            Déjà un compte ?{" "}
            <Link to="/login" className="text-primary hover:underline">Se connecter</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
