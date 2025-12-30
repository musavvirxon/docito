import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useInactivityTimer } from '@/hooks/useInactivityTimer';
import { InactivityWarningModal } from '@/components/InactivityWarningModal';

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  role: 'patient' | 'doctor' | 'admin' | 'staff';
  roles?: string[]; // Array of all roles from user_roles table
  phone?: string;
  date_of_birth?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  avatar_url?: string;
  address?: string;
  notification_settings?: any;
  privacy_settings?: any;
  timezone?: string;
  language?: string;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: any }>;
  signUp: (email: string, password: string, userData?: any) => Promise<{ error?: any }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error?: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Clear all state
      setUser(null);
      setProfile(null);
      setSession(null);
      
      // Clear any cached data
      localStorage.clear();
      sessionStorage.clear();
      
      toast.success('Successfully signed out!');
      
      // Redirect to home page
      window.location.href = '/';
    } catch (error: any) {
      toast.error('Failed to sign out');
      // Even if there's an error, clear local state and redirect
      setUser(null);
      setProfile(null);
      setSession(null);
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/';
    }
  };

  // Inactivity timer - only active when user is logged in
  const { showWarning, countdown, stayLoggedIn } = useInactivityTimer({
    onInactive: async () => {
      if (!user) return; // Don't logout if no user
      toast.info('You have been logged out due to inactivity');
      await signOut();
    },
    inactivityTime: 30 * 60 * 1000, // 30 minutes (configurable)
    warningTime: 60 * 1000, // 1 minute warning
    enabled: !!user && !loading, // Only enable when user is logged in and not loading
  });

  const fetchProfile = async (userId: string) => {
    try {
      // Fetch profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileError) {
        // If profile doesn't exist, create a default one
        if (profileError.code === 'PGRST116') {
          const { data: user } = await supabase.auth.getUser();
          if (user?.user?.email) {
            const newProfile = {
              user_id: userId,
              full_name: user.user.user_metadata?.full_name || user.user.email,
              email: user.user.email,
              role: user.user.user_metadata?.role || 'patient'
            };
            
            const { data: created, error: createError } = await supabase
              .from('profiles')
              .insert(newProfile)
              .select()
              .single();
              
            if (!createError && created) {
              // Fetch user roles from user_roles table
              const { data: userRoles } = await supabase
                .from('user_roles')
                .select('role')
                .eq('user_id', userId);
              
              const roles = userRoles?.map(r => r.role) || [];
              setProfile({ ...created, roles });
              return;
            }
          }
        }
        throw profileError;
      }

      // Fetch user roles from user_roles table
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);
      
      const roles = userRoles?.map(r => r.role) || [];
      
      // Set profile with roles array
      setProfile({ ...profileData, roles });
    } catch (error: any) {
      console.error('Error fetching profile:', error);
      // Set a temporary profile to prevent loading loop
      setProfile({
        id: 'temp',
        user_id: userId,
        full_name: 'Guest User',
        email: 'guest@example.com',
        role: 'patient',
        roles: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Defer profile fetching to avoid blocking auth state changes
          setTimeout(() => {
            fetchProfile(session.user.id);
          }, 0);
        } else {
          setProfile(null);
        }
        
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        setTimeout(() => {
          fetchProfile(session.user.id);
        }, 0);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      toast.success('Successfully signed in!');
      return {};
    } catch (error: any) {
      // Generic error message to prevent account enumeration
      toast.error('Invalid email or password. Please try again.');
      return { error };
    }
  };

  const signUp = async (email: string, password: string, userData: any = {}) => {
    try {
      const role = userData.role || 'patient';
      
      // Set redirect URL based on role
      let redirectUrl = `${window.location.origin}/patient-dashboard`;
      if (role === 'doctor') {
        redirectUrl = `${window.location.origin}/doctor-dashboard`;
      } else if (role === 'admin' || role === 'clinic_admin') {
        redirectUrl = `${window.location.origin}/admin-dashboard`;
      } else if (role === 'pharmacy_admin') {
        redirectUrl = `${window.location.origin}/pharmacy/dashboard`;
      } else if (role === 'lab_admin') {
        redirectUrl = `${window.location.origin}/lab/dashboard`;
      } else if (role === 'imaging_admin') {
        redirectUrl = `${window.location.origin}/imaging/dashboard`;
      }
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: userData.fullName || email,
            role: role
          }
        }
      });
      
      if (error) {
        // Log full error for debugging
        console.error('Signup error:', {
          code: error.code,
          message: error.message,
          status: error.status,
          name: error.name
        });
        throw error;
      }
      
      // For doctors, create a basic doctor profile entry
      if (role === 'doctor' && data.user) {
        const { error: doctorError } = await supabase
          .from('doctors')
          .insert({
            user_id: data.user.id,
            specialty: 'General Practice',
            verified: false,
            accepts_new_patients: true
          });
        
        if (doctorError) {
          console.error('Doctor profile creation error:', doctorError);
        }
      }
      
      toast.success('Account created successfully!');
      return {};
    } catch (error: any) {
      // Show actual error message for debugging (in development)
      const errorMessage = error.message || 'Unable to create account';
      console.error('Full signup error:', error);
      
      // Provide more specific error messages
      if (error.message?.includes('duplicate key') || error.message?.includes('already registered')) {
        toast.error('An account with this email already exists.');
      } else if (error.message?.includes('invalid') && error.message?.includes('enum')) {
        toast.error('Invalid account type selected. Please try again.');
      } else if (error.message?.includes('violates foreign key')) {
        toast.error('Account setup error. Please contact support.');
      } else {
        toast.error(errorMessage);
      }
      
      return { error };
    }
  };


  const updateProfile = async (updates: Partial<Profile>) => {
    try {
      if (!user) throw new Error('No user logged in');
      
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', user.id);

      if (error) throw error;
      
      // Refetch profile to get updated data
      await fetchProfile(user.id);
      
      toast.success('Profile updated successfully!');
      return {};
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile');
      return { error };
    }
  };

  const value = {
    user,
    profile,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      {user && (
        <InactivityWarningModal
          open={showWarning}
          countdown={countdown}
          onStayLoggedIn={stayLoggedIn}
        />
      )}
    </AuthContext.Provider>
  );
};