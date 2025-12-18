import { useState, useEffect } from 'react';
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
  Truck, 
  Search, 
  Eye, 
  MapPin, 
  Clock,
  CheckCircle,
  User,
  Phone,
  Calendar,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface HomeCollection {
  id: string;
  order_id: string;
  patient_name: string;
  patient_phone: string;
  address: string;
  scheduled_date: string;
  scheduled_time: string;
  collector_id: string | null;
  collector_name: string | null;
  status: string;
  notes: string | null;
  created_at: string;
}

interface Props {
  labCenterId: string;
}

export default function LabHomeCollection({ labCenterId }: Props) {
  const [collections, setCollections] = useState<HomeCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedCollection, setSelectedCollection] = useState<HomeCollection | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  useEffect(() => {
    if (labCenterId) {
      fetchCollections();
    }
  }, [labCenterId]);

  const fetchCollections = async () => {
    try {
      setLoading(true);
      // Mock data - would be fetched from home_collections table
      const mockCollections: HomeCollection[] = [
        {
          id: '1',
          order_id: 'ORD-001',
          patient_name: 'John Doe',
          patient_phone: '+1 555-0123',
          address: '123 Main St, Downtown, City 12345',
          scheduled_date: new Date().toISOString(),
          scheduled_time: '09:00 AM - 10:00 AM',
          collector_id: 'col-1',
          collector_name: 'Mike Wilson',
          status: 'scheduled',
          notes: 'Ring doorbell twice',
          created_at: new Date().toISOString(),
        },
        {
          id: '2',
          order_id: 'ORD-002',
          patient_name: 'Jane Smith',
          patient_phone: '+1 555-0124',
          address: '456 Oak Ave, Suburb, City 12346',
          scheduled_date: new Date().toISOString(),
          scheduled_time: '10:00 AM - 11:00 AM',
          collector_id: null,
          collector_name: null,
          status: 'pending',
          notes: null,
          created_at: new Date().toISOString(),
        },
        {
          id: '3',
          order_id: 'ORD-003',
          patient_name: 'Robert Johnson',
          patient_phone: '+1 555-0125',
          address: '789 Pine Rd, Uptown, City 12347',
          scheduled_date: new Date(Date.now() - 86400000).toISOString(),
          scheduled_time: '02:00 PM - 03:00 PM',
          collector_id: 'col-2',
          collector_name: 'Sarah Lee',
          status: 'completed',
          notes: 'Fasting blood sample',
          created_at: new Date().toISOString(),
        },
      ];
      setCollections(mockCollections);
    } catch (error) {
      console.error('Error fetching collections:', error);
      toast.error('Failed to load home collections');
    } finally {
      setLoading(false);
    }
  };

  const updateCollectionStatus = async (id: string, newStatus: string) => {
    try {
      setCollections(prev => prev.map(c => 
        c.id === id ? { ...c, status: newStatus } : c
      ));
      toast.success(`Collection status updated to ${newStatus}`);
      setIsDetailsOpen(false);
    } catch (error) {
      toast.error('Failed to update collection status');
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30',
      scheduled: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
      in_transit: 'bg-purple-500/10 text-purple-600 border-purple-500/30',
      completed: 'bg-green-500/10 text-green-600 border-green-500/30',
      cancelled: 'bg-destructive/10 text-destructive border-destructive/30',
      missed: 'bg-orange-500/10 text-orange-600 border-orange-500/30',
    };
    return (
      <Badge variant="outline" className={colors[status] || ''}>
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  const filteredCollections = collections.filter(collection => {
    const matchesSearch = 
      collection.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      collection.address.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || collection.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const todayCollections = collections.filter(c => {
    const today = new Date().toDateString();
    return new Date(c.scheduled_date).toDateString() === today;
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
                <div className="p-3 bg-blue-500/10 rounded-lg">
                  <Calendar className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Today's Collections</p>
                  <p className="text-2xl font-bold">{todayCollections.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-yellow-500/10 rounded-lg">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pending Assignment</p>
                  <p className="text-2xl font-bold">{collections.filter(c => c.status === 'pending').length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-500/10 rounded-lg">
                  <Truck className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">In Transit</p>
                  <p className="text-2xl font-bold">{collections.filter(c => c.status === 'in_transit').length}</p>
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
                  <p className="text-sm text-muted-foreground">Completed Today</p>
                  <p className="text-2xl font-bold">
                    {todayCollections.filter(c => c.status === 'completed').length}
                  </p>
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
                  <Truck className="h-5 w-5" />
                  Home Sample Collection
                </CardTitle>
                <CardDescription>Manage pickup schedules and staff assignments</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={fetchCollections}>
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
                  placeholder="Search by patient or address..."
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
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="in_transit">In Transit</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="missed">Missed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Scheduled</TableHead>
                    <TableHead>Collector</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCollections.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No collections found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCollections.map((collection) => (
                      <TableRow key={collection.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{collection.patient_name}</p>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {collection.patient_phone}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 max-w-xs">
                            <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="truncate text-sm">{collection.address}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>{format(new Date(collection.scheduled_date), 'MMM d, yyyy')}</p>
                            <p className="text-muted-foreground">{collection.scheduled_time}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {collection.collector_name ? (
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              {collection.collector_name}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Unassigned</span>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(collection.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => {
                                setSelectedCollection(collection);
                                setIsDetailsOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {collection.status === 'scheduled' && (
                              <Button 
                                size="sm"
                                onClick={() => updateCollectionStatus(collection.id, 'in_transit')}
                              >
                                Start
                              </Button>
                            )}
                            {collection.status === 'in_transit' && (
                              <Button 
                                size="sm"
                                onClick={() => updateCollectionStatus(collection.id, 'completed')}
                              >
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
              <Truck className="h-5 w-5" />
              Collection Details
            </DialogTitle>
          </DialogHeader>

          {selectedCollection && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Patient Name</p>
                  <p className="font-medium">{selectedCollection.patient_name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{selectedCollection.patient_phone}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Status</p>
                  {getStatusBadge(selectedCollection.status)}
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Collector</p>
                  <p className="font-medium">{selectedCollection.collector_name || 'Unassigned'}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">Address</p>
                <Card className="p-4 bg-muted/50">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <p>{selectedCollection.address}</p>
                  </div>
                </Card>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Scheduled Date</p>
                  <p className="font-medium">{format(new Date(selectedCollection.scheduled_date), 'MMMM d, yyyy')}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Time Slot</p>
                  <p className="font-medium">{selectedCollection.scheduled_time}</p>
                </div>
              </div>

              {selectedCollection.notes && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Notes</p>
                  <Card className="p-4 bg-muted/50">
                    <p className="text-sm">{selectedCollection.notes}</p>
                  </Card>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>
              Close
            </Button>
            {selectedCollection?.status === 'scheduled' && (
              <Button onClick={() => updateCollectionStatus(selectedCollection.id, 'in_transit')}>
                Start Collection
              </Button>
            )}
            {selectedCollection?.status === 'in_transit' && (
              <Button onClick={() => updateCollectionStatus(selectedCollection.id, 'completed')}>
                Mark Complete
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
