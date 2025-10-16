import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

const SpecialtiesGrid = () => {
  const navigate = useNavigate();

  const specialties = [
    { name: "Primary Care", icon: "💝", gradient: "from-rose-400 to-pink-600" },
    { name: "Dentist", icon: "🦷", gradient: "from-cyan-400 to-blue-600" },
    { name: "OB-GYN", icon: "👥", gradient: "from-purple-400 to-indigo-600" },
    { name: "Dermatologist", icon: "🧴", gradient: "from-orange-400 to-red-600" },
    { name: "Psychiatrist", icon: "🧠", gradient: "from-indigo-400 to-purple-600" },
    { name: "Ophthalmologist", icon: "👁️", gradient: "from-teal-400 to-cyan-600" },
    { name: "Cardiologist", icon: "❤️", gradient: "from-red-400 to-rose-600" },
    { name: "Neurologist", icon: "🧠", gradient: "from-violet-400 to-purple-600" },
    { name: "Orthopedist", icon: "🦴", gradient: "from-gray-400 to-slate-600" },
  ];

  const handleSpecialtyClick = (specialtyName: string) => {
    navigate(`/search-results?specialty=${encodeURIComponent(specialtyName)}`);
  };

  return (
    <section id="specialties" className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Browse by Specialty
          </h2>
          <p className="text-xl text-muted-foreground">Find the right specialist for your needs</p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-6">
          {specialties.map((specialty, index) => (
            <motion.div
              key={specialty.name}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05, duration: 0.4 }}
              whileHover={{ scale: 1.05, rotate: 2 }}
              onClick={() => handleSpecialtyClick(specialty.name)}
              className="relative group cursor-pointer"
            >
              <div className="bg-card rounded-2xl p-8 h-full flex flex-col items-center justify-center text-center border-2 border-transparent hover:border-primary/50 transition-all duration-300 shadow-lg hover:shadow-2xl">
                <div className={`absolute inset-0 bg-gradient-to-br ${specialty.gradient} opacity-0 group-hover:opacity-5 rounded-2xl transition-opacity duration-300`}></div>
                <motion.div
                  whileHover={{ scale: 1.2, rotate: 10 }}
                  className="text-6xl mb-4 relative z-10"
                >
                  {specialty.icon}
                </motion.div>
                <h3 className="text-lg font-semibold text-foreground relative z-10">
                  {specialty.name}
                </h3>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SpecialtiesGrid;
