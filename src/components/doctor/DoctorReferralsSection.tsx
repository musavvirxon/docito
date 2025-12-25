import { ReferralsSection } from '@/components/referrals';
import { useDoctorData } from '@/contexts/DoctorDataContext';

export function DoctorReferralsSection() {
  const { doctorProfile } = useDoctorData();

  if (!doctorProfile) {
    return null;
  }

  return (
    <ReferralsSection
      role="referrer"
      entityType="doctor"
      entityId={doctorProfile.id}
      showCreateButton={true}
    />
  );
}
