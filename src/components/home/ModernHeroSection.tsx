import { motion } from "framer-motion";
import { CreditCard, Calendar, FileText, Microscope, BarChart3, ArrowDown } from "lucide-react";
import ProminentSearchBar from "./ProminentSearchBar";
import SearchResults from "@/components/patient/SearchResults";
import { useState } from "react";
import { useDoctors } from "@/hooks/useDoctors";
import { usePractices } from "@/hooks/usePractices";
import { useBookingAuth } from "@/hooks/useBookingAuth";

const ModernHeroSection = () => {
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [searching, setSearching] = useState(false);
  const { searchDoctors } = useDoctors();
  const { searchPractices } = usePractices();
  const { handleBookingClick } = useBookingAuth();

  const handleSearch = async (specialty: string, location: string, insurance: string) => {
    if (!specialty.trim() && !location.trim()) return;

    setSearching(true);
    try {
      const [doctorsResults, practicesResults] = await Promise.all([
        searchDoctors(specialty, location),
        searchPractices(specialty, location),
      ]);

      const transformedDoctors = doctorsResults.map((doctor) => ({
        id: doctor.id,
        type: "doctor" as const,
        name: doctor.profiles ? (doctor.profiles as any).full_name || "Doctor" : "Doctor",
        image: doctor.profiles ? (doctor.profiles as any).avatar_url : undefined,
        specialty: doctor.specialty,
        rating: doctor.weighted_rating || doctor.average_rating || 4.8,
        reviewCount: doctor.num_reviews || 0,
        affiliatedPractice: doctor.practices ? (doctor.practices as any).name : "Independent Doctor",
        location: doctor.practices
          ? `${(doctor.practices as any).city || "City"}, ${(doctor.practices as any).country || "Country"}`
          : "Location",
        consultationFee: doctor.consultation_fee,
        availability: "Available Today",
        acceptsInsurance: true,
        acceptsNewPatients: doctor.accepts_new_patients,
      }));

      const transformedPractices = practicesResults.map((practice) => ({
        id: practice.id,
        type: "practice" as const,
        name: practice.name,
        image: practice.logo_url,
        location: `${practice.city || "City"}, ${practice.country || "Country"}`,
        rating: practice.weighted_rating || practice.average_rating || 4.7,
        reviewCount: practice.num_reviews || 0,
        availability: "Open Today",
        acceptsInsurance: true,
      }));

      setSearchResults([...transformedDoctors, ...transformedPractices]);
      setShowResults(true);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setSearching(false);
    }
  };

  const features = [
    { icon: CreditCard, label: "Payments" },
    { icon: Calendar, label: "Appointments" },
    { icon: FileText, label: "History" },
    { icon: Microscope, label: "Procedures" },
    { icon: BarChart3, label: "Analytics" },
  ];

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-[hsl(221,83%,53%)] via-[hsl(243,75%,59%)] to-[hsl(271,76%,53%)] pt-32 pb-20">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-[hsl(186,94%,65%)]/20 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            rotate: [90, 0, 90],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[hsl(243,75%,59%)]/20 rounded-full blur-3xl"
        />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-6xl mx-auto">
          {/* Logo Animation */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="flex justify-center mb-8"
          >
            <div className="relative w-20 h-20">
              <div className="absolute inset-0 bg-gradient-to-br from-[hsl(186,94%,85%)] to-[hsl(217,91%,60%)] rounded-2xl animate-pulse"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-4xl">D</span>
              </div>
            </div>
          </motion.div>

          {/* Search Bar - PROMINENT */}
          <ProminentSearchBar onSearch={handleSearch} searching={searching} />

          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="flex justify-center mb-6"
          >
            <div className="inline-flex items-center space-x-2 bg-background/10 backdrop-blur-md border border-white/20 rounded-full px-6 py-2">
              <span className="text-2xl">🚀</span>
              <span className="text-primary-foreground font-semibold">First Ever Complete Medical Platform</span>
            </div>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="text-5xl md:text-6xl lg:text-7xl font-bold text-center text-primary-foreground mb-6"
          >
            Your All-in-One Medical &<br />Dental Platform
          </motion.h1>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.5 }}
            className="text-xl md:text-2xl text-center text-primary-foreground/90 mb-8 max-w-3xl mx-auto"
          >
            The first platform that handles payments, appointments, medical history, and analytics — all in one
          </motion.p>

          {/* Feature Pills */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 0.5 }}
            className="flex flex-wrap justify-center gap-4 mb-12"
          >
            {features.map((feature, index) => (
              <motion.div
                key={feature.label}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.2 + index * 0.1, duration: 0.3 }}
                className="flex items-center space-x-2 bg-background/10 backdrop-blur-md border border-white/20 rounded-full px-5 py-3 hover:bg-background/20 transition-all duration-300 hover:scale-105"
              >
                <feature.icon className="w-5 h-5 text-primary-foreground" />
                <span className="text-primary-foreground font-medium">{feature.label}</span>
              </motion.div>
            ))}
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.5, duration: 0.5 }}
            className="flex flex-wrap justify-center gap-8 mb-12 text-primary-foreground"
          >
            <div className="text-center">
              <div className="text-3xl font-bold">10K+</div>
              <div className="text-sm text-primary-foreground/80">Doctors</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">1M+</div>
              <div className="text-sm text-primary-foreground/80">Patients</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">4.9★</div>
              <div className="text-sm text-primary-foreground/80">Rating</div>
            </div>
          </motion.div>

          {/* Scroll Indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2, duration: 0.5 }}
            className="flex justify-center"
          >
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="cursor-pointer"
            >
              <ArrowDown className="w-8 h-8 text-primary-foreground/60" />
            </motion.div>
          </motion.div>
        </div>

        {/* Search Results */}
        {showResults && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-12"
          >
            <SearchResults
              results={searchResults}
              onBookAppointment={(result) => handleBookingClick(result.id, result.name)}
              onViewPractice={(result) => handleBookingClick(result.id, result.name)}
              onFavorite={() => {}}
            />
          </motion.div>
        )}
      </div>
    </section>
  );
};

export default ModernHeroSection;
