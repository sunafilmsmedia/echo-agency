import { useState, useEffect } from "react";
import {
  ChevronDown, ChevronRight, Plus, Folder as FolderIcon, List as ListIcon,
  Layers, MoreVertical, Trash2, Edit2, Check, X, Sparkles, Loader2,
  CircleDot, Tag, Search, Calendar as CalIcon, Flag, User as UserIcon, Link2,
  SlidersHorizontal, Users2, ChevronsUpDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { EchoTintedLogo } from "@/components/EchoTintedLogo";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Space    { id: string; name: string; }
interface Folder   { id: string; spaceId: string; name: string; }
interface ListDef  { id: string; spaceId: string; folderId: string | null; name: string; statuses: string[]; }
interface SubTask  { id: string; title: string; done: boolean; }
interface Task     { id: string; listId: string; title: string; status: string; description?: string; subtasks: SubTask[]; dueDate?: string; createdAt: number; }

interface State { spaces: Space[]; folders: Folder[]; lists: ListDef[]; tasks: Task[]; }

const STORAGE_KEY = "tasks_suivis_state";
const EMPTY: State = { spaces: [], folders: [], lists: [], tasks: [] };

function loadState(): State {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "") || EMPTY; }
  catch { return EMPTY; }
}
function saveState(s: State) { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); }
const uid = () => Math.random().toString(36).slice(2, 10);

// ─── Generic "Agence vidéo / contenu" template ────────────────────────────────

function buildVideoAgencyTemplate(): State {
  const s = { spaces: [] as Space[], folders: [] as Folder[], lists: [] as ListDef[], tasks: [] as Task[] };

  const planif = { id: uid(), name: "Planification & Sous-titres" }; s.spaces.push(planif);
  const fPlanif = { id: uid(), spaceId: planif.id, name: "Planification" }; s.folders.push(fPlanif);
  const fIdees  = { id: uid(), spaceId: planif.id, name: "Idées clients" };  s.folders.push(fIdees);
  const statsPlanif = ["à faire", "planifié", "en sous-titrage", "sous-titré", "dans le drive", "livré au client", "modif à faire", "annulé"];
  s.lists.push({ id: uid(), spaceId: planif.id, folderId: fPlanif.id, name: "Vidéos à planifier", statuses: statsPlanif });
  s.lists.push({ id: uid(), spaceId: planif.id, folderId: fIdees.id,  name: "Idées de contenu",   statuses: statsPlanif });

  const montShort = { id: uid(), name: "Montage Short Form" }; s.spaces.push(montShort);
  const fMont   = { id: uid(), spaceId: montShort.id, name: "Montage" };       s.folders.push(fMont);
  const fModif  = { id: uid(), spaceId: montShort.id, name: "Modifications" }; s.folders.push(fModif);
  const statsMont = ["à faire", "envoyé au montage", "en cours", "validé par responsable", "annulé"];
  s.lists.push({ id: uid(), spaceId: montShort.id, folderId: fMont.id,  name: "Montage équipe 1", statuses: statsMont });
  s.lists.push({ id: uid(), spaceId: montShort.id, folderId: fMont.id,  name: "Montage équipe 2", statuses: statsMont });
  s.lists.push({ id: uid(), spaceId: montShort.id, folderId: fModif.id, name: "Corrections",      statuses: statsMont });

  const ads = { id: uid(), name: "Marketing & Ads" }; s.spaces.push(ads);
  s.lists.push({ id: uid(), spaceId: ads.id, folderId: null, name: "Scripts Ads", statuses: ["client", "en révision", "publié"] });

  const montLong = { id: uid(), name: "Montage Long Format" }; s.spaces.push(montLong);
  const fLong = { id: uid(), spaceId: montLong.id, name: "Montage" }; s.folders.push(fLong);
  const statsLong = ["à faire", "envoyé", "en cours", "à modifier", "livré", "complète"];
  s.lists.push({ id: uid(), spaceId: montLong.id, folderId: fLong.id, name: "Vidéos YouTube / Ads", statuses: statsLong });

  return s;
}

// ─── Status colors (deterministic from string) ────────────────────────────────

