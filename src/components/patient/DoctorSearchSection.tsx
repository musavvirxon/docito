import { useState, useMemo } from "react";
import { Search, MapPin, Star, Calendar, DollarSign, Stethoscope, Filter, X, ChevronDown, Globe, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDoctors } from "@/hooks/useDoctors";
import { useDebounce } from "@/hooks/use-debounce";
import { useNavigate } from "react-router-dom";
import { useBookingAuth } from "@/hooks/useBookingAuth";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { getMainSpecialtyCategory } from "@/utils/specialtyMapping";

const DoctorSearchSection = () => {
  const { t } = useTranslation("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>("all");
  const [selectedCountry, setSelectedCountry] = useState<string>("all");
  const [selectedRegion, setSelectedRegion] = useState<string>("all");
  const [minRating, setMinRating] = useState<number[]>([0]);
  const [sortBy, setSortBy] = useState<string>("relevance");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  
  const { doctors, loading } = useDoctors();
  const debouncedSearch = useDebounce(searchQuery, 300);
  const navigate = useNavigate();
  const { handleBookingClick } = useBookingAuth();

  // Extract unique main specialty categories for filters
  const specialties = useMemo(() => {
    const mainCategories = new Set<string>();
    doctors?.forEach(d => {
      const mainCategory = getMainSpecialtyCategory(d.specialty);
      if (mainCategory) {
        mainCategories.add(mainCategory);
      }
    });
    return Array.from(mainCategories).sort();
  }, [doctors]);
  
  const countries = Array.from(new Set(doctors?.map(d => d.practices?.country).filter(Boolean))) as string[];
  const regions = Array.from(new Set(doctors?.map(d => d.practices?.city).filter(Boolean))) as string[];

  // Filter doctors
  const filteredDoctors = doctors?.filter(doctor => {
    const doctorName = doctor.profiles?.full_name || '';
    const matchesSearch = !debouncedSearch || 
      doctorName.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      doctor.specialty?.toLowerCase().includes(debouncedSearch.toLowerCase());
    
    // Match by main specialty category
    const doctorMainCategory = getMainSpecialtyCategory(doctor.specialty);
    const matchesSpecialty = selectedSpecialty === "all" || doctorMainCategory === selectedSpecialty;
    const matchesCountry = selectedCountry === "all" || doctor.practices?.country === selectedCountry;
    const matchesRegion = selectedRegion === "all" || doctor.practices?.city === selectedRegion;
    const matchesRating = (doctor.average_rating || 0) >= minRating[0];
    
    return matchesSearch && matchesSpecialty && matchesCountry && matchesRegion && matchesRating;
  }) || [];

  // Sort doctors
  const sortedDoctors = [...filteredDoctors].sort((a, b) => {
    switch (sortBy) {
      case "rating":
        return (b.average_rating || 0) - (a.average_rating || 0);
      case "experience":
        return (b.appointment_count || 0) - (a.appointment_count || 0);
      case "price":
        return (a.consultation_fee || 0) - (b.consultation_fee || 0);
      default:
        return 0;
    }
  });

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedSpecialty("all");
    setSelectedCountry("all");
    setSelectedRegion("all");
    setMinRating([0]);
    setSortBy("relevance");
  };

  const handleViewProfile = (doctor: any) => {
    setSelectedDoctor(doctor);
    setShowProfileModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header with gradient text */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-blue-600 to-accent bg-clip-text text-transparent animate-gradient">
            {t("patient.findDoctors.title")}
          </h1>
          <p className="text-muted-foreground mt-1">{t("patient.findDoctors.subtitle")}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={resetFilters}
          className="gap-2"
        >
          <X className="h-4 w-4" />
          {t("patient.findDoctors.resetFilters")}
        </Button>
      </div>

      {/* Sticky Search and Filter Bar */}
      <Card className="sticky top-16 z-20 shadow-lg backdrop-blur-sm bg-background/95 border-2">
        <CardContent className="p-4">
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder={t("patient.findDoctors.searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12 text-base border-2 focus:border-primary transition-all"
              />
            </div>

            {/* Filter Toggle */}
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="gap-2"
              >
                <Filter className="h-4 w-4" />
                {showFilters ? t("patient.findDoctors.hideFilters") : t("patient.findDoctors.showFilters")}
                <ChevronDown className={cn("h-4 w-4 transition-transform", showFilters && "rotate-180")} />
              </Button>
              
              <div className="flex items-center gap-2">
                <Label className="text-sm">{t("patient.findDoctors.sortBy")}:</Label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="relevance">{t("patient.findDoctors.relevance")}</SelectItem>
                    <SelectItem value="rating">{t("patient.findDoctors.rating")}</SelectItem>
                    <SelectItem value="experience">{t("patient.findDoctors.experience")}</SelectItem>
                    <SelectItem value="price">{t("patient.findDoctors.price")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Expanded Filters */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t">
                    <div className="space-y-2">
                      <Label>{t("patient.findDoctors.specialty")}</Label>
                      <Select value={selectedSpecialty} onValueChange={setSelectedSpecialty}>
                        <SelectTrigger>
                          <SelectValue placeholder={t("patient.findDoctors.allSpecialties")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t("patient.findDoctors.allSpecialties")}</SelectItem>
                          {specialties.map(spec => (
                            <SelectItem key={spec} value={spec}>{spec}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>{t("patient.findDoctors.country")}</Label>
                      <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                        <SelectTrigger>
                          <SelectValue placeholder={t("patient.findDoctors.allCountries")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t("patient.findDoctors.allCountries")}</SelectItem>
                          {countries.map(country => (
                            <SelectItem key={country} value={country}>{country}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>{t("patient.findDoctors.regionCity")}</Label>
                      <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                        <SelectTrigger>
                          <SelectValue placeholder={t("patient.findDoctors.allRegions")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t("patient.findDoctors.allRegions")}</SelectItem>
                          {regions.map(region => (
                            <SelectItem key={region} value={region}>{region}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>{t("patient.findDoctors.minimumRating")}: {minRating[0]}+ {t("patient.findDoctors.stars")}</Label>
                      <Slider
                        value={minRating}
                        onValueChange={setMinRating}
                        max={5}
                        step={0.5}
                        className="mt-2"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <div className="text-muted-foreground">
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
              {t("patient.findDoctors.loadingDoctors")}
            </span>
          ) : (
            <span className="font-medium">
              {sortedDoctors.length} {sortedDoctors.length === 1 ? t("patient.findDoctors.doctorsFound") : t("patient.findDoctors.doctorsFoundPlural")} {t("patient.findDoctors.found")}
            </span>
          )}
        </div>
      </div>

      {/* Doctor Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <CardContent className="p-6">
                <Skeleton className="h-20 w-20 rounded-full mb-4" />
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2 mb-4" />
                <Skeleton className="h-10 w-full mb-2" />
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : sortedDoctors.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Stethoscope className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-xl font-semibold mb-2">{t("patient.findDoctors.noDoctorsFound")}</h3>
            <p className="text-muted-foreground mb-4">{t("patient.findDoctors.tryAdjustingFilters")}</p>
            <Button variant="outline" onClick={resetFilters}>
              {t("patient.findDoctors.resetAllFilters")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedDoctors.map((doctor, index) => (
            <motion.div
              key={doctor.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <Card className="group overflow-hidden hover:shadow-2xl transition-all duration-300 border-2 hover:border-primary/50 bg-gradient-to-br from-background to-background/50">
                <CardContent className="p-6 space-y-4">
                  {/* Doctor Header */}
                  <div className="flex items-start gap-4">
                    <Avatar className="h-20 w-20 border-4 border-primary/10 group-hover:border-primary/30 transition-all">
                      <AvatarImage src={doctor.profiles?.avatar_url} />
                      <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-xl">
                        {(doctor.profiles?.full_name || doctor.specialty || 'D').charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg group-hover:text-primary transition-colors truncate">
                        Dr. {doctor.profiles?.full_name || doctor.specialty || 'Medical Professional'}
                      </h3>
                      <Badge variant="secondary" className="mt-1">
                        {doctor.specialty || 'General Practice'}
                      </Badge>
                      <div className="flex items-center gap-1 mt-2">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-semibold">{(doctor.average_rating || 0).toFixed(1)}</span>
                        <span className="text-xs text-muted-foreground">({doctor.num_reviews || 0} {t("patient.findDoctors.reviews")})</span>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Doctor Info */}
                  <div className="space-y-2">
                    {doctor.practices?.name ? (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <span className="truncate">{doctor.practices.name}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <span className="truncate text-muted-foreground">Independent Provider</span>
                      </div>
                    )}
                    
                    {(doctor.practices?.city || doctor.practices?.country) && (
                      <div className="flex items-center gap-2 text-sm">
                        <Globe className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <span className="truncate">
                          {[doctor.practices.city, doctor.practices.country].filter(Boolean).join(', ')}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <span className="font-medium text-primary">
                        {doctor.consultation_fee ? `$${doctor.consultation_fee}` : 'Contact for pricing'}
                      </span>
                      {doctor.consultation_fee && (
                        <span className="text-muted-foreground">{t("patient.findDoctors.perVisit")}</span>
                      )}
                    </div>

                    {doctor.bio && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
                        {doctor.bio}
                      </p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    <Button 
                      className="flex-1 group-hover:shadow-lg transition-all"
                      onClick={() => handleBookingClick(doctor.id, doctor.profiles?.full_name)}
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      {t("patient.findDoctors.bookNow")}
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => handleViewProfile(doctor)}
                      className="group-hover:border-primary/50"
                    >
                      {t("patient.findDoctors.viewProfile")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Profile Modal */}
      <Dialog open={showProfileModal} onOpenChange={setShowProfileModal}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{t("patient.findDoctors.doctorProfile")}</DialogTitle>
          </DialogHeader>
          {selectedDoctor && (
            <ScrollArea className="max-h-[70vh] pr-4">
              <div className="space-y-6">
                {/* Doctor Header */}
                <div className="flex items-start gap-4">
                  <Avatar className="h-24 w-24 border-4 border-primary/20">
                    <AvatarImage src={selectedDoctor.profiles?.avatar_url} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-2xl">
                      {selectedDoctor.profiles?.full_name?.charAt(0) || 'D'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold">{selectedDoctor.profiles?.full_name || 'Doctor'}</h2>
                    <Badge variant="secondary" className="mt-1">{selectedDoctor.specialty}</Badge>
                    <div className="flex items-center gap-1 mt-2">
                      <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                      <span className="text-lg font-semibold">{selectedDoctor.average_rating?.toFixed(1) || 'N/A'}</span>
                      <span className="text-sm text-muted-foreground">({selectedDoctor.num_reviews || 0} {t("patient.findDoctors.reviews")})</span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Practice Info */}
                {selectedDoctor.practices && (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-lg">{t("patient.findDoctors.practiceInformation")}</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{selectedDoctor.practices.name}</span>
                      </div>
                      {selectedDoctor.practices.phone && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{selectedDoctor.practices.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Bio */}
                {selectedDoctor.bio && (
                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg">{t("patient.findDoctors.about")}</h3>
                    <p className="text-muted-foreground">{selectedDoctor.bio}</p>
                  </div>
                )}

                {/* Experience */}
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">{t("patient.findDoctors.experience")}</h3>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600" />
                    <span className="text-sm">{selectedDoctor.appointment_count || 0} {t("patient.findDoctors.appointmentsCompleted")}</span>
                  </div>
                  {selectedDoctor.verified && (
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-600" />
                      <span className="text-sm">{t("patient.findDoctors.verifiedHealthcareProfessional")}</span>
                    </div>
                  )}
                </div>

                {/* Consultation Fee */}
                {selectedDoctor.consultation_fee && (
                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg">{t("patient.findDoctors.consultationFee")}</h3>
                    <p className="text-2xl font-bold text-primary">${selectedDoctor.consultation_fee}</p>
                  </div>
                )}

                {/* Action Button */}
                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={() => {
                    setShowProfileModal(false);
                    handleBookingClick(selectedDoctor.id, selectedDoctor.profiles?.full_name);
                  }}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  {t("patient.findDoctors.bookAppointmentWith")} {selectedDoctor.profiles?.full_name?.split(' ').pop()}
                </Button>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DoctorSearchSection;