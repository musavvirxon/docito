import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, MapPin, Star, Users, Building2, Phone, Mail, Globe, Clock, Loader2 } from "lucide-react";
import { useClinics, useClinicJoinRequests, useRequestToJoinClinic, useCancelJoinRequest } from "@/hooks/useClinics";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const ClinicFinderSection = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState("");
  const { user, profile } = useAuth();
  
  // Get doctor ID
  const [doctorId, setDoctorId] = useState<string | null>(null);
  
  // Fetch doctor ID
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

  const { data: clinics, isLoading } = useClinics(searchQuery, selectedSpecialty);
  const { data: joinRequests } = useClinicJoinRequests(doctorId || '');
  const requestToJoinMutation = useRequestToJoinClinic();
  const cancelRequestMutation = useCancelJoinRequest();

  const specialties = ["All Specialties", "Cardiology", "Family Medicine", "Internal Medicine", "Pediatrics", "Orthopedics", "Dermatology"];

  // Create a map of clinic IDs to request status
  const requestStatusMap = useMemo(() => {
    const map: Record<string, any> = {};
    joinRequests?.forEach((req: any) => {
      map[req.practice_id] = req;
    });
    return map;
  }, [joinRequests]);

  const handleJoinRequest = async (clinicId: string) => {
    if (!doctorId) return;
    await requestToJoinMutation.mutateAsync({ doctorId, practiceId: clinicId });
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
      const matchesSearch = !searchQuery || 
        clinic.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        clinic.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        clinic.address.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesSpecialty = !selectedSpecialty || selectedSpecialty === "All Specialties";
      
      return matchesSearch && matchesSpecialty;
    });
  }, [clinics, searchQuery, selectedSpecialty]);

  const renderActionButton = (clinicId: string) => {
    const status = getRequestStatus(clinicId);
    
    switch (status) {
      case "pending":
        return (
          <div className="space-y-2">
            <Badge className="bg-amber-100 text-amber-700">Request Pending</Badge>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => cancelRequest(clinicId)}
              disabled={cancelRequestMutation.isPending}
            >
              Cancel Request
            </Button>
          </div>
        );
      case "accepted":
        return <Badge className="bg-green-100 text-green-700">Request Accepted</Badge>;
      case "rejected":
        return <Badge variant="destructive">Request Rejected</Badge>;
      default:
        return (
          <Button 
            onClick={() => handleJoinRequest(clinicId)}
            disabled={requestToJoinMutation.isPending}
          >
            {requestToJoinMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Request to Join
          </Button>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Find Clinics to Join
          </CardTitle>
          <p className="text-muted-foreground">
            Search and apply to join established medical practices and clinics
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by clinic name, city, or ZIP code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
            <select
              value={selectedSpecialty}
              onChange={(e) => setSelectedSpecialty(e.target.value)}
              className="px-3 py-2 border border-border rounded-md bg-background"
            >
              {specialties.map(specialty => (
                <option key={specialty} value={specialty}>{specialty}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="space-y-6">
        {filteredClinics.map((clinic) => (
          <Card key={clinic.id} className="overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Clinic Photos - Placeholder */}
              <div className="lg:col-span-1">
                <div className="h-48 bg-muted rounded-lg overflow-hidden flex items-center justify-center">
                  {clinic.logo_url ? (
                    <img
                      src={clinic.logo_url}
                      alt={`${clinic.name} logo`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Building2 className="w-16 h-16 text-muted-foreground" />
                  )}
                </div>
              </div>

              {/* Clinic Information */}
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

                  <div className="ml-6">
                    {renderActionButton(clinic.id)}
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

      {/* Join Request Status */}
      {joinRequests && joinRequests.filter((req: any) => req.status === 'pending').length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Pending Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {joinRequests
                .filter((req: any) => req.status === 'pending')
                .map((req: any) => (
                  <div key={req.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={req.practices.logo_url || "/api/placeholder/40/40"} />
                        <AvatarFallback>{req.practices.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{req.practices.name}</div>
                        <div className="text-sm text-muted-foreground">{req.practices.city}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-amber-100 text-amber-700">Pending</Badge>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => cancelRequest(req.practice_id)}
                        disabled={cancelRequestMutation.isPending}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ClinicFinderSection;