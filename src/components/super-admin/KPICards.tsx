import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Building2, Calendar, DollarSign, Loader2, Hospital, CheckCircle } from "lucide-react";
import { useDashboardStats } from "@/hooks/useSuperAdminData";

const KPICards = () => {
  const { data: stats, isLoading } = useDashboardStats();

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Loading...</CardTitle>
            </CardHeader>
            <CardContent>
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const kpis = [
    {
      title: "Total Patients",
      value: stats?.totalPatients.toLocaleString() || "0",
      subtitle: "Registered users",
      icon: Users,
      color: "text-blue-500",
    },
    {
      title: "Total Clinics",
      value: stats?.totalClinics.toLocaleString() || "0",
      subtitle: `${stats?.verifiedClinics || 0} verified`,
      icon: Building2,
      color: "text-green-500",
    },
    {
      title: "Total Doctors",
      value: stats?.totalDoctors.toLocaleString() || "0",
      subtitle: `${stats?.verifiedDoctors || 0} verified`,
      icon: Hospital,
      color: "text-purple-500",
    },
    {
      title: "Total Appointments",
      value: stats?.totalAppointments.toLocaleString() || "0",
      subtitle: `${stats?.completedAppointments || 0} completed`,
      icon: Calendar,
      color: "text-orange-500",
    },
    {
      title: "Total Revenue",
      value: `$${(stats?.totalRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      subtitle: "All time earnings",
      icon: DollarSign,
      color: "text-emerald-500",
    },
    {
      title: "Pending Verifications",
      value: ((stats?.pendingClinics || 0) + (stats?.pendingDoctors || 0)).toString(),
      subtitle: `${stats?.pendingClinics || 0} clinics, ${stats?.pendingDoctors || 0} doctors`,
      icon: CheckCircle,
      color: "text-yellow-500",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {kpis.map((kpi) => (
        <Card key={kpi.title} className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
            <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpi.value}</div>
            <p className="text-xs text-muted-foreground mt-1">{kpi.subtitle}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default KPICards;
