// File: src/hooks/useMedicationReminders.ts

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface MedicationReminder {
  id: string;
  medication_id: string;
  patient_id: string;
  reminder_time: string;
  status: "pending" | "taken" | "missed" | "skipped";
  created_at: string;
  medications?: {
    name: string;
    dosage: string;
    route: string;
    instructions?: string;
    doctor_id?: string | null;
    treatment_plan_id?: string | null;
  };
}

export const useMedicationReminders = () => {
  const [reminders, setReminders] = useState<MedicationReminder[]>([]);
  const [todaysReminders, setTodaysReminders] = useState<MedicationReminder[]>([]);
  const [upcomingReminders, setUpcomingReminders] = useState<MedicationReminder[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    loadReminders();

    const channel = supabase
      .channel("medication-reminders")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "medication_reminders",
          filter: `patient_id=eq.${user.id}`,
        },
        () => {
          loadReminders();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const loadReminders = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("medication_reminders")
        .select(
          `
          *,
          medications (
            name,
            dosage,
            route,
            instructions,
            doctor_id,
            treatment_plan_id
          )
        `,
        )
        .eq("patient_id", user.id)
        .gte("reminder_time", new Date().toISOString().split("T")[0])
        .order("reminder_time", { ascending: true })
        .limit(50);

      if (error) throw error;

      const reminderData = (data || []) as MedicationReminder[];
      setReminders(reminderData);

      const today = new Date().toISOString().split("T")[0];
      const todaysData = reminderData.filter((r) => r.reminder_time.startsWith(today));
      setTodaysReminders(todaysData);

      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);

      const upcomingData = reminderData.filter((r) => {
        const reminderDate = new Date(r.reminder_time);
        return reminderDate > new Date(today + "T23:59:59") && reminderDate <= nextWeek;
      });
      setUpcomingReminders(upcomingData);
    } catch (error: any) {
      console.error("Error loading medication reminders:", error);
      toast.error("Failed to load medication reminders");
      setReminders([]);
      setTodaysReminders([]);
      setUpcomingReminders([]);
    } finally {
      setLoading(false);
    }
  };

  const markReminderAsTaken = async (reminderId: string) => {
    try {
      const { error } = await supabase
        .from("medication_reminders")
        .update({
          status: "taken",
          taken_at: new Date().toISOString(),
        })
        .eq("id", reminderId);

      if (error) throw error;

      toast.success("Medication marked as taken");
      loadReminders();
    } catch (error: any) {
      console.error("Error updating reminder:", error);
      toast.error("Failed to update reminder");
    }
  };

  const markReminderAsSkipped = async (reminderId: string) => {
    try {
      const { error } = await supabase.from("medication_reminders").update({ status: "skipped" }).eq("id", reminderId);

      if (error) throw error;

      toast.success("Medication marked as skipped");
      loadReminders();
    } catch (error: any) {
      console.error("Error updating reminder:", error);
      toast.error("Failed to update reminder");
    }
  };

  const snoozeReminder = async (reminderId: string, minutes: number = 15) => {
    try {
      const { data: reminder, error: getReminderError } = await supabase
        .from("medication_reminders")
        .select("reminder_time")
        .eq("id", reminderId)
        .single();

      if (getReminderError) throw getReminderError;

      const currentTime = new Date((reminder as any).reminder_time);
      const newTime = new Date(currentTime.getTime() + minutes * 60000);

      const { error } = await supabase
        .from("medication_reminders")
        .update({
          reminder_time: newTime.toISOString(),
        })
        .eq("id", reminderId);

      if (error) throw error;

      toast.success(`Reminder snoozed for ${minutes} minutes`);
      loadReminders();
    } catch (error: any) {
      console.error("Error snoozing reminder:", error);
      toast.error("Failed to snooze reminder");
    }
  };

  const getPendingRemindersCount = () => {
    return todaysReminders.filter((r) => r.status === "pending").length;
  };

  const getOverdueRemindersCount = () => {
    const now = new Date();
    return todaysReminders.filter((r) => {
      const reminderTime = new Date(r.reminder_time);
      return r.status === "pending" && reminderTime < now;
    }).length;
  };

  return {
    reminders,
    todaysReminders,
    upcomingReminders,
    loading,
    markReminderAsTaken,
    markReminderAsSkipped,
    snoozeReminder,
    loadReminders,
    getPendingRemindersCount,
    getOverdueRemindersCount,
  };
};
