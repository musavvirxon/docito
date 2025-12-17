import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Calendar, 
  Clock, 
  User, 
  Stethoscope, 
  FileImage, 
  CheckCircle, 
  AlertTriangle,
  Play,
  Upload,
  Eye,
  Search
} from 'lucide-react';

interface Scan {
  id: string;
  order_number: string;
  patient_name: string;
  patient_id: string;
  referring_doctor: string;
  modality: string;
  exam_name: string;
  body_part: string;
  urgency: 'routine' | 'urgent' | 'stat';
  status: 'scheduled' | 'checked_in' | 'in_progress' | 'image_uploaded' | 'pending_review' | 'finalized' | 'delivered';
  scheduled_at: string;
  contrast: boolean;
  notes: string;
}

interface Props {
  centerId: string;
}

const STATUS_FLOW = ['scheduled', 'checked_in', 'in_progress', 'image_uploaded', 'pending_review', 'finalized', 'delivered'];

export default function ImagingScanWorkflow({ centerId }: Props) {
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedScan, setSelectedScan] = useState<Scan | null>(null);

  useEffect(() => {
    fetchScans();
  }, [centerId]);

  const fetchScans = async () => {
    // Mock data
    setScans([
      {
        id: '1',
        order_number: 'IMG-2024-001',
        patient_name: 'John Smith',
        patient_id: 'P001',
        referring_doctor: 'Dr. Sarah Wilson',
        modality: 'MRI',
        exam_name: 'Brain MRI with Contrast',
        body_part: 'Brain',
        urgency: 'routine',
        status: 'scheduled',
        scheduled_at: '2024-12-17T09:00:00',
        contrast: true,
        notes: 'Patient has mild claustrophobia - may need sedation',
      },
      {
        id: '2',
        order_number: 'IMG-2024-002',
        patient_name: 'Emily Johnson',
        patient_id: 'P002',
        referring_doctor: 'Dr. Michael Chen',
        modality: 'CT',
        exam_name: 'Chest CT',
        body_part: 'Chest',
        urgency: 'urgent',
        status: 'checked_in',
        scheduled_at: '2024-12-17T09:30:00',
        contrast: false,
        notes: '',
      },
      {
        id: '3',
        order_number: 'IMG-2024-003',
        patient_name: 'Robert Davis',
        patient_id: 'P003',
        referring_doctor: 'Dr. Lisa Park',
        modality: 'X-ray',
        exam_name: 'Chest X-ray PA/Lateral',
        body_part: 'Chest',
        urgency: 'routine',
        status: 'in_progress',
        scheduled_at: '2024-12-17T10:00:00',
        contrast: false,
        notes: '',
      },
      {
        id: '4',
        order_number: 'IMG-2024-004',
        patient_name: 'Maria Garcia',
        patient_id: 'P004',
        referring_doctor: 'Dr. James Brown',
        modality: 'Ultrasound',
        exam_name: 'Abdominal Ultrasound',
        body_part: 'Abdomen',
        urgency: 'routine',
        status: 'pending_review',
        scheduled_at: '2024-12-17T08:30:00',
        contrast: false,
        notes: 'NPO for 8 hours',
      },
    ]);
    setLoading(false);
  };

  const getStatusBadge = (status: Scan['status']) => {
    const styles: Record<string, string> = {
      scheduled: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      checked_in: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
      in_progress: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
      image_uploaded: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
      pending_review: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
      finalized: 'bg-green-500/10 text-green-500 border-green-500/20',
      delivered: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
    };
    const labels: Record<string, string> = {
      scheduled: 'Scheduled',
      checked_in: 'Checked In',
      in_progress: 'In Progress',
      image_uploaded: 'Image Uploaded',
      pending_review: 'Awaiting Review',
      finalized: 'Finalized',
      delivered: 'Delivered',
    };
    return <Badge className={styles[status]}>{labels[status]}</Badge>;
  };

  const getUrgencyBadge = (urgency: Scan['urgency']) => {
    if (urgency === 'stat') return <Badge variant="destructive">STAT</Badge>;
    if (urgency === 'urgent') return <Badge className="bg-orange-500/10 text-orange-500">Urgent</Badge>;
    return null;
  };

  const updateScanStatus = (scanId: string, newStatus: Scan['status']) => {
    setScans(prev => prev.map(s => s.id === scanId ? { ...s, status: newStatus } : s));
  };

  const filteredScans = scans.filter(scan => {
    const matchesFilter = filter === 'all' || scan.status === filter;
    const matchesSearch = scan.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         scan.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         scan.exam_name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getNextAction = (status: Scan['status']): { label: string; nextStatus: Scan['status']; icon: any } | null => {
    const actions: Record<string, any> = {
      scheduled: { label: 'Check In', nextStatus: 'checked_in', icon: User },
      checked_in: { label: 'Start Scan', nextStatus: 'in_progress', icon: Play },
      in_progress: { label: 'Upload Images', nextStatus: 'image_uploaded', icon: Upload },
      image_uploaded: { label: 'Send for Review', nextStatus: 'pending_review', icon: Eye },
      pending_review: { label: 'Finalize', nextStatus: 'finalized', icon: CheckCircle },
      finalized: { label: 'Mark Delivered', nextStatus: 'delivered', icon: CheckCircle },
    };
    return actions[status] || null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by patient, order number, or exam..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="checked_in">Checked In</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="image_uploaded">Image Uploaded</SelectItem>
                <SelectItem value="pending_review">Awaiting Review</SelectItem>
                <SelectItem value="finalized">Finalized</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Scan List */}
      <Card>
        <CardHeader>
          <CardTitle>Scan Workflow</CardTitle>
          <CardDescription>Manage imaging scans from scheduling to delivery</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredScans.length === 0 ? (
            <div className="text-center py-12">
              <FileImage className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No scans found</p>
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="space-y-4">
                {filteredScans.map((scan) => {
                  const nextAction = getNextAction(scan.status);
                  return (
                    <div
                      key={scan.id}
                      className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-sm text-muted-foreground">{scan.order_number}</span>
                            {getStatusBadge(scan.status)}
                            {getUrgencyBadge(scan.urgency)}
                            {scan.contrast && <Badge variant="outline">Contrast</Badge>}
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="flex items-center gap-1">
                              <User className="h-4 w-4 text-muted-foreground" />
                              {scan.patient_name}
                            </span>
                            <span className="flex items-center gap-1">
                              <Stethoscope className="h-4 w-4 text-muted-foreground" />
                              {scan.referring_doctor}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium">{scan.exam_name}</p>
                            <p className="text-sm text-muted-foreground">{scan.modality} • {scan.body_part}</p>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            {new Date(scan.scheduled_at).toLocaleDateString()}
                            <Clock className="h-4 w-4 ml-2" />
                            {new Date(scan.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          {scan.notes && (
                            <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                              <AlertTriangle className="h-3 w-3 inline mr-1" />
                              {scan.notes}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => setSelectedScan(scan)}>
                            View Details
                          </Button>
                          {nextAction && (
                            <Button
                              size="sm"
                              onClick={() => updateScanStatus(scan.id, nextAction.nextStatus)}
                            >
                              <nextAction.icon className="h-4 w-4 mr-1" />
                              {nextAction.label}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Scan Details Dialog */}
      <Dialog open={!!selectedScan} onOpenChange={() => setSelectedScan(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Scan Details - {selectedScan?.order_number}</DialogTitle>
          </DialogHeader>
          {selectedScan && (
            <div className="space-y-6 pt-4">
              {/* Status Progress */}
              <div className="flex items-center justify-between">
                {STATUS_FLOW.map((status, index) => {
                  const currentIndex = STATUS_FLOW.indexOf(selectedScan.status);
                  const isCompleted = index < currentIndex;
                  const isCurrent = index === currentIndex;
                  return (
                    <div key={status} className="flex items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                        isCompleted ? 'bg-primary text-primary-foreground' :
                        isCurrent ? 'bg-primary/20 text-primary border-2 border-primary' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {isCompleted ? <CheckCircle className="h-4 w-4" /> : index + 1}
                      </div>
                      {index < STATUS_FLOW.length - 1 && (
                        <div className={`w-8 h-0.5 ${isCompleted ? 'bg-primary' : 'bg-muted'}`} />
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Patient</p>
                  <p className="font-medium">{selectedScan.patient_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Referring Doctor</p>
                  <p className="font-medium">{selectedScan.referring_doctor}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Exam</p>
                  <p className="font-medium">{selectedScan.exam_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Modality</p>
                  <p className="font-medium">{selectedScan.modality}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Body Part</p>
                  <p className="font-medium">{selectedScan.body_part}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Contrast</p>
                  <p className="font-medium">{selectedScan.contrast ? 'Yes' : 'No'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Scheduled</p>
                  <p className="font-medium">{new Date(selectedScan.scheduled_at).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Urgency</p>
                  <p className="font-medium capitalize">{selectedScan.urgency}</p>
                </div>
              </div>

              {selectedScan.notes && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Notes</p>
                  <p className="p-3 bg-muted rounded-lg">{selectedScan.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
