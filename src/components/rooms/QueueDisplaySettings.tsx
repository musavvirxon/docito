import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Monitor, Plus, Trash2, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface QueueDisplaySettingsProps {
  practiceId: string;
  userId: string;
}

interface RoomOption {
  id: string;
  name: string;
}

interface DoctorToday {
  doctorId: string;
  doctorName: string;
  roomId: string | null;
}

interface DisplayRow {
  id: string;
  label: string;
  token: string;
  roomId: string | null;
  isActive: boolean;
  lastSeenAt: string | null;
}

const todayISO = () => new Date().toISOString().split("T")[0];

export function QueueDisplaySettings({ practiceId, userId }: QueueDisplaySettingsProps) {
  const { t } = useTranslation("rooms");
  const [rooms, setRooms] = useState<RoomOption[]>([]);
  const [doctorsToday, setDoctorsToday] = useState<DoctorToday[]>([]);
  const [displays, setDisplays] = useState<DisplayRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingDoctorId, setSavingDoctorId] = useState<string | null>(null);
  const [creatingDisplay, setCreatingDisplay] = useState(false);

  const load = useCallback(async () => {
    if (!practiceId) return;
    setLoading(true);
    const today = todayISO();

    const [{ data: roomRows }, { data: aptRows }, { data: displayRows }] = await Promise.all([
      supabase.from("clinic_rooms").select("id, name").eq("practice_id", practiceId).order("name"),
      supabase
        .from("appointments")
        .select("doctor_id, room_id, doctors!inner(id, profiles:user_id(full_name))")
        .eq("practice_id", practiceId)
        .eq("appointment_date", today)
        .eq("appointment_type", "in_person"),
      supabase
        .from("clinic_displays")
        .select("id, label, token, room_id, is_active, last_seen_at")
        .eq("practice_id", practiceId)
        .order("created_at", { ascending: false }),
    ]);

    setRooms((roomRows || []).map((r: any) => ({ id: r.id, name: r.name })));

    const byDoctor = new Map<string, DoctorToday>();
    (aptRows || []).forEach((a: any) => {
      if (!byDoctor.has(a.doctor_id)) {
        byDoctor.set(a.doctor_id, {
          doctorId: a.doctor_id,
          doctorName: a.doctors?.profiles?.full_name || "—",
          roomId: a.room_id,
        });
      }
    });
    setDoctorsToday(Array.from(byDoctor.values()));

    setDisplays(
      (displayRows || []).map((d: any) => ({
        id: d.id,
        label: d.label,
        token: d.token,
        roomId: d.room_id,
        isActive: d.is_active,
        lastSeenAt: d.last_seen_at,
      })),
    );
    setLoading(false);
  }, [practiceId]);

  useEffect(() => {
    load();
  }, [load]);

  const assignRoom = async (doctorId: string, roomId: string) => {
    setSavingDoctorId(doctorId);
    const { error } = await supabase
      .from("appointments")
      .update({ room_id: roomId || null })
      .eq("practice_id", practiceId)
      .eq("doctor_id", doctorId)
      .eq("appointment_date", todayISO());

    if (error) {
      toast.error(t("display.assignError", "Couldn't update the room"));
    } else {
      toast.success(t("display.assignSuccess", "Room updated for today"));
      setDoctorsToday((prev) =>
        prev.map((d) => (d.doctorId === doctorId ? { ...d, roomId: roomId || null } : d)),
      );
    }
    setSavingDoctorId(null);
  };

  const addDisplay = async () => {
    setCreatingDisplay(true);
    const { error } = await supabase.from("clinic_displays").insert({
      practice_id: practiceId,
      label: t("display.defaultLabel", "Waiting room display"),
      created_by: userId,
    });

    if (error) {
      toast.error(t("display.createError", "Couldn't create the display"));
    } else {
      await load();
    }
    setCreatingDisplay(false);
  };

  const revokeDisplay = async (id: string) => {
    const { error } = await supabase.from("clinic_displays").update({ is_active: false }).eq("id", id);
    if (error) {
      toast.error(t("display.revokeError", "Couldn't revoke the display"));
    } else {
      toast.success(t("display.revokeSuccess", "Display disconnected"));
      await load();
    }
  };

  const displayUrl = (token: string) => `${window.location.origin}/display/${token}`;

  const copyLink = async (token: string) => {
    await navigator.clipboard.writeText(displayUrl(token));
    toast.success(t("display.linkCopied", "Link copied"));
  };

  if (loading) {
    return <div className="p-6 text-muted-foreground">{t("display.loading", "Loading...")}</div>;
  }

  const activeDisplays = displays.filter((d) => d.isActive);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("display.roomsToday", "Today's room assignments")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {doctorsToday.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {t("display.noDoctorsToday", "No in-person appointments scheduled today.")}
            </p>
          )}
          {doctorsToday.map((doc) => (
            <div key={doc.doctorId} className="flex items-center justify-between gap-4 border-b pb-3 last:border-0">
              <span className="font-medium">{doc.doctorName}</span>
              <Select
                value={doc.roomId || ""}
                onValueChange={(value) => assignRoom(doc.doctorId, value)}
                disabled={savingDoctorId === doc.doctorId}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder={t("display.pickRoom", "Pick a room")} />
                </SelectTrigger>
                <SelectContent>
                  {rooms.map((room) => (
                    <SelectItem key={room.id} value={room.id}>
                      {room.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>{t("display.pairedDisplays", "Paired displays")}</CardTitle>
          <Button size="sm" onClick={addDisplay} disabled={creatingDisplay}>
            <Plus className="h-4 w-4 mr-2" />
            {t("display.addDisplay", "Add display")}
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {activeDisplays.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {t("display.noDisplays", "No screens paired yet. Add one, then open the link on your TV or monitor.")}
            </p>
          )}
          {activeDisplays.map((display) => {
            const isOnline = display.lastSeenAt
              ? Date.now() - new Date(display.lastSeenAt).getTime() < 60_000
              : false;

            return (
              <div key={display.id} className="flex items-center justify-between gap-3 border-b pb-3 last:border-0">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Monitor className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="font-medium truncate">{display.label}</span>
                    {isOnline ? (
                      <Badge variant="outline" className="text-emerald-600 border-emerald-300">
                        {t("display.online", "Online")}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        {t("display.offline", "Offline")}
                      </Badge>
                    )}
                  </div>
                  <Input
                    readOnly
                    value={displayUrl(display.token)}
                    className="mt-2 text-xs"
                    onFocus={(e) => e.target.select()}
                  />
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button size="icon" variant="outline" onClick={() => copyLink(display.token)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="outline" onClick={() => revokeDisplay(display.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
