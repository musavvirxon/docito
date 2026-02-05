import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useInactivityTimer } from "@/hooks/useInactivityTimer";
import { InactivityWarningModal } from "@/components/InactivityWarningModal";
import { getPrimaryRole, getUserRolesFromProfile, type AppRole } from "@/lib/rbac";
import { getBrowserTimezone } from "@/lib/timezone";

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

const FACILITY_ADMIN_ROLES: AppRole[] = ["lab_admin", "pharmacy_admin", "imaging_admin"];
const GENERIC_ROLES: AppRole[] = ["patient", "doctor", "staff", "admin", "clinic_admin"];

const isFacilityAdmin = (role: AppRole) => FACILITY_ADMIN_ROLES.includes(role);
const isGenericRole = (role: AppRole) => GENERIC_ROLES.includes(role);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const [activeRole, _setActiveRole] = useState<AppRole>("patient");
  const [roleStatus, setRoleStatus] = useState<Partial<Record<AppRole, RoleVerificationStatus>>>({});

  const allRoles: AppRole[] = useMemo(() => {
    if (!profile) return [];
    const roles = getUserRolesFromProfile(profile as any);
    const primary = getPrimaryRole(roles);
    const normalized = Array.from(new Set([...(roles || []), primary].filter(Boolean))) as AppRole[];
    return normalized;
  }, [profile]);

  const setActiveRoleSilently = (role: AppRole) => {
    _setActiveRole(role);
    try {
      localStorage.setItem(ACTIVE_ROLE_KEY, role);
    } catch {
      // ignore
    }
  };

  const switchRole = (role: AppRole) => {
    setActiveRoleSilently(role);
    toast.success(`Switched to ${role.replace("_", " ")}`);
  };

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle();
      if (error) throw error;

      const p = (data as any) || null;
      setProfile(p);

      const roles = getUserRolesFromProfile(p);
      const primary = getPrimaryRole(roles);

      // restore last active role if still valid
      let stored: AppRole | null = null;
      try {
        stored = (localStorage.getItem(ACTIVE_ROLE_KEY) as AppRole) || null;
      } catch {
        stored = null;
      }

      const available = Array.from(new Set([...(roles || []), primary].filter(Boolean))) as AppRole[];
      let nextRole: AppRole = primary || "patient";

      if (stored && (available.includes(stored) || isGenericRole(stored) || isFacilityAdmin(stored))) {
        nextRole = stored;
      }

      _setActiveRole(nextRole);

      // Role verification statuses are maintained elsewhere; keep existing behavior
      setRoleStatus({});
    } catch (e) {
      console.error("Failed to fetch profile:", e);
      setProfile(null);
      _setActiveRole("patient");
      setRoleStatus({});
    }
  };

  const refreshProfile = async () => {
    if (!user?.id) return;
    await fetchProfile(user.id);
  };

  const { showWarning, countdown, stayLoggedIn } = useInactivityTimer(session);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user?.id) {
        setTimeout(() => fetchProfile(s.user.id), 0);
      } else {
        setProfile(null);
        _setActiveRole("patient");
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

      const marketing =
        Boolean(
          userData.marketing_communications ??
            userData.marketingCommunications ??
            userData.marketingOptIn ??
            false,
        ) || false;

      const tz = userData.timezone || getBrowserTimezone();

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: userData.fullName || email,
            role,
            marketing_communications: marketing,
            timezone: tz,
            timezone_source: "browser",
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

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Signed out");
    } catch (e: any) {
      toast.error(e?.message || "Failed to sign out");
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    try {
      if (!user) throw new Error("No user logged in");

      const patch: Record<string, any> = { ...updates };

      if (typeof (updates as any).timezone === "string" && (updates as any).timezone.length) {
        patch.timezone_source = "manual";
        patch.timezone_updated_at = new Date().toISOString();
      }

      const { error } = await supabase.from("profiles").update(patch).eq("user_id", user.id);
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
