import { motion } from 'framer-motion';
import { Star, MapPin, Clock, ChevronRight, Building2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

const featuredDoctors = [
  {
    name: 'Dr. Sarah Mitchell',
    specialty: 'Cardiologist',
    rating: 4.9,
    reviews: 328,
    location: 'New York, NY',
    available: 'Today',
    image: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=300&h=300&fit=crop&crop=face'
  },
  {
    name: 'Dr. James Chen',
    specialty: 'Neurologist',
    rating: 4.8,
    reviews: 256,
    location: 'Los Angeles, CA',
    available: 'Tomorrow',
    image: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=300&h=300&fit=crop&crop=face'
  },
  {
    name: 'Dr. Emily Rodriguez',
    specialty: 'Pediatrician',
    rating: 5.0,
    reviews: 412,
    location: 'Chicago, IL',
    available: 'Today',
    image: 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=300&h=300&fit=crop&crop=face'
  },
  {
    name: 'Dr. Michael Park',
    specialty: 'Orthopedic Surgeon',
    rating: 4.9,
    reviews: 189,
    location: 'Houston, TX',
    available: 'Wed, Dec 13',
    image: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=300&h=300&fit=crop&crop=face'
  },
];

const featuredClinics = [
  {
    name: 'Manhattan Medical Center',
    type: 'Multi-specialty Clinic',
    rating: 4.8,
    reviews: 1247,
    location: 'New York, NY',
    doctors: 45,
    image: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=400&h=300&fit=crop'
  },
  {
    name: 'Pacific Health Institute',
    type: 'Research Hospital',
    rating: 4.9,
    reviews: 2156,
    location: 'San Francisco, CA',
    doctors: 120,
    image: 'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=400&h=300&fit=crop'
  },
  {
    name: 'Sunrise Family Practice',
    type: 'Family Medicine',
    rating: 4.7,
    reviews: 856,
    location: 'Phoenix, AZ',
    doctors: 12,
    image: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=400&h=300&fit=crop'
  },
];

export default function FeaturedProviders() {
  return (
    <section className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Featured Specialists */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-20"
        >
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-4xl md:text-5xl font-extralight tracking-tight text-foreground mb-2">
                Top Specialists
              </h2>
              <p className="text-muted-foreground font-light">
                Highly rated doctors ready to help
              </p>
            </div>
            <Button variant="ghost" className="hidden md:flex items-center gap-2 text-primary">
              View All <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredDoctors.map((doctor, index) => (
              <motion.div
                key={doctor.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ y: -8 }}
                className="group"
              >
                <div className="bg-card rounded-3xl border border-border/50 overflow-hidden transition-all duration-300 hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/5">
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={doctor.image}
                      alt={doctor.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4">
                      <div className="flex items-center gap-1 text-white mb-1">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-medium">{doctor.rating}</span>
                        <span className="text-white/70 text-sm">({doctor.reviews})</span>
                      </div>
                    </div>
                  </div>
                  <div className="p-5">
                    <h3 className="font-semibold text-foreground mb-1">{doctor.name}</h3>
                    <p className="text-sm text-primary mb-3">{doctor.specialty}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {doctor.location}
                      </span>
                      <span className="flex items-center gap-1 text-emerald-500">
                        <Clock className="w-3 h-3" />
                        {doctor.available}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Featured Clinics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-4xl md:text-5xl font-extralight tracking-tight text-foreground mb-2">
                Leading Clinics
              </h2>
              <p className="text-muted-foreground font-light">
                Trusted healthcare facilities near you
              </p>
            </div>
            <Button variant="ghost" className="hidden md:flex items-center gap-2 text-primary">
              View All <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {featuredClinics.map((clinic, index) => (
              <motion.div
                key={clinic.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ y: -8 }}
                className="group"
              >
                <div className="bg-card rounded-3xl border border-border/50 overflow-hidden transition-all duration-300 hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/5">
                  <div className="relative h-52 overflow-hidden">
                    <img
                      src={clinic.image}
                      alt={clinic.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4">
                      <div className="flex items-center justify-between text-white">
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span className="font-medium">{clinic.rating}</span>
                          <span className="text-white/70 text-sm">({clinic.reviews})</span>
                        </div>
                        <div className="flex items-center gap-1 text-sm">
                          <Users className="w-4 h-4" />
                          {clinic.doctors} doctors
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground mb-1">{clinic.name}</h3>
                        <p className="text-sm text-primary mb-2">{clinic.type}</p>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="w-3 h-3" />
                          {clinic.location}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
