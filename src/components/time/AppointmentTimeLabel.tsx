// File: src/components/time/AppointmentTimeLabel.tsx

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatAppointmentForViewer, type AppointmentLike } from "@/lib/appointmentTime";

export type AppointmentTimeLabelProps = {
  appt: AppointmentLike;
  sourceTimeZone: string;
  viewerTimeZone: string;
  className?: string;
  showEnd?: boolean;
  variant?: "default" | "secondary" | "outline" | "destructive";
};

/**
 * Displays appointment date/time converted from sourceTimeZone -> viewerTimeZone.
 * Designed for lists/cards (patient dashboard, booking confirmation, etc).
 */
export function AppointmentTimeLabel({
  appt,
  sourceTimeZone,
  viewerTimeZone,
  className,
  showEnd = true,
  variant = "outline",
}: AppointmentTimeLabelProps) {
  const { combinedLabel } = formatAppointmentForViewer({
    appt,
    sourceTimeZone,
    viewerTimeZone,
    includeEnd: showEnd,
  });

  if (!combinedLabel) return null;

  return (
    <Badge variant={variant} className={cn("text-xs font-normal", className)}>
      {combinedLabel}
    </Badge>
  );
}
