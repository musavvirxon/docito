import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  FileText, 
  Search, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Send,
  Edit,
  Eye,
  Download
} from 'lucide-react';
import { toast } from 'sonner';

interface Report {
  id: string;
  order_number: string;
  patient_name: string;
  exam_name: string;
  modality: string;
  radiologist: string;
  status: 'pending' | 'draft' | 'finalized' | 'delivered';
  findings: string;
  impression: string;
  critical_findings: boolean;
  created_at: string;
  finalized_at: string | null;
}

interface Props {
  centerId: string;
}

export default function ImagingReportManager({ centerId }: Props) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    findings: '',
    impression: '',
    critical_findings: false,
  });

  useEffect(() => {
    fetchReports();
  }, [centerId]);

  const fetchReports = async () => {
    // Mock data
    setReports([
      {
        id: '1',
        order_number: 'IMG-2024-001',
        patient_name: 'John Smith',
        exam_name: 'Brain MRI with Contrast',
        modality: 'MRI',
        radiologist: 'Dr. Amanda Lee',
        status: 'pending',
        findings: '',
        impression: '',
        critical_findings: false,
        created_at: '2024-12-17T09:00:00',
        finalized_at: null,
      },
      {
        id: '2',
        order_number: 'IMG-2024-002',
        patient_name: 'Emily Johnson',
        exam_name: 'Chest CT',
        modality: 'CT',
        radiologist: 'Dr. Robert Kim',
        status: 'draft',
        findings: 'Bilateral lung nodules identified. Largest measuring 8mm in right upper lobe.',
        impression: 'Multiple pulmonary nodules. Recommend follow-up CT in 3 months.',
        critical_findings: true,
        created_at: '2024-12-17T08:30:00',
        finalized_at: null,
      },
      {
        id: '3',
        order_number: 'IMG-2024-003',
        patient_name: 'Robert Davis',
        exam_name: 'Chest X-ray PA/Lateral',
        modality: 'X-ray',
        radiologist: 'Dr. Amanda Lee',
        status: 'finalized',
        findings: 'Clear lung fields bilaterally. Normal cardiac silhouette. No pleural effusion.',
        impression: 'Normal chest radiograph.',
        critical_findings: false,
        created_at: '2024-12-17T08:00:00',
        finalized_at: '2024-12-17T09:30:00',
      },
    ]);
    setLoading(false);
  };

  const getStatusBadge = (status: Report['status']) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
      draft: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      finalized: 'bg-green-500/10 text-green-500 border-green-500/20',
      delivered: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
    };
    return <Badge className={styles[status]}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>;
  };

  const openReport = (report: Report) => {
    setSelectedReport(report);
    setFormData({
      findings: report.findings,
      impression: report.impression,
      critical_findings: report.critical_findings,
    });
    setEditMode(report.status === 'pending' || report.status === 'draft');
  };

  const saveReport = () => {
    if (!selectedReport) return;
    
    setReports(prev => prev.map(r => 
      r.id === selectedReport.id 
        ? { ...r, ...formData, status: 'draft' as const }
        : r
    ));
    toast.success('Report saved as draft');
  };

  const finalizeReport = () => {
    if (!selectedReport) return;
    
    if (!formData.findings || !formData.impression) {
      toast.error('Please complete findings and impression before finalizing');
      return;
    }

    setReports(prev => prev.map(r => 
      r.id === selectedReport.id 
        ? { ...r, ...formData, status: 'finalized' as const, finalized_at: new Date().toISOString() }
        : r
    ));
    setSelectedReport(null);
    toast.success('Report finalized and sent to referring physician');
  };

  const filteredReports = reports.filter(report => {
    const matchesFilter = filter === 'all' || report.status === filter;
    const matchesSearch = report.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         report.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         report.exam_name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-yellow-500/10">
                <Clock className="h-6 w-6 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{reports.filter(r => r.status === 'pending').length}</p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-blue-500/10">
                <Edit className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{reports.filter(r => r.status === 'draft').length}</p>
                <p className="text-sm text-muted-foreground">Drafts</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-500/10">
                <CheckCircle className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{reports.filter(r => r.status === 'finalized').length}</p>
                <p className="text-sm text-muted-foreground">Finalized Today</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-red-500/10">
                <AlertTriangle className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{reports.filter(r => r.critical_findings).length}</p>
                <p className="text-sm text-muted-foreground">Critical Findings</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search reports..."
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
                <SelectItem value="all">All Reports</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="draft">Drafts</SelectItem>
                <SelectItem value="finalized">Finalized</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Reports Table */}
      <Card>
        <CardHeader>
          <CardTitle>Radiologist Reports</CardTitle>
          <CardDescription>Create, review, and finalize imaging reports</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredReports.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No reports found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Exam</TableHead>
                  <TableHead>Radiologist</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell className="font-mono text-sm">{report.order_number}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {report.patient_name}
                        {report.critical_findings && (
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p>{report.exam_name}</p>
                        <p className="text-xs text-muted-foreground">{report.modality}</p>
                      </div>
                    </TableCell>
                    <TableCell>{report.radiologist}</TableCell>
                    <TableCell>{getStatusBadge(report.status)}</TableCell>
                    <TableCell>{new Date(report.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => openReport(report)}>
                        {report.status === 'pending' || report.status === 'draft' ? (
                          <><Edit className="h-4 w-4 mr-1" />Edit</>
                        ) : (
                          <><Eye className="h-4 w-4 mr-1" />View</>
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Report Editor Dialog */}
      <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              {editMode ? 'Edit Report' : 'View Report'} - {selectedReport?.order_number}
            </DialogTitle>
          </DialogHeader>
          {selectedReport && (
            <ScrollArea className="max-h-[70vh]">
              <div className="space-y-6 pr-4">
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Patient</p>
                    <p className="font-medium">{selectedReport.patient_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Exam</p>
                    <p className="font-medium">{selectedReport.exam_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Modality</p>
                    <p className="font-medium">{selectedReport.modality}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Radiologist</p>
                    <p className="font-medium">{selectedReport.radiologist}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-base font-semibold">Findings</Label>
                  {editMode ? (
                    <Textarea
                      value={formData.findings}
                      onChange={(e) => setFormData({ ...formData, findings: e.target.value })}
                      placeholder="Enter detailed findings..."
                      rows={6}
                    />
                  ) : (
                    <p className="p-3 bg-muted rounded-lg whitespace-pre-wrap">
                      {selectedReport.findings || 'No findings recorded'}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-base font-semibold">Impression</Label>
                  {editMode ? (
                    <Textarea
                      value={formData.impression}
                      onChange={(e) => setFormData({ ...formData, impression: e.target.value })}
                      placeholder="Enter impression and recommendations..."
                      rows={4}
                    />
                  ) : (
                    <p className="p-3 bg-muted rounded-lg whitespace-pre-wrap">
                      {selectedReport.impression || 'No impression recorded'}
                    </p>
                  )}
                </div>

                {editMode && (
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="critical"
                      checked={formData.critical_findings}
                      onChange={(e) => setFormData({ ...formData, critical_findings: e.target.checked })}
                      className="rounded"
                    />
                    <Label htmlFor="critical" className="text-red-500 font-medium flex items-center gap-1">
                      <AlertTriangle className="h-4 w-4" />
                      Critical Findings - Requires immediate notification
                    </Label>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={() => setSelectedReport(null)}>
                    Close
                  </Button>
                  {editMode && (
                    <>
                      <Button variant="outline" onClick={saveReport}>
                        Save Draft
                      </Button>
                      <Button onClick={finalizeReport}>
                        <Send className="h-4 w-4 mr-1" />
                        Finalize & Send
                      </Button>
                    </>
                  )}
                  {!editMode && (
                    <Button variant="outline">
                      <Download className="h-4 w-4 mr-1" />
                      Download PDF
                    </Button>
                  )}
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
