import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. Copy .env.example to .env and fill in your Supabase project URL and anon key."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ─── Type definitions matching the database schema ───────────────────────────

export type ClientStatus = "active" | "pipeline" | "on_hold" | "lost" | "completed";

export interface Client {
  id: string;
  name: string;
  industry: string | null;
  contract_value: number | null;
  status: ClientStatus;
  contract_start_date: string | null;
  contract_end_date: string | null;
  monthly_recurring_revenue: number | null;
  next_shoot_date: string | null;
  strategy_document_url: string | null;
  google_drive_url: string | null;
  notes: string | null;
  contract_length_months: number | null;
  videos_per_month: number;
  created_at: string;
  updated_at: string;
}

export interface ClientTask {
  id: string;
  client_id: string;
  title: string;
  progress: number;
  completed: boolean;
  cycle_month: string;
  created_at: string;
  updated_at: string;
}

export interface CalendarEvent {
  id: string;
  client_id: string | null;
  title: string;
  description: string | null;
  event_type: "shoot" | "meeting" | "review" | "deadline" | "call" | "other";
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  status: "scheduled" | "confirmed" | "completed" | "cancelled";
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface RevenueMetrics {
  id: string;
  period_start: string;
  period_end: string;
  total_revenue: number;
  monthly_expenses: number;
  extra_revenue: number;
  mrr_goal: number | null;
  yearly_goal: number | null;
  average_ticket: number | null;
  active_clients_count: number;
  pipeline_clients_count: number;
  pipeline_value: number;
  closing_rate: number;
  projected_pipeline_revenue: number;
  churn_rate_confirmed: number;
  churn_rate_temporary: number;
  leads_per_week: number;
  rdv_per_week: number;
  clients_per_week: number;
  salaires_employes: number;
  salaires_direction: number;
  systemes_logiciels: number;
  frais_bureau: number;
  marketing_publicites: number;
  commodites: number;
  transport: number;
  created_at: string;
  updated_at: string;
}

export interface ExpenseItem {
  id: string;
  category: string;
  label: string;
  amount: number;
  period_start: string;
  period_end: string;
  created_at: string;
  updated_at: string;
}

export interface AgencySettings {
  id: string;
  name: string;
  slug: string;
  color: string;
  script_gpt_url: string | null;
  brand_guide_url: string | null;
  gamma_api_key: string | null;
  resend_api_key: string | null;
  notification_email: string | null;
  notifications_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClientPortalCode {
  id: string;
  client_id: string;
  access_code: string;
  created_at: string;
}

export interface ClientJournalEntry {
  id: string;
  client_id: string;
  content: string;
  author: "client" | "agency";
  entry_date: string;
  created_at: string;
}
