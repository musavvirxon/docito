import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Plus, 
  Users,
  Shield,
  Mail,
  Phone
} from 'lucide-react';
import { useLabCenter, LabStaffInput } from '@/hooks/useLabCenter';

interface LabStaffManagerProps {
  labCenterId: string;
}

const STAFF_ROLES = [
  { value: 'technician', label: 'Lab Technician' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'phlebotomist', label: 'Phlebotomist' },
  { value: 'radiologist', label: 'Radiologist' },
  { value: 'admin', label: 'Administrator' },
];

export function LabStaffManager({ labCenterId }: LabStaffManagerProps) {
  const { labStaff, fetchLabStaff, addLabStaff, updateLabStaff, loading } = useLabCenter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<LabStaffInput>({
    lab_center_id: labCenterId,
    user_id: '',
    staff_role: 'technician',
    license_number: '',
    specializations: [],
    can_process_samples: false,
    can_upload_results: false,
    can_verify_results: false,
    can_manage_equipment: false,
  });

  useEffect(() => {
    fetchLabStaff(labCenterId);
  }, [labCenterId, fetchLabStaff]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await addLabStaff(formData);
    setIsDialogOpen(false);
    setFormData({
      lab_center_id: labCenterId,
      user_id: '',
      staff_role: 'technician',
      license_number: '',
      specializations: [],
      can_process_samples: false,
      can_upload_results: false,
      can_verify_results: false,
      can_manage_equipment: false,
    });
  };

  const handlePermissionToggle = async (staffId: string, permission: string, value: boolean) => {
    await updateLabStaff(staffId, { [permission]: value });
  };

  const getInitials = (userId: string) => {
    return userId.substring(0, 2).toUpperCase();
  };

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      technician: 'bg-blue-500/10 text-blue-500',
      supervisor: 'bg-purple-500/10 text-purple-500',
      phlebotomist: 'bg-green-500/10 text-green-500',
      radiologist: 'bg-orange-500/10 text-orange-500',
      admin: 'bg-red-500/10 text-red-500',
    };
    return colors[role] || colors.technician;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Lab Staff</h3>
          <p className="text-sm text-muted-foreground">Manage your lab team and their permissions</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Staff
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Staff Member</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="user_id">User ID (Email) *</Label>
                <Input
                  id="user_id"
                  type="email"
                  value={formData.user_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, user_id: e.target.value }))}
                  placeholder="staff@example.com"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Enter the email of an existing user to add them as staff
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="role">Role *</Label>
                  <Select
                    value={formData.staff_role}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, staff_role: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {STAFF_ROLES.map(role => (
                        <SelectItem key={role.value} value={role.value}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="license">License Number</Label>
                  <Input
                    id="license"
                    value={formData.license_number || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, license_number: e.target.value }))}
                    placeholder="Optional"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label>Permissions</Label>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="process" className="text-sm font-normal">Can Process Samples</Label>
                    <Switch
                      id="process"
                      checked={formData.can_process_samples}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, can_process_samples: checked }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="upload" className="text-sm font-normal">Can Upload Results</Label>
                    <Switch
                      id="upload"
                      checked={formData.can_upload_results}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, can_upload_results: checked }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="verify" className="text-sm font-normal">Can Verify Results</Label>
                    <Switch
                      id="verify"
                      checked={formData.can_verify_results}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, can_verify_results: checked }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="equipment" className="text-sm font-normal">Can Manage Equipment</Label>
                    <Switch
                      id="equipment"
                      checked={formData.can_manage_equipment}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, can_manage_equipment: checked }))}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  Add Staff Member
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Staff List */}
      {labStaff.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No staff members yet. Add your first team member.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {labStaff.map(staff => (
            <Card key={staff.id}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback>{getInitials(staff.user_id)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium truncate">{staff.user_id}</span>
                      <Badge variant="outline" className={getRoleBadgeColor(staff.staff_role)}>
                        {STAFF_ROLES.find(r => r.value === staff.staff_role)?.label || staff.staff_role}
                      </Badge>
                    </div>
                    {staff.license_number && (
                      <p className="text-sm text-muted-foreground">License: {staff.license_number}</p>
                    )}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {staff.can_process_samples && (
                        <Badge variant="secondary" className="text-xs">Process Samples</Badge>
                      )}
                      {staff.can_upload_results && (
                        <Badge variant="secondary" className="text-xs">Upload Results</Badge>
                      )}
                      {staff.can_verify_results && (
                        <Badge variant="secondary" className="text-xs">Verify Results</Badge>
                      )}
                      {staff.can_manage_equipment && (
                        <Badge variant="secondary" className="text-xs">Manage Equipment</Badge>
                      )}
                    </div>
                  </div>
                  <Badge variant={staff.status === 'active' ? 'default' : 'secondary'}>
                    {staff.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
