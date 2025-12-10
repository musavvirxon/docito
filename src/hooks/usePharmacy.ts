import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

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
  operating_hours?: Record<string, any>;
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
  const [pharmacy, setPharmacy] = useState<Pharmacy | null>(null);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [staff, setStaff] = useState<PharmacyStaff[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [staffPermissions, setStaffPermissions] = useState<PharmacyStaff | null>(null);

  useEffect(() => {
    if (user) {
      fetchUserPharmacies();
    }
  }, [user]);

  useEffect(() => {
    if (pharmacyId) {
      fetchPharmacy(pharmacyId);
      fetchStaff(pharmacyId);
    }
  }, [pharmacyId, user]);

  const fetchUserPharmacies = async () => {
    try {
      // Fetch pharmacies where user is admin
      const { data: adminPharmacies, error: adminError } = await supabase
        .from('pharmacies')
        .select('*')
        .eq('admin_id', user?.id);

      if (adminError) throw adminError;

      // Fetch pharmacies where user is staff
      const { data: staffRecords, error: staffError } = await supabase
        .from('pharmacy_staff')
        .select('pharmacy_id, pharmacies(*)')
        .eq('user_id', user?.id)
        .eq('status', 'active');

      if (staffError) throw staffError;

      const staffPharmacies = staffRecords?.map((s: any) => s.pharmacies).filter(Boolean) || [];
      const allPharmacies = [...(adminPharmacies || []), ...staffPharmacies];
      
      // Remove duplicates
      const uniquePharmacies = allPharmacies.filter((p, index, self) => 
        index === self.findIndex(t => t.id === p.id)
      );

      setPharmacies(uniquePharmacies);
    } catch (error) {
      console.error('Error fetching pharmacies:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPharmacy = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('pharmacies')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setPharmacy(data);
      setIsAdmin(data.admin_id === user?.id);

      // Check staff permissions
      const { data: staffData } = await supabase
        .from('pharmacy_staff')
        .select('*')
        .eq('pharmacy_id', id)
        .eq('user_id', user?.id)
        .single();

      if (staffData) {
        setStaffPermissions(staffData);
      }
    } catch (error) {
      console.error('Error fetching pharmacy:', error);
    }
  };

  const fetchStaff = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('pharmacy_staff')
        .select('*')
        .eq('pharmacy_id', id);

      if (error) throw error;
      setStaff(data || []);
    } catch (error) {
      console.error('Error fetching staff:', error);
    }
  };

  const createPharmacy = async (pharmacyData: Partial<Pharmacy>) => {
    try {
      const { data, error } = await supabase
        .from('pharmacies')
        .insert({
          ...pharmacyData,
          admin_id: user?.id,
          verification_status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;
      toast.success('Pharmacy registered successfully');
      setPharmacies(prev => [...prev, data]);
      return data;
    } catch (error: any) {
      toast.error(error.message || 'Failed to register pharmacy');
      throw error;
    }
  };

  const updatePharmacy = async (id: string, updates: Partial<Pharmacy>) => {
    try {
      const { data, error } = await supabase
        .from('pharmacies')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      toast.success('Pharmacy updated successfully');
      setPharmacy(data);
      return data;
    } catch (error: any) {
      toast.error(error.message || 'Failed to update pharmacy');
      throw error;
    }
  };

  const addStaff = async (staffData: Partial<PharmacyStaff>) => {
    try {
      const { data, error } = await supabase
        .from('pharmacy_staff')
        .insert(staffData)
        .select()
        .single();

      if (error) throw error;
      toast.success('Staff member added');
      setStaff(prev => [...prev, data]);
      return data;
    } catch (error: any) {
      toast.error(error.message || 'Failed to add staff');
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
    createPharmacy,
    updatePharmacy,
    addStaff,
    fetchPharmacy,
    fetchStaff,
    fetchUserPharmacies
  };
};
