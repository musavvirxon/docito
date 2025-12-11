import { motion } from 'framer-motion';
import { 
  Calendar, FileText, FolderOpen, PenTool, 
  Users, Shield, CreditCard, Bell, Video 
} from 'lucide-react';

const capabilities = [
  {
    icon: Calendar,
    title: 'Smart Scheduling',
    description: 'AI-powered booking with real-time availability'
  },
  {
    icon: FileText,
    title: 'Digital Prescriptions',
    description: 'Paperless prescriptions sent directly to pharmacies'
  },
  {
    icon: FolderOpen,
    title: 'Secure File Storage',
    description: 'HIPAA-compliant medical document management'
  },
  {
    icon: PenTool,
    title: 'Clinical Notes',
    description: 'AI-assisted documentation and templates'
  },
  {
    icon: Users,
    title: 'Team Collaboration',
    description: 'Seamless coordination between care providers'
  },
  {
    icon: Shield,
    title: 'Insurance Support',
    description: 'Integrated verification and claims processing'
  },
  {
    icon: CreditCard,
    title: 'Payment Processing',
    description: 'Secure payments with multiple options'
  },
  {
    icon: Bell,
    title: 'Smart Notifications',
    description: 'Automated reminders and updates'
  },
  {
    icon: Video,
    title: 'Telemedicine',
    description: 'HD video consultations with screen sharing'
  },
];

export default function CapabilitiesGrid() {
  return (
    <section className="py-24 bg-gradient-to-b from-background to-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-extralight tracking-tight text-foreground mb-4">
            Platform Capabilities
          </h2>
          <p className="text-lg text-muted-foreground font-light max-w-2xl mx-auto">
            Everything you need to deliver exceptional healthcare
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {capabilities.map((capability, index) => (
            <motion.div
              key={capability.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.05 }}
              whileHover={{ y: -5, scale: 1.02 }}
              className="group"
            >
              <div className="h-full p-6 rounded-3xl bg-card border border-border/50 transition-all duration-300 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5">
                <div className="flex items-start gap-4">
                  <motion.div
                    whileHover={{ rotate: 5, scale: 1.1 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                    className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center flex-shrink-0 group-hover:from-primary/30 group-hover:to-primary/10 transition-colors duration-300"
                  >
                    <capability.icon className="w-6 h-6 text-primary" />
                  </motion.div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2 group-hover:text-primary transition-colors duration-300">
                      {capability.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {capability.description}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
