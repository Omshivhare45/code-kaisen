import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "citizen" | "officer" | "dept_admin" | "super_admin" | "admin";

export const ROLE_LABEL: Record<AppRole, string> = {
  citizen: "Citizen",
  officer: "Field Officer",
  dept_admin: "Department Admin",
  super_admin: "Super Admin",
  admin: "Admin",
};

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [department, setDepartment] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function hydrate(s: Session | null) {
      setSession(s);
      setUser(s?.user ?? null);
      if (!s?.user) {
        setRole(null);
        setDepartment(null);
        setLoading(false);
        return;
      }
      const [{ data: roles }, { data: profile }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", s.user.id),
        supabase.from("profiles").select("department").eq("id", s.user.id).maybeSingle(),
      ]);
      if (cancelled) return;
      const order: AppRole[] = ["super_admin", "admin", "dept_admin", "officer", "citizen"];
      const found = (roles ?? [])
        .map((r) => r.role as AppRole)
        .sort((a, b) => order.indexOf(a) - order.indexOf(b))[0] ?? "citizen";
      setRole(found);
      setDepartment(profile?.department ?? null);
      setLoading(false);
    }

    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      hydrate(s);
    });
    supabase.auth.getSession().then(({ data }) => hydrate(data.session));
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const isPrivileged = role !== null && role !== "citizen";
  return { session, user, role, department, loading, isPrivileged };
}