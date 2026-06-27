// src/components/inventory/LowStockAlert.tsx
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, X, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { calcDaysRemaining, type ClinicInventoryItem } from '@/hooks/useClinicInventory';

interface Props {
  criticalItems: ClinicInventoryItem[];
  lowItems: ClinicInventoryItem[];
  onViewAll?: () => void;
}

export function LowStockAlert({ criticalItems, lowItems, onViewAll }: Props) {
  const { t } = useTranslation('inventory');
  const [dismissed, setDismissed] = useState(false);

  const total = criticalItems.length + lowItems.length;
  if (total === 0 || dismissed) return null;

  const topItems = [...criticalItems, ...lowItems].slice(0, 3);

  return (
    <Alert className="relative border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700">
      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />

      <AlertTitle className="text-amber-800 dark:text-amber-300 font-semibold">
        {criticalItems.length > 0
          ? t(criticalItems.length === 1 ? 'lowStockAlert.critical' : 'lowStockAlert.criticalPlural',
              { count: criticalItems.length })
          : t(lowItems.length === 1 ? 'lowStockAlert.low' : 'lowStockAlert.lowPlural',
              { count: lowItems.length })}
      </AlertTitle>

      <AlertDescription className="mt-1 space-y-1">
        {topItems.map((item) => {
          const days = calcDaysRemaining(item);
          return (
            <p key={item.id} className="text-xs text-amber-700 dark:text-amber-300">
              {t('lowStockAlert.item', {
                name: item.name,
                qty: item.quantity_in_stock,
                unit: item.unit,
                days: days != null ? `~${days}d` : '—',
              })}
            </p>
          );
        })}
        {onViewAll && (
          <Button
            variant="link" size="sm"
            className="h-auto p-0 text-amber-700 dark:text-amber-300 text-xs mt-1"
            onClick={onViewAll}
          >
            {t('lowStockAlert.viewAll')} <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        )}
      </AlertDescription>

      <Button
        variant="ghost" size="icon"
        className="absolute top-2 right-2 h-6 w-6 text-amber-600 hover:text-amber-800 hover:bg-amber-100"
        onClick={() => setDismissed(true)}
      >
        <X className="h-3 w-3" />
        <span className="sr-only">{t('lowStockAlert.dismiss')}</span>
      </Button>
    </Alert>
  );
}
