// File: src/components/patient/PatientReferralsSection.tsx
import { useAuth } from '@/contexts/AuthContext';
import { ReferralsSection } from '@/components/referrals';

interface PatientReferralsSectionProps {
  initialReferralId?: string;
}

export function PatientReferralsSection({ initialReferralId }: PatientReferralsSectionProps) {
  const { user, profile } = useAuth();

  if (!user) {
    return null;
  }

  // For patients, we use a special view - they see referrals where they are the patient
  return (
    <ReferralsSection
      role="patient"
      entityType="doctor" // Use doctor as fallback entity type
      entityId={user.id}
      patientId={user.id}
      patientName={profile?.full_name}
      showCreateButton={false}
      initialReferralId={initialReferralId}
    />
  );
}
