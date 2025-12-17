import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Settings, AlertTriangle, CheckCircle, XCircle, Wrench } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Equipment {
  id: string;
  name: string;
  modality: string;
  manufacturer: string;
  model: string;
  serial_number: string;
  installation_date: string;
  last_maintenance: string;
  next_maintenance: string;
  status: 'active' | 'maintenance' | 'offline' | 'retired';
  scan_types: string[];
  capacity_per_day: number;
}

interface Props {
  centerId: string;
}

const MODALITIES = ['MRI', 'CT', 'X-ray', 'Ultrasound', 'Mammography', 'PET', 'PET-CT', 'Fluoroscopy', 'DEXA'];

export default function ImagingEquipmentManager({ centerId }: Props) {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    modality: '',
    manufacturer: '',
    model: '',
    serial_number: '',
    installation_date: '',
    capacity_per_day: 20,
  });

  useEffect(() => {
    fetchEquipment();
  }, [centerId]);

  const fetchEquipment = async () => {
    // Mock data for now - replace with actual Supabase query
    setEquipment([
      {
        id: '1',
        name: 'MRI Scanner - Room A',
        modality: 'MRI',
        manufacturer: 'Siemens',
        model: 'MAGNETOM Sola',
        serial_number: 'SN-2024-001',
        installation_date: '2023-06-15',
        last_maintenance: '2024-01-15',
        next_maintenance: '2024-07-15',
        status: 'active',
        scan_types: ['Brain MRI', 'Spine MRI', 'Knee MRI', 'Cardiac MRI'],
        capacity_per_day: 12,
      },
      {
        id: '2',
        name: 'CT Scanner - Room B',
        modality: 'CT',
        manufacturer: 'GE Healthcare',
        model: 'Revolution CT',
        serial_number: 'SN-2024-002',
        installation_date: '2023-08-20',
        last_maintenance: '2024-02-20',
        next_maintenance: '2024-08-20',
        status: 'active',
        scan_types: ['Chest CT', 'Abdominal CT', 'Head CT', 'Cardiac CT'],
        capacity_per_day: 25,
      },
      {
        id: '3',
        name: 'X-ray Unit - Room C',
        modality: 'X-ray',
        manufacturer: 'Philips',
        model: 'DigitalDiagnost',
        serial_number: 'SN-2024-003',
        installation_date: '2022-03-10',
        last_maintenance: '2024-03-10',
        next_maintenance: '2024-09-10',
        status: 'maintenance',
        scan_types: ['Chest X-ray', 'Bone X-ray', 'Dental X-ray'],
        capacity_per_day: 40,
      },
    ]);
    setLoading(false);
  };

  const handleAddEquipment = async () => {
    if (!formData.name || !formData.modality) {
      toast.error('Please fill in required fields');
      return;
    }

    toast.success('Equipment added successfully');
    setDialogOpen(false);
    setFormData({
      name: '',
      modality: '',
      manufacturer: '',
      model: '',
      serial_number: '',
      installation_date: '',
      capacity_per_day: 20,
    });
    fetchEquipment();
  };

  const getStatusBadge = (status: Equipment['status']) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20"><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>;
      case 'maintenance':
        return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20"><Wrench className="w-3 h-3 mr-1" />Maintenance</Badge>;
      case 'offline':
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20"><XCircle className="w-3 h-3 mr-1" />Offline</Badge>;
      case 'retired':
        return <Badge variant="secondary">Retired</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Equipment Management</CardTitle>
          <CardDescription>Manage imaging equipment and modalities</CardDescription>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Equipment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add New Equipment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Equipment Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., MRI Scanner - Room A"
                />
              </div>
              <div className="space-y-2">
                <Label>Modality *</Label>
                <Select value={formData.modality} onValueChange={(v) => setFormData({ ...formData, modality: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select modality" />
                  </SelectTrigger>
                  <SelectContent>
                    {MODALITIES.map(mod => (
                      <SelectItem key={mod} value={mod}>{mod}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Manufacturer</Label>
                  <Input
                    value={formData.manufacturer}
                    onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                    placeholder="e.g., Siemens"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Model</Label>
                  <Input
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    placeholder="e.g., MAGNETOM"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Serial Number</Label>
                  <Input
                    value={formData.serial_number}
                    onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Installation Date</Label>
                  <Input
                    type="date"
                    value={formData.installation_date}
                    onChange={(e) => setFormData({ ...formData, installation_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Daily Capacity (scans)</Label>
                <Input
                  type="number"
                  value={formData.capacity_per_day}
                  onChange={(e) => setFormData({ ...formData, capacity_per_day: parseInt(e.target.value) })}
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleAddEquipment}>Add Equipment</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {equipment.length === 0 ? (
          <div className="text-center py-12">
            <Settings className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No equipment registered yet</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Equipment</TableHead>
                <TableHead>Modality</TableHead>
                <TableHead>Manufacturer / Model</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Next Maintenance</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {equipment.map((eq) => (
                <TableRow key={eq.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{eq.name}</p>
                      <p className="text-xs text-muted-foreground">{eq.serial_number}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{eq.modality}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p>{eq.manufacturer}</p>
                      <p className="text-muted-foreground">{eq.model}</p>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(eq.status)}</TableCell>
                  <TableCell>{eq.capacity_per_day}/day</TableCell>
                  <TableCell>
                    <span className={new Date(eq.next_maintenance) < new Date() ? 'text-red-500' : ''}>
                      {new Date(eq.next_maintenance).toLocaleDateString()}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
