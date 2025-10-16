import { useState } from "react";
import { Search, MapPin, Shield, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface ProminentSearchBarProps {
  onSearch: (specialty: string, location: string, insurance: string) => void;
  searching?: boolean;
}

const ProminentSearchBar = ({ onSearch, searching }: ProminentSearchBarProps) => {
  const [specialty, setSpecialty] = useState("");
  const [location, setLocation] = useState("");
  const [insurance, setInsurance] = useState("");

  const handleSearch = () => {
    onSearch(specialty, location, insurance);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <motion.div
      initial={{ y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.3, duration: 0.6 }}
      className="w-full max-w-5xl mx-auto mb-12"
    >
      <div className="bg-background rounded-2xl shadow-2xl p-2 border-2 border-border hover:border-primary/30 transition-all duration-300">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
          {/* Specialty Input */}
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Specialty or doctor name"
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              onKeyPress={handleKeyPress}
              className="h-14 pl-12 border-0 bg-transparent focus-visible:ring-2 focus-visible:ring-primary text-base"
            />
          </div>

          {/* Location Input */}
          <div className="relative group">
            <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="City or ZIP code"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              onKeyPress={handleKeyPress}
              className="h-14 pl-12 border-0 bg-transparent focus-visible:ring-2 focus-visible:ring-primary text-base"
            />
          </div>

          {/* Insurance Input */}
          <div className="relative group">
            <Shield className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Insurance provider"
              value={insurance}
              onChange={(e) => setInsurance(e.target.value)}
              onKeyPress={handleKeyPress}
              className="h-14 pl-12 border-0 bg-transparent focus-visible:ring-2 focus-visible:ring-primary text-base"
            />
          </div>

          {/* Search Button */}
          <Button
            onClick={handleSearch}
            disabled={searching}
            className="h-14 bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(243,75%,59%)] text-primary-foreground text-base font-semibold hover:shadow-xl hover:scale-105 transition-all duration-300"
          >
            {searching ? (
              "Searching..."
            ) : (
              <>
                Find Doctors
                <ArrowRight className="ml-2 w-5 h-5" />
              </>
            )}
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default ProminentSearchBar;
