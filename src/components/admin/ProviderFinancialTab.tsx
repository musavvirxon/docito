import { useFinancialStats } from "@/hooks/useFinancialStats";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ResponsiveContainer, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, Area } from "recharts";

type Props = { doctorId: string; doctorName?: string };

export default function ProviderFinancialTab({ doctorId }: Props) {
  const { stats, earningsHistory, serviceEarnings, pendingPayments, loading, error } = useFinancialStats(
    undefined,
    undefined,
    doctorId,
  );

  if (loading) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Loading financial data…</p>;
  }
  if (error) {
    return <p className="text-sm text-destructive py-8 text-center">{error}</p>;
  }

  const money = (n: number) => `$${Number(n || 0).toFixed(2)}`;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Earnings", value: money(stats.totalEarnings), hint: "All time revenue" },
          { label: "This Month", value: money(stats.earningsThisMonth), hint: `This week: ${money(stats.earningsThisWeek)}` },
          { label: "Unpaid Earnings", value: money(stats.unpaidEarnings), hint: "Pending appointments" },
          { label: "Net Earnings", value: money(stats.netEarnings), hint: "After 15% platform fee" },
        ].map((k) => (
          <Card key={k.label} className="rounded-xl">
            <CardContent className="pt-6">
              <p className="text-2xl font-bold">{k.value}</p>
              <p className="text-sm text-muted-foreground">{k.label}</p>
              <p className="text-xs text-muted-foreground mt-1">{k.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="rounded-xl">
        <CardHeader><CardTitle className="text-base">Payout Information</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-3 bg-muted/30 rounded-lg border border-border">
              <p className="text-sm text-muted-foreground">Payouts Processed</p>
              <p className="font-medium">{stats.payoutsProcessed}</p>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg border border-border">
              <p className="text-sm text-muted-foreground">Next Payout</p>
              <p className="font-medium">{stats.nextPayoutDate || "—"}</p>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg border border-border">
              <p className="text-sm text-muted-foreground">Platform Commission</p>
              <p className="font-medium">{money(stats.platformCommission)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-xl">
        <CardHeader><CardTitle className="text-base">Earnings Over Time</CardTitle></CardHeader>
        <CardContent>
          {earningsHistory.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={earningsHistory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Area type="monotone" dataKey="earnings" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">No earnings data in range</p>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-xl">
        <CardHeader><CardTitle className="text-base">By Service</CardTitle></CardHeader>
        <CardContent>
          {serviceEarnings.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No service revenue yet</p>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-4 gap-2 text-xs font-medium text-muted-foreground px-3 pb-2 border-b border-border">
                <span>Service</span><span>Bookings</span><span>Avg</span><span className="text-right">Revenue</span>
              </div>
              {serviceEarnings.map((s) => (
                <div key={s.serviceId} className="grid grid-cols-4 gap-2 p-3 bg-muted/30 rounded-lg border border-border items-center text-sm">
                  <span className="font-medium truncate">{s.serviceName}</span>
                  <span>{s.bookings}</span>
                  <span>{money(s.avgRevenue)}</span>
                  <span className="text-right font-medium">{money(s.totalRevenue)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            Pending Payments
            <Badge variant="secondary">{pendingPayments.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingPayments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No pending payments</p>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-5 gap-2 text-xs font-medium text-muted-foreground px-3 pb-2 border-b border-border">
                <span>Patient</span><span>Service</span><span>Amount</span><span>Date</span><span>Status</span>
              </div>
              {pendingPayments.map((p) => (
                <div key={p.appointmentId} className="grid grid-cols-5 gap-2 p-3 bg-muted/30 rounded-lg border border-border items-center text-sm">
                  <span className="truncate">{p.patientName}</span>
                  <span className="truncate">{p.serviceName}</span>
                  <span>{money(p.amount)}</span>
                  <span>{p.date}</span>
                  <Badge variant="outline" className="w-fit capitalize">{p.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
