import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useInactivityTimer } from "@/hooks/useInactivityTimer";
import { InactivityWarningModal } from "@/components/InactivityWarningModal";
import { getPrimaryRole, normalizeRole, type AppRole } from "@/lib/rbac";

// --- localStorage cache helpers for instant role resolution ---
const CACHE_KEY = "docito_auth_cache";
interface AuthCache {
  uid: string;
  activeRole: AppRole;
  allRoles: AppRole[];
}
function readCache(): AuthCache | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.uid && parsed?.activeRole) return parsed as AuthCache;
  } catch { /* ignore */ }
  return null;
}
function writeCache(uid: string, activeRole: AppRole, allRoles: AppRole[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ uid, activeRole, allRoles }));
  } catch { /* ignore */ }
}
function clearCache() {
  try { localStorage.removeItem(CACHE_KEY); } catch { /* ignore */ }
}

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
  bootstrapped: boolean;

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

/** Extract role from user_metadata for instant (pre-DB) role resolution */
function getRoleFromMetadata(user: User | null): AppRole {
  const meta = (user as any)?.user_metadata;
  return (normalizeRole(meta?.role) || "patient") as AppRole;
}

function normalizeRolesList(input: unknown[]): AppRole[] {
  const normalized = input.map((r) => normalizeRole(r)).filter(Boolean) as AppRole[];
  return Array.from(new Set(normalized));
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const bootstrapVersionRef = useRef(0);
  const pendingRoleOverrideRef = useRef<AppRole | null>(null);
  const profileRef = useRef<Profile | null>(null);

  // Initialize from cache for instant rendering
  const cached = useRef(readCache()).current;

  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [bootstrapped, setBootstrapped] = useState(false);

  const [activeRole, _setActiveRole] = useState<AppRole>(cached?.activeRole || "patient");
  const [allRoles, setAllRoles] = useState<AppRole[]>(cached?.allRoles || []);
  const [roleStatus, setRoleStatus] = useState<Partial<Record<AppRole, RoleVerificationStatus>>>({});

  const switchRole = (role: AppRole) => {
    _setActiveRole(role);
    // Persist to cache so page refreshes are instant
    if (user?.id) writeCache(user.id, role, allRoles);
  };
  const setActiveRoleSilently = (role: AppRole) => {
    _setActiveRole(role);
    if (user?.id) writeCache(user.id, role, allRoles);
  };

  const clearAuthState = () => {
    setSession(null);
    setUser(null);
    setProfile(null);
    profileRef.current = null;
    setRoleStatus({});
    _setActiveRole("patient");
    setAllRoles([]);
    setBootstrapped(false);
    clearCache();
  };

  const bootstrapViaEdge = async (accessToken?: string): Promise<{ profile: Profile; roles: AppRole[] } | null> => {
    if (!accessToken) return null;

    const { data, error } = await supabase.functions.invoke("me", {
      body: { action: "get" },
      headers: { Authorization: `Bearer ${accessToken}` },
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

  const ensureSelfBootstrap = async (uid: string, sessionUser?: User | null) => {
    try {
      // Use the session user we already have instead of making another getUser() call
      const u = sessionUser;
      const email = (u?.email || user?.email || "").trim();

      const fullName =
        (String((u as any)?.user_metadata?.full_name || (u as any)?.user_metadata?.fullName || "").trim() ||
          safeLocalNameFromEmail(email));

      const metaRole = (normalizeRole((u as any)?.user_metadata?.role) || "patient") as AppRole;
      const profileRole = mapProfileRoleFromAppRole(metaRole);

      // Run upserts in parallel instead of sequentially
      const profileUpsert = async () => {
        await supabase
          .from("profiles")
          .upsert(
            { user_id: uid, email: email || null, full_name: fullName, role: profileRole } as any,
            { onConflict: "user_id" },
          );
      };
      const roleUpsert = async () => {
        await supabase.from("user_roles").upsert(
          { user_id: uid, role: metaRole } as any,
          { onConflict: "user_id,role" },
        );
      };
      const patientUpsert = async () => {
        if (metaRole !== "patient") {
          await supabase.from("user_roles").upsert(
            { user_id: uid, role: "patient" } as any,
            { onConflict: "user_id,role" },
          );
        }
      };

      await Promise.allSettled([profileUpsert(), roleUpsert(), patientUpsert()]);
    } catch (e) {
      console.warn("ensureSelfBootstrap failed (ignored):", e);
    }
  };

  const loadProfileAndRoles = async (uid: string, accessToken?: string, sessionUser?: User | null) => {
    const directRead = async () => {
      const [profileRes, rolesRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("*")
          .eq("user_id", uid)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase.from("user_roles").select("role, assigned_at").eq("user_id", uid),
      ]);

      const directProfile = (profileRes.data as any) as Profile | null;
      const rawRoles = Array.isArray(rolesRes.data) ? rolesRes.data : [];
      const directRoles = rawRoles
        .map((r: any) => r?.role)
        .filter(Boolean) as AppRole[];
      const rolesWithTimestamp = rawRoles
        .filter((r: any) => r?.role && r?.assigned_at)
        .map((r: any) => ({ role: r.role as AppRole, assigned_at: r.assigned_at as string }));

      return {
        directProfile,
        directRoles,
        rolesWithTimestamp,
        profileError: profileRes.error,
        rolesError: rolesRes.error,
      };
    };

    const first = await directRead();

    // Fast path: profile and roles exist — return immediately
    if (first.directProfile && first.directRoles.length > 0 && !first.profileError && !first.rolesError) {
      return { profile: first.directProfile, roles: first.directRoles, rolesWithTimestamp: first.rolesWithTimestamp };
    }

    // Slow path: new user or data missing — bootstrap then retry
    await ensureSelfBootstrap(uid, sessionUser);
    const second = await directRead();

    if (second.directProfile) {
      return { profile: second.directProfile, roles: second.directRoles, rolesWithTimestamp: second.rolesWithTimestamp };
    }

    // Last resort: edge function
    try {
      const boot = await bootstrapViaEdge(accessToken);
      if (boot) return { ...boot, rolesWithTimestamp: second.rolesWithTimestamp };
    } catch (e) {
      console.warn("Edge bootstrap failed (ignored):", e);
    }

    return { profile: null as Profile | null, roles: second.directRoles || [], rolesWithTimestamp: second.rolesWithTimestamp };
  };

  const runBootstrap = async (nextSession: Session | null) => {
    const version = ++bootstrapVersionRef.current;

    try {
      if (!nextSession?.user?.id) {
        setSession(null);
        setUser(null);
        setProfile(null);
        setRoleStatus({});
        _setActiveRole("patient");
        setAllRoles([]);
        clearCache();
        setLoading(false);
        setBootstrapped(true);
        return;
      }

      setSession(nextSession);
      setUser(nextSession.user);

      const uid = nextSession.user.id;

      // INSTANT: Set role from cache or user_metadata so UI can redirect immediately
      const metaRole = getRoleFromMetadata(nextSession.user);
      const cachedData = readCache();
      const hasCacheHit = cachedData?.uid === uid && cachedData.allRoles.length > 0;

      if (hasCacheHit) {
        _setActiveRole(cachedData!.activeRole);
        setAllRoles(cachedData!.allRoles);
      } else {
        _setActiveRole(metaRole);
        setAllRoles([metaRole]);
      }

      // Mark bootstrapped with cached/meta roles for instant redirect,
      // but keep loading=true until profile loads from DB
      setBootstrapped(true);

      // Background: load authoritative data from DB
      const result = (await Promise.race([
        loadProfileAndRoles(uid, nextSession.access_token, nextSession.user),
        new Promise<{ profile: Profile | null; roles: AppRole[]; rolesWithTimestamp: { role: AppRole; assigned_at: string }[] }>((resolve) =>
          setTimeout(() => {
            console.warn("[Auth] loadProfileAndRoles timed out after 8s; using fallback role cache/metadata");
            resolve({ profile: null, roles: [], rolesWithTimestamp: [] });
          }, 8000),
        ),
      ])) as { profile: Profile | null; roles: AppRole[]; rolesWithTimestamp: { role: AppRole; assigned_at: string }[] };

      if (bootstrapVersionRef.current !== version) return; // stale

      const fallbackProfile: Profile = {
        id: uid,
        user_id: uid,
        full_name:
          String((nextSession.user as any)?.user_metadata?.full_name || "").trim() ||
          safeLocalNameFromEmail(nextSession.user.email),
        email: nextSession.user.email || "",
        role: mapProfileRoleFromAppRole(metaRole),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const resolvedProfile = result.profile || profileRef.current || fallbackProfile;
      setProfile(resolvedProfile);
      profileRef.current = resolvedProfile;

      const resolvedRoles = normalizeRolesList([
        ...(Array.isArray(result.roles) ? result.roles : []),
        ...(hasCacheHit ? cachedData!.allRoles : []),
        metaRole,
      ]);

      if (resolvedRoles.length === 0) {
        resolvedRoles.push("patient");
      }

      setAllRoles(resolvedRoles);

      const override = pendingRoleOverrideRef.current;
      let resolvedRole: AppRole;
      if (override && resolvedRoles.includes(override)) {
        resolvedRole = override;
        pendingRoleOverrideRef.current = null;
      } else {
        resolvedRole = getPrimaryRole(resolvedRoles, result.rolesWithTimestamp);
      }

      _setActiveRole(resolvedRole);
      setLoading(false);
      writeCache(uid, resolvedRole, resolvedRoles);
    } catch (e) {
      console.error("[Auth] runBootstrap error:", e);
    } finally {
      if (bootstrapVersionRef.current === version) {
        setLoading(false);
        setBootstrapped(true);
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
    inactivityTime: 45 * 60 * 1000,
    warningTime: 2 * 60 * 1000,
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
        // If profile was lost (tab inactive / GC), re-bootstrap
        if (!profileRef.current) {
          try {
            await runBootstrap(nextSession);
          } catch {
            // ignore
          }
        }
        return;
      }

      try {
        await runBootstrap(nextSession);
      } catch (e) {
        console.error("Auth state change bootstrap failed:", e);
        setLoading(false);
        setBootstrapped(true);
      }
    });

    // Initial session bootstrap (critical on hard refresh)
    void (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!didUnmount) await runBootstrap(data.session ?? null);
      } catch (e) {
        console.error("Initial auth bootstrap failed:", e);
        if (!didUnmount) {
          setLoading(false);
          setBootstrapped(true);
        }
      }
    })();

    // Global safety timeout
    safetyTimer = setTimeout(() => {
      setLoading((current) => {
        if (current) {
          console.warn("[Auth] Safety timeout: forcing loading to false after 5s");
          setBootstrapped(true);
          return false;
        }
        return current;
      });
    }, 5_000);

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
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      toast.success("Successfully signed in!");
      return {};
    } catch (error: any) {
      toast.error("Invalid email or password. Please try again.");
      return { error };
    }
  };

  const signUp = async (email: string, password: string, userData: any = {}): Promise<AuthActionResult> => {
    try {
      const role = (userData.role || "patient") as AppRole;

      // CRITICAL: Set the override BEFORE signUp so that when onAuthStateChange
      // fires runBootstrap during the signUp call, it picks up the correct role.
      pendingRoleOverrideRef.current = role;

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

      // If user already exists, try signing in and adding the new role
      if (error && (error.message?.toLowerCase().includes("already registered") || error.message?.toLowerCase().includes("already been registered"))) {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });

        if (signInError) {
          toast.error("This email is already registered. Please check your password and try again.");
          return { error: signInError };
        }

        const uid = signInData.user?.id;
        if (!uid) {
          toast.error("Sign-in succeeded but no user returned.");
          return { error: new Error("No user ID") };
        }

        const { data: existingRoles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", uid);

        const hasRole = (existingRoles || []).some((r: any) => r.role === role);

        if (hasRole) {
          toast.info(`You already have the "${role.split("_").join(" ")}" role. Signed in instead.`);
          return {};
        }

        const { error: roleErr } = await supabase
          .from("user_roles")
          .insert({ user_id: uid, role } as any);

        if (roleErr) {
          console.error("Failed to add role:", roleErr);
          toast.error("Signed in, but failed to add the new role.");
          return {};
        }

        toast.success(`Role "${role.split("_").join(" ")}" added to your account!`);
        pendingRoleOverrideRef.current = role;
        await runBootstrap(signInData.session);
        return {};
      }

      if (error) throw error;

      if (!data.session) {
        toast.success("Account created successfully! Please check your email to confirm your account.");
        return { needsEmailConfirmation: true };
      }

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
    bootstrapped,
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