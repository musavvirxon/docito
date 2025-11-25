import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useFileUpload } from '@/hooks/useFileUpload';
import { toast } from 'sonner';

interface VerificationDocuments {
  medical_license?: File;
  professional_id?: File;
  specialty_documents?: File[];
  additional_certificates?: File[];
  country_specific_documents?: Record<string, File>;
  medical_license_url?: string;
  professional_id_url?: string;
  specialty_documents_urls?: string[];
  additional_certificates_urls?: string[];
  country_specific_documents_urls?: Record<string, string>;
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
  additional_data?: {
    first_name?: string;
    last_name?: string;
    gender?: string;
    phone?: string;
    email?: string;
    degrees?: string;
    country?: string;
    region?: string;
    avatar_uploaded?: boolean;
    avatar_url?: string;
    practice_association?: string;
    selected_clinic?: string | null;
    linked_clinic_id?: string | null;
    manual_clinic?: {
      name?: string;
      phone?: string;
      email?: string;
      address?: string;
    } | null;
    all_specialties?: string[];
    preferred_appointment_types?: string[];
    consultation_fee_from?: string;
    consultation_fee_to?: string;
  };
}

export const useDoctorVerification = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { uploadFile } = useFileUpload();

  const submitForVerification = async (doctorId: string, formData: DoctorVerificationData) => {
    setIsSubmitting(true);
    try {
      // Get IP address and country
      let ipAddress = '';
      let submissionCountry = '';
      try {
        const ipResponse = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipResponse.json();
        ipAddress = ipData.ip;
        
        // Get country from IP
        const geoResponse = await fetch(`https://ipapi.co/${ipAddress}/json/`);
        const geoData = await geoResponse.json();
        submissionCountry = geoData.country_name || '';
      } catch (error) {
        console.error('Error fetching IP/country:', error);
      }

      // Check if verification already exists
      const { data: existingVerification } = await (supabase as any)
        .from('doctor_verification')
        .select('id')
        .eq('doctor_id', doctorId)
        .maybeSingle();

      // Upload documents first
      let medical_license_url = formData.documents.medical_license_url;
      let professional_id_url = formData.documents.professional_id_url;
      let specialty_documents_urls: string[] = formData.documents.specialty_documents_urls || [];
      let country_specific_documents_urls: Record<string, string> = formData.documents.country_specific_documents_urls || {};

      if (formData.documents.medical_license) {
        // Delete old medical license documents if they exist
        if (existingVerification) {
          const { data: oldDocs } = await (supabase as any)
            .from('doctor_verification_documents')
            .select('file_path')
            .eq('doctor_verification_id', existingVerification.id)
            .eq('document_type', 'medical_license');

          if (oldDocs && oldDocs.length > 0) {
            // Delete from storage first
            const filePaths = oldDocs.map((doc: any) => doc.file_path.replace(/^\/+/, ''));
            const { error: storageError } = await supabase.storage
              .from('verification-documents')
              .remove(filePaths);
            
            if (storageError) {
              console.error('Error deleting old files from storage:', storageError);
            }
            
            // Then delete from database
            const { error: dbError } = await (supabase as any)
              .from('doctor_verification_documents')
              .delete()
              .eq('doctor_verification_id', existingVerification.id)
              .eq('document_type', 'medical_license');
              
            if (dbError) {
              console.error('Error deleting old documents from DB:', dbError);
            }
          }
        }

        const result = await uploadFile(
          formData.documents.medical_license,
          'verification-documents',
          `doctors/${doctorId}/medical-license-${Date.now()}.pdf`
        );
        if (result) {
          medical_license_url = result.path;
        }
      }

      if (formData.documents.professional_id) {
        // Delete old professional ID documents if they exist
        if (existingVerification) {
          const { data: oldDocs } = await (supabase as any)
            .from('doctor_verification_documents')
            .select('file_path')
            .eq('doctor_verification_id', existingVerification.id)
            .eq('document_type', 'professional_id');

          if (oldDocs && oldDocs.length > 0) {
            // Delete from storage first
            const filePaths = oldDocs.map((doc: any) => doc.file_path.replace(/^\/+/, ''));
            const { error: storageError } = await supabase.storage
              .from('verification-documents')
              .remove(filePaths);
            
            if (storageError) {
              console.error('Error deleting old files from storage:', storageError);
            }
            
            // Then delete from database
            const { error: dbError } = await (supabase as any)
              .from('doctor_verification_documents')
              .delete()
              .eq('doctor_verification_id', existingVerification.id)
              .eq('document_type', 'professional_id');
              
            if (dbError) {
              console.error('Error deleting old documents from DB:', dbError);
            }
          }
        }

        const result = await uploadFile(
          formData.documents.professional_id,
          'verification-documents',
          `doctors/${doctorId}/professional-id-${Date.now()}.pdf`
        );
        if (result) {
          professional_id_url = result.path;
        }
      }

      // Upload specialty documents
      if (formData.documents.specialty_documents && formData.documents.specialty_documents.length > 0) {
        specialty_documents_urls = [];
        for (let i = 0; i < formData.documents.specialty_documents.length; i++) {
          const doc = formData.documents.specialty_documents[i];
          const result = await uploadFile(
            doc,
            'verification-documents',
            `doctors/${doctorId}/specialty-doc-${i + 1}-${Date.now()}.pdf`
          );
          if (result) {
            specialty_documents_urls.push(result.path);
          }
        }
      }

      // Upload additional certificates
      const additional_certificates_urls: string[] = [];
      if (formData.documents.additional_certificates && formData.documents.additional_certificates.length > 0) {
        for (let i = 0; i < formData.documents.additional_certificates.length; i++) {
          const cert = formData.documents.additional_certificates[i];
          const fileExt = cert.name.split('.').pop() || 'pdf';
          const result = await uploadFile(
            cert,
            'verification-documents',
            `doctors/${doctorId}/additional-cert-${i + 1}-${Date.now()}.${fileExt}`
          );
          if (result) {
            additional_certificates_urls.push(result.path);
          }
        }
      }

      // Upload country-specific documents
      if (formData.documents.country_specific_documents) {
        country_specific_documents_urls = {};
        for (const [docKey, docFile] of Object.entries(formData.documents.country_specific_documents)) {
          const fileExt = docFile.name.split('.').pop() || 'pdf';
          const result = await uploadFile(
            docFile,
            'verification-documents',
            `doctors/${doctorId}/${docKey}-${Date.now()}.${fileExt}`
          );
          if (result) {
            country_specific_documents_urls[docKey] = result.path;
          }
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

      let verificationData;
      
      if (existingVerification) {
        // Update existing verification - set to resubmitted if previously declined
        const currentStatus = existingVerification.status;
        const newStatus = (currentStatus === 'declined') ? 'resubmitted' : 'pending';
        
        const { error: verificationError } = await (supabase as any)
          .from('doctor_verification')
          .update({
            status: newStatus,
            submitted_at: new Date().toISOString(),
            specialty: formData.specialty,
            license_number: formData.license_number,
            years_of_experience: formData.years_experience,
            rejection_reason: null, // Clear previous rejection reason
            verification_data: {
              languages: formData.languages,
              consultation_types: formData.consultation_types,
              additional_info: {
                ...formData.additional_data,
                submission_ip: ipAddress,
                submission_country: submissionCountry,
              },
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
              additional_info: {
                ...formData.additional_data,
                submission_ip: ipAddress,
                submission_country: submissionCountry,
              },
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
        
        if (verificationId && (medical_license_url || professional_id_url || specialty_documents_urls.length > 0 || additional_certificates_urls.length > 0 || Object.keys(country_specific_documents_urls).length > 0)) {
          const documents = [];
          if (medical_license_url) {
            documents.push({
              doctor_verification_id: verificationId,
              document_type: 'medical_license',
              file_path: medical_license_url,
              file_name: `medical-license-${Date.now()}.pdf`,
            });
          }
          if (professional_id_url) {
            documents.push({
              doctor_verification_id: verificationId,
              document_type: 'professional_id',
              file_path: professional_id_url,
              file_name: `professional-id-${Date.now()}.pdf`,
            });
          }
          // Add specialty documents
          specialty_documents_urls.forEach((url, index) => {
            documents.push({
              doctor_verification_id: verificationId,
              document_type: 'specialty_document',
              file_path: url,
              file_name: `specialty-document-${index + 1}-${Date.now()}.pdf`,
            });
          });
          // Add additional certificates
          additional_certificates_urls.forEach((url, index) => {
            documents.push({
              doctor_verification_id: verificationId,
              document_type: 'additional_certificate',
              file_path: url,
              file_name: `additional-certificate-${index + 1}-${Date.now()}`,
            });
          });
          // Add country-specific documents
          Object.entries(country_specific_documents_urls).forEach(([docKey, url]) => {
            documents.push({
              doctor_verification_id: verificationId,
              document_type: docKey,
              file_path: url,
              file_name: `${docKey}-${Date.now()}`,
            });
          });

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
