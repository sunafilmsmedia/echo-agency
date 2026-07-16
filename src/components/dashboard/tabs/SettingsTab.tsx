import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Save, Lock, Palette, Copy, ExternalLink, Zap, Calendar, Check, Sun, Moon, Presentation, Eye, EyeOff, Mail, Bell } from "lucide-react";
import { useAgencySettings, useUpdateAgencySettings } from "@/hooks/usePortal";
import { useIntegration, useConnectIntegration, useDisconnectIntegration } from "@/hooks/useIntegrations";
import { EchoTintedLogo } from "@/components/EchoTintedLogo";
import { useTheme } from "@/hooks/useTheme";

const COLOR_PALETTE = [
  "#7c3aed", "#2563eb", "#0891b2", "#059669",
  "#ca8a04", "#ea580c", "#dc2626", "#db2777",
  "#000000", "#374151", "#9ca3af", "#ffffff",
];

function slugify(s: string): string {
  return s.toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32) || "mon-agence";
}

export function SettingsTab() {
  const { theme, setTheme } = useTheme();
  const { data: agencyData } = useAgencySettings();
  const updateAgency = useUpdateAgencySettings();

  // Branding state
  const [name, setName]           = useState("Mon Agence");
  const [slug, setSlug]           = useState("mon-agence");
  const [color, setColor]         = useState("#7c3aed");
  const [scriptGpt, setScriptGpt] = useState("");
  const [brandGuide, setBrandGuide] = useState("");
  const [gammaKey, setGammaKey]   = useState("");
  const [showGammaKey, setShowGammaKey] = useState(false);
  const [resendKey, setResendKey] = useState("");
  const [showResendKey, setShowResendKey] = useState(false);
  const [notifEmail, setNotifEmail] = useState("");
  const [notifEnabled, setNotifEnabled] = useState(true);

  useEffect(() => {
    if (!agencyData) return;
    setName(agencyData.name);
    setSlug(agencyData.slug);
    setColor(agencyData.color);
    setScriptGpt(agencyData.script_gpt_url ?? "");
    setBrandGuide(agencyData.brand_guide_url ?? "");
    setGammaKey(agencyData.gamma_api_key ?? "");
    setResendKey(agencyData.resend_api_key ?? "");
    setNotifEmail(agencyData.notification_email ?? "");
    setNotifEnabled(agencyData.notifications_enabled ?? true);
  }, [agencyData]);

  // PIN state
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  const saveBranding = () => {
    const cleanSlug = slugify(slug);
    updateAgency.mutate({
      name:            name.trim() || "Mon Agence",
      slug:            cleanSlug,
      color,
      script_gpt_url:  scriptGpt.trim() || null,
      brand_guide_url: brandGuide.trim() || null,
    }, {
      onSuccess: () => setSlug(cleanSlug),
    });
  };

  const saveGammaKey = () => {
    updateAgency.mutate({ gamma_api_key: gammaKey.trim() || null }, {
      onSuccess: () => toast.success(gammaKey.trim() ? "Clé Gamma sauvegardée" : "Clé Gamma retirée"),
    });
  };

  const saveNotifications = () => {
    updateAgency.mutate({
      resend_api_key: resendKey.trim() || null,
      notification_email: notifEmail.trim() || null,
      notifications_enabled: notifEnabled,
    }, {
      onSuccess: () => toast.success("Notifications sauvegardées"),
    });
  };

  // Calendly (and future integrations) — OAuth 2.0
  const calendlyIntegration = useIntegration("calendly");
  const connectIntegration = useConnectIntegration();
  const disconnectIntegration = useDisconnectIntegration();

  // Show a toast when the user comes back from the OAuth callback
  useEffect(() => {
    const url = new URL(window.location.href);
    const connected = url.searchParams.get("integration_connected");
    const errorMsg  = url.searchParams.get("integration_error");
    if (connected) {
      toast.success(`✓ ${connected} connecté`);
      url.searchParams.delete("integration_connected");
      window.history.replaceState({}, "", url.toString());
    } else if (errorMsg) {
      toast.error(`Erreur OAuth : ${errorMsg}`);
      url.searchParams.delete("integration_error");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  const savePin = () => {
    if (newPin.length < 4) { toast.error("Le PIN doit contenir au moins 4 chiffres"); return; }
    if (newPin !== confirmPin) { toast.error("Les PINs ne correspondent pas"); return; }
    localStorage.setItem("accessPin", newPin);
    setNewPin(""); setConfirmPin("");
    toast.success("PIN mis à jour");
  };

  const publicUrl = `${window.location.origin}/clients/${slug}`;

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      {/* ─────────────── Branding ─────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Palette className="w-4 h-4 text-primary" /> Branding de l'agence
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Logo preview + Name */}
          <div className="flex items-center gap-4">
            <EchoTintedLogo color={color} size="w-16 h-16" rounded="rounded-2xl" glow />
            <div className="flex-1 space-y-1">
              <Label className="text-xs text-muted-foreground">Nom de l'agence</Label>
              <Input value={name} onChange={(e) => { setName(e.target.value); setSlug(slugify(e.target.value)); }}
                placeholder="Ex: Suna Films Media" className="text-base font-semibold" />
            </div>
          </div>

          {/* Slug + public URL */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">URL publique pour tes clients</Label>
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center gap-1 px-3 py-2 rounded-md bg-muted/30 border border-border/50">
                <span className="text-xs text-muted-foreground font-mono">{window.location.origin}/clients/</span>
                <input value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase())}
                  className="flex-1 bg-transparent outline-none text-sm font-mono text-foreground" />
              </div>
              <Button size="icon" variant="outline" className="h-9 w-9"
                onClick={() => { navigator.clipboard.writeText(publicUrl); toast.success("Lien copié"); }}
                title="Copier le lien public">
                <Copy className="w-3.5 h-3.5" />
              </Button>
              <Button size="icon" variant="outline" className="h-9 w-9"
                onClick={() => window.open(publicUrl, "_blank")}
                title="Aperçu de la page publique">
                <ExternalLink className="w-3.5 h-3.5" />
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Tes clients verront « Accède à ton profil client {name} » sur cette page.
            </p>
          </div>

          {/* Color */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Couleur de marque</Label>
            <div className="flex items-center gap-3">
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)}
                className="w-12 h-10 rounded-md cursor-pointer border-0 bg-transparent" />
              <code className="text-xs text-muted-foreground font-mono">{color.toUpperCase()}</code>
              <div className="flex-1" />
              <div className="grid grid-cols-12 gap-1.5">
                {COLOR_PALETTE.map((c) => (
                  <button key={c} onClick={() => setColor(c)}
                    className={`w-6 h-6 rounded-md border-2 transition-transform ${color === c ? "scale-110 border-foreground" : "border-border/40 hover:scale-105"}`}
                    style={{ background: c }} />
                ))}
              </div>
            </div>
          </div>

          {/* Script GPT */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Lien GPT — Machine à scripts vidéo</Label>
            <Input value={scriptGpt} onChange={(e) => setScriptGpt(e.target.value)}
              placeholder="https://chatgpt.com/g/..." className="text-sm font-mono" />
            <p className="text-[10px] text-muted-foreground">
              Apparaîtra dans le portail de chaque client.
            </p>
          </div>

          {/* Brand guide */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">URL — Guide privé pour tes clients</Label>
            <Input value={brandGuide} onChange={(e) => setBrandGuide(e.target.value)}
              placeholder="https://tonsite.com/guide" className="text-sm font-mono" />
            <p className="text-[10px] text-muted-foreground">
              Document exclusif partagé dans le portail (stratégies, frameworks, etc.).
            </p>
          </div>

          <Button onClick={saveBranding} disabled={updateAgency.isPending} className="w-full gap-2"
            style={{ background: color, color: "white" }}>
            <Save className="w-4 h-4" /> Enregistrer le branding
          </Button>
        </CardContent>
      </Card>

      {/* ─────────────── Intégrations ─────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="w-4 h-4 text-primary" /> Intégrations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* OAuth integrations */}
          <IntegrationRow
            icon={<Calendar className="w-4 h-4" />}
            name="Calendly"
            description="Compte automatiquement tes RDV/semaine."
            provider="calendly"
            connected={!!calendlyIntegration.data}
            accountLabel={calendlyIntegration.data?.metadata?.user_email as string | undefined}
            onConnect={() => connectIntegration.mutate("calendly")}
            onDisconnect={() => disconnectIntegration.mutate("calendly")}
            loading={connectIntegration.isPending || disconnectIntegration.isPending}
          />
          <IntegrationRow
            icon={<Calendar className="w-4 h-4" />}
            name="Google Calendar"
            description="Synchronise tes tournages et meetings."
            provider="google_calendar"
            connected={false}
            comingSoon
            onConnect={() => {}}
            onDisconnect={() => {}}
            loading={false}
          />
          <IntegrationRow
            icon={<Mail className="w-4 h-4" />}
            name="Gmail"
            description="Envoie les emails de suivi depuis ton adresse."
            provider="gmail"
            connected={false}
            comingSoon
            onConnect={() => {}}
            onDisconnect={() => {}}
            loading={false}
          />

          {/* Gamma — with API key input */}
          <div className="rounded-lg border border-border/40 bg-card hover:bg-muted/10 transition-colors">
            <div className="flex items-center gap-3 p-3">
              <div className="w-9 h-9 rounded-lg bg-muted/30 flex items-center justify-center flex-shrink-0">
                <Presentation className="w-4 h-4 text-fuchsia-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">Gamma AI</p>
                  <a href="https://gamma.app/account/api-keys" target="_blank" rel="noopener noreferrer"
                    className="text-[10px] text-primary hover:underline flex items-center gap-0.5">
                    Obtenir ma clé <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
                <p className="text-[11px] text-muted-foreground truncate">Génère automatiquement des soumissions clients propulsées par IA</p>
              </div>
              {agencyData?.gamma_api_key ? (
                <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-500/10">
                  <Check className="w-3 h-3" /> Connecté
                </span>
              ) : (
                <span className="text-[10px] font-semibold text-muted-foreground px-2 py-0.5 rounded-full bg-muted/30">
                  Non connecté
                </span>
              )}
            </div>
            {/* Key input row */}
            <div className="border-t border-border/30 p-3 space-y-2">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                Clé API Gamma
              </Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showGammaKey ? "text" : "password"}
                    value={gammaKey}
                    onChange={(e) => setGammaKey(e.target.value)}
                    placeholder="sk-gamma-…"
                    className="text-xs font-mono pr-9"
                  />
                  <button type="button" onClick={() => setShowGammaKey((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showGammaKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <Button onClick={saveGammaKey} size="sm" className="gap-1.5" disabled={updateAgency.isPending}>
                  <Save className="w-3.5 h-3.5" /> Enregistrer
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                La clé est stockée chiffrée dans ta base Supabase et n'est jamais exposée au frontend.
                Chaque agence utilise sa propre clé.
              </p>
            </div>
          </div>

          <p className="text-[10px] text-muted-foreground italic pt-1">
            Les intégrations Stripe et Calendar sont débloquées avec les plans <span className="text-primary font-semibold">Pro (27$/mo)</span> et <span className="text-primary font-semibold">Business (57$/mo)</span>.
            Gamma est disponible sur tous les plans (clé requise).
          </p>
        </CardContent>
      </Card>

      {/* ─────────────── Notifications email ─────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="w-4 h-4 text-primary" /> Notifications email
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Reçois un email chaque fois qu'un client ajoute un message dans son carnet d'idées. Utilise <a href="https://resend.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Resend</a> (3 000 emails gratuits/mois).
          </p>

          {/* Toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-border/40 bg-muted/10">
            <div className="flex items-start gap-2.5">
              <Mail className="w-4 h-4 text-primary mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-foreground">Emails de notification</p>
                <p className="text-[11px] text-muted-foreground">Nouveaux messages dans les carnets clients</p>
              </div>
            </div>
            <button onClick={() => setNotifEnabled((v) => !v)}
              className={`relative w-11 h-6 rounded-full transition-colors ${notifEnabled ? "bg-primary" : "bg-muted"}`}>
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${notifEnabled ? "translate-x-5" : ""}`} />
            </button>
          </div>

          {/* Notification email */}
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              Email de destination
            </Label>
            <Input type="email" value={notifEmail} onChange={(e) => setNotifEmail(e.target.value)}
              placeholder="ton-email@exemple.com" className="text-sm" disabled={!notifEnabled} />
            <p className="text-[10px] text-muted-foreground">L'email où arrivent les notifications.</p>
          </div>

          {/* Resend API key */}
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-2">
              Clé API Resend
              <a href="https://resend.com/api-keys" target="_blank" rel="noopener noreferrer"
                className="text-[10px] normal-case font-normal text-primary hover:underline flex items-center gap-0.5">
                Obtenir ma clé <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input type={showResendKey ? "text" : "password"} value={resendKey}
                  onChange={(e) => setResendKey(e.target.value)}
                  placeholder="re_..." className="text-xs font-mono pr-9" disabled={!notifEnabled} />
                <button type="button" onClick={() => setShowResendKey((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showResendKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          <Button onClick={saveNotifications} disabled={updateAgency.isPending} className="w-full gap-2">
            <Save className="w-4 h-4" /> Enregistrer les notifications
          </Button>

          {agencyData?.resend_api_key && agencyData?.notification_email && agencyData?.notifications_enabled !== false && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-500/8 border border-emerald-500/25">
              <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-foreground">Notifications actives — les nouveaux messages seront envoyés à <span className="font-semibold">{agencyData.notification_email}</span></p>
            </div>
          )}

          <p className="text-[10px] text-muted-foreground italic">
            Note : Resend requiert un domaine vérifié pour envoyer depuis ton adresse. En attendant, les emails partent depuis <code className="text-foreground">onboarding@resend.dev</code>.
          </p>
        </CardContent>
      </Card>


      {/* ─────────────── Apparence ─────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            {theme === "dark" ? <Moon className="w-4 h-4 text-primary" /> : <Sun className="w-4 h-4 text-primary" />} Apparence
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setTheme("dark")}
              className={`rounded-xl border-2 p-4 text-left transition-all ${theme === "dark" ? "border-primary bg-primary/5" : "border-border/50 hover:border-primary/40"}`}>
              <div className="flex items-center gap-2 mb-3">
                <Moon className="w-4 h-4" />
                <span className="text-sm font-semibold">Mode sombre</span>
                {theme === "dark" && <Check className="w-3.5 h-3.5 ml-auto text-primary" />}
              </div>
              {/* Preview */}
              <div className="rounded-md h-16 bg-[hsl(240_7%_6%)] border border-[hsl(240_5%_18%)] flex items-center gap-1.5 px-2">
                <div className="w-3 h-3 rounded-full" style={{ background: "hsl(158 100% 72%)" }} />
                <div className="flex-1 space-y-1">
                  <div className="h-1.5 w-8 rounded-full bg-[hsl(210_20%_92%)]/40" />
                  <div className="h-1.5 w-12 rounded-full bg-[hsl(210_20%_92%)]/20" />
                </div>
              </div>
            </button>
            <button onClick={() => setTheme("light")}
              className={`rounded-xl border-2 p-4 text-left transition-all ${theme === "light" ? "border-primary bg-primary/5" : "border-border/50 hover:border-primary/40"}`}>
              <div className="flex items-center gap-2 mb-3">
                <Sun className="w-4 h-4" />
                <span className="text-sm font-semibold">Mode clair</span>
                {theme === "light" && <Check className="w-3.5 h-3.5 ml-auto text-primary" />}
              </div>
              {/* Preview */}
              <div className="rounded-md h-16 bg-white border border-[hsl(240_10%_88%)] flex items-center gap-1.5 px-2">
                <div className="w-3 h-3 rounded-full" style={{ background: "hsl(158 65% 40%)" }} />
                <div className="flex-1 space-y-1">
                  <div className="h-1.5 w-8 rounded-full bg-[hsl(240_10%_12%)]/70" />
                  <div className="h-1.5 w-12 rounded-full bg-[hsl(240_10%_12%)]/40" />
                </div>
              </div>
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-3">
            Ton choix est sauvegardé pour ce navigateur.
          </p>
        </CardContent>
      </Card>

      {/* ─────────────── PIN ─────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Lock className="w-4 h-4 text-primary" /> Protection PIN
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            PIN actuel : {localStorage.getItem("accessPin") ? "****" : "1234 (défaut)"}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Nouveau PIN</Label>
              <Input type="password" placeholder="Nouveau PIN" value={newPin}
                onChange={(e) => setNewPin(e.target.value)} maxLength={8} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Confirmer le PIN</Label>
              <Input type="password" placeholder="Confirmer" value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)} maxLength={8} />
            </div>
          </div>
          <Button onClick={savePin} variant="outline" className="w-full gap-2">
            <Save className="w-4 h-4" /> Enregistrer le PIN
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function IntegrationRow({
  icon, name, description, connected, accountLabel, onConnect, onDisconnect, loading, comingSoon,
}: {
  icon: React.ReactNode;
  name: string;
  description: string;
  provider: string;
  connected: boolean;
  accountLabel?: string;
  onConnect: () => void;
  onDisconnect: () => void;
  loading: boolean;
  comingSoon?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-border/40 bg-card hover:bg-muted/10 transition-colors">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${connected ? "bg-emerald-500/15 text-emerald-400" : "bg-muted/30"}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-foreground">{name}</p>
          {comingSoon && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted/50 text-muted-foreground font-bold uppercase tracking-wider">
              Bientôt
            </span>
          )}
          {connected && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-bold uppercase tracking-wider">
              Connecté
            </span>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground truncate">
          {connected && accountLabel ? `Compte : ${accountLabel}` : description}
        </p>
      </div>
      {comingSoon ? (
        <Button size="sm" variant="outline" className="text-xs h-7" disabled>Bientôt</Button>
      ) : connected ? (
        <Button size="sm" variant="ghost" className="text-xs h-7 text-destructive hover:text-destructive"
          onClick={onDisconnect} disabled={loading}>
          Déconnecter
        </Button>
      ) : (
        <Button size="sm" className="text-xs h-7 gap-1.5" onClick={onConnect} disabled={loading}>
          {loading ? "…" : <><ExternalLink className="w-3 h-3" /> Connecter</>}
        </Button>
      )}
    </div>
  );
}
