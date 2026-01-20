import { useMemo, useState } from "react";
import { Loader2, Users, Calendar, DollarSign, Star, MapPin, Mail } from "lucide-react";
import { useAdminDashboard } from "@/hooks/useAdminDashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsGrid, type StatItem } from "@/components/dashboard/StatsGrid";
import PendingInvitationsSection from "@/components/dashboard/PendingInvitationsSection";
import PracticeAnalyticsSection from "@/components/dashboard/PracticeAnalyticsSection";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ClinicBillingSection from "@/components/dashboard/ClinicBillingSection";
import EntitySettingsPage from "@/components/settings/EntitySettingsPage";

export default function AdminDashboardPage() {
  const { practice, stats, loading, error, refreshData } = useAdminDashboard();
  const [tab, setTab] = useState<string>("overview");

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
        <div className="flex items-center gap-
