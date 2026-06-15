import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  FlaskConical, 
  ScanLine, 
  Settings2, 
  Users,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useClinicDepartments } from '@/hooks/useClinicDepartments';

interface ClinicServiceSettingsProps {
  clinicId: string;
  hasLabService: boolean;
  hasImagingService: boolean;
  onServiceToggle: (service: 'lab' | 'imaging', enabled: boolean) => void;
}

export function ClinicServiceSettings({ 
  clinicId, 
  hasLabService, 
  hasImagingService,
  onServiceToggle 
}: ClinicServiceSettingsProps) {
  const { t } = useTranslation('clinic');
  const { toggleService, loading } = useClinicDepartments();
  const [localLabEnabled, setLocalLabEnabled] = useState(hasLabService);
  const [localImagingEnabled, setLocalImagingEnabled] = useState(hasImagingService);

  const handleLabToggle = async (checked: boolean) => {
    setLocalLabEnabled(checked);
    const success = await toggleService(clinicId, 'lab', checked);
    if (success) {
      onServiceToggle('lab', checked);
    } else {
      setLocalLabEnabled(!checked);
    }
  };

  const handleImagingToggle = async (checked: boolean) => {
    setLocalImagingEnabled(checked);
    const success = await toggleService(clinicId, 'imaging', checked);
    if (success) {
      onServiceToggle('imaging', checked);
    } else {
      setLocalImagingEnabled(!checked);
    }
  };

  const noteItems = t('serviceSettings.notes.items', { returnObjects: true }) as string[];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings2 className="h-5 w-5" />
          {t('serviceSettings.title')}
        </CardTitle>
        <CardDescription>
          {t('serviceSettings.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Laboratory Service */}
        <div className="flex items-start justify-between p-4 border rounded-lg">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-full bg-blue-500/10">
              <FlaskConical className="h-6 w-6 text-blue-500" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Label htmlFor="lab-service" className="text-base font-medium">
                  {t('serviceSettings.lab.title')}
                </Label>
                {localLabEnabled && (
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    <CheckCircle className="h-3 w-3 mr-1" /> {t('serviceSettings.active')}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {t('serviceSettings.lab.description')}
              </p>
              {localLabEnabled && (
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {t('serviceSettings.lab.technicians')}
                  </span>
                  <span>•</span>
                  <span>{t('serviceSettings.lab.examples')}</span>
                </div>
              )}
            </div>
          </div>
          <Switch
            id="lab-service"
            checked={localLabEnabled}
            onCheckedChange={handleLabToggle}
            disabled={loading}
          />
        </div>

        {/* Imaging Service */}
        <div className="flex items-start justify-between p-4 border rounded-lg">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-full bg-purple-500/10">
              <ScanLine className="h-6 w-6 text-purple-500" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Label htmlFor="imaging-service" className="text-base font-medium">
                  {t('serviceSettings.imaging.title')}
                </Label>
                {localImagingEnabled && (
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    <CheckCircle className="h-3 w-3 mr-1" /> {t('serviceSettings.active')}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {t('serviceSettings.imaging.description')}
              </p>
              {localImagingEnabled && (
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {t('serviceSettings.imaging.technicians')}
                  </span>
                  <span>•</span>
                  <span>{t('serviceSettings.imaging.examples')}</span>
                </div>
              )}
            </div>
          </div>
          <Switch
            id="imaging-service"
            checked={localImagingEnabled}
            onCheckedChange={handleImagingToggle}
            disabled={loading}
          />
        </div>

        <Separator />

        <div className="bg-muted/50 p-4 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">{t('serviceSettings.notes.title')}</p>
              <ul className="list-disc list-inside space-y-1">
                {noteItems.map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
