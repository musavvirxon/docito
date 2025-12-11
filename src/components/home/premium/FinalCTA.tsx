import { motion } from 'framer-motion';
import { ArrowRight, Calendar, UserPlus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function FinalCTA() {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0">
        <motion.div
          animate={{
            background: [
              'radial-gradient(circle at 20% 50%, hsl(var(--primary) / 0.15) 0%, transparent 50%)',
              'radial-gradient(circle at 80% 50%, hsl(var(--primary) / 0.15) 0%, transparent 50%)',
              'radial-gradient(circle at 50% 20%, hsl(var(--primary) / 0.15) 0%, transparent 50%)',
              'radial-gradient(circle at 20% 50%, hsl(var(--primary) / 0.15) 0%, transparent 50%)',
            ]
          }}
          transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-0"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background" />
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, type: 'spring' }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8"
          >
            <Sparkles className="w-4 h-4" />
            Start Your Journey
          </motion.div>

          <h2 className="text-4xl md:text-6xl font-extralight tracking-tight text-foreground mb-6">
            Ready to Transform
            <br />
            <span className="font-normal text-primary">Your Practice?</span>
          </h2>

          <p className="text-lg md:text-xl text-muted-foreground font-light max-w-2xl mx-auto mb-12">
            Join thousands of healthcare providers who have already modernized their practice with Docito.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                size="lg"
                className="h-14 px-8 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground text-lg gap-2"
              >
                <Calendar className="w-5 h-5" />
                Schedule Demo
                <ArrowRight className="w-4 h-4" />
              </Button>
            </motion.div>

            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                size="lg"
                variant="outline"
                className="h-14 px-8 rounded-full text-lg gap-2 border-2"
              >
                <UserPlus className="w-5 h-5" />
                Join as Provider
              </Button>
            </motion.div>
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-8 text-sm text-muted-foreground"
          >
            Free 14-day trial • No credit card required • Cancel anytime
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
}
