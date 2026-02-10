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
    try {
      const { data, error } = await supabase.functions.invoke("me", {
        body: { action: "get" },
      });

      if (error) {
        console.error("Edge function error:", error);
        throw error;
      }

      if (!data || data.ok !== true) {
        const msg = data?.error || "Failed to load account";
        console.error("Bootstrap failed:", msg);
        throw new Error(msg);
      }

      const nextProfile = data.profile as Profile | null;
      const nextRoles = (Array.isArray(data.roles) ? data.roles : []) as AppRole[];

      if (!nextProfile) {
        console.warn("No profile returned from edge function");
        return null;
      }

      setProfile(nextProfile);
      setAllRolesState(nextRoles);
      applyActiveRoleFrom(nextRoles, nextProfile);

      console.log("Profile loaded:", nextProfile.full_name, "Roles:", nextRoles);
      return { profile: nextProfile, roles: nextRoles };
    } catch (err) {
      console.error("bootstrapViaEdge failed:", err);
      throw err;
    }
  };

  const loadProfileAndRoles = async (userId: string) => {
    try {
      const result = await bootstrapViaEdge();
      if (!result) {
        console.warn("No profile loaded for user:", userId);
      }
    } catch (err: any) {
      console.error("loadProfileAndRoles failed:", err?.message || err);
      throw err;
    }
  };

  const fetchRoleStatus = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("role_verifications")
        .select("role, status")
        .eq("user_id", userId);

      if (error) throw error;

      const statusMap: Partial<Record<AppRole, RoleVerificationStatus>> = {};
      if (data) {
        data.forEach((row: any) => {
          statusMap[row.role as AppRole] = row.status as RoleVerificationStatus;
        });
      }
      setRoleStatus(statusMap);
    } catch (err) {
      console.error("fetchRoleStatus failed:", err);
    }
  };

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
            toast.error("Failed to load profile data");
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

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      console.log("Auth state change:", event, {
        hasSession: !!nextSession,
        userId: nextSession?.user?.id,
        hasProfile: !!profile
      });

      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (nextSession?.user?.id) {
        try {
          await loadProfileAndRoles(nextSession.user.id);
          await fetchRoleStatus(nextSession.user.id);
          console.log("Profile loaded successfully after auth change");
        } catch (err) {
          console.error("Auth state change profile/role load failed:", err);
          toast.error("Failed to load profile. Please refresh the page.");
        }
      } else {
        console.log("Clearing auth state");
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

  const signOut = async () => {
    try {
      // Clear UI state FIRST
      setSession(null);
      setUser(null);
      setProfile(null);
      setAllRolesState([]);
      setRoleStatus({});
      _setActiveRole("patient");
      clearStoredRole();

      // Then call Supabase signOut
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.warn("signOut API error:", error.message);
      }

      toast.success("Signed out successfully");
    } catch (e: any) {
      console.error("signOut error:", e?.message || e);
      toast.error("Error signing out, but you've been logged out locally");
    } finally {
      // Force navigation after a brief delay to ensure state is cleared
      setTimeout(() => {
        window.location.href = "/auth";
      }, 100);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) throw error;

      // Wait for profile to load
      if (data.user) {
        await loadProfileAndRoles(data.user.id);
        await fetchRoleStatus(data.user.id);
      }

      toast.success("Successfully signed in!");
      return {};
    } catch (error: any) {
      console.error("Sign in error:", error);
      toast.error(error.message || "Invalid email or password. Please try again.");
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, userData?: any) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData,
        },
      });

      if (error) throw error;

      toast.success("Account created! Please check your email to verify.");
      return { data };
    } catch (error: any) {
      console.error("Sign up error:", error);
      toast.error(error.message || "Failed to create account");
      return { error };
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user?.id) return { error: new Error("Not authenticated") };

    try {
      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("user_id", user.id);

      if (error) throw error;

      await refreshProfile();
      toast.success("Profile updated successfully");
      return {};
    } catch (error: any) {
      console.error("Update profile error:", error);
      toast.error("Failed to update profile");
      return { error };
    }
  };

  const refreshProfile = async () => {
    if (!user?.id) return;
    try {
      await loadProfileAndRoles(user.id);
    } catch (err) {
      console.error("refreshProfile failed:", err);
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
      <InactivityWarningModal
        isOpen={showWarning}
        countdown={countdown}
        onStayLoggedIn={stayLoggedIn}
      />
    </AuthContext.Provider>
  );
};
