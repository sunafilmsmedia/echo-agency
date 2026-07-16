-- One-off expenses for the current month (mirror of extra_revenue).
-- Recurring expenses live in expense_items; this covers unusual one-time costs.
ALTER TABLE revenue_metrics
  ADD COLUMN IF NOT EXISTS extra_expenses numeric NOT NULL DEFAULT 0;
