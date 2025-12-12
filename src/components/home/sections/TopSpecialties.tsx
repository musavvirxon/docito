import { useTopSpecialties } from '@/hooks/useTopData';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Heart, Brain, Baby, Bone, Eye, Ear, 
  Stethoscope, Sparkles, Activity, Pill
} from 'lucide-react';

const specialtyIcons: Record<string, React.ComponentType<any>> = {
  'Cardiology': Heart,
  'Neurology': Brain,
  'Pediatrics': Baby,
  'Orthopedics': Bone,
  'Ophthalmology': Eye,
  'ENT': Ear,
  'General Practice': Stethoscope,
  'Dermatology': Sparkles,
  'Internal Medicine': Activity,
  'Pharmacy': Pill,
};

export const TopSpecialties = () => {
  const { data: specialties, isLoading, error } = useTopSpecialties();

  if (error) return null;

  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Top Medical Specialties
          </h2>
          <p className="text-muted-foreground">
            Find specialists in your area of need
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : specialties && specialties.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {specialties.map((specialty, index) => {
              const Icon = specialtyIcons[specialty.name] || Stethoscope;
              return (
                <motion.div
                  key={specialty.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  viewport={{ once: true }}
                >
                  <Link
                    to={`/find-doctors?specialty=${encodeURIComponent(specialty.name)}`}
                    className="flex flex-col items-center p-6 bg-card rounded-xl border border-border hover:border-primary/50 hover:shadow-lg transition-all group"
                  >
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <span className="font-medium text-foreground text-center">
                      {specialty.name}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {specialty.count} doctors
                    </span>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <p className="text-center text-muted-foreground">
            No specialties available at the moment
          </p>
        )}
      </div>
    </section>
  );
};
