// src/components/inventory/InventoryStockBadge.tsx
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import {
  type ClinicInventoryItem,
  type StockStatus,
  calcDaysRemaining,
  getStockStatus,
} from '@/hooks/useClinicInventory';
import { AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react';

interface Props {
  item: ClinicInventoryItem;
  showDays?: boolean;
}

const STATUS_STYLE: Record<StockStatus, string> = {
  ok:       'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200',
  low:      'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-200',
  critical: 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-200',
  out:      'bg-gray-500/15 text-gray-600 dark:text-gray-400 border-gray-200',
};

const STATUS_ICON: Record<StockStatus, typeof CheckCircle> = {
  ok:       CheckCircle,
  low:      AlertTriangle,
  critical: AlertTriangle,
  out:      XCircle,
};

export function InventoryStockBadge({ item, showDays = true }: Props) {
  const { t } = useTranslation('inventory');
  const status = getStockStatus(item);
  const days = calcDaysRemaining(item);
  const Icon = STATUS_ICON[status];

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <Badge
        variant="outline"
        className={`text-xs font-medium flex items-center gap-1 ${STATUS_STYLE[status]}`}
      >
        <Icon className="h-3 w-3" />
        {t(`stockStatus.${status}`)}
      </Badge>

      {showDays && days !== null && status !== 'out' && (
        <Badge
          variant="outline"
          className="text-xs text-muted-foreground flex items-center gap-1 border-dashed"
        >
          <Clock className="h-3 w-3" />
          {days === 0
            ? t('daysRemaining.today')
            : t('daysRemaining.label', { days })}
        </Badge>
      )}
    </div>
  );
}
