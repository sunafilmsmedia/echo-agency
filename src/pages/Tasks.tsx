import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useClients } from "@/hooks/useClients";
import { useClientTasks, useCreateDefaultTasks, useUpdateClientTask } from "@/hooks/useClientTasks";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Client, ClientTask } from "@/integrations/supabase/client";
import { ArrowLeft, Plus, Zap, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

// ─── Single task row ──────────────────────────────────────────────────────────

interface TaskRowProps {
  task: ClientTask;
}

function TaskRow({ task }: TaskRowProps) {
  const update = useUpdateClientTask();

  const handleCheck = () => {
    const newCompleted = !task.completed;
    update.mutate({ id: task.id, completed: newCompleted, progress: newCompleted ? 100 : task.progress });
  };

  const handleSlider = (values: number[]) => {
    const progress = values[0];
    update.mutate({ id: task.id, progress, completed: progress === 100 });
  };

  return (
    <div className={`flex items-center gap-3 py-2.5 px-3 rounded-lg transition-colors ${task.completed ? "bg-muted/20" : "hover:bg-muted/30"}`}>
      <Checkbox
        checked={task.completed}
        onCheckedChange={handleCheck}
        disabled={update.isPending}
        className="flex-shrink-0"
      />
      <span className={`text-sm flex-1 min-w-0 truncate ${task.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
        {task.title}
      </span>
      <div className="flex items-center gap-2 w-32 flex-shrink-0">
        <Slider
          value={[task.progress]}
          min={0}
          max={100}
          step={10}
          onValueChange={handleSlider}
          disabled={update.isPending}
          className="flex-1"
        />
        <span className="text-xs text-muted-foreground w-7 text-right">{task.progress}%</span>
      </div>
    </div>
  );
}

// ─── Client task card ─────────────────────────────────────────────────────────

interface ClientTaskCardProps {
  client: Client;
  allTasks: ClientTask[];
}

function ClientTaskCard({ client, allTasks }: ClientTaskCardProps) {
  const clientTasks = allTasks.filter((t) => t.client_id === client.id);
  const createDefault = useCreateDefaultTasks();

  const completed = clientTasks.filter((t) => t.completed).length;
  const total = clientTasks.length;
  const avgProgress = total > 0 ? Math.round(clientTasks.reduce((s, t) => s + t.progress, 0) / total) : 0;
  const allDone = total > 0 && completed === total;

  return (
    <Card className={`transition-all ${allDone ? "border-primary/40 shadow-glow" : "border-border/50"}`}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
              <span className="text-primary font-bold text-xs">{client.name.charAt(0).toUpperCase()}</span>
            </div>
            <span className="truncate font-medium">{client.name}</span>
            {allDone && <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />}
          </div>
          {total > 0 && (
            <Badge variant={allDone ? "success" : "secondary"} className="flex-shrink-0 text-xs">
              {completed}/{total}
            </Badge>
          )}
        </CardTitle>
        {total > 0 && <Progress value={avgProgress} className="h-1 mt-1" />}
      </CardHeader>
      <CardContent className="pt-1">
        {total === 0 ? (
          <div className="flex flex-col items-center py-4 gap-3">
            <p className="text-xs text-muted-foreground">Aucune tâche ce mois-ci</p>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 border-primary/30 text-primary hover:bg-primary/10 text-xs"
              onClick={() => createDefault.mutate(client.id)}
              disabled={createDefault.isPending}
            >
              <Plus className="w-3 h-3" /> Créer tâches
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {clientTasks.map((task) => <TaskRow key={task.id} task={task} />)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Tasks page ───────────────────────────────────────────────────────────────

export default function Tasks() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: clients = [] } = useClients();
  const { data: allTasks = [] } = useClientTasks();

  const activeClients = clients.filter((c) => c.status === "active");

  // Quick stats
  const totalTasks = allTasks.length;
  const completedTasks = allTasks.filter((t) => t.completed).length;
  const avgProgress = totalTasks > 0 ? Math.round(allTasks.reduce((s, t) => s + t.progress, 0) / totalTasks) : 0;
  const fullyDoneClients = activeClients.filter((c) => {
    const tasks = allTasks.filter((t) => t.client_id === c.id);
    return tasks.length > 0 && tasks.every((t) => t.completed);
  }).length;

  // Supabase Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("client_tasks_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "client_tasks" }, () => {
        qc.invalidateQueries({ queryKey: ["client-tasks"] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [qc]);

  // Auth guard
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate("/login");
    });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-4">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </button>
          <div className="h-4 w-px bg-border/50" />
          <h1 className="font-semibold text-sm text-foreground flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" /> Tâches Clients
          </h1>
          <div className="flex-1" />
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>{completedTasks}/{totalTasks} tâches</span>
            <span>{avgProgress}% en moyenne</span>
            <span className="text-primary font-medium">{fullyDoneClients}/{activeClients.length} clients terminés</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Overall progress bar */}
        {totalTasks > 0 && (
          <div className="mb-6 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Progression globale du mois</span>
              <span>{avgProgress}%</span>
            </div>
            <Progress value={avgProgress} className="h-2" />
          </div>
        )}

        {/* Client grid */}
        {activeClients.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <p className="text-sm">Aucun client actif.</p>
            <p className="text-xs mt-1">Ajoutez des clients dans le CRM et marquez-les comme actifs.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {activeClients.map((client) => (
              <ClientTaskCard key={client.id} client={client} allTasks={allTasks} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
