import { ReferralsSection, FacilityReferralCreator } from '@/components/referrals';
import { useTranslation } from 'react-i18next';

interface LabReferralsSectionProps {
  labCenterId: string;
}

export function LabReferralsSection({ labCenterId }: LabReferralsSectionProps) {
  const { t } = useTranslation("labAdminDashboard");
  if (!labCenterId) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{t("dashboard.referrals.title")}</h2>
          <p className="text-sm text-muted-foreground">
            Manage incoming referrals and create outgoing referrals
          </p>
        </div>
        <FacilityReferralCreator entityType="lab" entityId={labCenterId} />
      </div>

      <ReferralsSection
        role="receiver"
        entityType="lab"
        entityId={labCenterId}
        showCreateButton={false}
        title={t("dashboard.referrals.incoming.title")}
        description={t("dashboard.referrals.incoming.subtitle")}
      />

      <ReferralsSection
        role="referrer"
        entityType="lab"
        entityId={labCenterId}
        showCreateButton={false}
        title={t("dashboard.referrals.outgoing.title")}
        description={t("dashboard.referrals.outgoing.subtitle")}
      />
    </div>
  );
}