function statusColor(status: string): string {
  const s = status.toLowerCase();
  if (s.includes("complet") || s.includes("livré") || s.includes("validé") || s.includes("publié")) return "emerald";
  if (s.includes("annul"))                                                                            return "rose";
  if (s.includes("modif") || s.includes("révision") || s.includes("à modifier"))                     return "amber";
  if (s.includes("en cours") || s.includes("envoyé") || s.includes("sous-titrage") || s.includes("submagic")) return "blue";
  if (s.includes("planifié") || s.includes("sous-titré") || s.includes("dans le drive"))             return "primary";
  return "muted";
}
const colorClass: Record<string, string> = {
  emerald: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  rose:    "bg-rose-500/15 text-rose-400 border-rose-500/30",
  amber:   "bg-amber-500/15 text-amber-400 border-amber-500/30",
  blue:    "bg-blue-500/15 text-blue-400 border-blue-500/30",
  primary: "bg-primary/15 text-primary border-primary/30",
  muted:   "bg-muted/40 text-muted-foreground border-border/50",
};

// ─── Main ─────────────────────────────────────────────────────────────────────

export function TasksSuivisTab() {
  const [state, setState]               = useState<State>(loadState);
  const [activeListId, setActiveListId] = useState<string | null>(null);
  const [collapsedSpaces, setCollapsedSpaces] = useState<Set<string>>(new Set());
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  useEffect(() => { saveState(state); }, [state]);

  // ── Mutators ──
  const update = (fn: (s: State) => State) => setState(prev => fn(prev));
  const addSpace  = (name: string) => update(s => ({ ...s, spaces: [...s.spaces, { id: uid(), name }] }));
  const addFolder = (spaceId: string, name: string) => update(s => ({ ...s, folders: [...s.folders, { id: uid(), spaceId, name }] }));
  const addList   = (spaceId: string, folderId: string | null, name: string, statuses?: string[]) =>
    update(s => ({ ...s, lists: [...s.lists, { id: uid(), spaceId, folderId, name, statuses: statuses ?? ["à faire", "en cours", "terminé"] }] }));
  const renameItem = (kind: "spaces" | "folders" | "lists", id: string, name: string) =>
    update(s => ({ ...s, [kind]: (s[kind] as any[]).map(i => i.id === id ? { ...i, name } : i) } as State));
  const deleteSpace = (id: string) => update(s => {
    const folderIds = s.folders.filter(f => f.spaceId === id).map(f => f.id);
    const listIds   = s.lists.filter(l => l.spaceId === id).map(l => l.id);
    return {
      spaces:  s.spaces.filter(x => x.id !== id),
      folders: s.folders.filter(f => f.spaceId !== id),
      lists:   s.lists.filter(l => l.spaceId !== id),
      tasks:   s.tasks.filter(t => !listIds.includes(t.listId)),
    };
  });
  const deleteFolder = (id: string) => update(s => {
    const listIds = s.lists.filter(l => l.folderId === id).map(l => l.id);
    return {
      ...s,
      folders: s.folders.filter(f => f.id !== id),
      lists:   s.lists.filter(l => l.folderId !== id),
      tasks:   s.tasks.filter(t => !listIds.includes(t.listId)),
    };
  });
  const deleteList = (id: string) => update(s => ({
    ...s,
    lists: s.lists.filter(l => l.id !== id),
    tasks: s.tasks.filter(t => t.listId !== id),
  }));

  // Task ops
  const addTask = (listId: string, title: string, status?: string) => update(s => {
    const list = s.lists.find(l => l.id === listId);
    if (!list) return s;
    const finalStatus = status ?? list.statuses[0] ?? "à faire";
    return { ...s, tasks: [...s.tasks, { id: uid(), listId, title, status: finalStatus, subtasks: [], createdAt: Date.now() }] };
  });
  const updateTask = (id: string, patch: Partial<Task>) => update(s => ({
    ...s,
    tasks: s.tasks.map(t => t.id === id ? { ...t, ...patch } : t),
  }));
  const deleteTask = (id: string) => update(s => ({ ...s, tasks: s.tasks.filter(t => t.id !== id) }));

  const toggle = (set: Set<string>, id: string) => {
    const next = new Set(set); next.has(id) ? next.delete(id) : next.add(id); return next;
  };

  const importTemplate = () => {
    if (state.spaces.length > 0) {
      if (!confirm("Tu as déjà des Spaces. Le modèle va être ajouté en plus de ce qui existe. Continuer?")) return;
    }
    const tpl = buildVideoAgencyTemplate();
    update(s => ({
      spaces:  [...s.spaces, ...tpl.spaces],
      folders: [...s.folders, ...tpl.folders],
      lists:   [...s.lists, ...tpl.lists],
      tasks:   [...s.tasks, ...tpl.tasks],
    }));
    toast.success("Modèle Agence vidéo importé");
  };

  const activeList = activeListId ? state.lists.find(l => l.id === activeListId) ?? null : null;
  const activeListTasks = activeList ? state.tasks.filter(t => t.listId === activeList.id) : [];

  // Empty state — no spaces yet
  if (state.spaces.length === 0) {
    return <EmptyState onImportTemplate={importTemplate} onCreateSpace={(name) => addSpace(name)} />;
  }

  return (
    <div className="flex h-full">
      {/* ── Sidebar (tree) ── */}
      <aside className="w-72 flex-shrink-0 border-r border-border/40 bg-muted/10 overflow-y-auto p-3 space-y-1">
        <div className="flex items-center justify-between mb-2 px-1">
          <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Hiérarchie</p>
          <AddInline label="+ Space" placeholder="Nouveau Space" onAdd={addSpace} />
        </div>

        {state.spaces.map(space => {
          const open = !collapsedSpaces.has(space.id);
          const spaceFolders = state.folders.filter(f => f.spaceId === space.id);
          const looseListsInSpace = state.lists.filter(l => l.spaceId === space.id && l.folderId === null);
          return (
            <div key={space.id}>
              <TreeRow
                icon={open ? <ChevronDown className="w-3 h-3"/> : <ChevronRight className="w-3 h-3"/>}
                iconAfter={<Layers className="w-3.5 h-3.5 text-primary" />}
                name={space.name}
                onClick={() => setCollapsedSpaces(prev => toggle(prev, space.id))}
                onRename={(n) => renameItem("spaces", space.id, n)}
                onDelete={() => { if (confirm(`Supprimer "${space.name}" et tout son contenu?`)) deleteSpace(space.id); }}
                actions={
                  <>
                    <AddInline label="+ Folder" placeholder="Nouveau Folder" onAdd={(n) => addFolder(space.id, n)} />
                    <AddInline label="+ List"   placeholder="Nouvelle Liste" onAdd={(n) => addList(space.id, null, n)} />
                  </>
                }
                bold
              />

              {open && (
                <div className="ml-3 mt-0.5 space-y-0.5 border-l border-border/40 pl-2">
                  {spaceFolders.map(folder => {
                    const fOpen = !collapsedFolders.has(folder.id);
                    const folderLists = state.lists.filter(l => l.folderId === folder.id);
                    return (
                      <div key={folder.id}>
                        <TreeRow
                          icon={fOpen ? <ChevronDown className="w-3 h-3"/> : <ChevronRight className="w-3 h-3"/>}
                          iconAfter={<FolderIcon className="w-3.5 h-3.5 text-amber-400" />}
                          name={folder.name}
                          onClick={() => setCollapsedFolders(prev => toggle(prev, folder.id))}
                          onRename={(n) => renameItem("folders", folder.id, n)}
                          onDelete={() => { if (confirm(`Supprimer "${folder.name}" et tout son contenu?`)) deleteFolder(folder.id); }}
                          actions={<AddInline label="+ List" placeholder="Nouvelle Liste" onAdd={(n) => addList(space.id, folder.id, n)} />}
                        />
                        {fOpen && folderLists.length > 0 && (
                          <div className="ml-3 space-y-0.5 border-l border-border/30 pl-2 mt-0.5">
                            {folderLists.map(list => (
                              <TreeRow key={list.id}
                                iconAfter={<ListIcon className="w-3.5 h-3.5 text-blue-400" />}
                                name={list.name}
                                count={state.tasks.filter(t => t.listId === list.id).length}
                                active={activeListId === list.id}
                                onClick={() => setActiveListId(list.id)}
                                onRename={(n) => renameItem("lists", list.id, n)}
                                onDelete={() => { if (confirm(`Supprimer la liste "${list.name}"?`)) deleteList(list.id); }}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {looseListsInSpace.map(list => (
                    <TreeRow key={list.id}
                      iconAfter={<ListIcon className="w-3.5 h-3.5 text-blue-400" />}
                      name={list.name}
                      count={state.tasks.filter(t => t.listId === list.id).length}
                      active={activeListId === list.id}
                      onClick={() => setActiveListId(list.id)}
                      onRename={(n) => renameItem("lists", list.id, n)}
                      onDelete={() => { if (confirm(`Supprimer la liste "${list.name}"?`)) deleteList(list.id); }}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}

        <div className="pt-4">
          <button onClick={importTemplate}
            className="w-full text-[10px] text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5 px-2 py-1.5 rounded hover:bg-muted/30">
            <Sparkles className="w-3 h-3" />
            Importer modèle Agence vidéo
          </button>
        </div>
      </aside>

      {/* ── Main: tasks of active list ── */}
      <main className="flex-1 overflow-y-auto p-6">
        {!activeList ? (
          <div className="h-full flex flex-col items-center justify-center text-center gap-3 text-muted-foreground">
            <EchoTintedLogo color="#7c3aed" pose="sitting" size="w-20 h-20" />
            <p className="text-sm">Sélectionne une liste à gauche pour voir ses tâches.</p>
          </div>
        ) : (
          <ListView
            list={activeList}
            tasks={activeListTasks}
            search={search}
            setSearch={setSearch}
            addTask={(title, status) => addTask(activeList.id, title, status)}
            updateTask={updateTask}
            deleteTask={deleteTask}
            updateList={(patch) => update(s => ({ ...s, lists: s.lists.map(l => l.id === activeList.id ? { ...l, ...patch } : l) }))}
          />
        )}
      </main>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function EmptyState({ onImportTemplate, onCreateSpace }: { onImportTemplate: () => void; onCreateSpace: (n: string) => void }) {
  const [name, setName] = useState("");
  return (
    <div className="h-full flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-5">
        <EchoTintedLogo color="#7c3aed" pose="thinking" size="w-24 h-24 mx-auto" />
        <div>
          <h2 className="text-2xl font-bold text-foreground">Crée ton premier Space</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Organise tes tâches par département, workflow, ou équipe.<br/>
            Spaces → Folders → Lists → Tâches.
          </p>
        </div>

        <div className="rounded-2xl border border-border/50 bg-card p-5 space-y-3">
          <Input autoFocus placeholder="Ex: Production vidéo, Marketing, Sales..."
            value={name} onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) { onCreateSpace(name.trim()); setName(""); } }}
            className="text-sm" />
          <Button onClick={() => { if (name.trim()) { onCreateSpace(name.trim()); setName(""); } }} disabled={!name.trim()} className="w-full gap-2">
            <Plus className="w-4 h-4" /> Créer mon premier Space
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-border/50" />
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">ou</span>
          <div className="flex-1 h-px bg-border/50" />
        </div>

        <button onClick={onImportTemplate}
          className="w-full text-sm text-primary hover:underline flex items-center gap-1.5 justify-center">
          <Sparkles className="w-3.5 h-3.5" />
          Importer un modèle prêt à l'emploi (Agence vidéo)
        </button>
      </div>
    </div>
  );
}

function TreeRow({ icon, iconAfter, name, count, active, bold, onClick, onRename, onDelete, actions }: {
  icon?: React.ReactNode; iconAfter?: React.ReactNode; name: string; count?: number; active?: boolean; bold?: boolean;
  onClick?: () => void; onRename?: (n: string) => void; onDelete?: () => void; actions?: React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(name);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className={`group flex items-center gap-1 px-1.5 py-1 rounded text-sm cursor-pointer ${active ? "bg-primary/15 text-primary font-semibold" : "hover:bg-muted/30 text-foreground"}`}
      onClick={(e) => { e.stopPropagation(); if (!editing) onClick?.(); }}>
      <div className="w-3 flex-shrink-0">{icon}</div>
      {iconAfter}
      {editing ? (
        <Input autoFocus value={val} onChange={(e) => setVal(e.target.value)}
          onBlur={() => { if (val.trim() && onRename) onRename(val.trim()); setEditing(false); }}
          onKeyDown={(e) => {
            if (e.key === "Enter") { if (val.trim() && onRename) onRename(val.trim()); setEditing(false); }
            if (e.key === "Escape") { setEditing(false); setVal(name); }
          }}
          onClick={(e) => e.stopPropagation()}
          className="h-6 text-xs px-1 flex-1" />
      ) : (
        <span className={`flex-1 truncate ${bold ? "font-semibold" : ""}`}>{name}</span>
      )}
      {count !== undefined && count > 0 && (
        <span className="text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-full">{count}</span>
      )}
      {(onRename || onDelete || actions) && !editing && (
        <div className="relative opacity-0 group-hover:opacity-100">
          <button onClick={(e) => { e.stopPropagation(); setMenuOpen(o => !o); }}
            className="p-0.5 rounded hover:bg-muted/50 text-muted-foreground">
            <MoreVertical className="w-3 h-3" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); }} />
              <div className="absolute right-0 top-full mt-0.5 z-50 bg-popover border border-border/60 rounded-lg shadow-xl py-1 min-w-[140px]">
                {actions}
                {onRename && (
                  <button onClick={(e) => { e.stopPropagation(); setEditing(true); setMenuOpen(false); }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-foreground hover:bg-muted/50 text-left">
                    <Edit2 className="w-3 h-3" /> Renommer
                  </button>
                )}
                {onDelete && (
                  <button onClick={(e) => { e.stopPropagation(); onDelete(); setMenuOpen(false); }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-destructive hover:bg-destructive/10 text-left">
                    <Trash2 className="w-3 h-3" /> Supprimer
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function AddInline({ label, placeholder, onAdd }: { label: string; placeholder: string; onAdd: (n: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState("");
  if (editing) {
    return (
      <Input autoFocus value={val} onChange={(e) => setVal(e.target.value)}
        onBlur={() => { if (val.trim()) onAdd(val.trim()); setVal(""); setEditing(false); }}
        onKeyDown={(e) => {
          if (e.key === "Enter") { if (val.trim()) onAdd(val.trim()); setVal(""); setEditing(false); }
          if (e.key === "Escape") { setVal(""); setEditing(false); }
        }}
        placeholder={placeholder} className="h-6 text-xs px-1.5 w-32" onClick={(e) => e.stopPropagation()} />
    );
  }
  return (
    <button onClick={(e) => { e.stopPropagation(); setEditing(true); }}
      className="text-[10px] text-muted-foreground hover:text-primary px-1.5 py-0.5 rounded hover:bg-muted/30">
      {label}
    </button>
  );
}

// ─── Kanban view (columns per status) ────────────────────────────────────────

function ListView({ list, tasks, search, setSearch, addTask, updateTask, deleteTask, updateList }: {
  list: ListDef;
  tasks: Task[];
  search: string;
  setSearch: (v: string) => void;
  addTask: (title: string, status?: string) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  updateList: (patch: Partial<ListDef>) => void;
}) {
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);
  const [editingStatuses, setEditingStatuses] = useState(false);
  const [newStatus, setNewStatus] = useState("");

  const filtered = tasks.filter(t => t.title.toLowerCase().includes(search.toLowerCase()));
  const columns = list.statuses.map(status => ({
    status,
    items: filtered.filter(t => t.status === status),
  }));
  const orphans = filtered.filter(t => !list.statuses.includes(t.status));

  const addStatus = () => {
    if (!newStatus.trim()) return;
    updateList({ statuses: [...list.statuses, newStatus.trim()] });
    setNewStatus("");
  };
  const removeStatus = (s: string) => {
    if (!confirm(`Supprimer le statut "${s}"? Les tâches actuelles passeront en orphelines.`)) return;
    updateList({ statuses: list.statuses.filter(x => x !== s) });
  };
  const detailTask = detailTaskId ? tasks.find(t => t.id === detailTaskId) ?? null : null;

  return (
    <div className="flex flex-col h-full">
      {/* Sticky top bar */}
      <div className="sticky top-0 z-20 bg-background border-b border-border/40 px-6 py-3 flex items-center gap-3">
        <div className="flex items-center gap-2 flex-1">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-md bg-primary/15 text-primary border border-primary/30">
            <Layers className="w-3 h-3" /> Statut
          </span>
          <Link2 className="w-3.5 h-3.5 text-muted-foreground/60 -rotate-45" />
          <span className="text-sm font-bold text-foreground ml-1">{list.name}</span>
          <span className="text-xs text-muted-foreground">· {tasks.length}</span>
        </div>
        <div className="flex items-center gap-1">
          <IconBtn title="Trier"><ChevronsUpDown className="w-4 h-4" /></IconBtn>
          <IconBtn title="Filtrer"><SlidersHorizontal className="w-4 h-4" /></IconBtn>
          <IconBtn title="Terminées"><Check className="w-4 h-4" /></IconBtn>
          <IconBtn title="Membres"><Users2 className="w-4 h-4" /></IconBtn>
          <div className="relative w-52">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Rechercher…" value={search} onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 text-xs" />
          </div>
          <IconBtn title="Gérer statuts" onClick={() => setEditingStatuses(v => !v)}>
            <Tag className="w-4 h-4" />
          </IconBtn>
          <Button size="sm" className="gap-1.5 ml-1"
            onClick={() => { const t = prompt("Nouvelle tâche"); if (t?.trim()) addTask(t.trim()); }}>
            <Plus className="w-3.5 h-3.5" /> Tâche
          </Button>
        </div>
      </div>

      {/* Statuses editor */}
      {editingStatuses && (
        <div className="mx-6 mt-3 rounded-xl border border-border/40 bg-muted/10 p-3 space-y-2">
          <p className="text-[11px] font-semibold text-foreground">Statuts du pipeline</p>
          <div className="flex flex-wrap gap-1.5">
            {list.statuses.map(s => (
              <span key={s} className={`inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-full border ${colorClass[statusColor(s)]}`}>
                <CircleDot className="w-2.5 h-2.5" /> {s}
                <button onClick={() => removeStatus(s)} className="hover:text-foreground"><X className="w-2.5 h-2.5" /></button>
              </span>
            ))}
            <div className="flex items-center gap-1">
              <Input value={newStatus} onChange={(e) => setNewStatus(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addStatus(); }}
                placeholder="+ Nouveau statut" className="h-6 text-[11px] w-32" />
              <Button size="icon" onClick={addStatus} className="h-6 w-6"><Plus className="w-3 h-3" /></Button>
            </div>
          </div>
        </div>
      )}

      {/* Kanban columns */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex gap-4 p-6 min-h-full items-start">
          {columns.map(({ status, items }) => (
            <KanbanColumn
              key={status}
              status={status}
              items={items}
              onAddTask={() => {
                const t = prompt(`Nouvelle tâche · ${status}`);
                if (t?.trim()) addTask(t.trim(), status);
              }}
              onOpenTask={(id) => setDetailTaskId(id)}
              onStatusChange={(taskId, s) => updateTask(taskId, { status: s })}
              statuses={list.statuses}
            />
          ))}
          {orphans.length > 0 && (
            <KanbanColumn
              status="Orphelines"
              items={orphans}
              onOpenTask={(id) => setDetailTaskId(id)}
              onStatusChange={(taskId, s) => updateTask(taskId, { status: s })}
              statuses={list.statuses}
            />
          )}
        </div>
      </div>

      {/* Task detail modal */}
      {detailTask && (
        <TaskDetailModal
          task={detailTask}
          statuses={list.statuses}
          onClose={() => setDetailTaskId(null)}
          onUpdate={(patch) => updateTask(detailTask.id, patch)}
          onDelete={() => { deleteTask(detailTask.id); setDetailTaskId(null); }}
        />
      )}
    </div>
  );
}

function IconBtn({ children, title, onClick }: { children: React.ReactNode; title?: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} title={title}
      className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors">
      {children}
    </button>
  );
}

// ─── Kanban column ───────────────────────────────────────────────────────────

function KanbanColumn({ status, items, onAddTask, onOpenTask, onStatusChange, statuses }: {
  status: string;
  items: Task[];
  onAddTask?: () => void;
  onOpenTask: (id: string) => void;
  onStatusChange: (taskId: string, status: string) => void;
  statuses: string[];
}) {
  const color = statusColor(status);
  const bgTint: Record<string, string> = {
    emerald: "bg-emerald-500/5",
    rose:    "bg-rose-500/5",
    amber:   "bg-amber-500/5",
    blue:    "bg-blue-500/5",
    primary: "bg-primary/5",
    muted:   "bg-muted/20",
  };
  return (
    <div className="w-72 flex-shrink-0 flex flex-col rounded-lg overflow-hidden">
      {/* Column header */}
      <div className={`px-3 py-2.5 rounded-t-lg ${bgTint[color]}`}>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${colorClass[color]}`}>
            <CircleDot className="w-2.5 h-2.5" /> {status}
          </span>
          <span className="text-xs font-bold text-foreground ml-auto">{items.length}</span>
        </div>
      </div>

      {/* Add task */}
      {onAddTask && (
        <button onClick={onAddTask}
          className={`text-xs text-muted-foreground hover:text-foreground py-2 px-3 flex items-center gap-1.5 ${bgTint[color]} border-t border-border/20 rounded-b-lg`}>
          <Plus className="w-3.5 h-3.5" /> Ajouter Tâche
        </button>
      )}

      {/* Cards */}
      <div className="space-y-2 mt-2">
        {items.map(task => (
          <KanbanCard key={task.id} task={task}
            onOpen={() => onOpenTask(task.id)}
            onStatusChange={(s) => onStatusChange(task.id, s)}
            statuses={statuses} />
        ))}
      </div>
    </div>
  );
}

// ─── Kanban card ─────────────────────────────────────────────────────────────

function KanbanCard({ task, onOpen, onStatusChange, statuses }: {
  task: Task;
  onOpen: () => void;
  onStatusChange: (s: string) => void;
  statuses: string[];
}) {
  const [statusMenu, setStatusMenu] = useState(false);
  const doneSubs = task.subtasks.filter(s => s.done).length;

  const dateStr = task.dueDate ? new Date(task.dueDate).toLocaleDateString("fr-CA", { month: "short", day: "numeric" }) : null;

  return (
    <div onClick={onOpen}
      className="bg-card border border-border/50 rounded-lg p-3 cursor-pointer hover:border-primary/40 hover:shadow-md transition-all space-y-2">
      <p className="text-sm text-foreground leading-snug">{task.title}</p>

      {/* Icon row */}
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <button onClick={(e) => e.stopPropagation()} title="Assigné"
          className="w-5 h-5 rounded-full border border-border/60 flex items-center justify-center hover:border-primary/40">
          <UserIcon className="w-2.5 h-2.5" />
        </button>
        <button onClick={(e) => e.stopPropagation()} title="Date"
          className={`h-5 px-1.5 rounded border flex items-center gap-1 ${dateStr ? "border-emerald-500/40 text-emerald-400" : "border-border/60"}`}>
          <CalIcon className="w-2.5 h-2.5" />
          {dateStr && <span className="text-[10px] font-medium">{dateStr}</span>}
        </button>
        <button onClick={(e) => e.stopPropagation()} title="Priorité"
          className="w-5 h-5 rounded border border-border/60 flex items-center justify-center hover:border-primary/40">
          <Flag className="w-2.5 h-2.5" />
        </button>
        <button onClick={(e) => e.stopPropagation()} title="Tag"
          className="w-5 h-5 rounded border border-border/60 flex items-center justify-center hover:border-primary/40">
          <Tag className="w-2.5 h-2.5" />
        </button>
        {statuses.length > 1 && (
          <div className="relative ml-auto">
            <button onClick={(e) => { e.stopPropagation(); setStatusMenu(m => !m); }}
              className="text-muted-foreground/50 hover:text-foreground p-0.5">
              <MoreVertical className="w-3 h-3" />
            </button>
            {statusMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setStatusMenu(false); }} />
                <div className="absolute right-0 top-full mt-0.5 z-50 bg-popover border border-border/60 rounded-lg shadow-xl py-1 min-w-[160px]">
                  <p className="text-[9px] uppercase tracking-wider text-muted-foreground px-2.5 pb-1 pt-0.5 font-bold">Déplacer vers</p>
                  {statuses.filter(s => s !== task.status).map(s => (
                    <button key={s} onClick={(e) => { e.stopPropagation(); onStatusChange(s); setStatusMenu(false); }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs hover:bg-muted/50 text-left">
                      <span className={`w-2 h-2 rounded-full ${colorClass[statusColor(s)].split(" ")[0]}`} />
                      {s}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Sub-task count */}
      {task.subtasks.length > 0 && (
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground pt-1 border-t border-border/30">
          <Link2 className="w-3 h-3 -rotate-45" />
          <span>{doneSubs}/{task.subtasks.length} sous-tâche{task.subtasks.length > 1 ? "s" : ""}</span>
        </div>
      )}
    </div>
  );
}

// ─── Task detail modal ──────────────────────────────────────────────────────

function TaskDetailModal({ task, statuses, onClose, onUpdate, onDelete }: {
  task: Task;
  statuses: string[];
  onClose: () => void;
  onUpdate: (patch: Partial<Task>) => void;
  onDelete: () => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [dueDate, setDueDate] = useState(task.dueDate ?? "");
  const [newSubtask, setNewSubtask] = useState("");

  const saveTitle = () => { if (title.trim() && title !== task.title) onUpdate({ title: title.trim() }); };
  const saveDesc  = () => { if (description !== (task.description ?? "")) onUpdate({ description }); };
  const saveDate  = (v: string) => { setDueDate(v); onUpdate({ dueDate: v || undefined }); };

  const addSubtask = () => {
    if (!newSubtask.trim()) return;
    onUpdate({ subtasks: [...task.subtasks, { id: uid(), title: newSubtask.trim(), done: false }] });
    setNewSubtask("");
  };
  const toggleSubtask = (id: string) => {
    onUpdate({ subtasks: task.subtasks.map(s => s.id === id ? { ...s, done: !s.done } : s) });
  };
  const removeSubtask = (id: string) => {
    onUpdate({ subtasks: task.subtasks.filter(s => s.id !== id) });
  };

  return (
    <>
      <div className="fixed inset-0 bg-background/60 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg max-h-[85vh] bg-card border border-border/50 rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
          <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${colorClass[statusColor(task.status)]}`}>
            <CircleDot className="w-2.5 h-2.5" /> {task.status}
          </span>
          <div className="flex items-center gap-1">
            <button onClick={onDelete} title="Supprimer" className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10">
              <Trash2 className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/40">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Title */}
          <Input value={title} onChange={(e) => setTitle(e.target.value)} onBlur={saveTitle}
            className="text-base font-semibold" />

          {/* Status + Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Statut</label>
              <select value={task.status} onChange={(e) => onUpdate({ status: e.target.value })}
                className="w-full h-8 text-xs rounded-md border border-input bg-background px-2 text-foreground">
                {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                {!statuses.includes(task.status) && <option value={task.status}>{task.status}</option>}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Date d'échéance</label>
              <Input type="date" value={dueDate} onChange={(e) => saveDate(e.target.value)} className="h-8 text-xs" />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} onBlur={saveDesc}
              placeholder="Notes, brief, contexte…"
              rows={4}
              className="w-full bg-background border border-border/40 rounded-md p-2.5 text-sm text-foreground resize-none placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40" />
          </div>

          {/* Sub-tasks */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
              Sous-tâches {task.subtasks.length > 0 && `(${task.subtasks.filter(s => s.done).length}/${task.subtasks.length})`}
            </label>
            {task.subtasks.map(st => (
              <div key={st.id} className="flex items-center gap-2 group/st">
                <button onClick={() => toggleSubtask(st.id)}
                  className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${st.done ? "bg-primary border-primary" : "border-muted-foreground/40"}`}>
                  {st.done && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                </button>
                <span className={`flex-1 text-sm ${st.done ? "line-through text-muted-foreground" : "text-foreground"}`}>{st.title}</span>
                <button onClick={() => removeSubtask(st.id)} className="opacity-0 group-hover/st:opacity-100 text-muted-foreground hover:text-destructive">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            <Input value={newSubtask} onChange={(e) => setNewSubtask(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addSubtask(); }}
              placeholder="+ Ajouter une sous-tâche" className="h-7 text-xs mt-1" />
          </div>
        </div>
      </div>
    </>
  );
}
