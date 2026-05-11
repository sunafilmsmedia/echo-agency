import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  invite_code: string;
  subscription_status: string;
  plan: string;
  max_members: number;
  created_at: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: "owner" | "member";
  joined_at: string;
}

// Fetch the current user's workspace (first one found)
export function useWorkspace() {
  return useQuery({
    queryKey: ["workspace"],
    queryFn: async (): Promise<Workspace | null> => {
      const { data: member } = await supabase
        .from("workspace_members")
        .select("workspace_id")
        .limit(1)
        .maybeSingle();

      if (!member?.workspace_id) return null;

      const { data: workspace } = await supabase
        .from("workspaces")
        .select("*")
        .eq("id", member.workspace_id)
        .maybeSingle();

      return workspace ?? null;
    },
    staleTime: 1000 * 60 * 10, // 10 min
  });
}

// Fetch all members of the current workspace
export function useWorkspaceMembers(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["workspace-members", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data } = await supabase
        .from("workspace_members")
        .select("*")
        .eq("workspace_id", workspaceId!);
      return data ?? [];
    },
  });
}
