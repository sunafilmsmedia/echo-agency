import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

// Hook léger — récupère l'user connecté et se ré-abonne aux changements de session.
// Le nom du signup est stocké dans user_metadata.full_name (voir /signup).
export function useCurrentUser() {
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  return user;
}

// Extrait le prénom :
//   1. user_metadata.full_name (set au signup) → premier mot
//   2. fallback agencyOwnerFallback (ex: agency.owner_first_name) pour les users
//      créés avant la refonte signup — Josué n'a pas de full_name en metadata.
//   3. rien
export function displayFirstName(
  user: User | null | undefined,
  agencyOwnerFallback?: string | null,
): string {
  const fromMeta = (user?.user_metadata?.full_name as string | undefined)?.trim();
  if (fromMeta) return fromMeta.split(/\s+/)[0];
  const fallback = agencyOwnerFallback?.trim();
  if (fallback) return fallback;
  return "";
}
