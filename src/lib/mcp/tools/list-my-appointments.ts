import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_my_appointments",
  title: "List my appointments",
  description:
    "List the signed-in user's own Docito appointments (as patient or doctor). RLS enforces access.",
  inputSchema: {
    limit: z
      .number()
      .int()
      .describe("Max rows to return. Defaults to 20; clamped to [1, 100].")
      .optional(),
    status: z
      .string()
      .describe("Optional appointment status filter (e.g. 'pending', 'confirmed', 'completed').")
      .optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, status }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const clamped = Math.min(Math.max(limit ?? 20, 1), 100);
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("appointments")
      .select(
        "id, appointment_date, start_time, end_time, status, appointment_type, doctor_id, patient_id, practice_id, notes"
      )
      .order("appointment_date", { ascending: false })
      .limit(clamped);
    if (status) query = query.eq("status", status);
    const { data, error } = await query;
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    const rows = data ?? [];
    return {
      content: [{ type: "text", text: JSON.stringify(rows) }],
      structuredContent: { count: rows.length, rows },
    };
  },
});
