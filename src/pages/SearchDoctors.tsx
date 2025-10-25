import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Logo } from '@/components/Logo';
import Footer from '@/components/Footer';
import { Search, MapPin, Star, Clock, DollarSign, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function SearchDoctors() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [location, setLocation] = useState('');
  const [specialty, setSpecialty] = useState('All Specialties');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    minRating: 0,
    maxPrice: 1000,
    availability: 'any',
    insurance: 'any'
  });

  const { data: doctors, isLoading } = useQuery({
    queryKey: ['search-doctors', searchQuery, location, specialty, filters],
    queryFn: async () => {
      let query = supabase
        .from('doctor_profiles_view')
        .select('*')
        .eq('verified', true);

      if (searchQuery) {
        query = query.or(`full_name.ilike.%${searchQuery}%,specialty.ilike.%${searchQuery}%`);
      }

      if (specialty !== 'All Specialties') {
        query = query.eq('specialty', specialty);
      }

      if (filters.minRating > 0) {
        query = query.gte('average_rating', filters.minRating);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data || [];
    }
  });

  const specialties = [
    'All Specialties',
    'General Practice',
    'Cardiology',
    'Dermatology',
    'Pediatrics',
    'Orthopedics',
    'Neurology',
    'Psychiatry',
    'Dentistry',
    'Ophthalmology',
    'ENT'
  ];

  return (
    <div className="min-h-screen bg-background">
      <nav className="bg-card border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Logo variant="horizontal" size="sm" onClick={() => navigate('/')} className="cursor-pointer" />
            <button
              onClick={() => navigate('/auth')}
              className="px-6 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Sign In
            </button>
          </div>
        </div>
      </nav>

      <div className="bg-gradient-to-br from-primary/90 to-primary py-16">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl md:text-5xl font-bold text-primary-foreground text-center mb-4">
            Find Your Perfect Doctor
          </h1>
          <p className="text-xl text-primary-foreground/80 text-center mb-8">
            Search from thousands of verified healthcare professionals
          </p>

          <div className="max-w-4xl mx-auto bg-card rounded-2xl shadow-2xl p-4">
            <div className="grid md:grid-cols-4 gap-4">
              <div className="md:col-span-2 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search doctors, specialties..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-lg border-2 border-input bg-background text-foreground"
                />
              </div>

              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-lg border-2 border-input bg-background text-foreground"
                />
              </div>

              <select
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                className="px-4 py-3 rounded-lg border-2 border-input bg-background text-foreground"
              >
                {specialties.map(spec => (
                  <option key={spec} value={spec}>{spec}</option>
                ))}
              </select>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
              >
                <Filter className="w-4 h-4" />
                {showFilters ? 'Hide' : 'Show'} Filters
              </button>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setLocation('');
                  setSpecialty('All Specialties');
                  setFilters({ minRating: 0, maxPrice: 1000, availability: 'any', insurance: 'any' });
                }}
                className="text-sm text-muted-foreground hover:text-primary"
              >
                Clear All
              </button>
            </div>

            {showFilters && (
              <div className="mt-4 pt-4 border-t border-border grid md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-foreground">Min Rating</label>
                  <select
                    value={filters.minRating}
                    onChange={(e) => setFilters({ ...filters, minRating: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border-2 border-input bg-background text-foreground"
                  >
                    <option value={0}>Any Rating</option>
                    <option value={3}>3+ Stars</option>
                    <option value={4}>4+ Stars</option>
                    <option value={4.5}>4.5+ Stars</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-foreground">
            {isLoading ? 'Searching...' : `${doctors?.length || 0} Doctors Found`}
          </h2>
          <p className="text-muted-foreground">Showing verified healthcare professionals</p>
        </div>

        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-card rounded-xl p-6 animate-pulse">
                <div className="w-24 h-24 bg-muted rounded-full mb-4" />
                <div className="h-6 bg-muted rounded mb-2" />
                <div className="h-4 bg-muted rounded" />
              </div>
            ))}
          </div>
        ) : doctors && doctors.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {doctors.map(doctor => (
              <DoctorCard key={doctor.id} doctor={doctor} navigate={navigate} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-xl text-muted-foreground mb-4">No doctors found matching your criteria</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setLocation('');
                setSpecialty('All Specialties');
              }}
              className="px-6 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}

function DoctorCard({ doctor, navigate }: any) {
  return (
    <div className="bg-card rounded-xl p-6 shadow-lg hover:shadow-xl transition-all border-2 border-border hover:border-primary">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-primary-foreground text-2xl font-bold">
          {doctor.full_name?.charAt(0) || 'D'}
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-foreground">Dr. {doctor.full_name}</h3>
          <p className="text-sm text-primary font-medium">{doctor.specialty}</p>
          <div className="flex items-center gap-1 mt-1">
            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
            <span className="text-sm font-semibold text-foreground">{doctor.average_rating || 4.5}</span>
          </div>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>Available for appointments</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <DollarSign className="w-4 h-4" />
          <span>Consultation: ${doctor.consultation_fee || 100}</span>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => navigate(`/doctor-profile/${doctor.id}`)}
          className="flex-1 px-4 py-2 rounded-lg border-2 border-primary text-primary hover:bg-primary/10 font-semibold"
        >
          View Profile
        </button>
        <button
          onClick={() => navigate(`/booking/${doctor.id}`)}
          className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
        >
          Book Now
        </button>
      </div>
    </div>
  );
}
