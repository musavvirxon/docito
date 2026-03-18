import { useState } from "react";
import { motion } from "framer-motion";
import { Building2, Pill, FlaskConical, Scan, Search, Filter, Eye, CheckCircle, XCircle, Ban, MoreVertical } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import EntityDetailDialog from "./EntityDetailDialog";
import { toast } from "sonner";

interface EntityManagementProps {
  entityType: 'clinic' | 'pharmacy' | 'laboratory' | 'imaging' | 'doctors' | 'practices' | 'patients' | 'appointments' | 'payments';
}

const entityConfig: Record<string, {
  title: string;
  subtitle: string;
  icon: typeof Building2;
  table: string;
  color: string;
  nameField?: string;
}> = {
  clinic: {
    title: "Clinics Management",
    subtitle: "Manage all registered medical practices",
    icon: Building2,
    table: "practices",
    color: "text-blue-500",
  },
  practices: {
    title: "Practices Management",
    subtitle: "Manage all registered medical practices",
    icon: Building2,
    table: "practices",
    color: "text-blue-500",
  },
  pharmacy: {
    title: "Pharmacies Management",
    subtitle: "Manage all registered pharmacies",
    icon: Pill,
    table: "pharmacies",
    color: "text-green-500",
  },
  laboratory: {
    title: "Laboratories Management",
    subtitle: "Manage all registered diagnostic labs",
    icon: FlaskConical,
    table: "lab_centers",
    color: "text-purple-500",
  },
  imaging: {
    title: "Imaging Centers Management",
    subtitle: "Manage all registered imaging facilities",
    icon: Scan,
    table: "imaging_centers",
    color: "text-orange-500",
  },
  doctors: {
    title: "Doctors Management",
    subtitle: "Manage all registered doctors",
    icon: Building2,
    table: "doctors",
    color: "text-indigo-500",
    nameField: "specialty",
  },
  patients: {
    title: "Patients Management",
    subtitle: "Manage all registered patients",
    icon: Building2,
    table: "profiles",
    color: "text-teal-500",
    nameField: "full_name",
  },
  appointments: {
    title: "Appointments Management",
    subtitle: "View all appointments across the platform",
    icon: Building2,
    table: "appointments",
    color: "text-cyan-500",
    nameField: "appointment_type",
  },
  payments: {
    title: "Payments Management",
    subtitle: "View all billing transactions",
    icon: Building2,
    table: "billing_transactions",
    color: "text-amber-500",
    nameField: "transaction_type",
  },
};

const EntityManagement = ({ entityType }: EntityManagementProps) => {
  const config = entityConfig[entityType] || entityConfig.clinic;
  const Icon = config.icon;
  
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedEntity, setSelectedEntity] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const { data: entities, isLoading, refetch } = useQuery({
    queryKey: ['entities', entityType, statusFilter],
    queryFn: async () => {
      let query = supabase.from(config.table as any).select('*');
      
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false }).limit(100);
      
      if (error) throw error;
      return data || [];
    },
  });

  const filteredEntities = entities?.filter((entity: any) => {
    const name = entity.name || entity.practice_name || entity.full_name || entity.specialty || entity.transaction_type || entity.appointment_type || '';
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const getStatusBadge = (status: string, verified: boolean) => {
    if (verified) return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Verified</Badge>;
    switch (status) {
      case 'active': return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">Active</Badge>;
      case 'pending': return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Pending</Badge>;
      case 'suspended': return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Suspended</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleViewEntity = (entity: any) => {
    setSelectedEntity(entity);
    setDetailOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className={`p-3 rounded-xl bg-muted ${config.color}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground">{config.title}</h1>
          <p className="text-muted-foreground">{config.subtitle}</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Entity Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {filteredEntities?.length || 0} {entityType === 'clinic' ? 'Clinics' : entityType === 'pharmacy' ? 'Pharmacies' : entityType === 'laboratory' ? 'Laboratories' : 'Imaging Centers'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntities?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No {entityType}s found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEntities?.map((entity: any) => (
                    <motion.tr
                      key={entity.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="border-b border-border hover:bg-muted/50 transition-colors"
                    >
                      <TableCell className="font-medium">
                        {entity.name || entity.practice_name || entity.full_name || entity.specialty || entity.transaction_type || entity.appointment_type || 'N/A'}
                      </TableCell>
                      <TableCell>
                        {entity.city}, {entity.country || 'N/A'}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(entity.status, entity.is_verified)}
                      </TableCell>
                      <TableCell>
                        {new Date(entity.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-popover border-border">
                            <DropdownMenuItem onClick={() => handleViewEntity(entity)}>
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleVerifyEntity(entity)}>
                              <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                              Verify
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleSuspendEntity(entity)}>
                              <Ban className="w-4 h-4 mr-2 text-yellow-500" />
                              Suspend
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => handleRejectEntity(entity)}>
                              <XCircle className="w-4 h-4 mr-2" />
                              Reject
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </motion.tr>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Entity Detail Dialog */}
      <EntityDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        entity={selectedEntity}
        entityType={entityType}
        onRefresh={refetch}
      />
    </div>
  );
};

export default EntityManagement;