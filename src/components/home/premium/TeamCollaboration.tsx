import { motion } from 'framer-motion';
import { 
  User, FileText, MessageCircle, Share2, Activity,
  Building2, TestTube, Scan, Pill, Shield, Stethoscope, Settings
} from 'lucide-react';

const teamMembers = [
  { id: 1, role: 'Platform Admin', icon: Settings, color: 'from-slate-500 to-gray-600', angle: 0 },
  { id: 2, role: 'Clinic Admin', icon: Building2, color: 'from-blue-500 to-cyan-500', angle: 45 },
  { id: 3, role: 'Doctor', icon: Stethoscope, color: 'from-violet-500 to-purple-500', angle: 90 },
  { id: 4, role: 'Lab Center', icon: TestTube, color: 'from-emerald-500 to-green-500', angle: 135 },
  { id: 5, role: 'Imaging Center', icon: Scan, color: 'from-amber-500 to-orange-500', angle: 180 },
  { id: 6, role: 'Pharmacy', icon: Pill, color: 'from-rose-500 to-pink-500', angle: 225 },
  { id: 7, role: 'Patient', icon: User, color: 'from-cyan-500 to-blue-500', angle: 270 },
  { id: 8, role: 'Insurance', icon: Shield, color: 'from-indigo-500 to-violet-500', angle: 315 },
];

// Calculate position based on angle around a circle
const getPosition = (angle: number, radius: number = 38) => {
  const radian = (angle - 90) * (Math.PI / 180);
  return {
    x: 50 + radius * Math.cos(radian),
    y: 50 + radius * Math.sin(radian),
  };
};

export default function TeamCollaboration() {
  return (
    <section className="py-24 bg-gradient-to-b from-background to-muted/30 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-4xl md:text-5xl font-extralight tracking-tight text-foreground mb-6">
              Seamless Team
              <br />
              <span className="font-normal text-primary">Collaboration</span>
            </h2>
            <p className="text-lg text-muted-foreground font-light mb-8 leading-relaxed">
              Connect your entire healthcare ecosystem around unified patient records. 
              Doctors, labs, pharmacies, imaging centers, and administrators — all working together seamlessly.
            </p>

            <div className="space-y-4">
              {[
                { icon: MessageCircle, text: 'Secure HIPAA-compliant messaging' },
                { icon: Share2, text: 'Instant record sharing between all providers' },
                { icon: Activity, text: 'Real-time patient status updates' },
                { icon: FileText, text: 'Collaborative care coordination' },
              ].map((feature, index) => (
                <motion.div
                  key={feature.text}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="flex items-center gap-4"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <feature.icon className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-foreground">{feature.text}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Interactive Visualization - Circular Layout */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative aspect-square max-w-md mx-auto w-full"
          >
            {/* Rotating outer ring */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-[10%] border-2 border-dashed border-border/30 rounded-full"
            />

            {/* Animated pulses */}
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0.3, opacity: 0.5 }}
                animate={{ scale: 1.5, opacity: 0 }}
                transition={{ duration: 3, repeat: Infinity, delay: i * 1 }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border-2 border-primary/40"
              />
            ))}

            {/* Central Docito Hub */}
            <motion.div
              animate={{ 
                boxShadow: [
                  '0 0 30px rgba(59, 130, 246, 0.2)',
                  '0 0 60px rgba(59, 130, 246, 0.4)',
                  '0 0 30px rgba(59, 130, 246, 0.2)',
                ]
              }}
              transition={{ duration: 3, repeat: Infinity }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center z-20"
            >
              <span className="text-primary-foreground font-bold text-lg tracking-tight">Docito</span>
            </motion.div>

            {/* Connection Lines SVG */}
            <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 5 }}>
              <defs>
                <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.1" />
                  <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.1" />
                </linearGradient>
              </defs>
              {teamMembers.map((member, index) => {
                const pos = getPosition(member.angle);
                return (
                  <motion.line
                    key={`line-${member.id}`}
                    x1="50%"
                    y1="50%"
                    x2={`${pos.x}%`}
                    y2={`${pos.y}%`}
                    stroke="url(#lineGradient)"
                    strokeWidth="2"
                    initial={{ pathLength: 0, opacity: 0 }}
                    whileInView={{ pathLength: 1, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: 0.2 + index * 0.1 }}
                  />
                );
              })}
              
              {/* Animated data flow dots */}
              {teamMembers.map((member, index) => {
                const pos = getPosition(member.angle);
                return (
                  <motion.circle
                    key={`dot-${member.id}`}
                    r="3"
                    fill="hsl(var(--primary))"
                    initial={{ cx: "50%", cy: "50%" }}
                    animate={{ 
                      cx: [`50%`, `${pos.x}%`, `50%`],
                      cy: [`50%`, `${pos.y}%`, `50%`]
                    }}
                    transition={{ 
                      duration: 3,
                      repeat: Infinity,
                      delay: index * 0.4,
                      ease: "easeInOut"
                    }}
                  />
                );
              })}
            </svg>

            {/* Team Members - Evenly distributed around circle */}
            {teamMembers.map((member, index) => {
              const Icon = member.icon;
              const pos = getPosition(member.angle);
              return (
                <motion.div
                  key={member.id}
                  initial={{ scale: 0, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.3 + index * 0.08, type: 'spring', stiffness: 200 }}
                  style={{
                    position: 'absolute',
                    left: `${pos.x}%`,
                    top: `${pos.y}%`,
                    zIndex: 10,
                  }}
                  className="group -translate-x-1/2 -translate-y-1/2"
                >
                  <motion.div
                    whileHover={{ scale: 1.2 }}
                    animate={{ 
                      y: [0, -4, 0],
                    }}
                    transition={{ 
                      y: { duration: 2 + index * 0.2, repeat: Infinity, ease: "easeInOut" },
                      scale: { duration: 0.2 }
                    }}
                    className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br ${member.color} p-[2px] cursor-pointer shadow-lg`}
                  >
                    <div className="w-full h-full rounded-2xl bg-background flex items-center justify-center">
                      <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-foreground" />
                    </div>
                  </motion.div>
                  <motion.div 
                    initial={{ opacity: 0, y: 5 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: 0.5 + index * 0.1 }}
                    className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 rounded-md bg-card/90 border border-border/50 shadow-lg whitespace-nowrap text-[10px] sm:text-xs font-medium pointer-events-none z-30"
                  >
                    {member.role}
                  </motion.div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
