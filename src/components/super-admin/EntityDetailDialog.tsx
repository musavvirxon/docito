import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Ban, Building2, CheckCircle, FileText, Link2, RefreshCw, ScrollText, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

import EntityDetailOverviewTab from "@/components/super-admin/EntityDetailOverviewTab";
import EntityDetailBillingTab from "@/components/super-admin/EntityDetailBillingTab";
import EntityDetailSettingsTab from "@/components/super-admin/EntityDetailSettingsTab";
import type { EntityType, InsightData } from "@/components/super-admin/entityDetailTypes";
import { planStaffLimit } from "@/components/super-admin/entityDetailTypes";

interface EntityDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entity: any;
  entityType: EntityType;
  onRefresh: () => void;
}

export default function EntityDetailDialog({ open, onOpenChange, entity, entityType, onRefresh }: EntityDetailDialogProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");

  if (!entity) return null;

  const entityName = entity?.name || entity?.practice_name || "Entity Details";

  const insightsEnabled = Boolean(entity?.id) && (activeTab === "overview" || activeTab === "billing" || activeTab === "settings");

  const {
    data: insights,
    isLoading: insightsLoading,
    refetch: refetchInsights,
    isFetching: insightsFetching,
  } = useQuery({
    queryKey: ["super-admin-entity-insights", entityType, entity?.id],
    enabled: insightsEnabled,
    queryFn: async (): Promise<InsightData | null> => {
      if (!entity?.id) return null;
      const { data, error } = await supabase.functions.invoke("super-admin-entity-insights", {
        body: { entityType, entityId: entity.id },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Failed to load insights");
      return data.data as InsightData;
    },
  });

  const { data: auditLogs, isLoading: logsLoading } = useQuery({
    queryKey: ["entity-audit-logs", entity?.id],
    queryFn: async () => {
      if (!entity?.id) return [];
      const { data, error } = await supabase
        .from("entity_audit_logs")
        .select("*")
        .eq("entity_id", entity.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
    enabled: !!entity?.id && activeTab === "audit",
  });

  const handleVerify = async () => {
    const tableMap: Partial<Record<EntityType, string>> = {
      clinic: "practices",
      practices: "practices",
      pharmacy: "pharmacies",
      laboratory: "lab_centers",
      imaging: "imaging_centers",
      doctors: "doctors",
      patients: "profiles",
      appointments: "appointments",
      payments: "billing_transactions",
    };
    const tableName = tableMap[entityType];
    if (!tableName) return;

    const updateFields: Record<string, any> = {};
    if (["practices", "pharmacies", "lab_centers", "imaging_centers"].includes(tableName)) {
      updateFields.verified = true;
      updateFields.verification_status = "approved";
    } else {
      updateFields.verified = true;
    }

    const { error } = await supabase
      .from(tableName as any)
      .update(updateFields)
      .eq("id", entity.id);

    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
      return;
    }

    toast({ title: "Success", description: "Entity verified successfully" });
    onRefresh();
    void refetchInsights();
  };

  const handleSuspend = async () => {
    const tableMap: Partial<Record<EntityType, string>> = {
      clinic: "practices",
      practices: "practices",
      pharmacy: "pharmacies",
      laboratory: "lab_centers",
      imaging: "imaging_centers",
      doctors: "doctors",
      patients: "profiles",
      appointments: "appointments",
      payments: "billing_transactions",
    };
    const tableName = tableMap[entityType];
    if (!tableName) return;

    const updateFields: Record<string, any> = {};
    if (["practices", "pharmacies", "lab_centers", "imaging_centers"].includes(tableName)) {
      updateFields.verified = false;
      updateFields.verification_status = "suspended";
    } else {
      updateFields.verified = false;
    }

    const { error } = await supabase
      .from(tableName as any)
      .update(updateFields)
      .eq("id", entity.id);

    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
      return;
    }

    toast({ title: "Success", description: "Entity suspended" });
    onRefresh();
    void refetchInsights();
  };

  const activeStaff = insights?.analytics?.active_staff ?? 0;
  const planCode = insights?.billing?.subscription?.plan?.code ?? null;
  const limit = planStaffLimit(planCode);
  const staffLimitPlaceholder = limit ? String(limit) : "Unlimited";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 min-w-0">
              <Building2 className="w-6 h-6 text-primary" />
              <DialogTitle className="text-xl truncate">{entityName}</DialogTitle>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" variant="outline" onClick={() => void refetchInsights()} disabled={insightsFetching}>
                <RefreshCw className={`w-4 h-4 mr-2 ${insightsFetching ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button size="sm" variant="outline" onClick={handleVerify}>
                <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                Verify
              </Button>
              <Button size="sm" variant="outline" onClick={handleSuspend}>
                <Ban className="w-4 h-4 mr-2 text-yellow-500" />
                Suspend
              </Button>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid grid-cols-7 w-full">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="staff">Staff</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="audit">Audit Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4">
            <EntityDetailOverviewTab entity={entity} insights={insights} insightsLoading={insightsLoading} />
          </TabsContent>

          <TabsContent value="staff" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Staff Members
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>Staff management coming soon</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Verification Documents
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>No documents uploaded</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="integrations" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link2 className="w-5 h-5" />
                  Connected Integrations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium">API Access</p>
                      <p className="text-sm text-muted-foreground">Webhook & API endpoints</p>
                    </div>
                    <Badge variant="outline">Coming soon</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium">Payments Provider</p>
                      <p className="text-sm text-muted-foreground">Stripe integration</p>
                    </div>
                    <Badge variant="outline">Coming soon</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="billing" className="mt-4">
            <EntityDetailBillingTab insights={insights} insightsLoading={insightsLoading} activeStaff={activeStaff} />
          </TabsContent>

          <TabsContent value="settings" className="mt-4">
            <EntityDetailSettingsTab
              entityType={entityType}
              entityId={entity.id}
              entityName={entityName}
              staffLimitPlaceholder={staffLimitPlaceholder}
            />
          </TabsContent>

          <TabsContent value="audit" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ScrollText className="w-5 h-5" />
                  Audit Logs
                </CardTitle>
              </CardHeader>
              <CardContent>
                {logsLoading ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full" />
                    ))}
                  </div>
                ) : auditLogs?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>No audit logs found</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {auditLogs.map((log: any) => (
                      <div key={log.id} className="p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-medium truncate">{log.action}</p>
                            <p className="text-sm text-muted-foreground truncate">{log.details || ""}</p>
                          </div>
                          <p className="text-xs text-muted-foreground whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
