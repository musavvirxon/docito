import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Users, Search, Phone, Mail, Calendar, UserPlus, 
  ChevronRight, RefreshCw 
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useTranslation } from 'react-i18next';
import type { StaffPatient } from '@/hooks/useStaffDashboard';

interface PatientListSectionProps {
  patients: StaffPatient[];
  onRefresh: () => void;
  canManagePatients: boolean;
}

export const PatientListSection = ({ 
  patients, 
  onRefresh, 
  canManagePatients 
}: PatientListSectionProps) => {
  const { t } = useTranslation('dashboard');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPatients = patients.filter(patient =>
    patient.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    patient.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    patient.phone?.includes(searchQuery)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">{t('staff.patients.title', 'Patients')}</h2>
          <p className="text-muted-foreground">{t('staff.patients.subtitle', 'View and manage patient information')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onRefresh}>
            <RefreshCw className="w-4 h-4 mr-2" />
            {t('staff.patients.refresh', 'Refresh')}
          </Button>
          {canManagePatients && (
            <Button size="sm">
              <UserPlus className="w-4 h-4 mr-2" />
              {t('staff.patients.addPatient', 'Add Patient')}
            </Button>
          )}
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder={t('staff.patients.searchPlaceholder', 'Search patients...')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            {t('staff.patients.directory', 'Patient Directory')} ({filteredPatients.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredPatients.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>
                {searchQuery 
                  ? t('staff.patients.noMatch', 'No patients match your search') 
                  : t('staff.patients.noPatients', 'No patients found')}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPatients.map((patient) => (
                <div 
                  key={patient.id}
                  className="flex items-center justify-between p-4 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {patient.full_name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="font-semibold text-foreground">{patient.full_name}</h4>
                      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mt-1">
                        {patient.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {patient.phone}
                          </span>
                        )}
                        {patient.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {patient.email}
                          </span>
                        )}
                        {patient.last_visit && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {t('staff.patients.lastVisit', 'Last visit')}: {format(parseISO(patient.last_visit), 'MMM d, yyyy')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="capitalize">
                      {patient.status}
                    </Badge>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
