// File: src/contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useInactivityTimer } from "@/hooks/useInactivityTimer";
import { InactivityWarningModal } from "@/components/InactivityWarningModal";
import { getPrimaryRole, getUserRolesFromProfile, type AppRole } from "@/lib/rbac";
import { getBrowserTimeZone } from "@/lib/timezone";

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  role: "patient" | "doctor" | "admin" | "staff";
  roles?: string[] | string;
  phone?: string;
  date_of_birth?: string;
  gender?: "male" | "female" | "other" | "prefer_not_to_say";
  avatar_url?: string;
  address?: string;
  notification_settings?: any;
  privacy_settings?: any;
  timezone?: string;
  timezone_source?: string;
  timezone_updated_at?: string;
  language?: string;
  created_at: string;
  updated_at: string;
  doctor_id?: string;
}

type RoleVerificationStatus = "unverified" | "pending" | "verified" | "rejected";

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;

  allRoles: AppRole[];
  activeRole: AppRole;
  switchRole: (role: AppRole) => void;
  setActiveRoleSilently: (role: AppRole) => void;

  roleStatus: Partial<Record<AppRole, RoleVerificationStatus>>;

  signIn: (email: string, password: string) => Promise<{ error?: any }>;
  signUp: (email: string, password: string, userData?: any) => Promise<{ error?: any }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error?: any }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
};

