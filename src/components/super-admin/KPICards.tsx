import { TrendingUp, TrendingDown } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface KPI {
  title: string;
  value: number;
  trend: number;
  prefix?: string;
  suffix?: string;
}

const KPICards = () => {
  const [kpis, setKpis] = useState<KPI[]>([
    { title: "Total Doctors", value: 0, trend: 0 },
    { title: "Total Patients", value: 0, trend: 0 },
    { title: "Total Practices", value: 0, trend: 0 },
    { title: "Revenue", value: 0, trend: 0, prefix: "$" },
    { title: "Appointments", value: 0, trend: 0 },
    { title: "Payouts", value: 0, trend: 0, prefix: "$" },
  ]);

  useEffect(() => {
    const fetchKPIs = async () => {
      try {
        // Fetch doctors count
        const { count: doctorsCount } = await supabase
          .from("doctors")
          .select("*", { count: "exact", head: true });

        // Fetch patients count
        const { count: patientsCount } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("role", "patient");

        // Fetch practices count
        const { count: practicesCount } = await supabase
          .from("practices")
          .select("*", { count: "exact", head: true });

        // Fetch appointments count
        const { count: appointmentsCount } = await supabase
          .from("appointments")
          .select("*", { count: "exact", head: true });

        // Fetch payments sum
        const { data: paymentsData } = await supabase
          .from("payments")
          .select("amount");
        
        const totalRevenue = paymentsData?.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) || 0;

        setKpis([
          { title: "Total Doctors", value: doctorsCount || 0, trend: 4.3 },
          { title: "Total Patients", value: patientsCount || 0, trend: 12.5 },
          { title: "Total Practices", value: practicesCount || 0, trend: 2.1 },
          { title: "Revenue", value: totalRevenue, trend: 8.7, prefix: "$" },
          { title: "Appointments", value: appointmentsCount || 0, trend: 6.2 },
          { title: "Payouts", value: totalRevenue * 0.85, trend: 5.4, prefix: "$" },
        ]);
      } catch (error) {
        console.error("Error fetching KPIs:", error);
      }
    };

    fetchKPIs();
  }, []);

  const formatValue = (kpi: KPI) => {
    const value = kpi.value;
    if (kpi.prefix === "$") {
      return `$${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    }
    return value.toLocaleString();
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {kpis.map((kpi, index) => (
        <div
          key={index}
          className="bg-card border-2 border-border rounded-lg p-6 hover:border-primary transition-all duration-200 dark:hover:shadow-glow-blue border-t-4"
        >
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground font-medium">{kpi.title}</p>
            <p className="text-4xl font-bold text-foreground">{formatValue(kpi)}</p>
            <div className="flex items-center gap-2">
              {kpi.trend >= 0 ? (
                <TrendingUp className="w-4 h-4 text-green-500" />
              ) : (
                <TrendingDown className="w-4 h-4 text-destructive" />
              )}
              <span
                className={`text-sm font-medium ${
                  kpi.trend >= 0 ? "text-green-500" : "text-destructive"
                }`}
              >
                {kpi.trend >= 0 ? "+" : ""}
                {kpi.trend}%
              </span>
              <span className="text-xs text-muted-foreground">vs last month</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default KPICards;
