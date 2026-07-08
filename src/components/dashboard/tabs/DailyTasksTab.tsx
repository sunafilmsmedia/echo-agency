import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Sparkles, X, User as UserIcon, UserPlus, ChevronDown } from "lucide-react";

// ─── Types & storage ─────────────────────────────────────────────────────────

interface Person {
  id: string;
  name: string;
  color: string; // hex — used for the person's tab dot AND for tasks assigned BY this person
}

interface DailyTask {
  id: string;
  text: string;
  completed: boolean;
  personId: string;      // whose list this task belongs to
  assignedById?: string; // if set AND different from personId, task was assigned by someone else
  difficulty?: number;
  reason?: string;
  createdAt: number;
}

const PEOPLE_KEY  = "daily_tasks_people";
const TASKS_KEY   = "daily_tasks_tasks";
const VIEWER_KEY  = "daily_tasks_current_viewer";

const PALETTE = [
  "#7c3aed", "#0891b2", "#059669", "#ea580c",
  "#dc2626", "#db2777", "#2563eb", "#ca8a04",
  "#9333ea", "#15803d",
];

function loadPeople(): Person[] {
  try { return JSON.parse(localStorage.getItem(PEOPLE_KEY) || "[]"); }
  catch { return []; }
}
function savePeople(p: Person[]) { localStorage.setItem(PEOPLE_KEY, JSON.stringify(p)); }

function loadTasks(): DailyTask[] {
  try { return JSON.parse(localStorage.getItem(TASKS_KEY) || "[]"); }
  catch { return []; }
}
function saveTasks(t: DailyTask[]) { localStorage.setItem(TASKS_KEY, JSON.stringify(t)); }

const difficultyConfig = {
  1: { label: "Facile",    color: "text-emerald-400 bg-emerald-400/10" },
  2: { label: "Simple",    color: "text-primary bg-primary/10" },
  3: { label: "Moyen",     color: "text-amber-400 bg-amber-400/10" },
  4: { label: "Difficile", color: "text-orange-400 bg-orange-400/10" },
  5: { label: "Complexe",  color: "text-destructive bg-destructive/10" },
};

// ─── Main component ─────────────────────────────────────────────────────────

