import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useFileUpload } from '@/hooks/useFileUpload';
import { toast } from 'sonner';

interface VerificationDocuments {
  medical_license?: File;
  professional_id?: File;
  medical_license_url?: string;
  professional_id_url?: string;
}

interface DoctorVerificationData {
  specialty: string;
  bio: string;
  license_number: string;
  consultation_fee: number;
  years_experience?: string;
  languages?: string[];
  consultation_types?: string[];
  documents: VerificationDocuments;
}

export const useDoctorVerification = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { uploadFile } = useFileUpload();

  const submitForVerification = async (doctorId: string, formData: DoctorVerificationData) => {
    setIsSubmitting(true);
    try {
      // Upload documents first
      let medical_license_url = formData.documents.medical_license_url;
      let professional_id_url = formData.documents.professional_id_url;

      if (formData.documents.medical_license) {
        const result = await uploadFile(
          formData.documents.medical_license,
          'verification-documents',
          `doctors/${doctorId}/medical-license-${Date.now()}.pdf`
        );
        if (result) {
          medical_license_url = result.url;
        }
      }

      if (formData.documents.professional_id) {
        const result = await uploadFile(
          formData.documents.professional_id,
          'verification-documents',
          `doctors/${doctorId}/professional-id-${Date.now()}.pdf`
        );
        if (result) {
          professional_id_url = result.url;
        }
      }

      // Update doctor profile
      const { error: doctorError } = await supabase
        .from('doctors')
        .update({
          specialty: formData.specialty,
          bio: formData.bio,
          license_number: formData.license_number,
          consultation_fee: formData.consultation_fee,
        })
        .eq('id', doctorId);

      if (doctorError) throw doctorError;

      // Check if verification already exists
      const { data: existingVerification } = await (supabase as any)
        .from('doctor_verification')
        .select('id')
        .eq('doctor_id', doctorId)
        .maybeSingle();

      let verificationData;
      
      if (existingVerification) {
        // Update existing verification
        const { error: verificationError } = await (supabase as any)
          .from('doctor_verification')
          .update({
            status: 'pending',
            submitted_at: new Date().toISOString(),
            specialty: formData.specialty,
            license_number: formData.license_number,
            years_of_experience: formData.years_experience,
            verification_data: {
              languages: formData.languages,
              consultation_types: formData.consultation_types,
            }
          })
          .eq('id', existingVerification.id)
          .select()
          .maybeSingle();

        if (verificationError) {
          console.error('Verification error:', verificationError);
          throw verificationError;
        }
        verificationData = existingVerification;
      } else {
        // Create new verification request
        const { data, error: verificationError } = await (supabase as any)
          .from('doctor_verification')
          .insert({
            doctor_id: doctorId,
            status: 'pending',
            submitted_at: new Date().toISOString(),
            specialty: formData.specialty,
            license_number: formData.license_number,
            years_of_experience: formData.years_experience,
            verification_data: {
              languages: formData.languages,
              consultation_types: formData.consultation_types,
            }
          })
          .select()
          .maybeSingle();

        if (verificationError) {
          console.error('Verification error:', verificationError);
          throw verificationError;
        }
        verificationData = data;
      }

      // Upload verification documents records
      if (verificationData || existingVerification) {
        const verificationId = verificationData?.id || existingVerification?.id;
        
        if (verificationId && (medical_license_url || professional_id_url)) {
          const documents = [];
          if (medical_license_url) {
            const urlParts = medical_license_url.split('/');
            const fileName = urlParts[urlParts.length - 1];
            documents.push({
              doctor_verification_id: verificationId,
              document_type: 'medical_license',
              file_path: medical_license_url,
              file_name: fileName,
            });
          }
          if (professional_id_url) {
            const urlParts = professional_id_url.split('/');
            const fileName = urlParts[urlParts.length - 1];
            documents.push({
              doctor_verification_id: verificationId,
              document_type: 'professional_id',
              file_path: professional_id_url,
              file_name: fileName,
            });
          }

          const { error: docsError } = await (supabase as any)
            .from('doctor_verification_documents')
            .insert(documents);

          if (docsError) {
            console.error('Documents upload error:', docsError);
          }
        }
      }

      toast.success('Verification request submitted successfully!');
      return { success: true, verificationId: verificationData?.id || existingVerification?.id };
    } catch (error: any) {
      console.error('Error submitting verification:', error);
      toast.error(error.message || 'Failed to submit verification request');
      return { success: false, error: error.message };
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    submitForVerification,
    isSubmitting,
  };
};
