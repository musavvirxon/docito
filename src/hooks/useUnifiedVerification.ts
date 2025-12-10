import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useFileUpload } from '@/hooks/useFileUpload';

export type EntityType = 'practice' | 'doctor' | 'pharmacy';

export interface VerificationDocument {
  id: string;
  entity_type: EntityType;
  entity_id: string;
  document_type: string;
  file_name: string;
  file_path: string;
  file_size?: number;
  status: string;
  rejection_reason?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
}

export interface VerificationSubmission {
  id: string;
  name: string;
  entity_type: EntityType;
  verification_status: string;
  email?: string;
  phone?: string;
  created_at: string;
  documents?: VerificationDocument[];
}

const DOCUMENT_REQUIREMENTS: Record<EntityType, { type: string; label: string; description: string }[]> = {
  practice: [
    { type: 'business_license', label: 'Business License', description: 'Valid business operating license' },
    { type: 'tax_certificate', label: 'Tax Certificate', description: 'Tax registration document' },
    { type: 'professional_license', label: 'Professional License', description: 'Medical/dental practice license' },
    { type: 'insurance_certificate', label: 'Insurance Certificate', description: 'Professional liability insurance' },
  ],
  doctor: [
    { type: 'medical_license', label: 'Medical License', description: 'Valid medical/dental license' },
    { type: 'board_certification', label: 'Board Certification', description: 'Specialty board certification' },
    { type: 'photo_id', label: 'Photo ID', description: 'Government-issued photo identification' },
    { type: 'diploma', label: 'Medical Degree', description: 'Medical school diploma or certificate' },
  ],
  pharmacy: [
    { type: 'pharmacy_license', label: 'Pharmacy License', description: 'State pharmacy operating license' },
    { type: 'dea_registration', label: 'DEA Registration', description: 'DEA registration certificate' },
    { type: 'business_license', label: 'Business License', description: 'Business operating permit' },
    { type: 'insurance_certificate', label: 'Insurance Certificate', description: 'Pharmacy liability insurance' },
  ],
};

export const useUnifiedVerification = (entityType?: EntityType, entityId?: string) => {
  const [documents, setDocuments] = useState<VerificationDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState<VerificationSubmission[]>([]);
  const { uploadFile, uploading } = useFileUpload();

  const requirements = entityType ? DOCUMENT_REQUIREMENTS[entityType] : [];

  useEffect(() => {
    if (entityType && entityId) {
      fetchDocuments();
    }
  }, [entityType, entityId]);

  const fetchDocuments = async () => {
    if (!entityType || !entityId) return;
    
    try {
      const { data, error } = await supabase
        .from('verification_documents')
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const uploadDocument = async (documentType: string, file: File) => {
    if (!entityType || !entityId) return;

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload PDF, JPG, or PNG files only');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    try {
      const uploadPath = `${entityType}/${entityId}/${documentType}_${Date.now()}_${file.name}`;
      const result = await uploadFile(file, 'verification-documents', uploadPath);

      if (!result) throw new Error('Failed to upload file');

      const { error } = await supabase
        .from('verification_documents')
        .insert({
          entity_type: entityType,
          entity_id: entityId,
          document_type: documentType,
          file_name: file.name,
          file_path: result.path,
          file_size: file.size,
          status: 'pending'
        });

      if (error) throw error;
      toast.success('Document uploaded successfully');
      fetchDocuments();
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload document');
    }
  };

  // Super Admin: Fetch all pending verifications
  const fetchPendingVerifications = async (type?: EntityType, status?: string) => {
    try {
      setLoading(true);
      const results: VerificationSubmission[] = [];

      // Fetch practices
      if (!type || type === 'practice') {
        let query = supabase
          .from('practices')
          .select('id, name, email, phone, verification_status, created_at')
          .order('created_at', { ascending: false });
        
        if (status && status !== 'all') {
          query = query.eq('verification_status', status);
        }

        const { data: practices } = await query;
        practices?.forEach(p => {
          results.push({
            ...p,
            entity_type: 'practice' as EntityType
          });
        });
      }

      // Fetch doctors
      if (!type || type === 'doctor') {
        let query = supabase
          .from('doctor_verification')
          .select(`
            id, status, submitted_at, specialty,
            doctors!inner(id, user_id, profiles:profiles!fk_doctors_user_id(full_name, email, phone))
          `)
          .order('submitted_at', { ascending: false });

        if (status && status !== 'all') {
          query = query.eq('status', status === 'verified' ? 'verified' : status);
        }

        const { data: doctorVerifications } = await query;
        doctorVerifications?.forEach((dv: any) => {
          results.push({
            id: dv.id,
            name: dv.doctors?.profiles?.full_name || 'Unknown',
            email: dv.doctors?.profiles?.email,
            phone: dv.doctors?.profiles?.phone,
            entity_type: 'doctor' as EntityType,
            verification_status: dv.status,
            created_at: dv.submitted_at
          });
        });
      }

      // Fetch pharmacies
      if (!type || type === 'pharmacy') {
        let query = supabase
          .from('pharmacies')
          .select('id, name, email, phone, verification_status, created_at')
          .order('created_at', { ascending: false });
        
        if (status && status !== 'all') {
          query = query.eq('verification_status', status);
        }

        const { data: pharmacies } = await query;
        pharmacies?.forEach(p => {
          results.push({
            ...p,
            entity_type: 'pharmacy' as EntityType
          });
        });
      }

      // Sort by date
      results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setSubmissions(results);
    } catch (error) {
      console.error('Error fetching verifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Super Admin: Review document
  const reviewDocument = async (
    documentId: string, 
    status: 'approved' | 'rejected', 
    rejectionReason?: string
  ) => {
    try {
      const { error } = await supabase
        .from('verification_documents')
        .update({
          status,
          rejection_reason: rejectionReason,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', documentId);

      if (error) throw error;
      toast.success(`Document ${status}`);
      fetchDocuments();
    } catch (error: any) {
      toast.error(error.message || 'Failed to review document');
    }
  };

  // Super Admin: Update entity verification status
  const updateVerificationStatus = async (
    type: EntityType,
    id: string,
    status: string,
    reason?: string
  ) => {
    try {
      if (type === 'practice') {
        await supabase
          .from('practices')
          .update({ 
            verification_status: status, 
            verified: status === 'verified' 
          })
          .eq('id', id);
      } else if (type === 'doctor') {
        await supabase
          .from('doctor_verification')
          .update({ 
            status, 
            rejection_reason: reason,
            reviewed_at: new Date().toISOString()
          })
          .eq('id', id);
        
        // Also update doctors table
        const { data: dv } = await supabase
          .from('doctor_verification')
          .select('doctor_id')
          .eq('id', id)
          .single();
        
        if (dv) {
          await supabase
            .from('doctors')
            .update({ verified: status === 'verified' })
            .eq('id', dv.doctor_id);
        }
      } else if (type === 'pharmacy') {
        await supabase
          .from('pharmacies')
          .update({ 
            verification_status: status, 
            verified: status === 'verified' 
          })
          .eq('id', id);
      }

      toast.success(`Verification ${status}`);
      fetchPendingVerifications();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update status');
    }
  };

  const getDocumentStatus = (docType: string) => {
    return documents.find(d => d.document_type === docType);
  };

  return {
    documents,
    loading,
    uploading,
    requirements,
    submissions,
    uploadDocument,
    fetchDocuments,
    fetchPendingVerifications,
    reviewDocument,
    updateVerificationStatus,
    getDocumentStatus
  };
};
