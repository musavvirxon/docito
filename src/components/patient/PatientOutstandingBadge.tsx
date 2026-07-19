import { AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { usePatientOutstanding } from "@/hooks/usePatientOutstanding";

interface Props {
  patientId?: string | null;
  className?: string;
}

const formatMoney = (cents: number, currency: string) => {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: (currency || "USD").toUpperCase(),
      maximumFractionDigits: 2,
    }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency?.toUpperCase() || ""}`.trim();
  }
};

/**
 * Small chip that surfaces unpaid balance on a patient's profile.
 * Renders nothing when the patient owes nothing.
 */
export function PatientOutstandingBadge({ patientId, className }: Props) {
  const { t } = useTranslation("finance");
  const { rows, hasBalance } = usePatientOutstanding(patientId);
  if (!hasBalance) return null;

  const label = rows
    .map((r) => formatMoney(Number(r.outstanding_cents), r.currency))
    .join(" · ");

  return (
    <Badge variant="destructive" className={className}>
      <AlertCircle className="mr-1 h-3 w-3" />
      {t("outstanding.badge", { defaultValue: "Outstanding" })}: {label}
    </Badge>
  );
}

export default PatientOutstandingBadge;
