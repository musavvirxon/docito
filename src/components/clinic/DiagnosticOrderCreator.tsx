import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FlaskConical, 
  ScanLine, 
  Plus,
  Stethoscope
} from 'lucide-react';
import { useClinicLabOrders } from '@/hooks/useClinicLabOrders';
import { useClinicImagingOrders } from '@/hooks/useClinicImagingOrders';

interface DiagnosticOrderCreatorProps {
  clinicId: string;
  patientId: string;
  appointmentId?: string;
  hasLabService: boolean;
  hasImagingService: boolean;
  onSuccess?: () => void;
}

const LAB_TEST_TYPES = [
  { value: 'blood', label: 'Blood Test', tests: ['CBC', 'CMP', 'Lipid Panel', 'HbA1c', 'TSH', 'Liver Panel'] },
  { value: 'hormone', label: 'Hormone Panel', tests: ['Thyroid Panel', 'Cortisol', 'Testosterone', 'Estrogen', 'FSH/LH'] },
  { value: 'urinalysis', label: 'Urinalysis', tests: ['Routine UA', 'Urine Culture', 'Drug Screen'] },
  { value: 'microbiology', label: 'Microbiology', tests: ['Blood Culture', 'Stool Culture', 'Wound Culture'] },
  { value: 'other', label: 'Other', tests: ['Vitamin D', 'Iron Panel', 'B12/Folate'] },
];

const IMAGING_MODALITIES = [
  { value: 'xray', label: 'X-Ray', exams: ['Chest X-Ray', 'Abdominal X-Ray', 'Extremity X-Ray', 'Spine X-Ray'] },
  { value: 'ct', label: 'CT Scan', exams: ['CT Head', 'CT Chest', 'CT Abdomen/Pelvis', 'CT Spine'] },
  { value: 'mri', label: 'MRI', exams: ['MRI Brain', 'MRI Spine', 'MRI Knee', 'MRI Shoulder'] },
  { value: 'ultrasound', label: 'Ultrasound', exams: ['Abdominal US', 'Pelvic US', 'Thyroid US', 'Cardiac Echo'] },
  { value: 'cbct', label: 'CBCT (Dental)', exams: ['Full Jaw CBCT', 'Implant Planning', 'TMJ Study'] },
  { value: 'panoramic', label: 'Panoramic', exams: ['Full Mouth Panoramic', 'TMJ Panoramic'] },
];

