import { useState } from 'react';
import { usePharmacy, PharmacyStaff } from '@/hooks/usePharmacy';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Users, Plus, UserCheck } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  pharmacyId: string;
}

const STAFF_ROLES = [
  { value: 'pharmacist', label: 'Pharmacist' },
  { value: 'technician', label: 'Pharmacy Technician' },
  { value: 'clerk', label: 'Pharmacy Clerk' },
  { value: 'manager', label: 'Pharmacy Manager' },
];

export default function PharmacyStaffManager({ pharmacyId }: Props) {
  const { staff, addStaff } = usePharmacy(pharmacyId);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    user_id: '',
    staff_role: 'technician',
    license_number: '',
    can_dispense: false,
    can_manage_inventory: true,
    can_process_prescriptions: false,
  });

  const handleSubmit = async () => {
    if (!formData.user_id) {
      toast.error('User ID is required');
      return;
    }

    setIsSubmitting(true);
    try {
      await addStaff({
        pharmacy_id: pharmacyId,
        ...formData,
      });
      setIsAddDialogOpen(false);
      setFormData({
        user_id: '',
        staff_role: 'technician',
        license_number: '',
        can_dispense: false,
        can_manage_inventory: true,
        can_process_prescriptions: false,
      });
    } catch (error) {
      // Error handled by hook
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleBadge = (role: string) => {
    const colors: Record<string, 'default' | 'secondary' | 'outline'> = {
      pharmacist: 'default',
      manager: 'default',
      technician: 'secondary',
      clerk: 'outline',
    };
    return <Badge variant={colors[role] || 'outline'}>{role}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Staff Management
          </CardTitle>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Staff
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Staff Member</DialogTitle>
                <DialogDescription>
                  Add a new staff member to your pharmacy team
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>User ID *</Label>
                  <Input
                    value={formData.user_id}
                    onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                    placeholder="Enter user UUID"
                  />
                  <p className="text-xs text-muted-foreground">
                    The user must already have an account in the system
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Role *</Label>
                  <Select
                    value={formData.staff_role}
                    onValueChange={(value) => setFormData({ ...formData, staff_role: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {STAFF_ROLES.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>License Number</Label>
                  <Input
                    value={formData.license_number}
                    onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                    placeholder="For pharmacists"
                  />
                </div>

                <div className="space-y-3 border-t pt-4">
                  <Label className="text-base">Permissions</Label>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Can Dispense</p>
                      <p className="text-sm text-muted-foreground">Allow dispensing medications</p>
                    </div>
                    <Switch
                      checked={formData.can_dispense}
                      onCheckedChange={(checked) => setFormData({ ...formData, can_dispense: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Can Manage Inventory</p>
                      <p className="text-sm text-muted-foreground">Add/edit inventory items</p>
                    </div>
                    <Switch
                      checked={formData.can_manage_inventory}
                      onCheckedChange={(checked) => setFormData({ ...formData, can_manage_inventory: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Can Process Prescriptions</p>
                      <p className="text-sm text-muted-foreground">Handle prescription fulfillment</p>
                    </div>
                    <Switch
                      checked={formData.can_process_prescriptions}
                      onCheckedChange={(checked) => setFormData({ ...formData, can_process_prescriptions: checked })}
                    />
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={isSubmitting}>
                  {isSubmitting ? 'Adding...' : 'Add Staff'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff ID</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>License</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staff.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No staff members yet
                  </TableCell>
                </TableRow>
              ) : (
                staff.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-mono text-sm">{member.user_id.slice(0, 8)}...</TableCell>
                    <TableCell>{getRoleBadge(member.staff_role)}</TableCell>
                    <TableCell>{member.license_number || '-'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {member.can_dispense && (
                          <Badge variant="outline" className="text-xs">Dispense</Badge>
                        )}
                        {member.can_manage_inventory && (
                          <Badge variant="outline" className="text-xs">Inventory</Badge>
                        )}
                        {member.can_process_prescriptions && (
                          <Badge variant="outline" className="text-xs">Prescriptions</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={member.status === 'active' ? 'default' : 'secondary'}>
                        {member.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
