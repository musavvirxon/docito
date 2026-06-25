// src/components/inventory/ProcedureInventoryItems.tsx
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Package, Info } from 'lucide-react';
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
  useClinicInventory,
  useProcedureInventoryRequirements,
  getStockStatus,
} from '@/hooks/useClinicInventory';

interface Props {
  entityId: string;
  procedureId: string | null;
  /** show read-only mode (e.g. in appointment view) */
  readOnly?: boolean;
}

export function ProcedureInventoryItems({ entityId, procedureId, readOnly = false }: Props) {
  const { t } = useTranslation('inventory');
  const { items: allItems } = useClinicInventory(entityId);
  const { requirements, loading, addRequirement, removeRequirement } =
    useProcedureInventoryRequirements(entityId, procedureId);

  const [selectedInventoryId, setSelectedInventoryId] = useState<string>('');
  const [quantity, setQuantity] = useState('1');
  const [adding, setAdding] = useState(false);

  const availableItems = allItems.filter(
    (i) => !requirements.some((r) => r.inventory_id === i.id),
  );

  const handleAdd = async () => {
    if (!selectedInventoryId || !quantity) return;
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) return;
    setAdding(true);
    await addRequirement(selectedInventoryId, qty);
    setSelectedInventoryId('');
    setQuantity('1');
    setAdding(false);
  };

  if (loading) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Package className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">{t('procedureItems.title')}</span>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-[200px] text-xs">{t('procedureItems.autoDeduct')}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {requirements.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t('procedureItems.empty')}</p>
      ) : (
        <ul className="space-y-1.5">
          {requirements.map((req) => {
            const inv = req.inventory_item;
            const status = inv ? getStockStatus(inv) : null;
            return (
              <li
                key={req.id}
                className="flex items-center justify-between gap-2 rounded-md bg-muted/40 px-3 py-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-medium truncate">
                    {inv?.name ?? '—'}
                  </span>
                  <Badge variant="secondary" className="text-[10px] shrink-0">
                    ×{req.quantity_required} {inv?.unit}
                  </Badge>
                  {inv && (
                    <span
                      className={`text-[10px] shrink-0 ${
                        status === 'out' || status === 'critical'
                          ? 'text-red-600 dark:text-red-400'
                          : status === 'low'
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {t('procedureItems.available', {
                        qty: inv.quantity_in_stock,
                      })}
                    </span>
                  )}
                </div>

                {!readOnly && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
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

      {!readOnly && procedureId && (
        <div className="flex items-end gap-2 pt-1">
          <div className="flex-1">
            <Select value={selectedInventoryId} onValueChange={setSelectedInventoryId}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder={t('procedureItems.selectItem')} />
              </SelectTrigger>
              <SelectContent>
                {availableItems.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
                    {getStockStatus(item) === 'out'
                      ? ` (${t('procedureItems.outOfStock')})`
                      : getStockStatus(item) === 'low' || getStockStatus(item) === 'critical'
                      ? ` (${t('procedureItems.lowStock')})`
                      : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Input
            type="number"
            min="0.1"
            step="any"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="h-8 w-16 text-xs"
          />

          <Button
            size="sm"
            className="h-8 gap-1 text-xs"
            onClick={handleAdd}
            disabled={!selectedInventoryId || adding}
          >
            <Plus className="h-3.5 w-3.5" />
            {t('procedureItems.addItem')}
          </Button>
        </div>
      )}

      {requirements.length > 0 && (
        <p className="text-[10px] text-muted-foreground italic">
          {t('procedureItems.autoDeduct')}
        </p>
      )}
    </div>
  );
}
