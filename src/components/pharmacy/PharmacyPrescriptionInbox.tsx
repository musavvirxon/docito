import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  FileText, 
  Search, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  User,
  Stethoscope,
  Pill,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface Prescription {
  id: string;
  patient_id: string;
  doctor_id: string;
  status: string;
  notes: string | null;
  refills_remaining: number;
  refills_total: number;
  created_at: string;
  pharmacy_id: string | null;
  items?: PrescriptionItem[];
  patient?: { full_name: string; email: string };
  doctor?: { specialty: string; profiles?: { full_name: string } };
}

interface PrescriptionItem {
  id: string;
  medication_name: string;
  medication_code: string | null;
  dosage: string | null;
  frequency: string | null;
  quantity: number;
  unit: string;
  instructions: string | null;
  substitutions_allowed: boolean;
}

interface Props {
  pharmacyId: string;
}

export default function PharmacyPrescriptionInbox({ pharmacyId }: Props) {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [pharmacistNotes, setPharmacistNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (pharmacyId) {
      fetchPrescriptions();
    }
  }, [pharmacyId]);

  const fetchPrescriptions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('prescriptions')
        .select(`
          *,
          prescription_items(*)
        `)
        .or(`pharmacy_id.eq.${pharmacyId},status.eq.pending`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPrescriptions(data || []);
    } catch (error) {
      console.error('Error fetching prescriptions:', error);
      toast.error('Failed to load prescriptions');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (prescriptionId: string, newStatus: string) => {
    setProcessing(true);
    try {
      const { error } = await supabase
        .from('prescriptions')
        .update({ 
          status: newStatus, 
          pharmacy_id: pharmacyId,
          updated_at: new Date().toISOString()
        })
        .eq('id', prescriptionId);

      if (error) throw error;
      
      toast.success(`Prescription ${newStatus}`);
      fetchPrescriptions();
      setIsDetailsOpen(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update prescription');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'secondary',
      in_review: 'outline',
      approved: 'default',
      dispensed: 'default',
      out_of_stock: 'destructive',
      cancelled: 'destructive',
    };
    const colors: Record<string, string> = {
      pending: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30',
      in_review: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
      approved: 'bg-green-500/10 text-green-600 border-green-500/30',
      dispensed: 'bg-primary/10 text-primary border-primary/30',
      out_of_stock: 'bg-orange-500/10 text-orange-600 border-orange-500/30',
      cancelled: 'bg-destructive/10 text-destructive border-destructive/30',
    };
    return (
      <Badge variant="outline" className={colors[status] || ''}>
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  const filteredPrescriptions = prescriptions.filter(rx => {
    const matchesSearch = rx.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || rx.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const viewDetails = (prescription: Prescription) => {
    setSelectedPrescription(prescription);
    setPharmacistNotes('');
    setIsDetailsOpen(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Prescriptions Inbox
              </CardTitle>
              <CardDescription>Manage incoming prescriptions from doctors and clinics</CardDescription>
            </div>
            <div className="flex gap-2">
              <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600">
                {prescriptions.filter(p => p.status === 'pending').length} New
              </Badge>
              <Badge variant="outline">
                {prescriptions.filter(p => p.status === 'in_review').length} In Review
              </Badge>
              <Button variant="ghost" size="sm" onClick={fetchPrescriptions}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-10"
                placeholder="Search prescriptions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">New</SelectItem>
                <SelectItem value="in_review">In Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="dispensed">Dispensed</SelectItem>
                <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Prescription ID</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Refills</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPrescriptions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No prescriptions found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPrescriptions.map((rx) => (
                    <TableRow key={rx.id} className={rx.status === 'pending' ? 'bg-yellow-500/5' : ''}>
                      <TableCell className="font-mono text-sm">
                        {rx.id.slice(0, 8)}...
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span>{rx.patient?.full_name || 'Unknown'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Stethoscope className="h-4 w-4 text-muted-foreground" />
                          <span>{rx.doctor?.profiles?.full_name || 'Unknown'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Pill className="h-4 w-4 text-muted-foreground" />
                          <span>{rx.items?.length || 0} items</span>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(rx.status)}</TableCell>
                      <TableCell>
                        {rx.refills_remaining}/{rx.refills_total}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(rx.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="ghost" onClick={() => viewDetails(rx)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {rx.status === 'pending' && (
                            <Button 
                              size="sm" 
                              onClick={() => handleStatusUpdate(rx.id, 'in_review')}
                            >
                              <Clock className="h-4 w-4 mr-1" />
                              Review
                            </Button>
                          )}
                          {rx.status === 'in_review' && (
                            <Button 
                              size="sm" 
                              onClick={() => handleStatusUpdate(rx.id, 'approved')}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Prescription Details
            </DialogTitle>
            <DialogDescription>
              ID: {selectedPrescription?.id}
            </DialogDescription>
          </DialogHeader>

          {selectedPrescription && (
            <div className="space-y-6">
              {/* Status and Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Status</p>
                  {getStatusBadge(selectedPrescription.status)}
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Refills</p>
                  <p className="font-medium">
                    {selectedPrescription.refills_remaining} of {selectedPrescription.refills_total} remaining
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="font-medium">
                    {format(new Date(selectedPrescription.created_at), 'MMM d, yyyy')}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Time</p>
                  <p className="font-medium">
                    {format(new Date(selectedPrescription.created_at), 'h:mm a')}
                  </p>
                </div>
              </div>

              {/* Patient & Doctor Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Patient</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedPrescription.patient?.full_name || 'Unknown'}
                      </p>
                    </div>
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                      <Stethoscope className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <p className="font-medium">Prescribing Doctor</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedPrescription.doctor?.profiles?.full_name || 'Unknown'}
                      </p>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Prescription Items */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Pill className="h-4 w-4" />
                  Medications
                </h4>
                <div className="space-y-3">
                  {selectedPrescription.items?.map((item, idx) => (
                    <Card key={idx} className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{item.medication_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.dosage} • {item.frequency}
                          </p>
                          {item.instructions && (
                            <p className="text-sm mt-2 text-muted-foreground">
                              Instructions: {item.instructions}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-medium">Qty: {item.quantity} {item.unit}</p>
                          {item.substitutions_allowed && (
                            <Badge variant="outline" className="mt-1">
                              Generic OK
                            </Badge>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Doctor Notes */}
              {selectedPrescription.notes && (
                <div>
                  <h4 className="font-semibold mb-2">Doctor's Notes</h4>
                  <Card className="p-4 bg-muted/50">
                    <p className="text-sm">{selectedPrescription.notes}</p>
                  </Card>
                </div>
              )}

              {/* Pharmacist Notes */}
              <div>
                <h4 className="font-semibold mb-2">Pharmacist Notes</h4>
                <Textarea
                  placeholder="Add notes about this prescription..."
                  value={pharmacistNotes}
                  onChange={(e) => setPharmacistNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>
              Close
            </Button>
            {selectedPrescription?.status === 'pending' && (
              <>
                <Button 
                  variant="destructive"
                  onClick={() => handleStatusUpdate(selectedPrescription.id, 'out_of_stock')}
                  disabled={processing}
                >
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  Out of Stock
                </Button>
                <Button 
                  onClick={() => handleStatusUpdate(selectedPrescription.id, 'in_review')}
                  disabled={processing}
                >
                  <Clock className="h-4 w-4 mr-1" />
                  Start Review
                </Button>
              </>
            )}
            {selectedPrescription?.status === 'in_review' && (
              <>
                <Button 
                  variant="destructive"
                  onClick={() => handleStatusUpdate(selectedPrescription.id, 'cancelled')}
                  disabled={processing}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Reject
                </Button>
                <Button 
                  onClick={() => handleStatusUpdate(selectedPrescription.id, 'approved')}
                  disabled={processing}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Approve
                </Button>
              </>
            )}
            {selectedPrescription?.status === 'approved' && (
              <Button 
                onClick={() => handleStatusUpdate(selectedPrescription.id, 'dispensed')}
                disabled={processing}
              >
                <Pill className="h-4 w-4 mr-1" />
                Mark as Dispensed
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
