// supabase/functions/submit-lead/index.ts
// Deno + supabase-js v2 — CORS-safe lead capture edge function

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface LeadPayload {
  email: string;
  role: "doctor" | "clinic";
  quizAnswers?: Record<string, number>;
  score?: number;
  scoreLevel?: "low" | "medium" | "high";
}

serve(async (req: Request) => {
  // Handle CORS pre-flight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Only accept POST
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body: LeadPayload = await req.json();
    const { email, role, quizAnswers, score, scoreLevel } = body;

    // Validate required fields
    if (!email || !role) {
      return new Response(
        JSON.stringify({ error: "email and role are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email address" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate role
    if (!["doctor", "clinic"].includes(role)) {
      return new Response(JSON.stringify({ error: "Invalid role" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create service-role Supabase client (bypasses RLS for writes)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const { error } = await supabase.from("landing_leads").insert({
      email: email.toLowerCase().trim(),
      role,
      quiz_answers: quizAnswers ?? null,
      score: score ?? null,
      score_level: scoreLevel ?? null,
    });

    if (error) {
      console.error("DB insert error:", error);
      throw error;
    }

    return new Response(
      JSON.stringify({ success: true, message: "Lead captured" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    console.error("submit-lead error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
