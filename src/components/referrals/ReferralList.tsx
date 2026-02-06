// File: src/components/referrals/ReferralList.tsx
import { FileDown, Eye, CheckCircle2, XCircle, CalendarPlus, Clock, Send, PlusSquare, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Referral } from "@/hooks/useReferrals";
import { downloadReferralPdf, isReferralValid } from "@/lib/api/referral-api";
import { useAuth } from "@/contexts/AuthContext";

type Props = {
  referrals: Referral[];
  loading: boolean;
  role: "referrer" | "receiver" | "patient";
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onViewDetails: (referral: Referral) => void;
  onBookSlot: (referral: Referral) => void;
  onPublishSlots: (referral: Referral) => void;
  onComplete: (id: string) => void;
};

function statusVariant(status: string) {
  const s = String(status || "").toLowerCase();
  if (["sent"].includes(s)) return "secondary";
  if (["accepted", "slots_available", "booked"].includes(s)) return "default";
  if (["rejected", "cancelled", "expired"].includes(s)) return "destructive";
  return "outline";
}

function statusLabel(status: string) {
  const s = String(status || "").toLowerCase();
  return s.replace(/_/g, " ");
}

export function ReferralList({
  referrals,
  loading,
  role,
  onAccept,
  onReject,
  onViewDetails,
  onBookSlot,
  onPublishSlots,
  onComplete,
}: Props) {
  const { profile } = useAuth();
  const locale = (profile as any)?.language || (profile as any)?.locale || undefined;

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading referrals...</div>;
  }

  if (!referrals || referrals.length === 0) {
    return <div className="text-sm text-muted-foreground py-6">No referrals yet.</div>;
  }

  const canDownloadPdf = true; // safe to allow for all roles; server enforces access

  const handleDownload = async (referralId: string) => {
    try {
      await downloadReferralPdf({ referralId, locale });
    } catch (e: any) {
      console.error("downloadReferralPdf error:", e);
    }
  };

  return (
    <div className="space-y-3">
      {referrals.map((r) => {
        const status = String(r.status || "");
        const valid = isReferralValid(r);

        const canAccept = role === "receiver" && status.toLowerCase() === "sent";
        const canReject = role === "receiver" && ["sent", "accepted"].includes(status.toLowerCase());
        const canPublishSlots =
          role === "receiver" && ["accepted"].includes(status.toLowerCase()) && valid;
        const canComplete =
          role === "receiver" && ["booked", "in_progress"].includes(status.toLowerCase());
        const canBook =
          role === "patient" &&
          valid &&
          status.toLowerCase() === "slots_available";

        return (
          <div
            key={r.id}
            className={cn(
              "rounded-lg border p-4 flex flex-col gap-3",
              !valid && "opacity-70",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="font-medium">{r.referral_number}</div>
                  <Badge variant={statusVariant(status) as any} className="capitalize">
                    {statusLabel(status)}
                  </Badge>
                  {!valid ? (
                    <Badge variant="outline" className="text-muted-foreground">
                      expired
                    </Badge>
                  ) : null}
                </div>

                <div className="text-sm text-muted-foreground">
                  {String((r as any).referral_type_enum || "").replace(/_/g, " ")} •{" "}
                  <span className="capitalize">{String((r as any).priority || "")}</span>
                </div>

                {role === "patient" ? (
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5" />
                    Valid until {(r as any).valid_until}
                  </div>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => onViewDetails(r)}>
                  <Eye className="h-4 w-4 mr-2" />
                  Details
                </Button>

                {canDownloadPdf ? (
                  <Button variant="outline" size="sm" onClick={() => handleDownload(r.id)}>
                    <FileDown className="h-4 w-4 mr-2" />
                    PDF
                  </Button>
                ) : null}

                {canAccept ? (
                  <Button size="sm" onClick={() => onAccept(r.id)}>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Accept
                  </Button>
                ) : null}

                {canReject ? (
                  <Button variant="destructive" size="sm" onClick={() => onReject(r.id)}>
                    <XCircle className="h-4 w-4 mr-2" />
                    Decline
                  </Button>
                ) : null}

                {canPublishSlots ? (
                  <Button size="sm" onClick={() => onPublishSlots(r)}>
                    <PlusSquare className="h-4 w-4 mr-2" />
                    Publish slots
                  </Button>
                ) : null}

                {canBook ? (
                  <Button size="sm" onClick={() => onBookSlot(r)}>
                    <CalendarPlus className="h-4 w-4 mr-2" />
                    Book
                  </Button>
                ) : null}

                {canComplete ? (
                  <Button variant="secondary" size="sm" onClick={() => onComplete(r.id)}>
                    <Check className="h-4 w-4 mr-2" />
                    Complete
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="text-sm">
              <div className="text-muted-foreground text-xs mb-1">Reason</div>
              <div className="line-clamp-3">{r.reason}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
