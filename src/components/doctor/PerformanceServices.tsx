import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, Clock, TrendingUp, Activity, ArrowUpDown } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useState } from "react";
import { useTranslation } from 'react-i18next';

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
  const [sortBy, setSortBy] = useState<'bookings' | 'revenue' | 'conversionRate'>('bookings');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const categories = ['all', ...Array.from(new Set(services.map(s => s.category)))];

  const filteredServices = services
    .filter(s => filterCategory === 'all' || s.category === filterCategory)
    .sort((a, b) => {
      if (sortBy === 'bookings') return b.bookings - a.bookings;
      if (sortBy === 'revenue') return b.revenue - a.revenue;
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
                <CardTitle className="text-xl">🏆 Top Performing Service</CardTitle>
                <p className="text-muted-foreground mt-1">Your most booked service</p>
              </div>
              <Badge className="text-lg px-4 py-2">Best Seller</Badge>
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
                <p className="text-sm text-muted-foreground">Total Bookings</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-green-600">${topService.revenue.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Revenue</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-600">{topService.conversionRate.toFixed(1)}%</p>
                <p className="text-sm text-muted-foreground">Completion Rate</p>
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
              <label className="text-sm font-medium mb-2 block">Sort By</label>
              <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bookings">Most Booked</SelectItem>
                  <SelectItem value="revenue">Highest Revenue</SelectItem>
                  <SelectItem value="conversionRate">Best Conversion</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Category</label>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>
                      {cat === 'all' ? 'All Categories' : cat}
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
          <CardTitle>Revenue by Service</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={filteredServices.slice(0, 8)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="revenue" fill="hsl(var(--primary))" name="Revenue ($)" />
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
                  {service.bookings > 10 ? 'Popular' : 'Standard'}
                </Badge>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Bookings</p>
                    <p className="text-lg font-bold">{service.bookings}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Revenue</p>
                    <p className="text-lg font-bold text-green-600">${service.revenue.toLocaleString()}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Avg. Duration</p>
                    <p className="text-lg font-bold">{service.avgDuration} min</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Completion</p>
                    <p className="text-lg font-bold text-blue-600">{service.conversionRate.toFixed(1)}%</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Completed</p>
                    <p className="text-lg font-bold">{service.completed}/{service.bookings}</p>
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
              <p className="text-muted-foreground">No services found for this category</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
