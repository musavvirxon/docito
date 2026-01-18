// Path: src/hooks/useLabCenter.ts

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";
import { useActiveEntityScope } from "@/hooks/useActiveEntityScope";

type LabCenter = Database["public"]["Tables"]["lab_centers"]["Row"];
type LabStaff = Database["public"]["Tables"]["lab_staff"]["Row"];
type TestCatalog = Database["public"]["Tables"]["test_catalog"]["Row"];

export interface LabCenterInput {
  name: string;
  type: string;
  license_number?: string;
  address: string;
  city: string;
  state?: string;
  country: string;
  postal_code?: string;
  phone: string;
  email?: string;
  website?: string;
  services_offered?: string[];
  accreditations?: string[];
  accepts_insurance?: boolean;
  average_turnaround_hours?: number;
}

export interface LabStaffInput {
  lab_center_id: string;
  user_id: string;
  staff_role: string;
  license_number?: string;
  specializations?: string[];
  can_process_samples?: boolean;
  can_upload_results?: boolean;
  can_verify_results?: boolean;
  can_manage_equipment?: boolean;
}

export interface TestCatalogInput {
  lab_center_id?: string;
  test_code: string;
  name: string;
  category: string;
  subcategory?: string;
  description?: string;
  sample_type?: string;
  preparation_instructions?: string;
  turnaround_hours?: number;
  price?: number;
  requires_fasting?: boolean;
  visibility?: "public" | "private";
  is_global?: boolean;
  is_active?: boolean;
  parameters?: any[];
}

export function useLabCenter() {
  const { user } = useAuth();
  const { activeEntityId: activeLabId, setActiveEntityId: setActiveLabId } = useActiveEntityScope("lab");

  const [labCenters, setLabCenters] = useState<LabCenter[]>([]);
  const [myLabCenter, setMyLabCenter] = useState<LabCenter | null>(null);
  const [labStaff, setLabStaff] = useState<LabStaff[]>([]);
  const [testCatalog, setTestCatalog] = useState<TestCatalog[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLabCenters = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("lab_centers").select("*").order("name");
      if (error) throw error;
      setLabCenters((data || []) as LabCenter[]);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMyLabCenter = useCallback(async () => {
    if (!user) return;
    if (!activeLabId) {
      setMyLabCenter(null);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.from("lab_centers").select("*").eq("id", activeLabId).single();
      if (error) throw error;
      setMyLabCenter(data as LabCenter);
    } catch (error: any) {
      console.error("Error fetching lab center:", error);
      setMyLabCenter(null);
    } finally {
      setLoading(false);
    }
  }, [activeLabId, user]);

  useEffect(() => {
    fetchMyLabCenter();
  }, [fetchMyLabCenter]);

  const createLabCenter = useCallback(
    async (input: LabCenterInput) => {
      if (!user) return null;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("lab_centers")
          .insert({
            ...input,
            admin_id: user.id,
          })
          .select()
          .single();

        if (error) throw error;

        // Assign lab_admin role to user
        const { error: roleError } = await supabase
          .from("user_roles")
          .upsert(
            {
              user_id: user.id,
              role: "lab_admin",
            },
            {
              onConflict: "user_id,role",
            }
          );

        if (roleError) {
          console.error("Error assigning lab_admin role:", roleError);
        }

        setMyLabCenter(data as LabCenter);
        setActiveLabId((data as any)?.id ?? null);
        toast({ title: "Success", description: "Lab center registered successfully" });
        return data;
      } catch (error: any) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        return null;
      } finally {
        setLoading(false);
      }
    },
    [setActiveLabId, user]
  );

  const updateLabCenter = useCallback(async (id: string, updates: Partial<LabCenterInput>) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("lab_centers").update(updates).eq("id", id).select().single();
      if (error) throw error;
      setMyLabCenter(data as LabCenter);
      toast({ title: "Success", description: "Lab center updated successfully" });
      return data;
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Lab Staff Management
  const fetchLabStaff = useCallback(async (labCenterId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("lab_staff")
        .select("*")
        .eq("lab_center_id", labCenterId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setLabStaff((data || []) as LabStaff[]);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, []);

  const addLabStaff = useCallback(
    async (input: LabStaffInput) => {
      setLoading(true);
      try {
        const { data, error } = await supabase.from("lab_staff").insert(input).select().single();
        if (error) throw error;
        setLabStaff((prev) => [data as LabStaff, ...prev]);
        toast({ title: "Success", description: "Staff member added successfully" });
        return data;
      } catch (error: any) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const updateLabStaff = useCallback(async (id: string, updates: Partial<LabStaffInput>) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("lab_staff").update(updates).eq("id", id).select().single();
      if (error) throw error;
      setLabStaff((prev) => prev.map((s) => ((s as any).id === id ? (data as LabStaff) : s)));
      toast({ title: "Success", description: "Staff member updated successfully" });
      return data;
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Test Catalog Management
  const fetchTestCatalog = useCallback(async (labCenterId?: string) => {
    setLoading(true);
    try {
      let q = supabase.from("test_catalog").select("*").order("name");
      if (labCenterId) q = q.eq("lab_center_id", labCenterId);
      const { data, error } = await q;
      if (error) throw error;
      setTestCatalog((data || []) as TestCatalog[]);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, []);

  const upsertTestCatalog = useCallback(async (input: TestCatalogInput & { id?: string }) => {
    setLoading(true);
    try {
      const payload: any = { ...input };
      const { data, error } = await supabase.from("test_catalog").upsert(payload).select().single();
      if (error) throw error;

      setTestCatalog((prev) => {
        const next = [...prev];
        const idx = next.findIndex((t) => (t as any).id === (data as any).id);
        if (idx >= 0) next[idx] = data as TestCatalog;
        else next.unshift(data as TestCatalog);
        return next;
      });

      toast({ title: "Success", description: "Test catalog saved" });
      return data;
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    labCenters,
    myLabCenter,
    labStaff,
    testCatalog,
    loading,
    fetchLabCenters,
    fetchMyLabCenter,
    createLabCenter,
    updateLabCenter,
    fetchLabStaff,
    addLabStaff,
    updateLabStaff,
    fetchTestCatalog,
    upsertTestCatalog,
  };
}
