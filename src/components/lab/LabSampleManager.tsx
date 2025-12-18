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
  TestTube, 
  Search, 
  Eye, 
  QrCode, 
  Clock,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Barcode
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface Sample {
  id: string;
  sample_id: string;
  order_id: string;
  patient_id: string;
  sample_type: string;
  collection_time: string | null;
  collector_id: string | null;
  status: string;
  barcode: string | null;
  notes: string | null;
  created_at: string;
}

interface Props {
  labCenterId: string;
}

export default function LabSampleManager({ labCenterId }: Props) {
  const [samples, setSamples] = useState<Sample[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedSample, setSelectedSample] = useState<Sample | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  useEffect(() => {
    if (labCenterId) {
      fetchSamples();
    }
  }, [labCenterId]);

  const fetchSamples = async () => {
    try {
      setLoading(true);
      // Mock data - would be fetched from lab_samples table
      const mockSamples: Sample[] = [
        {
          id: '1',
          sample_id: 'SMP-001',
          order_id: 'ORD-001',
          patient_id: 'patient-1',
          sample_type: 'Blood',
          collection_time: new Date().toISOString(),
          collector_id: null,
          status: 'collected',
          barcode: 'BC001234567',
          notes: null,
          created_at: new Date().toISOString(),
        },
        {
          id: '2',
          sample_id: 'SMP-002',
          order_id: 'ORD-002',
          patient_id: 'patient-2',
          sample_type: 'Urine',
          collection_time: null,
          collector_id: null,
          status: 'pending',
          barcode: 'BC001234568',
          notes: null,
          created_at: new Date().toISOString(),
        },
        {
          id: '3',
          sample_id: 'SMP-003',
          order_id: 'ORD-003',
          patient_id: 'patient-3',
          sample_type: 'Blood',
          collection_time: new Date().toISOString(),
          collector_id: 'collector-1',
          status: 'processing',
          barcode: 'BC001234569',
          notes: 'Fasting sample',
          created_at: new Date().toISOString(),
        },
      ];
      setSamples(mockSamples);
    } catch (error) {
      console.error('Error fetching samples:', error);
      toast.error('Failed to load samples');
    } finally {
      setLoading(false);
    }
  };

  const updateSampleStatus = async (sampleId: string, newStatus: string) => {
    try {
      setSamples(prev => prev.map(s => 
        s.id === sampleId ? { ...s, status: newStatus } : s
      ));
      toast.success(`Sample status updated to ${newStatus}`);
      setIsDetailsOpen(false);
    } catch (error) {
      toast.error('Failed to update sample status');
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30',
      collected: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
      processing: 'bg-purple-500/10 text-purple-600 border-purple-500/30',
      completed: 'bg-green-500/10 text-green-600 border-green-500/30',
      rejected: 'bg-destructive/10 text-destructive border-destructive/30',
    };
    return (
      <Badge variant="outline" className={colors[status] || ''}>
        {status}
      </Badge>
    );
  };

  const filteredSamples = samples.filter(sample => {
    const matchesSearch = 
      sample.sample_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sample.barcode?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || sample.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
                  <p className="text-sm text-muted-foreground">Pending Collection</p>
                  <p className="text-2xl font-bold">{samples.filter(s => s.status === 'pending').length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500/10 rounded-lg">
                  <TestTube className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Collected</p>
                  <p className="text-2xl font-bold">{samples.filter(s => s.status === 'collected').length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-500/10 rounded-lg">
                  <RefreshCw className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Processing</p>
                  <p className="text-2xl font-bold">{samples.filter(s => s.status === 'processing').length}</p>
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
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold">{samples.filter(s => s.status === 'completed').length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <TestTube className="h-5 w-5" />
                  Sample Management
                </CardTitle>
                <CardDescription>Track samples from collection to results</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={fetchSamples}>
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
                  placeholder="Search by sample ID or barcode..."
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
                  <SelectItem value="collected">Collected</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sample ID</TableHead>
                    <TableHead>Barcode</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Collection Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSamples.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No samples found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSamples.map((sample) => (
                      <TableRow key={sample.id}>
                        <TableCell className="font-medium">{sample.sample_id}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Barcode className="h-4 w-4 text-muted-foreground" />
                            {sample.barcode || '-'}
                          </div>
                        </TableCell>
                        <TableCell>{sample.sample_type}</TableCell>
                        <TableCell>
                          {sample.collection_time 
                            ? format(new Date(sample.collection_time), 'MMM d, h:mm a')
                            : '-'}
                        </TableCell>
                        <TableCell>{getStatusBadge(sample.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => {
                                setSelectedSample(sample);
                                setIsDetailsOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {sample.status === 'pending' && (
                              <Button 
                                size="sm"
                                onClick={() => updateSampleStatus(sample.id, 'collected')}
                              >
                                Collect
                              </Button>
                            )}
                            {sample.status === 'collected' && (
                              <Button 
                                size="sm"
                                onClick={() => updateSampleStatus(sample.id, 'processing')}
                              >
                                Process
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
              <TestTube className="h-5 w-5" />
              Sample Details - {selectedSample?.sample_id}
            </DialogTitle>
          </DialogHeader>

          {selectedSample && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Sample ID</p>
                  <p className="font-medium">{selectedSample.sample_id}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Status</p>
                  {getStatusBadge(selectedSample.status)}
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Sample Type</p>
                  <p className="font-medium">{selectedSample.sample_type}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Barcode</p>
                  <p className="font-medium font-mono">{selectedSample.barcode || '-'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Collection Time</p>
                  <p className="font-medium">
                    {selectedSample.collection_time 
                      ? format(new Date(selectedSample.collection_time), 'MMM d, yyyy h:mm a')
                      : 'Not collected'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Order ID</p>
                  <p className="font-medium">{selectedSample.order_id}</p>
                </div>
              </div>

              {selectedSample.notes && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Notes</p>
                  <Card className="p-4 bg-muted/50">
                    <p className="text-sm">{selectedSample.notes}</p>
                  </Card>
                </div>
              )}

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Update Status</h4>
                <div className="flex gap-2 flex-wrap">
                  {['pending', 'collected', 'processing', 'completed', 'rejected'].map(status => (
                    <Button
                      key={status}
                      size="sm"
                      variant={selectedSample.status === status ? 'default' : 'outline'}
                      onClick={() => updateSampleStatus(selectedSample.id, status)}
                      disabled={selectedSample.status === status}
                    >
                      {status}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
