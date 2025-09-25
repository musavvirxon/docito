import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DoctorProfileData {
  id: string;
  user_id: string;
  specialty: string;
  bio?: string;
  verified: boolean;
  license_number?: string;
  consultation_fee?: number;
  accepts_new_patients: boolean;
  average_rating: number;
  num_reviews: number;
  weighted_rating: number;
  appointment_count: number;
  practice_id?: string;
  years_experience?: number;
  languages?: string[];
  consultation_types?: string[];
  profiles?: {
    full_name: string;
    email: string;
    avatar_url?: string;
    phone?: string;
  };
  practices?: {
    name: string;
    city: string;
    country: string;
    verified: boolean;
  };
}

export const useDoctorProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<DoctorProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('doctors')
        .select(`
          *,
          profiles:user_id (
            full_name,
            email,
            avatar_url,
            phone
          ),
          practices:practice_id (
            name,
            city,
            country,
            verified
          )
        `)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setProfile({
          ...data,
          languages: ['English'], // Default languages
          consultation_types: ['In-person', 'Video'], // Default consultation types
          years_experience: 5 // Default years of experience
        });
      }
    } catch (err: any) {
      console.error('Error fetching doctor profile:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<DoctorProfileData>) => {
    if (!profile) return { error: 'No profile found' };

    try {
      const { error } = await supabase
        .from('doctors')
        .update(updates)
        .eq('id', profile.id);

      if (error) throw error;

      // Update profile data in state
      setProfile(prev => prev ? { ...prev, ...updates } : null);
      toast.success('Profile updated successfully');
      return { success: true };
    } catch (err: any) {
      console.error('Error updating profile:', err);
      toast.error('Failed to update profile');
      return { error: err.message };
    }
  };

  const calculateProfileCompletion = (): number => {
    if (!profile) return 0;
    
    let completion = 0;
    const totalFields = 8;

    if (profile.profiles?.avatar_url) completion += 1;
    if (profile.specialty) completion += 1;
    if (profile.bio) completion += 1;
    if (profile.license_number) completion += 1;
    if (profile.consultation_fee) completion += 1;
    if (profile.profiles?.phone) completion += 1;
    if (profile.practice_id || profile.verified) completion += 1;
    if (profile.years_experience) completion += 1;

    return Math.round((completion / totalFields) * 100);
  };

  useEffect(() => {
    fetchProfile();
  }, [user]);

  return {
    profile,
    loading,
    error,
    updateProfile,
    refreshProfile: fetchProfile,
    profileCompletion: calculateProfileCompletion()
  };
};