import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface AppointmentReview {
  id: string;
  appointment_id: string;
  doctor_id: string;
  patient_id: string;
  rating: number;
  comment: string | null;
  doctor_reply: string | null;
  doctor_replied_at: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  patient_profile?: { full_name: string | null; avatar_url: string | null } | null;
}

/**
 * Fetch + manage reviews for a doctor (by doctors.id) and/or a specific appointment.
 * - Patients can create / update / delete their own review for a completed appointment.
 * - Doctors can read all reviews for them and post a reply.
 */
export function useAppointmentReviews(params: {
  doctorId?: string | null;
  appointmentId?: string | null;
  publicOnly?: boolean;
}) {
  const { doctorId, appointmentId, publicOnly } = params;
  const { user } = useAuth();
  const [reviews, setReviews] = useState<AppointmentReview[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchReviews = useCallback(async () => {
    if (!doctorId && !appointmentId) {
      setReviews([]);
      return;
    }
    setLoading(true);
    try {
      let q = supabase
        .from("appointment_reviews")
        .select("*")
        .order("created_at", { ascending: false });

      if (doctorId) q = q.eq("doctor_id", doctorId);
      if (appointmentId) q = q.eq("appointment_id", appointmentId);
      if (publicOnly) q = q.eq("is_public", true);

      const { data, error } = await q;
      if (error) throw error;

      // Hydrate patient profile names separately (RLS-safe)
      const ids = Array.from(new Set((data || []).map((r) => r.patient_id)));
      let profileMap: Record<string, { full_name: string | null; avatar_url: string | null }> = {};
      if (ids.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url")
          .in("user_id", ids);
        (profiles || []).forEach((p: any) => {
          profileMap[p.user_id] = { full_name: p.full_name, avatar_url: p.avatar_url };
        });
      }

      setReviews(
        (data || []).map((r: any) => ({
          ...r,
          patient_profile: profileMap[r.patient_id] || null,
        })),
      );
    } catch (err: any) {
      console.error("Load reviews error:", err);
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, [doctorId, appointmentId, publicOnly]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const submitReview = useCallback(
    async (input: {
      appointmentId: string;
      doctorId: string;
      rating: number;
      comment?: string | null;
      isPublic?: boolean;
      existingId?: string | null;
    }) => {
      if (!user?.id) {
        toast.error("Please sign in to leave a review");
        return { error: "not_signed_in" as const };
      }
      const payload = {
        appointment_id: input.appointmentId,
        doctor_id: input.doctorId,
        patient_id: user.id,
        rating: input.rating,
        comment: input.comment?.trim() || null,
        is_public: input.isPublic ?? true,
      };

      const { error } = input.existingId
        ? await supabase.from("appointment_reviews").update(payload).eq("id", input.existingId)
        : await supabase.from("appointment_reviews").insert(payload);

      if (error) {
        console.error("Submit review error:", error);
        toast.error(error.message || "Failed to submit review");
        return { error };
      }
      toast.success(input.existingId ? "Review updated" : "Review submitted");
      await fetchReviews();
      return { error: null };
    },
    [user?.id, fetchReviews],
  );

  const deleteReview = useCallback(
    async (id: string) => {
      const { error } = await supabase.from("appointment_reviews").delete().eq("id", id);
      if (error) {
        toast.error(error.message || "Failed to delete review");
        return { error };
      }
      toast.success("Review deleted");
      await fetchReviews();
      return { error: null };
    },
    [fetchReviews],
  );

  const replyToReview = useCallback(
    async (id: string, reply: string) => {
      const { error } = await supabase
        .from("appointment_reviews")
        .update({ doctor_reply: reply.trim() || null })
        .eq("id", id);
      if (error) {
        toast.error(error.message || "Failed to post reply");
        return { error };
      }
      toast.success("Reply posted");
      await fetchReviews();
      return { error: null };
    },
    [fetchReviews],
  );

  return { reviews, loading, refresh: fetchReviews, submitReview, deleteReview, replyToReview };
}
