// File: src/pages/AdminDashboardPage.tsx

import { useMemo } from "react";
import { Loader2, Users, Calendar, DollarSign, Star, MapPin, Mail } from "lucide-react";
import { useAdminDashboard } from "@/hooks/useAdminDashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsGrid, type StatItem } from "@/components/dashboard/StatsGrid";
import PendingInvitationsSection from "@/components/dashboard/PendingInvitationsSection";
import PracticeAnalyticsSection from "@/components/dashboard/PracticeAnalyticsSection";

export default function AdminDashboardPage() {
  const { practice, stats, loading, error, refreshData } = useAdminDashboard();

  const statItems = useMemo<StatItem[]>(() => {
    return [
      {
        label: "Total Bookings",
        value: stats.totalBookings,
        icon: <Calendar className="h-5 w-5" />,
        color: "info",
      },
      {
        label: "Total Patients",
        value: stats.totalPatients,
        icon: <Users className="h-5 w-5" />,
        color: "primary",
      },
      {
        label: "Total Revenue",
        value: new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(Number(stats.totalRevenue || 0) / 100),
        icon: <DollarSign className="h-5 w-5" />,
        color: "success",
      },
      {
        label: "Clinic Rating",
        value: stats.clinicRating ? Number(stats.clinicRating).toFixed(1) : "—",
        icon: <Star className="h-5 w-5" />,
        color: "warning",
        description: "Average rating",
      },
    ];
  }, [stats]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading dashboard…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Admin Dashboard</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-muted-foreground">{error}</div>
            <button
              type="button"
              className="text-sm text-primary underline"
              onClick={() => void refreshData()}
            >
              Retry
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!practice) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Admin Dashboard</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            No practice is linked to this account.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold truncate">{practice.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            {practice.city || practice.country ? (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {[practice.city, practice.country].filter(Boolean).join(", ")}
              </span>
            ) : null}
            {practice.email ? (
              <span className="inline-flex items-center gap-1">
                <Mail className="h-4 w-4" />
                {practice.email}
              </span>
            ) : null}
          </div>
        </div>

        <button
          type="button"
          className="text-sm text-primary underline"
          onClick={() => void refreshData()}
        >
          Refresh
        </button>
      </div>

      <StatsGrid stats={statItems} columns={4} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PendingInvitationsSection practiceId={practice.id} />

        <Card>
          <CardHeader>
            <CardTitle>Locations</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {stats.locations || 0} location{(stats.locations || 0) === 1 ? "" : "s"} configured.
          </CardContent>
        </Card>
      </div>

      <PracticeAnalyticsSection practiceId={practice.id} />
    </div>
  );
}
