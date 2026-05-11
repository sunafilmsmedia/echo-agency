import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCalendarEvents, useCreateCalendarEvent, useUpdateCalendarEvent, useDeleteCalendarEvent } from "@/hooks/useCalendarEvents";
import { useClients } from "@/hooks/useClients";
import { useGoogleCalendarEvents } from "@/hooks/useGoogleCalendar";
import { CalendarEvent } from "@/integrations/supabase/client";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronRight, Plus, Trash2, ExternalLink, Camera, Star, Users, Flag, Phone, CalendarDays, LayoutGrid, Columns } from "lucide-react";
import { toast } from "sonner";

type EventType = "shoot" | "review" | "meeting" | "deadline" | "call";
type ViewMode = "month" | "week";

const EVENT_TYPE_CONFIG: Record<EventType, { label: string; color: string; bg: string; Icon: React.ElementType }> = {
  shoot:    { label: "Tournage",   color: "text-violet-400",  bg: "bg-violet-400/15 border-violet-400/30",  Icon: Camera },
  review:   { label: "Révision",   color: "text-amber-400",   bg: "bg-amber-400/15 border-amber-400/30",   Icon: Star },
  meeting:  { label: "Réunion",    color: "text-primary",     bg: "bg-primary/15 border-primary/30",       Icon: Users },
  deadline: { label: "Deadline",   color: "text-destructive", bg: "bg-destructive/15 border-destructive/30", Icon: Flag },
  call:     { label: "Appel",      color: "text-sky-400",     bg: "bg-sky-400/15 border-sky-400/30",       Icon: Phone },
};

const DAYS_OF_WEEK = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const MONTHS = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];

// Push event to Google Calendar API
async function pushToGoogleCalendar(payload: {
  title: string; event_date: string; start_time?: string | null;
  end_time?: string | null; notes?: string | null;
}) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.provider_token;
  if (!token) return; // not connected with Google, skip silently

  const startDt = payload.start_time
    ? `${payload.event_date}T${payload.start_time}:00`
    : payload.event_date;
  const endDt = payload.end_time
    ? `${payload.event_date}T${payload.end_time}:00`
    : payload.event_date;

  const isAllDay = !payload.start_time;
  const body = {
    summary: payload.title,
    description: payload.notes ?? "",
    start: isAllDay ? { date: payload.event_date } : { dateTime: startDt },
    end: isAllDay ? { date: payload.event_date } : { dateTime: endDt },
  };

  await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ─── Event Dialog ─────────────────────────────────────────────────────────────

interface EventDialogProps {
  open: boolean;
  onClose: () => void;
  defaultDate?: string;
  existingEvent?: CalendarEvent;
}

