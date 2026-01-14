import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  Search,
  Eye,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  Send,
  RefreshCw,
  Shield
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface InsuranceClaim {
  id: string;
  order_id: string;
  patient_name: string;
  insurance_provider: string;
  policy_number: string;
  claim_amount: number;
  approved_amount: number | null;
  copay_amount: number | null;
  status: string;
  submitted_at: string | null;
  processed_at: string | null;
  notes: string | null;
}

interface Props {
  labCenterId: string;
}

export default function LabBillingInsurance({ labCenterId }: Props) {
  const [claims, setClaims] = useState<InsuranceClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedClaim, setSelectedClaim] = useState<InsuranceClaim | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (labCenterId) fetchClaims();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [labCenterId]);

  const fetchClaims = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase.functions.invoke('lab-claims', {
        body: { action: 'list', lab_center_id: labCenterId },
      });

      if (error) throw error;

      const rows = (data?.claims ?? []) as any[];
      setClaims(
        rows.map((r) => ({
          id: r.id,
          order_id: r.order_id,
          patient_name: r.patient_name,
          insurance_provider: r.insurance_provider,
          policy_number: r.policy_number ?? '',
          claim_amount: Number(r.claim_amount ?? 0),
          approved_amount: r.approved_amount === null ? null : Number(r.approved_amount),
          copay_amount: r.copay_amount === null ? null : Number(r.copay_amount),
          status: r.status,
          submitted_at: r.submitted_at,
          processed_at: r.processed_at,
          notes: r.notes,
        }))
      );

    } catch (err: any) {
      console.error('Error fetching claims:', err);
      toast.error(err?.message || 'Failed to load claims');
    } finally {
      setLoading(false);
    }
  };

  const submitClaim = async (claimId: string) => {
    try {
      setSubmitting(true);

      const { data, error } = await supabase.functions.invoke('lab-claims', {
        body: { action: 'submit', lab_center_id: labCenterId, claim_id: claimId },
      });

      if (error) throw error;

      toast.success('Claim submitted');
      // refresh list for accurate statuses/timestamps
      await fetchClaims();

      // If dialog open, refresh selected claim too
      if (selectedClaim?.id === claimId) {
        const updated = data?.claim;
        if (updated) {
          setSelectedClaim((prev) =>
            prev
              ? {
                  ...prev,
                  status: updated.status,
                  submitted_at: updated.submitted_at,
                }
              : prev
          );
        }
      }
    } catch (err: any) {
      console.error('Error submitting claim:', err);
      toast.error(err?.message || 'Failed to submit claim');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30',
      submitted: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
      approved: 'bg-green-500/10 text-green-600 border-green-500/30',
      rejected: 'bg-destructive/10 text-destructive border-destructive/30',
      paid: 'bg-primary/10 text-primary border-primary/30',
    };
    return (
      <Badge variant="outline" className={colors[status] || ''}>
        {status}
      </Badge>
    );
  };

  const filteredClaims = claims.filter(claim => {
    const matchesSearch =
      claim.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (claim.policy_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (claim.order_id || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || claim.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPending = claims.filter(c => c.status === 'pending' || c.status === 'submitted').length;
  const totalApproved = claims
    .filter(c => c.status === 'approved' || c.status === 'paid')
    .reduce((sum, c) => sum + (c.approved_amount || 0), 0);
  const totalRejected = claims.filter(c => c.status === 'rejected').length;

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-yellow-500/10 rounded-lg">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pending Claims</p>
                  <p className="text-2xl font-bold">{totalPending}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-500/10 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Approved</p>
                  <p className="text-2xl font-bold">{claims.filter(c => c.status === 'approved').length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <DollarSign className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Approved</p>
                  <p className="text-2xl font-bold">${totalApproved.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-destructive/10 rounded-lg">
                  <XCircle className="h-6 w-6 text-destructive" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Rejected</p>
                  <p className="text-2xl font-bold">{totalRejected}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Claims Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Insurance Claims
                </CardTitle>
                <CardDescription>Manage insurance claims and billing</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={fetchClaims}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            <div className="flex gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-10"
                  placeholder="Search by patient, policy, order..."
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
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Insurance Provider</TableHead>
                    <TableHead>Policy #</TableHead>
                    <TableHead>Claim Amount</TableHead>
                    <TableHead>Approved</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filteredClaims.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No claims found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredClaims.map((claim) => (
                      <TableRow key={claim.id}>
                        <TableCell className="font-medium">{claim.patient_name}</TableCell>
                        <TableCell>{claim.insurance_provider}</TableCell>
                        <TableCell className="font-mono text-sm">{claim.policy_number}</TableCell>
                        <TableCell>${claim.claim_amount.toFixed(2)}</TableCell>
                        <TableCell>
                          {claim.approved_amount !== null
                            ? `$${claim.approved_amount.toFixed(2)}`
                            : '-'}
                        </TableCell>
                        <TableCell>{getStatusBadge(claim.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedClaim(claim);
                                setIsDetailsOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>

                            {claim.status === 'pending' && (
                              <Button
                                size="sm"
                                disabled={submitting}
                                onClick={() => submitClaim(claim.id)}
                              >
                                <Send className="h-4 w-4 mr-1" />
                                Submit
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
      </div>

      {/* Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Claim Details
            </DialogTitle>
          </DialogHeader>

          {selectedClaim && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Patient</p>
                  <p className="font-medium">{selectedClaim.patient_name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Status</p>
                  {getStatusBadge(selectedClaim.status)}
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Insurance Provider</p>
                  <p className="font-medium">{selectedClaim.insurance_provider}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Policy Number</p>
                  <p className="font-medium font-mono">{selectedClaim.policy_number}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-4">Financial Summary</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Claim Amount</span>
                    <span className="font-medium">${selectedClaim.claim_amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Approved Amount</span>
                    <span className="font-medium text-green-600">
                      {selectedClaim.approved_amount !== null
                        ? `$${selectedClaim.approved_amount.toFixed(2)}`
                        : 'Pending'}
                    </span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="font-medium">Patient Copay</span>
                    <span className="font-bold">
                      ${selectedClaim.copay_amount?.toFixed(2) || '0.00'}
                    </span>
                  </div>
                </div>
              </div>

              {selectedClaim.notes && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Notes</p>
                  <Card className="p-4 bg-muted/50">
                    <p className="text-sm">{selectedClaim.notes}</p>
                  </Card>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 border-t pt-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Submitted</p>
                  <p className="font-medium">
                    {selectedClaim.submitted_at
                      ? format(new Date(selectedClaim.submitted_at), 'MMM d, yyyy')
                      : '-'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Processed</p>
                  <p className="font-medium">
                    {selectedClaim.processed_at
                      ? format(new Date(selectedClaim.processed_at), 'MMM d, yyyy')
                      : '-'}
                  </p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>
              Close
            </Button>
            {selectedClaim?.status === 'pending' && (
              <Button
                disabled={submitting}
                onClick={() => selectedClaim && submitClaim(selectedClaim.id)}
              >
                <Send className="h-4 w-4 mr-1" />
                Submit Claim
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
