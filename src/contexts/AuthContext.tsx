import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  role: 'patient' | 'doctor' | 'admin' | 'staff';
  phone?: string;
  date_of_birth?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  avatar_url?: string;
  address?: string;
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

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        // If profile doesn't exist, create a default one
        if (error.code === 'PGRST116') {
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
              setProfile(created);
              return;
            }
          }
        }
        throw error;
      }
      setProfile(data);
    } catch (error: any) {
      console.error('Error fetching profile:', error);
      // Set a temporary profile to prevent loading loop
      setProfile({
        id: 'temp',
        user_id: userId,
        full_name: 'Guest User',
        email: 'guest@example.com',
        role: 'patient',
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
      toast.error(error.message || 'Failed to sign in');
      return { error };
    }
  };

  const signUp = async (email: string, password: string, userData: any = {}) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: {
            full_name: userData.fullName || email,
            role: userData.role || 'patient'
          }
        }
      });
      
      if (error) throw error;
      
      // If user is immediately confirmed (development/testing), redirect them
      if (data.user && !data.user.email_confirmed_at) {
        toast.success('Account created successfully! Please check your email to verify your account.');
      } else if (data.user && userData.role === 'doctor') {
        toast.success('Doctor account created! Redirecting to complete your profile...');
        // Auto-redirect to doctor setup after successful signup
        setTimeout(() => {
          window.location.href = '/doctor-signup';
        }, 1500);
      } else {
        toast.success('Account created successfully!');
      }
      
      return {};
    } catch (error: any) {
      toast.error(error.message || 'Failed to create account');
      return { error };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      setUser(null);
      setProfile(null);
      setSession(null);
      
      toast.success('Successfully signed out!');
    } catch (error: any) {
      toast.error('Failed to sign out');
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

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};