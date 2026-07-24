import { supabase } from "@/integrations/supabase/client";
import { callClaude, type ClaudeMessage, type ClaudeTool, type ClaudeContentBlock } from "@/lib/claude-client";

// ─── Tool definitions ─────────────────────────────────────────────────────────

const TOOLS: ClaudeTool[] = [
  {
    name: "get_clients",
    description: "Get all clients from the CRM with their details",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "add_client",
    description: "Add a new client to the CRM",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Client or company name" },
        industry: { type: "string", description: "Industry or niche" },
        monthly_recurring_revenue: { type: "number", description: "Monthly retainer in USD" },
        status: { type: "string", enum: ["active", "pipeline", "on_hold", "lost", "completed"] },
        contract_start_date: { type: "string", description: "YYYY-MM-DD" },
        contract_length_months: { type: "number", description: "Contract duration in months" },
        videos_per_month: { type: "number", description: "Videos delivered per month" },
        notes: { type: "string", description: "Any notes about the client" },
      },
      required: ["name"],
    },
  },
  {
    name: "update_client",
    description: "Update an existing client's details. First call get_clients to find the client ID.",
    input_schema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Client UUID" },
        name: { type: "string" },
        industry: { type: "string" },
        monthly_recurring_revenue: { type: "number" },
        status: { type: "string", enum: ["active", "pipeline", "on_hold", "lost", "completed"] },
        contract_length_months: { type: "number" },
        videos_per_month: { type: "number" },
        notes: { type: "string" },
      },
      required: ["id"],
    },
  },
  {
    name: "delete_client",
    description: "Delete a client from the CRM. First call get_clients to find the client ID.",
    input_schema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Client UUID to delete" },
      },
      required: ["id"],
    },
  },
  {
    name: "add_calendar_event",
    description: "Add a new event to the calendar (shoot, meeting, deadline, call, review)",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        event_type: { type: "string", enum: ["shoot", "meeting", "review", "deadline", "call"] },
        event_date: { type: "string", description: "YYYY-MM-DD" },
        start_time: { type: "string", description: "HH:MM" },
        end_time: { type: "string", description: "HH:MM" },
        notes: { type: "string" },
        status: { type: "string", enum: ["scheduled", "confirmed", "completed", "cancelled"] },
      },
      required: ["title", "event_date", "event_type"],
    },
  },
  {
    name: "get_calendar_events",
    description: "Get upcoming calendar events",
    input_schema: {
      type: "object",
      properties: {
        year: { type: "number", description: "Year (e.g. 2026)" },
        month: { type: "number", description: "Month 1-12" },
      },
      required: ["year", "month"],
    },
  },
  {
    name: "get_revenue_metrics",
    description: "Get current month revenue metrics (MRR, extras, expenses, extra_expenses, profit, pipeline, goals, growth KPI).",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "get_revenue_history",
    description: "Get last N months of revenue metrics history — for trend analysis (MRR evolution, expenses evolution, YTD).",
    input_schema: {
      type: "object",
      properties: { months: { type: "number", description: "Number of past months to fetch (default 6, max 24)" } },
      required: [],
    },
  },
  {
    name: "get_expense_items",
    description: "Get detailed expenses (recurring, categorized). Useful to find where money leaks.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "get_agency_settings",
    description: "Get the agency profile: name, slug, color, brand assets, integrations connected.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "get_client_kpi_summary",
    description: "Aggregate the last N months of KPI data (views, videos, budget, leads, CPL) for a specific client. Use after get_clients to find the ID.",
    input_schema: {
      type: "object",
      properties: {
        clientId:    { type: "string", description: "Client UUID" },
        monthsBack:  { type: "number", description: "Lookback in months (default 3, max 12)" },
      },
      required: ["clientId"],
    },
  },
];

// ─── Tool execution ───────────────────────────────────────────────────────────

