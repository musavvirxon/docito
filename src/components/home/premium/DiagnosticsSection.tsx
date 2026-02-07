// src/components/home/premium/DiagnosticsSection.tsx
import { motion } from "framer-motion";
import {
  Microscope,
  Scan,
  Pill,
  ArrowRight,
  CheckCircle,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { trackMarketingEvent } from "@/lib/marketing";

const diagnosticServices = [
  {
    icon: Microscope,
    title: "Laboratory testing",
    description:
      "Order labs, receive results, and keep everything tied to the patient record — automatically.",
    features: [
      "Orders & results linked to the chart",
      "Digital result delivery",
      "Ready for billing workflows",
    ],
    browseRoute: "/labs",
    joinRole: "lab_admin",
    browseLabel: "Browse labs",
    joinLabel: "Join as a lab",
  },
  {
    icon: Scan,
    title: "Medical imaging",
    description:
      "Coordinate imaging orders and reports so referrers and patients stay aligned — without extra tools.",
    features: [
      "Reports attached to the visit",
      "Easy sharing with referrers",
      "Status updates across the care path",
    ],
    browseRoute: "/imaging",
    joinRole: "imaging_admin",
    browseLabel: "Browse imaging",
    joinLabel: "Join as an imaging center",
  },
  {
    icon: Pill,
    title: "Pharmacy services",
    description:
      "Prescribe, fulfill, and follow up — with medication updates visible across the care team.",
    features: [
      "ePrescriptions and refills",
      "Availability + substitutions",
      "Pickup or delivery coordination",
    ],
    browseRoute: "/pharmacies",
    joinRole: "pharmacy_admin",
    browseLabel: "Browse pharmacies",
    joinLabel: "Join as a pharmacy",
  },
];

export default function DiagnosticsSection() {
  const navigate = useNavigate();

  const onBrowse = (serviceTitle: string, route: string) => {
    void trackMarketingEvent("home_diagnostics_browse", {
      service: serviceTitle,
      route,
    });
    navigate(route);
  };

  const onJoin = (serviceTitle: string, role: string) => {
    void trackMarketingEvent("home_diagnostics_join", {
      service: serviceTitle,
      role,
    });
    navigate(`/auth?mode=signup&role=${encodeURIComponent(role)}`);
  };

  return (
    <section className="py-24 bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Building2 className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">
              Diagnostics & Pharmacy
            </span>
          </div>

          <h2 className="text-4xl font-bold mb-6">
            Keep the full care journey{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-600">
              connected
            </span>
          </h2>

          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Bring labs, imaging, and pharmacy updates into the same workflow as scheduling and
            visits — so patients and teams always have the latest context.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {diagnosticServices.map((service, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.6 }}
              className="group"
            >
              <div className="h-full bg-white/50 border border-primary/10 rounded-3xl p-8 backdrop-blur-sm hover:bg-white/70 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                <div className="w-16 h-16 bg-gradient-to-r from-primary/10 to-purple-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <service.icon className="h-8 w-8 text-primary" />
                </div>

                <h3 className="text-2xl font-bold mb-4">{service.title}</h3>
                <p className="text-muted-foreground mb-6">{service.description}</p>

                <div className="space-y-3 mb-8">
                  {service.features.map((feature, featureIndex) => (
                    <div
                      key={featureIndex}
                      className="flex items-center gap-3 text-sm"
                    >
                      <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-auto flex flex-col gap-3">
                  <Button
                    variant="outline"
                    className="w-full group/btn"
                    onClick={() => onBrowse(service.title, service.browseRoute)}
                  >
                    {service.browseLabel}
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                  </Button>

                  <Button
                    className="w-full group/btn"
                    onClick={() => onJoin(service.title, service.joinRole)}
                  >
                    {service.joinLabel}
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
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
