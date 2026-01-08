import { FacilityReferralCreator, ReferralsSection } from "@/components/referrals";

interface ImagingReferralsSectionProps {
  centerId: string;
}

export function ImagingReferralsSection({ centerId }: ImagingReferralsSectionProps) {
  if (!centerId) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Referrals</h2>
          <p className="text-sm text-muted-foreground">
            Manage incoming referrals and create outgoing referrals
          </p>
        </div>
        <FacilityReferralCreator entityType="imaging_center" entityId={centerId} />
      </div>

      <ReferralsSection
        role="receiver"
        entityType="imaging_center"
        entityId={centerId}
        showCreateButton={false}
        title="Incoming Referrals"
        description="Referrals received by your imaging center"
      />

      <ReferralsSection
        role="referrer"
        entityType="imaging_center"
        entityId={centerId}
        showCreateButton={false}
        title="Outgoing Referrals"
        description="Referrals sent by your imaging center"
      />
    </div>
  );
}
