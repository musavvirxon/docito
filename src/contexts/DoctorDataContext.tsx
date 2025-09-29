import React, { createContext, useContext } from 'react';
import { useDoctorIntegration } from '@/hooks/useDoctorIntegration';

interface DoctorDataContextType {
  // Profile
  doctorProfile: any;
  updateProfile: (updates: any) => Promise<{ success?: boolean; error?: string }>;
  
  // Services
  services: any[];
  addService: (service: any) => Promise<{ success?: boolean; error?: string }>;
  updateService: (id: string, updates: any) => Promise<{ success?: boolean; error?: string }>;
  deleteService: (id: string) => Promise<{ success?: boolean; error?: string }>;
  
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
  
  // Legacy compatibility
  scheduleSettings: any;
  updateScheduleSettings: (settings: any) => Promise<{ success?: boolean; error?: string }>;
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

  const value = {
    ...doctorData,
    // Legacy compatibility
    refreshAll: doctorData.refreshAllData,
    scheduleSettings: null,
    updateScheduleSettings: async () => ({ success: true }),
  };

  return (
    <DoctorDataContext.Provider value={value}>
      {children}
    </DoctorDataContext.Provider>
  );
};