import { ReferralsSection } from '@/components/referrals';

interface ImagingReferralsSectionProps {
  centerId: string;
}

export function ImagingReferralsSection({ centerId }: ImagingReferralsSectionProps) {
  if (!centerId) {
    return null;
  }

  return (
    <ReferralsSection
      role="receiver"
      entityType="imaging_center"
      entityId={centerId}
      showCreateButton={false}
      title="Imaging Referrals"
      description="Manage incoming referrals for imaging procedures"
    />
  );
}
