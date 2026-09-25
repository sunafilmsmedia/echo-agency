import { useMemo, useState } from "react";
import { useClients } from "@/hooks/useClients";
import { useShootTeams, useCreateShootTeam, useUpdateShootTeam, useDeleteShootTeam, useAssignClientToTeam } from "@/hooks/useShootTeams";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Users, Clapperboard, UserPlus, X } from "lucide-react";
import type { ShootTeam, Client } from "@/integrations/supabase/client";

// Palette proposée pour la couleur d'équipe (cohérent avec le reste du dashboard)
const TEAM_COLOR_PALETTE = [
  "#8b5cf6", "#f59e0b", "#22c55e", "#ef4444", "#06b6d4", "#a855f7",
  "#f97316", "#3b82f6", "#ec4899", "#eab308", "#14b8a6", "#f43f5e",
];

function TeamDialog({
  team, open, onClose,
}: { team?: ShootTeam; open: boolean; onClose: () => void }) {
  const create = useCreateShootTeam();
  const update = useUpdateShootTeam();
  const isEdit = !!team;

  const [name, setName]     = useState(team?.name ?? "");
  const [color, setColor]   = useState(team?.color ?? TEAM_COLOR_PALETTE[0]);
  const [members, setMembers] = useState(team?.members ?? "");
  const [notes, setNotes]   = useState(team?.notes ?? "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const payload = {
      name: name.trim(),
      color,
      members: members.trim() || null,
      notes: notes.trim() || null,
    };
    if (isEdit) await update.mutateAsync({ id: team!.id, ...payload });
    else await create.mutateAsync(payload);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Modifier — ${team?.name}` : "Nouvelle équipe de tournage"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label>Nom de l'équipe *</Label>
            <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Équipe A, Team Élie…" />
          </div>
          <div className="space-y-1">
            <Label>Membres <span className="text-muted-foreground font-normal">(séparés par virgule)</span></Label>
            <Input value={members} onChange={(e) => setMembers(e.target.value)} placeholder="Ex: Josué, Sylvain, Sasha" />
          </div>
          <div className="space-y-1">
            <Label>Couleur</Label>
            <div className="grid grid-cols-12 gap-1.5">
              {TEAM_COLOR_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-6 h-6 rounded-md border-2 transition-transform ${color === c ? "scale-110 border-foreground" : "border-border/40 hover:scale-105"}`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <Label>Notes internes</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Rôles, disponibilités, spécialisations…" />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Annuler</Button>
            <Button type="submit">{isEdit ? "Sauvegarder" : "Créer"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Carte d'une équipe — nom, couleur, membres, clients assignés + assignation rapide.
function TeamCard({
  team, clients, unassigned, onEdit, onDelete,
}: {
  team: ShootTeam;
  clients: Client[];
  unassigned: Client[];
  onEdit: () => void;
  onDelete: () => void;
}) {
  const assign = useAssignClientToTeam();
  const membersList = team.members?.split(",").map((m) => m.trim()).filter(Boolean) ?? [];

  return (
    <div
      className="rounded-2xl border-2 bg-card overflow-hidden flex flex-col"
      style={{ borderColor: `${team.color}55` }}
    >
      {/* Header coloré */}
      <div
        className="px-4 pt-3 pb-3"
        style={{ background: `linear-gradient(135deg, ${team.color}18, ${team.color}05)` }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: team.color }}>
              <Clapperboard className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-foreground truncate">{team.name}</p>
              <p className="text-[10px] text-muted-foreground">
                {clients.length} client{clients.length > 1 ? "s" : ""} · {membersList.length} membre{membersList.length > 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <div className="flex gap-1 shrink-0">
            <button onClick={onEdit} className="p-1 rounded hover:bg-muted/50" title="Modifier">
              <Pencil className="w-3 h-3 text-muted-foreground" />
            </button>
            <button onClick={onDelete} className="p-1 rounded hover:bg-destructive/10" title="Supprimer">
              <Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" />
            </button>
          </div>
        </div>

        {membersList.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {membersList.map((m) => (
              <span key={m} className="text-[10px] px-1.5 py-0.5 rounded-full bg-background/60 text-foreground border border-border/40 flex items-center gap-1">
                <Users className="w-2.5 h-2.5" style={{ color: team.color }} /> {m}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Notes */}
      {team.notes && (
        <div className="px-4 py-2 border-b border-border/30 bg-muted/10">
          <p className="text-[11px] text-muted-foreground leading-relaxed">{team.notes}</p>
        </div>
      )}

      {/* Clients assignés */}
      <div className="p-4 flex-1 space-y-2">
        {clients.length === 0 ? (
          <p className="text-xs text-muted-foreground italic text-center py-2">
            Aucun client assigné à cette équipe.
          </p>
        ) : (
          <div className="space-y-1.5">
            {clients.map((c) => (
              <div key={c.id}
                   className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md bg-muted/20 hover:bg-muted/40 transition-colors group">
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: team.color }} />
                  <span className="text-xs font-medium text-foreground truncate">{c.name}</span>
                  {c.city && (
                    <span className="text-[10px] text-muted-foreground truncate">· {c.city}</span>
                  )}
                </div>
                <button
                  onClick={() => assign.mutate({ clientId: c.id, teamId: null })}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/20"
                  title="Retirer de cette équipe"
                >
                  <X className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Ajouter un client */}
        {unassigned.length > 0 && (
          <Select onValueChange={(clientId) => assign.mutate({ clientId, teamId: team.id })}>
            <SelectTrigger className="h-8 text-xs mt-2 border-dashed">
              <div className="flex items-center gap-1.5">
                <UserPlus className="w-3 h-3" style={{ color: team.color }} />
                <SelectValue placeholder="Assigner un client à cette équipe…" />
              </div>
            </SelectTrigger>
            <SelectContent>
              {unassigned.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
}

export function EquipesTournageTab() {
  const { data: clients = [], isLoading: loadingClients } = useClients();
  const { data: teams = [], isLoading: loadingTeams } = useShootTeams();
  const deleteTeam = useDeleteShootTeam();

  const [showAdd, setShowAdd] = useState(false);
  const [editingTeam, setEditingTeam] = useState<ShootTeam | null>(null);

  // On travaille uniquement sur les clients actifs (pipeline/perdu ne devraient
  // pas encombrer la répartition d'équipes).
  const activeClients = useMemo(() => clients.filter((c) => c.status === "active"), [clients]);
  const unassignedClients = useMemo(
    () => activeClients.filter((c) => !c.shoot_team_id),
    [activeClients],
  );

  const byTeam = useMemo(() => {
    const map = new Map<string, Client[]>();
    for (const t of teams) map.set(t.id, []);
    for (const c of activeClients) {
      if (c.shoot_team_id && map.has(c.shoot_team_id)) {
        map.get(c.shoot_team_id)!.push(c);
      }
    }
    return map;
  }, [teams, activeClients]);

  if (loadingClients || loadingTeams) {
    return <div className="p-6 text-muted-foreground text-sm">Chargement...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header + action */}
      <div className="flex items-center gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
            🎬 Répartition tournages
          </p>
          <h2 className="text-lg font-bold text-foreground mt-0.5">
            {teams.length} équipe{teams.length > 1 ? "s" : ""} · {activeClients.length - unassignedClients.length}/{activeClients.length} clients assignés
          </h2>
        </div>
        <div className="ml-auto">
          <Button onClick={() => setShowAdd(true)} size="sm" className="gap-2 shadow-glow">
            <Plus className="w-4 h-4" /> Nouvelle équipe
          </Button>
        </div>
      </div>

      {/* Empty state */}
      {teams.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-border/50 bg-muted/10 p-8 text-center space-y-3">
          <Clapperboard className="w-10 h-10 mx-auto text-muted-foreground" />
          <div>
            <p className="text-sm font-semibold text-foreground">Aucune équipe de tournage</p>
            <p className="text-xs text-muted-foreground mt-1">
              Crée une équipe pour commencer à répartir tes clients — ex: <span className="font-mono">Équipe A</span>, <span className="font-mono">Team Nord</span>, <span className="font-mono">Josué solo</span>.
            </p>
          </div>
          <Button onClick={() => setShowAdd(true)} size="sm" className="gap-2 mt-2">
            <Plus className="w-4 h-4" /> Créer la première équipe
          </Button>
        </div>
      )}

      {/* Grille des équipes */}
      {teams.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {teams.map((t) => (
            <TeamCard
              key={t.id}
              team={t}
              clients={byTeam.get(t.id) ?? []}
              unassigned={unassignedClients}
              onEdit={() => setEditingTeam(t)}
              onDelete={() => {
                const assignedCount = (byTeam.get(t.id) ?? []).length;
                const msg = assignedCount > 0
                  ? `Supprimer ${t.name} ? Les ${assignedCount} client(s) assigné(s) seront détachés (pas supprimés).`
                  : `Supprimer ${t.name} ?`;
                if (confirm(msg)) deleteTeam.mutate(t.id);
              }}
            />
          ))}
        </div>
      )}

      {/* Clients non assignés — vue globale sous la grille */}
      {teams.length > 0 && unassignedClients.length > 0 && (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/[0.04] p-4">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-foreground">
              {unassignedClients.length} client{unassignedClients.length > 1 ? "s" : ""} sans équipe
            </h3>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {unassignedClients.map((c) => (
              <span key={c.id}
                    className="text-xs px-2 py-1 rounded-full bg-background border border-border/60 text-foreground">
                {c.name}
              </span>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">
            Assigne-les depuis les cartes d'équipes ci-dessus, ou depuis le formulaire d'édition de chaque client.
          </p>
        </div>
      )}

      {/* Dialogs */}
      {showAdd && <TeamDialog open onClose={() => setShowAdd(false)} />}
      {editingTeam && <TeamDialog open team={editingTeam} onClose={() => setEditingTeam(null)} />}
    </div>
  );
}
