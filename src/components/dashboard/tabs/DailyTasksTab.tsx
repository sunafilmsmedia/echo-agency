import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Sparkles, X } from "lucide-react";

interface Task {
  id: string;
  text: string;
  completed: boolean;
  difficulty?: number;
  reason?: string;
}

const difficultyConfig = {
  1: { label: "Facile", color: "text-emerald-400 bg-emerald-400/10" },
  2: { label: "Simple", color: "text-primary bg-primary/10" },
  3: { label: "Moyen", color: "text-amber-400 bg-amber-400/10" },
  4: { label: "Difficile", color: "text-orange-400 bg-orange-400/10" },
  5: { label: "Complexe", color: "text-destructive bg-destructive/10" },
};

export function DailyTasksTab() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [input, setInput] = useState("");
  const [organizing, setOrganizing] = useState(false);

  const addTask = () => {
    const text = input.trim();
    if (!text) return;
    setTasks((prev) => [...prev, { id: crypto.randomUUID(), text, completed: false }]);
    setInput("");
  };

  const toggleTask = (id: string) => {
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const deleteTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const clearCompleted = () => {
    setTasks((prev) => prev.filter((t) => !t.completed));
  };

  const organizeWithAI = async () => {
    const pending = tasks.filter((t) => !t.completed);
    if (pending.length === 0) { toast.error("Aucune tâche à organiser"); return; }
    setOrganizing(true);
    try {
      const { data, error } = await supabase.functions.invoke("organize-tasks", {
        body: { tasks: pending.map((t) => ({ text: t.text })) },
      });
      if (error) throw error;
      const sorted = data.tasks as { text: string; difficulty: number; reason: string }[];
      setTasks((prev) => {
        const completed = prev.filter((t) => t.completed);
        const organized = sorted.map((s) => {
          const existing = pending.find((p) => p.text === s.text);
          return existing
            ? { ...existing, difficulty: s.difficulty, reason: s.reason }
            : { id: crypto.randomUUID(), text: s.text, completed: false, difficulty: s.difficulty, reason: s.reason };
        });
        return [...organized, ...completed];
      });
      toast.success("Tâches organisées par difficulté");
    } catch {
      toast.error("Erreur lors de l'organisation");
    } finally {
      setOrganizing(false);
    }
  };

  const completedCount = tasks.filter((t) => t.completed).length;

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            <span>Tâches du Jour</span>
            <div className="flex items-center gap-2">
              {completedCount > 0 && (
                <Button size="sm" variant="ghost" onClick={clearCompleted} className="text-xs gap-1">
                  <Trash2 className="w-3.5 h-3.5" /> Supprimer terminées
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={organizeWithAI}
                disabled={organizing}
                className="gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
              >
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
              placeholder="Nouvelle tâche..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTask()}
            />
            <Button onClick={addTask} size="icon" variant="outline">
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {/* Task list */}
          {tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Aucune tâche. Commencez par en ajouter une!
            </p>
          ) : (
            <div className="space-y-2">
              {tasks.map((task) => {
                const diff = task.difficulty as keyof typeof difficultyConfig | undefined;
                const diffCfg = diff ? difficultyConfig[diff] : null;
                return (
                  <div
                    key={task.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                      task.completed ? "border-border/30 bg-muted/20" : "border-border/50 bg-card"
                    }`}
                  >
                    <Checkbox
                      checked={task.completed}
                      onCheckedChange={() => toggleTask(task.id)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${task.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                        {task.text}
                      </p>
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

          {tasks.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {completedCount}/{tasks.length} terminées
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
