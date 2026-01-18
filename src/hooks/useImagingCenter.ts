// Path: src/hooks/useImagingCenter.ts

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";
import { useActiveEntityScope } from "@/hooks/useActiveEntityScope";

type ImagingCenter = Database["public"]["Tables"]["imaging_centers"]["Row"];
type ImagingStaff = Database["public"]["Tables"]["imaging_staff"]["Row"];

export interface ImagingCenterInput {
  name: string;
  license_number?: string;
  address?: string;
  city?: string;
  country?: string;
  phone?: string;
  email?: string;
  website?: string;
  modalities?: string[];
  accreditations?: string[];
  accepts_insurance?: boolean;
  operating_hours?: Record<string, any>;
}

export function useImagingCenter() {
  const { user } = useAuth();
  const { activeEntityId: activeCenterId, setActiveEntityId: setActiveCenterId } = useActiveEntityScope("imaging");

  const [imagingCenters, setImagingCenters] = useState<ImagingCenter[]>([]);
  const [myImagingCenter, setMyImagingCenter] = useState<ImagingCenter | null>(null);
  const [imagingStaff, setImagingStaff] = useState<ImagingStaff[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchImagingCenters = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("imaging_centers").select("*").order("name");
      if (error) throw error;
      setImagingCenters((data || []) as ImagingCenter[]);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMyImagingCenter = useCallback(async () => {
    if (!user) return;
    if (!activeCenterId) {
      setMyImagingCenter(null);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.from("imaging_centers").select("*").eq("id", activeCenterId).single();
      if (error) throw error;
      setMyImagingCenter(data as ImagingCenter);
    } catch (error: any) {
      console.error("Error fetching imaging center:", error);
      setMyImagingCenter(null);
    } finally {
      setLoading(false);
    }
  }, [activeCenterId, user]);

  useEffect(() => {
    fetchMyImagingCenter();
  }, [fetchMyImagingCenter]);

  const createImagingCenter = useCallback(
    async (input: ImagingCenterInput) => {
      if (!user) return null;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("imaging_centers")
          .insert({
            ...input,
            admin_id: user.id,
            status: "pending",
          })
          .select()
          .single();

        if (error) throw error;

        // Assign imaging_admin role to the user
        const { error: roleError } = await supabase
          .from("user_roles")
          .upsert({ user_id: user.id, role: "imaging_admin" }, { onConflict: "user_id,role" });

        if (roleError) {
          console.error("Error assigning role:", roleError);
        }

        setMyImagingCenter(data as ImagingCenter);
        setActiveCenterId((data as any)?.id ?? null);
        toast({ title: "Success", description: "Imaging center registered successfully" });
        return data;
      } catch (error: any) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        return null;
      } finally {
        setLoading(false);
      }
    },
    [setActiveCenterId, user]
  );

  const updateImagingCenter = useCallback(async (id: string, updates: Partial<ImagingCenterInput>) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("imaging_centers").update(updates).eq("id", id).select().single();
      if (error) throw error;
      setMyImagingCenter(data as ImagingCenter);
      toast({ title: "Success", description: "Imaging center updated successfully" });
      return data;
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchImagingStaff = useCallback(async (centerId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("imaging_staff")
        .select("*")
        .eq("imaging_center_id", centerId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setImagingStaff((data || []) as ImagingStaff[]);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    imagingCenters,
    myImagingCenter,
    imagingStaff,
    loading,
    fetchImagingCenters,
    fetchMyImagingCenter,
    createImagingCenter,
    updateImagingCenter,
    fetchImagingStaff,
  };
}
