// File: src/components/medication/MedicationReminderDashboard.tsx

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Clock,
  Pill,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Plus,
  Calendar,
  Bell,
  MoreHorizontal,
  RotateCcw,
} from "lucide-react";
import { useMedicationReminders, type MedicationReminder } from "@/hooks/useMedicationReminders";
import { format, isToday, isTomorrow, isYesterday } from "date-fns";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type AddMedicationForm = {
  name: string;
  dosage: string;
  route: string;
  frequency: string;
  instructions: string;
  start_date: string;
  end_date: string;
  reminder_enabled: boolean;
};

export const MedicationReminderDashboard = () => {
  const { t } = useTranslation("dashboard");
  const {
    todaysReminders,
    upcomingReminders,
    loading,
    markReminderAsTaken,
    markReminderAsSkipped,
    snoozeReminder,
    loadReminders,
    getPendingRemindersCount,
    getOverdueRemindersCount,
  } = useMedicationReminders();

  const [expandedReminder, setExpandedReminder] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<AddMedicationForm>(() => {
    const today = new Date().toISOString().split("T")[0];
    return {
      name: "",
      dosage: "",
      route: "oral",
      frequency: "once daily",
      instructions: "",
      start_date: today,
      end_date: "",
      reminder_enabled: true,
    };
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) return t("patient.medications.todaysReminders");
    if (isTomorrow(date)) return "Tomorrow";
    if (isYesterday(date)) return "Yesterday";
    return format(date, "MMM d");
  };

  const formatTime = (dateString: string) => {
    return format(new Date(dateString), "h:mm a");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "taken":
        return "bg-green-100 text-green-800 border-green-200";
      case "missed":
        return "bg-red-100 text-red-800 border-red-200";
      case "skipped":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "pending":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "taken":
        return <CheckCircle className="w-4 h-4" />;
      case "missed":
        return <XCircle className="w-4 h-4" />;
      case "skipped":
        return <AlertTriangle className="w-4 h-4" />;
      case "pending":
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getPendingCount = () => {
    return todaysReminders.filter((r) => r.status === "pending").length;
  };

  const getCompletedCount = () => {
    return todaysReminders.filter((r) => r.status === "taken").length;
  };

  const getCompletionPercentage = () => {
    if (todaysReminders.length === 0) return 0;
    return Math.round((getCompletedCount() / todaysReminders.length) * 100);
  };

  const ReminderCard = ({ reminder, showDate = false }: { reminder: MedicationReminder; showDate?: boolean }) => {
    const isExpanded = expandedReminder === reminder.id;
    const statusClasses = getStatusColor(reminder.status);

    const isPatientAdded =
      (reminder.medications?.doctor_id == null || reminder.medications?.doctor_id === "") &&
      (reminder.medications?.treatment_plan_id == null || reminder.medications?.treatment_plan_id === "");

    return (
      <Card className={cn("transition-all duration-200", isExpanded ? "shadow-md" : "hover:shadow-sm")}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Pill className="w-5 h-5 text-primary" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-medium truncate">{reminder.medications?.name || "Medication"}</h3>
                  <Badge variant="outline" className={cn("text-xs border", statusClasses)}>
                    <span className="flex items-center gap-1">
                      {getStatusIcon(reminder.status)}
                      {reminder.status}
                    </span>
                  </Badge>
                  {isPatientAdded && (
                    <Badge variant="secondary" className="text-xs">
                      Added by you
                    </Badge>
                  )}
                </div>

                <p className="text-sm text-muted-foreground mt-1">
                  {reminder.medications?.dosage || ""} {reminder.medications?.route ? `• ${reminder.medications.route}` : ""}
                </p>

                <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground flex-wrap">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{formatTime(reminder.reminder_time)}</span>
                  </div>
                  {showDate && (
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(reminder.reminder_time)}</span>
                    </div>
                  )}
                </div>

                {isExpanded && reminder.medications?.instructions && (
                  <div className="mt-3 p-3 bg-muted/40 rounded-lg">
                    <p className="text-sm text-muted-foreground">{reminder.medications.instructions}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {reminder.status === "pending" && (
                <>
                  <Button size="sm" onClick={() => void markReminderAsTaken(reminder.id)}>
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Taken
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => void snoozeReminder(reminder.id, 15)}>
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Snooze 15 min
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => void snoozeReminder(reminder.id, 60)}>
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Snooze 1 hour
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => void markReminderAsSkipped(reminder.id)}>
                        <XCircle className="w-4 h-4 mr-2" />
                        Skip
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpandedReminder(isExpanded ? null : reminder.id)}
              >
                <span className={cn("transition-transform", isExpanded && "rotate-90")}>›</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const resetForm = () => {
    const today = new Date().toISOString().split("T")[0];
    setForm({
      name: "",
      dosage: "",
      route: "oral",
      frequency: "once daily",
      instructions: "",
      start_date: today,
      end_date: "",
      reminder_enabled: true,
    });
  };

  const submitAddMedication = async () => {
    if (!form.name.trim() || !form.dosage.trim() || !form.frequency.trim() || !form.start_date.trim()) {
      toast.error("Please fill required fields");
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke<{
        ok: boolean;
        error?: string;
        medication?: any;
      }>("patient-self-service", {
        body: {
          action: "add_medication",
          payload: {
            name: form.name.trim(),
            dosage: form.dosage.trim(),
            route: form.route.trim() || "oral",
            frequency: form.frequency.trim(),
            instructions: form.instructions.trim() ? form.instructions.trim() : null,
            start_date: form.start_date,
            end_date: form.end_date.trim() ? form.end_date : null,
            reminder_enabled: form.reminder_enabled,
          },
        },
      });

      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Failed to add medication");

      toast.success("Medication added");
      setAddOpen(false);
      resetForm();
      await loadReminders();
    } catch (e: any) {
      toast.error(e?.message || "Failed to add medication");
    } finally {
      setSaving(false);
    }
  };

  const statsTitle = useMemo(() => {
    return {
      title: t("patient.medications.title") || "Medications",
      subtitle: t("patient.medications.subtitle") || "Track and manage your medication reminders",
    };
  }, [t]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-muted-foreground">Loading…</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold">{statsTitle.title}</h2>
          <p className="text-muted-foreground">{statsTitle.subtitle}</p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add medication
        </Button>
      </div>

      <Dialog open={addOpen} onOpenChange={(v) => (saving ? null : setAddOpen(v))}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add medication</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="med_name">Name *</Label>
              <Input
                id="med_name"
                value={form.name}
                onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                placeholder="e.g., Amoxicillin"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="med_dosage">Dosage *</Label>
                <Input
                  id="med_dosage"
                  value={form.dosage}
                  onChange={(e) => setForm((s) => ({ ...s, dosage: e.target.value }))}
                  placeholder="e.g., 500mg"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="med_route">Route</Label>
                <Input
                  id="med_route"
                  value={form.route}
                  onChange={(e) => setForm((s) => ({ ...s, route: e.target.value }))}
                  placeholder="e.g., oral"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="med_frequency">Frequency *</Label>
              <Input
                id="med_frequency"
                value={form.frequency}
                onChange={(e) => setForm((s) => ({ ...s, frequency: e.target.value }))}
                placeholder="e.g., once daily / twice daily"
              />
              <p className="text-xs text-muted-foreground">
                Tip: reminders auto-generate based on frequency (existing DB trigger).
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="med_start">Start date *</Label>
                <Input
                  id="med_start"
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm((s) => ({ ...s, start_date: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="med_end">End date</Label>
                <Input
                  id="med_end"
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm((s) => ({ ...s, end_date: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="med_instructions">Instructions</Label>
              <Textarea
                id="med_instructions"
                value={form.instructions}
                onChange={(e) => setForm((s) => ({ ...s, instructions: e.target.value }))}
                placeholder="e.g., Take after meals"
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <div className="text-sm font-medium">Enable reminders</div>
                <div className="text-xs text-muted-foreground">Generate reminders automatically</div>
              </div>
              <Switch
                checked={form.reminder_enabled}
                onCheckedChange={(v) => setForm((s) => ({ ...s, reminder_enabled: v }))}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                if (saving) return;
                setAddOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={() => void submitAddMedication()} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Header with Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Bell className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("patient.medications.pending")}</p>
                <p className="text-2xl font-bold">{getPendingCount()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("patient.medications.taken")}</p>
                <p className="text-2xl font-bold">{getCompletedCount()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("patient.medications.completionRate")}</p>
                <p className="text-2xl font-bold">{getCompletionPercentage()}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bar */}
      {todaysReminders.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Today's Progress</span>
              <span className="text-sm text-muted-foreground">
                {getCompletedCount()} of {todaysReminders.length} medications taken
              </span>
            </div>
            <Progress value={getCompletionPercentage()} className="h-2" />
          </CardContent>
        </Card>
      )}

      {/* Overdue Alert */}
      {getOverdueRemindersCount() > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <span className="font-medium">
              You have {getOverdueRemindersCount()} overdue medication
              {getOverdueRemindersCount() > 1 ? "s" : ""}.
            </span>{" "}
            Please take them as soon as possible or mark them as skipped if no longer needed.
          </AlertDescription>
        </Alert>
      )}

      {/* Medication Reminders Tabs */}
      <Tabs defaultValue="today" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="today">
            {t("patient.medications.todaysReminders")} ({todaysReminders.length})
          </TabsTrigger>
          <TabsTrigger value="upcoming">
            {t("patient.medications.upcomingReminders")} ({upcomingReminders.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="space-y-4">
          {todaysReminders.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Pill className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground mb-2">{t("patient.medications.noReminders")}</h3>
                <p className="text-sm text-muted-foreground">{t("patient.medications.addFirst")}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {todaysReminders.map((reminder) => (
                <ReminderCard key={reminder.id} reminder={reminder} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="upcoming" className="space-y-4">
          {upcomingReminders.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Calendar className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground mb-2">{t("patient.medications.noReminders")}</h3>
                <p className="text-sm text-muted-foreground">{t("patient.medications.addFirst")}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {upcomingReminders.map((reminder) => (
                <ReminderCard key={reminder.id} reminder={reminder} showDate />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
