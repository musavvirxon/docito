// src/components/lab/LabSampleManager.tsx
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
  TestTube,
  Search,
  Eye,
  Clock,
  CheckCircle,
  RefreshCw,
  Barcode,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface Sample {
  id: string;
  lab_center_id: string;
  sample_id: string;
  order_id: string | null;
  patient_name: string;
  sample_type: string;
  collection_time: string | null;
  received_time: string | null;
  collector_id: string | null;
  status: string;
  barcode: string | null;
  priority: string;
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
    if (labCenterId) fetchSamples();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [labCenterId]);

  const fetchSamples = async () => {
    try {
      setLoading(true);

      const { data, error } = await (supabase as any)
        .from('lab_samples')
        .select('*')
        .eq('lab_center_id', labCenterId)
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;

      setSamples((data || []) as Sample[]);
    } catch (error) {
      console.error('Error fetching samples:', error);
      toast.error('Failed to load samples');
      setSamples([]);
    } finally {
      setLoading(false);
    }
  };

  const updateSampleStatus = async (sampleId: string, newStatus: string) => {
    const prev = samples;
    try {
      setSamples((p) => p.map((s) => (s.id === sampleId ? { ...s, status: newStatus } : s)));

      const { error } = await (supabase as any)
        .from('lab_samples')
        .update({ status: newStatus })
        .eq('id', sampleId)
        .eq('lab_center_id', labCenterId);

      if (error) throw error;

      toast.success(`Sample status updated to ${newStatus}`);
      setIsDetailsOpen(false);
    } catch (error) {
      console.error('Failed to update sample status:', error);
      setSamples(prev);
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

  const filteredSamples = samples.filter((sample) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      sample.sample_id.toLowerCase().includes(q) ||
      (sample.barcode || '').toLowerCase().includes(q) ||
      sample.patient_name.toLowerCase().includes(q);
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
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold">{samples.filter((s) => s.status === 'pending').length}</p>
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
                  <p className="text-2xl font-bold">{samples.filter((s) => s.status === 'collected').length}</p>
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
                  <p className="text-2xl font-bold">{samples.filter((s) => s.status === 'processing').length}</p>
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
                  <p className="text-2xl font-bold">{samples.filter((s) => s.status === 'completed').length}</p>
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
                  placeholder="Search by sample ID, barcode, or patient..."
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
                    <TableHead>Sample</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Barcode</TableHead>
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
                        <TableCell>
                          <div className="font-medium">{sample.sample_id}</div>
                          <div className="text-xs text-muted-foreground">
                            {sample.collection_time ? format(new Date(sample.collection_time), 'PP p') : 'Not collected'}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{sample.patient_name}</TableCell>
                        <TableCell className="text-sm">{sample.sample_type}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Barcode className="h-4 w-4 text-muted-foreground" />
                            <span className="font-mono text-sm">{sample.barcode || '—'}</span>
                          </div>
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
                              <Button size="sm" onClick={() => updateSampleStatus(sample.id, 'collected')}>
                                Mark Collected
                              </Button>
                            )}
                            {sample.status === 'collected' && (
                              <Button size="sm" onClick={() => updateSampleStatus(sample.id, 'processing')}>
                                Process
                              </Button>
                            )}
                            {sample.status === 'processing' && (
                              <Button size="sm" onClick={() => updateSampleStatus(sample.id, 'completed')}>
                                Complete
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
              Sample Details
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
                  <p className="text-sm text-muted-foreground">Barcode</p>
                  <p className="font-mono">{selectedSample.barcode || '—'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Patient</p>
                  <p className="font-medium">{selectedSample.patient_name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Type</p>
                  <p className="font-medium">{selectedSample.sample_type}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Status</p>
                  {getStatusBadge(selectedSample.status)}
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Priority</p>
                  <p className="font-medium">{selectedSample.priority}</p>
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
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>
              Close
            </Button>
            {selectedSample?.status === 'pending' && (
              <Button onClick={() => updateSampleStatus(selectedSample.id, 'collected')}>Mark Collected</Button>
            )}
            {selectedSample?.status === 'collected' && (
              <Button onClick={() => updateSampleStatus(selectedSample.id, 'processing')}>Move to Processing</Button>
            )}
            {selectedSample?.status === 'processing' && (
              <Button onClick={() => updateSampleStatus(selectedSample.id, 'completed')}>Mark Complete</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
