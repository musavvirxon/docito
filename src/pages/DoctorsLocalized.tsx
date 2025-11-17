import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, MapPin, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useDoctorsLocalized } from "@/hooks/useDoctorsLocalized";
import { Skeleton } from "@/components/ui/skeleton";

const DoctorsLocalized = () => {
  const { t } = useTranslation(['doctors', 'common']);
  const navigate = useNavigate();
  const { doctors, loading, getTranslatedField } = useDoctorsLocalized();

  return (
    <>
      <SEOHead 
        title={t('doctors:seo.title', 'Find Verified Doctors - Book Appointments Online')}
        description={t('doctors:seo.description', 'Browse verified doctors across all specialties. Read reviews, check availability, and book appointments instantly.')}
        keywords={t('doctors:seo.keywords', 'find doctors, verified doctors, book doctor appointment, medical specialists, healthcare providers')}
      />
      
      <div className="min-h-screen bg-background">
        <Header />
        
        <main className="container mx-auto px-4 py-12">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                {t('doctors:page.title', 'Find Your Doctor')}
              </h1>
              <p className="text-xl text-muted-foreground">
                {t('doctors:page.subtitle', 'Browse verified medical professionals')}
              </p>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-24 w-24 rounded-full mx-auto mb-4" />
                      <Skeleton className="h-6 w-3/4 mx-auto mb-2" />
                      <Skeleton className="h-4 w-1/2 mx-auto" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-10 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {doctors.map((doctor) => (
                  <Card key={doctor.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="text-center">
                      <div className="w-24 h-24 rounded-full bg-primary/10 mx-auto mb-4 flex items-center justify-center">
                        <span className="text-3xl">👨‍⚕️</span>
                      </div>
                      <CardTitle>{doctor.full_name}</CardTitle>
                      <Badge variant="secondary" className="mt-2">
                        {getTranslatedField(doctor, 'specialty')}
                      </Badge>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-center gap-1 text-yellow-500">
                        <Star className="w-4 h-4 fill-current" />
                        <span className="font-semibold">{doctor.average_rating?.toFixed(1) || 'N/A'}</span>
                        <span className="text-muted-foreground text-sm">
                          ({doctor.num_reviews || 0} {t('common:reviews', 'reviews')})
                        </span>
                      </div>
                      
                      {doctor.bio_en && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {getTranslatedField(doctor, 'bio')}
                        </p>
                      )}
                      
                      {doctor.consultation_fee && (
                        <p className="text-center font-semibold text-primary">
                          ${doctor.consultation_fee}
                        </p>
                      )}
                      
                      <Button 
                        className="w-full" 
                        onClick={() => navigate(`/doctor/${doctor.id}`)}
                      >
                        <Calendar className="w-4 h-4 mr-2" />
                        {t('common:bookAppointment', 'Book Appointment')}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {!loading && doctors.length === 0 && (
              <div className="text-center py-12">
                <p className="text-xl text-muted-foreground">
                  {t('doctors:page.noDoctors', 'No doctors found')}
                </p>
              </div>
            )}
          </div>
        </main>
        
        <Footer />
      </div>
    </>
  );
};

export default DoctorsLocalized;
