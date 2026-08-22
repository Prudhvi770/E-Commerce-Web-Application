import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const applySession = (session: Session | null) => {
      if (!active) return;
      setUser(session?.user ?? null);
      setLoading(false);
      if (!session?.user) {
        setIsAdmin(false);
        return;
      }
      void supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .then(({ data }) => {
          if (active) setIsAdmin((data ?? []).some((r) => r.role === "admin"));
        });
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => applySession(session));
    void supabase.auth.getSession().then(({ data }) => applySession(data.session));

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { user, isAdmin, loading };
}
