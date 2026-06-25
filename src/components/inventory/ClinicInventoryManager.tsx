// src/components/inventory/ClinicInventoryManager.tsx
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  SlidersHorizontal,
  History,
  Package,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useClinicInventory,
  type ClinicInventoryItem,
  type AddInventoryItemInput,
  type AdjustStockInput,
  type InventoryCategory,
  type InventoryLog,
  calcDaysRemaining,
  getStockStatus,
} from '@/hooks/useClinicInventory';
import { InventoryStockBadge } from './InventoryStockBadge';
import { LowStockAlert } from './LowStockAlert';
import { formatDistanceToNow } from 'date-fns';

interface Props {
  entityId: string;
  /** Controls what actions are available */
  canCreate?: boolean;
  canDelete?: boolean;
}

const CATEGORIES: InventoryCategory[] = ['medication', 'instrument', 'supply', 'consumable'];
const UNITS = ['units', 'ml', 'mg', 'boxes', 'pieces', 'vials', 'syringes', 'ampoules', 'strips', 'pairs'];

const BLANK_FORM: AddInventoryItemInput = {
  name: '',
  description: null,
  category: 'medication',
  unit: 'units',
  quantity_in_stock: 0,
  reorder_level: 10,
  avg_daily_usage: null,
  expiry_date: null,
  supplier: null,
  unit_cost: null,
  notes: null,
};

