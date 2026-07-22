// src/components/rooms/RoomFloorPlan.tsx
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { BedDouble, Sparkles, Wrench, Lock, User, Stethoscope } from 'lucide-react';
import type { RoomWithBeds, ClinicBed, BedStatus, RoomStatus } from '@/hooks/useRoomBed';

export const BED_STATUS: Record<BedStatus, { i18nKey: string; dot: string; bg: string; border: string; icon: any; animate: string }> = {
  available:   { i18nKey: 'available',   dot: 'bg-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-400', icon: BedDouble, animate: '' },
  occupied:    { i18nKey: 'occupied',    dot: 'bg-rose-500',    bg: 'bg-rose-50 dark:bg-rose-950/30',       border: 'border-rose-400',    icon: User,      animate: 'animate-pulse' },
  reserved:    { i18nKey: 'reserved',    dot: 'bg-amber-400',   bg: 'bg-amber-50 dark:bg-amber-950/30',     border: 'border-amber-400',   icon: Lock,      animate: 'animate-bounce' },
  cleaning:    { i18nKey: 'cleaning',    dot: 'bg-sky-400',     bg: 'bg-sky-50 dark:bg-sky-950/30',         border: 'border-sky-400',     icon: Sparkles,  animate: 'animate-spin' },
  maintenance: { i18nKey: 'maintenance', dot: 'bg-slate-400',   bg: 'bg-slate-50 dark:bg-slate-950/30',     border: 'border-slate-400',   icon: Wrench,    animate: '' },
};

export const ROOM_STATUS_COLOR: Record<RoomStatus, string> = {
  available:   'bg-emerald-500',
  occupied:    'bg-rose-500',
  cleaning:    'bg-sky-400',
  maintenance: 'bg-slate-400',
  closed:      'bg-gray-700',
};

interface BedCellProps {
  bed: ClinicBed;
  canEdit: boolean;
  onBedClick: (bed: ClinicBed) => void;
}

function BedCell({ bed, canEdit, onBedClick }: BedCellProps) {
  const { t } = useTranslation('rooms');
  const cfg = BED_STATUS[bed.status];
  const Icon = cfg.icon;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => canEdit && onBedClick(bed)}
            disabled={!canEdit}
            className={cn(
              'relative flex flex-col items-center justify-center gap-1',
              'w-16 h-16 rounded-xl border-2 transition-all duration-300',
              'text-xs font-medium select-none',
              cfg.bg, cfg.border,
              canEdit ? 'cursor-pointer hover:scale-105 hover:shadow-md active:scale-95' : 'cursor-default',
            )}
          >
            <span className={cn('absolute top-1.5 right-1.5 w-2 h-2 rounded-full', cfg.dot, cfg.animate === 'animate-pulse' && cfg.animate)} />
            <Icon className={cn('w-5 h-5 text-current opacity-70', cfg.animate === 'animate-spin' && 'animate-spin-slow', cfg.animate === 'animate-bounce' && 'animate-bounce')} />
            <span className="leading-none opacity-80">{bed.bed_number}</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-0.5 text-xs">
            <p className="font-semibold">{t('bed')} {bed.bed_number}</p>
            <p className="text-muted-foreground">
              {t(`bedStatus.${cfg.i18nKey}`)} · {t(`bedType.${bed.bed_type}`, { defaultValue: bed.bed_type })}
            </p>
            {bed.current_assignment?.patient_name && (
              <p className="text-rose-600 font-medium">{t('tooltip.patient', { name: bed.current_assignment.patient_name })}</p>
            )}
            {bed.current_assignment?.doctor_name && (
              <p className="text-blue-600">{t('tooltip.doctor', { name: bed.current_assignment.doctor_name })}</p>
            )}
            {bed.notes && <p className="text-muted-foreground italic">{bed.notes}</p>}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface RoomCardProps {
  room: RoomWithBeds;
  canEdit: boolean;
  onBedClick: (bed: ClinicBed, room: RoomWithBeds) => void;
  onRoomEdit?: (room: RoomWithBeds) => void;
  onRoomDelete?: (room: RoomWithBeds) => void;
  onAddBed?: (room: RoomWithBeds) => void;
}

