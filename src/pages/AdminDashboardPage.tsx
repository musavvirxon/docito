// PATH: src/pages/AdminDashboardPage.tsx
import { useEffect } from "react";
import { useAdminDashboard } from "@/hooks/useAdminDashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, RefreshCcw } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function AdminDashboardPage() {
  const { t } = useTranslation('dashboard');
  const { practice, stats, doctors, appointments, services, staff, locations, patients, payments, messages, metrics, loading, error, refreshData } =
    useAdminDashboard();

  useEffect(() => {
    // no-op: hook loads on mount
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin" />
          <div className="text-sm text-muted-foreground">Loading dashboard…</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 space-y-4">
        <Alert variant="destructive">
          <AlertTitle>Failed to load dashboard</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={refreshData} variant="outline" className="gap-2">
          <RefreshCcw className="h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }

  if (!practice) {
    return (
      <div className="p-6 space-y-4">
        <Alert>
          <AlertTitle>No clinic found for this account</AlertTitle>
          <AlertDescription>
            This clinic admin user is not linked to a Practice yet. Please ensure the Practice has <b>admin_id</b> set to this user,
            or add this user as <b>practice_staff</b> with status <b>active</b>.
          </AlertDescription>
        </Alert>
        <Button onClick={refreshData} variant="outline" className="gap-2">
          <RefreshCcw className="h-4 w-4" />
          Refresh
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">{practice?.name || "Clinic Dashboard"}</h1>
          <div className="text-sm text-muted-foreground">
            Practice ID: <span className="font-mono">{practice?.id}</span>
          </div>
        </div>
        <Button onClick={refreshData} variant="outline" className="gap-2">
          <RefreshCcw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Total Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{stats.totalBookings}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Total Patients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{stats.totalPatients}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{stats.totalRevenue}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Clinic Rating</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{stats.clinicRating}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pending Invites</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{stats.pendingInvites}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Locations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{stats.locations}</div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Lists */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            {appointments.length === 0 ? (
              <div className="text-sm text-muted-foreground">No recent appointments.</div>
            ) : (
              <div className="space-y-2">
                {appointments.slice(0, 8).map((a: any) => (
                  <div key={a.id || `${a.patient_id}-${a.appointment_date}-${a.start_time}`} className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{a.patient_name || a.patient_full_name || "Patient"}</div>
                      <div className="text-xs text-muted-foreground">
                        {String(a.appointment_date || "")} • {String(a.start_time || "")} • {String(a.status || "")}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground truncate max-w-[40%]">{a.doctor_name || a.doctor_full_name || ""}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance (30 days)</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">Average Rating</div>
              <div className="text-sm font-medium">{metrics.averageRating}</div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">Patient Retention</div>
              <div className="text-sm font-medium">{metrics.patientRetention}%</div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">Avg Lead Time</div>
              <div className="text-sm font-medium">{metrics.avgWaitTime} min</div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">No-show / Cancel Rate</div>
              <div className="text-sm font-medium">{metrics.noShowRate}%</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Counts */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Doctors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{doctors.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Staff</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{staff.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Services</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{services.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Messages</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{messages.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Patients (listed)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{patients.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{payments.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Locations (rows)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{locations.length}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
