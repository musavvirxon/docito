import { useState } from "react";
import { FacilityReferralCreator, ReferralsSection } from "@/components/referrals";
import { ImagingManualOrderDialog } from "./ImagingManualOrderDialog";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ImagingReferralsSection({ centerId }: { centerId: string }) {
  const [manualOpen, setManualOpen] = useState(false);

  if (!centerId) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Referrals</h2>
          <p className="text-sm text-muted-foreground">
            Manage incoming referrals and create outgoing referrals
          </p>
        </div>

        <div className="flex gap-2">
          <Button onClick={() => setManualOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New walk-in order
          </Button>
          <FacilityReferralCreator entityType="imaging_center" entityId={centerId} />
        </div>
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

      <ImagingManualOrderDialog
        open={manualOpen}
        onOpenChange={setManualOpen}
        imagingCenterId={centerId}
        onCreated={() => {
          // simplest: hard reload section queries
          // ReferralsSection already fetches; no callback needed.
        }}
      />
    </div>
  );
}
