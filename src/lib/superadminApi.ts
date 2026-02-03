// src/lib/superadminApi.ts
import { supabase } from "@/integrations/supabase/client";

export type SuperAdminAction =
  | "ping"
  | "whoami"
  | "list_users"
  | "set_user_roles"
  | "disable_user"
  | "enable_user"
  | "list_audit_logs"
  | "list_doctor_verifications"
  | "get_doctor_verification"
  | "approve_doctor_verification"
  | "reject_doctor_verification";

export type SuperAdminInvokeBody = Record<string, any> & { action: SuperAdminAction };

export type ListUsersParams = {
  query?: string | null;
  role?: string | null;
  limit?: number;
  offset?: number;
};

export type UserRow = {
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  created_at: string | null;
  updated_at: string | null;
  disabled?: boolean | null;
  disabled_at?: string | null;
  disabled_reason?: string | null;
  roles: string[];
};

export type ListUsersResponse = {
  data: UserRow[];
  meta: { limit: number; offset: number; query?: string | null; role?: string | null };
};

export type SetUserRolesParams = {
  user_id: string;
  mode: "replace" | "add" | "remove";
  roles: string[];
};

export type SetUserRolesResponse = {
  ok: boolean;
  user_id: string;
  roles: string[];
};

export type ToggleUserParams = {
  user_id: string;
  reason?: string | null;
};

export type ListAuditLogsParams = {
  limit?: number;
  offset?: number;
};

export type AuditLog = {
  id: string | number;
  user_id: string | null;
  action?: string | null;
  action_type?: string | null;
  entity_type: string | null;
  entity_id: string | null;
  details: any;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at: string;
};

export type ListAuditLogsResponse = {
  data: AuditLog[];
  meta: { limit: number; offset: number };
};

async function invokeSuperadmin<T = any>(body: SuperAdminInvokeBody): Promise<T> {
  const { data, error } = await supabase.functions.invoke("superadmin", { body });
  if (error) {
    const msg =
      (error as any)?.context?.message ||
      (error as any)?.message ||
      "Request failed";
    throw new Error(msg);
  }
  return data as T;
}

export async function superadminPing() {
  return invokeSuperadmin<{ ok: boolean; now: string }>({ action: "ping" });
}

export async function superadminWhoami() {
  return invokeSuperadmin<{ ok: boolean; user_id: string; ip_address: string | null; user_agent: string | null }>({
    action: "whoami",
  });
}

export async function listUsers(params: ListUsersParams = {}): Promise<ListUsersResponse> {
  const { limit = 25, offset = 0, query = null, role = null } = params;
  return invokeSuperadmin<ListUsersResponse>({
    action: "list_users",
    limit,
    offset,
    query,
    role,
  });
}

export async function setUserRoles(params: SetUserRolesParams): Promise<SetUserRolesResponse> {
  return invokeSuperadmin<SetUserRolesResponse>({
    action: "set_user_roles",
    user_id: params.user_id,
    mode: params.mode,
    roles: params.roles,
  });
}

export async function disableUser(params: ToggleUserParams) {
  return invokeSuperadmin<{ ok: boolean; user_id: string; disabled: boolean }>({
    action: "disable_user",
    user_id: params.user_id,
    reason: params.reason ?? null,
  });
}

export async function enableUser(params: ToggleUserParams) {
  return invokeSuperadmin<{ ok: boolean; user_id: string; disabled: boolean }>({
    action: "enable_user",
    user_id: params.user_id,
    reason: params.reason ?? null,
  });
}

export async function listAuditLogs(params: ListAuditLogsParams = {}): Promise<ListAuditLogsResponse> {
  const { limit = 100, offset = 0 } = params;
  return invokeSuperadmin<ListAuditLogsResponse>({
    action: "list_audit_logs",
    limit,
    offset,
  });
}
