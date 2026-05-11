import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

export interface Channel {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
}

export interface Message {
  id: string;
  channel_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user_email?: string;
}

export interface Meeting {
  id: string;
  title: string;
  description: string | null;
  scheduled_at: string;
  duration_minutes: number;
  meet_link: string | null;
  created_by: string;
  created_at: string;
}

// ── Channels ─────────────────────────────────────────────────────────────────

export function useChannels() {
  return useQuery({
    queryKey: ["channels"],
    queryFn: async (): Promise<Channel[]> => {
      const { data, error } = await supabase
        .from("channels")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateChannel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, description }: { name: string; description?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("channels")
        .insert({ name: name.toLowerCase().replace(/\s+/g, "-"), description: description ?? null, created_by: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["channels"] }),
  });
}

export function useDeleteChannel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (channelId: string) => {
      const { error } = await supabase.from("channels").delete().eq("id", channelId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["channels"] }),
  });
}

// ── Messages ──────────────────────────────────────────────────────────────────

export function useMessages(channelId: string | null) {
  const qc = useQueryClient();

  // Real-time subscription
  useEffect(() => {
    if (!channelId) return;
    const sub = supabase
      .channel(`messages:${channelId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `channel_id=eq.${channelId}` },
        () => { qc.invalidateQueries({ queryKey: ["messages", channelId] }); }
      )
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [channelId, qc]);

  return useQuery({
    queryKey: ["messages", channelId],
    enabled: !!channelId,
    queryFn: async (): Promise<Message[]> => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("channel_id", channelId!)
        .order("created_at", { ascending: true })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: false,
  });
}

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ channelId, content }: { channelId: string; content: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("messages")
        .insert({ channel_id: channelId, user_id: user!.id, content, user_email: user!.email });
      if (error) throw error;
    },
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: ["messages", vars.channelId] }),
  });
}

// ── Meetings ──────────────────────────────────────────────────────────────────

export function useMeetings() {
  return useQuery({
    queryKey: ["meetings"],
    queryFn: async (): Promise<Meeting[]> => {
      const { data, error } = await supabase
        .from("meetings")
        .select("*")
        .gte("scheduled_at", new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString()) // from yesterday
        .order("scheduled_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateMeeting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { title: string; description?: string; scheduled_at: string; duration_minutes?: number; meet_link?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("meetings")
        .insert({ ...payload, created_by: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["meetings"] }),
  });
}

export function useDeleteMeeting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("meetings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["meetings"] }),
  });
}
