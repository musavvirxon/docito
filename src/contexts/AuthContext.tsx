// File: src/contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useInactivityTimer } from "@/hooks/useInactivityTimer";
import { InactivityWarningModal } from "@/components/InactivityWarningModal";
import { getPrimaryRole, getUserRolesFromProfile, type AppRole } from "@/lib/rbac";

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

  const loadProfileDirect = async (userId: string) => {
    try {
      // Direct query to profiles table
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (profileError) throw profileError;

      // Direct query to user_roles table
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      if (rolesError) {
        console.warn("Failed to fetch roles, using profile role only:", rolesError);
      }

      const userRoles = rolesData?.map((r: any) => r.role as AppRole) || [];
      const profileRoles = getUserRolesFromProfile(profileData as any) as AppRole[];
      const mergedRoles = Array.from(new Set([...userRoles, ...profileRoles])) as AppRole[];

      setProfile(profileData as Profile);
      setAllRolesState(mergedRoles);
      applyActiveRoleFrom(mergedRoles, profileData as Profile);

      return { profile: profileData as Profile, roles: mergedRoles };
    } catch (err) {
      console.error("loadProfileDirect failed:", err);
      throw err;
    }
  };

  const refreshProfile = useCallback(async () => {
    if (!user?.id) return;
    try {
      await loadProfileDirect(user.id);
    } catch (err) {
      console.error("refreshProfile failed:", err);
    }
  }, [user?.id]);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        setLoading(true);
        const { data } = await supabase.auth.getSession();
        
        if (!mounted) return;

        setSession(data.session);
        setUser(data.session?.user ?? null);

        if (data.session?.user?.id) {
          try {
            await loadProfileDirect(data.session.user.id);
            await fetchRoleStatus(data.session.user.id);
          } catch (err) {
            console.error("Initial profile load failed:", err);
          }
        } else {
          setProfile(null);
          setAllRolesState([]);
          setRoleStatus({});
          _setActiveRole("patient");
          clearStoredRole();
        }
      } catch (err) {
        console.error("Session init error:", err);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void init();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      if (!mounted) return;

      console.log("Auth event:", event);

      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (event === 'SIGNED_OUT') {
        setProfile(null);
        setAllRolesState([]);
        setRoleStatus({});
        _setActiveRole("patient");
        clearStoredRole();
        return;
      }

      if (nextSession?.user?.id) {
        try {
          setLoading(true);
          await loadProfileDirect(nextSession.user.id);
          await fetchRoleStatus(nextSession.user.id);
        } catch (err) {
          console.error("Profile load after auth change failed:", err);
        } finally {
          setLoading(false);
        }
      } else {
        setProfile(null);
        setAllRolesState([]);
        setRoleStatus({});
        _setActiveRole("patient");
        clearStoredRole();
      }
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
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
    // Clear state immediately
    setUser(null);
    setProfile(null);
    setSession(null);
    setAllRolesState([]);
    setRoleStatus({});
    _setActiveRole("patient");
    clearStoredRole();

    try {
      await supabase.auth.signOut();
    } catch (e: any) {
      console.error("signOut error:", e);
    }

    toast.success("Signed out successfully");
    
    // Use replace to prevent back button issues
    window.location.replace("/auth");
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });

      if (error) throw error;

      if (data.user) {
        try {
          await loadProfileDirect(data.user.id);
          await fetchRoleStatus(data.user.id);
        } catch (err) {
          console.error("Profile load after sign in failed:", err);
        }
      }

      toast.success("Successfully signed in!");
      return {};
    } catch (error: any) {
      console.error("Sign in error:", error);
      toast.error(error.message || "Invalid email or password");
      return { error };
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
