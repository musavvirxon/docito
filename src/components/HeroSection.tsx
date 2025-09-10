import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, MapPin, CreditCard } from "lucide-react";

const HeroSection = () => {
  const specialties = [
    { name: "Primary Care", icon: "💝" },
    { name: "Dentist", icon: "🦷" },
    { name: "OB-GYN", icon: "👥" },
    { name: "Dermatologist", icon: "🧴" },
    { name: "Psychiatrist", icon: "🧠" },
    { name: "Eye Doctor", icon: "👁️" },
    { name: "Cardiologist", icon: "❤️" },
    { name: "Neurologist", icon: "🧠" },
    { name: "Orthopedist", icon: "🦴" }
  ];

  return (
    <section className="bg-background py-16 relative overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl lg:text-5xl font-bold text-foreground mb-4">
              Need a doc? They are here.
            </h1>
            <p className="text-xl text-muted-foreground">Just a search away!</p>
          </div>
          
          {/* Search Form */}
          <div className="bg-card border border-border rounded-lg shadow-lg mb-8 overflow-hidden">
            <div className="flex flex-col md:flex-row">
              <div className="flex-1 relative group">
                <Input 
                  placeholder="Specialty or doctor name"
                  className="h-14 border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent hover:bg-muted/30 transition-colors"
                />
              </div>
              
              <div className="hidden md:block w-px bg-border"></div>
              
              <div className="flex-1 relative group">
                <Input 
                  placeholder="Location"
                  className="h-14 border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent hover:bg-muted/30 transition-colors"
                />
              </div>
              
              <div className="hidden md:block w-px bg-border"></div>
              
              <div className="flex-1 relative group">
                <Input 
                  placeholder="Insurance"
                  className="h-14 border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent hover:bg-muted/30 transition-colors"
                />
              </div>
              
              <div className="w-full md:w-auto">
                <Button className="w-full h-14 bg-primary text-primary-foreground hover:bg-primary/90 font-medium rounded-none">
                  <Search className="w-4 h-4 mr-2" />
                  Search
                </Button>
              </div>
            </div>
          </div>

          {/* Specialty Squares */}
          <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-4 mb-8">
            {specialties.map((specialty) => (
              <div 
                key={specialty.name} 
                className="bg-muted rounded-lg p-4 text-center cursor-pointer hover:bg-accent hover:scale-105 transition-all duration-200 aspect-square flex flex-col items-center justify-center group"
              >
                <span className="text-2xl mb-2 group-hover:scale-110 transition-transform duration-200">{specialty.icon}</span>
                <span className="text-xs font-medium text-foreground group-hover:text-accent-foreground text-center transition-colors duration-200">{specialty.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;