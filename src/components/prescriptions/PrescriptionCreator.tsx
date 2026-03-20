import { useState } from 'react';
import { usePrescriptions, PrescriptionItem } from '@/hooks/usePrescriptions';
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
import { Plus, Trash2, Pill, Send } from 'lucide-react';
import { toast } from 'sonner';
import { downloadPrescriptionPdf } from '@/lib/api/prescription-api';

interface Props {
  patientId: string;
  doctorId: string;
  onSuccess?: (prescriptionId: string) => void;
}

const FREQUENCIES = [
  { value: 'once_daily', label: 'Once daily' },
  { value: 'twice_daily', label: 'Twice daily' },
  { value: 'three_times_daily', label: 'Three times daily' },
  { value: 'four_times_daily', label: 'Four times daily' },
  { value: 'every_6_hours', label: 'Every 6 hours' },
  { value: 'every_8_hours', label: 'Every 8 hours' },
  { value: 'every_12_hours', label: 'Every 12 hours' },
  { value: 'as_needed', label: 'As needed (PRN)' },
  { value: 'weekly', label: 'Once weekly' },
];

const UNITS = [
  { value: 'tablets', label: 'Tablets' },
  { value: 'capsules', label: 'Capsules' },
  { value: 'ml', label: 'mL' },
  { value: 'mg', label: 'mg' },
  { value: 'drops', label: 'Drops' },
  { value: 'puffs', label: 'Puffs' },
  { value: 'patches', label: 'Patches' },
];

export default function PrescriptionCreator({ patientId, doctorId, onSuccess }: Props) {
  const { createPrescription } = usePrescriptions();
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
      toast.error('Missing patient or doctor information');
      return;
    }

    // Validate items
    const validItems = items.filter(item => 
      item.medication_name && item.dosage && item.frequency && item.quantity
    );

    if (validItems.length === 0) {
      toast.error('Please add at least one medication');
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
        notes || undefined
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
          Create Prescription
        </CardTitle>
        <CardDescription>
          Add medications and create a new prescription for the patient
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Medication Items */}
        <div className="space-y-4">
          {items.map((item, index) => (
            <div key={index} className="border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Medication {index + 1}</h4>
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
                  <Label>Medication Name *</Label>
                  <Input
                    value={item.medication_name}
                    onChange={(e) => updateItem(index, 'medication_name', e.target.value)}
                    placeholder="e.g., Amoxicillin"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Medication Code</Label>
                  <Input
                    value={item.medication_code || ''}
                    onChange={(e) => updateItem(index, 'medication_code', e.target.value)}
                    placeholder="Optional NDC/code"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Dosage *</Label>
                  <Input
                    value={item.dosage}
                    onChange={(e) => updateItem(index, 'dosage', e.target.value)}
                    placeholder="e.g., 500mg"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Frequency *</Label>
                  <Select
                    value={item.frequency}
                    onValueChange={(value) => updateItem(index, 'frequency', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FREQUENCIES.map((freq) => (
                        <SelectItem key={freq.value} value={freq.value}>
                          {freq.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label>Quantity *</Label>
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Unit</Label>
                    <Select
                      value={item.unit || 'tablets'}
                      onValueChange={(value) => updateItem(index, 'unit', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {UNITS.map((unit) => (
                          <SelectItem key={unit.value} value={unit.value}>
                            {unit.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Instructions</Label>
                <Input
                  value={item.instructions || ''}
                  onChange={(e) => updateItem(index, 'instructions', e.target.value)}
                  placeholder="e.g., Take with food"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Allow Substitutions</Label>
                  <p className="text-xs text-muted-foreground">
                    Allow pharmacy to substitute generic equivalents
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
            Add Another Medication
          </Button>
        </div>

        {/* Prescription Options */}
        <div className="border-t pt-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Number of Refills</Label>
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
                      {num} refill{num !== 1 ? 's' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Additional Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional instructions or notes for the pharmacist..."
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
              'Creating...'
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Create Prescription
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
