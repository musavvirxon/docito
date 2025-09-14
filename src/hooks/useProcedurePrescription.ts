import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRealTime } from '@/contexts/RealTimeContext';
import { toast } from 'sonner';

interface PrescribeProcedureData {
  appointmentId: string;
  procedureId: string;
  procedureNotes?: string;
  estimatedCost?: number;
  patientId: string;
  procedureName: string;
  procedureDescription?: string;
  consentTemplate?: string;
}

export const useProcedurePrescription = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { sendNotification } = useRealTime();

  const prescribeProcedure = async (data: PrescribeProcedureData) => {
    if (!user) {
      toast.error('You must be logged in to prescribe procedures');
      return { error: 'Not authenticated' };
    }

    setIsLoading(true);

    try {
      // Get client IP address (for audit trail)
      const response = await fetch('https://api.ipify.org?format=json');
      const ipData = await response.json();
      const clientIp = ipData.ip;

      // Create appointment procedure record
      const { data: appointmentProcedure, error: prescriptionError } = await supabase
        .from('appointment_procedures')
        .insert({
          appointment_id: data.appointmentId,
          procedure_id: data.procedureId,
          prescribed_by: user.id,
          procedure_notes: data.procedureNotes,
          estimated_cost: data.estimatedCost,
          patient_consent_status: 'pending',
          status: 'prescribed',
          consent_ip_address: clientIp,
        })
        .select()
        .single();

      if (prescriptionError) throw prescriptionError;

      // Send real-time notification to patient
      await sendNotification({
        recipient_user_id: data.patientId,
        notification_type: 'procedure_prescribed',
        title: 'New Procedure Prescribed',
        message: `Your doctor has prescribed: ${data.procedureName}`,
        data: {
          appointmentId: data.appointmentId,
          procedureId: data.procedureId,
          appointmentProcedureId: appointmentProcedure.id,
          procedureName: data.procedureName,
          procedureDescription: data.procedureDescription,
          estimatedCost: data.estimatedCost,
          consentRequired: !!data.consentTemplate,
          consentTemplate: data.consentTemplate,
        },
      });

      toast.success(`Successfully prescribed ${data.procedureName}`);
      
      return { 
        success: true, 
        appointmentProcedure 
      };
    } catch (error: any) {
      console.error('Error prescribing procedure:', error);
      toast.error('Failed to prescribe procedure');
      return { error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  const updateConsentStatus = async (
    appointmentProcedureId: string, 
    status: 'accepted' | 'declined',
    signature?: string
  ) => {
    if (!user) {
      toast.error('You must be logged in');
      return { error: 'Not authenticated' };
    }

    setIsLoading(true);

    try {
      // Get client IP address
      const response = await fetch('https://api.ipify.org?format=json');
      const ipData = await response.json();
      const clientIp = ipData.ip;

      const updateData: any = {
        patient_consent_status: status,
        consent_signed_at: new Date().toISOString(),
        consent_ip_address: clientIp,
      };

      const { error } = await supabase
        .from('appointment_procedures')
        .update(updateData)
        .eq('id', appointmentProcedureId);

      if (error) throw error;

      // If accepted, also create a consent form record
      if (status === 'accepted' && signature) {
        const { error: consentError } = await supabase
          .from('consent_forms')
          .insert({
            title: 'Procedure Consent',
            content: 'Patient has consented to the prescribed procedure',
            status: 'signed',
            patient_signature: signature,
            signed_at: new Date().toISOString(),
            ip_address: clientIp,
          });

        if (consentError) {
          console.error('Error creating consent form:', consentError);
        }
      }

      toast.success(
        status === 'accepted' 
          ? 'Procedure consent accepted' 
          : 'Procedure consent declined'
      );

      return { success: true };
    } catch (error: any) {
      console.error('Error updating consent status:', error);
      toast.error('Failed to update consent status');
      return { error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    prescribeProcedure,
    updateConsentStatus,
    isLoading,
  };
};