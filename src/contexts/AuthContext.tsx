import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useInactivityTimer } from "@/hooks/useInactivityTimer";
import { InactivityWarningModal } from "@/components/InactivityWarningModal";
import { getPrimaryRole, normalizeRole, type AppRole } from "@/lib/rbac";

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
  // Kept as no-ops for API compatibility
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
  const bootstrapVersionRef = useRef(0);

  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const [activeRole, _setActiveRole] = useState<AppRole>("patient");
  const [roleStatus, setRoleStatus] = useState<Partial<Record<AppRole, RoleVerificationStatus>>>({});

  // Single-element array for API compatibility
  const allRoles: AppRole[] = [activeRole];

  // No-ops for API compatibility
  const switchRole = (_role: AppRole) => {};
  const setActiveRoleSilently = (_role: AppRole) => {};

  const clearAuthState = () => {
    setSession(null);
    setUser(null);
    setProfile(null);
    setRoleStatus({});
    _setActiveRole("patient");
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

    return { profile: nextProfile, roles: nextRoles };
  };

  const ensureSelfBootstrap = async (uid: string) => {
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const u = userRes?.user;
      const email = (u?.email || user?.email || "").trim();

      const fullName =
        (String((u as any)?.user_metadata?.full_name || (u as any)?.user_metadata?.fullName || "").trim() ||
          safeLocalNameFromEmail(email));

      const metaRole = (normalizeRole((u as any)?.user_metadata?.role) || "patient") as AppRole;
      const profileRole = mapProfileRoleFromAppRole(metaRole);

      await supabase
        .from("profiles")
        .upsert(
          {
            user_id: uid,
            email: email || null,
            full_name: fullName,
            role: profileRole,
          } as any,
          { onConflict: "user_id" },
        );

      // Try to insert the intended role — don't fall back to patient
      // The DB trigger (handle_new_user) already handles role assignment on signup
      // This is only a safety net for edge cases where the trigger didn't fire
      const { error: roleErr } = await supabase.from("user_roles").upsert(
        { user_id: uid, role: metaRole } as any,
        { onConflict: "user_id,role" },
      );
      if (roleErr) {
        console.warn("ensureSelfBootstrap: failed to upsert role", metaRole, roleErr);
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

    let first = await directRead();

    if (!first.directProfile || first.directRoles.length === 0 || first.profileError || first.rolesError) {
      await ensureSelfBootstrap(uid);
      const second = await directRead();

      if (second.directProfile) {
        return { profile: second.directProfile, roles: second.directRoles };
      }

      try {
        const boot = await bootstrapViaEdge(accessToken);
        if (boot) return boot;
      } catch (e) {
        console.warn("Edge bootstrap failed (ignored):", e);
      }

      return { profile: null as Profile | null, roles: second.directRoles || [] };
    }

    return { profile: first.directProfile, roles: first.directRoles };
  };

  const runBootstrap = async (nextSession: Session | null) => {
    const version = ++bootstrapVersionRef.current;
    setLoading(true);

    try {
      if (!nextSession?.user?.id) {
        clearAuthState();
        return;
      }

      setSession(nextSession);
      setUser(nextSession.user);

      const uid = nextSession.user.id;
      const result = await loadProfileAndRoles(uid, nextSession.access_token);

      if (bootstrapVersionRef.current !== version) {
        console.log("[Auth] Stale bootstrap discarded (version", version, "vs current", bootstrapVersionRef.current, ")");
        return;
      }

      if (result.profile) {
        setProfile(result.profile);
      } else {
        setProfile(null);
      }

      // Single role: use getPrimaryRole from user_roles table
      const primary = getPrimaryRole(result.roles);
      _setActiveRole(primary);
    } catch (e) {
      console.error("[Auth] runBootstrap error:", e);
    } finally {
      if (bootstrapVersionRef.current === version) {
        setLoading(false);
      }
    }
  };

  const refreshProfile = async () => {
    if (!session?.user?.id) return;
    await runBootstrap(session);
  };

  // Inactivity timer
  const { showWarning, countdown, stayLoggedIn } = useInactivityTimer({
    enabled: Boolean(session),
    inactivityTime: 15 * 60 * 1000,
    warningTime: 60 * 1000,
    onInactive: async () => {
      try {
        await supabase.auth.signOut();
      } finally {
        toast.info("Signed out due to inactivity.");
      }
    },
  });

  useEffect(() => {
    let safetyTimer: ReturnType<typeof setTimeout> | null = null;
    let didUnmount = false;

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      if (didUnmount) return;

      if (event === "TOKEN_REFRESHED") {
        setSession(nextSession);
        setUser(nextSession?.user ?? null);
        return;
      }

      try {
        await runBootstrap(nextSession);
      } catch (e) {
        console.error("Auth state change bootstrap failed:", e);
        setLoading(false);
      }
    });

    safetyTimer = setTimeout(() => {
      setLoading((current) => {
        if (current) {
          console.warn("[Auth] Safety timeout: forcing loading to false after 10s");
          return false;
        }
        return current;
      });
    }, 10_000);

    return () => {
      didUnmount = true;
      sub.subscription.unsubscribe();
      if (safetyTimer) clearTimeout(safetyTimer);
    };
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
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      setSession(data.session);
      setUser(data.user);

      toast.success("Successfully signed in!");
      return {};
    } catch (error: any) {
      toast.error("Invalid email or password. Please try again.");
      return { error };
    }
  };

  const signUp = async (email: string, password: string, userData: any = {}): Promise<AuthActionResult> => {
    try {
      const role = userData.role || "patient";

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
          },
        },
      });

      if (error) throw error;

      if (!data.session) {
        toast.success("Account created successfully! Please check your email to confirm your account.");
        return { needsEmailConfirmation: true };
      }

      setSession(data.session);
      setUser(data.user);

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
