import { motion } from 'framer-motion';
import { Check, Star, Zap, Crown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const packages = [
  {
    name: 'Basic Checkup',
    price: 99,
    description: 'Essential health screening',
    icon: Check,
    color: 'from-emerald-500 to-green-500',
    features: [
      'Complete Blood Count',
      'Basic Metabolic Panel',
      'Lipid Profile',
      'Urinalysis',
      'Consultation included',
    ],
    popular: false,
  },
  {
    name: 'Comprehensive',
    price: 249,
    description: 'Full body health assessment',
    icon: Star,
    color: 'from-violet-500 to-purple-500',
    features: [
      'Everything in Basic',
      'Thyroid Function Test',
      'Liver Function Test',
      'Kidney Function Test',
      'ECG & Cardiac Markers',
      'Vitamin D & B12',
      'HbA1c (Diabetes)',
    ],
    popular: true,
  },
  {
    name: 'Executive',
    price: 499,
    description: 'Premium wellness program',
    icon: Crown,
    color: 'from-amber-500 to-orange-500',
    features: [
      'Everything in Comprehensive',
      'Full Body MRI Scan',
      'Cardiac Stress Test',
      'Cancer Markers Panel',
      'Bone Density Scan',
      'Genetic Risk Assessment',
      'Personalized Health Plan',
      'Priority Support',
    ],
    popular: false,
  },
];

export default function HealthPackages() {
  return (
    <section className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <Zap className="w-4 h-4" />
            Health Packages
          </div>
          <h2 className="text-4xl md:text-5xl font-extralight tracking-tight text-foreground mb-4">
            Preventive Care Packages
          </h2>
          <p className="text-lg text-muted-foreground font-light max-w-2xl mx-auto">
            Comprehensive health screenings at transparent prices
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {packages.map((pkg, index) => (
            <motion.div
              key={pkg.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              whileHover={{ y: -10 }}
              className={`relative ${pkg.popular ? 'md:-mt-4 md:mb-4' : ''}`}
            >
              {pkg.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-violet-500 to-purple-500 text-white text-xs font-semibold z-10">
                  Most Popular
                </div>
              )}
              
              <div className={`h-full rounded-3xl border ${pkg.popular ? 'border-primary shadow-xl shadow-primary/10' : 'border-border/50'} bg-card overflow-hidden transition-all duration-300 hover:border-primary/50`}>
                {/* Header */}
                <div className={`p-6 bg-gradient-to-br ${pkg.color} text-white`}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <pkg.icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{pkg.name}</h3>
                      <p className="text-sm text-white/80">{pkg.description}</p>
                    </div>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">${pkg.price}</span>
                    <span className="text-white/70">/package</span>
                  </div>
                </div>

                {/* Features */}
                <div className="p-6">
                  <ul className="space-y-3 mb-6">
                    {pkg.features.map((feature, fIndex) => (
                      <motion.li
                        key={feature}
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.3, delay: 0.3 + fIndex * 0.05 }}
                        className="flex items-center gap-3 text-sm"
                      >
                        <Check className="w-4 h-4 text-primary flex-shrink-0" />
                        <span className="text-foreground">{feature}</span>
                      </motion.li>
                    ))}
                  </ul>

                  <Button
                    className={`w-full rounded-full ${pkg.popular ? 'bg-primary hover:bg-primary/90' : 'bg-muted hover:bg-muted/80'}`}
                    variant={pkg.popular ? 'default' : 'secondary'}
                  >
                    Book Package
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
