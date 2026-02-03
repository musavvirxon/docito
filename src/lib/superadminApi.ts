// src/lib/superadminApi.ts
import { supabase } from "@/integrations/supabase/client";

export type SuperadminInvokeError = {
  message: string;
};

export type AuditLog = {
  id: number | string;
  user_id: string | null;
  action_type?: string | null;
  action?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
  details?: any;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at?: string | null;
};

type InvokeResult<T> = { data: T };

async function invokeSuperadmin<T>(body: Record<string, any>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("superadmin", { body });

  if (error) {
    const msg =
      (error as any)?.context?.message ||
      (error as any)?.message ||
      "Superadmin request failed";
    throw new Error(msg);
  }

  return data as T;
}

export async function listAuditLogs(args?: { limit?: number; offset?: number }): Promise<InvokeResult<AuditLog[]>> {
  const limit = Math.min(Math.max(Number(args?.limit ?? 100), 1), 500);
  const offset = Math.max(Number(args?.offset ?? 0), 0);

  const res = await invokeSuperadmin<{ data: AuditLog[] }>({
    action: "list_audit_logs",
    limit,
    offset,
  });

  return res;
}

export async function approveDoctorVerification(args: { id: string }): Promise<InvokeResult<{ id: string }>> {
  const res = await invokeSuperadmin<{ id: string }>({
    action: "approve_doctor_verification",
    id: args.id,
  });
  return { data: res };
}

export async function rejectDoctorVerification(args: { id: string; reason: string }): Promise<InvokeResult<{ id: string }>> {
  const res = await invokeSuperadmin<{ id: string }>({
    action: "reject_doctor_verification",
    id: args.id,
    reason: args.reason,
  });
  return { data: res };
}
