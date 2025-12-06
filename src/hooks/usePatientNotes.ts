import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface PatientNote {
  id: string;
  content: string;
  created_at: string;
  updated_at?: string;
  is_pinned: boolean;
  is_private: boolean;
  tags: string[];
  author_name?: string;
}

export const usePatientNotes = (patientId: string) => {
  const { user } = useAuth();
  const [notes, setNotes] = useState<PatientNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [doctorName, setDoctorName] = useState<string | null>(null);

  useEffect(() => {
    const fetchDoctorInfo = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("doctors")
        .select("id, user_id, profiles!fk_doctors_user_id(full_name)")
        .eq("user_id", user.id)
        .single();
      if (data) {
        setDoctorId(data.id);
        setDoctorName((data.profiles as any)?.full_name || null);
      }
    };
    fetchDoctorInfo();
  }, [user]);

  const fetchNotes = useCallback(async () => {
    if (!user || !patientId) return;

    try {
      const { data, error } = await supabase
        .from("patient_notes")
        .select("*")
        .eq("patient_id", patientId)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;

      const formatted: PatientNote[] = (data || []).map((note: any) => ({
        id: note.id,
        content: note.content,
        created_at: note.created_at,
        updated_at: note.updated_at,
        is_pinned: note.is_pinned,
        is_private: note.is_private,
        tags: note.tags || [],
        author_name: note.author_name,
      }));

      setNotes(formatted);
    } catch (err) {
      console.error("Error fetching notes:", err);
      toast.error("Failed to load notes");
    } finally {
      setLoading(false);
    }
  }, [user, patientId]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const addNote = async (note: {
    content: string;
    is_private: boolean;
    tags: string[];
  }) => {
    if (!user || !doctorId) {
      toast.error("Unable to add note");
      return;
    }

    try {
      const { error } = await supabase.from("patient_notes").insert({
        patient_id: patientId,
        doctor_id: doctorId,
        content: note.content,
        is_private: note.is_private,
        tags: note.tags,
        author_name: doctorName,
      });

      if (error) throw error;

      toast.success("Note added successfully");
      fetchNotes();
    } catch (err) {
      console.error("Error adding note:", err);
      toast.error("Failed to add note");
    }
  };

  const updateNote = async (id: string, updates: Partial<PatientNote>) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("patient_notes")
        .update({
          content: updates.content,
          is_private: updates.is_private,
          tags: updates.tags,
          is_pinned: updates.is_pinned,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;

      toast.success("Note updated successfully");
      fetchNotes();
    } catch (err) {
      console.error("Error updating note:", err);
      toast.error("Failed to update note");
    }
  };

  const deleteNote = async (id: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("patient_notes")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Note deleted successfully");
      fetchNotes();
    } catch (err) {
      console.error("Error deleting note:", err);
      toast.error("Failed to delete note");
    }
  };

  const togglePin = async (id: string) => {
    const note = notes.find((n) => n.id === id);
    if (!note) return;

    await updateNote(id, { is_pinned: !note.is_pinned });
  };

  return {
    notes,
    loading,
    refetch: fetchNotes,
    addNote,
    updateNote,
    deleteNote,
    togglePin,
  };
};
