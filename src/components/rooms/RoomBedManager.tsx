// src/components/rooms/RoomBedManager.tsx
// Main orchestrating component — used by clinic admin, doctor, and staff roles.
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRoomBed } from '@/hooks/useRoomBed';
import { RoomFloorPlan } from './RoomFloorPlan';
import { AddRoomModal } from './AddRoomModal';
import { AddBedModal } from './AddBedModal';
import { BedAssignmentModal } from './BedAssignmentModal';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  BedDouble, Plus, RefreshCw, List, LayoutGrid,
  CheckCircle2, AlertCircle, Sparkles, Wrench,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ClinicBed, RoomWithBeds, ClinicRoom, BedStatus } from '@/hooks/useRoomBed';

interface RoomBedManagerProps {
  practiceId: string;
  userId: string;
  role: 'admin' | 'doctor' | 'staff';
  doctorId?: string | null;
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: any; color: string }) {
  return (
    <Card className="border-none shadow-sm">
      <CardContent className="pt-4 pb-3 flex items-center gap-3">
        <div className={cn('p-2 rounded-xl', color)}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-2xl font-bold leading-none">{value}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

const BED_STATUS_COLORS: Record<BedStatus, string> = {
  available:   'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  occupied:    'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300',
  reserved:    'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  cleaning:    'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300',
  maintenance: 'bg-slate-100 text-slate-800 dark:bg-slate-900/40 dark:text-slate-300',
};

function ListView({ rooms, onBedClick, canEdit }: { rooms: RoomWithBeds[]; onBedClick: (b: ClinicBed, r: RoomWithBeds) => void; canEdit: boolean }) {
  const { t } = useTranslation('rooms');
  if (rooms.length === 0) return (
    <div className="flex flex-col items-center py-16 text-center gap-2">
      <BedDouble className="w-10 h-10 text-muted-foreground/40" />
      <p className="text-sm text-muted-foreground">{t('noRooms')}</p>
    </div>
  );

  return (
    <div className="space-y-4">
      {rooms.map(room => (
        <Card key={room.id} className="overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50 bg-muted/30"
            style={{ borderLeftColor: room.color ?? '#6366f1', borderLeftWidth: 4 }}>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{room.name}</p>
              <p className="text-xs text-muted-foreground">
                {t(`roomType.${room.room_type}`, { defaultValue: room.room_type })}
                {room.room_number ? ` · #${room.room_number}` : ''}
                {room.floor ? ` · ${t('floor', { name: room.floor })}` : ''}
                {room.primary_doctor_name ? ` · Dr. ${room.primary_doctor_name}` : ''}
              </p>
            </div>
            <Badge variant="outline" className="text-xs shrink-0">
              {t('occupiedFraction', {
                occupied: room.beds.filter(b => b.status === 'occupied').length,
                total: room.beds.length,
              })}
            </Badge>
          </div>
          {room.beds.length > 0 ? (
            <div className="divide-y divide-border/50">
              {room.beds.map(bed => (
                <div
                  key={bed.id}
                  className={cn('flex items-center gap-3 px-4 py-2.5 text-sm', canEdit && 'cursor-pointer hover:bg-muted/30 transition-colors')}
                  onClick={() => canEdit && onBedClick(bed, room)}
                >
                  <BedDouble className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="font-medium w-16">{t('bed')} {bed.bed_number}</span>
                  <span className="text-xs text-muted-foreground flex-1">{t(`bedType.${bed.bed_type}`, { defaultValue: bed.bed_type })}</span>
                  {bed.current_assignment?.patient_name && (
                    <span className="text-xs text-rose-600 dark:text-rose-400 truncate max-w-[120px]">
                      {bed.current_assignment.patient_name}
                    </span>
                  )}
                  <Badge className={cn('text-[10px] px-2', BED_STATUS_COLORS[bed.status])}>
                    {t(`bedStatus.${bed.status}`)}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="px-4 py-3 text-xs text-muted-foreground italic">{t('noBedsConfigured')}</p>
          )}
        </Card>
      ))}
    </div>
  );
}

export function RoomBedManager({ practiceId, userId, role, doctorId }: RoomBedManagerProps) {
  const { t } = useTranslation('rooms');
  const isAdmin = role === 'admin';
  const canEdit = role === 'admin' || role === 'staff';

  const { rooms, stats, loading, error, refresh, addRoom, updateRoom, deleteRoom, addBed, updateBedStatus, assignBed, unassignBed } =
    useRoomBed({ practiceId, role, doctorId });

  const [addRoomOpen, setAddRoomOpen]     = useState(false);
  const [addMode, setAddMode]             = useState<'room' | 'cabinet'>('room');
  const [editRoom, setEditRoom]           = useState<RoomWithBeds | null>(null);
  const [addBedRoom, setAddBedRoom]       = useState<RoomWithBeds | null>(null);
  const [selectedBed, setSelectedBed]     = useState<ClinicBed | null>(null);
  const [selectedRoom, setSelectedRoom]   = useState<RoomWithBeds | null>(null);
  const [view, setView]                   = useState<'floorplan' | 'list'>('floorplan');

  const handleBedClick = (bed: ClinicBed, room: RoomWithBeds) => {
    setSelectedBed(bed);
    setSelectedRoom(room);
  };

  const handleSaveRoom = async (data: Omit<ClinicRoom, 'id' | 'created_at' | 'updated_at'>) => {
    if (editRoom) await updateRoom(editRoom.id, data);
    else await addRoom(data);
    setEditRoom(null);
  };

  const handleDeleteRoom = async (room: RoomWithBeds) => {
    if (!window.confirm(t('deleteConfirm', { name: room.name }))) return;
    await deleteRoom(room.id);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <BedDouble className="w-5 h-5 text-primary" />
            {t('title')}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isAdmin ? t('subtitleAdmin') : t('subtitleViewer')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
            <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
            <span className="ml-1.5 hidden sm:inline">{t('refresh')}</span>
          </Button>
          {isAdmin && (
            <>
              <Button size="sm" variant="outline" onClick={() => { setAddMode('cabinet'); setAddRoomOpen(true); }}>
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                {t('addCabinet', 'Add Cabinet')}
              </Button>
              <Button size="sm" onClick={() => { setAddMode('room'); setAddRoomOpen(true); }}>
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                {t('addRoom')}
              </Button>
            </>
          )}
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label={t('stats.totalBeds')} value={stats.totalBeds}     icon={BedDouble}    color="bg-slate-500" />
        <StatCard label={t('stats.available')} value={stats.availableBeds} icon={CheckCircle2} color="bg-emerald-500" />
        <StatCard label={t('stats.occupied')}  value={stats.occupiedBeds}  icon={AlertCircle}  color="bg-rose-500" />
        <StatCard label={t('stats.cleaning')}  value={stats.cleaningBeds}  icon={Sparkles}     color="bg-sky-500" />
      </div>

      <Tabs value={view} onValueChange={v => setView(v as typeof view)}>
        <TabsList className="w-fit">
          <TabsTrigger value="floorplan" className="gap-1.5"><LayoutGrid className="w-3.5 h-3.5" />{t('view.floorPlan')}</TabsTrigger>
          <TabsTrigger value="list"      className="gap-1.5"><List      className="w-3.5 h-3.5" />{t('view.list')}</TabsTrigger>
        </TabsList>

        <TabsContent value="floorplan" className="mt-4">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-48 rounded-2xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : (
            <RoomFloorPlan
              rooms={rooms}
              canEdit={canEdit}
              onBedClick={handleBedClick}
              onRoomEdit={isAdmin ? setEditRoom : undefined}
              onRoomDelete={isAdmin ? handleDeleteRoom : undefined}
              onAddBed={isAdmin ? (r) => setAddBedRoom(r) : undefined}
            />
          )}
        </TabsContent>

        <TabsContent value="list" className="mt-4">
          {loading ? (
            <div className="space-y-3">
              {[...Array(2)].map((_, i) => <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />)}
            </div>
          ) : (
            <ListView rooms={rooms} canEdit={canEdit} onBedClick={handleBedClick} />
          )}
        </TabsContent>
      </Tabs>

      <AddRoomModal
        open={addRoomOpen || !!editRoom}
        onClose={() => { setAddRoomOpen(false); setEditRoom(null); }}
        onSave={handleSaveRoom}
        practiceId={practiceId}
        editRoom={editRoom}
      />

      {addBedRoom && (
        <AddBedModal
          open={!!addBedRoom}
          onClose={() => setAddBedRoom(null)}
          onSave={async (data) => { await addBed(data); setAddBedRoom(null); }}
          room={addBedRoom}
        />
      )}

      <BedAssignmentModal
        open={!!selectedBed}
        onClose={() => { setSelectedBed(null); setSelectedRoom(null); }}
        bed={selectedBed}
        room={selectedRoom}
        practiceId={practiceId}
        userId={userId}
        canAssign={canEdit}
        onAssign={assignBed}
        onUnassign={unassignBed}
        onStatusChange={updateBedStatus}
      />
    </div>
  );
}

export default RoomBedManager;
