import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, MapPin, Star, Users, Building2, Phone, Mail, Globe, Clock, Loader2, Filter, CheckCircle, XCircle, Inbox } from "lucide-react";
import { useClinics, useClinicJoinRequests, useRequestToJoinClinic, useCancelJoinRequest, useDoctorInvitations, Clinic } from "@/hooks/useClinics";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ClinicDetailModal } from "./ClinicDetailModal";
import { useDebounce } from "@/hooks/use-debounce";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";

const ClinicFinderSection = () => {
  const { t } = useTranslation("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState("");
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { user, profile } = useAuth();
  
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  
  const [doctorId, setDoctorId] = useState<string | null>(null);
  
  useEffect(() => {
    const getDoctorId = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('doctors')
        .select('id')
        .eq('user_id', user.id)
        .single();
      if (data) setDoctorId(data.id);
    };
    getDoctorId();
  }, [user]);

  const { data: clinics, isLoading, error } = useClinics(debouncedSearchQuery, selectedSpecialty);
  const { data: joinRequests } = useClinicJoinRequests(doctorId || '');
  const { data: invitations } = useDoctorInvitations(profile?.email || user?.email || '');
  const requestToJoinMutation = useRequestToJoinClinic();
  const cancelRequestMutation = useCancelJoinRequest();

  const requestStatusMap = useMemo(() => {
    const map: Record<string, any> = {};
    joinRequests?.forEach((req: any) => {
      map[req.practice_id] = req;
    });
    return map;
  }, [joinRequests]);

  const handleJoinRequest = async (clinic: Clinic) => {
    if (!doctorId) return;
    const practiceId = clinic.practice_id || clinic.id;
    const locationId = clinic.practice_id ? clinic.id : undefined;
    await requestToJoinMutation.mutateAsync({ doctorId, practiceId, locationId });
  };

  const cancelRequest = async (clinicId: string) => {
    const request = requestStatusMap[clinicId];
    if (request) {
      await cancelRequestMutation.mutateAsync(request.id);
    }
  };

  const getRequestStatus = (clinicId: string) => {
    const request = requestStatusMap[clinicId];
    return request?.status || "none";
  };

  const filteredClinics = useMemo(() => {
    if (!clinics) return [];
    return clinics.filter(clinic => {
      const matchesRating = selectedRating === null || clinic.average_rating >= selectedRating;
      return matchesRating;
    });
  }, [clinics, selectedRating]);

  const handleViewDetails = (clinic: Clinic) => {
    setSelectedClinic(clinic);
    setIsModalOpen(true);
  };

  const handleJoinFromModal = () => {
    if (selectedClinic && doctorId) {
      handleJoinRequest(selectedClinic);
    }
  };

  const renderActionButton = (clinic: Clinic) => {
    const practiceId = clinic.practice_id || clinic.id;
    const status = getRequestStatus(practiceId);
    
    switch (status) {
      case "pending":
        return (
          <div className="space-y-2">
            <Badge className="bg-amber-100 text-amber-700">{t("doctor.clinicFinder.requestPending")}</Badge>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => cancelRequest(practiceId)}
              disabled={cancelRequestMutation.isPending}
            >
              {t("doctor.clinicFinder.cancelRequest")}
            </Button>
          </div>
        );
      case "accepted":
        return <Badge className="bg-green-100 text-green-700">{t("doctor.clinicFinder.requestAccepted")}</Badge>;
      case "rejected":
        return <Badge variant="destructive">{t("doctor.clinicFinder.requestRejected")}</Badge>;
      default:
        return (
          <Button 
            onClick={() => handleJoinRequest(clinic)}
            disabled={requestToJoinMutation.isPending}
          >
            {requestToJoinMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {t("doctor.clinicFinder.requestToJoin")}
          </Button>
        );
    }
  };

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <p className="text-destructive mb-4">{t("doctor.clinicFinder.failedToLoad")} {error.message}</p>
          <Button onClick={() => window.location.reload()}>{t("doctor.clinicFinder.tryAgain")}</Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Clinic Invitations */}
      {invitations && invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Inbox className="w-5 h-5" />
              Clinic Invitations
              <Badge variant="secondary">{invitations.filter((i: any) => i.status === 'pending').length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {invitations.map((inv: any) => (
                <div key={inv.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border">
                  <div>
                    <p className="font-medium">Invitation to join as {inv.role}</p>
                    {inv.custom_message && <p className="text-sm text-muted-foreground mt-1">{inv.custom_message}</p>}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(inv.created_at), "MMM dd, yyyy")}
                      <span>• Expires: {format(new Date(inv.expires_at), "MMM dd, yyyy")}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {inv.status === 'pending' ? (
                      <Badge className="bg-amber-100 text-amber-700">Pending</Badge>
                    ) : inv.status === 'accepted' ? (
                      <Badge className="bg-green-100 text-green-700">Accepted</Badge>
                    ) : (
                      <Badge variant="destructive">{inv.status}</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* My Applications */}
      {joinRequests && joinRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              My Applications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {joinRequests.map((req: any) => {
                const practice = req.practices || {};
                const location = req.location || {};
                return (
                  <div key={req.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={practice.logo_url || ""} />
                        <AvatarFallback>{(practice.name || "?").charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{practice.name || "Unknown Practice"}</div>
                        {location.name && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {location.name}{location.city ? `, ${location.city}` : ''}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground">
                          Applied: {format(new Date(req.created_at), "MMM dd, yyyy")}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {req.status === 'pending' ? (
                        <>
                          <Badge className="bg-amber-100 text-amber-700">Pending</Badge>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => cancelRequest(req.practice_id)}
                            disabled={cancelRequestMutation.isPending}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : req.status === 'accepted' ? (
                        <Badge className="bg-green-100 text-green-700">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Accepted
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <XCircle className="h-3 w-3 mr-1" />
                          Rejected
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            {t("doctor.clinicFinder.title")}
          </CardTitle>
          <p className="text-muted-foreground">
            {t("doctor.clinicFinder.description")}
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search by clinic name, city, or address..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filters:</span>
              <select
                value={selectedRating || ''}
                onChange={(e) => setSelectedRating(e.target.value ? Number(e.target.value) : null)}
                className="px-3 py-2 border border-border rounded-md bg-background"
              >
                <option value="">All Ratings</option>
                <option value="4.5">4.5+ Stars</option>
                <option value="4">4+ Stars</option>
                <option value="3">3+ Stars</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="space-y-6">
        {filteredClinics.map((clinic) => (
          <Card key={clinic.id} className="overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <div className="h-48 bg-muted rounded-lg overflow-hidden flex items-center justify-center">
                  {clinic.logo_url ? (
                    <img src={clinic.logo_url} alt={`${clinic.name} logo`} className="w-full h-full object-cover" />
                  ) : (
                    <Building2 className="w-16 h-16 text-muted-foreground" />
                  )}
                </div>
              </div>

              <div className="lg:col-span-2 p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-xl font-semibold">{clinic.name}</h3>
                      {clinic.verified && (
                        <Badge className="bg-green-100 text-green-700">Verified</Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {clinic.city}, {clinic.country}
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        {clinic.average_rating.toFixed(1)} ({clinic.num_reviews} reviews)
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {clinic.appointment_count} appointments
                      </div>
                    </div>

                    <p className="text-muted-foreground mb-4">{clinic.description || 'No description available'}</p>

                    <div className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-muted-foreground" />
                          {clinic.phone}
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          {clinic.email}
                        </div>
                        {clinic.website && (
                          <div className="flex items-center gap-2">
                            <Globe className="w-4 h-4 text-muted-foreground" />
                            <a href={clinic.website} target="_blank" rel="noopener noreferrer" className="hover:underline">
                              {clinic.website}
                            </a>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-muted-foreground" />
                          {clinic.address}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="ml-6 flex flex-col gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleViewDetails(clinic)}
                    >
                      View Details
                    </Button>
                    {renderActionButton(clinic)}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}

        {filteredClinics.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Building2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-medium mb-2">No clinics found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search criteria or check back later for new listings.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
      
      {/* Clinic Detail Modal */}
      <ClinicDetailModal
        clinic={selectedClinic}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onJoinRequest={handleJoinFromModal}
        requestStatus={selectedClinic ? getRequestStatus(selectedClinic.id) : 'none'}
        isSubmitting={requestToJoinMutation.isPending}
      />
    </div>
  );
};

export default ClinicFinderSection;