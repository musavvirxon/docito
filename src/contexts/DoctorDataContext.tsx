// src/contexts/DoctorDataContext.tsx
import React, { createContext, useContext } from 'react';
import { useDoctorIntegration } from '@/hooks/useDoctorIntegration';
import { useScheduleSettings } from '@/hooks/useScheduleSettings';

interface DoctorDataContextType {
  // Profile
  doctorProfile: any;
  updateProfile: (updates: any) => Promise<{ success?: boolean; error?: string }>;
  
  // Services
  services: any[];
  addService: (service: any) => Promise<{ success?: boolean; error?: string }>;
  updateService: (id: string, updates: any) => Promise<{ success?: boolean; error?: string }>;
  deleteService: (id: string) => Promise<{ success?: boolean; error?: string }>;

  // Diagnoses (Diagnosis Library)
  diagnoses: any[];
  diagnosisLoading: boolean;
  addDiagnosis: (diagnosis: any) => Promise<{ success?: boolean; error?: string }>;
  updateDiagnosis: (id: string, updates: any) => Promise<{ success?: boolean; error?: string }>;
  deleteDiagnosis: (id: string) => Promise<{ success?: boolean; error?: string }>;
  
  // Appointments
  upcomingAppointments: any[];
  todaysAppointments: any[];
  recentAppointments: any[];
  
  // Statistics
  stats: {
    totalPatients: number;
    totalAppointments: number;
    totalRevenue: number;
    averageRating: number;
    numReviews: number;
    profileCompletion: number;
  };
  
  // Loading states
  loading: boolean;
  refreshAll: () => Promise<void>;
  
  // Schedule settings
  scheduleSettings: any;
  updateScheduleSettings: (settings: any) => Promise<{ success?: boolean; error?: string }>;
  scheduleLoading: boolean;
  refreshSchedule: () => Promise<void>;
}

const DoctorDataContext = createContext<DoctorDataContextType | undefined>(undefined);

export const useDoctorData = () => {
  const context = useContext(DoctorDataContext);
  if (context === undefined) {
    throw new Error('useDoctorData must be used within a DoctorDataProvider');
  }
  return context;
};

export const DoctorDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const doctorData = useDoctorIntegration();
  const scheduleData = useScheduleSettings();

  const value = {
    ...doctorData,
    // Legacy compatibility
    refreshAll: doctorData.refreshAllData,
    // Schedule settings integration
    scheduleSettings: scheduleData.scheduleSettings,
    updateScheduleSettings: scheduleData.updateScheduleSettings,
    scheduleLoading: scheduleData.loading,
    refreshSchedule: scheduleData.refetch,
  };

  return (
    <DoctorDataContext.Provider value={value}>
      {children}
    </DoctorDataContext.Provider>
  );
};
