import { motion } from 'framer-motion';
import { TrendingUp, Clock, Star, ChevronRight } from 'lucide-react';

const trendingTests = [
  { name: 'Complete Blood Count', price: 25, time: '24 hrs', bookings: '2.4k' },
  { name: 'Lipid Profile', price: 35, time: '24 hrs', bookings: '1.8k' },
  { name: 'HbA1c Test', price: 30, time: '24 hrs', bookings: '1.5k' },
  { name: 'Thyroid Panel', price: 45, time: '48 hrs', bookings: '1.2k' },
  { name: 'Vitamin D Test', price: 40, time: '24 hrs', bookings: '1.1k' },
];

const trendingImaging = [
  { name: 'Chest X-Ray', price: 50, time: 'Same day', bookings: '980' },
  { name: 'Abdominal Ultrasound', price: 120, time: 'Same day', bookings: '750' },
  { name: 'MRI Brain', price: 350, time: '2-3 days', bookings: '520' },
  { name: 'CT Scan Chest', price: 280, time: '1-2 days', bookings: '480' },
];

export default function TrendingServices() {
  return (
    <section className="py-24 bg-gradient-to-b from-muted/30 to-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-rose-500/10 text-rose-500 text-sm font-medium mb-6">
            <TrendingUp className="w-4 h-4" />
            Trending Now
          </div>
          <h2 className="text-4xl md:text-5xl font-extralight tracking-tight text-foreground mb-4">
            Most Booked Services
          </h2>
          <p className="text-lg text-muted-foreground font-light max-w-2xl mx-auto">
            Popular tests and imaging services this week
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Lab Tests */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h3 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              Lab Tests
            </h3>
            <div className="space-y-3">
              {trendingTests.map((test, index) => (
                <motion.div
                  key={test.name}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                  whileHover={{ x: 5 }}
                  className="group p-4 rounded-2xl bg-card border border-border/50 hover:border-primary/30 hover:shadow-lg transition-all duration-300 cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-foreground group-hover:text-primary transition-colors">
                        {test.name}
                      </h4>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {test.time}
                        </span>
                        <span className="flex items-center gap-1">
                          <Star className="w-3 h-3" />
                          {test.bookings} booked
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-semibold text-primary">${test.price}</span>
                      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Imaging Services */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h3 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-violet-500" />
              Imaging Services
            </h3>
            <div className="space-y-3">
              {trendingImaging.map((service, index) => (
                <motion.div
                  key={service.name}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                  whileHover={{ x: 5 }}
                  className="group p-4 rounded-2xl bg-card border border-border/50 hover:border-primary/30 hover:shadow-lg transition-all duration-300 cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-foreground group-hover:text-primary transition-colors">
                        {service.name}
                      </h4>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {service.time}
                        </span>
                        <span className="flex items-center gap-1">
                          <Star className="w-3 h-3" />
                          {service.bookings} booked
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-semibold text-primary">${service.price}</span>
                      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
