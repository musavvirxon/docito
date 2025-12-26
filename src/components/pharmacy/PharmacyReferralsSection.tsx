import { ReferralsSection } from '@/components/referrals';

interface PharmacyReferralsSectionProps {
  pharmacyId: string;
}

export function PharmacyReferralsSection({ pharmacyId }: PharmacyReferralsSectionProps) {
  if (!pharmacyId) {
    return null;
  }

  return (
    <ReferralsSection
      role="receiver"
      entityType="pharmacy"
      entityId={pharmacyId}
      showCreateButton={false}
      title="Pharmacy Referrals"
      description="Manage incoming prescription referrals"
    />
  );
}
