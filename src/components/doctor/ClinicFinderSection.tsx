import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, MapPin, Star, Users, Building2, Phone, Mail, Globe, Clock } from "lucide-react";

interface Clinic {
  id: string;
  name: string;
  description: string;
  location: string;
  zipCode: string;
  rating: number;
  totalDoctors: number;
  specialties: string[];
  photos: string[];
  verified: boolean;
  contactPhone: string;
  contactEmail: string;
  website?: string;
  requestStatus?: "none" | "pending" | "accepted" | "rejected";
}

const ClinicFinderSection = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState("");
  const [requestStatuses, setRequestStatuses] = useState<Record<string, string>>({});

  const [clinics] = useState<Clinic[]>([
    {
      id: "1",
      name: "Metro Medical Center",
      description: "Leading multi-specialty healthcare facility serving the downtown area with state-of-the-art equipment and experienced physicians.",
      location: "Downtown, New York",
      zipCode: "10001",
      rating: 4.8,
      totalDoctors: 45,
      specialties: ["Cardiology", "Internal Medicine", "Pediatrics", "Orthopedics"],
      photos: ["/api/placeholder/300/200", "/api/placeholder/300/200"],
      verified: true,
      contactPhone: "(555) 123-4567",
      contactEmail: "admin@metromed.com",
      website: "www.metromed.com",
      requestStatus: "none"
    },
    {
      id: "2",
      name: "Family Care Associates",
      description: "Comprehensive family medicine practice focusing on preventive care and wellness for patients of all ages.",
      location: "Midtown, New York",
      zipCode: "10017",
      rating: 4.6,
      totalDoctors: 12,
      specialties: ["Family Medicine", "Pediatrics", "Geriatrics"],
      photos: ["/api/placeholder/300/200"],
      verified: true,
      contactPhone: "(555) 234-5678",
      contactEmail: "info@familycare.com",
      requestStatus: "pending"
    },
    {
      id: "3",
      name: "Heart & Wellness Clinic",
      description: "Specialized cardiac care center with advanced diagnostic capabilities and preventive cardiology programs.",
      location: "Upper East Side, New York",
      zipCode: "10021",
      rating: 4.9,
      totalDoctors: 8,
      specialties: ["Cardiology", "Cardiac Surgery", "Vascular Medicine"],
      photos: ["/api/placeholder/300/200", "/api/placeholder/300/200", "/api/placeholder/300/200"],
      verified: true,
      contactPhone: "(555) 345-6789",
      contactEmail: "contact@heartwellness.com",
      website: "www.heartwellness.com",
      requestStatus: "none"
    },
    {
      id: "4",
      name: "Brooklyn Health Partners",
      description: "Community-focused healthcare practice providing comprehensive medical services to Brooklyn residents.",
      location: "Brooklyn, New York",
      zipCode: "11201",
      rating: 4.4,
      totalDoctors: 18,
      specialties: ["Internal Medicine", "Family Medicine", "Dermatology", "Psychiatry"],
      photos: ["/api/placeholder/300/200"],
      verified: false,
      contactPhone: "(555) 456-7890",
      contactEmail: "info@brooklynhealth.com",
      requestStatus: "none"
    }
  ]);

  const specialties = ["All Specialties", "Cardiology", "Family Medicine", "Internal Medicine", "Pediatrics", "Orthopedics", "Dermatology"];

  const handleJoinRequest = (clinicId: string) => {
    setRequestStatuses(prev => ({
      ...prev,
      [clinicId]: "pending"
    }));
  };

  const cancelRequest = (clinicId: string) => {
    setRequestStatuses(prev => ({
      ...prev,
      [clinicId]: "none"
    }));
  };

  const getRequestStatus = (clinic: Clinic) => {
    return requestStatuses[clinic.id] || clinic.requestStatus || "none";
  };

  const filteredClinics = clinics.filter(clinic => {
    const matchesSearch = !searchQuery || 
      clinic.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      clinic.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      clinic.zipCode.includes(searchQuery);
    
    const matchesSpecialty = !selectedSpecialty || selectedSpecialty === "All Specialties" ||
      clinic.specialties.some(spec => spec.includes(selectedSpecialty));
    
    return matchesSearch && matchesSpecialty;
  });

  const renderActionButton = (clinic: Clinic) => {
    const status = getRequestStatus(clinic);
    
    switch (status) {
      case "pending":
        return (
          <div className="space-y-2">
            <Badge className="bg-amber-100 text-amber-700">Request Pending</Badge>
            <Button variant="outline" size="sm" onClick={() => cancelRequest(clinic.id)}>
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
          <Button onClick={() => handleJoinRequest(clinic.id)}>
            Request to Join
          </Button>
        );
    }
  };

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
              {/* Clinic Photos */}
              <div className="lg:col-span-1">
                <div className="grid grid-cols-2 gap-2 h-48">
                  {clinic.photos.slice(0, 4).map((photo, index) => (
                    <div
                      key={index}
                      className={`bg-muted rounded-lg overflow-hidden ${
                        index === 0 && clinic.photos.length > 1 ? 'col-span-2' : ''
                      }`}
                    >
                      <img
                        src={photo}
                        alt={`${clinic.name} - Photo ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
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
                        {clinic.location} • {clinic.zipCode}
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        {clinic.rating}
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {clinic.totalDoctors} doctors
                      </div>
                    </div>

                    <p className="text-muted-foreground mb-4">{clinic.description}</p>

                    <div className="space-y-3">
                      <div>
                        <h4 className="font-medium mb-2">Specialties</h4>
                        <div className="flex flex-wrap gap-2">
                          {clinic.specialties.map((specialty) => (
                            <Badge key={specialty} variant="outline">{specialty}</Badge>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-muted-foreground" />
                          {clinic.contactPhone}
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          {clinic.contactEmail}
                        </div>
                        {clinic.website && (
                          <div className="flex items-center gap-2">
                            <Globe className="w-4 h-4 text-muted-foreground" />
                            {clinic.website}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="ml-6">
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

      {/* Join Request Status */}
      {Object.keys(requestStatuses).some(id => requestStatuses[id] === "pending") && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Pending Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(requestStatuses)
                .filter(([_, status]) => status === "pending")
                .map(([clinicId]) => {
                  const clinic = clinics.find(c => c.id === clinicId);
                  if (!clinic) return null;
                  
                  return (
                    <div key={clinicId} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src="/api/placeholder/40/40" />
                          <AvatarFallback>{clinic.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{clinic.name}</div>
                          <div className="text-sm text-muted-foreground">{clinic.location}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-amber-100 text-amber-700">Pending</Badge>
                        <Button variant="outline" size="sm" onClick={() => cancelRequest(clinicId)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ClinicFinderSection;