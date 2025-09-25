import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DoctorService {
  id: string;
  dentist_id: string;
  name: string;
  description?: string;
  category: 'general' | 'preventive' | 'restorative' | 'cosmetic' | 'orthodontic' | 'oral_surgery' | 'endodontic' | 'periodontic';
  default_cost?: number;
  duration_minutes: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useDoctorServices = () => {
  const { user } = useAuth();
  const [services, setServices] = useState<DoctorService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchServices = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // First get the doctor ID
      const { data: doctorData } = await supabase
        .from('doctors')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!doctorData) {
        setServices([]);
        return;
      }

      const { data, error } = await supabase
        .from('procedures')
        .select('*')
        .eq('dentist_id', doctorData.id)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setServices(data || []);
    } catch (err: any) {
      console.error('Error fetching services:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addService = async (serviceData: Omit<DoctorService, 'id' | 'dentist_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return { error: 'User not authenticated' };

    try {
      // Get doctor ID
      const { data: doctorData } = await supabase
        .from('doctors')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!doctorData) return { error: 'Doctor profile not found' };

      const { data, error } = await supabase
        .from('procedures')
        .insert({
          name: serviceData.name,
          description: serviceData.description,
          category: serviceData.category,
          default_cost: serviceData.default_cost,
          duration_minutes: serviceData.duration_minutes,
          is_active: serviceData.is_active,
          dentist_id: doctorData.id
        })
        .select()
        .single();

      if (error) throw error;

      await fetchServices();
      toast.success('Service added successfully');
      return { success: true, data };
    } catch (err: any) {
      console.error('Error adding service:', err);
      toast.error('Failed to add service');
      return { error: err.message };
    }
  };

  const updateService = async (serviceId: string, updates: Partial<DoctorService>) => {
    try {
      const { error } = await supabase
        .from('procedures')
        .update(updates)
        .eq('id', serviceId);

      if (error) throw error;

      await fetchServices();
      toast.success('Service updated successfully');
      return { success: true };
    } catch (err: any) {
      console.error('Error updating service:', err);
      toast.error('Failed to update service');
      return { error: err.message };
    }
  };

  const deleteService = async (serviceId: string) => {
    try {
      const { error } = await supabase
        .from('procedures')
        .update({ is_active: false })
        .eq('id', serviceId);

      if (error) throw error;

      await fetchServices();
      toast.success('Service deleted successfully');
      return { success: true };
    } catch (err: any) {
      console.error('Error deleting service:', err);
      toast.error('Failed to delete service');
      return { error: err.message };
    }
  };

  const toggleServiceStatus = async (serviceId: string, active: boolean) => {
    try {
      const { error } = await supabase
        .from('procedures')
        .update({ is_active: active })
        .eq('id', serviceId);

      if (error) throw error;

      await fetchServices();
      toast.success(`Service ${active ? 'activated' : 'deactivated'} successfully`);
      return { success: true };
    } catch (err: any) {
      console.error('Error updating service status:', err);
      toast.error('Failed to update service status');
      return { error: err.message };
    }
  };

  useEffect(() => {
    fetchServices();
  }, [user]);

  return {
    services,
    loading,
    error,
    addService,
    updateService,
    deleteService,
    toggleServiceStatus,
    refreshServices: fetchServices
  };
};