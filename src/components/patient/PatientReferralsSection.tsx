import { useAuth } from '@/contexts/AuthContext';
import { ReferralsSection } from '@/components/referrals';

export function PatientReferralsSection() {
  const { user, profile } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <ReferralsSection
      role="patient"
      patientId={user.id}
      patientName={profile?.full_name || 'Patient'}
      showCreateButton={false}
      title="My Referrals"
      description="Referrals shared with you. Open a referral to book an appointment or choose a provider."
    />
  );
}
