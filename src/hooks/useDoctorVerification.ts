import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useFileUpload } from "@/hooks/useFileUpload";
import { toast } from "sonner";

interface VerificationDocuments {
  medical_license?: File;
  professional_id?: File;
  specialty_documents?: File[];
  additional_certificates?: File[];
  country_specific_documents?: Record<string, File>;

  // existing URLs (optional)
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
  additional_data?: Record<string, any>;
}

function extFromFile(f: File, fallback: string) {
  const raw = f.name.split(".").pop()?.toLowerCase() || "";
  if (!raw) return fallback;
  // allow common image/pdf extensions
  if (["pdf", "jpg", "jpeg", "png", "webp"].includes(raw)) return raw;
  return fallback;
}

async function getIpAndCountry(): Promise<{ ipAddress: string; submissionCountry: string }> {
  let ipAddress = "";
  let submissionCountry = "";
  try {
    const ipResponse = await fetch("https://api.ipify.org?format=json");
    const ipData = await ipResponse.json();
    ipAddress = ipData.ip || "";

    if (ipAddress) {
      const geoResponse = await fetch(`https://ipapi.co/${ipAddress}/json/`);
      const geoData = await geoResponse.json();
      submissionCountry = geoData.country_name || "";
    }
  } catch (error) {
    console.error("Error fetching IP/country:", error);
  }
  return { ipAddress, submissionCountry };
}

