// File: src/components/time/TimezoneNotice.tsx

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getEffectiveTimeZone } from "@/lib/timezone";

type BadgeVariant = "default" | "secondary" | "outline" | "destructive";

export type TimezoneNoticeProps = {
  /** Preferred prop name */
  timezone?: string;
  /** Backward-compatible prop name (some pages used this) */
  timeZone?: string;
  className?: string;
  variant?: BadgeVariant;
  prefixText?: string;
};

export function TimezoneNotice({
  timezone,
  timeZone,
  className,
  variant = "secondary",
  prefixText = "Times shown in",
}: TimezoneNoticeProps) {
  const tz = getEffectiveTimeZone(timezone || timeZone);

  return (
    <div className={cn("flex items-center", className)}>
      <Badge variant={variant} className="text-xs font-normal">
        {prefixText}: {tz}
      </Badge>
    </div>
  );
}

export default TimezoneNotice;