export function DiagnosticOrderCreator({ 
  clinicId, 
  patientId, 
  appointmentId,
  hasLabService,
  hasImagingService,
  onSuccess 
}: DiagnosticOrderCreatorProps) {
  const { t } = useTranslation('clinic');
  const { createLabOrder, loading: labLoading } = useClinicLabOrders();
  const { createImagingOrder, loading: imagingLoading } = useClinicImagingOrders();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(hasLabService ? 'lab' : 'imaging');
  
  
  // Lab form state
  const [labForm, setLabForm] = useState({
    test_type: '',
    test_name: '',
    priority: 'routine',
    clinical_notes: '',
  });

  // Imaging form state
  const [imagingForm, setImagingForm] = useState({
    modality: '',
    exam_name: '',
    body_part: '',
    priority: 'routine',
    clinical_notes: '',
  });

  const selectedLabCategory = LAB_TEST_TYPES.find(t => t.value === labForm.test_type);
  const selectedImagingModality = IMAGING_MODALITIES.find(m => m.value === imagingForm.modality);

  const handleLabSubmit = async () => {
    const orderId = await createLabOrder({
      clinic_id: clinicId,
      patient_id: patientId,
      test_type: labForm.test_type,
      test_name: labForm.test_name,
      priority: labForm.priority,
      clinical_notes: labForm.clinical_notes,
      appointment_id: appointmentId,
    });

    if (orderId) {
      setIsOpen(false);
      setLabForm({ test_type: '', test_name: '', priority: 'routine', clinical_notes: '' });
      onSuccess?.();
    }
  };

  const handleImagingSubmit = async () => {
    const orderId = await createImagingOrder({
      clinic_id: clinicId,
      patient_id: patientId,
      modality: imagingForm.modality,
      exam_name: imagingForm.exam_name,
      body_part: imagingForm.body_part,
      priority: imagingForm.priority,
      clinical_notes: imagingForm.clinical_notes,
      appointment_id: appointmentId,
    });

    if (orderId) {
      setIsOpen(false);
      setImagingForm({ modality: '', exam_name: '', body_part: '', priority: 'routine', clinical_notes: '' });
      onSuccess?.();
    }
  };

  if (!hasLabService && !hasImagingService) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Stethoscope className="h-4 w-4 mr-2" />
          {t('orderCreator.trigger')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('orderCreator.title')}</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            {hasLabService && (
              <TabsTrigger value="lab" className="gap-2">
                <FlaskConical className="h-4 w-4" />
                {t('orderCreator.tabs.lab')}
              </TabsTrigger>
            )}
            {hasImagingService && (
              <TabsTrigger value="imaging" className="gap-2">
                <ScanLine className="h-4 w-4" />
                {t('orderCreator.tabs.imaging')}
              </TabsTrigger>
            )}
          </TabsList>

          {hasLabService && (
            <TabsContent value="lab" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>{t('orderCreator.fields.testCategory')}</Label>
                <Select
                  value={labForm.test_type}
                  onValueChange={(value) => setLabForm(prev => ({ ...prev, test_type: value, test_name: '' }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('orderCreator.fields.selectCategory')} />
                  </SelectTrigger>
                  <SelectContent>
                    {LAB_TEST_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedLabCategory && (
                <div className="space-y-2">
                  <Label>{t('orderCreator.fields.testName')}</Label>
                  <Select
                    value={labForm.test_name}
                    onValueChange={(value) => setLabForm(prev => ({ ...prev, test_name: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('orderCreator.fields.selectTest')} />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedLabCategory.tests.map(test => (
                        <SelectItem key={test} value={test}>
                          {test}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>{t('orderCreator.fields.priority')}</Label>
                <Select
                  value={labForm.priority}
                  onValueChange={(value) => setLabForm(prev => ({ ...prev, priority: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="routine">{t('orderCreator.priorities.routine')}</SelectItem>
                    <SelectItem value="urgent">{t('orderCreator.priorities.urgent')}</SelectItem>
                    <SelectItem value="stat">{t('orderCreator.priorities.stat')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t('orderCreator.fields.clinicalNotes')}</Label>
                <Textarea
                  value={labForm.clinical_notes}
                  onChange={(e) => setLabForm(prev => ({ ...prev, clinical_notes: e.target.value }))}
                  placeholder={t('orderCreator.fields.labNotesPlaceholder')}
                  rows={3}
                />
              </div>

              <Button 
                className="w-full" 
                onClick={handleLabSubmit}
                disabled={labLoading || !labForm.test_type || !labForm.test_name}
              >
                <FlaskConical className="h-4 w-4 mr-2" />
                {t('orderCreator.submitLab')}
              </Button>
            </TabsContent>
          )}

          {hasImagingService && (
            <TabsContent value="imaging" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>{t('orderCreator.fields.modality')}</Label>
                <Select
                  value={imagingForm.modality}
                  onValueChange={(value) => setImagingForm(prev => ({ ...prev, modality: value, exam_name: '' }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('orderCreator.fields.selectModality')} />
                  </SelectTrigger>
                  <SelectContent>
                    {IMAGING_MODALITIES.map(mod => (
                      <SelectItem key={mod.value} value={mod.value}>
                        {mod.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedImagingModality && (
                <div className="space-y-2">
                  <Label>{t('orderCreator.fields.exam')}</Label>
                  <Select
                    value={imagingForm.exam_name}
                    onValueChange={(value) => setImagingForm(prev => ({ ...prev, exam_name: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('orderCreator.fields.selectExam')} />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedImagingModality.exams.map(exam => (
                        <SelectItem key={exam} value={exam}>
                          {exam}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>{t('orderCreator.fields.bodyPart')}</Label>
                <Input
                  value={imagingForm.body_part}
                  onChange={(e) => setImagingForm(prev => ({ ...prev, body_part: e.target.value }))}
                  placeholder={t('orderCreator.fields.bodyPartPlaceholder')}
                />
              </div>

              <div className="space-y-2">
                <Label>{t('orderCreator.fields.priority')}</Label>
                <Select
                  value={imagingForm.priority}
                  onValueChange={(value) => setImagingForm(prev => ({ ...prev, priority: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="routine">{t('orderCreator.priorities.routine')}</SelectItem>
                    <SelectItem value="urgent">{t('orderCreator.priorities.urgent')}</SelectItem>
                    <SelectItem value="stat">{t('orderCreator.priorities.stat')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t('orderCreator.fields.clinicalNotes')}</Label>
                <Textarea
                  value={imagingForm.clinical_notes}
                  onChange={(e) => setImagingForm(prev => ({ ...prev, clinical_notes: e.target.value }))}
                  placeholder={t('orderCreator.fields.imagingNotesPlaceholder')}
                  rows={3}
                />
              </div>

              <Button 
                className="w-full" 
                onClick={handleImagingSubmit}
                disabled={imagingLoading || !imagingForm.modality || !imagingForm.exam_name}
              >
                <ScanLine className="h-4 w-4 mr-2" />
                {t('orderCreator.submitImaging')}
              </Button>
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
