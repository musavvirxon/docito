import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, Clock, TrendingUp, Activity } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useState } from "react";
import { useTranslation } from "react-i18next";

interface Service {
  id: string;
  name: string;
  bookings: number;
  completed: number;
  revenue: number;
  avgDuration: number;
  category: string;
  conversionRate: number;
}

interface PerformanceServicesProps {
  services: Service[];
}

export function PerformanceServices({ services }: PerformanceServicesProps) {
  const { t } = useTranslation("dashboard");
  const [sortBy, setSortBy] = useState<"bookings" | "revenue" | "conversionRate">("bookings");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const categories = ["all", ...Array.from(new Set(services.map((s) => s.category)))];

  const filteredServices = services
    .filter((s) => filterCategory === "all" || s.category === filterCategory)
    .sort((a, b) => {
      if (sortBy === "bookings") return b.bookings - a.bookings;
      if (sortBy === "revenue") return b.revenue - a.revenue;
      return b.conversionRate - a.conversionRate;
    });

  const topService = filteredServices[0];

  return (
    <div className="space-y-6">
      {/* Top Service Highlight */}
      {topService && (
        <Card className="border-primary">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">{t("doctor.performance.services.topPerforming")}</CardTitle>
                <p className="text-muted-foreground mt-1">{t("doctor.performance.services.mostBooked")}</p>
              </div>
              <Badge className="text-lg px-4 py-2">{t("doctor.performance.services.bestSeller")}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-2xl font-bold">{topService.name}</p>
                <p className="text-sm text-muted-foreground">{topService.category}</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">{topService.bookings}</p>
                <p className="text-sm text-muted-foreground">{t("doctor.performance.services.totalBookings")}</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-green-600">${topService.revenue.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">{t("doctor.performance.services.revenue")}</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-600">{topService.conversionRate.toFixed(1)}%</p>
                <p className="text-sm text-muted-foreground">{t("doctor.performance.services.completionRate")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">{t("doctor.performance.services.sortBy")}</label>
              <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bookings">{t("doctor.performance.services.mostBookedSort")}</SelectItem>
                  <SelectItem value="revenue">{t("doctor.performance.services.highestRevenue")}</SelectItem>
                  <SelectItem value="conversionRate">{t("doctor.performance.services.bestConversion")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">{t("doctor.performance.services.category")}</label>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat === "all" ? t("doctor.performance.services.allCategories") : cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Services Revenue Chart */}
      <Card>
        <CardHeader>
          <CardTitle>{t("doctor.performance.services.revenueByService")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={filteredServices.slice(0, 8)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip />
              <Bar
                dataKey="revenue"
                fill="hsl(var(--primary))"
                name={t("doctor.performance.services.revenueUsd")}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Services List */}
      <div className="grid grid-cols-1 gap-4">
        {filteredServices.map((service, index) => (
          <Card key={service.id}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">
                    #{index + 1}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{service.name}</h3>
                    <p className="text-sm text-muted-foreground">{service.category}</p>
                  </div>
                </div>
                <Badge variant={service.bookings > 10 ? "default" : "secondary"}>
                  {service.bookings > 10 ? t("doctor.performance.services.popular") : t("doctor.performance.services.standard")}
                </Badge>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">{t("doctor.performance.services.bookings")}</p>
                    <p className="text-lg font-bold">{service.bookings}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">{t("doctor.performance.services.revenue")}</p>
                    <p className="text-lg font-bold text-green-600">${service.revenue.toLocaleString()}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">{t("doctor.performance.services.avgDuration")}</p>
                    <p className="text-lg font-bold">
                      {service.avgDuration} {t("doctor.performance.services.minutes")}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">{t("doctor.performance.services.completion")}</p>
                    <p className="text-lg font-bold text-blue-600">{service.conversionRate.toFixed(1)}%</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div>
                    <p className="text-sm text-muted-foreground">{t("doctor.performance.services.completed")}</p>
                    <p className="text-lg font-bold">
                      {service.completed}/{service.bookings}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredServices.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Activity className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">{t("doctor.performance.services.noServicesFound")}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
