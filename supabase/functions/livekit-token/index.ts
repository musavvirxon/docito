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

type Role = 'doctor' | 'patient' | 'guest';

async function makeLivekitToken(
  apiKey: string,
  apiSecret: string,
  roomName: string,
  identity: string,
  name: string,
  role: Role,
): Promise<string> {
  const enc = new TextEncoder();

  const canPublishSources =
    role === 'doctor'
      ? ['camera', 'microphone', 'screen_share', 'screen_share_audio']
      : ['camera', 'microphone'];

  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: apiKey,
    sub: identity,
    name,
    iat: now,
    nbf: now,
    exp: now + 4 * 3600,
    metadata: JSON.stringify({ role }),
    video: {
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      canPublishSources,
      roomCreate: true,
      // maxParticipants is enforced on the room itself — also gate via
      // server-side participant check below.
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

/* ---------- LiveKit RoomService helpers (REST) ---------- */
async function livekitListParticipants(
  livekitUrl: string,
  apiKey: string,
  apiSecret: string,
  roomName: string,
): Promise<Array<{ identity: string; metadata?: string }>> {
  try {
    const httpBase = livekitUrl.replace(/^wss:\/\//, 'https://').replace(/^ws:\/\//, 'http://');
    // Sign a short-lived admin token with roomAdmin
    const enc = new TextEncoder();
    const header = { alg: "HS256", typ: "JWT" };
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: apiKey,
      sub: 'roomservice',
      iat: now,
      nbf: now,
      exp: now + 60,
      video: { roomAdmin: true, room: roomName },
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
    const adminToken = `${signingInput}.${b64url(sig)}`;

    const resp = await fetch(`${httpBase}/twirp/livekit.RoomService/ListParticipants`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ room: roomName }),
    });
    if (!resp.ok) return [];
    const json = await resp.json().catch(() => ({}));
    return Array.isArray(json.participants) ? json.participants : [];
  } catch (e) {
    console.warn('livekit list participants failed', e);
    return [];
  }
}

function getParticipantRole(p: { identity: string; metadata?: string }): Role {
  try {
    if (p.metadata) {
      const m = JSON.parse(p.metadata);
      if (m?.role === 'doctor' || m?.role === 'patient') return m.role;
    }
  } catch { /* fallthrough */ }
  const [r] = (p.identity || '').split('::');
  if (r === 'doctor' || r === 'patient') return r;
  return 'guest';
}

/* ---------- handler ---------- */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    let body: { appointmentId?: string; roomId?: string; guestToken?: string; displayName?: string } = {};
    try { body = await req.json(); } catch { /* allow empty */ }
    const { appointmentId, roomId, guestToken, displayName } = body;

    const apiKey = Deno.env.get("LIVEKIT_API_KEY");
    const apiSecret = Deno.env.get("LIVEKIT_API_SECRET");
    const livekitUrl = Deno.env.get("LIVEKIT_URL");
    if (!apiKey || !apiSecret || !livekitUrl) {
      return new Response(JSON.stringify({ error: "LiveKit not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- GUEST TOKEN FLOW (unregistered patient via shareable link) ---
    if (guestToken) {
      const adminClient = createClient(supabaseUrl, serviceRoleKey);
      const { data: vc } = await adminClient
        .from("video_consultations")
        .select("id, room_id, doctor_patient_id")
        .eq("guest_token", guestToken)
        .maybeSingle();
      if (!vc || !vc.room_id) {
        return new Response(JSON.stringify({ error: "Invalid invite link" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let guestName = displayName || "Guest";
      if (vc.doctor_patient_id) {
        const { data: dp } = await adminClient
          .from("doctor_patients").select("full_name").eq("id", vc.doctor_patient_id).maybeSingle();
        if (dp?.full_name) guestName = dp.full_name;
      }

      // Guests join as 'patient' role. Enforce room capacity + role uniqueness.
      const existing = await livekitListParticipants(livekitUrl, apiKey, apiSecret, vc.room_id);
      if (existing.length >= 2) {
        return new Response(JSON.stringify({ error: "Room is full" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (existing.some((p) => getParticipantRole(p) === 'patient')) {
        return new Response(JSON.stringify({ error: "A patient is already in this call" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const identity = `patient::guest-${vc.id}-${crypto.randomUUID().slice(0, 8)}`;
      const token = await makeLivekitToken(apiKey, apiSecret, vc.room_id, identity, guestName, 'patient');
      return new Response(
        JSON.stringify({ token, url: livekitUrl, roomId: vc.room_id }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // --- AUTHENTICATED FLOW ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    if (!appointmentId && !roomId) {
      return new Response(
        JSON.stringify({ error: "appointmentId or roomId required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let resolvedRoomId = roomId;
    let participantName = user.email || user.id;
    let role: Role = 'guest';

    if (appointmentId) {
      const adminClient = createClient(supabaseUrl, serviceRoleKey);

      const { data: appt, error: apptErr } = await adminClient
        .from("appointments")
        .select("id, doctor_id, patient_id, video_room_id, practice_id")
        .eq("id", appointmentId)
        .maybeSingle();

      if (apptErr || !appt) {
        return new Response(JSON.stringify({ error: "Appointment not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let isDoctor = appt.doctor_id === user.id;
      let isPatient = appt.patient_id === user.id;

      if (!isDoctor && appt.doctor_id) {
        const { data: doctorRow } = await adminClient
          .from("doctors").select("user_id").eq("id", appt.doctor_id).maybeSingle();
        if (doctorRow?.user_id === user.id) isDoctor = true;
      }
      if (!isPatient && !isDoctor && appt.patient_id) {
        const { data: patientRow } = await adminClient
          .from("profiles").select("user_id").eq("id", appt.patient_id).maybeSingle();
        if (patientRow?.user_id === user.id) isPatient = true;
      }

      // Appointment rooms are strictly doctor + patient. Clinic staff/guest
      // join paths are not allowed.
      if (!isDoctor && !isPatient) {
        return new Response(
          JSON.stringify({ error: "Only the doctor and patient may join this consultation" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      role = isDoctor ? 'doctor' : 'patient';
      resolvedRoomId = appt.video_room_id || `appointment-${appointmentId}`;

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .maybeSingle();
      participantName = profile?.full_name || user.email || user.id;
    } else if (roomId) {
      // Free-room flow (non-appointment) — treat caller as doctor.
      role = 'doctor';
    }

    // Enforce capacity + role uniqueness via LiveKit RoomService.
    const existing = await livekitListParticipants(livekitUrl, apiKey, apiSecret, resolvedRoomId!);
    const myIdentity = `${role}::${user.id}`;
    const others = existing.filter((p) => p.identity !== myIdentity);
    if (others.length >= 2) {
      return new Response(JSON.stringify({ error: "Room is full" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (others.some((p) => getParticipantRole(p) === role)) {
      const who = role === 'doctor' ? 'A doctor' : 'A patient';
      return new Response(JSON.stringify({ error: `${who} is already in this call` }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = await makeLivekitToken(
      apiKey, apiSecret, resolvedRoomId!, myIdentity, participantName, role,
    );

    return new Response(
      JSON.stringify({ token, url: livekitUrl, roomId: resolvedRoomId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("livekit-token error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
