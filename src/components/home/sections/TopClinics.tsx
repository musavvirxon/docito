import { useTopClinics } from '@/hooks/useTopData';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Building2, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const TopClinics = () => {
  const { data: clinics, isLoading, error } = useTopClinics();

  if (error) return null;

  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="text-3xl font-bold text-foreground mb-2">
              Top Rated Clinics
            </h2>
            <p className="text-muted-foreground">
              Trusted healthcare facilities near you
            </p>
          </div>
          <Link to="/practices">
            <Button variant="outline">View All</Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-xl" />
            ))}
          </div>
        ) : clinics && clinics.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clinics.map((clinic, index) => (
              <motion.div
                key={clinic.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                viewport={{ once: true }}
              >
                <Link
                  to={`/practices/${clinic.id}`}
                  className="block bg-card rounded-xl border border-border overflow-hidden hover:shadow-lg transition-all group"
                >
                  <div className="h-32 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    {clinic.logo_url ? (
                      <img
                        src={clinic.logo_url}
                        alt={clinic.name}
                        className="h-20 w-20 object-contain"
                      />
                    ) : (
                      <Building2 className="w-12 h-12 text-primary/50" />
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                      {clinic.name}
                    </h3>
                    <p className="text-sm text-muted-foreground capitalize mb-2">
                      {clinic.practice_type?.replace('_', ' ') || 'Medical Center'}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span className="truncate">
                        {[clinic.city, clinic.country].filter(Boolean).join(', ') || 'Location not specified'}
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">
            No clinics available at the moment
          </p>
        )}
      </div>
    </section>
  );
};
