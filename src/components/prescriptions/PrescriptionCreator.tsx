import { useState } from 'react';
import { usePrescriptions, PrescriptionItem } from '@/hooks/usePrescriptions';
import { usePrescriptionTemplates, PrescriptionTemplate } from '@/hooks/usePrescriptionTemplates';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, Trash2, Pill, Send, BookmarkPlus, Bookmark } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { downloadPrescriptionPdf } from '@/lib/api/prescription-api';

interface Props {
  patientId: string;
  doctorId: string;
  appointmentId?: string;
  onSuccess?: (prescriptionId: string) => void;
}

const FREQUENCY_KEYS = ['once_daily','twice_daily','three_times_daily','four_times_daily','every_6_hours','every_8_hours','every_12_hours','as_needed','weekly'] as const;
const UNIT_KEYS = ['tablets','capsules','ml','mg','drops','puffs','patches'] as const;

export default function PrescriptionCreator({ patientId, doctorId, appointmentId, onSuccess }: Props) {
  const { t } = useTranslation('prescriptions');
  const { createPrescription } = usePrescriptions();
  const { templates, saveTemplate, deleteTemplate } = usePrescriptionTemplates(doctorId);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [items, setItems] = useState<Partial<PrescriptionItem>[]>([{
    medication_name: '',
    dosage: '',
    frequency: 'once_daily',
    quantity: 30,
    unit: 'tablets',
    instructions: '',
    substitutions_allowed: true,
  }]);

  const [refills, setRefills] = useState(0);
  const [notes, setNotes] = useState('');

  // Template UI state
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [saveOpen, setSaveOpen] = useState(false);
  const [tplName, setTplName] = useState('');
  const [tplDescription, setTplDescription] = useState('');
  const [tplShared, setTplShared] = useState(false);
  const [savingTpl, setSavingTpl] = useState(false);

  const applyTemplate = (tpl: PrescriptionTemplate) => {
    if (!tpl) return;
    const meds = (tpl.medications || []).map((m) => ({
      medication_name: m.medication_name || '',
      medication_code: m.medication_code || '',
      dosage: m.dosage || '',
      frequency: m.frequency || 'once_daily',
      quantity: typeof m.quantity === 'number' ? m.quantity : 30,
      unit: m.unit || 'tablets',
      instructions: m.instructions || '',
      substitutions_allowed: m.substitutions_allowed ?? true,
    }));
    setItems(meds.length ? meds : items);
    setRefills(tpl.refills ?? 0);
    setNotes(tpl.notes ?? '');
    toast.success(t('creator.templates.applied', { defaultValue: 'Template applied' }));
  };

  const handleSaveTemplate = async () => {
    if (!tplName.trim()) {
      toast.error(t('creator.templates.nameRequired', { defaultValue: 'Name is required' }));
      return;
    }
    setSavingTpl(true);
    const created = await saveTemplate({
      name: tplName,
      description: tplDescription,
      notes,
      refills,
      is_shared: tplShared,
      medications: items.map((i) => ({
        medication_name: i.medication_name || '',
        medication_code: (i as any).medication_code || '',
        dosage: i.dosage || '',
        frequency: i.frequency || 'once_daily',
        quantity: typeof i.quantity === 'number' ? i.quantity : Number(i.quantity) || 0,
        unit: i.unit || 'tablets',
        instructions: i.instructions || '',
        substitutions_allowed: i.substitutions_allowed ?? true,
      })),
    });
    setSavingTpl(false);
    if (created) {
      setSaveOpen(false);
      setTplName('');
      setTplDescription('');
      setTplShared(false);
    }
  };

  const addItem = () => {
    setItems([...items, {
      medication_name: '',
      dosage: '',
      frequency: 'once_daily',
      quantity: 30,
      unit: 'tablets',
      instructions: '',
      substitutions_allowed: true,
    }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof PrescriptionItem, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const handleSubmit = async () => {
    if (!patientId?.trim() || !doctorId?.trim()) {
      toast.error(t('creator.missingInfo'));
      return;
    }

    // Validate items
    const validItems = items.filter(item => 
      item.medication_name && item.dosage && item.frequency && item.quantity
    );

    if (validItems.length === 0) {
      toast.error(t('creator.atLeastOne'));
      return;
    }

    setIsSubmitting(true);
    try {
      const prescriptionId = await createPrescription(
        patientId,
        doctorId,
        validItems.map((item) => ({
          ...item,
          medication_name: item.medication_name?.trim() || '',
          medication_code: item.medication_code?.trim() || undefined,
          dosage: item.dosage?.trim() || '',
          instructions: item.instructions?.trim() || undefined,
        })) as PrescriptionItem[],
        refills,
        notes || undefined,
        appointmentId,
      );
      
      if (prescriptionId && onSuccess) {
        onSuccess(prescriptionId);
      }

      // Auto-download the prescription PDF
      if (prescriptionId) {
        try {
          await downloadPrescriptionPdf(prescriptionId);
        } catch {
          // non-critical — PDF failure should not block the success flow
        }
      }
      
      // Reset form
      setItems([{
        medication_name: '',
        dosage: '',
        frequency: 'once_daily',
        quantity: 30,
        unit: 'tablets',
        instructions: '',
        substitutions_allowed: true,
      }]);
      setRefills(0);
      setNotes('');
    } catch (error) {
      // Error handled by hook
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Pill className="h-5 w-5" />
          {t('creator.title')}
        </CardTitle>
        <CardDescription>
          {t('creator.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Templates */}
        <div className="flex flex-col sm:flex-row gap-2 sm:items-end p-3 rounded-lg border bg-muted/30">
          <div className="flex-1 space-y-1">
            <Label className="text-xs">
              {t('creator.templates.label', { defaultValue: 'Use a template' })}
            </Label>
            <div className="flex gap-2">
              <Select
                value={selectedTemplateId}
                onValueChange={(v) => {
                  setSelectedTemplateId(v);
                  const tpl = templates.find((x) => x.id === v);
                  if (tpl) applyTemplate(tpl);
                }}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue
                    placeholder={t('creator.templates.placeholder', {
                      defaultValue: templates.length ? 'Choose a saved template…' : 'No saved templates',
                    })}
                  />
                </SelectTrigger>
                <SelectContent>
                  {templates.length === 0 && (
                    <div className="px-3 py-2 text-xs text-muted-foreground">
                      {t('creator.templates.empty', { defaultValue: 'No templates yet' })}
                    </div>
                  )}
                  {templates.map((tpl) => (
                    <SelectItem key={tpl.id} value={tpl.id}>
                      {tpl.name}
                      {tpl.is_shared ? ' · shared' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedTemplateId && (() => {
                const tpl = templates.find((x) => x.id === selectedTemplateId);
                if (!tpl || tpl.doctor_id !== doctorId) return null;
                return (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    title={t('creator.templates.delete', { defaultValue: 'Delete template' })}
                    onClick={async () => {
                      const ok = window.confirm(
                        t('creator.templates.deleteConfirm', { defaultValue: 'Delete this template?' }),
                      );
                      if (!ok) return;
                      const done = await deleteTemplate(selectedTemplateId);
                      if (done) setSelectedTemplateId('');
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                );
              })()}
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setSaveOpen(true)}
          >
            <BookmarkPlus className="h-4 w-4 mr-2" />
            {t('creator.templates.save', { defaultValue: 'Save as template' })}
          </Button>
        </div>

        <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                <Bookmark className="h-4 w-4 inline mr-2" />
                {t('creator.templates.saveTitle', { defaultValue: 'Save prescription template' })}
              </DialogTitle>
              <DialogDescription>
                {t('creator.templates.saveDescription', {
                  defaultValue:
                    'Save the current medications, refills and notes as a reusable template you can apply to any future patient.',
                })}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>{t('creator.templates.name', { defaultValue: 'Name' })}</Label>
                <Input
                  value={tplName}
                  onChange={(e) => setTplName(e.target.value)}
                  placeholder="e.g. Strep throat — adult"
                />
              </div>
              <div className="space-y-1">
                <Label>{t('creator.templates.description', { defaultValue: 'Description (optional)' })}</Label>
                <Textarea
                  value={tplDescription}
                  onChange={(e) => setTplDescription(e.target.value)}
                  rows={2}
                />
              </div>
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <Label className="text-sm">
                    {t('creator.templates.share', { defaultValue: 'Share with my practice' })}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {t('creator.templates.shareHint', {
                      defaultValue: 'Other doctors in your practice can apply this template.',
                    })}
                  </p>
                </div>
                <Switch checked={tplShared} onCheckedChange={setTplShared} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setSaveOpen(false)} disabled={savingTpl}>
                {t('creator.cancel', { defaultValue: 'Cancel' })}
              </Button>
              <Button onClick={handleSaveTemplate} disabled={savingTpl}>
                {savingTpl
                  ? t('creator.templates.saving', { defaultValue: 'Saving…' })
                  : t('creator.templates.save', { defaultValue: 'Save template' })}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Medication Items */}
        <div className="space-y-4">
          {items.map((item, index) => (
            <div key={index} className="border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">{t('creator.medication', { n: index + 1 })}</h4>
                {items.length > 1 && (
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => removeItem(index)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('creator.medicationName')}</Label>
                  <Input
                    value={item.medication_name}
                    onChange={(e) => updateItem(index, 'medication_name', e.target.value)}
                    placeholder={t('creator.medicationNamePlaceholder')}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('creator.medicationCode')}</Label>
                  <Input
                    value={item.medication_code || ''}
                    onChange={(e) => updateItem(index, 'medication_code', e.target.value)}
                    placeholder={t('creator.medicationCodePlaceholder')}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>{t('creator.dosage')}</Label>
                  <Input
                    value={item.dosage}
                    onChange={(e) => updateItem(index, 'dosage', e.target.value)}
                    placeholder={t('creator.dosagePlaceholder')}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('creator.frequency')}</Label>
                  <Select
                    value={item.frequency}
                    onValueChange={(value) => updateItem(index, 'frequency', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FREQUENCY_KEYS.map((key) => (
                        <SelectItem key={key} value={key}>
                          {t(`creator.frequencies.${key}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label>{t('creator.quantity')}</Label>
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('creator.unit')}</Label>
                    <Select
                      value={item.unit || 'tablets'}
                      onValueChange={(value) => updateItem(index, 'unit', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {UNIT_KEYS.map((key) => (
                          <SelectItem key={key} value={key}>
                            {t(`creator.units.${key}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t('creator.instructions')}</Label>
                <Input
                  value={item.instructions || ''}
                  onChange={(e) => updateItem(index, 'instructions', e.target.value)}
                  placeholder={t('creator.instructionsPlaceholder')}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>{t('creator.allowSubs')}</Label>
                  <p className="text-xs text-muted-foreground">
                    {t('creator.allowSubsHint')}
                  </p>
                </div>
                <Switch
                  checked={item.substitutions_allowed ?? true}
                  onCheckedChange={(checked) => updateItem(index, 'substitutions_allowed', checked)}
                />
              </div>
            </div>
          ))}

          <Button variant="outline" onClick={addItem} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            {t('creator.addAnother')}
          </Button>
        </div>

        {/* Prescription Options */}
        <div className="border-t pt-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('creator.refills')}</Label>
              <Select
                value={refills.toString()}
                onValueChange={(value) => setRefills(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[0, 1, 2, 3, 4, 5, 6, 11].map((num) => (
                    <SelectItem key={num} value={num.toString()}>
                      {t('creator.refillsCount', { count: num })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('creator.additionalNotes')}</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('creator.notesPlaceholder')}
              rows={3}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4 pt-4 border-t">
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              t('creator.creating')
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                {t('creator.createPrescription')}
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
