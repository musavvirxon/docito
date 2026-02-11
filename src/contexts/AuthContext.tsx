import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useInactivityTimer } from "@/hooks/useInactivityTimer";
import { InactivityWarningModal } from "@/components/InactivityWarningModal";
import { getPrimaryRole, getUserRolesFromProfile, normalizeRole, type AppRole } from "@/lib/rbac";
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

type AuthActionResult = {
  error?: any;
  needsEmailConfirmation?: boolean;
};

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

  signIn: (email: string, password: string) => Promise<AuthActionResult>;
  signUp: (email: string, password: string, userData?: any) => Promise<AuthActionResult>;
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

function safeLocalNameFromEmail(email: string | null | undefined): string {
  const e = String(email || "").trim();
  if (!e) return "User";
  const local = e.split("@")[0] || "User";
  return local.replace(/[._-]+/g, " ").replace(/\s+/g, " ").trim() || "User";
}

function mapProfileRoleFromAppRole(role: AppRole): Profile["role"] {
  if (role === "doctor") return "doctor";
  if (role === "staff") return "staff";
  if (
    role === "admin" ||
    role === "clinic_admin" ||
    role === "pharmacy_admin" ||
    role === "lab_admin" ||
    role === "imaging_admin" ||
    role === "super_admin"
  ) {
    return "admin";
  }
  return "patient";
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const bootstrapPromiseRef = useRef<Promise<void> | null>(null);

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
    const merged = Array.from(
      new Set([
        ...(roles || []),
        ...((nextProfile ? (getUserRolesFromProfile(nextProfile as any) as AppRole[]) : []) || []),
      ]),
    );

    const stored = readStoredRole();
    if (stored && merged.includes(stored)) {
      _setActiveRole(stored);
      return;
    }

    const primary = getPrimaryRole(merged);
    _setActiveRole(primary);
    writeStoredRole(primary);
  };

  const clearAuthState = () => {
    setSession(null);
    setUser(null);
    setProfile(null);
    setAllRolesState([]);
    setRoleStatus({});
    _setActiveRole("patient");
    clearStoredRole();
  };

  const bootstrapViaEdge = async (accessToken?: string): Promise<{ profile: Profile; roles: AppRole[] } | null> => {
    const { data, error } = await supabase.functions.invoke("me", {
      body: { action: "get" },
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
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

  const ensureSelfBootstrap = async (uid: string) => {
    // Best-effort self-bootstrap when profile/roles are missing.
    // This avoids getting stuck if the Edge Function is not deployed.
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const u = userRes?.user;
      const email = (u?.email || user?.email || "").trim();

      const fullName =
        (String((u as any)?.user_metadata?.full_name || (u as any)?.user_metadata?.fullName || "").trim() ||
          safeLocalNameFromEmail(email));

      const metaRole = (normalizeRole((u as any)?.user_metadata?.role) || "patient") as AppRole;
      const profileRole = mapProfileRoleFromAppRole(metaRole);

      const tzFromMeta = String((u as any)?.user_metadata?.timezone || "").trim();
      const tz = tzFromMeta || String(getBrowserTimeZone() || "").trim() || "UTC";

      // Create profile row (idempotent)
      await supabase
        .from("profiles")
        .upsert(
          {
            user_id: uid,
            email: email || null,
            full_name: fullName,
            role: profileRole,
            timezone: tz,
            timezone_source: tzFromMeta ? "repair_meta" : "repair_browser",
            timezone_updated_at: new Date().toISOString(),
          } as any,
          { onConflict: "user_id" },
        );

      // Ensure at least one role row exists
      const tryInsert = async (role: AppRole) => {
        const { error } = await supabase.from("user_roles").upsert({ user_id: uid, role } as any, {
          onConflict: "user_id,role",
        });
        return error;
      };

      const err1 = await tryInsert(metaRole);
      if (err1) {
        await tryInsert("patient");
      }
    } catch (e) {
      console.warn("ensureSelfBootstrap failed (ignored):", e);
    }
  };

  const loadProfileAndRoles = async (uid: string, accessToken?: string) => {
    const directRead = async () => {
      const [profileRes, rolesRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", uid).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", uid),
      ]);

      const directProfile = (profileRes.data as any) as Profile | null;
      const directRoles = (Array.isArray(rolesRes.data) ? rolesRes.data : [])
        .map((r: any) => r?.role)
        .filter(Boolean) as AppRole[];

      return {
        directProfile,
        directRoles,
        profileError: profileRes.error,
        rolesError: rolesRes.error,
      };
    };

    // 1) Direct reads first
    let first = await directRead();

    // 2) If missing profile or roles, try self-bootstrap + re-read
    if (!first.directProfile || first.directRoles.length === 0 || first.profileError || first.rolesError) {
      await ensureSelfBootstrap(uid);
      const second = await directRead();

      if (second.directProfile) {
        setProfile(second.directProfile);
        setAllRolesState(second.directRoles);
        applyActiveRoleFrom(second.directRoles, second.directProfile);
        return;
      }

      // 3) Last resort: Edge bootstrap (if deployed)
      try {
        const boot = await bootstrapViaEdge(accessToken);
        if (boot) return;
      } catch (e) {
        console.warn("Edge bootstrap failed (ignored):", e);
      }

      // Still no profile: clear so UI doesn't lie
      setProfile(null);
      setAllRolesState(second.directRoles || []);
      applyActiveRoleFrom(second.directRoles || [], null);
      return;
    }

    // Direct reads succeeded
    setProfile(first.directProfile);
    setAllRolesState(first.directRoles);
    applyActiveRoleFrom(first.directRoles, first.directProfile);
  };

  const fetchRoleStatus = async (uid: string) => {
    try {
      const { data, error } = await (supabase as any).from("role_verifications").select("role,status").eq("user_id", uid);
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

  const runBootstrap = async (nextSession: Session | null) => {
    if (bootstrapPromiseRef.current) return bootstrapPromiseRef.current;

    const p = (async () => {
      setLoading(true);
      try {
        setSession(nextSession);
        setUser(nextSession?.user ?? null);

        if (!nextSession?.user?.id) {
          clearAuthState();
          return;
        }

        const uid = nextSession.user.id;
        await loadProfileAndRoles(uid, nextSession.access_token);
        await fetchRoleStatus(uid);
      } finally {
        setLoading(false);
      }
    })();

    bootstrapPromiseRef.current = p;
    try {
      await p;
    } finally {
      bootstrapPromiseRef.current = null;
    }
  };

  const refreshProfile = async () => {
    if (!session?.user?.id) return;
    await runBootstrap(session);
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
      try {
        const { data } = await supabase.auth.getSession();
        await runBootstrap(data.session);
      } catch (e) {
        console.error("Auth init failed:", e);
        setLoading(false);
      }
    };

    void init();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      try {
        await runBootstrap(nextSession);
      } catch (e) {
        console.error("Auth state change bootstrap failed:", e);
      }
    });

    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signOut = async () => {
    clearAuthState();

    try {
      await supabase.auth.signOut();
    } catch (e: any) {
      console.warn("signOut error (ignored):", e?.message || e);
    }

    toast.success("Signed out");
  };

  const signIn = async (email: string, password: string): Promise<AuthActionResult> => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      // Make auth state available immediately (so routing can proceed)
      setSession(data.session);
      setUser(data.user);

      if (data.session?.user?.id) {
        await loadProfileAndRoles(data.session.user.id, data.session.access_token);
        await fetchRoleStatus(data.session.user.id);
      }

      toast.success("Successfully signed in!");
      return {};
    } catch (error: any) {
      toast.error("Invalid email or password. Please try again.");
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, userData: any = {}): Promise<AuthActionResult> => {
    try {
      setLoading(true);
      const role = userData.role || "patient";
      const signupTz = String(userData.timezone || getBrowserTimeZone() || "").trim() || "UTC";

      const marketing =
        Boolean(userData.marketing_communications ?? userData.marketingCommunications ?? userData.marketingOptIn ?? false) ||
        false;

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: userData.fullName || safeLocalNameFromEmail(email),
            role,
            marketing_communications: marketing,
            timezone: signupTz,
          },
        },
      });

      if (error) throw error;

      // If email confirmations are enabled, Supabase returns user but no session.
      if (!data.session) {
        toast.success("Account created successfully! Please check your email to confirm your account.");
        return { needsEmailConfirmation: true };
      }

      // Otherwise, user is signed in immediately.
      setSession(data.session);
      setUser(data.user);

      if (data.session.user?.id) {
        await loadProfileAndRoles(data.session.user.id, data.session.access_token);
        await fetchRoleStatus(data.session.user.id);
      }

      toast.success("Account created successfully!");
      return {};
    } catch (error: any) {
      const msg = error?.message || "Unable to create account";
      console.error("Full signup error:", error);
      toast.error(msg);
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    try {
      if (!user) throw new Error("No user logged in");

      const { error } = await supabase.from("profiles").update(updates).eq("user_id", user.id);
      if (error) throw error;

      await refreshProfile();
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
