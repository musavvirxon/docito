import { motion } from 'framer-motion';
import { TestTube, Scan, Pill, Clock, Truck, Shield, ChevronRight, Beaker, Activity, Microscope } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Animated Laboratory Illustration
const LabIllustration = () => (
  <div className="relative w-full aspect-[4/3] bg-gradient-to-br from-blue-500/10 via-cyan-500/10 to-blue-600/10 rounded-3xl overflow-hidden border border-border/30">
    {/* Background grid */}
    <div className="absolute inset-0 opacity-20">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="absolute w-full h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent" style={{ top: `${(i + 1) * 12}%` }} />
      ))}
    </div>
    
    {/* Floating test tubes */}
    <motion.div
      animate={{ y: [0, -10, 0], rotate: [-5, 5, -5] }}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      className="absolute top-[15%] left-[15%] w-16 h-32 bg-gradient-to-b from-cyan-400 to-blue-500 rounded-t-full rounded-b-lg shadow-xl shadow-cyan-500/20"
    >
      <div className="absolute top-2 left-2 right-2 h-4 bg-white/30 rounded-full" />
      <motion.div
        animate={{ height: ['60%', '70%', '60%'] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-cyan-300 to-cyan-400/50 rounded-b-lg"
      />
      {/* Bubbles */}
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ y: 0, opacity: 0.8 }}
          animate={{ y: -40, opacity: 0 }}
          transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.4 }}
          className="absolute bottom-[30%] w-2 h-2 rounded-full bg-white/60"
          style={{ left: `${30 + i * 20}%` }}
        />
      ))}
    </motion.div>

    {/* DNA Helix */}
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
      className="absolute top-[20%] right-[20%] w-24 h-24"
    >
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <motion.path
          d="M30 20 Q50 35, 30 50 Q50 65, 30 80"
          stroke="hsl(var(--primary))"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
        <motion.path
          d="M70 20 Q50 35, 70 50 Q50 65, 70 80"
          stroke="hsl(var(--primary))"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
        {[25, 40, 55, 70].map((y, i) => (
          <motion.line
            key={i}
            x1="35" y1={y} x2="65" y2={y}
            stroke="hsl(var(--primary))"
            strokeWidth="2"
            strokeOpacity="0.5"
          />
        ))}
      </svg>
    </motion.div>

    {/* Microscope */}
    <motion.div
      animate={{ scale: [1, 1.05, 1] }}
      transition={{ duration: 3, repeat: Infinity }}
      className="absolute bottom-[15%] left-[40%] w-20 h-28"
    >
      <Microscope className="w-full h-full text-blue-500/60" />
    </motion.div>

    {/* Floating particles */}
    {[...Array(8)].map((_, i) => (
      <motion.div
        key={i}
        initial={{ x: 0, y: 0, opacity: 0.6 }}
        animate={{ 
          x: [0, Math.random() * 20 - 10, 0],
          y: [0, Math.random() * 20 - 10, 0],
          opacity: [0.3, 0.7, 0.3]
        }}
        transition={{ duration: 3 + i * 0.5, repeat: Infinity, delay: i * 0.2 }}
        className="absolute w-3 h-3 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500"
        style={{ 
          top: `${20 + Math.random() * 60}%`,
          left: `${10 + Math.random() * 80}%`
        }}
      />
    ))}

    {/* Central beaker */}
    <motion.div
      animate={{ y: [0, -5, 0] }}
      transition={{ duration: 2.5, repeat: Infinity }}
      className="absolute bottom-[20%] right-[25%]"
    >
      <Beaker className="w-14 h-14 text-cyan-500/70" />
    </motion.div>
  </div>
);

