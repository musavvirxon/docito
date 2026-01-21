import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type NormalizedStatus =
  | "pending"
  | "under_review"
  | "verified"
  | "declined"
  | "resubmitted";

function normalizeStatus(status?: string | null): NormalizedStatus {
  const s = String(status || "pending").toLowerCase();
  if (s === "approved") return "verified";
  if (s === "rejected") return "declined";
  if (s === "denied") return "declined";
  if (s === "submitted") return "pending";
  if (s === "in_review") return "under_review";
  if (s === "review") return "under_review";
  if (s === "resubmit") return "resubmitted";
  if (s === "resubmission") return "resubmitted";
  if (s === "declined") return "declined";
  if (s === "verified") return "verified";
  if (s === "under_review") return "under_review";
  if (s === "resubmitted") return "resubmitted";
  return "pending";
}

export interface VerificationStatusDocument {
  document_type: string;
  file_path: string;
  file_name: string;
}

export interface VerificationStatus {
  id: string;
  status: NormalizedStatus;
  submitted_at: string;
  reviewed_at?: string | null;
  rejection_reason?: string | null;

  specialty: string;
  license_number?: string | null;
  years_of_experience?: string | null;

  // enriched from doctors table (not always present in doctor_verification row)
  bio?: string | null;
  doctor_verified?: boolean | null;

  verification_data?: {
    languages?: string[];
    consultation_types?: string[];
    additional_info?: any;
  } | null;

  documents?: VerificationStatusDocument[];
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
      // Get doctor ID first (+ enrichable fields)
      const { data: doctorData, error: doctorError } = await supabase
        .from("doctors")
        .select("id, specialty, bio, license_number, verified")
        .eq("user_id", user.id)
        .maybeSingle();

      if (doctorError) throw doctorError;

      if (!doctorData) {
        setVerificationStatus(null);
        return;
      }

      // Fetch verification row
      const { data: verification, error: verificationError } = await supabase
        .from("doctor_verification")
        .select("*")
        .eq("doctor_id", doctorData.id)
        .maybeSingle();

      if (verificationError && verificationError.code !== "PGRST116") {
        throw verificationError;
      }

      if (!verification) {
        setVerificationStatus(null);
        return;
      }

      // Fetch associated documents
      const { data: documents, error: docsError } = await supabase
        .from("doctor_verification_documents")
        .select("document_type, file_path, file_name")
        .eq("doctor_verification_id", verification.id)
        .order("uploaded_at", { ascending: false });

      if (docsError) throw docsError;

      setVerificationStatus({
        ...(verification as any),
        status: normalizeStatus((verification as any).status),
        specialty: (verification as any).specialty ?? doctorData.specialty ?? "General Practice",
        license_number: (verification as any).license_number ?? doctorData.license_number ?? null,
        years_of_experience: (verification as any).years_of_experience ?? null,
        rejection_reason: (verification as any).rejection_reason ?? null,
        reviewed_at: (verification as any).reviewed_at ?? null,
        submitted_at: (verification as any).submitted_at,
        verification_data: ((verification as any).verification_data as any) ?? null,
        documents: (documents as any) || [],
        bio: doctorData.bio ?? null,
        doctor_verified: doctorData.verified ?? null,
      });
    } catch (err: any) {
      console.error("Error fetching verification status:", err);
      setError(err?.message || "Failed to fetch verification status");
      setVerificationStatus(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVerificationStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return {
    verificationStatus,
    loading,
    error,
    refetch: fetchVerificationStatus,
  };
};
