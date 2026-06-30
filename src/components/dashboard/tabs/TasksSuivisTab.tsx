import { useState, useEffect } from "react";
import {
  ChevronDown, ChevronRight, Plus, Folder as FolderIcon, List as ListIcon,
  Layers, MoreVertical, Trash2, Edit2, Check, X, Sparkles, Loader2,
  CircleDot, Tag, Search,
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
interface Task     { id: string; listId: string; title: string; status: string; description?: string; subtasks: SubTask[]; createdAt: number; }

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
  const addTask = (listId: string, title: string) => update(s => {
    const list = s.lists.find(l => l.id === listId);
    if (!list) return s;
    const status = list.statuses[0] ?? "à faire";
    return { ...s, tasks: [...s.tasks, { id: uid(), listId, title, status, subtasks: [], createdAt: Date.now() }] };
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
            addTask={(title) => addTask(activeList.id, title)}
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

// ─── List view (tasks for selected list) ─────────────────────────────────────

function ListView({ list, tasks, search, setSearch, addTask, updateTask, deleteTask, updateList }: {
  list: ListDef;
  tasks: Task[];
  search: string;
  setSearch: (v: string) => void;
  addTask: (title: string) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  updateList: (patch: Partial<ListDef>) => void;
}) {
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [editingStatuses, setEditingStatuses] = useState(false);
  const [newStatus, setNewStatus] = useState("");

  const filtered = tasks.filter(t => t.title.toLowerCase().includes(search.toLowerCase()));
  const groupedByStatus = list.statuses.map(status => ({
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

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <ListIcon className="w-5 h-5 text-blue-400" />
          <h2 className="text-xl font-bold text-foreground">{list.name}</h2>
          <span className="text-xs text-muted-foreground">{tasks.length} tâche{tasks.length !== 1 ? "s" : ""}</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Rechercher une tâche…" value={search} onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-9 text-sm" />
        </div>
        <Button variant="outline" size="sm" onClick={() => setEditingStatuses(v => !v)} className="gap-1.5">
          <Tag className="w-3.5 h-3.5" /> {editingStatuses ? "Fermer" : "Gérer statuts"}
        </Button>
      </div>

      {/* Statuses editor */}
      {editingStatuses && (
        <div className="rounded-xl border border-border/40 bg-muted/10 p-4 space-y-3">
          <p className="text-xs font-semibold text-foreground">Statuts de cette liste (pipeline)</p>
          <div className="flex flex-wrap gap-2">
            {list.statuses.map(s => (
              <span key={s} className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${colorClass[statusColor(s)]}`}>
                <CircleDot className="w-3 h-3" /> {s}
                <button onClick={() => removeStatus(s)} className="hover:text-foreground"><X className="w-3 h-3" /></button>
              </span>
            ))}
            <div className="flex items-center gap-1">
              <Input value={newStatus} onChange={(e) => setNewStatus(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addStatus(); }}
                placeholder="Nouveau statut" className="h-7 text-xs w-36" />
              <Button size="icon" onClick={addStatus} className="h-7 w-7"><Plus className="w-3.5 h-3.5" /></Button>
            </div>
          </div>
        </div>
      )}

      {/* New task input */}
      <div className="flex gap-2">
        <Input value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && newTaskTitle.trim()) { addTask(newTaskTitle.trim()); setNewTaskTitle(""); } }}
          placeholder="Nom de la tâche (souvent = nom du client)…" className="h-9 text-sm" />
        <Button onClick={() => { if (newTaskTitle.trim()) { addTask(newTaskTitle.trim()); setNewTaskTitle(""); } }}
          disabled={!newTaskTitle.trim()} className="gap-1.5"><Plus className="w-3.5 h-3.5" /> Ajouter</Button>
      </div>

      {/* Tasks grouped by status */}
      <div className="space-y-4">
        {groupedByStatus.map(({ status, items }) => (
          <div key={status}>
            <div className="flex items-center gap-2 mb-2">
              <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full border ${colorClass[statusColor(status)]}`}>
                <CircleDot className="w-3 h-3" /> {status}
              </span>
              <span className="text-[10px] text-muted-foreground">{items.length}</span>
            </div>
            {items.length === 0 ? (
              <p className="text-[11px] text-muted-foreground italic pl-1">Aucune tâche</p>
            ) : (
              <div className="space-y-1.5">
                {items.map(task => (
                  <TaskRow key={task.id} task={task} statuses={list.statuses}
                    onUpdate={(patch) => updateTask(task.id, patch)}
                    onDelete={() => deleteTask(task.id)} />
                ))}
              </div>
            )}
          </div>
        ))}
        {orphans.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] text-amber-400 font-semibold uppercase tracking-wider">Orphelines (statut supprimé)</span>
            </div>
            <div className="space-y-1.5">
              {orphans.map(task => (
                <TaskRow key={task.id} task={task} statuses={list.statuses}
                  onUpdate={(patch) => updateTask(task.id, patch)}
                  onDelete={() => deleteTask(task.id)} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Task row ────────────────────────────────────────────────────────────────

function TaskRow({ task, statuses, onUpdate, onDelete }: {
  task: Task; statuses: string[];
  onUpdate: (patch: Partial<Task>) => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [statusMenu, setStatusMenu] = useState(false);
  const [newSubtask, setNewSubtask] = useState("");
  const [editTitle, setEditTitle] = useState(false);
  const [title, setTitle] = useState(task.title);

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
    <div className="rounded-lg border border-border/40 bg-card hover:border-border/70 transition-colors">
      <div className="flex items-center gap-2 p-2.5">
        <button onClick={() => setExpanded(e => !e)} className="text-muted-foreground/50 hover:text-foreground flex-shrink-0">
          {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>
        {editTitle ? (
          <Input autoFocus value={title} onChange={(e) => setTitle(e.target.value)}
            onBlur={() => { if (title.trim()) onUpdate({ title: title.trim() }); setEditTitle(false); }}
            onKeyDown={(e) => {
              if (e.key === "Enter") { if (title.trim()) onUpdate({ title: title.trim() }); setEditTitle(false); }
              if (e.key === "Escape") { setEditTitle(false); setTitle(task.title); }
            }}
            className="h-7 text-sm flex-1" />
        ) : (
          <span onClick={() => setEditTitle(true)} className="flex-1 text-sm text-foreground cursor-text">{task.title}</span>
        )}
        {task.subtasks.length > 0 && (
          <span className="text-[10px] text-muted-foreground">
            {task.subtasks.filter(s => s.done).length}/{task.subtasks.length}
          </span>
        )}
        <div className="relative">
          <button onClick={() => setStatusMenu(s => !s)}
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${colorClass[statusColor(task.status)]}`}>
            {task.status}
          </button>
          {statusMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setStatusMenu(false)} />
              <div className="absolute right-0 top-full mt-1 z-50 bg-popover border border-border/60 rounded-lg shadow-xl py-1 min-w-[160px]">
                {statuses.map(s => (
                  <button key={s} onClick={() => { onUpdate({ status: s }); setStatusMenu(false); }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs hover:bg-muted/50 text-left">
                    <span className={`w-2 h-2 rounded-full ${colorClass[statusColor(s)].split(" ")[0]}`} />
                    {s}
                    {s === task.status && <Check className="w-3 h-3 ml-auto text-primary" />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <button onClick={onDelete} className="text-muted-foreground/40 hover:text-destructive p-1">
          <Trash2 className="w-3 h-3" />
        </button>
      </div>

      {expanded && (
        <div className="border-t border-border/30 p-3 space-y-3 bg-muted/10">
          {/* Description */}
          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Description</label>
            <textarea value={task.description ?? ""} onChange={(e) => onUpdate({ description: e.target.value })}
              placeholder="Notes, brief, instructions…"
              className="mt-1 w-full bg-background border border-border/40 rounded-md p-2 text-xs text-foreground resize-none placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40"
              rows={2} />
          </div>

          {/* Sub-tasks */}
          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Sous-tâches</label>
            <div className="space-y-1 mt-1">
              {task.subtasks.map(st => (
                <div key={st.id} className="flex items-center gap-2 group/st">
                  <button onClick={() => toggleSubtask(st.id)}
                    className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center flex-shrink-0 ${st.done ? "bg-primary border-primary" : "border-muted-foreground/40"}`}>
                    {st.done && <Check className="w-2 h-2 text-primary-foreground" />}
                  </button>
                  <span className={`flex-1 text-xs ${st.done ? "line-through text-muted-foreground" : "text-foreground"}`}>{st.title}</span>
                  <button onClick={() => removeSubtask(st.id)} className="opacity-0 group-hover/st:opacity-100 text-muted-foreground hover:text-destructive">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <div className="flex items-center gap-1.5 pt-1">
                <Input value={newSubtask} onChange={(e) => setNewSubtask(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") addSubtask(); }}
                  placeholder="+ Ajouter une sous-tâche" className="h-6 text-xs" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
