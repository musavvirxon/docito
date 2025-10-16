import { motion } from "framer-motion";
import { CheckCircle2, Clock, Star, Zap, Globe, Shield } from "lucide-react";
import { Card } from "@/components/ui/card";

const FeaturesGrid = () => {
  const features = [
    {
      icon: CheckCircle2,
      title: "Verified Doctors",
      description: "All healthcare providers are thoroughly verified and licensed",
    },
    {
      icon: Clock,
      title: "24/7 Availability",
      description: "Book appointments anytime, anywhere, on any device",
    },
    {
      icon: Star,
      title: "Real Reviews",
      description: "Authentic patient reviews to help you make informed decisions",
    },
    {
      icon: Zap,
      title: "Instant Booking",
      description: "Get confirmed appointments in seconds, not days",
    },
    {
      icon: Globe,
      title: "Global Network",
      description: "Access healthcare providers in 50+ countries worldwide",
    },
    {
      icon: Shield,
      title: "Secure & Private",
      description: "Your medical data is encrypted and HIPAA compliant",
    },
  ];

  return (
    <section className="py-24 bg-gradient-to-br from-[hsl(221,83%,53%)] via-[hsl(243,75%,59%)] to-[hsl(271,76%,53%)] relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 15, repeat: Infinity }}
          className="absolute top-0 left-0 w-96 h-96 bg-white/10 rounded-full blur-3xl"
        />
        <motion.div
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 20, repeat: Infinity }}
          className="absolute bottom-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl"
        />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-primary-foreground mb-4">
            Why Choose Docito?
          </h2>
          <p className="text-xl text-primary-foreground/80">
            Trusted by millions for quality healthcare
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              whileHover={{ y: -5 }}
            >
              <Card className="relative overflow-hidden p-8 h-full bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent"></div>
                <div className="relative z-10">
                  <div className="inline-flex p-3 rounded-xl bg-gradient-to-br from-primary-foreground/20 to-primary-foreground/5 mb-4">
                    <feature.icon className="w-8 h-8 text-primary-foreground" />
                  </div>
                  <h3 className="text-xl font-bold text-primary-foreground mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-primary-foreground/80">{feature.description}</p>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesGrid;
