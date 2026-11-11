import { supabase } from "@/integrations/supabase/client";

const NAME_TABLE: Record<string, string> = {
  practice: "practices",
  clinic: "practices",
  pharmacy: "pharmacies",
};

/** Emails the accept link for a staff_invitations row. Throws if sending fails. */
export async function sendStaffInviteEmail(invitationId: string) {
  const sb = supabase as any;
  const { data: inv, error } = await sb
    .from("staff_invitations")
    .select("email, invite_token, entity_type, entity_id")
    .eq("id", invitationId)
    .single();
  if (error || !inv?.email || !inv?.invite_token) throw error || new Error("Invitation not found");
  const table = NAME_TABLE[inv.entity_type];
  let name = "Docito";
  if (table) {
    const { data } = await sb.from(table).select("name").eq("id", inv.entity_id).maybeSingle();
    if (data?.name) name = data.name;
  }
  const { error: mailError } = await supabase.functions.invoke("send-invitation-email", {
    body: {
      to: inv.email,
      clinicName: name,
      inviteUrl: `${window.location.origin}/accept-invite?token=${inv.invite_token}`,
    },
  });
  if (mailError) throw mailError;
}