// Animated Medical Imaging Illustration
const ImagingIllustration = () => (
  <div className="relative w-full aspect-[4/3] bg-gradient-to-br from-violet-500/10 via-purple-500/10 to-violet-600/10 rounded-3xl overflow-hidden border border-border/30">
    {/* CT Scanner ring */}
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48"
    >
      <div className="w-full h-full rounded-full border-8 border-violet-500/30" />
      <div className="absolute inset-4 rounded-full border-4 border-purple-400/40" />
      <div className="absolute inset-8 rounded-full border-2 border-violet-300/50" />
      {/* Scanning dots */}
      {[0, 90, 180, 270].map((deg, i) => (
        <motion.div
          key={i}
          animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }}
          className="absolute w-4 h-4 bg-violet-500 rounded-full"
          style={{ 
            top: '50%',
            left: '50%',
            transform: `translate(-50%, -50%) rotate(${deg}deg) translateY(-90px)`
          }}
        />
      ))}
    </motion.div>

    {/* Scan lines */}
    <motion.div
      animate={{ top: ['10%', '90%', '10%'] }}
      transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
      className="absolute left-[25%] right-[25%] h-1 bg-gradient-to-r from-transparent via-violet-500 to-transparent"
    />

    {/* Brain silhouette in center */}
    <motion.div
      animate={{ opacity: [0.4, 0.8, 0.4] }}
      transition={{ duration: 2, repeat: Infinity }}
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-[40%] bg-gradient-to-br from-violet-400/30 to-purple-500/30 border border-violet-400/30"
    />

    {/* Data points */}
    {[...Array(6)].map((_, i) => (
      <motion.div
        key={i}
        initial={{ scale: 0 }}
        animate={{ scale: [0, 1, 0] }}
        transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
        className="absolute w-2 h-2 bg-violet-400 rounded-full"
        style={{ 
          top: `${25 + Math.random() * 50}%`,
          left: `${25 + Math.random() * 50}%`
        }}
      />
    ))}

    {/* Floating icon */}
    <motion.div
      animate={{ y: [0, -8, 0], rotate: [0, 5, -5, 0] }}
      transition={{ duration: 3, repeat: Infinity }}
      className="absolute top-[15%] right-[15%] p-4 bg-violet-500/20 rounded-2xl backdrop-blur-sm"
    >
      <Scan className="w-8 h-8 text-violet-400" />
    </motion.div>

    {/* Activity monitor */}
    <motion.div
      className="absolute bottom-[15%] left-[15%] p-3 bg-purple-500/20 rounded-xl"
    >
      <svg viewBox="0 0 60 30" className="w-16 h-8">
        <motion.path
          d="M0 15 L10 15 L15 5 L20 25 L25 10 L30 20 L35 15 L45 15 L50 10 L55 15 L60 15"
          stroke="hsl(var(--primary))"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </svg>
    </motion.div>
  </div>
);