async function executeTool(name: string, input: Record<string, unknown>): Promise<string> {
  try {
    switch (name) {
      case "get_clients": {
        const { data, error } = await supabase
          .from("clients")
          .select("id, name, industry, status, monthly_recurring_revenue, contract_start_date, contract_length_months, videos_per_month, notes")
          .order("created_at", { ascending: false });
        if (error) throw error;
        return JSON.stringify(data);
      }

      case "add_client": {
        const payload = { videos_per_month: 4, status: "pipeline", ...input };
        const { data, error } = await supabase.from("clients").insert(payload).select().single();
        if (error) throw error;
        await supabase.rpc("calculate_revenue_metrics");
        return `Client "${(data as { name: string }).name}" created with ID ${(data as { id: string }).id}`;
      }

      case "update_client": {
        const { id, ...rest } = input;
        const { error } = await supabase.from("clients").update(rest).eq("id", id as string);
        if (error) throw error;
        await supabase.rpc("calculate_revenue_metrics");
        return "Client updated successfully";
      }

      case "delete_client": {
        const { error } = await supabase.from("clients").delete().eq("id", input.id as string);
        if (error) throw error;
        await supabase.rpc("calculate_revenue_metrics");
        return "Client deleted successfully";
      }

      case "add_calendar_event": {
        const payload = { status: "scheduled", ...input };
        const { error } = await supabase.from("calendar_events").insert(payload);
        if (error) throw error;
        return `Event "${input.title}" added on ${input.event_date}`;
      }

      case "get_calendar_events": {
        const { year, month } = input as { year: number; month: number };
        const start = `${year}-${String(month).padStart(2, "0")}-01`;
        const end = `${year}-${String(month).padStart(2, "0")}-31`;
        const { data, error } = await supabase
          .from("calendar_events")
          .select("title, event_type, event_date, start_time, status")
          .gte("event_date", start)
          .lte("event_date", end)
          .order("event_date");
        if (error) throw error;
        return JSON.stringify(data);
      }

      case "get_revenue_metrics": {
        const now = new Date();
        const start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
        const { data, error } = await supabase
          .from("revenue_metrics").select("*").eq("period_start", start).maybeSingle();
        if (error) throw error;
        if (!data) return "No revenue metrics for this month yet.";
        return JSON.stringify(data);
      }

      case "get_revenue_history": {
        const months = Math.min(Math.max(Number((input as { months?: number }).months ?? 6), 1), 24);
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
        const startIso = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-01`;
        const { data, error } = await supabase
          .from("revenue_metrics")
          .select("period_start, total_revenue, extra_revenue, monthly_expenses, extra_expenses, active_clients_count, closing_rate, leads_per_week, rdv_per_week")
          .gte("period_start", startIso)
          .order("period_start", { ascending: true });
        if (error) throw error;
        return JSON.stringify(data ?? []);
      }

      case "get_expense_items": {
        const { data, error } = await supabase
          .from("expense_items")
          .select("category, label, amount, period_start")
          .order("amount", { ascending: false });
        if (error) throw error;
        return JSON.stringify(data ?? []);
      }

      case "get_agency_settings": {
        const { data, error } = await supabase
          .from("agency_settings")
          .select("id, name, slug, color, notifications_enabled, notification_email")
          .limit(1).maybeSingle();
        if (error) throw error;
        // Also surface connected integrations (public view, no tokens)
        const { data: integrations } = await supabase
          .from("agency_integrations_public")
          .select("provider, metadata");
        return JSON.stringify({ ...data, integrations: integrations ?? [] });
      }

      case "get_client_kpi_summary": {
        const { clientId, monthsBack = 3 } = input as { clientId: string; monthsBack?: number };
        const N = Math.min(Math.max(Number(monthsBack) || 3, 1), 12);
        const now = new Date();
        let totalViews = 0, totalVideos = 0, totalBudget = 0, totalLeads = 0;
        const monthly: any[] = [];
        for (let i = 0; i < N; i++) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const key = `kpi_${d.getFullYear()}_${String(d.getMonth() + 1).padStart(2, "0")}`;
          let raw: Record<string, any> = {};
          try { raw = JSON.parse(localStorage.getItem(key) || "{}"); } catch { /* ignore */ }
          const row = raw[clientId];
          if (!row) continue;
          const budget = typeof row.budget === "number" ? row.budget : null;
          const leads  = typeof row.leads  === "number" ? row.leads  : null;
          monthly.push({
            period: key.replace("kpi_", ""),
            views: row.views ?? null, videos: row.videos ?? null,
            budget, leads,
            cpl: (budget !== null && leads !== null && leads > 0) ? Math.round((budget / leads) * 100) / 100 : null,
          });
          totalViews  += row.views  ?? 0;
          totalVideos += row.videos ?? 0;
          totalBudget += budget ?? 0;
          totalLeads  += leads  ?? 0;
        }
        const avgCpl = totalLeads > 0 ? Math.round((totalBudget / totalLeads) * 100) / 100 : null;
        return JSON.stringify({
          clientId, monthsAnalyzed: N,
          totals: { views: totalViews, videos: totalVideos, budget: totalBudget, leads: totalLeads, avgCpl },
          monthly,
        });
      }

      default:
        return "Unknown tool";
    }
  } catch (e) {
    return `Error: ${e instanceof Error ? e.message : String(e)}`;
  }
}

// ─── Main chat function ───────────────────────────────────────────────────────

export interface Message {
  role: "user" | "assistant";
  content: string;
}

export async function sendMessage(
  history: Message[],
  userMessage: string,
  onUpdate: (text: string) => void
): Promise<string> {
  const today = new Date().toISOString().split("T")[0];

  const messages: ClaudeMessage[] = [
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: userMessage },
  ];

  let fullResponse = "";
  let keepGoing = true;

  while (keepGoing) {
    const response = await callClaude({
      max_tokens: 2048,
      system: `Tu es Echo, l'assistant IA intégré au dashboard d'une agence de marketing vidéo (Suna Films Media).

Aujourd'hui : ${today}.

TU AS ACCÈS EN LECTURE À TOUTES LES DONNÉES BUSINESS :
- get_clients : tous les clients (actifs, pipeline, perdus, on_hold) avec MRR, contrats, notes, services
- get_revenue_metrics : mois en cours (MRR, extras, dépenses, dépenses extras, taux de closing, leads/sem, RDV/sem)
- get_revenue_history(months=N) : historique jusqu'à 24 mois — pour analyser tendances et calculer croissance
- get_expense_items : toutes les dépenses détaillées catégorisées
- get_agency_settings : profil de l'agence + intégrations connectées (Calendly, Stripe, etc.)
- get_client_kpi_summary(clientId, monthsBack) : agrégat de vues/vidéos/budget/leads/CPL par client
- get_calendar_events(year, month) : événements planifiés

TU PEUX AGIR :
- add_client / update_client / delete_client
- add_calendar_event

RÈGLES DE COMPORTEMENT :
1. **Sois proactif** : quand on te pose une question business ("est-ce que ça va bien ?", "quoi faire cette semaine ?"), CHERCHE les données pertinentes AVANT de répondre. Croise plusieurs sources.
2. **Réponds avec des chiffres, pas des généralités**. Cite les valeurs exactes que tu trouves. Ex : "Ton MRR est à 52 500 $ (+8 % vs mai)" — pas "ton MRR se porte bien".
3. **Concis et actionnable**. 2-5 puces max pour une analyse. Termine toujours par UNE recommandation concrète.
4. **Après une action** : confirme en 1 phrase ce que tu as fait.
5. **Si une donnée manque** : dis-le clairement, ne l'invente jamais. Suggère à l'utilisateur comment la remplir.
6. **Français par défaut** (Québec-friendly). Anglais si l'utilisateur switche.
7. **Format** : puces courtes, montants en $ CAD, dates lisibles. Emojis discrets (max 1-2 par réponse) pour hiérarchiser.

EXEMPLES DE COMPORTEMENT :
- Question : "Comment vont mes dépenses ?" → appelle get_expense_items + get_revenue_metrics → réponds avec ratio dépenses/MRR + top 3 dépenses + conseil.
- Question : "Analyse Vyncent" → get_clients pour trouver l'ID → get_client_kpi_summary → réponds avec vues/leads/CPL + tendance.
- Question : "Que faire cette semaine ?" → check clients (contrats qui expirent), tâches, revenus vs objectif → priorise 3 actions.`,
      tools: TOOLS,
      messages,
    });

    if (response.stop_reason === "tool_use") {
      const toolResults: ClaudeContentBlock[] = [];

      for (const block of response.content) {
        if (block.type === "text" && block.text) {
          fullResponse += block.text;
          onUpdate(fullResponse);
        } else if (block.type === "tool_use") {
          const result = await executeTool(block.name, block.input);
          toolResults.push({ type: "tool_result", tool_use_id: block.id, content: result });
        }
      }

      messages.push({ role: "assistant", content: response.content });
      messages.push({ role: "user", content: toolResults });
    } else {
      for (const block of response.content) {
        if (block.type === "text") {
          fullResponse += block.text;
          onUpdate(fullResponse);
        }
      }
      keepGoing = false;
    }
  }

  return fullResponse;
}
