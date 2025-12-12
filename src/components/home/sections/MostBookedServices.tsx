import { useMostBookedServices } from '@/hooks/useTopData';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { Sparkles, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const MostBookedServices = () => {
  const { data: services, isLoading, error } = useMostBookedServices();

  if (error) return null;

  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Most Booked Services
          </h2>
          <p className="text-muted-foreground">
            Popular treatments and procedures
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        ) : services && services.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {services.map((service, index) => (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                viewport={{ once: true }}
                className="bg-card rounded-xl border border-border p-4 hover:shadow-lg transition-all group cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground group-hover:text-primary transition-colors truncate">
                      {service.name}
                    </h3>
                    <p className="text-sm text-muted-foreground capitalize">
                      {service.category}
                    </p>
                    {service.default_cost && (
                      <div className="flex items-center gap-1 mt-2 text-sm">
                        <DollarSign className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium text-foreground">
                          From ${service.default_cost}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">
            No services available at the moment
          </p>
        )}

        <div className="text-center mt-8">
          <Button variant="outline" size="lg">
            View All Services
          </Button>
        </div>
      </div>
    </section>
  );
};
