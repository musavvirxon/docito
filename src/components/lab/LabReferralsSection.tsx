import { ReferralsSection } from '@/components/referrals';

interface LabReferralsSectionProps {
  labCenterId: string;
}

export function LabReferralsSection({ labCenterId }: LabReferralsSectionProps) {
  if (!labCenterId) {
    return null;
  }

  return (
    <ReferralsSection
      role="receiver"
      entityType="lab"
      entityId={labCenterId}
      showCreateButton={false}
      title="Lab Referrals"
      description="Manage incoming referrals for lab tests"
    />
  );
}