function RoomCard({ room, canEdit, onBedClick, onRoomEdit, onRoomDelete, onAddBed }: RoomCardProps) {
  const { t } = useTranslation('rooms');
  const isCabinet = room.room_type === 'consultation';
  const occupiedCount = room.beds.filter(b => b.status === 'occupied').length;
  const totalBeds = room.beds.length;
  const occupancyPct = totalBeds > 0 ? Math.round((occupiedCount / totalBeds) * 100) : 0;
  const cabinetBusy = isCabinet && room.status === 'occupied';

  return (
    <div
      className="relative rounded-2xl border border-border bg-card shadow-sm p-4 space-y-3 transition-shadow hover:shadow-md"
      style={{ borderLeftColor: room.color ?? '#6366f1', borderLeftWidth: 4 }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn('inline-block w-2.5 h-2.5 rounded-full shrink-0', ROOM_STATUS_COLOR[room.status])} />
            <h3 className="font-semibold text-sm leading-tight truncate">{room.name}</h3>
            {isCabinet && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-sky-400 text-sky-600 dark:text-sky-300">
                <Stethoscope className="w-2.5 h-2.5 mr-0.5" />
                {t('cabinet', 'Cabinet')}
              </Badge>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            {room.room_number && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">#{room.room_number}</Badge>
            )}
            {room.floor && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">{t('floor', { name: room.floor })}</Badge>
            )}
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
              {t(`roomType.${room.room_type}`, { defaultValue: room.room_type })}
            </Badge>
          </div>
          {room.primary_doctor_name && (
            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1 pt-0.5">
              <User className="w-3 h-3" />
              {t('primaryDoctorBadge', { name: room.primary_doctor_name })}
            </p>
          )}
          {room.notes && (
            <p className="text-[11px] text-muted-foreground italic pt-0.5 line-clamp-2">{room.notes}</p>
          )}
        </div>

        <div className="text-right shrink-0">
          {isCabinet ? (
            <Badge className={cn('text-[10px] px-2', cabinetBusy
              ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300')}>
              {cabinetBusy ? t('display.busy', 'In consultation') : t('display.free', 'Free')}
            </Badge>
          ) : (
            <>
              <p className="text-xs font-bold text-muted-foreground">{occupiedCount}/{totalBeds}</p>
              <p className="text-[10px] text-muted-foreground">{t('bedsLabel')}</p>
            </>
          )}
        </div>
      </div>

      {!isCabinet && totalBeds > 0 && (
        <div className="w-full h-1 rounded-full bg-muted overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              occupancyPct >= 90 ? 'bg-rose-500' : occupancyPct >= 60 ? 'bg-amber-400' : 'bg-emerald-500'
            )}
            style={{ width: `${occupancyPct}%` }}
          />
        </div>
      )}

      {!isCabinet && (room.beds.length > 0 ? (
        <div className="flex flex-wrap gap-2 pt-1">
          {room.beds.map(bed => (
            <BedCell key={bed.id} bed={bed} canEdit={canEdit} onBedClick={(b) => onBedClick(b, room)} />
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic py-2 text-center">{t('noBeds')}</p>
      ))}

      {canEdit && (onAddBed || onRoomEdit || onRoomDelete) && (
        <div className="flex gap-1.5 pt-1 border-t border-border/50">
          {onAddBed && !isCabinet && (
            <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={() => onAddBed(room)}>
              + {t('addBed')}
            </Button>
          )}
          {onRoomEdit && (
            <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={() => onRoomEdit(room)}>
              {t('edit')}
            </Button>
          )}
          {onRoomDelete && (
            <Button size="sm" variant="ghost" className="h-6 text-xs px-2 text-destructive hover:text-destructive" onClick={() => onRoomDelete(room)}>
              {t('delete')}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function Legend() {
  const { t } = useTranslation('rooms');
  return (
    <div className="flex flex-wrap gap-3 text-xs">
      {(Object.entries(BED_STATUS) as [BedStatus, (typeof BED_STATUS)[BedStatus]][]).map(([status, cfg]) => (
        <div key={status} className="flex items-center gap-1.5">
          <span className={cn('w-2.5 h-2.5 rounded-full', cfg.dot)} />
          <span className="text-muted-foreground">{t(`bedStatus.${cfg.i18nKey}`)}</span>
        </div>
      ))}
    </div>
  );
}

interface RoomFloorPlanProps {
  rooms: RoomWithBeds[];
  canEdit: boolean;
  onBedClick: (bed: ClinicBed, room: RoomWithBeds) => void;
  onRoomEdit?: (room: RoomWithBeds) => void;
  onRoomDelete?: (room: RoomWithBeds) => void;
  onAddBed?: (room: RoomWithBeds) => void;
}

export function RoomFloorPlan({ rooms, canEdit, onBedClick, onRoomEdit, onRoomDelete, onAddBed }: RoomFloorPlanProps) {
  const { t } = useTranslation('rooms');
  const groundLabel = t('floorGround');
  const floors = [...new Set(rooms.map(r => r.floor ?? groundLabel))].sort();

  if (rooms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
        <BedDouble className="w-12 h-12 text-muted-foreground/40" />
        <p className="text-muted-foreground text-sm">{t('noRooms')}</p>
        {canEdit && <p className="text-xs text-muted-foreground">{t('noRoomsHint')}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Legend />
      {floors.map(floor => {
        const floorRooms = rooms.filter(r => (r.floor ?? groundLabel) === floor);
        return (
          <div key={floor} className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-2">
                {t('floor', { name: floor })}
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {floorRooms.map(room => (
                <RoomCard
                  key={room.id}
                  room={room}
                  canEdit={canEdit}
                  onBedClick={onBedClick}
                  onRoomEdit={onRoomEdit}
                  onRoomDelete={onRoomDelete}
                  onAddBed={onAddBed}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
