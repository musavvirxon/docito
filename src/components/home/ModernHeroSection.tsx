import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ChevronDown, CreditCard, Calendar, FileText, BarChart3 } from "lucide-react";
import ProminentSearchBar from "./ProminentSearchBar";
import SearchResults from "@/components/patient/SearchResults";
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

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-gray-100 dark:from-[#030712] dark:via-[#0A0F1E] dark:to-[#030712]">
      {/* Subtle Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px] dark:bg-[linear-gradient(to_right,#3b82f610_1px,transparent_1px),linear-gradient(to_bottom,#3b82f610_1px,transparent_1px)] dark:bg-[size:32px_32px]" />
      
      {/* Minimal Geometric Accents */}
      <div className="absolute inset-0 overflow-hidden opacity-20 dark:opacity-10">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-primary/20 dark:bg-primary/5 rounded-none dark:rounded-full" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-accent/20 dark:bg-primary/5 rounded-none dark:rounded-full" />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 py-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center space-y-8 max-w-5xl mx-auto"
        >
          {/* Professional Logo */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="flex justify-center mb-6"
          >
            <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary/80 rounded-2xl flex items-center justify-center shadow-xl border-2 border-primary/20 dark:border-primary/30 dark:shadow-glow-blue-sharp">
              <span className="text-primary-foreground font-bold text-3xl">D</span>
            </div>
          </motion.div>

          {/* Search Bar - PROMINENT */}
          <ProminentSearchBar onSearch={handleSearch} searching={searching} />

          {/* Professional Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="inline-flex items-center space-x-2 bg-primary/10 dark:bg-primary/5 backdrop-blur-sm border-2 border-primary/30 dark:border-primary/30 rounded-full px-6 py-2"
          >
            <span className="text-primary dark:text-primary font-semibold">Professional Medical Platform</span>
          </motion.div>

          {/* Main Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="text-5xl md:text-7xl font-bold text-foreground leading-tight tracking-tight"
          >
            Complete Healthcare
            <br />
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Management Solution
            </span>
          </motion.h1>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0, duration: 0.5 }}
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto"
          >
            Integrated payments, scheduling, records, and analytics for medical professionals
          </motion.p>

          {/* Feature Pills */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 0.5 }}
            className="flex flex-wrap justify-center gap-4"
          >
            {[
              { icon: CreditCard, label: "Payment Processing" },
              { icon: Calendar, label: "Scheduling" },
              { icon: FileText, label: "Records" },
              { icon: BarChart3, label: "Analytics" }
            ].map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.label}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.2 + index * 0.1 }}
                  className="flex items-center space-x-2 bg-card/80 dark:bg-card/80 backdrop-blur-sm border-2 border-input dark:border-border dark:hover:border-primary rounded-full px-6 py-3 transition-all duration-300 hover:shadow-lg dark:hover:shadow-glow-blue"
                >
                  <Icon className="w-5 h-5 text-primary" />
                  <span className="text-foreground font-medium">{feature.label}</span>
                </motion.div>
              );
            })}
          </motion.div>

          {/* Scroll Indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2, duration: 0.5 }}
            className="flex justify-center pt-8"
          >
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="cursor-pointer"
            >
              <ChevronDown className="w-8 h-8 text-muted-foreground" />
            </motion.div>
          </motion.div>
        </motion.div>

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
