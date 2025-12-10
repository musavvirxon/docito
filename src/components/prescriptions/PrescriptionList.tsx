import { useState } from 'react';
import { usePrescriptions, Prescription } from '@/hooks/usePrescriptions';
import { usePharmacy } from '@/hooks/usePharmacy';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
import { Search, Eye, Send, FileText, Pill } from 'lucide-react';
import { format } from 'date-fns';

interface Props {
  doctorId?: string;
  patientId?: string;
  showSendToPharmacy?: boolean;
}

export default function PrescriptionList({ doctorId, patientId, showSendToPharmacy = true }: Props) {
  const { prescriptions, loading, sendToPharmacy } = usePrescriptions({ doctorId, patientId });
  const { pharmacies } = usePharmacy();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isSendDialogOpen, setIsSendDialogOpen] = useState(false);
  const [selectedPharmacy, setSelectedPharmacy] = useState<string>('');
  const [sending, setSending] = useState(false);

  const filteredPrescriptions = prescriptions.filter(p => {
    const matchesSearch = p.prescription_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'secondary',
      sent_to_pharmacy: 'outline',
      processing: 'outline',
      ready: 'default',
      fulfilled: 'default',
      expired: 'destructive',
      cancelled: 'destructive',
    };
    return <Badge variant={variants[status] || 'outline'}>{status.replace(/_/g, ' ')}</Badge>;
  };

  const viewDetails = (prescription: Prescription) => {
    setSelectedPrescription(prescription);
    setIsDetailsOpen(true);
  };

  const openSendDialog = (prescription: Prescription) => {
    setSelectedPrescription(prescription);
    setSelectedPharmacy('');
    setIsSendDialogOpen(true);
  };

  const handleSendToPharmacy = async () => {
    if (!selectedPrescription || !selectedPharmacy) return;
    
    setSending(true);
    try {
      await sendToPharmacy(selectedPrescription.id, selectedPharmacy);
      setIsSendDialogOpen(false);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Prescriptions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex gap-4 mb-4">
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
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="sent_to_pharmacy">Sent to Pharmacy</SelectItem>
                <SelectItem value="fulfilled">Fulfilled</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rx Number</TableHead>
                  <TableHead>Medications</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Refills</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPrescriptions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No prescriptions found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPrescriptions.map((prescription) => (
                    <TableRow key={prescription.id}>
                      <TableCell className="font-medium">{prescription.prescription_number}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Pill className="h-4 w-4 text-muted-foreground" />
                          {prescription.items?.length || 0} medication(s)
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(prescription.status)}</TableCell>
                      <TableCell>
                        {prescription.refills_remaining}/{prescription.refills_total}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(prescription.prescribed_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="ghost" onClick={() => viewDetails(prescription)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {showSendToPharmacy && prescription.status === 'pending' && !prescription.pharmacy_id && (
                            <Button size="sm" onClick={() => openSendDialog(prescription)}>
                              <Send className="h-4 w-4 mr-1" />
                              Send
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Prescription Details</DialogTitle>
            <DialogDescription>
              {selectedPrescription?.prescription_number}
            </DialogDescription>
          </DialogHeader>

          {selectedPrescription && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p>{getStatusBadge(selectedPrescription.status)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Prescribed On</p>
                  <p className="font-medium">
                    {format(new Date(selectedPrescription.prescribed_at), 'MMMM d, yyyy')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Refills Remaining</p>
                  <p className="font-medium">
                    {selectedPrescription.refills_remaining} of {selectedPrescription.refills_total}
                  </p>
                </div>
                {selectedPrescription.expires_at && (
                  <div>
                    <p className="text-sm text-muted-foreground">Expires</p>
                    <p className="font-medium">
                      {format(new Date(selectedPrescription.expires_at), 'MMMM d, yyyy')}
                    </p>
                  </div>
                )}
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Medications</h4>
                <ul className="space-y-3">
                  {selectedPrescription.items?.map((item, idx) => (
                    <li key={idx} className="p-3 bg-muted/50 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{item.medication_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.dosage} - {item.frequency?.replace(/_/g, ' ')}
                          </p>
                          {item.instructions && (
                            <p className="text-sm mt-1">{item.instructions}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{item.quantity} {item.unit}</p>
                          {item.substitutions_allowed && (
                            <Badge variant="outline" className="text-xs">Subs OK</Badge>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {selectedPrescription.notes && (
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">Notes</h4>
                  <p className="text-muted-foreground">{selectedPrescription.notes}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send to Pharmacy Dialog */}
      <Dialog open={isSendDialogOpen} onOpenChange={setIsSendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send to Pharmacy</DialogTitle>
            <DialogDescription>
              Select a pharmacy to send this prescription to
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Select Pharmacy</p>
              <Select value={selectedPharmacy} onValueChange={setSelectedPharmacy}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a pharmacy" />
                </SelectTrigger>
                <SelectContent>
                  {pharmacies.map((pharmacy) => (
                    <SelectItem key={pharmacy.id} value={pharmacy.id}>
                      {pharmacy.name}
                      {pharmacy.address && (
                        <span className="text-muted-foreground ml-2">
                          - {pharmacy.city}
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSendDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendToPharmacy} disabled={!selectedPharmacy || sending}>
              {sending ? 'Sending...' : 'Send Prescription'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
