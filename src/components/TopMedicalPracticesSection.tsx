import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, MapPin, Building2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

const TopMedicalPracticesSection = () => {
  const navigate = useNavigate();
  const practices = [
    {
      id: 1,
      photo: "https://images.unsplash.com/photo-1551601651-2a8555f1a136?w=400&h=250&fit=crop",
      name: "Mount Sinai Hospital",
      type: "Hospital",
      location: "New York, NY",
      specialties: ["Cardiology", "Neurology", "Oncology", "Emergency Medicine"],
      rating: 4.8,
      description: "Leading academic medical center providing comprehensive care with state-of-the-art facilities and renowned specialists across multiple medical disciplines."
    },
    {
      id: 2,
      photo: "https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=400&h=250&fit=crop",
      name: "Beverly Hills Medical Center",
      type: "Private Practice",
      location: "Beverly Hills, CA",
      specialties: ["Plastic Surgery", "Dermatology", "Internal Medicine"],
      rating: 4.9,
      description: "Exclusive private medical practice offering personalized healthcare services with luxury amenities and concierge medicine approach."
    },
    {
      id: 3,
      photo: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=400&h=250&fit=crop",
      name: "Toronto General Hospital",
      type: "Hospital",
      location: "Toronto, ON",
      specialties: ["Transplant Surgery", "Cardiac Care", "ICU", "Research"],
      rating: 4.7,
      description: "Canada's premier teaching hospital and research institute, known for breakthrough medical innovations and exceptional patient care."
    },
    {
      id: 4,
      photo: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=250&fit=crop",
      name: "Westside Family Clinic",
      type: "Clinic",
      location: "Seattle, WA",
      specialties: ["Family Medicine", "Pediatrics", "Women's Health"],
      rating: 4.6,
      description: "Community-focused clinic providing comprehensive primary care services for families with a warm, welcoming environment."
    },
    {
      id: 5,
      photo: "https://images.unsplash.com/photo-1512678080530-7760d81faba6?w=400&h=250&fit=crop",
      name: "London Eye Specialist Center",
      type: "Private Practice",
      location: "London, UK",
      specialties: ["Ophthalmology", "LASIK Surgery", "Retinal Care"],
      rating: 4.9,
      description: "Leading eye care center with cutting-edge technology and world-renowned ophthalmologists specializing in complex eye conditions."
    },
    {
      id: 6,
      photo: "https://images.unsplash.com/photo-1632833239869-a37e3a5806d2?w=400&h=250&fit=crop",
      name: "Sydney Children's Hospital",
      type: "Hospital",
      location: "Sydney, NSW",
      specialties: ["Pediatric Surgery", "Neonatology", "Child Psychology"],
      rating: 4.8,
      description: "Specialized children's hospital providing comprehensive pediatric care with child-friendly facilities and expert medical staff."
    }
  ];

  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-foreground mb-12 text-center">Top Medical Practices</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {practices.map((practice) => (
            <Card key={practice.id} className="hover:shadow-lg transition-shadow cursor-pointer overflow-hidden">
              <div className="aspect-video overflow-hidden">
                <img
                  src={practice.photo}
                  alt={practice.name}
                  className="w-full h-full object-cover transition-transform hover:scale-105"
                />
              </div>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">
                      {practice.name}
                    </h3>
                    <p className="text-primary font-medium">{practice.type}</p>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4 mr-1" />
                      {practice.location}
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="ml-1 text-sm font-medium">{practice.rating}</span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-1">
                      {practice.specialties.slice(0, 3).map((specialty, index) => (
                        <span 
                          key={index}
                          className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full"
                        >
                          {specialty}
                        </span>
                      ))}
                      {practice.specialties.length > 3 && (
                        <span className="text-xs text-muted-foreground px-2 py-1">
                          +{practice.specialties.length - 3} more
                        </span>
                      )}
                    </div>
                    
                    <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                      {practice.description}
                    </p>
                    <Button 
                      onClick={() => navigate(`/practices/${practice.id}`)}
                      variant="outline"
                      size="sm" 
                      className="w-full"
                    >
                      <Building2 className="w-4 h-4 mr-2" />
                      View Practice
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TopMedicalPracticesSection;