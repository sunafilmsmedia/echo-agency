-- ─────────────────────────────────────────────────────────────
-- Echo Agency Platform — Supabase Schema
-- Run this entire file in the Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────

-- Custom ENUM types
CREATE TYPE client_status AS ENUM ('active', 'pipeline', 'on_hold', 'lost', 'completed');
CREATE TYPE task_urgency  AS ENUM ('normal', 'urgent', 'late');

-- ─── clients ─────────────────────────────────────────────────
CREATE TABLE clients (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                     text NOT NULL,
  industry                 text,
  contract_value           numeric,
  status                   client_status NOT NULL DEFAULT 'pipeline',
  contract_start_date      date,
  contract_end_date        date,
  monthly_recurring_revenue numeric,
  next_shoot_date          date,
  strategy_document_url    text,
  google_drive_url         text,
  notes                    text,
  contract_length_months   integer,
  videos_per_month         integer NOT NULL DEFAULT 0,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

-- ─── client_tasks ────────────────────────────────────────────
CREATE TABLE client_tasks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   uuid NOT NULL,
  title       text NOT NULL,
  progress    integer NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  completed   boolean NOT NULL DEFAULT false,
  cycle_month date NOT NULL DEFAULT date_trunc('month', now())::date,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ─── tasks (urgency-based, used by useTasks hook) ────────────
CREATE TABLE tasks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   uuid NOT NULL,
  title       text NOT NULL,
  description text,
  completed   boolean NOT NULL DEFAULT false,
  urgency     task_urgency NOT NULL DEFAULT 'normal',
  due_date    date,
  cycle_month date NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ─── calendar_events ─────────────────────────────────────────
CREATE TABLE calendar_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   uuid,
  title       text NOT NULL,
  description text,
  event_type  text NOT NULL DEFAULT 'other',
  event_date  date NOT NULL,
  start_time  time,
  end_time    time,
  status      text NOT NULL DEFAULT 'scheduled',
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ─── revenue_metrics ─────────────────────────────────────────
CREATE TABLE revenue_metrics (
  id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_start               date NOT NULL,
  period_end                 date NOT NULL,
  total_revenue              numeric NOT NULL DEFAULT 0,
  monthly_expenses           numeric NOT NULL DEFAULT 0,
  extra_revenue              numeric NOT NULL DEFAULT 0,
  mrr_goal                   numeric,
  yearly_goal                numeric,
  average_ticket             numeric,
  active_clients_count       integer NOT NULL DEFAULT 0,
  pipeline_clients_count     integer NOT NULL DEFAULT 0,
  pipeline_value             numeric NOT NULL DEFAULT 0,
  closing_rate               numeric NOT NULL DEFAULT 50,
  projected_pipeline_revenue numeric NOT NULL DEFAULT 0,
  churn_rate_confirmed       numeric NOT NULL DEFAULT 0,
  churn_rate_temporary       numeric NOT NULL DEFAULT 0,
  leads_per_week             numeric NOT NULL DEFAULT 0,
  rdv_per_week               numeric NOT NULL DEFAULT 0,
  clients_per_week           numeric NOT NULL DEFAULT 0,
  salaires_employes          numeric NOT NULL DEFAULT 0,
  salaires_direction         numeric NOT NULL DEFAULT 0,
  systemes_logiciels         numeric NOT NULL DEFAULT 0,
  frais_bureau               numeric NOT NULL DEFAULT 0,
  marketing_publicites       numeric NOT NULL DEFAULT 0,
  commodites                 numeric NOT NULL DEFAULT 0,
  transport                  numeric NOT NULL DEFAULT 0,
  created_at                 timestamptz NOT NULL DEFAULT now(),
  updated_at                 timestamptz NOT NULL DEFAULT now(),
  UNIQUE (period_start, period_end)
);

-- ─── expense_items ────────────────────────────────────────────
CREATE TABLE expense_items (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category     text NOT NULL,
  label        text NOT NULL,
  amount       numeric NOT NULL DEFAULT 0,
  period_start date NOT NULL,
  period_end   date NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- ─── RLS: enable + fully permissive policies ─────────────────
ALTER TABLE clients         ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_tasks    ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks           ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_items   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_all" ON clients         FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON client_tasks    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON tasks           FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON calendar_events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON revenue_metrics FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "public_read" ON revenue_metrics FOR SELECT USING (true);
CREATE POLICY "public_all" ON expense_items   FOR ALL USING (true) WITH CHECK (true);

-- ─── calculate_revenue_metrics() ─────────────────────────────
CREATE OR REPLACE FUNCTION calculate_revenue_metrics()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_start date := date_trunc('month', now())::date;
  v_end   date := (date_trunc('month', now()) + interval '1 month - 1 day')::date;
  v_mrr   numeric;
  v_active integer;
  v_pipeline_count integer;
  v_pipeline_value numeric;
  v_avg_ticket numeric;
  v_churn_confirmed numeric;
  v_churn_temporary numeric;
  v_closing_rate numeric;
  v_projected numeric;
BEGIN
  SELECT
    COALESCE(SUM(monthly_recurring_revenue), 0),
    COUNT(*)
  INTO v_mrr, v_active
  FROM clients WHERE status = 'active';

  SELECT COUNT(*), COALESCE(SUM(monthly_recurring_revenue), 0)
  INTO v_pipeline_count, v_pipeline_value
  FROM clients WHERE status = 'pipeline';

  SELECT COUNT(*) INTO v_churn_confirmed FROM clients WHERE status = 'lost';
  SELECT COUNT(*) INTO v_churn_temporary FROM clients WHERE status = 'on_hold';

  v_avg_ticket := CASE WHEN v_active > 0 THEN v_mrr / v_active ELSE 0 END;

  -- Get existing closing_rate or default 50
  SELECT COALESCE(closing_rate, 50) INTO v_closing_rate
  FROM revenue_metrics WHERE period_start = v_start LIMIT 1;

  v_projected := v_pipeline_value * (v_closing_rate / 100);

  INSERT INTO revenue_metrics (
    period_start, period_end,
    total_revenue, average_ticket,
    active_clients_count, pipeline_clients_count, pipeline_value,
    closing_rate, projected_pipeline_revenue,
    churn_rate_confirmed, churn_rate_temporary
  ) VALUES (
    v_start, v_end,
    v_mrr, v_avg_ticket,
    v_active, v_pipeline_count, v_pipeline_value,
    COALESCE(v_closing_rate, 50), v_projected,
    v_churn_confirmed, v_churn_temporary
  )
  ON CONFLICT (period_start, period_end) DO UPDATE SET
    total_revenue              = EXCLUDED.total_revenue,
    average_ticket             = EXCLUDED.average_ticket,
    active_clients_count       = EXCLUDED.active_clients_count,
    pipeline_clients_count     = EXCLUDED.pipeline_clients_count,
    pipeline_value             = EXCLUDED.pipeline_value,
    projected_pipeline_revenue = EXCLUDED.projected_pipeline_revenue,
    churn_rate_confirmed       = EXCLUDED.churn_rate_confirmed,
    churn_rate_temporary       = EXCLUDED.churn_rate_temporary,
    updated_at                 = now();
END;
$$;

-- Enable realtime for client_tasks
ALTER PUBLICATION supabase_realtime ADD TABLE client_tasks;
