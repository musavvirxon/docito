import { motion } from 'framer-motion';
import { 
  User, FileText, MessageCircle, Share2, Activity,
  Building2, TestTube, Scan, Pill, Shield, Stethoscope
} from 'lucide-react';

const teamMembers = [
  { id: 1, role: 'Platform Admin', icon: Shield, color: 'from-slate-500 to-gray-600', position: { x: 50, y: 8 } },
  { id: 2, role: 'Clinic Admin', icon: Building2, color: 'from-blue-500 to-cyan-500', position: { x: 85, y: 25 } },
  { id: 3, role: 'Doctor', icon: Stethoscope, color: 'from-violet-500 to-purple-500', position: { x: 95, y: 50 } },
  { id: 4, role: 'Lab Center', icon: TestTube, color: 'from-emerald-500 to-green-500', position: { x: 85, y: 75 } },
  { id: 5, role: 'Imaging Center', icon: Scan, color: 'from-amber-500 to-orange-500', position: { x: 50, y: 92 } },
  { id: 6, role: 'Pharmacy', icon: Pill, color: 'from-rose-500 to-pink-500', position: { x: 15, y: 75 } },
  { id: 7, role: 'Patient', icon: User, color: 'from-cyan-500 to-blue-500', position: { x: 5, y: 50 } },
  { id: 8, role: 'Insurance', icon: Shield, color: 'from-indigo-500 to-violet-500', position: { x: 15, y: 25 } },
];

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

          {/* Interactive Visualization */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative aspect-square max-w-lg mx-auto w-full"
          >
            {/* Central Patient File */}
            <motion.div
              animate={{ 
                boxShadow: [
                  '0 0 30px rgba(59, 130, 246, 0.2)',
                  '0 0 50px rgba(59, 130, 246, 0.3)',
                  '0 0 30px rgba(59, 130, 246, 0.2)',
                ]
              }}
              transition={{ duration: 3, repeat: Infinity }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center z-20"
            >
              <FileText className="w-9 h-9 text-primary-foreground" />
            </motion.div>

            {/* Connection Lines to Center */}
            <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 5 }}>
              {teamMembers.map((member, index) => (
                <motion.line
                  key={`center-${member.id}`}
                  x1={`${member.position.x}%`}
                  y1={`${member.position.y}%`}
                  x2="50%"
                  y2="50%"
                  stroke="hsl(var(--primary) / 0.25)"
                  strokeWidth="2"
                  initial={{ pathLength: 0 }}
                  whileInView={{ pathLength: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: 0.3 + index * 0.1 }}
                />
              ))}
            </svg>

            {/* Team Members */}
            {teamMembers.map((member, index) => {
              const Icon = member.icon;
              return (
                <motion.div
                  key={member.id}
                  initial={{ scale: 0, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.08, type: 'spring' }}
                  style={{
                    position: 'absolute',
                    left: `${member.position.x}%`,
                    top: `${member.position.y}%`,
                    transform: 'translate(-50%, -50%)',
                    zIndex: 10,
                  }}
                  className="group"
                >
                  <motion.div
                    whileHover={{ scale: 1.15 }}
                    className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${member.color} p-[2px] cursor-pointer shadow-lg`}
                  >
                    <div className="w-full h-full rounded-2xl bg-background flex items-center justify-center">
                      <Icon className="w-6 h-6 text-foreground" />
                    </div>
                  </motion.div>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2 py-0.5 rounded-md bg-card border border-border/50 shadow-lg whitespace-nowrap text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    {member.role}
                  </div>
                </motion.div>
              );
            })}

            {/* Animated pulses */}
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0.5, opacity: 0.4 }}
                animate={{ scale: 1.8, opacity: 0 }}
                transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.8 }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full border-2 border-primary/30"
              />
            ))}

            {/* Data flow indicators */}
            {teamMembers.slice(0, 4).map((member, index) => (
              <motion.div
                key={`data-${member.id}`}
                initial={{ opacity: 0 }}
                animate={{
                  opacity: [0, 1, 0],
                  x: [0, (50 - member.position.x) * 0.7, 0],
                  y: [0, (50 - member.position.y) * 0.7, 0],
                }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  delay: index * 0.6,
                }}
                style={{
                  position: 'absolute',
                  left: `${member.position.x}%`,
                  top: `${member.position.y}%`,
                }}
                className="w-2 h-2 rounded-full bg-primary"
              />
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
