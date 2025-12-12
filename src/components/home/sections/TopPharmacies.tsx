import { useTopPharmacies } from '@/hooks/useTopData';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Pill, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';


export const TopPharmacies = () => {
  const { data: pharmacies, isLoading, error } = useTopPharmacies();

  if (error) return null;

  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="text-3xl font-bold text-foreground mb-2">
              Top Pharmacies
            </h2>
            <p className="text-muted-foreground">
              Get your medications from trusted pharmacies
            </p>
          </div>
          <Link to="/pharmacies">
            <Button variant="outline">View All</Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-xl" />
            ))}
          </div>
        ) : pharmacies && pharmacies.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pharmacies.map((pharmacy, index) => (
              <motion.div
                key={pharmacy.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                viewport={{ once: true }}
              >
                <Link
                  to={`/pharmacies/${pharmacy.id}`}
                  className="block bg-card rounded-xl border border-border overflow-hidden hover:shadow-lg transition-all group"
                >
                  <div className="h-32 bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 flex items-center justify-center">
                    {pharmacy.logo_url ? (
                      <img
                        src={pharmacy.logo_url}
                        alt={pharmacy.name}
                        className="h-20 w-20 object-contain"
                      />
                    ) : (
                      <Pill className="w-12 h-12 text-emerald-500/50" />
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                      {pharmacy.name}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                      <MapPin className="w-4 h-4" />
                      <span className="truncate">
                        {[pharmacy.city, pharmacy.country].filter(Boolean).join(', ') || 'Location not specified'}
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">
            No pharmacies available at the moment
          </p>
        )}
      </div>
    </section>
  );
};
