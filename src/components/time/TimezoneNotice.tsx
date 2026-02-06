// File: src/components/time/TimezoneNotice.tsx

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getGmtOffsetLabel } from '@/lib/timezone';

interface TimezoneNoticeProps {
  timezone: string;
  className?: string;
  prefix?: string;
}

export function TimezoneNotice({ timezone, className, prefix = 'Times shown in' }: TimezoneNoticeProps) {
  const offsetLabel = getGmtOffsetLabel(timezone);

  return (
    <Badge variant="outline" className={cn('text-xs font-normal', className)}>
      {prefix} {timezone} ({offsetLabel})
    </Badge>
  );
}
