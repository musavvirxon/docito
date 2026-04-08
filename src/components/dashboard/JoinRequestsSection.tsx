import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Check, X, MapPin, Clock, Loader2, UserPlus } from "lucide-react";
import { usePracticeJoinRequests, useRespondToJoinRequest } from "@/hooks/useClinics";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";

interface JoinRequestsSectionProps {
  practiceId: string;
}

export default function JoinRequestsSection({ practiceId }: JoinRequestsSectionProps) {
  const { user } = useAuth();
  const { data: requests, isLoading } = usePracticeJoinRequests(practiceId);
  const respondMutation = useRespondToJoinRequest();

  const pendingRequests = useMemo(() => 
    (requests || []).filter((r: any) => r.status === 'pending'), [requests]);
  
  const processedRequests = useMemo(() => 
    (requests || []).filter((r: any) => r.status !== 'pending'), [requests]);

  const handleRespond = (requestId: string, status: 'accepted' | 'rejected') => {
    if (!user) return;
    respondMutation.mutate({ requestId, status, reviewedBy: user.id });
  };

  if (isLoading) {
    return (
      <Card className="rounded-xl">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pending Applications */}
      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Pending Doctor Applications
            {pendingRequests.length > 0 && (
              <Badge variant="secondary">{pendingRequests.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingRequests.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No pending applications</p>
          ) : (
            <div className="space-y-3">
              {pendingRequests.map((req: any) => {
                const doctor = req.doctors || {};
                const profile = doctor.profiles || {};
                const location = req.location || {};
                return (
                  <div key={req.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={profile.avatar_url || ""} />
                        <AvatarFallback>{(profile.full_name || "?").charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{profile.full_name || "Unknown Doctor"}</p>
                        <p className="text-sm text-muted-foreground">{doctor.specialty || "General"} • {profile.email || ""}</p>
                        {location.name && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                            <MapPin className="h-3 w-3" />
                            Applied to: {location.name}{location.city ? `, ${location.city}` : ''}
                          </div>
                        )}
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {format(new Date(req.created_at), "MMM dd, yyyy")}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleRespond(req.id, 'accepted')}
                        disabled={respondMutation.isPending}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRespond(req.id, 'rejected')}
                        disabled={respondMutation.isPending}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Processed Applications */}
      {processedRequests.length > 0 && (
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle className="text-base">Previous Applications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {processedRequests.slice(0, 10).map((req: any) => {
                const doctor = req.doctors || {};
                const profile = doctor.profiles || {};
                const location = req.location || {};
                return (
                  <div key={req.id} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg border border-border">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={profile.avatar_url || ""} />
                        <AvatarFallback className="text-xs">{(profile.full_name || "?").charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{profile.full_name || "Unknown"}</p>
                        {location.name && (
                          <p className="text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3 inline mr-1" />{location.name}
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge className={req.status === 'accepted' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                      {req.status}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
