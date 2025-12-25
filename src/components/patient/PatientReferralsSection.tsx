import { useAuth } from '@/contexts/AuthContext';
import { ReferralsSection } from '@/components/referrals';

export function PatientReferralsSection() {
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
    />
  );
}
