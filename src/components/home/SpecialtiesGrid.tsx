import { motion } from "framer-motion";
import { useState } from "react";
import { Heart, Users, Pill, Brain, Eye, Activity, Bone, Baby } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export const ToothIcon = ({ className = "w-8 h-8" }) => {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 2c-2.8 0-5 2.3-5 5.2 0 1.8.6 3.3 1.3 4.5.4.8.7 1.6.8 2.4.2 1.4.8 4.9 2.9 4.9s2.7-3.5 2.9-4.9c.1-.8.4-1.6.8-2.4.7-1.2 1.3-2.7 1.3-4.5C17 4.3 14.8 2 12 2z" />
      <path d="M10 11c.5.3 1.2.5 2 .5s1.5-.2 2-.5" />
    </svg>
  );
};

const SpecialtiesGrid = () => {
  const { t } = useTranslation("home");
  const [selectedSpecialty, setSelectedSpecialty] = useState<string | null>(null);

  const specialties = [
    { name: t("specialties.cardiology"), icon: Heart, color: "text-red-500" },
    { name: t("specialties.dentist"), icon: ToothIcon, color: "text-cyan-500" },
    { name: t("specialties.obGyn"), icon: Users, color: "text-purple-500" },
    { name: t("specialties.dermatology"), icon: Pill, color: "text-orange-500" },
    { name: t("specialties.psychiatry"), icon: Brain, color: "text-indigo-500" },
    { name: t("specialties.ophthalmology"), icon: Eye, color: "text-teal-500" },
    { name: t("specialties.neurology"), icon: Activity, color: "text-violet-500" },
    { name: t("specialties.orthopedics"), icon: Bone, color: "text-slate-500" },
    { name: t("specialties.pediatrics"), icon: Baby, color: "text-pink-500" },
  ];

  const handleSpecialtyClick = (specialtyName: string) => {
    setSelectedSpecialty(specialtyName);

    // Scroll to search section
    setTimeout(() => {
      document.getElementById("search-results")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 150);

    // Trigger home search
    window.dispatchEvent(
      new CustomEvent("homepage-search", {
        detail: { specialty: specialtyName, location: "", insurance: "" },
      }),
    );

    // Remove highlight
    setTimeout(() => setSelectedSpecialty(null), 2500);
  };

  return (
    <section id="specialties" className="py-24 bg-background dark:bg-background">
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4 tracking-tight">
            {t("specialties.title")}
          </h2>
          <p className="text-xl text-muted-foreground">{t("specialties.subtitle")}</p>
        </motion.div>

        {/* Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-6">
          {specialties.map((specialty, index) => {
            const Icon = specialty.icon;

            return (
              <motion.div
                key={specialty.name}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05, duration: 0.4 }}
                whileHover={{ y: -5 }}
                onClick={() => handleSpecialtyClick(specialty.name)}
                className="relative group cursor-pointer"
              >
                <div
                  className={cn(
                    "bg-card dark:bg-card rounded-2xl p-8 h-full flex flex-col items-center justify-center text-center border-2 transition-all duration-300 shadow-lg hover:shadow-xl dark:hover:shadow-glow-blue",
                    selectedSpecialty === specialty.name
                      ? "border-primary dark:border-primary shadow-2xl dark:shadow-glow-blue-lg scale-105"
                      : "border-border dark:border-border hover:border-primary/50 dark:hover:border-primary",
                  )}
                >
                  <div className="relative z-10 mb-4">
                    <div
                      className={cn(
                        "w-16 h-16 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300",
                        selectedSpecialty === specialty.name
                          ? "bg-primary/20 dark:bg-primary/30"
                          : "bg-primary/10 dark:bg-primary/20",
                      )}
                    >
                      <Icon className={cn("w-8 h-8", specialty.color)} />
                    </div>
                  </div>

                  <h3 className="text-lg font-semibold text-foreground relative z-10">{specialty.name}</h3>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default SpecialtiesGrid;
