import { useState } from "react";
import { useClients, useCreateClient, useUpdateClient, useDeleteClient, useUpdateClientStatus } from "@/hooks/useClients";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { formatCurrency, formatDate, getContractEndDate, monthsUntil } from "@/lib/utils";
import { Plus, Pencil, Trash2, ChevronDown, Video } from "lucide-react";
import type { Client, ClientStatus } from "@/integrations/supabase/client";

// ─── Status config ────────────────────────────────────────────
const STATUS_CONFIG: Record<ClientStatus, { label: string; variant: any }> = {
  active:    { label: "Actif",     variant: "success" },
  pipeline:  { label: "Pipeline",  variant: "default" },
  on_hold:   { label: "En pause",  variant: "warning" },
  lost:      { label: "Perdu",     variant: "destructive" },
  completed: { label: "Complété",  variant: "secondary" },
};

// ─── Industry + Services options ──────────────────────────────
const INDUSTRY_PRESETS = [
  "Courtier immobilier",
  "Courtier hypothécaire",
];

const SERVICE_OPTIONS: { id: string; label: string; emoji: string }[] = [
  { id: "videos",     label: "Vidéos",           emoji: "🎥" },
  { id: "ai",         label: "Formulaire IA",    emoji: "🤖" },
  { id: "ads",        label: "Publicités (Ads)", emoji: "📣" },
  { id: "crm",        label: "CRM",              emoji: "🗂️" },
  { id: "setter",     label: "Setter",           emoji: "📞" },
  { id: "social",     label: "Social media",     emoji: "📱" },
  { id: "web",        label: "Site web",         emoji: "🌐" },
  { id: "seo",        label: "SEO",              emoji: "🔍" },
];

