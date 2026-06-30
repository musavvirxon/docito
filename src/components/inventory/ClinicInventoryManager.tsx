// src/components/inventory/ClinicInventoryManager.tsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Plus, Search, Pencil, Trash2, SlidersHorizontal,
  History, Package, Loader2, AlertTriangle, RefreshCw, User,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { formatDistanceToNow } from 'date-fns';
import {
  useClinicInventory,
  type ClinicInventoryItem,
  type AddInventoryItemInput,
  type AdjustStockInput,
  type InventoryCategory,
  type InventoryLog,
  calcDaysRemaining,
  getStockStatus,
  getUseStatus,
} from '@/hooks/useClinicInventory';
import { InventoryStockBadge } from './InventoryStockBadge';
import { LowStockAlert } from './LowStockAlert';

interface Props {
  entityId: string;
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
  is_reusable: false,
  max_uses_per_unit: null,
  requires_sterilization: false,
  expiry_date: null,
  supplier: null,
  unit_cost: null,
  notes: null,
};

export function ClinicInventoryManager({ entityId, canCreate = true, canDelete = false }: Props) {
  const { t } = useTranslation('inventory');
  const {
    items, loading, stats,
    addItem, updateItem, adjustStock, markSterilized, deleteItem, fetchLogs,
  } = useClinicInventory(entityId);

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Form dialog
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ClinicInventoryItem | null>(null);
  const [form, setForm] = useState<AddInventoryItemInput>(BLANK_FORM);
  const [formSaving, setFormSaving] = useState(false);

  // Adjust stock dialog
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustingItem, setAdjustingItem] = useState<ClinicInventoryItem | null>(null);
  const [adjustInput, setAdjustInput] = useState<AdjustStockInput>({ change_type: 'addition', quantity: 0, notes: null });
  const [adjustSaving, setAdjustSaving] = useState(false);

  // Logs dialog
  const [logsOpen, setLogsOpen] = useState(false);
  const [logsItem, setLogsItem] = useState<ClinicInventoryItem | null>(null);
  const [logs, setLogs] = useState<InventoryLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<ClinicInventoryItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Filtered items
  const filtered = useMemo(() => items.filter((item) => {
    const matchSearch = !search ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.supplier?.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === 'all' || item.category === categoryFilter;
    return matchSearch && matchCat;
  }), [items, search, categoryFilter]);

  // ── Owner profiles (who added each item) ───────────────────────────────
  const [ownerMap, setOwnerMap] = useState<Map<string, { name: string; role: string | null }>>(new Map());
  useEffect(() => {
    const ids = Array.from(new Set(items.map((i) => i.created_by).filter(Boolean))) as string[];
    if (ids.length === 0) { setOwnerMap(new Map()); return; }
    let cancelled = false;
    (async () => {
      const { data } = await (supabase as any)
        .from('profiles')
        .select('id, full_name, first_name, last_name, role')
        .in('id', ids);
      if (cancelled || !data) return;
      const map = new Map<string, { name: string; role: string | null }>();
      for (const p of data) {
        const name = p.full_name?.trim()
          || [p.first_name, p.last_name].filter(Boolean).join(' ').trim()
          || 'Unknown';
        map.set(p.id, { name, role: p.role ?? null });
      }
      setOwnerMap(map);
    })();
    return () => { cancelled = true; };
  }, [items]);

  const openAdd = useCallback(() => {
    setEditingItem(null);
    setForm(BLANK_FORM);
    setFormOpen(true);
  }, []);

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
      is_reusable: item.is_reusable,
      max_uses_per_unit: item.max_uses_per_unit,
      requires_sterilization: item.requires_sterilization,
      expiry_date: item.expiry_date,
      supplier: item.supplier,
      unit_cost: item.unit_cost,
      notes: item.notes,
    });
    setFormOpen(true);
  }, []);

  const handleFormSubmit = async () => {
    if (!form.name.trim()) return;
    setFormSaving(true);
    try {
      if (editingItem) await updateItem(editingItem.id, form);
      else await addItem(form);
      setFormOpen(false);
    } finally { setFormSaving(false); }
  };

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

  const adjustPreview = useMemo(() => {
    if (!adjustingItem) return null;
    const { change_type, quantity } = adjustInput;
    if (change_type === 'adjustment') return quantity;
    if (change_type === 'addition') return adjustingItem.quantity_in_stock + quantity;
    return Math.max(0, adjustingItem.quantity_in_stock - quantity);
  }, [adjustingItem, adjustInput]);

  const openLogs = useCallback(async (item: ClinicInventoryItem) => {
    setLogsItem(item);
    setLogsOpen(true);
    setLogsLoading(true);
    const data = await fetchLogs(item.id);
    setLogs(data);
    setLogsLoading(false);
  }, [fetchLogs]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    await deleteItem(deleteTarget.id);
    setDeleteTarget(null);
    setDeleting(false);
  };

  return (
    <div className="space-y-4">
      <LowStockAlert criticalItems={stats.critical} lowItems={stats.lowStock} />

      {/* Sterilization alert */}
      {stats.needsSterilization.length > 0 && (
        <div className="rounded-lg border border-purple-300 bg-purple-50/60 dark:bg-purple-950/20 dark:border-purple-700 p-3 flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-purple-600 dark:text-purple-400 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-purple-800 dark:text-purple-300">
              {t('sterilizationBanner.title', { count: stats.needsSterilization.length })}
            </p>
            {stats.needsSterilization.slice(0, 3).map((item) => (
              <div key={item.id} className="flex items-center gap-2 mt-1.5">
                <span className="text-xs text-purple-700 dark:text-purple-300 truncate">
                  {t('sterilizationBanner.itemRow', { name: item.name, used: item.current_use_count, max: item.max_uses_per_unit })}
                </span>
                <Button
                  variant="outline" size="sm"
                  className="h-6 text-[10px] border-purple-300 text-purple-700 hover:bg-purple-100 shrink-0"
                  onClick={() => markSterilized(item.id)}
                >
                  ✓ {t('actions.markSterilized')}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Package className="h-4 w-4" /> {t('title')}
              </CardTitle>
              <CardDescription className="mt-0.5">{t('subtitle')}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => {}} className="h-8 gap-1">
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
              {canCreate && (
                <Button size="sm" onClick={openAdd} className="gap-2 h-8">
                  <Plus className="h-4 w-4" /> {t('addItem')}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder={t('search')} className="pl-8 h-9" />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-9 w-full sm:w-44">
                <SelectValue placeholder={t('filterCategory')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('filterCategory')}</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{t(`categories.${c}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Stats pills */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="text-xs">{t('statsPills.total', { count: items.length })}</Badge>
            {stats.critical.length > 0 && (
              <Badge className="text-xs bg-red-500/15 text-red-700 dark:text-red-300 border-red-200">
                <AlertTriangle className="h-3 w-3 mr-1" />{t('statsPills.critical', { count: stats.critical.length })}
              </Badge>
            )}
            {stats.lowStock.length > 0 && (
              <Badge className="text-xs bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-200">
                {t('statsPills.low', { count: stats.lowStock.length })}
              </Badge>
            )}
            {stats.outOfStock.length > 0 && (
              <Badge className="text-xs bg-gray-500/15 text-gray-600 border-gray-200">
                {t('statsPills.out', { count: stats.outOfStock.length })}
              </Badge>
            )}
            {stats.needsSterilization.length > 0 && (
              <Badge className="text-xs bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-200">
                {t('statsPills.sterilize', { count: stats.needsSterilization.length })}
              </Badge>
            )}
            {stats.expiringSoon.length > 0 && (
              <Badge className="text-xs bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-200">
                {t('statsPills.expiring', { count: stats.expiringSoon.length })}
              </Badge>
            )}
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center gap-2 py-8 justify-center text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /><span className="text-sm">{t('loading')}</span>
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
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((item) => {
                    const days = calcDaysRemaining(item);
                    const stockStatus = getStockStatus(item);
                    const useStatus = getUseStatus(item);
                    const rowBg =
                      useStatus !== 'ok'
                        ? 'bg-purple-50/30 dark:bg-purple-950/10'
                        : stockStatus === 'critical' || stockStatus === 'out'
                        ? 'bg-red-50/40 dark:bg-red-950/20'
                        : stockStatus === 'low'
                        ? 'bg-amber-50/30 dark:bg-amber-950/10'
                        : '';

                    return (
                      <TableRow key={item.id} className={rowBg}>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium">{item.name}</span>
                              {item.owner_type === 'doctor' ? (
                                <Badge variant="outline" className="text-[10px] h-4 px-1">👤 {t('personalBadge')}</Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px] h-4 px-1">🏥 {t('clinicBadge')}</Badge>
                              )}
                            </div>
                            {item.created_by && (
                              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                <User className="h-3 w-3" />
                                <span>
                                  {t('addedBy', { defaultValue: 'Added by' })}{' '}
                                  {ownerMap.get(item.created_by)?.name ?? '…'}
                                  {ownerMap.get(item.created_by)?.role && (
                                    <span className="opacity-70"> · {ownerMap.get(item.created_by)?.role}</span>
                                  )}
                                </span>
                              </div>
                            )}
                            {item.is_reusable && (() => {
                              const total = item.quantity_in_stock;
                              const maxUses = item.max_uses_per_unit;
                              const used = item.current_use_count ?? 0;
                              const needsSter = item.requires_sterilization && used > 0 ? 1 : 0;
                              const ready = Math.max(0, total - needsSter);
                              const remainingActive = maxUses != null ? Math.max(0, maxUses - used) : null;
                              return (
                                <div className="text-[10px] text-muted-foreground space-y-0.5">
                                  <div>
                                    ♻️ {t('reuse.ready', { defaultValue: '{{ready}}/{{total}} ready', ready, total })}
                                    {remainingActive != null
                                      ? ` · ${t('reuse.remainingActive', { defaultValue: '{{n}} uses left on active unit', n: remainingActive })}`
                                      : ` · ${t('reuse.unlimited', { defaultValue: 'unlimited uses' })}`}
                                  </div>
                                  {needsSter > 0 && (
                                    <div className="text-purple-600 dark:text-purple-400">
                                      🧼 {t('reuse.awaitingSterilization', { defaultValue: '{{n}} awaiting sterilization', n: needsSter })}
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs capitalize">
                            {t(`categories.${item.category}`)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {item.quantity_in_stock} {item.unit}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <InventoryStockBadge item={item} showDays={false} />
                            {useStatus === 'needs_sterilization' && (
                              <Badge className="text-[10px] bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-200 w-fit">
                                {t('stockStatus.needsSterilization')}
                              </Badge>
                            )}
                            {useStatus === 'exhausted' && (
                              <Badge className="text-[10px] bg-gray-500/15 text-gray-600 border-gray-200 w-fit">
                                {t('stockStatus.exhausted')}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground tabular-nums">
                          {days != null ? `~${days}d` : '—'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {item.expiry_date ? new Date(item.expiry_date).toLocaleDateString() : '—'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 justify-end">
                            {useStatus === 'needs_sterilization' && (
                              <Button
                                variant="outline" size="sm"
                                className="h-7 text-[10px] border-purple-300 text-purple-700 hover:bg-purple-50"
                                onClick={() => markSterilized(item.id)}
                              >
                                ✓ {t('actions.markSterilized')}
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-8 w-8"
                              title={t('adjustStock')} onClick={() => openAdjust(item)}>
                              <SlidersHorizontal className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8"
                              title={t('viewLogs')} onClick={() => openLogs(item)}>
                              <History className="h-3.5 w-3.5" />
                            </Button>
                            {canCreate && (
                              <Button variant="ghost" size="icon" className="h-8 w-8"
                                title={t('editItem')} onClick={() => openEdit(item)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {canDelete && (
                              <Button variant="ghost" size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                title={t('deleteItem')} onClick={() => setDeleteTarget(item)}>
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

      {/* ── Add / Edit Dialog ─────────────────────────────────────────────── */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? t('editItem') : t('addItem')}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>{t('form.name')}</Label>
                <Input value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder={t('form.namePlaceholder')} />
              </div>

              <div>
                <Label>{t('form.category')}</Label>
                <Select value={form.category}
                  onValueChange={(v) => setForm((f) => ({ ...f, category: v as InventoryCategory }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{t(`categories.${c}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>{t('form.unit')}</Label>
                <Select value={form.unit} onValueChange={(v) => setForm((f) => ({ ...f, unit: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {UNITS.map((u) => (
                      <SelectItem key={u} value={u}>{t(`units.${u}`, { defaultValue: u })}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>{t('form.quantityInStock')}</Label>
                <Input type="number" min="0" placeholder="0"
                  value={form.quantity_in_stock === 0 ? '' : form.quantity_in_stock}
                  onChange={(e) => setForm((f) => ({ ...f, quantity_in_stock: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 }))} />
              </div>

              <div>
                <Label>{t('form.reorderLevel')}</Label>
                <Input type="number" min="0" placeholder="0"
                  value={form.reorder_level === 0 ? '' : form.reorder_level}
                  onChange={(e) => setForm((f) => ({ ...f, reorder_level: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 }))} />
              </div>

              <div>
                <Label>{t('form.avgDailyUsage')}</Label>
                <Input type="number" min="0" step="0.1"
                  value={form.avg_daily_usage ?? ''}
                  placeholder={t('form.avgDailyUsagePlaceholder')}
                  onChange={(e) => setForm((f) => ({ ...f, avg_daily_usage: e.target.value === '' ? null : parseFloat(e.target.value) }))} />
                <p className="text-[10px] text-muted-foreground mt-1">{t('form.avgDailyUsageHint')}</p>
              </div>

              <div>
                <Label>{t('form.expiryDate')}</Label>
                <Input type="date"
                  value={form.expiry_date ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, expiry_date: e.target.value || null }))} />
              </div>

              <div>
                <Label>{t('form.unitCost')}</Label>
                <Input type="number" min="0" step="0.01"
                  value={form.unit_cost ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, unit_cost: e.target.value === '' ? null : parseFloat(e.target.value) }))} />
              </div>

              <div className="col-span-2">
                <Label>{t('form.supplier')}</Label>
                <Input value={form.supplier ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, supplier: e.target.value || null }))} />
              </div>

              {/* ── Reuse & Sterilization ───────────────────────────────── */}
              <div className="col-span-2 border rounded-lg p-3 space-y-3 bg-muted/20">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {t('form.reuseSettings')}
                </p>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{t('form.isReusable')}</p>
                    <p className="text-[10px] text-muted-foreground">{t('form.isReusableHint')}</p>
                  </div>
                  <Switch
                    checked={form.is_reusable ?? false}
                    onCheckedChange={(v) => setForm((f) => ({ ...f, is_reusable: v, max_uses_per_unit: v ? f.max_uses_per_unit : null, requires_sterilization: v ? f.requires_sterilization : false }))}
                  />
                </div>

                {form.is_reusable && (
                  <>
                    <div>
                      <Label>{t('form.maxUsesPerUnit')}</Label>
                      <Input type="number" min="1"
                        value={form.max_uses_per_unit ?? ''}
                        placeholder={t('form.maxUsesPlaceholder')}
                        onChange={(e) => setForm((f) => ({ ...f, max_uses_per_unit: e.target.value === '' ? null : parseInt(e.target.value) }))} />
                      <p className="text-[10px] text-muted-foreground mt-1">{t('form.maxUsesHint')}</p>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{t('form.requiresSterilization')}</p>
                        <p className="text-[10px] text-muted-foreground">{t('form.sterilizationHint')}</p>
                      </div>
                      <Switch
                        checked={form.requires_sterilization ?? false}
                        onCheckedChange={(v) => setForm((f) => ({ ...f, requires_sterilization: v }))}
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="col-span-2">
                <Label>{t('form.notes')}</Label>
                <Textarea rows={2} value={form.notes ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value || null }))} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setFormOpen(false)} disabled={formSaving}>
              {t('form.cancel')}
            </Button>
            <Button onClick={handleFormSubmit} disabled={formSaving || !form.name.trim()}>
              {formSaving
                ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />{editingItem ? t('form.saving') : t('form.adding')}</>
                : editingItem ? t('form.save') : t('form.add')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Adjust Stock Dialog ───────────────────────────────────────────── */}
      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('adjust.title', { name: adjustingItem?.name })}</DialogTitle>
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
                <Select value={adjustInput.change_type}
                  onValueChange={(v) => setAdjustInput((a) => ({ ...a, change_type: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(['addition', 'deduction', 'adjustment', 'expired', 'damaged'] as const).map((ct) => (
                      <SelectItem key={ct} value={ct}>{t(`adjust.types.${ct}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('adjust.quantity')}</Label>
                <Input type="number" min="0" step="any"
                  value={adjustInput.quantity || ''}
                  placeholder={t('adjust.quantityPlaceholder')}
                  onChange={(e) => setAdjustInput((a) => ({ ...a, quantity: parseFloat(e.target.value) || 0 }))} />
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
                <Textarea rows={2} value={adjustInput.notes ?? ''}
                  placeholder={t('adjust.notesPlaceholder')}
                  onChange={(e) => setAdjustInput((a) => ({ ...a, notes: e.target.value || null }))} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAdjustOpen(false)} disabled={adjustSaving}>
              {t('adjust.cancel')}
            </Button>
            <Button onClick={handleAdjust} disabled={adjustSaving || adjustInput.quantity <= 0}>
              {adjustSaving
                ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />{t('adjust.applying')}</>
                : t('adjust.apply')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── History Dialog ────────────────────────────────────────────────── */}
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
                    {log.use_count_after != null && (
                      <p className="text-[10px] text-muted-foreground">
                        Use count: {log.use_count_before} → {log.use_count_after}
                      </p>
                    )}
                    {log.notes && <p className="text-xs text-muted-foreground mt-0.5">{log.notes}</p>}
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    {log.quantity_change !== 0 && (
                      <p className={`text-sm font-semibold tabular-nums ${log.quantity_change > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {log.quantity_change > 0 ? '+' : ''}{log.quantity_change} {logsItem?.unit}
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground">→ {log.quantity_after} {logsItem?.unit}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setLogsOpen(false)}>{t('logs.close')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm ────────────────────────────────────────────────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('delete.title', { name: deleteTarget?.name })}</AlertDialogTitle>
            <AlertDialogDescription>{t('delete.description')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t('delete.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting}
              className="bg-destructive hover:bg-destructive/90">
              {deleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {t('delete.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
