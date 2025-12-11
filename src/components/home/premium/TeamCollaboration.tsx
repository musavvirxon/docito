import { motion } from 'framer-motion';
import { User, FileText, MessageCircle, Share2, Activity } from 'lucide-react';

const teamMembers = [
  { id: 1, role: 'Primary Doctor', color: 'from-blue-500 to-cyan-500', position: { x: 50, y: 15 } },
  { id: 2, role: 'Specialist', color: 'from-violet-500 to-purple-500', position: { x: 85, y: 35 } },
  { id: 3, role: 'Nurse', color: 'from-emerald-500 to-green-500', position: { x: 85, y: 65 } },
  { id: 4, role: 'Lab Tech', color: 'from-amber-500 to-orange-500', position: { x: 50, y: 85 } },
  { id: 5, role: 'Pharmacist', color: 'from-rose-500 to-pink-500', position: { x: 15, y: 65 } },
  { id: 6, role: 'Admin', color: 'from-slate-500 to-gray-500', position: { x: 15, y: 35 } },
];

const connections = [
  { from: 1, to: 2 }, { from: 1, to: 6 }, { from: 2, to: 3 },
  { from: 3, to: 4 }, { from: 4, to: 5 }, { from: 5, to: 6 },
  { from: 1, to: 4 }, { from: 2, to: 5 },
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
              Connect your entire care team around a unified patient record. Real-time updates, 
              secure messaging, and coordinated care — all in one place.
            </p>

            <div className="space-y-4">
              {[
                { icon: MessageCircle, text: 'Secure HIPAA-compliant messaging' },
                { icon: Share2, text: 'Instant record sharing between providers' },
                { icon: Activity, text: 'Real-time patient status updates' },
                { icon: FileText, text: 'Collaborative care planning' },
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
            className="relative aspect-square max-w-md mx-auto w-full"
          >
            {/* Central Patient File */}
            <motion.div
              animate={{ 
                boxShadow: [
                  '0 0 30px rgba(var(--primary), 0.2)',
                  '0 0 60px rgba(var(--primary), 0.3)',
                  '0 0 30px rgba(var(--primary), 0.2)',
                ]
              }}
              transition={{ duration: 3, repeat: Infinity }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-3xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center z-20"
            >
              <FileText className="w-10 h-10 text-primary-foreground" />
            </motion.div>

            {/* Connection Lines */}
            <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 5 }}>
              {connections.map((conn, index) => {
                const from = teamMembers.find(m => m.id === conn.from)!;
                const to = teamMembers.find(m => m.id === conn.to)!;
                return (
                  <motion.line
                    key={index}
                    x1={`${from.position.x}%`}
                    y1={`${from.position.y}%`}
                    x2={`${to.position.x}%`}
                    y2={`${to.position.y}%`}
                    stroke="hsl(var(--primary) / 0.2)"
                    strokeWidth="1"
                    initial={{ pathLength: 0 }}
                    whileInView={{ pathLength: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, delay: index * 0.1 }}
                  />
                );
              })}
              
              {/* Lines to center */}
              {teamMembers.map((member, index) => (
                <motion.line
                  key={`center-${member.id}`}
                  x1={`${member.position.x}%`}
                  y1={`${member.position.y}%`}
                  x2="50%"
                  y2="50%"
                  stroke="hsl(var(--primary) / 0.3)"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                  initial={{ pathLength: 0 }}
                  whileInView={{ pathLength: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: 0.5 + index * 0.1 }}
                />
              ))}
            </svg>

            {/* Team Members */}
            {teamMembers.map((member, index) => (
              <motion.div
                key={member.id}
                initial={{ scale: 0, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1, type: 'spring' }}
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
                  className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${member.color} p-[2px] cursor-pointer`}
                >
                  <div className="w-full h-full rounded-2xl bg-background flex items-center justify-center">
                    <User className="w-7 h-7 text-foreground" />
                  </div>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  whileHover={{ opacity: 1, y: 0 }}
                  className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1 rounded-lg bg-card border border-border/50 shadow-lg whitespace-nowrap text-xs font-medium"
                >
                  {member.role}
                </motion.div>
              </motion.div>
            ))}

            {/* Animated pulses */}
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0.5, opacity: 0.5 }}
                animate={{ scale: 2, opacity: 0 }}
                transition={{ duration: 3, repeat: Infinity, delay: i * 1 }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border-2 border-primary/30"
              />
            ))}

            {/* Data flow indicators */}
            {teamMembers.map((member, index) => (
              <motion.div
                key={`data-${member.id}`}
                initial={{ opacity: 0 }}
                animate={{
                  opacity: [0, 1, 0],
                  x: [0, (50 - member.position.x) * 0.8, 0],
                  y: [0, (50 - member.position.y) * 0.8, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: index * 0.5,
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
