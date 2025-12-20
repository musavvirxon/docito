import { useState } from "react";
import { motion } from "framer-motion";
import { Users, Search, Filter, Eye, Ban, RotateCcw, LogOut, MoreVertical, Building2, Pill, FlaskConical, Scan } from "lucide-react";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const GlobalStaffManagement = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Fetch all staff from different entity types
  const { data: allStaff, isLoading } = useQuery({
    queryKey: ['global-staff', entityFilter, roleFilter, statusFilter],
    queryFn: async () => {
      const staffData: any[] = [];

      // Fetch clinic staff
      if (entityFilter === 'all' || entityFilter === 'clinic') {
        const { data: clinicStaff } = await supabase
          .from('clinic_staff')
          .select('*, practices:practice_id (name)')
          .limit(50);
        
        clinicStaff?.forEach((s: any) => staffData.push({
          ...s,
          entity_type: 'clinic',
          entity_name: s.practices?.name,
          role: s.staff_role,
        }));
      }

      // Fetch pharmacy staff
      if (entityFilter === 'all' || entityFilter === 'pharmacy') {
        const { data: pharmacyStaff } = await supabase
          .from('pharmacy_staff')
          .select('*, pharmacies:pharmacy_id (name)')
          .limit(50);
        
        pharmacyStaff?.forEach((s: any) => staffData.push({
          ...s,
          entity_type: 'pharmacy',
          entity_name: s.pharmacies?.name,
          role: s.staff_role,
        }));
      }

      // Fetch lab staff
      if (entityFilter === 'all' || entityFilter === 'laboratory') {
        const { data: labStaff } = await supabase
          .from('lab_staff')
          .select('*, lab_centers:lab_center_id (name)')
          .limit(50);
        
        labStaff?.forEach((s: any) => staffData.push({
          ...s,
          entity_type: 'laboratory',
          entity_name: s.lab_centers?.name,
          role: s.staff_role,
        }));
      }

      // Fetch imaging staff
      if (entityFilter === 'all' || entityFilter === 'imaging') {
        const { data: imagingStaff } = await supabase
          .from('imaging_staff')
          .select('*, imaging_centers:imaging_center_id (name)')
          .limit(50);
        
        imagingStaff?.forEach((s: any) => staffData.push({
          ...s,
          entity_type: 'imaging',
          entity_name: s.imaging_centers?.name,
          role: s.staff_role,
        }));
      }

      // Apply role filter
      let filtered = staffData;
      if (roleFilter !== 'all') {
        filtered = filtered.filter(s => s.role === roleFilter);
      }

      // Apply status filter
      if (statusFilter !== 'all') {
        filtered = filtered.filter(s => s.status === statusFilter);
      }

      return filtered;
    },
  });

  const filteredStaff = allStaff?.filter((staff: any) => {
    const name = staff.user_name || '';
    const email = staff.user_email || '';
    return name.toLowerCase().includes(searchQuery.toLowerCase()) || 
           email.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'clinic': return <Building2 className="w-4 h-4" />;
      case 'pharmacy': return <Pill className="w-4 h-4" />;
      case 'laboratory': return <FlaskConical className="w-4 h-4" />;
      case 'imaging': return <Scan className="w-4 h-4" />;
      default: return <Building2 className="w-4 h-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Active</Badge>;
      case 'inactive': return <Badge className="bg-gray-500/10 text-gray-500 border-gray-500/20">Inactive</Badge>;
      case 'suspended': return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Suspended</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl bg-primary/10 text-primary">
          <Users className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Staff Management</h1>
          <p className="text-muted-foreground">Global staff directory across all entities</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Entity Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entities</SelectItem>
                <SelectItem value="clinic">Clinics</SelectItem>
                <SelectItem value="pharmacy">Pharmacies</SelectItem>
                <SelectItem value="laboratory">Laboratories</SelectItem>
                <SelectItem value="imaging">Imaging</SelectItem>
              </SelectContent>
            </Select>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="owner">Owner</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="technician">Technician</SelectItem>
                <SelectItem value="pharmacist">Pharmacist</SelectItem>
                <SelectItem value="assistant">Assistant</SelectItem>
                <SelectItem value="readonly">Read-only</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Staff Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {filteredStaff?.length || 0} Staff Members
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
                  <TableHead>Staff Member</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStaff?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No staff members found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStaff?.map((staff: any) => (
                    <motion.tr
                      key={staff.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="border-b border-border hover:bg-muted/50 transition-colors"
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={staff.user_avatar} />
                            <AvatarFallback>
                              {staff.user_name?.split(' ').map((n: string) => n[0]).join('') || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{staff.user_name || 'Unknown'}</p>
                            <p className="text-xs text-muted-foreground">{staff.user_email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getEntityIcon(staff.entity_type)}
                          <span className="text-sm">{staff.entity_name || 'N/A'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {staff.role || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(staff.status || 'active')}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-popover border-border">
                            <DropdownMenuItem>
                              <Eye className="w-4 h-4 mr-2" />
                              View Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <RotateCcw className="w-4 h-4 mr-2" />
                              Reset Permissions
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <LogOut className="w-4 h-4 mr-2" />
                              Force Logout
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">
                              <Ban className="w-4 h-4 mr-2" />
                              Disable Access
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
    </div>
  );
};

export default GlobalStaffManagement;