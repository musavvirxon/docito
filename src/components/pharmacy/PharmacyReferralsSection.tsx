import { FacilityReferralCreator, ReferralsSection } from "@/components/referrals";
import { useTranslation } from 'react-i18next';

interface PharmacyReferralsSectionProps {
  pharmacyId: string;
}

export function PharmacyReferralsSection({ pharmacyId }: PharmacyReferralsSectionProps) {
  const { t } = useTranslation("pharmacyAdminDashboard");
  if (!pharmacyId) {
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
        <FacilityReferralCreator entityType="pharmacy" entityId={pharmacyId} />
      </div>

      <ReferralsSection
        role="receiver"
        entityType="pharmacy"
        entityId={pharmacyId}
        showCreateButton={false}
        title="Incoming Referrals"
        description="Referrals received by your pharmacy"
      />

      <ReferralsSection
        role="referrer"
        entityType="pharmacy"
        entityId={pharmacyId}
        showCreateButton={false}
        title="Outgoing Referrals"
        description="Referrals sent by your pharmacy"
      />
    </div>
  );
}
