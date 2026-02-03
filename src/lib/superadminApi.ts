// src/lib/superadminApi.ts
import { supabase } from "@/integrations/supabase/client";

export type DoctorVerificationStatus = "pending" | "verified" | "rejected";

export type DoctorVerification = {
  id: string;
  doctor_id: string;
  status?: DoctorVerificationStatus | string | null;
  verification_status?: DoctorVerificationStatus | string | null;
  rejection_reason?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  specialty?: string | null;
  license_number?: string | null;
  years_of_experience?: string | null;
  verification_data?: Record<string, unknown> | null;
};

export type DoctorVerificationDocument = {
  id: string;
  doctor_verification_id: string;
  document_type?: string | null;
  file_name?: string | null;
  file_path?: string | null;
  uploaded_at?: string | null;
};

export type AuditLog = {
  id: string | number;
  user_id: string | null;
  action_type: string | null;
  entity_type: string | null;
  entity_id: string | null;
  details: any;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string | null;
};

type SuperadminAction =
  | "list_doctor_verifications"
  | "get_doctor_verification"
  | "approve_doctor_verification"
  | "reject_doctor_verification"
  | "list_audit_logs";

type SuperadminInvokeBody = {
  action: SuperadminAction;
  [key: string]: unknown;
};

async function invokeSuperadmin<T>(body: SuperadminInvokeBody): Promise<T> {
  const { data, error } = await supabase.functions.invoke("superadmin", {
    body,
  });

  if (error) {
    const msg =
      (error as any)?.context?.message ||
      (error as any)?.message ||
      "Superadmin request failed";
    throw new Error(msg);
  }

  return data as T;
}

export async function listDoctorVerifications(params?: {
  status?: DoctorVerificationStatus;
  limit?: number;
  offset?: number;
}) {
  const status = params?.status ?? "pending";
  const limit = params?.limit ?? 25;
  const offset = params?.offset ?? 0;

  return invokeSuperadmin<{
    data: DoctorVerification[];
    meta: { status: string; limit: number; offset: number };
  }>({
    action: "list_doctor_verifications",
    status,
    limit,
    offset,
  });
}

export async function getDoctorVerification(id: string) {
  return invokeSuperadmin<{
    data: DoctorVerification;
    documents: DoctorVerificationDocument[];
  }>({
    action: "get_doctor_verification",
    id,
  });
}

export async function approveDoctorVerification(id: string) {
  return invokeSuperadmin<{ ok: boolean }>({
    action: "approve_doctor_verification",
    id,
  });
}

export async function rejectDoctorVerification(id: string, reason: string) {
  return invokeSuperadmin<{ ok: boolean }>({
    action: "reject_doctor_verification",
    id,
    reason,
  });
}

export async function listAuditLogs(params?: { limit?: number; offset?: number }) {
  const limit = params?.limit ?? 50;
  const offset = params?.offset ?? 0;

  return invokeSuperadmin<{
    data: AuditLog[];
    meta: { limit: number; offset: number };
  }>({
    action: "list_audit_logs",
    limit,
    offset,
  });
}
