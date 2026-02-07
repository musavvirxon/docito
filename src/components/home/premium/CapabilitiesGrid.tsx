// src/components/home/premium/CapabilitiesGrid.tsx
import { motion } from "framer-motion";
import {
  Calendar,
  FileText,
  FolderOpen,
  PenTool,
  Users,
  Shield,
  CreditCard,
  Bell,
  Video,
  ArrowRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const capabilities = [
  {
    icon: Calendar,
    title: "Smart Scheduling",
    description: "Online booking, reminders, and real-time availability.",
    featureId: "feature-scheduling",
  },
  {
    icon: FileText,
    title: "Digital Prescriptions",
    description: "Send prescriptions to pharmacies and keep everything in the patient timeline.",
    featureId: "feature-medication",
  },
  {
    icon: FolderOpen,
    title: "Secure Records",
    description: "Store documents and share files with the right people—fast and secure.",
    featureId: "feature-health-records",
  },
  {
    icon: PenTool,
    title: "Clinical Notes",
    description: "Templates and structured notes to document care consistently.",
    featureId: "feature-health-records",
  },
  {
    icon: Users,
    title: "Team Coordination",
    description: "Secure messaging and handoffs across staff, providers, and facilities.",
    featureId: "feature-messaging",
  },
  {
    icon: Shield,
    title: "Insurance & Coverage",
    description: "Integrated coverage checks and billing support that reduces back-and-forth.",
    featureId: "feature-billing",
  },
  {
    icon: CreditCard,
    title: "Payments",
    description: "Collect payments, send invoices, and keep revenue tracking in one place.",
    featureId: "feature-billing",
  },
  {
    icon: Bell,
    title: "Automations",
    description: "Reminders, updates, and follow-ups that cut no-shows and manual work.",
    featureId: "feature-notifications",
  },
  {
    icon: Video,
    title: "Telemedicine",
    description: "Offer remote visits when in-person care isn’t possible.",
    featureId: "feature-telemedicine",
  },
];

export default function CapabilitiesGrid() {
  const navigate = useNavigate();

  const goToFeature = (featureId: string) => {
    navigate(`/features#${featureId}`);
  };

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
            One platform. Every workflow.
          </h2>
          <p className="text-lg text-muted-foreground font-light max-w-2xl mx-auto">
            From first search to follow-up—Docito keeps care and operations connected.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              size="lg"
              className="rounded-full h-12 px-6 gap-2"
              onClick={() => navigate("/features#features")}
            >
              Explore platform
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="rounded-full h-12 px-6"
              onClick={() => navigate("/how-it-works")}
            >
              See how it works
            </Button>
          </div>
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
              <div className="h-full p-6 rounded-3xl bg-card border border-border/50 transition-all duration-300 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 flex flex-col">
                <div className="flex items-start gap-4">
                  <motion.div
                    whileHover={{ rotate: 5, scale: 1.1 }}
                    transition={{ type: "spring", stiffness: 300 }}
                    className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center flex-shrink-0 group-hover:from-primary/30 group-hover:to-primary/10 transition-colors duration-300"
                  >
                    <capability.icon className="w-6 h-6 text-primary" />
                  </motion.div>

                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground mb-2 group-hover:text-primary transition-colors duration-300">
                      {capability.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {capability.description}
                    </p>
                  </div>
                </div>

                <div className="mt-5">
                  <Button
                    variant="ghost"
                    className="px-0 h-auto text-primary hover:text-primary/90 hover:bg-transparent"
                    onClick={() => goToFeature(capability.featureId)}
                  >
                    Learn more
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