export function DailyTasksTab() {
  const [people, setPeople]     = useState<Person[]>(() => loadPeople());
  const [tasks, setTasks]       = useState<DailyTask[]>(() => loadTasks());
  const [selectedId, setSelectedId] = useState<string>("");
  const [viewerId, setViewerId] = useState<string>(() => localStorage.getItem(VIEWER_KEY) || "");
  const [input, setInput]       = useState("");
  const [organizing, setOrganizing] = useState(false);
  const [addingPerson, setAddingPerson] = useState(false);
  const [newPersonName, setNewPersonName] = useState("");
  const [viewerMenu, setViewerMenu] = useState(false);

  // Persist
  useEffect(() => savePeople(people), [people]);
  useEffect(() => saveTasks(tasks), [tasks]);
  useEffect(() => {
    if (viewerId) localStorage.setItem(VIEWER_KEY, viewerId);
  }, [viewerId]);

  // Default selection when people are loaded
  useEffect(() => {
    if (people.length > 0 && !selectedId) setSelectedId(people[0].id);
    if (people.length > 0 && !viewerId) setViewerId(people[0].id);
  }, [people, selectedId, viewerId]);

  const selectedPerson = people.find((p) => p.id === selectedId);
  const viewer         = people.find((p) => p.id === viewerId);
  const selectedTasks  = tasks
    .filter((t) => t.personId === selectedId)
    .sort((a, b) => (a.completed === b.completed ? 0 : a.completed ? 1 : -1));

  // ── People management ──

  const addPerson = () => {
    const name = newPersonName.trim();
    if (!name) return;
    const person: Person = {
      id: crypto.randomUUID(),
      name,
      color: PALETTE[people.length % PALETTE.length],
    };
    setPeople((prev) => [...prev, person]);
    setSelectedId(person.id);
    if (!viewerId) setViewerId(person.id);
    setNewPersonName("");
    setAddingPerson(false);
  };

  const removePerson = (id: string) => {
    if (!confirm("Supprimer cette personne et toutes ses tâches?")) return;
    setPeople((prev) => prev.filter((p) => p.id !== id));
    setTasks((prev) => prev.filter((t) => t.personId !== id));
    if (selectedId === id) setSelectedId(people[0]?.id ?? "");
    if (viewerId === id) setViewerId(people[0]?.id ?? "");
  };

  // ── Task ops ──

  const addTask = () => {
    const text = input.trim();
    if (!text || !selectedId) return;
    const task: DailyTask = {
      id: crypto.randomUUID(),
      text,
      completed: false,
      personId: selectedId,
      assignedById: viewerId && viewerId !== selectedId ? viewerId : undefined,
      createdAt: Date.now(),
    };
    setTasks((prev) => [task, ...prev]);
    setInput("");
  };

  const toggleTask = (id: string) => {
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const deleteTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const clearCompleted = () => {
    setTasks((prev) => prev.filter((t) => !(t.personId === selectedId && t.completed)));
  };

  const organizeWithAI = async () => {
    const pending = selectedTasks.filter((t) => !t.completed);
    if (pending.length === 0) { toast.error("Aucune tâche à organiser"); return; }
    setOrganizing(true);
    try {
      const { data, error } = await supabase.functions.invoke("organize-tasks", {
        body: { tasks: pending.map((t) => ({ text: t.text })) },
      });
      if (error) throw error;
      const sorted = data.tasks as { text: string; difficulty: number; reason: string }[];
      setTasks((prev) => {
        // Replace difficulty/reason for tasks in the current person's list
        return prev.map((t) => {
          if (t.personId !== selectedId || t.completed) return t;
          const match = sorted.find((s) => s.text === t.text);
          return match ? { ...t, difficulty: match.difficulty, reason: match.reason } : t;
        });
      });
      toast.success("Tâches organisées par difficulté");
    } catch {
      toast.error("Erreur lors de l'organisation");
    } finally {
      setOrganizing(false);
    }
  };

  const completedCount = selectedTasks.filter((t) => t.completed).length;

  // ─────────── Empty state (no people yet) ───────────

  if (people.length === 0) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <Card>
          <CardContent className="pt-10 pb-10 flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <UserPlus className="w-7 h-7 text-primary" />
            </div>
            <div>
              <p className="text-base font-semibold text-foreground">Ajoute une première personne</p>
              <p className="text-sm text-muted-foreground mt-1">Chaque personne a sa propre liste. Les supérieurs peuvent assigner des tâches dans les listes des autres.</p>
            </div>
            <div className="flex gap-2 w-full max-w-xs">
              <Input autoFocus value={newPersonName} onChange={(e) => setNewPersonName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addPerson()}
                placeholder="Ex: Sandra, David, Toi…" />
              <Button onClick={addPerson} disabled={!newPersonName.trim()} className="gap-1.5">
                <Plus className="w-4 h-4" /> Ajouter
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4 max-w-4xl mx-auto">
      {/* ── Header: viewer selector ── */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">Tâches du Jour</h2>
        <div className="relative">
          <button onClick={() => setViewerMenu((v) => !v)}
            className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors">
            <span className="text-muted-foreground">Je suis :</span>
            {viewer ? (
              <>
                <span className="w-2 h-2 rounded-full" style={{ background: viewer.color }} />
                <span className="font-semibold text-foreground">{viewer.name}</span>
              </>
            ) : (
              <span className="text-muted-foreground italic">personne</span>
            )}
            <ChevronDown className="w-3 h-3 text-muted-foreground" />
          </button>
          {viewerMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setViewerMenu(false)} />
              <div className="absolute right-0 top-full mt-1 z-50 bg-popover border border-border/60 rounded-lg shadow-xl py-1 min-w-[180px]">
                <p className="text-[9px] uppercase tracking-wider text-muted-foreground px-2.5 py-1 font-bold">Voir en tant que</p>
                {people.map((p) => (
                  <button key={p.id} onClick={() => { setViewerId(p.id); setViewerMenu(false); }}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-xs hover:bg-muted/50 text-left ${p.id === viewerId ? "bg-primary/8 text-primary" : ""}`}>
                    <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                    <span className="flex-1 font-medium">{p.name}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Person tabs ── */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {people.map((p) => {
          const active = p.id === selectedId;
          const count = tasks.filter((t) => t.personId === p.id && !t.completed).length;
          return (
            <button key={p.id} onClick={() => setSelectedId(p.id)}
              className={`group flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${active
                ? "border-primary/60 bg-primary/8"
                : "border-border/40 bg-muted/10 hover:border-border/70"}`}>
              <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
              <span className={`text-sm ${active ? "text-foreground font-semibold" : "text-foreground/80"}`}>{p.name}</span>
              {count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${active ? "bg-primary/20 text-primary" : "bg-muted/40 text-muted-foreground"}`}>{count}</span>
              )}
              {p.id === viewerId && (
                <span title="C'est toi" className="text-[9px] font-bold uppercase tracking-wider text-primary">TOI</span>
              )}
              <button onClick={(e) => { e.stopPropagation(); removePerson(p.id); }}
                className="opacity-0 group-hover:opacity-100 ml-1 text-muted-foreground hover:text-destructive transition-opacity">
                <X className="w-3 h-3" />
              </button>
            </button>
          );
        })}

        {addingPerson ? (
          <div className="flex items-center gap-1">
            <Input autoFocus value={newPersonName} onChange={(e) => setNewPersonName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addPerson(); if (e.key === "Escape") setAddingPerson(false); }}
              onBlur={() => { if (!newPersonName.trim()) setAddingPerson(false); }}
              placeholder="Nom…" className="h-8 text-xs w-32" />
            <Button size="icon" onClick={addPerson} className="h-8 w-8" disabled={!newPersonName.trim()}>
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>
        ) : (
          <button onClick={() => setAddingPerson(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-dashed border-border/50 text-muted-foreground hover:text-foreground hover:border-border transition-colors text-sm">
            <UserPlus className="w-3.5 h-3.5" />
            Ajouter
          </button>
        )}
      </div>

      {/* ── Selected person's task list ── */}
      {selectedPerson && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: `${selectedPerson.color}22` }}>
                  <UserIcon className="w-4 h-4" style={{ color: selectedPerson.color }} />
                </div>
                <div>
                  <p className="text-sm font-semibold">Liste de {selectedPerson.name}</p>
                  <p className="text-[11px] text-muted-foreground font-normal">
                    {viewerId && viewerId !== selectedId
                      ? <>Tu ajoutes en tant que <span style={{ color: viewer?.color }}>{viewer?.name}</span> — ces tâches seront colorées</>
                      : "Tes propres tâches"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {completedCount > 0 && (
                  <Button size="sm" variant="ghost" onClick={clearCompleted} className="text-xs gap-1">
                    <Trash2 className="w-3.5 h-3.5" /> {completedCount} terminée{completedCount > 1 ? "s" : ""}
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={organizeWithAI} disabled={organizing}
                  className="gap-1.5 border-primary/30 text-primary hover:bg-primary/10">
                  <Sparkles className="w-3.5 h-3.5" />
                  {organizing ? "Organisation..." : "Organiser avec l'IA"}
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add task */}
            <div className="flex gap-2">
              <Input
                placeholder={viewerId && viewerId !== selectedId
                  ? `Nouvelle tâche pour ${selectedPerson.name}…`
                  : "Nouvelle tâche..."}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addTask()}
              />
              <Button onClick={addTask} size="icon" variant="outline">
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {selectedTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Aucune tâche pour {selectedPerson.name}.
              </p>
            ) : (
              <div className="space-y-2">
                {selectedTasks.map((task) => {
                  const diff = task.difficulty as keyof typeof difficultyConfig | undefined;
                  const diffCfg = diff ? difficultyConfig[diff] : null;
                  const assigner = task.assignedById ? people.find((p) => p.id === task.assignedById) : null;
                  const isAssigned = !!assigner;
                  return (
                    <div key={task.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${task.completed
                        ? "border-border/30 bg-muted/20"
                        : isAssigned ? "" : "border-border/50 bg-card"}`}
                      style={isAssigned && !task.completed ? {
                        borderColor: `${assigner!.color}55`,
                        background: `${assigner!.color}0a`,
                        borderLeftWidth: 3,
                        borderLeftColor: assigner!.color,
                      } : undefined}
                    >
                      <Checkbox checked={task.completed} onCheckedChange={() => toggleTask(task.id)} className="mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${task.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                          {task.text}
                        </p>
                        {isAssigned && !task.completed && (
                          <p className="text-[10px] font-semibold mt-0.5 uppercase tracking-wider" style={{ color: assigner!.color }}>
                            Assignée par {assigner!.name}
                          </p>
                        )}
                        {task.reason && !task.completed && (
                          <p className="text-xs text-muted-foreground mt-0.5">{task.reason}</p>
                        )}
                      </div>
                      {diffCfg && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${diffCfg.color}`}>
                          {diffCfg.label}
                        </span>
                      )}
                      <button onClick={() => deleteTask(task.id)} className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {selectedTasks.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {completedCount}/{selectedTasks.length} terminées · {selectedTasks.filter((t) => t.assignedById && t.assignedById !== selectedId).length} assignées par un supérieur
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
