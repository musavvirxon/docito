import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";

const CTASection = () => {
  const navigate = useNavigate();

  return (
    <section className="py-32 relative overflow-hidden bg-gradient-to-br from-[hsl(271,76%,53%)] via-[hsl(243,75%,59%)] to-[hsl(var(--primary))]">
      {/* Animated Background Blobs */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            x: [0, 100, 0],
            y: [0, -100, 0],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-0 left-0 w-96 h-96 bg-white/10 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1.3, 1, 1.3],
            x: [0, -100, 0],
            y: [0, 100, 0],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl"
        />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-4xl mx-auto"
        >
          <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-md rounded-full px-6 py-3 mb-8">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
            <span className="text-primary-foreground font-semibold">
              Join 1M+ Patients
            </span>
          </div>

          <h2 className="text-5xl md:text-6xl lg:text-7xl font-bold text-primary-foreground mb-6">
            Ready to Find Your
            <br />
            Perfect Doctor?
          </h2>

          <p className="text-xl md:text-2xl text-primary-foreground/90 mb-12 max-w-2xl mx-auto">
            Start your journey to better health today with instant appointments and verified healthcare professionals
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                size="lg"
                onClick={() => navigate("/auth")}
                className="bg-background text-foreground hover:bg-background/90 shadow-2xl text-lg px-8 py-6 h-auto"
              >
                Get Started Free
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate("/doctors")}
                className="bg-transparent border-2 border-white/30 text-primary-foreground hover:bg-white/10 backdrop-blur-sm text-lg px-8 py-6 h-auto"
              >
                Browse Doctors
              </Button>
            </motion.div>
          </div>

          <div className="mt-12 flex flex-wrap justify-center gap-8 text-primary-foreground/80">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-primary-foreground"></div>
              <span className="text-sm">No credit card required</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-primary-foreground"></div>
              <span className="text-sm">Instant verification</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-primary-foreground"></div>
              <span className="text-sm">Free forever</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
