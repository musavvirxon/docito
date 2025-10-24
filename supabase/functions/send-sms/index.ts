import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER");

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Missing authorization header');
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with user's JWT for authentication
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      console.error('Authentication failed:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user is a doctor or admin
    const { data: roles, error: rolesError } = await supabaseAuth
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['doctor', 'admin', 'super_admin']);

    if (rolesError || !roles || roles.length === 0) {
      console.error('Authorization failed: user is not a doctor/admin', { userId: user.id });
      return new Response(
        JSON.stringify({ error: 'Unauthorized: doctor or admin role required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Authorized user triggering SMS send:', { userId: user.id, role: roles[0].role });

    // Use service role key for database operations
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get pending SMS from queue
    const { data: pendingSMS, error: fetchError } = await supabase
      .from("sms_notifications")
      .select("*")
      .eq("status", "queued")
      .limit(10);

    if (fetchError) {
      console.error("Error fetching SMS queue:", fetchError);
      throw fetchError;
    }

    const results = [];

    for (const sms of pendingSMS || []) {
      try {
        console.log(`Sending SMS to ${sms.phone}...`);

        // Send via Twilio
        const response = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
          {
            method: "POST",
            headers: {
              Authorization:
                "Basic " +
                btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`),
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              To: sms.phone,
              From: TWILIO_PHONE_NUMBER!,
              Body: sms.message,
            }),
          }
        );

        if (response.ok) {
          const twilioData = await response.json();
          console.log("SMS sent successfully:", twilioData.sid);

          // Update status to sent
          await supabase
            .from("sms_notifications")
            .update({
              status: "sent",
              sent_at: new Date().toISOString(),
            })
            .eq("id", sms.id);

          results.push({
            id: sms.id,
            status: "sent",
            twilioSid: twilioData.sid,
          });
        } else {
          const errorText = await response.text();
          console.error("Twilio API error:", errorText);

          await supabase
            .from("sms_notifications")
            .update({
              status: "failed",
              error_message: errorText,
            })
            .eq("id", sms.id);

          results.push({
            id: sms.id,
            status: "failed",
            error: errorText,
          });
        }
      } catch (error: any) {
        console.error("SMS send error:", error);

        await supabase
          .from("sms_notifications")
          .update({
            status: "failed",
            error_message: error.message,
          })
          .eq("id", sms.id);

        results.push({
          id: sms.id,
          status: "failed",
          error: error.message,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Edge function error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
