import { useState } from 'react';
import { usePharmacyInventory, InventoryItem } from '@/hooks/usePharmacyInventory';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Plus, Search, Edit, Trash2, AlertTriangle, Package } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  pharmacyId: string;
}

export default function PharmacyInventoryManager({ pharmacyId }: Props) {
  const { 
    inventory, 
    loading, 
    lowStockItems,
    addInventoryItem, 
    updateInventoryItem, 
    adjustQuantity,
    deleteInventoryItem 
  } = usePharmacyInventory(pharmacyId);

  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [filterLowStock, setFilterLowStock] = useState(false);

  const [formData, setFormData] = useState({
    medication_name: '',
    medication_code: '',
    ndc_code: '',
    manufacturer: '',
    quantity_on_hand: 0,
    reorder_level: 10,
    unit_cost: 0,
    unit_price: 0,
    expiry_date: '',
    batch_number: '',
    storage_location: '',
    requires_refrigeration: false,
    is_controlled_substance: false,
    controlled_substance_schedule: '',
  });

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.medication_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.medication_code?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = !filterLowStock || lowStockItems.some(l => l.id === item.id);
    return matchesSearch && matchesFilter;
  });

  const resetForm = () => {
    setFormData({
      medication_name: '',
      medication_code: '',
      ndc_code: '',
      manufacturer: '',
      quantity_on_hand: 0,
      reorder_level: 10,
      unit_cost: 0,
      unit_price: 0,
      expiry_date: '',
      batch_number: '',
      storage_location: '',
      requires_refrigeration: false,
      is_controlled_substance: false,
      controlled_substance_schedule: '',
    });
    setEditingItem(null);
  };

  const handleSubmit = async () => {
    if (!formData.medication_name) {
      toast.error('Medication name is required');
      return;
    }

    try {
      if (editingItem) {
        await updateInventoryItem(editingItem.id, formData);
      } else {
        await addInventoryItem(formData);
      }
      setIsAddDialogOpen(false);
      resetForm();
    } catch (error) {
      // Error handled by hook
    }
  };

  const handleEdit = (item: InventoryItem) => {
    setFormData({
      medication_name: item.medication_name,
      medication_code: item.medication_code || '',
      ndc_code: item.ndc_code || '',
      manufacturer: item.manufacturer || '',
      quantity_on_hand: item.quantity_on_hand,
      reorder_level: item.reorder_level,
      unit_cost: item.unit_cost || 0,
      unit_price: item.unit_price || 0,
      expiry_date: item.expiry_date || '',
      batch_number: item.batch_number || '',
      storage_location: item.storage_location || '',
      requires_refrigeration: item.requires_refrigeration,
      is_controlled_substance: item.is_controlled_substance,
      controlled_substance_schedule: item.controlled_substance_schedule || '',
    });
    setEditingItem(item);
    setIsAddDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this item?')) {
      await deleteInventoryItem(id);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Inventory Management
          </CardTitle>
          <Dialog open={isAddDialogOpen} onOpenChange={(open) => { setIsAddDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingItem ? 'Edit Item' : 'Add New Inventory Item'}</DialogTitle>
                <DialogDescription>
                  {editingItem ? 'Update the inventory item details' : 'Add a new medication to your inventory'}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Medication Name *</Label>
                    <Input
                      value={formData.medication_name}
                      onChange={(e) => setFormData({ ...formData, medication_name: e.target.value })}
                      placeholder="Amoxicillin 500mg"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Medication Code</Label>
                    <Input
                      value={formData.medication_code}
                      onChange={(e) => setFormData({ ...formData, medication_code: e.target.value })}
                      placeholder="AMX-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>NDC Code</Label>
                    <Input
                      value={formData.ndc_code}
                      onChange={(e) => setFormData({ ...formData, ndc_code: e.target.value })}
                      placeholder="12345-6789-01"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Manufacturer</Label>
                    <Input
                      value={formData.manufacturer}
                      onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                      placeholder="Pfizer"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Quantity *</Label>
                    <Input
                      type="number"
                      value={formData.quantity_on_hand}
                      onChange={(e) => setFormData({ ...formData, quantity_on_hand: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Reorder Level</Label>
                    <Input
                      type="number"
                      value={formData.reorder_level}
                      onChange={(e) => setFormData({ ...formData, reorder_level: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Expiry Date</Label>
                    <Input
                      type="date"
                      value={formData.expiry_date}
                      onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Unit Cost ($)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.unit_cost}
                      onChange={(e) => setFormData({ ...formData, unit_cost: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Unit Price ($)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.unit_price}
                      onChange={(e) => setFormData({ ...formData, unit_price: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Batch Number</Label>
                    <Input
                      value={formData.batch_number}
                      onChange={(e) => setFormData({ ...formData, batch_number: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Storage Location</Label>
                    <Input
                      value={formData.storage_location}
                      onChange={(e) => setFormData({ ...formData, storage_location: e.target.value })}
                      placeholder="Shelf A-1"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between border rounded-lg p-3">
                  <Label>Requires Refrigeration</Label>
                  <Switch
                    checked={formData.requires_refrigeration}
                    onCheckedChange={(checked) => setFormData({ ...formData, requires_refrigeration: checked })}
                  />
                </div>

                <div className="flex items-center justify-between border rounded-lg p-3">
                  <Label>Controlled Substance</Label>
                  <Switch
                    checked={formData.is_controlled_substance}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_controlled_substance: checked })}
                  />
                </div>

                {formData.is_controlled_substance && (
                  <div className="space-y-2">
                    <Label>DEA Schedule</Label>
                    <Select
                      value={formData.controlled_substance_schedule}
                      onValueChange={(value) => setFormData({ ...formData, controlled_substance_schedule: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select schedule" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="II">Schedule II</SelectItem>
                        <SelectItem value="III">Schedule III</SelectItem>
                        <SelectItem value="IV">Schedule IV</SelectItem>
                        <SelectItem value="V">Schedule V</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => { setIsAddDialogOpen(false); resetForm(); }}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit}>
                  {editingItem ? 'Update' : 'Add Item'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-10"
              placeholder="Search medications..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button
            variant={filterLowStock ? 'default' : 'outline'}
            onClick={() => setFilterLowStock(!filterLowStock)}
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            Low Stock ({lowStockItems.length})
          </Button>
        </div>

        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Medication</TableHead>
                <TableHead>Code</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInventory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {inventory.length === 0 ? 'No inventory items yet' : 'No items match your search'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredInventory.map((item) => {
                  const isLowStock = item.quantity_on_hand - item.quantity_reserved <= item.reorder_level;
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.medication_name}</p>
                          {item.manufacturer && (
                            <p className="text-sm text-muted-foreground">{item.manufacturer}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{item.medication_code || '-'}</TableCell>
                      <TableCell className="text-right">
                        <span className={isLowStock ? 'text-orange-500 font-medium' : ''}>
                          {item.quantity_on_hand}
                        </span>
                        {item.quantity_reserved > 0 && (
                          <span className="text-muted-foreground text-sm">
                            {' '}({item.quantity_reserved} reserved)
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        ${item.unit_price?.toFixed(2) || '0.00'}
                      </TableCell>
                      <TableCell>
                        {item.expiry_date || '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {isLowStock && (
                            <Badge variant="destructive" className="text-xs">Low</Badge>
                          )}
                          {item.is_controlled_substance && (
                            <Badge variant="secondary" className="text-xs">C-{item.controlled_substance_schedule}</Badge>
                          )}
                          {item.requires_refrigeration && (
                            <Badge variant="outline" className="text-xs">❄️</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="ghost" onClick={() => handleEdit(item)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(item.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
