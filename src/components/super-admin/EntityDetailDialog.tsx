import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, Users, FileText, Link2, CreditCard, ScrollText, MapPin, Phone, Mail, Globe, CheckCircle, Ban, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

interface EntityDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entity: any;
  entityType: 'clinic' | 'pharmacy' | 'laboratory' | 'imaging';
  onRefresh: () => void;
}

const EntityDetailDialog = ({ open, onOpenChange, entity, entityType, onRefresh }: EntityDetailDialogProps) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");

  const { data: auditLogs, isLoading: logsLoading } = useQuery({
    queryKey: ['entity-audit-logs', entity?.id],
    queryFn: async () => {
      if (!entity?.id) return [];
      const { data, error } = await supabase
        .from('entity_audit_logs')
        .select('*')
        .eq('entity_id', entity.id)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
    enabled: !!entity?.id && activeTab === 'audit',
  });

  const handleVerify = async () => {
    if (!entity) return;
    
    const tableMap = {
      clinic: 'practices',
      pharmacy: 'pharmacies',
      laboratory: 'lab_centers',
      imaging: 'imaging_centers',
    };
    
    const { error } = await supabase
      .from(tableMap[entityType] as any)
      .update({ is_verified: true, status: 'active' })
      .eq('id', entity.id);
    
    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: "Success", description: "Entity verified successfully" });
      onRefresh();
    }
  };

  const handleSuspend = async () => {
    if (!entity) return;
    
    const tableMap = {
      clinic: 'practices',
      pharmacy: 'pharmacies',
      laboratory: 'lab_centers',
      imaging: 'imaging_centers',
    };
    
    const { error } = await supabase
      .from(tableMap[entityType] as any)
      .update({ status: 'suspended' })
      .eq('id', entity.id);
    
    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: "Success", description: "Entity suspended" });
      onRefresh();
    }
  };

  if (!entity) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Building2 className="w-6 h-6 text-primary" />
              <DialogTitle className="text-xl">
                {entity.name || entity.practice_name || 'Entity Details'}
              </DialogTitle>
            </div>
            <div className="flex gap-2">
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
          <TabsList className="grid grid-cols-6 w-full">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="staff">Staff</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
            <TabsTrigger value="audit">Audit Logs</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{entity.address || 'N/A'}, {entity.city}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{entity.phone || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{entity.email || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{entity.website || 'N/A'}</span>
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
                    <Badge variant={entity.status === 'active' ? 'default' : 'secondary'}>
                      {entity.status || 'pending'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Verified</span>
                    <Badge variant={entity.is_verified ? 'default' : 'outline'}>
                      {entity.is_verified ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">License #</span>
                    <span className="text-sm font-mono">{entity.license_number || 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Created</span>
                    <span className="text-sm">{new Date(entity.created_at).toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Activity Metrics */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Activity Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-2xl font-bold">0</p>
                    <p className="text-xs text-muted-foreground">Total Orders</p>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-2xl font-bold">0</p>
                    <p className="text-xs text-muted-foreground">Active Staff</p>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-2xl font-bold">{entity.average_rating || '0.0'}</p>
                    <p className="text-xs text-muted-foreground">Rating</p>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-2xl font-bold">{entity.num_reviews || 0}</p>
                    <p className="text-xs text-muted-foreground">Reviews</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Staff Tab */}
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

          {/* Documents Tab */}
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

          {/* Integrations Tab */}
          <TabsContent value="integrations" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link2 className="w-5 h-5" />
                  Connected Services
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span>Doctor Referrals</span>
                    <Badge variant="outline">Not Connected</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span>Insurance Integration</span>
                    <Badge variant="outline">Not Connected</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span>Payment Gateway</span>
                    <Badge variant="outline">Not Connected</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Billing Tab */}
          <TabsContent value="billing" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Billing & Subscription
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Current Plan</p>
                    <p className="text-lg font-semibold">Free Trial</p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Staff Limit</p>
                    <p className="text-lg font-semibold">5 / 5</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Audit Logs Tab */}
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
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : auditLogs?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <ScrollText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>No audit logs yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {auditLogs?.map((log: any) => (
                      <div key={log.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <AlertCircle className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">{log.action}</p>
                            <p className="text-xs text-muted-foreground">{log.actor_email}</p>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(log.created_at).toLocaleString()}
                        </span>
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
};

export default EntityDetailDialog;