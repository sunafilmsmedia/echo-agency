import Anthropic from "@anthropic-ai/sdk";
import { supabase } from "@/integrations/supabase/client";

const anthropic = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
  dangerouslyAllowBrowser: true,
});

// ─── Tool definitions ─────────────────────────────────────────────────────────

const TOOLS: Anthropic.Tool[] = [
  {
    name: "get_clients",
    description: "Get all clients from the CRM with their details",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "add_client",
    description: "Add a new client to the CRM",
    input_schema: {
      type: "object" as const,
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
      type: "object" as const,
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
      type: "object" as const,
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
      type: "object" as const,
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
      type: "object" as const,
      properties: {
        year: { type: "number", description: "Year (e.g. 2026)" },
        month: { type: "number", description: "Month 1-12" },
      },
      required: ["year", "month"],
    },
  },
  {
    name: "get_revenue_metrics",
    description: "Get current month revenue metrics (MRR, expenses, profit, pipeline)",
    input_schema: { type: "object" as const, properties: {}, required: [] },
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
          .from("revenue_metrics")
          .select("total_revenue, monthly_expenses, active_clients_count, pipeline_value, extra_revenue")
          .eq("period_start", start)
          .maybeSingle();
        if (error) throw error;
        if (!data) return "No revenue metrics found for this month yet.";
        return JSON.stringify(data);
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

  const messages: Anthropic.MessageParam[] = [
    ...history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    { role: "user", content: userMessage },
  ];

  let fullResponse = "";
  let keepGoing = true;

  while (keepGoing) {
    const response = await anthropic.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 1024,
      system: `You are Echo AI, an assistant embedded inside a video marketing agency dashboard. You can manage clients, calendar events, and check revenue. Always be concise. After performing an action, confirm what you did in 1-2 sentences. Today is ${today}.`,
      tools: TOOLS,
      messages,
    });

    if (response.stop_reason === "tool_use") {
      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const block of response.content) {
        if (block.type === "text" && block.text) {
          fullResponse += block.text;
          onUpdate(fullResponse);
        } else if (block.type === "tool_use") {
          const result = await executeTool(block.name, block.input as Record<string, unknown>);
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
