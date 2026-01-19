// File: src/contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
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
  roles?: string[];
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

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;

  allRoles: AppRole[];
  activeRole: AppRole;
  switchRole: (role: AppRole) => void;

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

  const [activeRole, setActiveRole] = useState<AppRole>("patient");
  const [roleStatus, setRoleStatus] = useState<Partial<Record<AppRole, RoleVerificationStatus>>>({});

  // IMPORTANT: This must include legacy profile.role when user_roles is empty.
  const allRoles: AppRole[] = useMemo(() => {
    if (!profile) return [];
    const roles = getUserRolesFromProfile(profile);
    // Dedupe, preserve order
    return Array.from(new Set(roles));
  }, [profile?.role, profile?.roles, profile]);

  const switchRole = (role: AppRole) => {
    if (!allRoles.includes(role)) {
      toast.error("You don't have access to this role");
      return;
    }
    setActiveRole(role);
    localStorage.setItem(ACTIVE_ROLE_KEY, role);
    toast.success(`Switched to ${role.split("_").join(" ")}`);
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch {
      // ignore
    } finally {
      setUser(null);
      setProfile(null);
      setSession(null);
      setActiveRole("patient");
      setRoleStatus({});
      localStorage.removeItem(ACTIVE_ROLE_KEY);
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = "/";
    }
  };

  const { showWarning, countdown, stayLoggedIn } = useInactivityTimer({
    onInactive: async () => {
      if (!user) return;
      toast.info("You have been logged out due to inactivity");
      await signOut();
    },
    inactivityTime: 30 * 60 * 1000,
    warningTime: 60 * 1000,
    enabled: !!user && !loading,
  });

  const fetchRoles = async (userId: string): Promise<AppRole[]> => {
    const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);

    if (error) {
      console.error("Error fetching roles:", error);
      return [];
    }

    return (data?.map((r: any) => r.role).filter(Boolean) ?? []) as AppRole[];
  };

  const fetchRoleVerification = async (userId: string, roles: AppRole[]) => {
    if (roles.includes("doctor")) {
      try {
        const { data: doctorData } = await supabase.from("doctors").select("id").eq("user_id", userId).maybeSingle();

        if (doctorData?.id) {
          const { data } = await supabase
            .from("doctor_verification")
            .select("status")
            .eq("doctor_id", doctorData.id)
            .maybeSingle();

          if (data?.status) {
            setRoleStatus((prev) => ({ ...prev, doctor: data.status as RoleVerificationStatus }));
          }
        }
      } catch {
        // ignore
      }
    }
  };

  const pickInitialRole = (roles: AppRole[]) => {
    if (!roles?.length) return "patient";

    const saved = localStorage.getItem(ACTIVE_ROLE_KEY) as AppRole | null;

    // Respect saved role if it exists for the user (even if lower priority).
    if (saved && roles.includes(saved)) return saved;

    return getPrimaryRole(roles);
  };

  const fetchProfile = async (userId: string) => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (profileError) throw profileError;

      const rolesFromDb = await fetchRoles(userId);

      const mergedRoles = getUserRolesFromProfile({ role: profileData?.role, roles: rolesFromDb });

      const mergedProfile = { ...profileData, roles: mergedRoles } as Profile;
      setProfile(mergedProfile);

      const initial = pickInitialRole(mergedRoles);
      setActiveRole(initial);
      localStorage.setItem(ACTIVE_ROLE_KEY, initial);

      fetchRoleVerification(userId, mergedRoles);
    } catch (e: any) {
      console.error("Error fetching profile:", e);
      const fallbackRoles = getUserRolesFromProfile({ role: "patient", roles: [] });
      setProfile({
        id: "temp",
        user_id: userId,
        full_name: "User",
        email: user?.email ?? "user@example.com",
        role: "patient",
        roles: fallbackRoles,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      setActiveRole("patient");
    }
  };

  const refreshProfile = async () => {
    if (!user?.id) return;
    await fetchProfile(user.id);
  };

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);

      if (s?.user?.id) {
        setTimeout(() => fetchProfile(s.user.id), 0);
      } else {
        setProfile(null);
        setActiveRole("patient");
        setRoleStatus({});
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user?.id) setTimeout(() => fetchProfile(s.user.id), 0);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

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

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: userData.fullName || email,
            role,
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
      await fetchProfile(user.id);
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