function EventDialog({ open, onClose, defaultDate, existingEvent }: EventDialogProps) {
  const { data: clients = [] } = useClients();
  const createEvent = useCreateCalendarEvent();
  const updateEvent = useUpdateCalendarEvent();
  const deleteEvent = useDeleteCalendarEvent();

  const [title, setTitle]       = useState(existingEvent?.title ?? "");
  const [type, setType]         = useState<EventType>((existingEvent?.event_type as EventType) ?? "meeting");
  const [date, setDate]         = useState(existingEvent?.event_date ?? defaultDate ?? "");
  const [startTime, setStartTime] = useState(existingEvent?.start_time ?? "09:00");
  const [endTime, setEndTime]   = useState(existingEvent?.end_time ?? "10:00");
  const [status, setStatus]     = useState(existingEvent?.status ?? "scheduled");
  const [clientId, setClientId] = useState(existingEvent?.client_id ?? "");
  const [notes, setNotes]       = useState(existingEvent?.notes ?? "");

  const reset = () => {
    setTitle(""); setType("meeting"); setDate(defaultDate ?? ""); setStartTime("09:00");
    setEndTime("10:00"); setStatus("scheduled"); setClientId(""); setNotes("");
  };

  const handleClose = () => { reset(); onClose(); };

  const handleSave = async () => {
    if (!title.trim() || !date) { toast.error("Titre et date requis"); return; }
    const payload = {
      title: title.trim(), event_type: type, event_date: date,
      start_time: startTime || null, end_time: endTime || null,
      status, client_id: clientId || null, notes: notes || null,
    };
    try {
      if (existingEvent) {
        await updateEvent.mutateAsync({ id: existingEvent.id, ...payload });
        toast.success("Événement mis à jour");
      } else {
        await createEvent.mutateAsync(payload);
        // Also push to Google Calendar
        await pushToGoogleCalendar(payload);
        toast.success("Événement créé");
      }
      handleClose();
    } catch { toast.error("Erreur lors de la sauvegarde"); }
  };

  const handleDelete = async () => {
    if (!existingEvent) return;
    try {
      await deleteEvent.mutateAsync(existingEvent.id);
      toast.success("Événement supprimé");
      handleClose();
    } catch { toast.error("Erreur lors de la suppression"); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{existingEvent ? "Modifier l'événement" : "Nouvel événement"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Titre</Label>
            <Input placeholder="Tournage client X..." value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as EventType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(EVENT_TYPE_CONFIG).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Statut</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Planifié</SelectItem>
                  <SelectItem value="confirmed">Confirmé</SelectItem>
                  <SelectItem value="completed">Terminé</SelectItem>
                  <SelectItem value="cancelled">Annulé</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Début</Label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Fin</Label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Client (optionnel)</Label>
            <Select value={clientId || "none"} onValueChange={(v) => setClientId(v === "none" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Aucun client" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucun</SelectItem>
                {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea placeholder="Détails..." value={notes} onChange={(e) => setNotes(e.target.value)} className="resize-none h-20" />
          </div>
          <div className="flex gap-2 pt-1">
            {existingEvent && (
              <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleteEvent.isPending}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
            <div className="flex-1" />
            <Button variant="ghost" size="sm" onClick={handleClose}>Annuler</Button>
            <Button size="sm" onClick={handleSave} disabled={createEvent.isPending || updateEvent.isPending}>
              {existingEvent ? "Mettre à jour" : "Créer"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Shared event pill ────────────────────────────────────────────────────────

function AppEventPill({ ev, onClick }: { ev: CalendarEvent; onClick: (e: React.MouseEvent) => void }) {
  const cfg = EVENT_TYPE_CONFIG[ev.event_type as EventType] ?? EVENT_TYPE_CONFIG.meeting;
  return (
    <div
      onClick={onClick}
      className={`text-[10px] px-1 py-0.5 rounded truncate border leading-tight cursor-pointer ${cfg.bg} ${cfg.color} hover:opacity-80`}
    >
      {ev.title}
    </div>
  );
}

function GoogleEventPill({ ev }: { ev: { id: string; summary: string; htmlLink: string } }) {
  return (
    <a
      href={ev.htmlLink}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="text-[10px] px-1 py-0.5 rounded truncate border leading-tight bg-blue-500/15 border-blue-500/30 text-blue-400 hover:opacity-80 block"
    >
      {ev.summary}
    </a>
  );
}

// ─── Main CalendarTab ─────────────────────────────────────────────────────────

export function CalendarTab() {
  const today = new Date();
  const [view, setView] = useState<ViewMode>("month");
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-indexed
  const [weekStart, setWeekStart] = useState<Date>(() => {
    const d = new Date(today);
    d.setDate(d.getDate() - d.getDay()); // start of current week (Sunday)
    return d;
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | undefined>();
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | undefined>();

  const { data: events = [] } = useCalendarEvents(year, month + 1);
  const { data: googleEvents, isLoading: googleLoading } = useGoogleCalendarEvents(year, month + 1);

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const toDateStr = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const getAppEventsForDate = (dateStr: string) => events.filter((e) => e.event_date === dateStr);

  const getGoogleEventsForDate = (dateStr: string) => {
    if (!googleEvents) return [];
    return googleEvents.filter((e) => (e.start.date ?? e.start.dateTime?.split("T")[0]) === dateStr);
  };

  const openCreate = (dateStr: string) => {
    setSelectedDate(dateStr); setSelectedEvent(undefined); setDialogOpen(true);
  };

  const openEdit = (e: React.MouseEvent, ev: CalendarEvent) => {
    e.stopPropagation(); setSelectedEvent(ev); setSelectedDate(ev.event_date); setDialogOpen(true);
  };

  // Month navigation
  const prevMonth = () => { if (month === 0) { setMonth(11); setYear((y) => y - 1); } else setMonth((m) => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear((y) => y + 1); } else setMonth((m) => m + 1); };

  // Week navigation
  const prevWeek = () => setWeekStart((d) => { const n = new Date(d); n.setDate(n.getDate() - 7); return n; });
  const nextWeek = () => setWeekStart((d) => { const n = new Date(d); n.setDate(n.getDate() + 7); return n; });

  // Sync week month/year with main state when switching view
  const switchView = (v: ViewMode) => {
    if (v === "month") {
      setYear(weekStart.getFullYear());
      setMonth(weekStart.getMonth());
    } else {
      // go to week containing first day of current month
      const d = new Date(year, month, 1);
      d.setDate(d.getDate() - d.getDay());
      setWeekStart(d);
    }
    setView(v);
  };

  // Week days array
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  // Month grid
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length < totalCells) cells.push(null);

  // Upcoming (sidebar)
  const upcoming = events
    .filter((e) => {
      const diff = (new Date(e.event_date + "T00:00:00").getTime() - today.getTime()) / 86400000;
      return diff >= 0 && diff <= 30 && (e.event_type === "shoot" || e.event_type === "deadline");
    })
    .sort((a, b) => a.event_date.localeCompare(b.event_date))
    .slice(0, 6);

  const connectGoogleCalendar = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        scopes: "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/drive.readonly",
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });
    if (error) toast.error("Erreur de connexion Google");
  };

  const weekLabel = `${weekDays[0].getDate()} ${MONTHS[weekDays[0].getMonth()].slice(0, 3)} — ${weekDays[6].getDate()} ${MONTHS[weekDays[6].getMonth()].slice(0, 3)} ${weekDays[6].getFullYear()}`;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col xl:flex-row gap-6">
        {/* Main calendar area */}
        <div className="flex-1 min-w-0">
          <Card>
            <CardContent className="pt-4 pb-4">
              {/* Nav bar */}
              <div className="flex items-center justify-between mb-4 gap-2">
                <button onClick={view === "month" ? prevMonth : prevWeek} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <h2 className="font-semibold text-sm flex-1 text-center">
                  {view === "month" ? `${MONTHS[month]} ${year}` : weekLabel}
                </h2>
                <button onClick={view === "month" ? nextMonth : nextWeek} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </button>
                {/* View toggle */}
                <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5 ml-2">
                  <button
                    onClick={() => switchView("month")}
                    className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors ${view === "month" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    <LayoutGrid className="w-3 h-3" /> Mois
                  </button>
                  <button
                    onClick={() => switchView("week")}
                    className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors ${view === "week" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    <Columns className="w-3 h-3" /> Semaine
                  </button>
                </div>
              </div>

              {/* Day headers */}
              <div className="grid grid-cols-7 mb-1">
                {DAYS_OF_WEEK.map((d) => (
                  <div key={d} className="text-center text-xs text-muted-foreground font-medium py-1.5">{d}</div>
                ))}
              </div>

              {/* ── MONTH VIEW ── */}
              {view === "month" && (
                <div className="grid grid-cols-7 gap-px bg-border/20 rounded-lg overflow-hidden">
                  {cells.map((day, idx) => {
                    if (!day) return <div key={`blank-${idx}`} className="bg-background/50 min-h-[80px]" />;
                    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                    const dayEvents = getAppEventsForDate(dateStr);
                    const dayGoogle = getGoogleEventsForDate(dateStr);
                    const isToday = dateStr === todayStr;
                    return (
                      <div
                        key={day}
                        onClick={() => openCreate(dateStr)}
                        className={`bg-card min-h-[80px] p-1.5 cursor-pointer hover:bg-muted/50 transition-colors group ${isToday ? "ring-1 ring-inset ring-primary/50" : ""}`}
                      >
                        <div className={`text-xs font-medium mb-1 w-5 h-5 flex items-center justify-center rounded-full ${isToday ? "bg-primary text-primary-foreground" : "text-foreground group-hover:text-primary"}`}>
                          {day}
                        </div>
                        <div className="space-y-0.5">
                          {dayEvents.slice(0, 2).map((ev) => (
                            <AppEventPill key={ev.id} ev={ev} onClick={(e) => openEdit(e, ev)} />
                          ))}
                          {dayGoogle.slice(0, 2).map((ev) => (
                            <GoogleEventPill key={ev.id} ev={ev} />
                          ))}
                          {(dayEvents.length + dayGoogle.length) > 4 && (
                            <div className="text-[10px] text-muted-foreground px-1">+{dayEvents.length + dayGoogle.length - 4}</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── WEEK VIEW ── */}
              {view === "week" && (
                <div className="grid grid-cols-7 gap-px bg-border/20 rounded-lg overflow-hidden">
                  {weekDays.map((d) => {
                    const dateStr = toDateStr(d);
                    const dayEvents = getAppEventsForDate(dateStr);
                    const dayGoogle = getGoogleEventsForDate(dateStr);
                    const isToday = dateStr === todayStr;
                    return (
                      <div
                        key={dateStr}
                        onClick={() => openCreate(dateStr)}
                        className={`bg-card min-h-[160px] p-1.5 cursor-pointer hover:bg-muted/50 transition-colors group ${isToday ? "ring-1 ring-inset ring-primary/50" : ""}`}
                      >
                        <div className={`text-xs font-medium mb-2 w-6 h-6 flex items-center justify-center rounded-full ${isToday ? "bg-primary text-primary-foreground" : "text-foreground group-hover:text-primary"}`}>
                          {d.getDate()}
                        </div>
                        <div className="space-y-1">
                          {dayEvents.map((ev) => (
                            <AppEventPill key={ev.id} ev={ev} onClick={(e) => openEdit(e, ev)} />
                          ))}
                          {dayGoogle.map((ev) => (
                            <GoogleEventPill key={ev.id} ev={ev} />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add button */}
              <div className="mt-3 flex justify-end">
                <Button
                  size="sm" variant="outline"
                  className="gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
                  onClick={() => openCreate(todayStr)}
                >
                  <Plus className="w-3.5 h-3.5" /> Ajouter un événement
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="w-full xl:w-64 space-y-4 flex-shrink-0">
          {/* Legend */}
          <Card>
            <CardContent className="pt-4 pb-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Légende</p>
              {Object.entries(EVENT_TYPE_CONFIG).map(([key, cfg]) => (
                <div key={key} className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${cfg.color.replace("text-", "bg-")}`} />
                  <span className="text-xs text-muted-foreground">{cfg.label}</span>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                <span className="text-xs text-muted-foreground">Google Calendar</span>
              </div>
            </CardContent>
          </Card>

          {/* Google Calendar panel */}
          <Card className="border-blue-500/20 bg-gradient-to-b from-blue-500/5 to-transparent">
            <CardContent className="pt-4 pb-4 space-y-2">
              <div className="flex items-center gap-2 mb-3">
                <CalendarDays className="w-3.5 h-3.5 text-blue-400" />
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Google Calendar</p>
              </div>
              {googleLoading ? (
                <p className="text-xs text-muted-foreground">Chargement...</p>
              ) : googleEvents === null ? (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Non connecté</p>
                  <Button size="sm" variant="outline"
                    className="w-full gap-1.5 border-blue-500/30 text-blue-400 hover:bg-blue-500/10 text-xs"
                    onClick={connectGoogleCalendar}
                  >
                    <svg className="w-3 h-3" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Connecter Google Calendar
                  </Button>
                </div>
              ) : googleEvents.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">Aucun événement ce mois</p>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                    <span className="text-[10px] text-blue-400">Synchronisé · {googleEvents.length} événements</span>
                  </div>
                  {googleEvents.slice(0, 5).map((ev) => {
                    const date = ev.start.date ?? ev.start.dateTime?.split("T")[0] ?? "";
                    const time = ev.start.dateTime ? new Date(ev.start.dateTime).toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" }) : "";
                    return (
                      <a key={ev.id} href={ev.htmlLink} target="_blank" rel="noopener noreferrer" className="block hover:opacity-80 transition-opacity">
                        <p className="text-xs font-medium text-foreground truncate">{ev.summary}</p>
                        <p className="text-[10px] text-muted-foreground">{date}{time ? ` · ${time}` : ""}</p>
                      </a>
                    );
                  })}
                  {googleEvents.length > 5 && <p className="text-[10px] text-muted-foreground">+{googleEvents.length - 5} autres</p>}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming shoots & deadlines */}
          <Card>
            <CardContent className="pt-4 pb-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Tournages & Deadlines (30j)</p>
              {upcoming.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-3">Aucun événement à venir</p>
              ) : upcoming.map((ev) => {
                const cfg = EVENT_TYPE_CONFIG[ev.event_type as EventType] ?? EVENT_TYPE_CONFIG.meeting;
                const diff = Math.round((new Date(ev.event_date + "T00:00:00").getTime() - today.getTime()) / 86400000);
                return (
                  <div key={ev.id} onClick={(e) => openEdit(e, ev)} className="flex items-start gap-2.5 cursor-pointer hover:opacity-80 transition-opacity">
                    <cfg.Icon className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${cfg.color}`} />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{ev.title}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {diff === 0 ? "Aujourd'hui" : diff === 1 ? "Demain" : `Dans ${diff}j`}
                        {ev.start_time ? ` · ${ev.start_time.slice(0, 5)}` : ""}
                      </p>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>

      <EventDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setSelectedEvent(undefined); setSelectedDate(undefined); }}
        defaultDate={selectedDate}
        existingEvent={selectedEvent}
        key={selectedEvent?.id ?? selectedDate ?? "new"}
      />
    </div>
  );
}
