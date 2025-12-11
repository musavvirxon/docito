import { motion } from 'framer-motion';
import { Star, Quote } from 'lucide-react';

const testimonials = [
  {
    name: 'Dr. Sarah Mitchell',
    role: 'Cardiologist',
    location: 'New York, NY',
    image: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=100&h=100&fit=crop&crop=face',
    rating: 5,
    text: 'Docito transformed how I manage my practice. The scheduling system alone saved me 10 hours a week. My patients love the seamless booking experience.',
  },
  {
    name: 'Michael Chen',
    role: 'Patient',
    location: 'San Francisco, CA',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
    rating: 5,
    text: 'Finding a specialist used to be frustrating. With Docito, I found the perfect neurologist in minutes and booked an appointment for the next day.',
  },
  {
    name: 'Dr. Emily Rodriguez',
    role: 'Clinic Director',
    location: 'Chicago, IL',
    image: 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=100&h=100&fit=crop&crop=face',
    rating: 5,
    text: 'We onboarded our entire clinic in a week. The team collaboration features keep everyone in sync. Patient satisfaction has never been higher.',
  },
];

export default function Testimonials() {
  return (
    <section className="py-24 bg-background overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-extralight tracking-tight text-foreground mb-4">
            Loved by Healthcare
            <br />
            <span className="font-normal text-primary">Professionals & Patients</span>
          </h2>
          <p className="text-lg text-muted-foreground font-light max-w-2xl mx-auto">
            See what our community has to say
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              whileHover={{ y: -5 }}
              className="relative"
            >
              <div className="h-full p-8 rounded-3xl bg-card border border-border/50 hover:border-primary/30 hover:shadow-xl transition-all duration-300">
                {/* Quote icon */}
                <div className="absolute -top-4 left-8">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                    <Quote className="w-4 h-4 text-primary-foreground" />
                  </div>
                </div>

                {/* Rating */}
                <div className="flex gap-1 mb-4 pt-2">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>

                {/* Text */}
                <p className="text-foreground leading-relaxed mb-6">
                  "{testimonial.text}"
                </p>

                {/* Author */}
                <div className="flex items-center gap-4">
                  <img
                    src={testimonial.image}
                    alt={testimonial.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div>
                    <h4 className="font-semibold text-foreground">{testimonial.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {testimonial.role} • {testimonial.location}
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
