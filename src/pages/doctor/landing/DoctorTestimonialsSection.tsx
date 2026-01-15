import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Star, Quote } from 'lucide-react';

const TestimonialCard = ({
  name,
  specialty,
  quote,
  delay = 0,
}: {
  name: string;
  specialty: string;
  quote: string;
  delay?: number;
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.6, delay, ease: 'easeOut' }}
    >
      <Card className="relative overflow-hidden border-border/50 bg-card/50 backdrop-blur-xl p-6 h-full">
        <div className="absolute top-4 right-4 text-primary/20">
          <Quote className="w-8 h-8" />
        </div>
        
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-xl">👨‍⚕️</span>
          </div>
          <div>
            <h4 className="font-semibold text-foreground">{name}</h4>
            <p className="text-sm text-muted-foreground">{specialty}</p>
          </div>
        </div>

        <p className="text-muted-foreground italic leading-relaxed mb-4">
          "{quote}"
        </p>

        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star key={star} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
          ))}
        </div>
      </Card>
    </motion.div>
  );
};

const MetricCard = ({
  value,
  label,
  delay = 0,
}: {
  value: string;
  label: string;
  delay?: number;
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.5, delay }}
      className="text-center"
    >
      <div className="text-4xl md:text-5xl font-bold text-primary mb-2">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </motion.div>
  );
};

export default function DoctorTestimonialsSection() {
  const testimonials = [
    {
      name: 'Dr. Sarah Mitchell',
      specialty: 'Family Medicine',
      quote: 'I used to spend 2 hours on paperwork after clinic. Now it takes 15 minutes. Docito changed how I practice.',
    },
    {
      name: 'Dr. James Rodriguez',
      specialty: 'Cardiology',
      quote: 'The referral system is incredible. I send a patient to the lab and results appear in my dashboard. No phone tag.',
    },
    {
      name: 'Dr. Emily Chen',
      specialty: 'Dermatology',
      quote: 'My no-show rate dropped from 25% to under 5%. The automated reminders are worth every penny.',
    },
  ];

  const metrics = [
    { value: '10,000+', label: 'Verified Providers' },
    { value: '70%', label: 'Fewer No-Shows' },
    { value: '2M+', label: 'Appointments Booked' },
    { value: '4.9/5', label: 'Provider Rating' },
  ];

  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        {/* Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16 max-w-4xl mx-auto">
          {metrics.map((m, idx) => (
            <MetricCard key={idx} value={m.value} label={m.label} delay={idx * 0.1} />
          ))}
        </div>

        {/* Testimonials Header */}
        <div className="max-w-3xl mx-auto text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Trusted by doctors worldwide
          </h2>
          <p className="text-muted-foreground text-lg">
            See how healthcare providers are transforming their practices with Docito.
          </p>
        </div>

        {/* Testimonial Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {testimonials.map((t, idx) => (
            <TestimonialCard
              key={idx}
              name={t.name}
              specialty={t.specialty}
              quote={t.quote}
              delay={idx * 0.1}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