export const useDoctorVerification = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { uploadFile } = useFileUpload();

  const submitForVerification = async (doctorId: string, formData: DoctorVerificationData) => {
    setIsSubmitting(true);

    try {
      const { ipAddress, submissionCountry } = await getIpAndCountry();

      // IMPORTANT FIX:
      // previously selected only 'id' but later used existingVerification.status -> crash/logic bug.
      const { data: existingVerification, error: existingErr } = await (supabase as any)
        .from("doctor_verification")
        .select("id,status")
        .eq("doctor_id", doctorId)
        .maybeSingle();

      if (existingErr) throw existingErr;

      // Upload documents first
      let medical_license_url = formData.documents.medical_license_url;
      let professional_id_url = formData.documents.professional_id_url;
      let specialty_documents_urls: string[] = formData.documents.specialty_documents_urls || [];
      let country_specific_documents_urls: Record<string, string> =
        formData.documents.country_specific_documents_urls || {};

      // Delete + re-upload medical_license if new file chosen
      if (formData.documents.medical_license) {
        if (existingVerification?.id) {
          const { data: oldDocs } = await (supabase as any)
            .from("doctor_verification_documents")
            .select("file_path")
            .eq("doctor_verification_id", existingVerification.id)
            .eq("document_type", "medical_license");

          if (oldDocs?.length) {
            const filePaths = oldDocs.map((doc: any) => String(doc.file_path || "").replace(/^\/+/, ""));
            const { error: storageError } = await supabase.storage.from("verification-documents").remove(filePaths);
            if (storageError) console.error("Error deleting old medical license files:", storageError);

            const { error: dbError } = await (supabase as any)
              .from("doctor_verification_documents")
              .delete()
              .eq("doctor_verification_id", existingVerification.id)
              .eq("document_type", "medical_license");
            if (dbError) console.error("Error deleting old medical license DB rows:", dbError);
          }
        }

        const ext = extFromFile(formData.documents.medical_license, "pdf");
        const result = await uploadFile(
          formData.documents.medical_license,
          "verification-documents",
          `doctors/${doctorId}/medical-license-${Date.now()}.${ext}`
        );
        if (result) medical_license_url = result.path;
      }

      // Delete + re-upload professional_id if new file chosen
      if (formData.documents.professional_id) {
        if (existingVerification?.id) {
          const { data: oldDocs } = await (supabase as any)
            .from("doctor_verification_documents")
            .select("file_path")
            .eq("doctor_verification_id", existingVerification.id)
            .eq("document_type", "professional_id");

          if (oldDocs?.length) {
            const filePaths = oldDocs.map((doc: any) => String(doc.file_path || "").replace(/^\/+/, ""));
            const { error: storageError } = await supabase.storage.from("verification-documents").remove(filePaths);
            if (storageError) console.error("Error deleting old professional ID files:", storageError);

            const { error: dbError } = await (supabase as any)
              .from("doctor_verification_documents")
              .delete()
              .eq("doctor_verification_id", existingVerification.id)
              .eq("document_type", "professional_id");
            if (dbError) console.error("Error deleting old professional ID DB rows:", dbError);
          }
        }

        const ext = extFromFile(formData.documents.professional_id, "pdf");
        const result = await uploadFile(
          formData.documents.professional_id,
          "verification-documents",
          `doctors/${doctorId}/professional-id-${Date.now()}.${ext}`
        );
        if (result) professional_id_url = result.path;
      }

      // Upload specialty documents (optional)
      if (formData.documents.specialty_documents?.length) {
        specialty_documents_urls = [];
        for (let i = 0; i < formData.documents.specialty_documents.length; i++) {
          const doc = formData.documents.specialty_documents[i];
          const ext = extFromFile(doc, "pdf");
          const result = await uploadFile(
            doc,
            "verification-documents",
            `doctors/${doctorId}/specialty-doc-${i + 1}-${Date.now()}.${ext}`
          );
          if (result) specialty_documents_urls.push(result.path);
        }
      }

      // Upload additional certificates (optional)
      const additional_certificates_urls: string[] = [];
      if (formData.documents.additional_certificates?.length) {
        for (let i = 0; i < formData.documents.additional_certificates.length; i++) {
          const cert = formData.documents.additional_certificates[i];
          const ext = extFromFile(cert, "pdf");
          const result = await uploadFile(
            cert,
            "verification-documents",
            `doctors/${doctorId}/additional-cert-${i + 1}-${Date.now()}.${ext}`
          );
          if (result) additional_certificates_urls.push(result.path);
        }
      }

      // Upload country-specific documents (optional / required based on UI)
      if (formData.documents.country_specific_documents) {
        country_specific_documents_urls = {};
        for (const [docKey, docFile] of Object.entries(formData.documents.country_specific_documents)) {
          const ext = extFromFile(docFile, "pdf");
          const result = await uploadFile(
            docFile,
            "verification-documents",
            `doctors/${doctorId}/${docKey}-${Date.now()}.${ext}`
          );
          if (result) country_specific_documents_urls[docKey] = result.path;
        }
      }

      // Update doctor profile basics
      const { error: doctorError } = await supabase
        .from("doctors")
        .update({
          specialty: formData.specialty,
          bio: formData.bio,
          license_number: formData.license_number,
          consultation_fee: formData.consultation_fee,
          verified: false,
        })
        .eq("id", doctorId);

      if (doctorError) throw doctorError;

      // IMPORTANT FIX:
      // Do NOT use 'resubmitted' (dashboard expects pending) and do NOT use 'declined' anymore.
      // Always reset to 'pending' on submission/resubmission.
      const newStatus = "pending";

      const payload = {
        status: newStatus,
        submitted_at: new Date().toISOString(),
        specialty: formData.specialty,
        license_number: formData.license_number,
        years_of_experience: formData.years_experience,
        rejection_reason: null, // clear any old reason on new submission
        verification_data: {
          languages: formData.languages || [],
          consultation_types: formData.consultation_types || [],
          additional_info: {
            ...(formData.additional_data || {}),
            submission_ip: ipAddress,
            submission_country: submissionCountry,
          },
        },
        updated_at: new Date().toISOString(),
      };

      let verificationId: string;

      if (existingVerification?.id) {
        const { data: updated, error: verificationError } = await (supabase as any)
          .from("doctor_verification")
          .update(payload)
          .eq("id", existingVerification.id)
          .select("id")
          .single();

        if (verificationError) {
          console.error("Verification update error:", verificationError);
          throw verificationError;
        }

        verificationId = updated.id;
      } else {
        const { data: created, error: verificationError } = await (supabase as any)
          .from("doctor_verification")
          .insert({
            doctor_id: doctorId,
            ...payload,
          })
          .select("id")
          .single();

        if (verificationError) {
          console.error("Verification insert error:", verificationError);
          throw verificationError;
        }

        verificationId = created.id;
      }

      // Insert document records (no hardcoded/mock)
      // Note: license/professional ID entries were deleted above if re-uploaded.
      const documents: any[] = [];

      if (medical_license_url) {
        documents.push({
          doctor_verification_id: verificationId,
          document_type: "medical_license",
          file_path: medical_license_url,
          file_name: `medical-license-${Date.now()}`,
        });
      }
      if (professional_id_url) {
        documents.push({
          doctor_verification_id: verificationId,
          document_type: "professional_id",
          file_path: professional_id_url,
          file_name: `professional-id-${Date.now()}`,
        });
      }

      specialty_documents_urls.forEach((url, index) => {
        documents.push({
          doctor_verification_id: verificationId,
          document_type: "specialty_document",
          file_path: url,
          file_name: `specialty-document-${index + 1}-${Date.now()}`,
        });
      });

      additional_certificates_urls.forEach((url, index) => {
        documents.push({
          doctor_verification_id: verificationId,
          document_type: "additional_certificate",
          file_path: url,
          file_name: `additional-certificate-${index + 1}-${Date.now()}`,
        });
      });

      Object.entries(country_specific_documents_urls).forEach(([docKey, url]) => {
        documents.push({
          doctor_verification_id: verificationId,
          document_type: docKey,
          file_path: url,
          file_name: `${docKey}-${Date.now()}`,
        });
      });

      if (documents.length) {
        const { error: docsError } = await (supabase as any).from("doctor_verification_documents").insert(documents);
        if (docsError) console.error("Documents insert error:", docsError);
      }

      toast.success("Verification request submitted successfully!");
      return { success: true, verificationId };
    } catch (error: any) {
      console.error("Error submitting verification:", error);
      toast.error(error?.message || "Failed to submit verification request");
      return { success: false, error: error?.message || "Unknown error" };
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    submitForVerification,
    isSubmitting,
  };
};
