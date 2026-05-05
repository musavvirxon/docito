import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/* ---------- lightweight JWT helper (HMAC-SHA256, no deps) ---------- */
function b64url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function makeLivekitToken(
  apiKey: string,
  apiSecret: string,
  roomName: string,
  identity: string,
  name: string,
): Promise<string> {
  const enc = new TextEncoder();

  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: apiKey,
    sub: identity,
    name,
    iat: now,
    nbf: now,
    exp: now + 3600, // 1 hour
    video: {
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    },
  };

  const signingInput =
    b64url(enc.encode(JSON.stringify(header)).buffer) +
    "." +
    b64url(enc.encode(JSON.stringify(payload)).buffer);

  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(apiSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(signingInput));
  return `${signingInput}.${b64url(sig)}`;
}

/* ---------- handler ---------- */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Authenticate caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse body
    const { appointmentId, roomId } = await req.json();
    if (!appointmentId && !roomId) {
      return new Response(
        JSON.stringify({ error: "appointmentId or roomId required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // If appointmentId provided, verify user is doctor or patient
    let resolvedRoomId = roomId;
    let participantName = user.email || user.id;

    if (appointmentId) {
      // Use service role to bypass RLS for the lookup; we authorize manually below.
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const adminClient = createClient(supabaseUrl, serviceRoleKey);

      const { data: appt, error: apptErr } = await adminClient
        .from("appointments")
        .select("id, doctor_id, patient_id, video_room_id, practice_id")
        .eq("id", appointmentId)
        .maybeSingle();

      if (apptErr || !appt) {
        return new Response(
          JSON.stringify({ error: "Appointment not found" }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // appt.doctor_id references doctors.id and appt.patient_id may reference
      // a patient row id, not auth user id. Resolve user-id ownership.
      let isDoctor = appt.doctor_id === user.id;
      let isPatient = appt.patient_id === user.id;

      if (!isDoctor && appt.doctor_id) {
        const { data: doctorRow } = await adminClient
          .from("doctors")
          .select("user_id")
          .eq("id", appt.doctor_id)
          .maybeSingle();
        if (doctorRow?.user_id === user.id) isDoctor = true;
      }

      if (!isPatient && !isDoctor && appt.patient_id) {
        const { data: patientRow } = await adminClient
          .from("profiles")
          .select("user_id")
          .eq("id", appt.patient_id)
          .maybeSingle();
        if (patientRow?.user_id === user.id) isPatient = true;
      }

      // Allow practice staff assigned to this appointment's practice to join.
      let isClinicMember = false;
      if (!isDoctor && !isPatient && appt.practice_id) {
        const { data: staffRow } = await adminClient
          .from("clinic_staff")
          .select("id")
          .eq("practice_id", appt.practice_id)
          .eq("user_id", user.id)
          .eq("status", "active")
          .maybeSingle();
        isClinicMember = !!staffRow;
      }

      if (!isDoctor && !isPatient && !isClinicMember) {
        return new Response(
          JSON.stringify({ error: "Not a participant of this appointment" }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      resolvedRoomId = appt.video_room_id || `appointment-${appointmentId}`;

      // Get display name
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .maybeSingle();

      participantName = profile?.full_name || user.email || user.id;
    }

    // Generate LiveKit token
    const apiKey = Deno.env.get("LIVEKIT_API_KEY");
    const apiSecret = Deno.env.get("LIVEKIT_API_SECRET");
    const livekitUrl = Deno.env.get("LIVEKIT_URL");

    if (!apiKey || !apiSecret || !livekitUrl) {
      return new Response(
        JSON.stringify({ error: "LiveKit not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const token = await makeLivekitToken(
      apiKey,
      apiSecret,
      resolvedRoomId,
      user.id,
      participantName,
    );

    return new Response(
      JSON.stringify({ token, url: livekitUrl, roomId: resolvedRoomId }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("livekit-token error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