// Reusable pickers so add & edit dialogs share the same UI
function IndustryPicker({
  value, onChange,
}: { value: string; onChange: (v: string) => void }) {
  const isPreset = INDUSTRY_PRESETS.includes(value);
  const [mode, setMode] = useState<"preset" | "autre">(!value || isPreset ? "preset" : "autre");

  return (
    <div className="space-y-2">
      <Select
        value={mode === "autre" ? "__autre__" : (value || "")}
        onValueChange={(v) => {
          if (v === "__autre__") {
            setMode("autre");
            onChange("");
          } else {
            setMode("preset");
            onChange(v);
          }
        }}
      >
        <SelectTrigger><SelectValue placeholder="Choisir un domaine..." /></SelectTrigger>
        <SelectContent>
          {INDUSTRY_PRESETS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          <SelectItem value="__autre__">Autre (préciser)</SelectItem>
        </SelectContent>
      </Select>
      {mode === "autre" && (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Ex: Restaurant, E-commerce, Coach..."
        />
      )}
    </div>
  );
}

function ServicesPicker({
  value, onChange,
}: { value: string[]; onChange: (v: string[]) => void }) {
  const toggle = (id: string) => {
    onChange(value.includes(id) ? value.filter((s) => s !== id) : [...value, id]);
  };
  return (
    <div className="flex flex-wrap gap-1.5">
      {SERVICE_OPTIONS.map((opt) => {
        const active = value.includes(opt.id);
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => toggle(opt.id)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
              active
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted/30 text-muted-foreground border-border hover:border-primary/50"
            }`}
          >
            {opt.emoji} {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── ClientCard ───────────────────────────────────────────────
function ClientCard({ client, onEdit, onDelete }: { client: Client; onEdit: () => void; onDelete: () => void }) {
  const updateStatus = useUpdateClientStatus();

  const endDate = getContractEndDate(client.contract_start_date, client.contract_length_months, client.contract_end_date);
  const monthsLeft = monthsUntil(endDate);

  const contractColor =
    monthsLeft === null ? "text-muted-foreground" :
    monthsLeft <= 1 ? "text-destructive" :
    monthsLeft <= 3 ? "text-amber-400" :
    "text-emerald-400";

  // Contract elapsed % — how much of the contract duration has passed
  const contractProgress = (() => {
    if (!client.contract_start_date || !endDate) return null;
    const start = new Date(client.contract_start_date).getTime();
    const end   = new Date(endDate).getTime();
    const now   = Date.now();
    if (end <= start) return null;
    const pct = Math.round(((now - start) / (end - start)) * 100);
    return Math.max(0, Math.min(100, pct));
  })();

  const serviceIcon =
    client.notes?.includes("Content + Ads") ? "⚡" :
    client.notes?.includes("Content Only") ? "📝" :
    client.notes?.includes("Ads Only") ? "🎯" : "💼";

  const statusCfg = STATUS_CONFIG[client.status];

  return (
    <Card className="hover:border-border transition-colors">
      <CardContent className="pt-4 pb-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-sm text-foreground truncate">{client.name}</p>
            {client.industry && <p className="text-xs text-muted-foreground">{client.industry}</p>}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1">
                <Badge variant={statusCfg.variant} className="cursor-pointer">
                  {statusCfg.label} <ChevronDown className="w-3 h-3 ml-0.5" />
                </Badge>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {(Object.entries(STATUS_CONFIG) as [ClientStatus, typeof STATUS_CONFIG[ClientStatus]][]).map(([key, cfg]) => (
                <DropdownMenuItem key={key} onClick={() => updateStatus.mutate({ id: client.id, status: key })}>
                  {cfg.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Services row */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {(client.services ?? []).map((sid) => {
            const opt = SERVICE_OPTIONS.find((o) => o.id === sid);
            if (!opt) return null;
            return (
              <span key={sid} className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                {opt.emoji} {opt.label}
              </span>
            );
          })}
          {(client.services ?? []).length === 0 && (
            <span className="text-sm">{serviceIcon}</span>
          )}
          {client.videos_per_month > 0 && (client.services ?? []).includes("videos") && (
            <span className="text-[10px] text-primary flex items-center gap-1 ml-1">
              <Video className="w-3 h-3" /> {client.videos_per_month}/mois
            </span>
          )}
          {client.monthly_recurring_revenue && (
            <span className="text-xs font-semibold text-emerald-400 ml-auto">
              {formatCurrency(client.monthly_recurring_revenue)}/mois
            </span>
          )}
        </div>

        {/* Contract remaining */}
        {endDate && (
          <div className={`text-xs ${contractColor}`}>
            {monthsLeft === null ? "" :
             monthsLeft < 0 ? "Contrat expiré" :
             `${monthsLeft} mois restants`}
          </div>
        )}

        {/* Contract progress — % of contract duration elapsed */}
        {contractProgress !== null ? (
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Progression du contrat</span>
              <span className="font-medium text-foreground">{contractProgress}%</span>
            </div>
            <Progress value={contractProgress} className="h-1.5" />
          </div>
        ) : (
          <div className="text-[10px] text-muted-foreground italic">
            Ajoute une date de début + durée pour tracker la progression du contrat
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button size="sm" variant="ghost" onClick={onEdit} className="flex-1 gap-1.5 text-xs">
            <Pencil className="w-3.5 h-3.5" /> Modifier
          </Button>
          <Button size="sm" variant="ghost" onClick={onDelete} className="text-destructive hover:text-destructive hover:bg-destructive/10">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Add Dialog ───────────────────────────────────────────────
function ClientAddDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateClient();
  const [form, setForm] = useState({
    name: "", industry: "", status: "pipeline" as ClientStatus,
    monthly_recurring_revenue: "", contract_length_months: "",
    videos_per_month: "", next_shoot_date: "", notes: "",
    services: [] as string[],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) return;
    await create.mutateAsync({
      name: form.name,
      industry: form.industry || null,
      status: form.status,
      monthly_recurring_revenue: form.monthly_recurring_revenue ? Number(form.monthly_recurring_revenue) : null,
      contract_length_months: form.contract_length_months ? Number(form.contract_length_months) : null,
      videos_per_month: form.videos_per_month ? Number(form.videos_per_month) : 0,
      next_shoot_date: form.next_shoot_date || null,
      notes: form.notes || null,
      services: form.services,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouveau Client</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label>Nom du client *</Label>
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Domaine</Label>
            <IndustryPicker value={form.industry} onChange={(v) => setForm({ ...form, industry: v })} />
          </div>
          <div className="space-y-1">
            <Label>Services fournis</Label>
            <ServicesPicker value={form.services} onChange={(v) => setForm({ ...form, services: v })} />
            <p className="text-[10px] text-muted-foreground">Coche tous les services inclus dans le contrat.</p>
          </div>
          <div className="space-y-1">
            <Label>Statut *</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as ClientStatus })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pipeline">Pipeline</SelectItem>
                <SelectItem value="active">Actif</SelectItem>
                <SelectItem value="on_hold">En pause</SelectItem>
                <SelectItem value="lost">Perdu</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>MRR ($)</Label>
              <Input type="number" value={form.monthly_recurring_revenue} onChange={(e) => setForm({ ...form, monthly_recurring_revenue: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Contrat (mois)</Label>
              <Input type="number" value={form.contract_length_months} onChange={(e) => setForm({ ...form, contract_length_months: e.target.value })} />
            </div>
          </div>
          {form.services.includes("videos") && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Vidéos/mois</Label>
                <Input type="number" value={form.videos_per_month} onChange={(e) => setForm({ ...form, videos_per_month: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Prochain tournage</Label>
                <Input type="date" value={form.next_shoot_date} onChange={(e) => setForm({ ...form, next_shoot_date: e.target.value })} />
              </div>
            </div>
          )}
          <div className="space-y-1">
            <Label>Notes</Label>
            <Textarea rows={3} placeholder="Contexte, objectifs, contraintes..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Annuler</Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? "Création..." : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit Dialog ──────────────────────────────────────────────
function ClientEditDialog({ client, onClose }: { client: Client; onClose: () => void }) {
  const update = useUpdateClient();
  const [form, setForm] = useState({
    name: client.name,
    industry: client.industry || "",
    status: client.status,
    monthly_recurring_revenue: client.monthly_recurring_revenue?.toString() || "",
    contract_value: client.contract_value?.toString() || "",
    videos_per_month: client.videos_per_month?.toString() || "",
    next_shoot_date: client.next_shoot_date || "",
    contract_start_date: client.contract_start_date || "",
    contract_end_date: client.contract_end_date || "",
    notes: client.notes || "",
    services: client.services ?? [],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await update.mutateAsync({
      id: client.id,
      name: form.name,
      industry: form.industry || null,
      status: form.status as ClientStatus,
      monthly_recurring_revenue: form.monthly_recurring_revenue ? Number(form.monthly_recurring_revenue) : null,
      contract_value: form.contract_value ? Number(form.contract_value) : null,
      videos_per_month: form.videos_per_month ? Number(form.videos_per_month) : 0,
      next_shoot_date: form.next_shoot_date || null,
      contract_start_date: form.contract_start_date || null,
      contract_end_date: form.contract_end_date || null,
      notes: form.notes || null,
      services: form.services,
    });
    onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier — {client.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label>Nom du client</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Domaine</Label>
            <IndustryPicker value={form.industry} onChange={(v) => setForm({ ...form, industry: v })} />
          </div>
          <div className="space-y-1">
            <Label>Services fournis</Label>
            <ServicesPicker value={form.services} onChange={(v) => setForm({ ...form, services: v })} />
            <p className="text-[10px] text-muted-foreground">Coche tous les services inclus dans le contrat.</p>
          </div>
          <div className="space-y-1">
            <Label>Statut</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as ClientStatus })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Actif</SelectItem>
                <SelectItem value="pipeline">Pipeline</SelectItem>
                <SelectItem value="on_hold">En pause</SelectItem>
                <SelectItem value="lost">Perdu</SelectItem>
                <SelectItem value="completed">Complété</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>MRR ($/mois)</Label>
              <Input type="number" value={form.monthly_recurring_revenue} onChange={(e) => setForm({ ...form, monthly_recurring_revenue: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Valeur contrat ($)</Label>
              <Input type="number" value={form.contract_value} onChange={(e) => setForm({ ...form, contract_value: e.target.value })} />
            </div>
          </div>
          {form.services.includes("videos") && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Vidéos/mois</Label>
                <Input type="number" value={form.videos_per_month} onChange={(e) => setForm({ ...form, videos_per_month: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Prochain tournage</Label>
                <Input type="date" value={form.next_shoot_date} onChange={(e) => setForm({ ...form, next_shoot_date: e.target.value })} />
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Début du contrat</Label>
              <Input type="date" value={form.contract_start_date} onChange={(e) => setForm({ ...form, contract_start_date: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Fin du contrat</Label>
              <Input type="date" value={form.contract_end_date} onChange={(e) => setForm({ ...form, contract_end_date: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Notes</Label>
            <Textarea rows={3} placeholder="Ex: Content + Ads, 50% progress" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Annuler</Button>
            <Button type="submit" disabled={update.isPending}>
              {update.isPending ? "Sauvegarde..." : "Sauvegarder"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── ClientsTab ───────────────────────────────────────────────
export function ClientsTab() {
  const { data: clients = [], isLoading } = useClients();
  const deleteClient = useDeleteClient();
  const [showAdd, setShowAdd] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  const active    = clients.filter((c) => c.status === "active");
  const pipeline  = clients.filter((c) => c.status === "pipeline");
  const lost      = clients.filter((c) => ["lost", "completed", "on_hold"].includes(c.status));

  const avgRetention = active.length > 0
    ? Math.round(active.reduce((s, c) => {
        if (!c.contract_start_date) return s;
        const months = Math.max(0, Math.floor((Date.now() - new Date(c.contract_start_date).getTime()) / (1000 * 60 * 60 * 24 * 30)));
        return s + months;
      }, 0) / active.length)
    : 0;

  const avgVideos = active.length > 0
    ? Math.round(active.reduce((s, c) => s + (c.videos_per_month || 0), 0) / active.length)
    : 0;

  if (isLoading) return <div className="p-6 text-muted-foreground text-sm">Chargement...</div>;

  const Section = ({ title, items, badge }: { title: string; items: Client[]; badge: string }) => (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <Badge variant="secondary" className="text-xs">{badge}</Badge>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">Aucun client</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {items.map((c) => (
            <ClientCard
              key={c.id}
              client={c}
              onEdit={() => setEditingClient(c)}
              onDelete={() => { if (confirm(`Supprimer ${c.name}?`)) deleteClient.mutate(c.id); }}
            />
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="p-6 space-y-8">
      {/* Stats bar */}
      <div className="flex items-center gap-6">
        <div className="text-sm">
          <span className="text-muted-foreground">Rétention moy. </span>
          <span className="font-semibold text-foreground">{avgRetention} mois</span>
        </div>
        <div className="text-sm">
          <span className="text-muted-foreground">Vidéos/client </span>
          <span className="font-semibold text-foreground">{avgVideos}</span>
        </div>
        <div className="ml-auto">
          <Button onClick={() => setShowAdd(true)} size="sm" className="gap-2 shadow-glow">
            <Plus className="w-4 h-4" /> Ajouter un client
          </Button>
        </div>
      </div>

      <Section title="Clients Actifs" items={active} badge={`${active.length}`} />
      <Section
        title="Pipeline"
        items={pipeline}
        badge={`${pipeline.length} • ${formatCurrency(pipeline.reduce((s, c) => s + (c.monthly_recurring_revenue ?? 0), 0))}`}
      />
      <Section title="Autres" items={lost} badge={`${lost.length}`} />

      {showAdd && <ClientAddDialog open onClose={() => setShowAdd(false)} />}
      {editingClient && <ClientEditDialog client={editingClient} onClose={() => setEditingClient(null)} />}
    </div>
  );
}
