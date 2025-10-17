import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Heart, Stethoscope, Users, Pill, Brain, Eye, Activity, Bone, Baby } from "lucide-react";

const SpecialtiesGrid = () => {
  const navigate = useNavigate();

  const specialties = [
    { name: "Cardiology", icon: Heart, color: "text-red-500" },
    { name: "Dentist", icon: Stethoscope, color: "text-cyan-500" },
    { name: "OB-GYN", icon: Users, color: "text-purple-500" },
    { name: "Dermatology", icon: Pill, color: "text-orange-500" },
    { name: "Psychiatry", icon: Brain, color: "text-indigo-500" },
    { name: "Ophthalmology", icon: Eye, color: "text-teal-500" },
    { name: "Neurology", icon: Activity, color: "text-violet-500" },
    { name: "Orthopedics", icon: Bone, color: "text-slate-500" },
    { name: "Pediatrics", icon: Baby, color: "text-pink-500" },
  ];

  const handleSpecialtyClick = (specialtyName: string) => {
    navigate(`/search-results?specialty=${encodeURIComponent(specialtyName)}`);
  };

  return (
    <section id="specialties" className="py-24 bg-background dark:bg-slate-900">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4 tracking-tight">
            Medical Specialties
          </h2>
          <p className="text-xl text-muted-foreground">Connect with certified specialists</p>
        </motion.div>

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
                <div className="bg-card dark:bg-slate-800 rounded-2xl p-8 h-full flex flex-col items-center justify-center text-center border-2 border-border dark:border-slate-700 hover:border-primary/50 dark:hover:border-primary/50 transition-all duration-300 shadow-lg hover:shadow-xl dark:hover:shadow-[0_0_30px_rgba(59,130,246,0.2)]">
                  <div className="relative z-10 mb-4">
                    <div className="w-16 h-16 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <Icon className={`w-8 h-8 ${specialty.color}`} />
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground relative z-10">
                    {specialty.name}
                  </h3>
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
