// Path: src/hooks/usePharmacy.ts

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Json } from "@/integrations/supabase/types";
import { useActiveEntityScope } from "@/hooks/useActiveEntityScope";

export interface Pharmacy {
  id: string;
  name: string;
  license_number?: string;
  tax_id?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  admin_id?: string;
  logo_url?: string;
  website?: string;
  operating_hours?: Json;
  accepts_insurance?: boolean;
  delivery_available?: boolean;
  verified?: boolean;
  verification_status?: string;
  average_rating?: number;
  num_reviews?: number;
  created_at?: string;
}

export interface PharmacyStaff {
  id: string;
  pharmacy_id: string;
  user_id: string;
  staff_role: string;
  license_number?: string;
  can_dispense: boolean;
  can_manage_inventory: boolean;
  can_process_prescriptions: boolean;
  status: string;
}

export const usePharmacy = (pharmacyId?: string) => {
  const { user } = useAuth();
  const { scopes: pharmacyScopes, activeEntityId, setActiveEntityId } = useActiveEntityScope("pharmacy");

  const effectivePharmacyId = useMemo(() => {
    return pharmacyId ?? activeEntityId ?? null;
  }, [activeEntityId, pharmacyId]);

  const [pharmacy, setPharmacy] = useState<Pharmacy | null>(null);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [staff, setStaff] = useState<PharmacyStaff[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [staffPermissions, setStaffPermissions] = useState<PharmacyStaff | null>(null);

  const fetchAllowedPharmacies = useCallback(async () => {
    if (!user) return;

    try {
      // Prefer access-scope because it is the single source of truth for staff/admin membership
      const ids = (pharmacyScopes || []).map((s) => s.entity_id).filter(Boolean);
      if (!ids.length) {
        setPharmacies([]);
        return;
      }

      const { data, error } = await supabase.from("pharmacies").select("*").in("id", ids).order("name");
      if (error) throw error;
      setPharmacies((data || []) as Pharmacy[]);
    } catch (error) {
      console.error("Error fetching pharmacies:", error);
      setPharmacies([]);
    }
  }, [pharmacyScopes, user]);

  const fetchPharmacy = useCallback(
    async (id: string) => {
      try {
        const { data, error } = await supabase.from("pharmacies").select("*").eq("id", id).single();
        if (error) throw error;

        setPharmacy(data as Pharmacy);
        setIsAdmin((data as any)?.admin_id === user?.id);

        // Check staff permissions (if staff row exists)
        const { data: staffData } = await supabase
          .from("pharmacy_staff")
          .select("*")
          .eq("pharmacy_id", id)
          .eq("user_id", user?.id)
          .maybeSingle();

        if (staffData) setStaffPermissions(staffData as PharmacyStaff);
        else setStaffPermissions(null);
      } catch (error) {
        console.error("Error fetching pharmacy:", error);
        setPharmacy(null);
        setIsAdmin(false);
        setStaffPermissions(null);
      }
    },
    [user?.id]
  );

  const fetchStaff = useCallback(async (id: string) => {
    try {
      const { data, error } = await supabase.from("pharmacy_staff").select("*").eq("pharmacy_id", id);
      if (error) throw error;
      setStaff((data || []) as PharmacyStaff[]);
    } catch (error) {
      console.error("Error fetching staff:", error);
      setStaff([]);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchAllowedPharmacies().finally(() => setLoading(false));
  }, [fetchAllowedPharmacies, user]);

  useEffect(() => {
    if (!user) return;
    if (!effectivePharmacyId) {
      setPharmacy(null);
      setStaff([]);
      setIsAdmin(false);
      setStaffPermissions(null);
      return;
    }

    fetchPharmacy(effectivePharmacyId);
    fetchStaff(effectivePharmacyId);
  }, [effectivePharmacyId, fetchPharmacy, fetchStaff, user]);

  const createPharmacy = async (pharmacyData: Partial<Pharmacy>) => {
    try {
      const { data, error } = await supabase
        .from("pharmacies")
        .insert({
          name: pharmacyData.name!,
          license_number: pharmacyData.license_number,
          tax_id: pharmacyData.tax_id,
          email: pharmacyData.email,
          phone: pharmacyData.phone,
          address: pharmacyData.address,
          city: pharmacyData.city,
          state: pharmacyData.state,
          postal_code: pharmacyData.postal_code,
          country: pharmacyData.country,
          admin_id: user?.id,
          logo_url: pharmacyData.logo_url,
          website: pharmacyData.website,
          operating_hours: pharmacyData.operating_hours,
          accepts_insurance: pharmacyData.accepts_insurance,
          delivery_available: pharmacyData.delivery_available,
          verification_status: "pending",
        })
        .select()
        .single();

      if (error) throw error;

      // Assign pharmacy_admin role to user
      const { error: roleError } = await supabase
        .from("user_roles")
        .upsert({ user_id: user?.id, role: "pharmacy_admin" }, { onConflict: "user_id,role" });

      if (roleError) console.error("Error assigning pharmacy_admin role:", roleError);

      toast.success("Pharmacy registered successfully");
      setPharmacies((prev) => [...prev, data as Pharmacy]);
      setActiveEntityId((data as any)?.id ?? null);
      return data;
    } catch (error: any) {
      toast.error(error.message || "Failed to register pharmacy");
      throw error;
    }
  };

  const updatePharmacy = async (id: string, updates: Partial<Pharmacy>) => {
    try {
      const { data, error } = await supabase.from("pharmacies").update(updates).eq("id", id).select().single();
      if (error) throw error;
      toast.success("Pharmacy updated successfully");
      setPharmacy(data as Pharmacy);
      return data;
    } catch (error: any) {
      toast.error(error.message || "Failed to update pharmacy");
      throw error;
    }
  };

  const addStaff = async (staffData: Partial<PharmacyStaff>) => {
    try {
      const { data, error } = await supabase
        .from("pharmacy_staff")
        .insert({
          pharmacy_id: staffData.pharmacy_id!,
          user_id: staffData.user_id!,
          staff_role: staffData.staff_role || "technician",
          license_number: staffData.license_number,
          can_dispense: staffData.can_dispense ?? true,
          can_manage_inventory: staffData.can_manage_inventory ?? false,
          can_process_prescriptions: staffData.can_process_prescriptions ?? true,
          status: staffData.status || "active",
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Staff member added successfully");
      setStaff((prev) => [...prev, data as PharmacyStaff]);
      return data;
    } catch (error: any) {
      toast.error(error.message || "Failed to add staff member");
      throw error;
    }
  };

  const updateStaff = async (id: string, updates: Partial<PharmacyStaff>) => {
    try {
      const { data, error } = await supabase.from("pharmacy_staff").update(updates).eq("id", id).select().single();
      if (error) throw error;

      toast.success("Staff member updated successfully");
      setStaff((prev) => prev.map((s) => (s.id === id ? (data as PharmacyStaff) : s)));
      return data;
    } catch (error: any) {
      toast.error(error.message || "Failed to update staff member");
      throw error;
    }
  };

  const removeStaff = async (id: string) => {
    try {
      const { error } = await supabase.from("pharmacy_staff").delete().eq("id", id);
      if (error) throw error;

      toast.success("Staff member removed successfully");
      setStaff((prev) => prev.filter((s) => s.id !== id));
    } catch (error: any) {
      toast.error(error.message || "Failed to remove staff member");
      throw error;
    }
  };

  return {
    pharmacy,
    pharmacies,
    staff,
    loading,
    isAdmin,
    staffPermissions,
    activePharmacyId: effectivePharmacyId,
    setActivePharmacyId: setActiveEntityId,
    fetchPharmacy,
    fetchStaff,
    createPharmacy,
    updatePharmacy,
    addStaff,
    updateStaff,
    removeStaff,
  };
};
