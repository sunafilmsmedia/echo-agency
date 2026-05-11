import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";

interface PinDialogProps {
  open: boolean;
  onSuccess: () => void;
  onClose: () => void;
}

export function PinDialog({ open, onSuccess, onClose }: PinDialogProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const stored = localStorage.getItem("accessPin") || "1234";
    if (pin === stored) {
      setPin("");
      setError(false);
      onSuccess();
    } else {
      setError(true);
      setPin("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setPin(""); setError(false); onClose(); } }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary" />
            Section Protégée
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              type="password"
              placeholder="Entrez votre PIN"
              value={pin}
              onChange={(e) => { setPin(e.target.value); setError(false); }}
              className={error ? "border-destructive" : ""}
              autoFocus
              maxLength={8}
            />
            {error && <p className="text-xs text-destructive mt-1">PIN incorrect</p>}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" className="flex-1" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" className="flex-1">
              Déverrouiller
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
