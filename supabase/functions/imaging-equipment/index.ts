// File: supabase/functions/imaging-equipment/index.ts

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type EquipmentStatus = "active" | "maintenance" | "offline" | "retired";

type EquipmentRow = {
  id: string;
  imaging_center_id: string;
  name: string;
  modality: string;
  manufacturer: string | null;
  model: string | null;
  serial_number: string | null;
  installation_date: string | null;
  last_maintenance: string | null;
  next_maintenance: string | null;
  status: EquipmentStatus;
  scan_types: string[];
  capacity_per_day: number;
  created_at: string;
  updated_at: string;
};

type Payload =
  | { centerId: string; action: "list" }
  | {
      centerId: string;
      action: "upsert";
      equipment: Partial<Omit<EquipmentRow, "created_at" | "updated_at">> & { id?: string };
    }
  | { centerId: string; action: "delete"; id: string };

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function isSchemaCacheMissing(err: unknown) {
  const msg = String((err as any)?.message ?? err ?? "");
  const m = msg.toLowerCase();
  return msg.includes("Could not find the table") || m.includes("schema cache") || (m.includes("relation") && m.includes("does not exist"));
}

async function ensureCenterAccess(supabase: any, userId: string, centerId: string) {
  const { data: adminRow, error: adminErr } = await supabase
    .from("imaging_centers")
    .select("id")
    .eq("id", centerId)
    .eq("admin_id", userId)
    .maybeSingle();

  if (adminErr) return false;
  if ((adminRow as any)?.id) return true;

  const { data: staffRow, error: staffErr } = await supabase
    .from("imaging_staff")
    .select("id, can_manage_equipment")
    .eq("imaging_center_id", centerId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (staffErr) return false;
  return Boolean((staffRow as any)?.id);
}

async function ensureEquipmentWriteAccess(supabase: any, userId: string, centerId: string) {
  const { data: adminRow, error: adminErr } = await supabase
    .from("imaging_centers")
    .select("id")
    .eq("id", centerId)
    .eq("admin_id", userId)
    .maybeSingle();

  if (adminErr) return false;
  if ((adminRow as any)?.id) return true;

  const { data: staffRow, error: staffErr } = await supabase
    .from("imaging_staff")
    .select("id, can_manage_equipment")
    .eq("imaging_center_id", centerId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (staffErr) return false;
  return Boolean((staffRow as any)?.id) && Boolean((staffRow as any)?.can_manage_equipment);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method Not Allowed" }, 405);

  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !supabaseAnonKey) return json({ error: "Missing SUPABASE_URL or SUPABASE_ANON_KEY" }, 500);

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) return json({ error: "Unauthorized" }, 401);

  let body: Payload;
  try {
    body = (await req.json()) as Payload;
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const centerId = (body as any)?.centerId?.trim?.() ?? "";
  const action = (body as any)?.action;

  if (!centerId) return json({ error: "Missing centerId" }, 400);
  if (action !== "list" && action !== "upsert" && action !== "delete") return json({ error: "Invalid action" }, 400);

  const canRead = await ensureCenterAccess(supabase, user.id, centerId);
  if (!canRead) return json({ error: "Forbidden" }, 403);

  if (action === "list") {
    const { data, error } = await supabase
      .from("imaging_equipment")
      .select(
        "id, imaging_center_id, name, modality, manufacturer, model, serial_number, installation_date, last_maintenance, next_maintenance, status, scan_types, capacity_per_day, created_at, updated_at",
      )
      .eq("imaging_center_id", centerId)
      .order("created_at", { ascending: false });

    if (error) {
      if (isSchemaCacheMissing(error)) {
        return json(
          {
            ok: true,
            available: false,
            equipment: [],
            warning: "schema_cache_missing:imaging_equipment",
          },
          200,
        );
      }
      return json({ error: error.message }, 500);
    }

    return json({ ok: true, available: true, equipment: (data ?? []) as EquipmentRow[] }, 200);
  }

  if (action === "delete") {
    const canWrite = await ensureEquipmentWriteAccess(supabase, user.id, centerId);
    if (!canWrite) return json({ error: "Forbidden" }, 403);

    const id = (body as any)?.id?.trim?.() ?? "";
    if (!id) return json({ error: "Missing id" }, 400);

    const { error } = await supabase.from("imaging_equipment").delete().eq("id", id).eq("imaging_center_id", centerId);

    if (error) {
      if (isSchemaCacheMissing(error)) {
        return json(
          {
            ok: false,
            available: false,
            warning: "schema_cache_missing:imaging_equipment",
          },
          200,
        );
      }
      return json({ error: error.message }, 500);
    }

    return json({ ok: true, available: true }, 200);
  }

  // upsert
  const canWrite = await ensureEquipmentWriteAccess(supabase, user.id, centerId);
  if (!canWrite) return json({ error: "Forbidden" }, 403);

  const incoming = (body as any)?.equipment ?? {};
  const payload: any = {
    id: incoming.id ?? undefined,
    imaging_center_id: centerId,
    name: String(incoming.name ?? "").trim(),
    modality: String(incoming.modality ?? "").trim(),
    manufacturer: incoming.manufacturer ?? null,
    model: incoming.model ?? null,
    serial_number: incoming.serial_number ?? null,
    installation_date: incoming.installation_date ?? null,
    last_maintenance: incoming.last_maintenance ?? null,
    next_maintenance: incoming.next_maintenance ?? null,
    status: (incoming.status ?? "active") as EquipmentStatus,
    scan_types: Array.isArray(incoming.scan_types) ? incoming.scan_types.map(String) : [],
    capacity_per_day: Number.isFinite(Number(incoming.capacity_per_day)) ? Number(incoming.capacity_per_day) : 0,
    updated_at: new Date().toISOString(),
  };

  if (!payload.name) return json({ error: "Equipment name is required" }, 400);
  if (!payload.modality) return json({ error: "Modality is required" }, 400);

  const { data, error } = await supabase
    .from("imaging_equipment")
    .upsert(payload, { onConflict: "id" })
    .select(
      "id, imaging_center_id, name, modality, manufacturer, model, serial_number, installation_date, last_maintenance, next_maintenance, status, scan_types, capacity_per_day, created_at, updated_at",
    )
    .maybeSingle();

  if (error) {
    if (isSchemaCacheMissing(error)) {
      return json(
        {
          ok: false,
          available: false,
          warning: "schema_cache_missing:imaging_equipment",
        },
        200,
      );
    }
    return json({ error: error.message }, 500);
  }

  return json({ ok: true, available: true, equipment: data as EquipmentRow }, 200);
});
