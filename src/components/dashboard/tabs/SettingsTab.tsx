import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Save, Lock, Palette, Copy, ExternalLink, Zap, Calendar, Check } from "lucide-react";
import { useAgencySettings, useUpdateAgencySettings } from "@/hooks/usePortal";
import { EchoTintedLogo } from "@/components/EchoTintedLogo";

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
  const { data: agencyData } = useAgencySettings();
  const updateAgency = useUpdateAgencySettings();

  // Branding state
  const [name, setName]           = useState("Mon Agence");
  const [slug, setSlug]           = useState("mon-agence");
  const [color, setColor]         = useState("#7c3aed");
  const [scriptGpt, setScriptGpt] = useState("");
  const [brandGuide, setBrandGuide] = useState("");

  useEffect(() => {
    if (!agencyData) return;
    setName(agencyData.name);
    setSlug(agencyData.slug);
    setColor(agencyData.color);
    setScriptGpt(agencyData.script_gpt_url ?? "");
    setBrandGuide(agencyData.brand_guide_url ?? "");
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
          <IntegrationRow
            icon={<Zap className="w-4 h-4 text-violet-400" />}
            name="Stripe"
            description="Connecte ton compte Stripe pour tracker ton revenu en temps réel."
            status="connected"
            badge="Plan Pro+"
          />
          <IntegrationRow
            icon={<Calendar className="w-4 h-4 text-blue-400" />}
            name="Google Calendar"
            description="Sync bidirectionnel avec ton agenda Google."
            status="connected"
            badge="Plan Pro+"
          />
          <p className="text-[10px] text-muted-foreground italic pt-1">
            Les intégrations sont débloquées avec les plans <span className="text-primary font-semibold">Pro (27$/mo)</span> et <span className="text-primary font-semibold">Business (57$/mo)</span>.
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

function IntegrationRow({ icon, name, description, status, badge }: {
  icon: React.ReactNode; name: string; description: string; status: "connected" | "disconnected"; badge?: string;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-border/40 bg-card hover:bg-muted/10 transition-colors">
      <div className="w-9 h-9 rounded-lg bg-muted/30 flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-foreground">{name}</p>
          {badge && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary font-bold uppercase tracking-wider">{badge}</span>}
        </div>
        <p className="text-[11px] text-muted-foreground truncate">{description}</p>
      </div>
      {status === "connected" ? (
        <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-500/10">
          <Check className="w-3 h-3" /> Connecté
        </span>
      ) : (
        <Button size="sm" variant="outline" className="text-xs h-7">Connecter</Button>
      )}
    </div>
  );
}