export function ClinicInventoryManager({
  entityId,
  canCreate = true,
  canDelete = false,
}: Props) {
  const { t } = useTranslation('inventory');
  const {
    items,
    loading,
    stats,
    addItem,
    updateItem,
    adjustStock,
    deleteItem,
    fetchLogs,
  } = useClinicInventory(entityId);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Item form dialog
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ClinicInventoryItem | null>(null);
  const [form, setForm] = useState<AddInventoryItemInput>(BLANK_FORM);
  const [formSaving, setFormSaving] = useState(false);

  // Adjust stock dialog
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustingItem, setAdjustingItem] = useState<ClinicInventoryItem | null>(null);
  const [adjustInput, setAdjustInput] = useState<AdjustStockInput>({
    change_type: 'addition',
    quantity: 0,
    notes: null,
  });
  const [adjustSaving, setAdjustSaving] = useState(false);

  // History dialog
  const [logsOpen, setLogsOpen] = useState(false);
  const [logsItem, setLogsItem] = useState<ClinicInventoryItem | null>(null);
  const [logs, setLogs] = useState<InventoryLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<ClinicInventoryItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ── Filtered items ────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return items.filter((item) => {
      const matchSearch =
        !search ||
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.supplier?.toLowerCase().includes(search.toLowerCase());
      const matchCat = categoryFilter === 'all' || item.category === categoryFilter;
      return matchSearch && matchCat;
    });
  }, [items, search, categoryFilter]);

  // ── Open add form ─────────────────────────────────────────────────────────
  const openAdd = useCallback(() => {
    setEditingItem(null);
    setForm(BLANK_FORM);
    setFormOpen(true);
  }, []);

  // ── Open edit form ────────────────────────────────────────────────────────
  const openEdit = useCallback((item: ClinicInventoryItem) => {
    setEditingItem(item);
    setForm({
      name: item.name,
      description: item.description,
      category: item.category,
      unit: item.unit,
      quantity_in_stock: item.quantity_in_stock,
      reorder_level: item.reorder_level,
      avg_daily_usage: item.avg_daily_usage,
      expiry_date: item.expiry_date,
      supplier: item.supplier,
      unit_cost: item.unit_cost,
      notes: item.notes,
    });
    setFormOpen(true);
  }, []);

  // ── Submit form ───────────────────────────────────────────────────────────
  const handleFormSubmit = async () => {
    if (!form.name.trim()) return;
    setFormSaving(true);
    try {
      if (editingItem) {
        await updateItem(editingItem.id, form);
      } else {
        await addItem(form);
      }
      setFormOpen(false);
    } finally {
      setFormSaving(false);
    }
  };

  // ── Open adjust dialog ────────────────────────────────────────────────────
  const openAdjust = useCallback((item: ClinicInventoryItem) => {
    setAdjustingItem(item);
    setAdjustInput({ change_type: 'addition', quantity: 0, notes: null });
    setAdjustOpen(true);
  }, []);

  const handleAdjust = async () => {
    if (!adjustingItem || adjustInput.quantity <= 0) return;
    setAdjustSaving(true);
    await adjustStock(adjustingItem, adjustInput);
    setAdjustOpen(false);
    setAdjustSaving(false);
  };

  // Preview the new stock value
  const adjustPreview = useMemo(() => {
    if (!adjustingItem) return null;
    const { change_type, quantity } = adjustInput;
    if (change_type === 'adjustment') return quantity;
    if (change_type === 'addition') return adjustingItem.quantity_in_stock + quantity;
    return Math.max(0, adjustingItem.quantity_in_stock - quantity);
  }, [adjustingItem, adjustInput]);

  // ── Open logs dialog ──────────────────────────────────────────────────────
  const openLogs = useCallback(
    async (item: ClinicInventoryItem) => {
      setLogsItem(item);
      setLogsOpen(true);
      setLogsLoading(true);
      const data = await fetchLogs(item.id);
      setLogs(data);
      setLogsLoading(false);
    },
    [fetchLogs],
  );

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    await deleteItem(deleteTarget.id);
    setDeleteTarget(null);
    setDeleting(false);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Low stock alerts */}
      <LowStockAlert
        criticalItems={stats.critical}
        lowItems={stats.lowStock}
      />

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Package className="h-4 w-4" />
                {t('title')}
              </CardTitle>
              <CardDescription className="mt-0.5">{t('subtitle')}</CardDescription>
            </div>
            {canCreate && (
              <Button size="sm" onClick={openAdd} className="gap-2 shrink-0">
                <Plus className="h-4 w-4" /> {t('addItem')}
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('search')}
                className="pl-8 h-9"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-9 w-full sm:w-44">
                <SelectValue placeholder={t('filterCategory')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('filterCategory')}</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {t(`categories.${c}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Stats pills */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="text-xs">
              {items.length} items total
            </Badge>
            {stats.critical.length > 0 && (
              <Badge className="text-xs bg-red-500/15 text-red-700 dark:text-red-300 border-red-200">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {stats.critical.length} critical
              </Badge>
            )}
            {stats.lowStock.length > 0 && (
              <Badge className="text-xs bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-200">
                {stats.lowStock.length} low
              </Badge>
            )}
            {stats.outOfStock.length > 0 && (
              <Badge className="text-xs bg-gray-500/15 text-gray-600 border-gray-200">
                {stats.outOfStock.length} out
              </Badge>
            )}
            {stats.expiringSoon.length > 0 && (
              <Badge className="text-xs bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-200">
                {stats.expiringSoon.length} expiring &lt;30d
              </Badge>
            )}
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center gap-2 py-8 justify-center text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Loading…</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">{t('empty.title')}</p>
              <p className="text-xs mt-1">{t('empty.description')}</p>
              {canCreate && (
                <Button variant="outline" size="sm" className="mt-4 gap-2" onClick={openAdd}>
                  <Plus className="h-4 w-4" /> {t('empty.action')}
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto -mx-6 px-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('table.name')}</TableHead>
                    <TableHead>{t('table.category')}</TableHead>
                    <TableHead className="text-right">{t('table.quantity')}</TableHead>
                    <TableHead>{t('table.status')}</TableHead>
                    <TableHead>{t('table.daysRemaining')}</TableHead>
                    <TableHead>{t('table.expiryDate')}</TableHead>
                    <TableHead>{t('table.supplier')}</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((item) => {
                    const days = calcDaysRemaining(item);
                    const status = getStockStatus(item);
                    return (
                      <TableRow
                        key={item.id}
                        className={
                          status === 'critical' || status === 'out'
                            ? 'bg-red-50/40 dark:bg-red-950/20'
                            : status === 'low'
                            ? 'bg-amber-50/30 dark:bg-amber-950/10'
                            : ''
                        }
                      >
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs capitalize">
                            {t(`categories.${item.category}`)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {item.quantity_in_stock} {item.unit}
                        </TableCell>
                        <TableCell>
                          <InventoryStockBadge item={item} showDays={false} />
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground tabular-nums">
                          {days != null ? `~${days}d` : t('daysRemaining.unknown')}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {item.expiry_date
                            ? new Date(item.expiry_date).toLocaleDateString()
                            : '—'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[120px] truncate">
                          {item.supplier ?? '—'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 justify-end">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title={t('adjustStock')}
                              onClick={() => openAdjust(item)}
                            >
                              <SlidersHorizontal className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title={t('viewLogs')}
                              onClick={() => openLogs(item)}
                            >
                              <History className="h-3.5 w-3.5" />
                            </Button>
                            {canCreate && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                title={t('editItem')}
                                onClick={() => openEdit(item)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {canDelete && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                title={t('deleteItem')}
                                onClick={() => setDeleteTarget(item)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Add / Edit Item Dialog ──────────────────────────────────── */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? t('editItem') : t('addItem')}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>{t('form.name')}</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder={t('form.namePlaceholder')}
                />
              </div>

              <div>
                <Label>{t('form.category')}</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm((f) => ({ ...f, category: v as InventoryCategory }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {t(`categories.${c}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>{t('form.unit')}</Label>
                <Select
                  value={form.unit}
                  onValueChange={(v) => setForm((f) => ({ ...f, unit: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNITS.map((u) => (
                      <SelectItem key={u} value={u}>
                        {t(`units.${u}`, { defaultValue: u })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>{t('form.quantityInStock')}</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.quantity_in_stock}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, quantity_in_stock: parseFloat(e.target.value) || 0 }))
                  }
                />
              </div>

              <div>
                <Label>{t('form.reorderLevel')}</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.reorder_level}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, reorder_level: parseFloat(e.target.value) || 0 }))
                  }
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  {t('form.reorderLevelHint')}
                </p>
              </div>

              <div>
                <Label>{t('form.avgDailyUsage')}</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  value={form.avg_daily_usage ?? ''}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      avg_daily_usage: e.target.value === '' ? null : parseFloat(e.target.value),
                    }))
                  }
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  {t('form.avgDailyUsageHint')}
                </p>
              </div>

              <div>
                <Label>{t('form.expiryDate')}</Label>
                <Input
                  type="date"
                  value={form.expiry_date ?? ''}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, expiry_date: e.target.value || null }))
                  }
                />
              </div>

              <div>
                <Label>{t('form.unitCost')}</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.unit_cost ?? ''}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      unit_cost: e.target.value === '' ? null : parseFloat(e.target.value),
                    }))
                  }
                />
              </div>

              <div className="col-span-2">
                <Label>{t('form.supplier')}</Label>
                <Input
                  value={form.supplier ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, supplier: e.target.value || null }))}
                />
              </div>

              <div className="col-span-2">
                <Label>{t('form.notes')}</Label>
                <Textarea
                  rows={2}
                  value={form.notes ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value || null }))}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setFormOpen(false)} disabled={formSaving}>
              {t('form.cancel')}
            </Button>
            <Button onClick={handleFormSubmit} disabled={formSaving || !form.name.trim()}>
              {formSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {editingItem ? t('form.saving') : t('form.adding')}
                </>
              ) : editingItem ? (
                t('form.save')
              ) : (
                t('form.add')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Adjust Stock Dialog ────────────────────────────────────────── */}
      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {t('adjust.title', { name: adjustingItem?.name })}
            </DialogTitle>
          </DialogHeader>

          {adjustingItem && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {t('adjust.current')}:{' '}
                <span className="font-semibold text-foreground">
                  {adjustingItem.quantity_in_stock} {adjustingItem.unit}
                </span>
              </p>

              <div>
                <Label>{t('adjust.changeType')}</Label>
                <Select
                  value={adjustInput.change_type}
                  onValueChange={(v) =>
                    setAdjustInput((a) => ({ ...a, change_type: v as any }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(['addition', 'deduction', 'adjustment', 'expired', 'damaged'] as const).map(
                      (t2) => (
                        <SelectItem key={t2} value={t2}>
                          {t(`adjust.types.${t2}`)}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>{t('adjust.quantity')}</Label>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={adjustInput.quantity || ''}
                  placeholder={t('adjust.quantityPlaceholder')}
                  onChange={(e) =>
                    setAdjustInput((a) => ({ ...a, quantity: parseFloat(e.target.value) || 0 }))
                  }
                />
              </div>

              {adjustPreview !== null && adjustInput.quantity > 0 && (
                <p className="text-sm text-muted-foreground">
                  {adjustInput.change_type === 'adjustment'
                    ? t('adjust.previewSet', { qty: adjustPreview, unit: adjustingItem.unit })
                    : t('adjust.preview', { qty: adjustPreview, unit: adjustingItem.unit })}
                </p>
              )}

              <div>
                <Label>{t('adjust.notes')}</Label>
                <Textarea
                  rows={2}
                  value={adjustInput.notes ?? ''}
                  placeholder={t('adjust.notesPlaceholder')}
                  onChange={(e) =>
                    setAdjustInput((a) => ({ ...a, notes: e.target.value || null }))
                  }
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setAdjustOpen(false)} disabled={adjustSaving}>
              {t('adjust.cancel')}
            </Button>
            <Button
              onClick={handleAdjust}
              disabled={adjustSaving || adjustInput.quantity <= 0}
            >
              {adjustSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {t('adjust.applying')}
                </>
              ) : (
                t('adjust.apply')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Stock History Dialog ──────────────────────────────────────── */}
      <Dialog open={logsOpen} onOpenChange={setLogsOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('logs.title', { name: logsItem?.name })}</DialogTitle>
          </DialogHeader>

          {logsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">{t('logs.empty')}</p>
          ) : (
            <ul className="divide-y">
              {logs.map((log) => (
                <li key={log.id} className="py-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {t(`logs.changeType.${log.change_type}`, { defaultValue: log.change_type })}
                    </p>
                    {log.notes && (
                      <p className="text-xs text-muted-foreground mt-0.5">{log.notes}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p
                      className={`text-sm font-semibold tabular-nums ${
                        log.quantity_change > 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {log.quantity_change > 0 ? '+' : ''}
                      {log.quantity_change} {logsItem?.unit}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      → {log.quantity_after} {logsItem?.unit}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setLogsOpen(false)}>
              {t('logs.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm ─────────────────────────────────────────────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('delete.title', { name: deleteTarget?.name })}
            </AlertDialogTitle>
            <AlertDialogDescription>{t('delete.description')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t('delete.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {t('delete.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
