import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Save, Lock, Link } from "lucide-react";

const GPT_FIELDS = [
  { key: "scaling",      label: "Scaling Advisor" },
  { key: "adsScripting", label: "Ads Scripting" },
  { key: "adsStatique",  label: "Ads Statique" },
  { key: "contentBrand", label: "Personal Brand Strategist" },
  { key: "contentIdeas", label: "Content Ideas Builder" },
  { key: "helper",       label: "Little Helper / Feedback" },
];

export function SettingsTab() {
  const [gptLinks, setGptLinks] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem("gptLinks") || "{}"); }
    catch { return {}; }
  });

  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  const saveGptLinks = () => {
    localStorage.setItem("gptLinks", JSON.stringify(gptLinks));
    toast.success("Liens GPT sauvegardés");
  };

  const savePin = () => {
    if (newPin.length < 4) {
      toast.error("Le PIN doit contenir au moins 4 chiffres");
      return;
    }
    if (newPin !== confirmPin) {
      toast.error("Les PINs ne correspondent pas");
      return;
    }
    localStorage.setItem("accessPin", newPin);
    setNewPin("");
    setConfirmPin("");
    toast.success("PIN mis à jour");
  };

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      {/* GPT Links */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Link className="w-4 h-4 text-primary" /> Liens GPT Advisors
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {GPT_FIELDS.map(({ key, label }) => (
            <div key={key} className="space-y-1">
              <Label className="text-xs text-muted-foreground">{label}</Label>
              <Input
                placeholder={`https://chatgpt.com/g/...`}
                value={gptLinks[key] || ""}
                onChange={(e) => setGptLinks({ ...gptLinks, [key]: e.target.value })}
              />
            </div>
          ))}
          <Button onClick={saveGptLinks} className="w-full gap-2">
            <Save className="w-4 h-4" /> Sauvegarder les liens
          </Button>
        </CardContent>
      </Card>

      {/* PIN */}
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
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Nouveau PIN</Label>
            <Input
              type="password"
              placeholder="Nouveau PIN"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value)}
              maxLength={8}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Confirmer le PIN</Label>
            <Input
              type="password"
              placeholder="Confirmer"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value)}
              maxLength={8}
            />
          </div>
          <Button onClick={savePin} variant="outline" className="w-full gap-2">
            <Save className="w-4 h-4" /> Enregistrer le PIN
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