const ACTIVE_ROLE_KEY = "docito.activeRole";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const [activeRole, _setActiveRole] = useState<AppRole>("patient");
  const [roleStatus, setRoleStatus] = useState<Partial<Record<AppRole, RoleVerificationStatus>>>({});
  const [allRolesState, setAllRolesState] = useState<AppRole[]>([]);

  const allRoles: AppRole[] = useMemo(() => {
    const fromUserRoles = Array.isArray(allRolesState) ? allRolesState : [];
    const fromProfile = profile ? (getUserRolesFromProfile(profile as any) as AppRole[]) : [];
    const merged = [...fromUserRoles, ...fromProfile].filter(Boolean) as AppRole[];
    return Array.from(new Set(merged));
  }, [allRolesState, profile]);

  const readStoredRole = (): AppRole | null => {
    try {
      const v = localStorage.getItem(ACTIVE_ROLE_KEY);
      return (v as AppRole | null) ?? null;
    } catch {
      return null;
    }
  };

  const writeStoredRole = (role: AppRole) => {
    try {
      localStorage.setItem(ACTIVE_ROLE_KEY, role);
    } catch {
      // ignore
    }
  };

  const clearStoredRole = () => {
    try {
      localStorage.removeItem(ACTIVE_ROLE_KEY);
    } catch {
      // ignore
    }
  };

  const setActiveRoleSilently = (role: AppRole) => {
    _setActiveRole(role);
    writeStoredRole(role);
  };

  const switchRole = (role: AppRole) => {
    setActiveRoleSilently(role);
    toast.success(`Switched to ${role.replace("_", " ")}`);
  };

  const applyActiveRoleFrom = (roles: AppRole[], nextProfile?: Profile | null) => {
    const merged = Array.from(new Set([...(roles || []), ...((nextProfile ? (getUserRolesFromProfile(nextProfile as any) as AppRole[]) : []) || [])]));
    const stored = readStoredRole();
    if (stored && merged.includes(stored)) {
      _setActiveRole(stored);
      return;
    }
    const primary = getPrimaryRole(merged);
    _setActiveRole(primary);
    writeStoredRole(primary);
  };

  const bootstrapViaEdge = async (): Promise<{ profile: Profile; roles: AppRole[] } | null> => {
    const { data, error } = await supabase.functions.invoke("me", {
      body: { action: "get" },
    });

    if (error) throw error;
    if (!data || data.ok !== true) {
      const msg = data?.error || "Failed to load account";
      throw new Error(msg);
    }

    const nextProfile = data.profile as Profile | null;
    const nextRoles = (Array.isArray(data.roles) ? data.roles : []) as AppRole[];

    if (!nextProfile) return null;

    setProfile(nextProfile);
    setAllRolesState(nextRoles);
    applyActiveRoleFrom(nextRoles, nextProfile);

    return { profile: nextProfile, roles: nextRoles };
  };

  const loadProfileAndRoles = async (userId: string) => {
    // Prefer direct reads (faster). If anything is missing, fall back to Edge bootstrap (service-role ensured).
    const [profileRes, rolesRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);

    const pErr = profileRes.error;
    const rErr = rolesRes.error;

    const directProfile = (profileRes.data as any) as Profile | null;
    const directRoles = (Array.isArray(rolesRes.data) ? rolesRes.data : []).map((r: any) => r?.role).filter(Boolean) as AppRole[];

    // If either fails (RLS or missing rows) OR profile missing, bootstrap with Edge Function.
    if (pErr || rErr || !directProfile) {
      const boot = await bootstrapViaEdge();
      if (boot) return;
      // If bootstrap returned null, still clear profile so UI doesn't lie.
      setProfile(null);
      setAllRolesState([]);
      return;
    }

    setProfile(directProfile);
    setAllRolesState(directRoles);
    applyActiveRoleFrom(directRoles, directProfile);
  };

  const refreshProfile = async () => {
    if (!user?.id) return;
    await loadProfileAndRoles(user.id);
  };

  const fetchRoleStatus = async (userId: string) => {
    try {
      const { data, error } = await (supabase as any).from("role_verifications").select("role,status").eq("user_id", userId);
      if (error) return;

      const next: Partial<Record<AppRole, RoleVerificationStatus>> = {};
      for (const row of (data as any[]) || []) {
        if (row?.role) next[row.role as AppRole] = (row.status as RoleVerificationStatus) || "unverified";
      }
      setRoleStatus(next);
    } catch {
      // ignore
    }
  };

  // Inactivity timer (kept as-is)
  const { showWarning, countdown, stayLoggedIn } = useInactivityTimer({
    enabled: Boolean(session),
    inactivityTime: 15 * 60 * 1000, // 15 minutes
    warningTime: 60 * 1000, // 1 minute
    onInactive: async () => {
      try {
        await supabase.auth.signOut();
      } finally {
        toast.info("Signed out due to inactivity.");
      }
    },
  });

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const { data } = await supabase.auth.getSession();
        setSession(data.session);
        setUser(data.session?.user ?? null);

      if (data.session?.user?.id) {
          try {
            await loadProfileAndRoles(data.session.user.id);
            await fetchRoleStatus(data.session.user.id);
          } catch (err) {
            console.error("Initial profile/role load failed:", err);
          }
        } else {
          setProfile(null);
          setAllRolesState([]);
          setRoleStatus({});
          _setActiveRole("patient");
          clearStoredRole();
        }
      } finally {
        setLoading(false);
      }
    };

    void init();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (nextSession?.user?.id) {
        try {
          await loadProfileAndRoles(nextSession.user.id);
          await fetchRoleStatus(nextSession.user.id);
        } catch (err) {
          console.error("Auth state change profile/role load failed:", err);
        }
      } else {
        setProfile(null);
        setAllRolesState([]);
        setRoleStatus({});
        _setActiveRole("patient");
        clearStoredRole();
      }
    });

    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) console.warn("signOut API error (ignored):", error.message);
    } catch (e: any) {
      console.warn("signOut error (ignored):", e?.message || e);
    } finally {
      // Always clear local UI state
      setSession(null);
      setUser(null);
      setProfile(null);
      setAllRolesState([]);
      setRoleStatus({});
      _setActiveRole("patient");
      clearStoredRole();
      toast.success("Signed out");
      // Force full navigation to ensure all state is truly reset
      window.location.href = "/auth";
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success("Successfully signed in!");
      return {};
    } catch (error: any) {
      toast.error("Invalid email or password. Please try again.");
      return { error };
    }
  };

  const signUp = async (email: string, password: string, userData: any = {}) => {
    try {
      const role = userData.role || "patient";
      const signupTz = String(userData.timezone || getBrowserTimeZone() || "").trim() || "UTC";

      const marketing =
        Boolean(
          userData.marketing_communications ?? userData.marketingCommunications ?? userData.marketingOptIn ?? false,
        ) || false;

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: userData.fullName || email,
            role,
            marketing_communications: marketing,
            timezone: signupTz,
          },
        },
      });

      if (error) throw error;

      toast.success("Account created successfully!");
      return {};
    } catch (error: any) {
      const msg = error?.message || "Unable to create account";
      console.error("Full signup error:", error);
      toast.error(msg);
      return { error };
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    try {
      if (!user) throw new Error("No user logged in");

      const { error } = await supabase.from("profiles").update(updates).eq("user_id", user.id);
      if (error) throw error;

      await loadProfileAndRoles(user.id);
      toast.success("Profile updated successfully!");
      return {};
    } catch (error: any) {
      toast.error(error.message || "Failed to update profile");
      return { error };
    }
  };

  const value: AuthContextType = {
    user,
    profile,
    session,
    loading,
    allRoles,
    activeRole,
    switchRole,
    setActiveRoleSilently,
    roleStatus,
    signIn,
    signUp,
    signOut,
    updateProfile,
    refreshProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      {user && <InactivityWarningModal open={showWarning} countdown={countdown} onStayLoggedIn={stayLoggedIn} />}
    </AuthContext.Provider>
  );
};
