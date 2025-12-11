import { motion } from 'framer-motion';
import { Globe, Shield, Award, CheckCircle } from 'lucide-react';

const regions = [
  { name: 'North America', flag: '🇺🇸', bgColor: 'bg-blue-500/10' },
  { name: 'Europe', flag: '🇪🇺', bgColor: 'bg-indigo-500/10' },
  { name: 'Asia Pacific', flag: '🇸🇬', bgColor: 'bg-red-500/10' },
  { name: 'Middle East', flag: '🇦🇪', bgColor: 'bg-green-500/10' },
  { name: 'Latin America', flag: '🇧🇷', bgColor: 'bg-yellow-500/10' },
  { name: 'Africa', flag: '🇿🇦', bgColor: 'bg-emerald-500/10' },
];

const certifications = [
  { icon: Shield, label: 'HIPAA Compliant', description: 'Healthcare data protection' },
  { icon: Award, label: 'SOC 2 Type II', description: 'Security certified' },
  { icon: CheckCircle, label: 'GDPR Ready', description: 'EU data privacy' },
];

export default function GlobalTrust() {
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
            <Globe className="w-4 h-4" />
            Available Worldwide
          </div>
          <h2 className="text-4xl md:text-5xl font-extralight tracking-tight text-foreground mb-4">
            Trusted Globally
          </h2>
          <p className="text-lg text-muted-foreground font-light max-w-2xl mx-auto">
            Healthcare providers in over 50 countries trust Docito for their practice
          </p>
        </motion.div>

        {/* Regions with visible flags */}
        <div className="flex flex-wrap justify-center gap-4 mb-16">
          {regions.map((region, index) => (
            <motion.div
              key={region.name}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
              whileHover={{ scale: 1.05, y: -2 }}
              className={`flex items-center gap-3 px-5 py-3 rounded-full ${region.bgColor} border border-border/50 hover:border-primary/30 hover:shadow-lg transition-all duration-300`}
            >
              <span className="text-3xl" role="img" aria-label={region.name}>{region.flag}</span>
              <span className="text-sm font-medium text-foreground">{region.name}</span>
            </motion.div>
          ))}
        </div>

        {/* Certifications */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {certifications.map((cert, index) => (
            <motion.div
              key={cert.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="p-6 rounded-3xl bg-gradient-to-br from-card to-muted/30 border border-border/50 text-center"
            >
              <motion.div
                whileHover={{ rotate: 5, scale: 1.1 }}
                className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4"
              >
                <cert.icon className="w-8 h-8 text-primary" />
              </motion.div>
              <h3 className="font-semibold text-foreground mb-2">{cert.label}</h3>
              <p className="text-sm text-muted-foreground">{cert.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
