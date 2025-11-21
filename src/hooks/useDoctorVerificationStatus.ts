import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface VerificationStatus {
  id: string;
  status: string;
  submitted_at: string;
  reviewed_at?: string;
  rejection_reason?: string;
  specialty: string;
  license_number?: string;
  years_of_experience?: string;
  verification_data?: {
    languages?: string[];
    consultation_types?: string[];
    additional_info?: any;
  };
  documents?: Array<{
    document_type: string;
    file_path: string;
    file_name: string;
  }>;
}

export const useDoctorVerificationStatus = () => {
  const { user } = useAuth();
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVerificationStatus = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Get doctor ID first
      const { data: doctorData, error: doctorError } = await supabase
        .from('doctors')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (doctorError) throw doctorError;
      if (!doctorData) {
        setVerificationStatus(null);
        setLoading(false);
        return;
      }

      // Fetch verification status
      const { data: verification, error: verificationError } = await supabase
        .from('doctor_verification')
        .select('*')
        .eq('doctor_id', doctorData.id)
        .maybeSingle();

      if (verificationError && verificationError.code !== 'PGRST116') {
        throw verificationError;
      }

      if (verification) {
        // Fetch associated documents
        const { data: documents } = await supabase
          .from('doctor_verification_documents')
          .select('document_type, file_path, file_name')
          .eq('doctor_verification_id', verification.id);

        setVerificationStatus({
          ...verification,
          verification_data: verification.verification_data as any,
          documents: documents || [],
        });
      } else {
        setVerificationStatus(null);
      }
    } catch (err: any) {
      console.error('Error fetching verification status:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVerificationStatus();
  }, [user]);

  return {
    verificationStatus,
    loading,
    error,
    refetch: fetchVerificationStatus,
  };
};
