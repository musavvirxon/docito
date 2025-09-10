import { Card, CardContent } from "@/components/ui/card";
import { Star } from "lucide-react";

const TopSpecialistsSection = () => {
  const specialists = [
    {
      id: 1,
      photo: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=150&h=150&fit=crop&crop=face",
      firstName: "Sarah",
      lastName: "Johnson",
      specialty: "Cardiologist",
      degree: "MD, PhD",
      country: "United States",
      region: "New York, NY",
      rating: 4.9,
      biography: "Dr. Johnson is a board-certified cardiologist with over 15 years of experience in treating cardiovascular diseases. She specializes in preventive cardiology and advanced heart failure management."
    },
    {
      id: 2,
      photo: "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=150&h=150&fit=crop&crop=face",
      firstName: "Michael",
      lastName: "Chen",
      specialty: "Neurologist",
      degree: "MD",
      country: "Canada",
      region: "Toronto, ON",
      rating: 4.8,
      biography: "Dr. Chen specializes in neurological disorders and has extensive experience in treating patients with epilepsy, multiple sclerosis, and Parkinson's disease."
    },
    {
      id: 3,
      photo: "https://images.unsplash.com/photo-1594824388597-250d30062d0d?w=150&h=150&fit=crop&crop=face",
      firstName: "Emily",
      lastName: "Rodriguez",
      specialty: "Dermatologist",
      degree: "MD, FAAD",
      country: "United States",
      region: "Los Angeles, CA",
      rating: 4.9,
      biography: "Dr. Rodriguez is a leading dermatologist specializing in cosmetic and medical dermatology. She has pioneered several innovative treatments for skin cancer."
    },
    {
      id: 4,
      photo: "https://images.unsplash.com/photo-1628260412297-a3377e45006f?w=150&h=150&fit=crop&crop=face",
      firstName: "David",
      lastName: "Thompson",
      specialty: "Orthopedist",
      degree: "MD, MS",
      country: "United Kingdom",
      region: "London, England",
      rating: 4.7,
      biography: "Dr. Thompson is an orthopedic surgeon with expertise in joint replacement and sports medicine. He has performed over 2,000 successful surgeries."
    },
    {
      id: 5,
      photo: "https://images.unsplash.com/photo-1607990281513-2c110a25bd8c?w=150&h=150&fit=crop&crop=face",
      firstName: "Lisa",
      lastName: "Wang",
      specialty: "Pediatrician",
      degree: "MD, MPH",
      country: "Australia",
      region: "Sydney, NSW",
      rating: 4.8,
      biography: "Dr. Wang is a dedicated pediatrician with a focus on child development and preventive care. She has been caring for children for over 12 years."
    },
    {
      id: 6,
      photo: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&h=150&fit=crop&crop=face",
      firstName: "James",
      lastName: "Mitchell",
      specialty: "Psychiatrist",
      degree: "MD, PhD",
      country: "United States",
      region: "Chicago, IL",
      rating: 4.9,
      biography: "Dr. Mitchell specializes in adult psychiatry and has extensive experience in treating anxiety, depression, and bipolar disorder using both therapy and medication."
    }
  ];

  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-foreground mb-12 text-center">Top Specialists</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {specialists.map((specialist) => (
            <Card key={specialist.id} className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <img
                    src={specialist.photo}
                    alt={`Dr. ${specialist.firstName} ${specialist.lastName}`}
                    className="w-20 h-20 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-foreground">
                      Dr. {specialist.firstName} {specialist.lastName}
                    </h3>
                    <p className="text-primary font-medium">{specialist.specialty}</p>
                    <p className="text-sm text-muted-foreground">{specialist.degree}</p>
                    <p className="text-sm text-muted-foreground">
                      {specialist.region}, {specialist.country}
                    </p>
                    <div className="flex items-center mt-2">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="ml-1 text-sm font-medium">{specialist.rating}</span>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-4 line-clamp-3">
                  {specialist.biography}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TopSpecialistsSection;