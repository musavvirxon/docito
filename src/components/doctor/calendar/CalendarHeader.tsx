import { memo } from 'react';
import { format, addDays, subDays, addWeeks, subWeeks, addMonths, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar, Search, Filter, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import type { CalendarView, CalendarFilters, AppointmentType, AppointmentStatus } from './types';

interface CalendarHeaderProps {
  selectedDate: Date;
  view: CalendarView;
  filters: CalendarFilters;
  onDateChange: (date: Date) => void;
  onViewChange: (view: CalendarView) => void;
  onFiltersChange: (filters: CalendarFilters) => void;
  onToday: () => void;
  onAddAppointment: () => void;
  onBlockTime: () => void;
  onSetAvailability: () => void;
}

const appointmentTypes: { value: AppointmentType; label: string }[] = [
  { value: 'in_person', label: 'In-Person' },
  { value: 'video', label: 'Video Call' },
  { value: 'home_visit', label: 'Home Visit' },
  { value: 'messaging', label: 'Chat' },
  { value: 'follow_up', label: 'Follow-Up' },
];

const statuses: { value: AppointmentStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'completed', label: 'Completed' },
  { value: 'canceled', label: 'Canceled' },
  { value: 'no_show', label: 'No Show' },
];

const CalendarHeader = memo(({
  selectedDate,
  view,
  filters,
  onDateChange,
  onViewChange,
  onFiltersChange,
  onToday,
  onAddAppointment,
  onBlockTime,
  onSetAvailability,
}: CalendarHeaderProps) => {
  const { t } = useTranslation('dashboard');

  const navigatePrev = () => {
    switch (view) {
      case 'day':
        onDateChange(subDays(selectedDate, 1));
        break;
      case 'week':
        onDateChange(subWeeks(selectedDate, 1));
        break;
      case 'month':
        onDateChange(subMonths(selectedDate, 1));
        break;
    }
  };

  const navigateNext = () => {
    switch (view) {
      case 'day':
        onDateChange(addDays(selectedDate, 1));
        break;
      case 'week':
        onDateChange(addWeeks(selectedDate, 1));
        break;
      case 'month':
        onDateChange(addMonths(selectedDate, 1));
        break;
    }
  };

  const getDateLabel = () => {
    switch (view) {
      case 'day':
        return format(selectedDate, 'EEEE, MMMM d, yyyy');
      case 'week':
        return `${format(selectedDate, 'MMM d')} - ${format(addDays(selectedDate, 6), 'MMM d, yyyy')}`;
      case 'month':
        return format(selectedDate, 'MMMM yyyy');
    }
  };

  const toggleFilter = <T extends AppointmentType | AppointmentStatus>(
    array: T[],
    value: T,
    key: 'appointmentTypes' | 'statuses'
  ) => {
    const newArray = array.includes(value)
      ? array.filter(v => v !== value)
      : [...array, value];
    onFiltersChange({ ...filters, [key]: newArray });
  };

  const activeFiltersCount = filters.appointmentTypes.length + filters.statuses.length + filters.sources.length;

  return (
    <div className="space-y-4">
      {/* Top Row: Date Navigation + View Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Date Navigation */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={navigatePrev}
            className="h-9 w-9 rounded-full hover:bg-muted/80 transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>

          <AnimatePresence mode="wait">
            <motion.div
              key={selectedDate.toISOString() + view}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
              className="min-w-[200px] text-center"
            >
              <h2 className="text-lg font-semibold tracking-tight">{getDateLabel()}</h2>
            </motion.div>
          </AnimatePresence>

          <Button
            variant="ghost"
            size="icon"
            onClick={navigateNext}
            className="h-9 w-9 rounded-full hover:bg-muted/80 transition-colors"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onToday}
            className="ml-2 h-8 px-3 text-xs font-medium"
          >
            {t('doctor.calendar.today', 'Today')}
          </Button>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg">
          {(['day', 'week', 'month'] as CalendarView[]).map((v) => (
            <Button
              key={v}
              variant={view === v ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onViewChange(v)}
              className={`h-8 px-4 text-xs font-medium transition-all ${
                view === v
                  ? 'shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t(`doctor.calendar.views.${v}`, v.charAt(0).toUpperCase() + v.slice(1))}
            </Button>
          ))}
        </div>
      </div>

      {/* Bottom Row: Search, Filters, Quick Actions */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('doctor.calendar.searchPlaceholder', 'Search patient or notes...')}
            value={filters.searchQuery}
            onChange={(e) => onFiltersChange({ ...filters, searchQuery: e.target.value })}
            className="pl-9 h-9 bg-background/50 border-border/50"
          />
        </div>

        {/* Filters Popover */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-2"
            >
              <Filter className="h-4 w-4" />
              {t('doctor.calendar.filters', 'Filters')}
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-80">
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-sm mb-2">
                  {t('doctor.calendar.appointmentType', 'Appointment Type')}
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {appointmentTypes.map((type) => (
                    <div key={type.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={type.value}
                        checked={filters.appointmentTypes.includes(type.value)}
                        onCheckedChange={() => toggleFilter(filters.appointmentTypes, type.value, 'appointmentTypes')}
                      />
                      <Label htmlFor={type.value} className="text-sm cursor-pointer">
                        {type.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium text-sm mb-2">
                  {t('doctor.calendar.status', 'Status')}
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {statuses.map((status) => (
                    <div key={status.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={status.value}
                        checked={filters.statuses.includes(status.value)}
                        onCheckedChange={() => toggleFilter(filters.statuses, status.value, 'statuses')}
                      />
                      <Label htmlFor={status.value} className="text-sm cursor-pointer">
                        {status.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="show-buffers"
                    checked={filters.showBuffers}
                    onCheckedChange={(checked) => 
                      onFiltersChange({ ...filters, showBuffers: !!checked })
                    }
                  />
                  <Label htmlFor="show-buffers" className="text-sm cursor-pointer flex items-center gap-2">
                    {filters.showBuffers ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    {t('doctor.calendar.showBuffers', 'Show buffers')}
                  </Label>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <div className="flex-1" />

        {/* Quick Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onBlockTime}
            className="h-9"
          >
            {t('doctor.calendar.blockTime', 'Block Time')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onSetAvailability}
            className="h-9"
          >
            {t('doctor.calendar.setAvailability', 'Set Availability')}
          </Button>
          <Button
            size="sm"
            onClick={onAddAppointment}
            className="h-9 gap-2"
          >
            <Calendar className="h-4 w-4" />
            {t('doctor.calendar.addAppointment', 'Add Appointment')}
          </Button>
        </div>
      </div>
    </div>
  );
});

CalendarHeader.displayName = 'CalendarHeader';

export default CalendarHeader;
