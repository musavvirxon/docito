import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Logo } from '@/components/Logo';
import Footer from '@/components/Footer';
import SearchResults from '@/components/patient/SearchResults';
import { useDoctors } from '@/hooks/useDoctors';
import { usePractices } from '@/hooks/usePractices';
import { useBookingAuth } from '@/hooks/useBookingAuth';
import { Search, MapPin, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function SearchDoctors() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation('doctors');
  
  // Initialize from URL params
  const initialSpecialty = searchParams.get('specialty') || '';
  const initialQuery = searchParams.get('q') || '';
  
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [location, setLocation] = useState('');
  const [specialty, setSpecialty] = useState(initialSpecialty);
  const [showFilters, setShowFilters] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const { searchDoctors, doctors, loading: doctorsLoading } = useDoctors();
  const { searchPractices, loading: practicesLoading } = usePractices();
  const { handleBookingClick } = useBookingAuth();

  const isLoading = doctorsLoading || practicesLoading;

  const specialties = [
    { key: '', label: t('specialties.all') },
    { key: 'generalPractice', label: t('specialties.generalPractice') },
    { key: 'cardiology', label: t('specialties.cardiology') },
    { key: 'dermatology', label: t('specialties.dermatology') },
    { key: 'pediatrics', label: t('specialties.pediatrics') },
    { key: 'orthopedics', label: t('specialties.orthopedics') },
    { key: 'neurology', label: t('specialties.neurology') },
    { key: 'psychiatry', label: t('specialties.psychiatry') },
    { key: 'dentistry', label: t('specialties.dentistry') },
    { key: 'ophthalmology', label: t('specialties.ophthalmology') },
    { key: 'ent', label: t('specialties.ent') },
    { key: 'obgyn', label: 'OB-GYN' },
  ];

  const transformResults = useCallback((doctorsData: any[], practicesData: any[]) => {
    const transformedDoctors = doctorsData.map((doctor) => ({
      id: doctor.id,
      type: 'doctor' as const,
      name: doctor.profiles ? (doctor.profiles as any).full_name || 'Doctor' : 'Doctor',
      image: doctor.profiles ? (doctor.profiles as any).avatar_url : undefined,
      specialty: doctor.specialty,
      rating: doctor.weighted_rating || doctor.average_rating || 4.8,
      reviewCount: doctor.num_reviews || 0,
      affiliatedPractice: doctor.practices ? (doctor.practices as any).name : 'Independent Doctor',
      location: doctor.practices
        ? `${(doctor.practices as any).city || 'City'}, ${(doctor.practices as any).country || 'Country'}`
        : 'Location',
      consultationFee: doctor.consultation_fee,
      availability: 'Available Today',
      acceptsInsurance: true,
      acceptsNewPatients: doctor.accepts_new_patients,
      bio: doctor.bio,
      languages: doctor.languages,
    }));

    const transformedPractices = practicesData.map((practice) => ({
      id: practice.id,
      type: 'practice' as const,
      name: practice.name,
      logoUrl: practice.logo_url,
      location: `${practice.city || 'City'}, ${practice.country || 'Country'}`,
      rating: practice.weighted_rating || practice.average_rating || 4.7,
      reviewCount: practice.num_reviews || 0,
      availability: 'Open Today',
      acceptsInsurance: true,
      specialties: practice.specialties,
      description: practice.description,
    }));

    return [...transformedDoctors, ...transformedPractices];
  }, []);

  const performSearch = useCallback(async () => {
    const searchTerm = searchQuery || specialty;
    
    try {
      const [doctorsResults, practicesResults] = await Promise.all([
        searchDoctors(searchTerm, location, specialty),
        searchPractices(searchTerm, location),
      ]);

      const results = transformResults(doctorsResults || [], practicesResults || []);
      setSearchResults(results);
      setHasSearched(true);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
      setHasSearched(true);
    }
  }, [searchQuery, location, specialty, searchDoctors, searchPractices, transformResults]);

  // Auto-search on initial load if URL params exist
  useEffect(() => {
    if (initialSpecialty || initialQuery) {
      performSearch();
    } else {
      // Load all doctors initially
      performSearch();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-search when specialty changes from URL
  useEffect(() => {
    const urlSpecialty = searchParams.get('specialty');
    if (urlSpecialty && urlSpecialty !== specialty) {
      setSpecialty(urlSpecialty);
    }
  }, [searchParams]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch();
  };

  const clearFilters = () => {
    setSearchQuery('');
    setLocation('');
    setSpecialty('');
    performSearch();
  };

  const handleViewProfile = (result: any) => {
    if (result.type === 'doctor') {
      navigate(`/doctor-profile/${result.id}`);
    } else {
      navigate(`/practice/${result.id}`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <nav className="bg-card border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Logo variant="horizontal" size="sm" onClick={() => navigate('/')} className="cursor-pointer" />
            <Button
              onClick={() => navigate('/auth')}
              variant="default"
            >
              {t('page.signIn')}
            </Button>
          </div>
        </div>
      </nav>

      {/* Search Header */}
      <div className="bg-gradient-to-br from-primary/90 to-primary py-12">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <h1 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-2">
              {t('page.title')}
            </h1>
            <p className="text-primary-foreground/80">
              {t('page.subtitle')}
            </p>
          </motion.div>

          {/* Search Form */}
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            onSubmit={handleSearchSubmit}
            className="max-w-4xl mx-auto bg-card rounded-2xl shadow-2xl p-4"
          >
            <div className="grid md:grid-cols-4 gap-4">
              <div className="md:col-span-2 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder={t('search.placeholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 h-12"
                />
              </div>

              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground z-10" />
                <Input
                  type="text"
                  placeholder={t('search.location')}
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="pl-12 h-12"
                />
              </div>

              <Select value={specialty} onValueChange={setSpecialty}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder={t('specialties.all')} />
                </SelectTrigger>
                <SelectContent>
                  {specialties.map(spec => (
                    <SelectItem key={spec.key} value={spec.key || 'all'}>
                      {spec.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                <Filter className="w-4 h-4" />
                {showFilters ? t('page.hideFilters') : t('page.showFilters')}
              </button>
              
              <div className="flex gap-2">
                {(searchQuery || location || specialty) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="gap-1"
                  >
                    <X className="w-4 h-4" />
                    {t('page.clearAll')}
                  </Button>
                )}
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? t('page.searching') : 'Search'}
                </Button>
              </div>
            </div>
          </motion.form>
        </div>
      </div>

      {/* Results Section */}
      <div className="container mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <SearchResults
            results={searchResults}
            isLoading={isLoading && !hasSearched}
            onBookAppointment={(result) => handleBookingClick(result.id, result.name)}
            onViewPractice={handleViewProfile}
            onFavorite={() => {}}
          />
        </motion.div>
      </div>

      <Footer />
    </div>
  );
}
