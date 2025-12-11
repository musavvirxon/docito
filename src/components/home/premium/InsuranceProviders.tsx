import { motion } from 'framer-motion';
import { Shield, Check } from 'lucide-react';

const insuranceProviders = [
  { name: 'Aetna', logo: 'A' },
  { name: 'Blue Cross', logo: 'BC' },
  { name: 'Cigna', logo: 'C' },
  { name: 'United', logo: 'UH' },
  { name: 'Kaiser', logo: 'KP' },
  { name: 'Humana', logo: 'H' },
  { name: 'Anthem', logo: 'An' },
  { name: 'Medicare', logo: 'M' },
];

const benefits = [
  'Instant verification',
  'Direct billing',
  'No paperwork',
  'Pre-authorization',
];

export default function InsuranceProviders() {
  return (
    <section className="py-24 bg-gradient-to-b from-background to-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-sm font-medium mb-6">
            <Shield className="w-4 h-4" />
            Insurance Partners
          </div>
          <h2 className="text-4xl md:text-5xl font-extralight tracking-tight text-foreground mb-4">
            We Work With Your Insurance
          </h2>
          <p className="text-lg text-muted-foreground font-light max-w-2xl mx-auto">
            Seamless coverage verification and direct billing with major providers
          </p>
        </motion.div>

        {/* Insurance logos */}
        <div className="flex flex-wrap justify-center gap-4 mb-12">
          {insuranceProviders.map((provider, index) => (
            <motion.div
              key={provider.name}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
              whileHover={{ scale: 1.05, y: -3 }}
              className="w-24 h-24 rounded-2xl bg-card border border-border/50 flex flex-col items-center justify-center gap-2 hover:border-primary/30 hover:shadow-lg transition-all duration-300 cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary font-bold text-sm">
                {provider.logo}
              </div>
              <span className="text-xs text-muted-foreground">{provider.name}</span>
            </motion.div>
          ))}
        </div>

        {/* Benefits */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-wrap justify-center gap-6"
        >
          {benefits.map((benefit, index) => (
            <div
              key={benefit}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10"
            >
              <Check className="w-4 h-4 text-emerald-500" />
              <span className="text-sm font-medium text-foreground">{benefit}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