// Animated Pharmacy Illustration
const PharmacyIllustration = () => (
  <div className="relative w-full aspect-[4/3] bg-gradient-to-br from-emerald-500/10 via-green-500/10 to-emerald-600/10 rounded-3xl overflow-hidden border border-border/30">
    {/* Medicine shelf background */}
    <div className="absolute inset-0 flex flex-col justify-around py-8">
      {[0, 1, 2].map((row) => (
        <div key={row} className="w-full h-1 bg-gradient-to-r from-transparent via-emerald-400/20 to-transparent" />
      ))}
    </div>

    {/* Pill bottles */}
    {[
      { left: '15%', delay: 0, color: 'from-emerald-400 to-green-500' },
      { left: '35%', delay: 0.5, color: 'from-teal-400 to-emerald-500' },
      { left: '55%', delay: 1, color: 'from-green-400 to-teal-500' },
    ].map((bottle, i) => (
      <motion.div
        key={i}
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 2.5, repeat: Infinity, delay: bottle.delay }}
        className={`absolute top-[30%] w-12 h-20 bg-gradient-to-b ${bottle.color} rounded-t-lg rounded-b-xl shadow-lg`}
        style={{ left: bottle.left }}
      >
        <div className="absolute top-0 left-1 right-1 h-4 bg-white/30 rounded-t-lg" />
        <div className="absolute top-6 left-2 right-2 h-6 bg-white/10 rounded" />
      </motion.div>
    ))}

    {/* Floating pills */}
    {[...Array(6)].map((_, i) => (
      <motion.div
        key={i}
        animate={{ 
          y: [0, -15, 0],
          x: [0, 5, 0],
          rotate: [0, 180, 360]
        }}
        transition={{ duration: 3 + i * 0.5, repeat: Infinity, delay: i * 0.3 }}
        className={`absolute w-6 h-3 rounded-full ${i % 2 === 0 ? 'bg-gradient-to-r from-rose-400 to-red-500' : 'bg-gradient-to-r from-emerald-400 to-green-500'}`}
        style={{ 
          top: `${40 + Math.random() * 40}%`,
          left: `${20 + i * 12}%`
        }}
      />
    ))}

    {/* Capsule */}
    <motion.div
      animate={{ rotate: [0, 10, -10, 0], y: [0, -5, 0] }}
      transition={{ duration: 3, repeat: Infinity }}
      className="absolute bottom-[25%] right-[20%] w-8 h-16 rounded-full overflow-hidden shadow-lg"
    >
      <div className="h-1/2 bg-gradient-to-r from-blue-400 to-cyan-500" />
      <div className="h-1/2 bg-gradient-to-r from-white to-gray-100" />
    </motion.div>

    {/* Plus sign medical icon */}
    <motion.div
      animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.8, 0.5] }}
      transition={{ duration: 2, repeat: Infinity }}
      className="absolute top-[20%] right-[25%] w-12 h-12 flex items-center justify-center"
    >
      <div className="absolute w-full h-3 bg-emerald-500/50 rounded-full" />
      <div className="absolute w-3 h-full bg-emerald-500/50 rounded-full" />
    </motion.div>

    {/* Delivery truck */}
    <motion.div
      animate={{ x: [-20, 20, -20] }}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      className="absolute bottom-[15%] left-[30%]"
    >
      <Truck className="w-10 h-10 text-emerald-500/60" />
    </motion.div>

    {/* Pill icon */}
    <motion.div
      animate={{ y: [0, -10, 0] }}
      transition={{ duration: 2, repeat: Infinity }}
      className="absolute top-[15%] left-[20%] p-3 bg-emerald-500/20 rounded-2xl backdrop-blur-sm"
    >
      <Pill className="w-8 h-8 text-emerald-400" />
    </motion.div>
  </div>
);

const diagnosticServices = [
  {
    title: 'Laboratory Testing',
    description: 'Comprehensive blood work, genetic testing, and diagnostic panels',
    icon: TestTube,
    color: 'from-blue-500 to-cyan-500',
    features: ['Same-day results', 'Home collection', '2000+ tests'],
    Illustration: LabIllustration,
    cta: 'Find Labs'
  },
  {
    title: 'Medical Imaging',
    description: 'MRI, CT Scan, X-Ray, Ultrasound, and advanced diagnostics',
    icon: Scan,
    color: 'from-violet-500 to-purple-500',
    features: ['Digital reports', 'Expert radiologists', 'Modern equipment'],
    Illustration: ImagingIllustration,
    cta: 'Find Imaging'
  },
  {
    title: 'Pharmacy Services',
    description: 'Prescription fulfillment, medications, and health products',
    icon: Pill,
    color: 'from-emerald-500 to-green-500',
    features: ['24/7 availability', 'Home delivery', 'Generic alternatives'],
    Illustration: PharmacyIllustration,
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
          {diagnosticServices.map((service, index) => {
            const IllustrationComponent = service.Illustration;
            return (
              <motion.div
                key={service.title}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-100px' }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
                className={`flex flex-col ${index % 2 === 1 ? 'lg:flex-row-reverse' : 'lg:flex-row'} items-center gap-12`}
              >
                {/* Illustration */}
                <div className="flex-1 w-full">
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="relative"
                  >
                    <IllustrationComponent />
                    
                    {/* Floating Icon Badge */}
                    <motion.div
                      initial={{ scale: 0 }}
                      whileInView={{ scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: 0.3 }}
                      className={`absolute top-4 right-4 w-14 h-14 rounded-2xl bg-gradient-to-br ${service.color} flex items-center justify-center shadow-xl`}
                    >
                      <service.icon className="w-7 h-7 text-white" />
                    </motion.div>
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
            );
          })}
        </div>
      </div>
    </section>
  );
}