import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Check, X, RotateCcw, Clock, Building2, Globe, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface InsuranceRequest {
  id: string;
  provider_id: string;
  clinic_id: string;
  request_type: string;
  status: string;
  submitted_at: string;
  processed_at: string | null;
  reviewer_notes: string | null;
  original_data: Record<string, unknown> | null;
  insurance_providers: {
    id: string;
    provider_name: string;
    country: string;
    logo_url: string | null;
  } | null;
  practices: {
    id: string;
    name: string;
  } | null;
}

export const AdminInsuranceApproval = () => {
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState<InsuranceRequest | null>(null);
  const [notes, setNotes] = useState('');
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'revision' | null>(null);

  // Fetch all requests
  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['admin-insurance-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('public_insurance_requests')
        .select(`
          *,
          insurance_providers (id, provider_name, country, logo_url),
          practices (id, name)
        `)
        .order('submitted_at', { ascending: false });
      
      if (error) throw error;
      return data as InsuranceRequest[];
    },
  });

  // Process request mutation
  const processRequestMutation = useMutation({
    mutationFn: async ({ requestId, action, notes }: { requestId: string; action: string; notes: string }) => {
      const { error } = await supabase.rpc('process_insurance_request', {
        p_request_id: requestId,
        p_action: action,
        p_notes: notes || null,
      });
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-insurance-requests'] });
      queryClient.invalidateQueries({ queryKey: ['insurance-providers'] });
      setSelectedRequest(null);
      setNotes('');
      setActionType(null);
      
      const actionMessages = {
        approve: 'Insurance approved and added to global database',
        reject: 'Insurance request rejected',
        revision: 'Revision requested from clinic',
      };
      toast.success(actionMessages[variables.action as keyof typeof actionMessages]);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleAction = () => {
    if (!selectedRequest || !actionType) return;
    processRequestMutation.mutate({
      requestId: selectedRequest.id,
      action: actionType,
      notes,
    });
  };

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const processedRequests = requests.filter(r => r.status !== 'pending');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge className="bg-green-500"><Check className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><X className="h-3 w-3 mr-1" />Rejected</Badge>;
      case 'revision_requested':
        return <Badge variant="outline" className="border-amber-500 text-amber-600"><RotateCcw className="h-3 w-3 mr-1" />Revision</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const RequestCard = ({ request }: { request: InsuranceRequest }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              {request.insurance_providers?.logo_url ? (
                <img 
                  src={request.insurance_providers.logo_url} 
                  alt="" 
                  className="h-10 w-10 rounded-full object-cover" 
                />
              ) : (
                <span className="text-sm font-semibold text-primary">
                  {request.insurance_providers?.provider_name?.substring(0, 2).toUpperCase() || '??'}
                </span>
              )}
            </div>
            <div>
              <h4 className="font-semibold">{request.insurance_providers?.provider_name || 'Unknown Provider'}</h4>
              <p className="text-sm text-muted-foreground">{request.insurance_providers?.country}</p>
              <div className="flex items-center gap-2 mt-1">
                <Building2 className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {request.practices?.name || 'Unknown Clinic'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            {getStatusBadge(request.status)}
            <span className="text-xs text-muted-foreground">
              {format(new Date(request.submitted_at), 'MMM dd, yyyy')}
            </span>
          </div>
        </div>
        
        {request.status === 'pending' && (
          <div className="flex gap-2 mt-4 pt-4 border-t">
            <Button 
              size="sm" 
              className="flex-1 bg-green-500 hover:bg-green-600"
              onClick={() => {
                setSelectedRequest(request);
                setActionType('approve');
              }}
            >
              <Check className="h-4 w-4 mr-1" />
              Approve
            </Button>
            <Button 
              size="sm" 
              variant="destructive"
              className="flex-1"
              onClick={() => {
                setSelectedRequest(request);
                setActionType('reject');
              }}
            >
              <X className="h-4 w-4 mr-1" />
              Reject
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => {
                setSelectedRequest(request);
                setActionType('revision');
              }}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        )}

        {request.reviewer_notes && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs font-medium text-muted-foreground mb-1">Reviewer Notes:</p>
            <p className="text-sm">{request.reviewer_notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Insurance Approval Requests</h2>
        <p className="text-muted-foreground">Review and approve insurance providers submitted by clinics</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingRequests.length}</p>
              <p className="text-sm text-muted-foreground">Pending Review</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
              <Check className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{requests.filter(r => r.status === 'approved').length}</p>
              <p className="text-sm text-muted-foreground">Approved</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
              <X className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{requests.filter(r => r.status === 'rejected').length}</p>
              <p className="text-sm text-muted-foreground">Rejected</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending" className="gap-2">
            <Clock className="h-4 w-4" />
            Pending ({pendingRequests.length})
          </TabsTrigger>
          <TabsTrigger value="processed" className="gap-2">
            <Check className="h-4 w-4" />
            Processed ({processedRequests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          {pendingRequests.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Globe className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">No Pending Requests</h3>
                <p className="text-muted-foreground">
                  All insurance submissions have been reviewed
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {pendingRequests.map(request => (
                <RequestCard key={request.id} request={request} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="processed" className="mt-4">
          {processedRequests.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">No processed requests yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {processedRequests.map(request => (
                <RequestCard key={request.id} request={request} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Action Dialog */}
      <Dialog open={!!actionType} onOpenChange={() => setActionType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' && 'Approve Insurance Request'}
              {actionType === 'reject' && 'Reject Insurance Request'}
              {actionType === 'revision' && 'Request Revision'}
            </DialogTitle>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="py-4">
              <div className="flex items-center gap-3 p-4 bg-muted rounded-lg mb-4">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-semibold text-primary">
                    {selectedRequest.insurance_providers?.provider_name?.substring(0, 2).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-medium">{selectedRequest.insurance_providers?.provider_name}</p>
                  <p className="text-sm text-muted-foreground">
                    Submitted by {selectedRequest.practices?.name}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Notes (optional)</label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={
                    actionType === 'approve' 
                      ? 'Add any notes for internal record...'
                      : actionType === 'reject'
                      ? 'Explain why this request was rejected...'
                      : 'Describe what changes are needed...'
                  }
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setActionType(null)}>Cancel</Button>
            <Button 
              onClick={handleAction}
              disabled={processRequestMutation.isPending}
              className={
                actionType === 'approve' ? 'bg-green-500 hover:bg-green-600' :
                actionType === 'reject' ? 'bg-destructive' : ''
              }
            >
              {actionType === 'approve' && 'Approve & Add to Global'}
              {actionType === 'reject' && 'Reject Request'}
              {actionType === 'revision' && 'Send for Revision'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
