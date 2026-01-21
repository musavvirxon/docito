import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Globe, Mail, MapPin, Phone } from "lucide-react";
import type { InsightData } from "@/components/super-admin/entityDetailTypes";

type Props = {
  entity: any;
  insights: InsightData | null | undefined;
  insightsLoading: boolean;
};

export default function EntityDetailOverviewTab({ entity, insights, insightsLoading }: Props) {
  const totalOrders = insights?.analytics?.total_orders ?? 0;
  const activeStaff = insights?.analytics?.active_staff ?? 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">
                {entity.address || "N/A"}, {entity.city}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">{entity.phone || "N/A"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">{entity.email || "N/A"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">{entity.website || "N/A"}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Status & Verification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Status</span>
              <Badge variant={entity.status === "active" ? "default" : "secondary"}>{entity.status || "pending"}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Verified</span>
              <Badge variant={entity.is_verified ? "default" : "outline"}>{entity.is_verified ? "Yes" : "No"}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">License #</span>
              <span className="text-sm font-mono">{entity.license_number || "N/A"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Created</span>
              <span className="text-sm">{new Date(entity.created_at).toLocaleDateString()}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Activity Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          {insightsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-[88px] w-full" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold">{totalOrders}</p>
                <p className="text-xs text-muted-foreground">Total Orders</p>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold">{activeStaff}</p>
                <p className="text-xs text-muted-foreground">Active Staff</p>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold">{entity.average_rating || "0.0"}</p>
                <p className="text-xs text-muted-foreground">Rating</p>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold">{entity.num_reviews || 0}</p>
                <p className="text-xs text-muted-foreground">Reviews</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
