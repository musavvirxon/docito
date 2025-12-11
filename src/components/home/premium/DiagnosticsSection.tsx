import { motion } from 'framer-motion';
import { TestTube, Scan, Pill, Clock, Truck, Shield, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const diagnosticServices = [
  {
    title: 'Laboratory Testing',
    description: 'Comprehensive blood work, genetic testing, and diagnostic panels',
    icon: TestTube,
    color: 'from-blue-500 to-cyan-500',
    features: ['Same-day results', 'Home collection', '2000+ tests'],
    image: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=600&h=400&fit=crop',
    cta: 'Find Labs'
  },
  {
    title: 'Medical Imaging',
    description: 'MRI, CT Scan, X-Ray, Ultrasound, and advanced diagnostics',
    icon: Scan,
    color: 'from-violet-500 to-purple-500',
    features: ['Digital reports', 'Expert radiologists', 'Modern equipment'],
    image: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=600&h=400&fit=crop',
    cta: 'Find Imaging'
  },
  {
    title: 'Pharmacy Services',
    description: 'Prescription fulfillment, medications, and health products',
    icon: Pill,
    color: 'from-emerald-500 to-green-500',
    features: ['24/7 availability', 'Home delivery', 'Generic alternatives'],
    image: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=600&h=400&fit=crop',
    cta: 'Find Pharmacies'
  },
];

export default function DiagnosticsSection() {
  return (
    <section className="py-24 bg-gradient-to-b from-muted/30 to-background overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-extralight tracking-tight text-foreground mb-4">
            Complete Diagnostics Ecosystem
          </h2>
          <p className="text-lg text-muted-foreground font-light max-w-2xl mx-auto">
            Labs, imaging centers, and pharmacies integrated into one seamless platform
          </p>
        </motion.div>

        <div className="space-y-20">
          {diagnosticServices.map((service, index) => (
            <motion.div
              key={service.title}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.8, delay: index * 0.1 }}
              className={`flex flex-col ${index % 2 === 1 ? 'lg:flex-row-reverse' : 'lg:flex-row'} items-center gap-12`}
            >
              {/* Image */}
              <div className="flex-1 w-full">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="relative rounded-3xl overflow-hidden aspect-[4/3] group"
                >
                  <img
                    src={service.image}
                    alt={service.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  
                  {/* Floating Icon */}
                  <motion.div
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className={`absolute top-6 right-6 w-16 h-16 rounded-2xl bg-gradient-to-br ${service.color} flex items-center justify-center shadow-xl`}
                  >
                    <service.icon className="w-8 h-8 text-white" />
                  </motion.div>

                  {/* Animated scan line for imaging */}
                  {service.title === 'Medical Imaging' && (
                    <motion.div
                      initial={{ top: '0%' }}
                      animate={{ top: ['0%', '100%', '0%'] }}
                      transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                      className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-violet-500 to-transparent opacity-60"
                    />
                  )}

                  {/* Animated bubbles for lab */}
                  {service.title === 'Laboratory Testing' && (
                    <div className="absolute bottom-10 left-10">
                      {[...Array(5)].map((_, i) => (
                        <motion.div
                          key={i}
                          initial={{ y: 0, opacity: 0 }}
                          animate={{ y: -50, opacity: [0, 1, 0] }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            delay: i * 0.3,
                            ease: 'easeOut'
                          }}
                          className="absolute w-3 h-3 rounded-full bg-cyan-400/60"
                          style={{ left: i * 12 }}
                        />
                      ))}
                    </div>
                  )}
                </motion.div>
              </div>

              {/* Content */}
              <div className="flex-1 w-full">
                <h3 className="text-3xl md:text-4xl font-light text-foreground mb-4">
                  {service.title}
                </h3>
                <p className="text-lg text-muted-foreground font-light mb-8">
                  {service.description}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                  {service.features.map((feature, fIndex) => (
                    <motion.div
                      key={feature}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: 0.4 + fIndex * 0.1 }}
                      className="flex items-center gap-3 p-4 rounded-2xl bg-card border border-border/50"
                    >
                      {fIndex === 0 && <Clock className="w-5 h-5 text-primary" />}
                      {fIndex === 1 && <Truck className="w-5 h-5 text-primary" />}
                      {fIndex === 2 && <Shield className="w-5 h-5 text-primary" />}
                      <span className="text-sm font-medium text-foreground">{feature}</span>
                    </motion.div>
                  ))}
                </div>

                <Button
                  size="lg"
                  className={`rounded-full bg-gradient-to-r ${service.color} hover:opacity-90 text-white border-0`}
                >
                  {service.cta}
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
