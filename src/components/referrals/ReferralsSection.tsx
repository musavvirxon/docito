// File: src/components/referrals/ReferralsSection.tsx

import { useEffect, useRef, useState } from 'react';
import { Plus, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ReferralList,
  CreateReferralDialog,
  ReferralSlotPicker,
  PublishSlotsDialog,
} from '@/components/referrals';
import {
  useReferrals,
  useReferralActions,
  useReferralSlots,
  useReferralAppointments,
  type Referral,
  type ReferralEntityType,
} from '@/hooks/useReferrals';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { TimezoneNotice } from '@/components/time/TimezoneNotice';
import { getEffectiveTimeZone } from '@/lib/timezone';
import { canCreateReferrals } from '@/lib/referrals/permissions';
import { isReferralValid } from '@/lib/api/referral-api';

interface ReferralsSectionProps {
  role: 'referrer' | 'receiver' | 'patient';
  entityType?: ReferralEntityType;
  entityId?: string;
  patientId?: string;
  patientName?: string;
  showCreateButton?: boolean;
  title?: string;
  description?: string;
  initialReferralId?: string;
}

export const ReferralsSection = ({
  role,
  entityType,
  entityId,
  patientId,
  patientName,
  showCreateButton = false,
  title = 'Referrals',
  description,
  initialReferralId,
}: ReferralsSectionProps) => {
  const { allRoles, profile } = useAuth();
  const timezone = getEffectiveTimeZone(profile?.timezone);

  const { referrals, loading, refetch } = useReferrals({
    role,
    entityType,
    entityId,
    patientId,
  });

  const {
    acceptReferral,
    rejectReferral,
    completeReferral,
    createReferral,
    sendReferral,
  } = useReferralActions();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [slotPickerOpen, setSlotPickerOpen] = useState(false);
  const [publishSlotsOpen, setPublishSlotsOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedReferral, setSelectedReferral] = useState<Referral | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const deepLinkHandledRef = useRef(false);

  const { slots, loading: slotsLoading, createSlots } = useReferralSlots(selectedReferral?.id);
  const { bookAppointment } = useReferralAppointments(selectedReferral?.id);

  useEffect(() => {
    if (!initialReferralId || deepLinkHandledRef.current) return;
    if (loading) return;

    const found = referrals.find((r) => r.id === initialReferralId);
    if (!found) return;

    deepLinkHandledRef.current = true;
    setSelectedReferral(found);

    // Patient deep-link: if slots are available, open the booking flow; otherwise open details.
    if (role === 'patient' && found.status === 'slots_available' && isReferralValid(found)) {
      setSlotPickerOpen(true);
    } else {
      setDetailsDialogOpen(true);
    }
  }, [initialReferralId, loading, referrals, role]);

  const uiCanCreate =
    showCreateButton &&
    !!patientId &&
    !!patientName &&
    !!entityType &&
    !!entityId &&
    canCreateReferrals(allRoles);

  const handleAccept = async (id: string) => {
    const result = await acceptReferral(id);
    if (result.success) refetch();
  };

  const handleReject = (id: string) => {
    const referral = referrals.find((r) => r.id === id);
    setSelectedReferral(referral || null);
    setRejectDialogOpen(true);
  };

  const confirmReject = async () => {
    if (!selectedReferral) return;

    const result = await rejectReferral(selectedReferral.id, rejectReason);
    if (result.success) {
      refetch();
      setRejectDialogOpen(false);
      setRejectReason('');
      setSelectedReferral(null);
    }
  };

  const handleViewDetails = (referral: Referral) => {
    setSelectedReferral(referral);
    setDetailsDialogOpen(true);
  };

  const handleBookSlot = (referral: Referral) => {
    setSelectedReferral(referral);
    setSlotPickerOpen(true);
  };

  const handlePublishSlots = (referral: Referral) => {
    setSelectedReferral(referral);
    setPublishSlotsOpen(true);
  };

  const handleComplete = async (id: string) => {
    const result = await completeReferral(id);
    if (result.success) refetch();
  };

  const handleCreateReferral = async (data: any) => {
    if (!entityType || !entityId) {
      toast.error('Entity information is required');
      throw new Error('Entity information is required');
    }

    if (!canCreateReferrals(allRoles)) {
      toast.error('Your account cannot create referrals');
      throw new Error('Not allowed');
    }

    const result = await createReferral(data, entityType, entityId);
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to create referral');
    }
    await sendReferral(result.data.id);
    refetch();
  };

  const handleBookSlotConfirm = async (slotId: string, appointmentData: any) => {
    if (!selectedReferral) return;
    await bookAppointment(selectedReferral.id, slotId, appointmentData);
    refetch();
  };

  const handlePublishSlotsConfirm = async (slotsData: any[]) => {
    if (!selectedReferral) return;
    await createSlots(selectedReferral.id, slotsData);
    refetch();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {title}
            </CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
            <div className="mt-2">
              <TimezoneNotice timezone={timezone} />
            </div>
          </div>

          {uiCanCreate && (
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Referral
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <ReferralList
          referrals={referrals}
          loading={loading}
          role={role}
          onAccept={handleAccept}
          onReject={handleReject}
          onViewDetails={handleViewDetails}
          onBookSlot={handleBookSlot}
          onPublishSlots={handlePublishSlots}
          onComplete={handleComplete}
        />
      </CardContent>

      {uiCanCreate && patientId && patientName && (
        <CreateReferralDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          patientId={patientId}
          patientName={patientName}
          onSubmit={handleCreateReferral}
        />
      )}

      {selectedReferral && (
        <ReferralSlotPicker
          open={slotPickerOpen}
          onOpenChange={setSlotPickerOpen}
          referral={selectedReferral}
          slots={slots}
          loading={slotsLoading}
          onBookSlot={handleBookSlotConfirm}
        />
      )}

      {selectedReferral && (
        <PublishSlotsDialog
          open={publishSlotsOpen}
          onOpenChange={setPublishSlotsOpen}
          referral={selectedReferral}
          onPublish={handlePublishSlotsConfirm}
        />
      )}

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline Referral</DialogTitle>
            <DialogDescription>Please provide a reason for declining this referral</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <textarea
              className="w-full min-h-[100px] p-3 border rounded-md resize-none"
              placeholder="Reason for declining..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmReject}
                disabled={!rejectReason.trim()}
              >
                Decline Referral
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Referral Details</DialogTitle>
            <DialogDescription>{selectedReferral?.referral_number}</DialogDescription>
          </DialogHeader>

          {selectedReferral && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Status</span>
                  <p className="font-medium capitalize">{selectedReferral.status}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Priority</span>
                  <p className="font-medium capitalize">{selectedReferral.priority}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Type</span>
                  <p className="font-medium capitalize">
                    {selectedReferral.referral_type_enum?.replace('_', ' ')}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Duration</span>
                  <p className="font-medium">
                    {selectedReferral.estimated_duration_minutes || 30} min
                  </p>
                </div>
              </div>

              <div>
                <span className="text-muted-foreground text-sm">Reason</span>
                <p className="mt-1">{selectedReferral.reason}</p>
              </div>

              {selectedReferral.clinical_notes && (
                <div>
                  <span className="text-muted-foreground text-sm">Clinical Notes</span>
                  <p className="mt-1">{selectedReferral.clinical_notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};
