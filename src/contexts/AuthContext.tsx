import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type UserRole =
  | "admin"
  | "sales"
  | "print_operator"
  | "designer"
  | "customer"
  | "guest";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: UserRole;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, name?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function detectRole(userId: string): Promise<UserRole> {
  // Check team_members first
  const { data: member } = await supabase
    .from("team_members")
    .select("role")
    .eq("auth_user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (member?.role) return member.role as UserRole;

  // Check customers
  const { data: customer } = await supabase
    .from("customers")
    .select("id")
    .eq("auth_user_id", userId)
    .maybeSingle();

  if (customer) return "customer";

  // New authenticated user - insert as customer
  const { data: userData } = await supabase.auth.getUser();
  if (userData.user) {
    await supabase.from("customers").insert({
      auth_user_id: userId,
      email: userData.user.email ?? "",
    });
    return "customer";
  }

  return "guest";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole>("guest");
  const [loading, setLoading] = useState(true);
  const initialized = useRef(false);

  useEffect(() => {
    // Guard against React Strict Mode double-invocation
    if (initialized.current) return;
    initialized.current = true;

    // Listen for auth changes BEFORE getSession
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          const detectedRole = await detectRole(session.user.id);
          setRole(detectedRole);
        } else {
          setRole("guest");
        }
        setLoading(false);
      }
    );

    // Always resolve loading from getSession — don't wait for onAuthStateChange
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        detectRole(session.user.id).then(setRole);
      } else {
        setRole("guest");
      }
      setLoading(false);
    });

    // Fallback: force-resolve loading after 2s in case everything is still stuck
    const fallbackTimer = setTimeout(() => {
      setLoading(false);
    }, 2000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(fallbackTimer);
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, name?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    // Insert customer record immediately after signup
    if (!error && data.user) {
      await supabase.from("customers").insert({
        auth_user_id: data.user.id,
        email,
        contact_name: name ?? null,
      });
    }
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, role, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export const TEAM_ROLES: UserRole[] = ["admin", "sales", "print_operator", "designer"];
export const isTeamRole = (role: UserRole) => TEAM_ROLES.includes(role);
