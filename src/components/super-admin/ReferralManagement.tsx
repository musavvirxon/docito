import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { 
  Search, 
  Filter, 
  RefreshCw, 
  ArrowRightLeft, 
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  Eye,
  Ban,
  BarChart3
} from 'lucide-react';

interface Referral {
  id: string;
  referral_number: string;
  patient_id: string;
  referrer_entity_type: string;
  referrer_entity_id: string;
  receiver_entity_type: string;
  receiver_entity_id: string;
  referral_type: string;
  priority: string;
  status: string;
  reason: string;
  clinical_notes: string;
  valid_from: string;
  valid_until: string;
  created_at: string;
}

const statusConfig: Record<string, { color: string; icon: React.ReactNode }> = {
  draft: { color: 'bg-muted text-muted-foreground', icon: <Clock className="h-3 w-3" /> },
  sent: { color: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300', icon: <ArrowRightLeft className="h-3 w-3" /> },
  accepted: { color: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300', icon: <CheckCircle className="h-3 w-3" /> },
  booked: { color: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300', icon: <CheckCircle className="h-3 w-3" /> },
  completed: { color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300', icon: <CheckCircle className="h-3 w-3" /> },
  expired: { color: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300', icon: <AlertTriangle className="h-3 w-3" /> },
  cancelled: { color: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300', icon: <XCircle className="h-3 w-3" /> },
  rejected: { color: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300', icon: <Ban className="h-3 w-3" /> },
};

const priorityConfig: Record<string, string> = {
  routine: 'bg-muted text-muted-foreground',
  urgent: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
  stat: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
};

export default function ReferralManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedReferral, setSelectedReferral] = useState<Referral | null>(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'close' | 'reassign' | null>(null);
  const [actionNotes, setActionNotes] = useState('');

  // Fetch all referrals
  const { data: referrals = [], isLoading, refetch } = useQuery({
    queryKey: ['super-admin-referrals', statusFilter, typeFilter],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('referrals')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      let filtered = data || [];
      if (statusFilter !== 'all') {
        filtered = filtered.filter(r => r.status === statusFilter);
      }
      if (typeFilter !== 'all') {
        filtered = filtered.filter(r => r.referral_type === typeFilter);
      }
      
      return filtered.map(r => ({
        id: r.id,
        referral_number: r.referral_number || '',
        patient_id: r.patient_id || '',
        referrer_entity_type: r.referrer_entity_type || '',
        referrer_entity_id: r.referrer_entity_id || '',
        receiver_entity_type: r.receiver_entity_type || '',
        receiver_entity_id: r.receiver_entity_id || '',
        referral_type: r.referral_type || '',
        priority: r.priority || 'routine',
        status: r.status || 'draft',
        reason: r.reason || '',
        clinical_notes: r.clinical_notes || '',
        valid_from: r.valid_from || '',
        valid_until: r.valid_until || '',
        created_at: r.created_at || '',
      })) as Referral[];
    },
  });

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['referral-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('referrals')
        .select('status, priority');
      
      if (error) throw error;

      const statusCounts: Record<string, number> = {};
      const priorityCounts: Record<string, number> = {};

      data?.forEach((r) => {
        statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
        priorityCounts[r.priority] = (priorityCounts[r.priority] || 0) + 1;
      });

      return {
        total: data?.length || 0,
        statusCounts,
        priorityCounts,
        pending: (statusCounts['sent'] || 0) + (statusCounts['accepted'] || 0),
        urgent: priorityCounts['urgent'] || 0,
        stat: priorityCounts['stat'] || 0,
      };
    },
  });

  // Force close mutation
  const forceCloseMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const { error } = await supabase
        .from('referrals')
        .update({ 
          status: 'cancelled',
          clinical_notes: notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Referral closed successfully' });
      queryClient.invalidateQueries({ queryKey: ['super-admin-referrals'] });
      queryClient.invalidateQueries({ queryKey: ['referral-stats'] });
      setActionDialogOpen(false);
      setSelectedReferral(null);
      setActionNotes('');
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const filteredReferrals = referrals.filter((r) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      r.referral_number?.toLowerCase().includes(term) ||
      r.reason?.toLowerCase().includes(term) ||
      r.referral_type?.toLowerCase().includes(term)
    );
  });

  const handleAction = (referral: Referral, type: 'close' | 'reassign') => {
    setSelectedReferral(referral);
    setActionType(type);
    setActionDialogOpen(true);
  };

  const executeAction = () => {
    if (!selectedReferral || !actionType) return;

    if (actionType === 'close') {
      forceCloseMutation.mutate({ id: selectedReferral.id, notes: actionNotes });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Referral Management</h1>
        <p className="text-muted-foreground mt-1">Monitor and manage all platform referrals</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <ArrowRightLeft className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.total || 0}</p>
                <p className="text-sm text-muted-foreground">Total Referrals</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Clock className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.pending || 0}</p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.urgent || 0}</p>
                <p className="text-sm text-muted-foreground">Urgent</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.stat || 0}</p>
                <p className="text-sm text-muted-foreground">STAT</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.statusCounts?.completed || 0}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
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
                placeholder="Search referrals..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="booked">Booked</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="consultation">Consultation</SelectItem>
                <SelectItem value="diagnostic">Diagnostic</SelectItem>
                <SelectItem value="imaging">Imaging</SelectItem>
                <SelectItem value="pharmacy">Pharmacy</SelectItem>
                <SelectItem value="follow_up">Follow-up</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Referrals Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Referrals</CardTitle>
          <CardDescription>
            {filteredReferrals.length} referrals found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredReferrals.length === 0 ? (
            <div className="text-center py-12">
              <ArrowRightLeft className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No referrals found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Referral #</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Valid Until</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReferrals.map((referral) => {
                    const statusStyle = statusConfig[referral.status] || statusConfig.draft;
                    const priorityStyle = priorityConfig[referral.priority] || priorityConfig.routine;

                    return (
                      <TableRow key={referral.id}>
                        <TableCell className="font-mono text-sm">
                          {referral.referral_number || referral.id.slice(0, 8)}
                        </TableCell>
                        <TableCell className="capitalize">
                          {referral.referral_type?.replace('_', ' ') || 'N/A'}
                        </TableCell>
                        <TableCell>
                          <Badge className={priorityStyle}>
                            {referral.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${statusStyle.color} flex items-center gap-1 w-fit`}>
                            {statusStyle.icon}
                            {referral.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="capitalize text-sm">
                          {referral.referrer_entity_type?.replace('_', ' ')}
                        </TableCell>
                        <TableCell className="capitalize text-sm">
                          {referral.receiver_entity_type?.replace('_', ' ')}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(referral.created_at), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {referral.valid_until 
                            ? format(new Date(referral.valid_until), 'MMM dd, yyyy')
                            : 'N/A'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setSelectedReferral(referral)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {!['completed', 'cancelled', 'rejected'].includes(referral.status) && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                onClick={() => handleAction(referral, 'close')}
                              >
                                <Ban className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'close' ? 'Force Close Referral' : 'Reassign Referral'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'close' 
                ? 'This will cancel the referral. Please provide a reason.'
                : 'Reassign this referral to a different receiver.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <p className="text-sm font-medium mb-2">Referral</p>
              <p className="text-sm text-muted-foreground">
                #{selectedReferral?.referral_number || selectedReferral?.id.slice(0, 8)}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium">Notes</label>
              <Textarea
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                placeholder="Enter reason or notes..."
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant={actionType === 'close' ? 'destructive' : 'default'}
              onClick={executeAction}
              disabled={forceCloseMutation.isPending}
            >
              {forceCloseMutation.isPending ? 'Processing...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Referral Dialog */}
      <Dialog open={!!selectedReferral && !actionDialogOpen} onOpenChange={() => setSelectedReferral(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Referral Details</DialogTitle>
          </DialogHeader>
          {selectedReferral && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Referral Number</p>
                  <p className="font-mono">{selectedReferral.referral_number || selectedReferral.id.slice(0, 8)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge className={statusConfig[selectedReferral.status]?.color}>
                    {selectedReferral.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Type</p>
                  <p className="capitalize">{selectedReferral.referral_type?.replace('_', ' ')}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Priority</p>
                  <Badge className={priorityConfig[selectedReferral.priority]}>
                    {selectedReferral.priority}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">From</p>
                  <p className="capitalize">{selectedReferral.referrer_entity_type?.replace('_', ' ')}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">To</p>
                  <p className="capitalize">{selectedReferral.receiver_entity_type?.replace('_', ' ')}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Valid From</p>
                  <p>{selectedReferral.valid_from ? format(new Date(selectedReferral.valid_from), 'PPP') : 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Valid Until</p>
                  <p>{selectedReferral.valid_until ? format(new Date(selectedReferral.valid_until), 'PPP') : 'N/A'}</p>
                </div>
              </div>
              {selectedReferral.reason && (
                <div>
                  <p className="text-sm text-muted-foreground">Reason</p>
                  <p>{selectedReferral.reason}</p>
                </div>
              )}
              {selectedReferral.clinical_notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Clinical Notes</p>
                  <p className="text-sm">{selectedReferral.clinical_notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
