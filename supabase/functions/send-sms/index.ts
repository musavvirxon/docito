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
