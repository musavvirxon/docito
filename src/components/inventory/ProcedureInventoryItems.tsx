// src/components/inventory/ProcedureInventoryItems.tsx
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Package, Info, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  useMergedInventory,
  useProcedureInventoryRequirements,
  getStockStatus,
  getUseStatus,
  type MergedInventoryItem,
} from '@/hooks/useClinicInventory';

interface Props {
  /** The clinic / practice entity ID */
  clinicEntityId: string;
  /** The doctor's own profile ID (for personal inventory). Pass null if not available. */
  doctorEntityId?: string | null;
  procedureId: string | null;
  readOnly?: boolean;
}

export function ProcedureInventoryItems({
  clinicEntityId,
  doctorEntityId = null,
  procedureId,
  readOnly = false,
}: Props) {
  const { t } = useTranslation('inventory');

  const { items: allItems } = useMergedInventory(clinicEntityId, doctorEntityId);
  const { requirements, loading, addRequirement, removeRequirement } =
    useProcedureInventoryRequirements(clinicEntityId, procedureId);

  const [selectedId, setSelectedId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [adding, setAdding] = useState(false);

  const availableItems = allItems.filter(
    (i) => !requirements.some((r) => r.inventory_id === i.id),
  );

  const handleAdd = async () => {
    if (!selectedId || !quantity) return;
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) return;
    setAdding(true);
    await addRequirement(selectedId, qty);
    setSelectedId('');
    setQuantity('1');
    setAdding(false);
  };

  if (loading) return null;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Package className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">{t('procedureItems.title')}</span>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-[220px] text-xs">{t('procedureItems.autoDeduct')}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Requirements list */}
      {requirements.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t('procedureItems.empty')}</p>
      ) : (
        <ul className="space-y-1.5">
          {requirements.map((req) => {
            const inv = req.inventory_item as MergedInventoryItem | undefined;
            const stockStatus = inv ? getStockStatus(inv) : null;
            const useStatus = inv ? getUseStatus(inv) : null;
            const hasIssue =
              stockStatus === 'out' ||
              stockStatus === 'critical' ||
              useStatus === 'needs_sterilization' ||
              useStatus === 'exhausted';

            return (
              <li
                key={req.id}
                className={`flex items-center justify-between gap-2 rounded-md px-3 py-2 ${
                  hasIssue
                    ? 'bg-red-50/60 dark:bg-red-950/20 border border-red-200/60'
                    : 'bg-muted/40'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="text-sm font-medium truncate">{inv?.name ?? '—'}</span>

                  <Badge variant="secondary" className="text-[10px] shrink-0">
                    ×{req.quantity_required} {inv?.unit}
                  </Badge>

                  {/* Source badge */}
                  {inv && (
                    <Badge
                      variant="outline"
                      className="text-[10px] shrink-0 border-dashed"
                    >
                      {(inv as MergedInventoryItem).source === 'clinic' ? `🏥 ${t('procedureItems.clinicShort')}` : `👤 ${t('procedureItems.mineShort')}`}
                    </Badge>
                  )}

                  {/* Available quantity */}
                  {inv && (
                    <span
                      className={`text-[10px] shrink-0 ${
                        stockStatus === 'out' || stockStatus === 'critical'
                          ? 'text-red-600 dark:text-red-400'
                          : stockStatus === 'low'
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {t('procedureItems.available', { qty: inv.quantity_in_stock })}
                    </span>
                  )}

                  {/* Reuse badge */}
                  {inv?.is_reusable && inv.max_uses_per_unit && (
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 shrink-0">
                      {inv.current_use_count}/{inv.max_uses_per_unit} uses
                    </span>
                  )}

                  {hasIssue && (
                    <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                  )}
                </div>

                {!readOnly && (
                  <Button
                    variant="ghost" size="icon" className="h-7 w-7 shrink-0"
                    onClick={() => removeRequirement(req.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* Add row */}
      {!readOnly && procedureId && (
        <div className="flex items-end gap-2 pt-1">
          <div className="flex-1">
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder={t('procedureItems.selectItem')} />
              </SelectTrigger>
              <SelectContent>
                {availableItems.map((item) => {
                  const ss = getStockStatus(item);
                  const us = getUseStatus(item);
                  const warn = ss === 'out' || us !== 'ok';
                  return (
                    <SelectItem key={item.id} value={item.id}>
                      <span className={warn ? 'text-red-600' : ''}>
                        {item.source === 'clinic' ? '🏥' : '👤'} {item.name}
                        {ss === 'out'
                          ? ` — ${t('procedureItems.outOfStock')}`
                          : ss === 'critical' || ss === 'low'
                          ? ` — ${t('procedureItems.lowStock')} (${item.quantity_in_stock})`
                          : ` (${item.quantity_in_stock} ${item.unit})`}
                        {us === 'needs_sterilization'
                          ? ` ⚠️ ${t('procedureItems.needsSterilization')}`
                          : us === 'exhausted'
                          ? ` ⛔ ${t('procedureItems.exhausted')}`
                          : ''}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <Input
            type="number" min="0.1" step="any"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="h-8 w-16 text-xs"
          />

          <Button
            size="sm" className="h-8 gap-1 text-xs"
            onClick={handleAdd}
            disabled={!selectedId || adding}
          >
            <Plus className="h-3.5 w-3.5" />
            {t('procedureItems.addItem')}
          </Button>
        </div>
      )}

      {/* Legend + hint */}
      {allItems.length > 0 && (
        <p className="text-[10px] text-muted-foreground">
          🏥 = {t('procedureItems.clinicInventory', { defaultValue: 'clinic inventory' })} &nbsp;·&nbsp;
          👤 = {t('procedureItems.personalInventory', { defaultValue: 'your personal inventory' })}
        </p>
      )}

      {requirements.length > 0 && (
        <p className="text-[10px] text-muted-foreground italic">
          {t('procedureItems.autoDeduct')}
        </p>
      )}
    </div>
  );
}
