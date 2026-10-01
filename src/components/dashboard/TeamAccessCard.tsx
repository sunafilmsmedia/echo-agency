import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Users, Mail, Trash2, Loader2, DollarSign, ChevronDown, ChevronUp } from "lucide-react";
import { EMPLOYEE_TAB_OPTIONS } from "@/lib/dashboard-tabs";
import { formatDate } from "@/lib/utils";
import {
  useTeamMembers, useAddTeamMember, useUpdateTeamMember, useDeleteTeamMember, useSendTeamInvite,
  type TeamMember,
} from "@/hooks/useTeamAccess";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Par défaut : tout sauf les onglets centrés sur l'argent.
const DEFAULT_TABS = EMPLOYEE_TAB_OPTIONS.map((t) => t.id).filter((id) => !["revenue", "clients", "kpi"].includes(id));

function TabPicker({ value, onChange, canSeeMoney, onMoneyChange }: {
  value: string[];
  onChange: (tabs: string[]) => void;
  canSeeMoney: boolean;
  onMoneyChange: (v: boolean) => void;
}) {
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((t) => t !== id) : [...value, id]);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {EMPLOYEE_TAB_OPTIONS.map((t) => {
          const Icon = t.icon;
          return (
            <label key={t.id}
              className="flex items-center gap-2.5 rounded-md border border-border/40 px-3 py-2 text-sm cursor-pointer hover:bg-accent/40">
              <Checkbox checked={value.includes(t.id)} onCheckedChange={() => toggle(t.id)} />
              <Icon className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="truncate">{t.label}</span>
            </label>
          );
        })}
      </div>
      <label className={`flex items-start gap-2.5 rounded-md border px-3 py-2.5 cursor-pointer ${
        canSeeMoney ? "border-amber-500/40 bg-amber-500/5" : "border-border/40"}`}>
        <Checkbox checked={canSeeMoney} onCheckedChange={(v) => onMoneyChange(v === true)} className="mt-0.5" />
        <div>
          <p className="text-sm font-medium flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5" /> Voir les montants ($)</p>
          <p className="text-[11px] text-muted-foreground">
            Décoché : revenus, forfaits et montants affichés « $ ••• », et l'assistant IA est caché.
          </p>
        </div>
      </label>
    </div>
  );
}

function MemberRow({ member }: { member: TeamMember }) {
  const update = useUpdateTeamMember();
  const remove = useDeleteTeamMember();
  const invite = useSendTeamInvite();
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border border-border/50 p-3 space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center flex-shrink-0">
          <span className="text-primary text-xs font-bold">{(member.name || member.email).charAt(0).toUpperCase()}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">
            {member.name || member.email}
            {!member.active && <Badge variant="secondary" className="ml-2 text-[10px]">Désactivé</Badge>}
          </p>
          <p className="text-[11px] text-muted-foreground truncate">
            {member.name && <>{member.email} · </>}
            {member.allowed_tabs.length} section{member.allowed_tabs.length > 1 ? "s" : ""}
            {" · "}{member.can_see_money ? "voit les $" : "$ masqués"}
            {" · "}{member.last_login_at ? `dernier code ${formatDate(member.last_login_at)}` : "jamais connecté"}
          </p>
        </div>
        <Button size="sm" variant="ghost" className="gap-1 text-xs" onClick={() => setOpen(!open)}>
          Accès {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </Button>
      </div>

      {open && (
        <div className="space-y-3 pt-1">
          <TabPicker
            value={member.allowed_tabs}
            onChange={(tabs) => update.mutate({ id: member.id, allowed_tabs: tabs })}
            canSeeMoney={member.can_see_money}
            onMoneyChange={(v) => update.mutate({ id: member.id, can_see_money: v })}
          />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="gap-1.5 text-xs" disabled={invite.isPending}
              onClick={() => invite.mutate(member.email)}>
              {invite.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
              Renvoyer l'invitation
            </Button>
            <Button size="sm" variant="outline" className="text-xs"
              onClick={() => update.mutate({ id: member.id, active: !member.active })}>
              {member.active ? "Désactiver l'accès" : "Réactiver l'accès"}
            </Button>
            <Button size="sm" variant="ghost" className="gap-1.5 text-xs text-destructive hover:bg-destructive/10 ml-auto"
              onClick={() => { if (confirm(`Retirer l'accès de ${member.name || member.email} ?`)) remove.mutate(member.id); }}>
              <Trash2 className="w-3.5 h-3.5" /> Retirer
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function TeamAccessCard() {
  const { data: members = [], isLoading, error } = useTeamMembers();
  const add = useAddTeamMember();

  const [adding, setAdding] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [tabs, setTabs] = useState<string[]>(DEFAULT_TABS);
  const [money, setMoney] = useState(false);

  const reset = () => { setAdding(false); setEmail(""); setName(""); setTabs(DEFAULT_TABS); setMoney(false); };
  const emailOk = EMAIL_RE.test(email.trim());

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="w-4 h-4 text-primary" /> Accès équipe
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Donne accès à un employé : il se connecte sans mot de passe, avec un code reçu par courriel, et ne voit que les sections que tu choisis.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && <p className="text-xs text-muted-foreground">Chargement…</p>}
        {error && <p className="text-xs text-destructive">Impossible de charger l'équipe : {(error as Error).message}</p>}
        {!isLoading && !error && members.length === 0 && !adding && (
          <p className="text-xs text-muted-foreground">Aucun employé pour l'instant.</p>
        )}

        {members.map((m) => <MemberRow key={m.id} member={m} />)}

        {adding ? (
          <div className="rounded-lg border border-primary/30 bg-primary/[0.03] p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Courriel *</Label>
                <Input type="email" autoFocus placeholder="employe@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Nom</Label>
                <Input placeholder="Prénom Nom" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Ce que la personne peut voir</Label>
              <TabPicker value={tabs} onChange={setTabs} canSeeMoney={money} onMoneyChange={setMoney} />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={reset}>Annuler</Button>
              <Button size="sm" className="gap-1.5" disabled={!emailOk || add.isPending}
                onClick={() => add.mutate({ email, name, allowed_tabs: tabs, can_see_money: money }, { onSuccess: reset })}>
                {add.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                Donner l'accès et envoyer l'invitation
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setAdding(true)}>
            <UserPlus className="w-3.5 h-3.5" /> Ajouter un employé
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
