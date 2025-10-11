import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, MapPin, Search, Star, DollarSign } from "lucide-react";
import { useDoctors } from "@/hooks/useDoctors";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { useBookingAuth } from "@/hooks/useBookingAuth";

const FindDoctors = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [specialty, setSpecialty] = useState<string>("");
  const [location, setLocation] = useState("");
  const [minRating, setMinRating] = useState<number>(0);
  
  const { doctors, loading } = useDoctors();
  const navigate = useNavigate();
  const { handleBookingClick } = useBookingAuth();

  // Filter doctors based on search criteria
  const filteredDoctors = doctors?.filter(doctor => {
    const doctorName = doctor.profiles?.full_name || '';
    const matchesSearch = !searchQuery || 
      doctorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doctor.specialty?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesSpecialty = !specialty || doctor.specialty === specialty;
    const matchesRating = doctor.average_rating >= minRating;
    
    return matchesSearch && matchesSpecialty && matchesRating;
  }) || [];

  const specialties = Array.from(new Set(doctors?.map(d => d.specialty).filter(Boolean))) as string[];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        {/* Search Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Find Your Doctor</h1>
          <p className="text-muted-foreground">Search and book appointments with qualified healthcare professionals</p>
        </div>

        {/* Search and Filters */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or specialty..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={specialty} onValueChange={setSpecialty}>
                <SelectTrigger>
                  <SelectValue placeholder="All Specialties" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Specialties</SelectItem>
                  {specialties.map(spec => (
                    <SelectItem key={spec} value={spec}>{spec}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                placeholder="Location..."
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />

              <Select value={minRating.toString()} onValueChange={(v) => setMinRating(Number(v))}>
                <SelectTrigger>
                  <SelectValue placeholder="Min Rating" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">All Ratings</SelectItem>
                  <SelectItem value="4">4+ Stars</SelectItem>
                  <SelectItem value="4.5">4.5+ Stars</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Results Count */}
        <div className="mb-4">
          <p className="text-sm text-muted-foreground">
            {loading ? 'Loading...' : `${filteredDoctors.length} doctors found`}
          </p>
        </div>

        {/* Doctor Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-16 w-16 rounded-full mb-4" />
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2 mb-4" />
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            ))
          ) : filteredDoctors.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-muted-foreground">No doctors found matching your criteria</p>
            </div>
          ) : (
            filteredDoctors.map((doctor) => (
              <Card key={doctor.id} className="hover:shadow-lg transition-all duration-300 group">
                <CardContent className="p-6">
                  <div className="flex items-center mb-4">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl mr-4">
                      👨‍⚕️
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                        {doctor.profiles?.full_name || 'Doctor'}
                      </h3>
                      <p className="text-muted-foreground text-sm">{doctor.specialty}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-medium">{doctor.average_rating.toFixed(1)}</span>
                        <span className="text-xs text-muted-foreground">({doctor.num_reviews})</span>
                      </div>
                    </div>
                  </div>
                  
                  {doctor.practices?.name && (
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{doctor.practices.name}</span>
                    </div>
                  )}
                  
                  {doctor.consultation_fee && (
                    <div className="flex items-center gap-2 mb-4">
                      <DollarSign className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        ${doctor.consultation_fee} per visit
                      </span>
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <Button 
                      className="flex-1"
                      onClick={() => handleBookingClick(doctor.id, doctor.profiles?.full_name)}
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      Book Appointment
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => navigate(`/doctor/${doctor.id}`)}
                    >
                      View Profile
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default FindDoctors;
