import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import {
  Shield,
  Lock,
  BadgeCheck,
  Eye,
  FileCheck,
  Users,
} from 'lucide-react';

const TrustBadge = ({
  icon: Icon,
  title,
  description,
  delay = 0,
}: {
  icon: any;
  title: string;
  description: string;
  delay?: number;
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ duration: 0.5, delay, ease: 'easeOut' }}
      className="flex items-start gap-4"
    >
      <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="w-6 h-6 text-primary" />
      </div>
      <div>
        <h4 className="font-semibold text-foreground mb-1">{title}</h4>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </motion.div>
  );
};

// SVG Shield animation
const ShieldAnimation = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  return (
    <div ref={ref} className="relative w-48 h-48 mx-auto">
      <svg viewBox="0 0 100 100" className="w-full h-full">
        {/* Shield outline */}
        <motion.path
          d="M 50 10 L 85 25 L 85 55 Q 85 75 50 90 Q 15 75 15 55 L 15 25 Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-primary"
          initial={{ pathLength: 0 }}
          animate={isInView ? { pathLength: 1 } : { pathLength: 0 }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
        />
        
        {/* Shield fill */}
        <motion.path
          d="M 50 10 L 85 25 L 85 55 Q 85 75 50 90 Q 15 75 15 55 L 15 25 Z"
          className="fill-primary/10"
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.5, delay: 1 }}
        />

        {/* Checkmark */}
        <motion.path
          d="M 35 50 L 45 60 L 65 40"
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-primary"
          initial={{ pathLength: 0 }}
          animate={isInView ? { pathLength: 1 } : { pathLength: 0 }}
          transition={{ duration: 0.5, delay: 1.2 }}
        />
      </svg>
    </div>
  );
};

export default function DoctorTrustSection() {
  const trustItems = [
    {
      icon: Shield,
      title: 'HIPAA & GDPR Compliant',
      description: 'Enterprise-grade security that meets the strictest healthcare regulations.',
    },
    {
      icon: BadgeCheck,
      title: 'Verified Providers Only',
      description: 'Every doctor is verified with license credentials before going live.',
    },
    {
      icon: Lock,
      title: 'End-to-End Encryption',
      description: 'All patient data is encrypted at rest and in transit.',
    },
    {
      icon: Eye,
      title: 'Role-Based Access',
      description: 'Staff see only what they need. Patients control their data.',
    },
    {
      icon: FileCheck,
      title: 'Audit-Ready Records',
      description: 'Complete activity logs for compliance and accountability.',
    },
    {
      icon: Users,
      title: 'No Data Selling',
      description: 'We never sell, share, or monetize patient data. Ever.',
    },
  ];

  return (
    <section className="py-20 bg-muted/20">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium text-primary mb-4">
            <Lock className="w-4 h-4" />
            Security & Trust
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Built for healthcare security
          </h2>
          <p className="text-muted-foreground text-lg">
            Your patients' trust is everything. Docito is designed from the ground up 
            to protect sensitive health information.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center max-w-5xl mx-auto">
          {/* Shield Animation */}
          <div className="hidden lg:block">
            <ShieldAnimation />
          </div>

          {/* Trust Items */}
          <div className="space-y-6">
            {trustItems.map((item, idx) => (
              <TrustBadge
                key={idx}
                icon={item.icon}
                title={item.title}
                description={item.description}
                delay={idx * 0.1}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
