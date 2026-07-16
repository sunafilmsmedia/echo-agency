// Thin client wrapper around the `claude-chat` Edge Function.
// All Claude calls in the app should go through here — no direct Anthropic SDK usage
// in the browser (the API key must never be shipped to the client).

import { supabase } from "@/integrations/supabase/client";

export type ClaudeRole = "user" | "assistant";

// Structural types — we don't import from @anthropic-ai/sdk to keep it out of the browser bundle.
export type ClaudeContentBlock =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> }
  | { type: "tool_result"; tool_use_id: string; content: string };

export interface ClaudeMessage {
  role: ClaudeRole;
  content: string | ClaudeContentBlock[];
}

export interface ClaudeTool {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export interface ClaudeResponse {
  id: string;
  content: ClaudeContentBlock[];
  stop_reason: string;
  model: string;
  usage: { input_tokens: number; output_tokens: number };
}

export interface CallClaudeArgs {
  messages: ClaudeMessage[];
  system?: string;
  tools?: ClaudeTool[];
  max_tokens?: number;
  model?: string;
}

// Directly hit the Edge Function via fetch — `supabase.functions.invoke` masks
// non-2xx bodies, and we need to surface real Anthropic error messages.
export async function callClaude(args: CallClaudeArgs): Promise<ClaudeResponse> {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/claude-chat`;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token ?? anonKey;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      "apikey": anonKey,
    },
    body: JSON.stringify(args),
  });

  const text = await res.text();
  let data: any;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }

  if (!res.ok) {
    const msg = data?.message ?? data?.error ?? `Erreur ${res.status}`;
    throw new Error(msg);
  }
  return data as ClaudeResponse;
}

// Convenience: single-shot prompt → returns the assistant's text.
export async function askClaudeText(
  prompt: string,
  opts: { system?: string; model?: string; max_tokens?: number } = {},
): Promise<string> {
  const res = await callClaude({
    messages: [{ role: "user", content: prompt }],
    system: opts.system,
    model: opts.model,
    max_tokens: opts.max_tokens ?? 2000,
  });
  const first = res.content.find((b) => b.type === "text") as { type: "text"; text: string } | undefined;
  return first?.text ?? "";
}
