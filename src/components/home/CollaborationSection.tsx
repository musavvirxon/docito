import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { useTranslation } from "react-i18next";

const CollaborationSection = () => {
  const { t } = useTranslation('home');
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const teamMembers = [
    { id: 1, role: "Doctor", color: "bg-primary", position: { x: -120, y: -80 } },
    { id: 2, role: "Nurse", color: "bg-accent", position: { x: 120, y: -80 } },
    { id: 3, role: "Admin", color: "bg-secondary", position: { x: -120, y: 80 } },
    { id: 4, role: "Platform admins", color: "bg-green-500", position: { x: 120, y: 80 } },
  ];

  return (
    <section ref={ref} className="py-24 bg-background overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Text Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6 tracking-tight">
              {t('features.collaboration.title', 'Seamless Team Collaboration')}
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              {t('features.collaboration.description', 'Connect your entire medical team around a central patient file. Real-time updates keep everyone in sync.')}
            </p>
            <ul className="space-y-4">
              {[
                t('features.collaboration.feature1', 'Real-time file sharing'),
                t('features.collaboration.feature2', 'Instant notifications'),
                t('features.collaboration.feature3', 'Secure team messaging'),
                t('features.collaboration.feature4', 'Role-based access control'),
              ].map((feature, index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                    <svg className="w-3 h-3 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-foreground">{feature}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          {/* Collaboration Illustration */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative h-96 flex items-center justify-center"
          >
            {/* Connecting Lines SVG */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{ zIndex: 0 }}
            >
              {teamMembers.map((member, index) => (
                <motion.line
                  key={`line-${member.id}`}
                  x1="50%"
                  y1="50%"
                  x2={`calc(50% + ${member.position.x}px)`}
                  y2={`calc(50% + ${member.position.y}px)`}
                  stroke="hsl(var(--primary))"
                  strokeWidth="2"
                  strokeDasharray="5,5"
                  initial={{ opacity: 0 }}
                  animate={isInView ? { opacity: 0.4 } : {}}
                  transition={{ duration: 0.8, delay: 0.5 + index * 0.2 }}
                />
              ))}
            </svg>

            {/* Central Patient File */}
            <motion.div
              animate={isInView ? { 
                boxShadow: [
                  "0 0 0 0 rgba(59, 130, 246, 0)",
                  "0 0 30px 10px rgba(59, 130, 246, 0.3)",
                  "0 0 0 0 rgba(59, 130, 246, 0)"
                ]
              } : {}}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
              className="relative z-10 w-32 h-40 bg-card rounded-xl border-2 border-primary shadow-xl flex flex-col items-center justify-center"
            >
              <svg className="w-12 h-12 text-primary mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-xs font-medium text-foreground">Patient File</span>
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="absolute -top-2 -right-2 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center"
              >
                <span className="text-white text-xs">✓</span>
              </motion.div>
            </motion.div>

            {/* Team Members */}
            {teamMembers.map((member, index) => (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, scale: 0 }}
                animate={isInView ? { opacity: 1, scale: 1 } : {}}
                transition={{ duration: 0.4, delay: 0.5 + index * 0.2 }}
                className="absolute"
                style={{ 
                  left: `calc(50% + ${member.position.x}px)`,
                  top: `calc(50% + ${member.position.y}px)`,
                  transform: 'translate(-50%, -50%)'
                }}
              >
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ 
                    duration: 2.5 + index * 0.3, 
                    repeat: Infinity, 
                    ease: "easeInOut",
                    delay: index * 0.2
                  }}
                >
                  <div className={`w-16 h-16 rounded-full ${member.color} flex items-center justify-center shadow-lg border-4 border-background`}>
                    <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                    </svg>
                  </div>
                  <div className="text-center mt-1">
                    <span className="text-xs font-medium text-foreground">{member.role}</span>
                  </div>
                </motion.div>

                {/* Pulse effect */}
                <motion.div
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.5, 0, 0.5]
                  }}
                  transition={{
                    duration: 2,
                    delay: 1 + index * 0.5,
                    repeat: Infinity,
                  }}
                  className={`absolute top-0 left-0 w-16 h-16 rounded-full ${member.color} opacity-30`}
                  style={{ transform: 'translate(0, 0)' }}
                />
              </motion.div>
            ))}

            {/* Data flow particles */}
            {teamMembers.map((member, index) => (
              <motion.div
                key={`particle-${member.id}`}
                className="absolute w-2 h-2 rounded-full bg-primary z-20"
                style={{
                  left: '50%',
                  top: '50%',
                }}
                animate={{
                  x: [0, member.position.x * 0.8, 0],
                  y: [0, member.position.y * 0.8, 0],
                  opacity: [0, 1, 0],
                  scale: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 2.5,
                  delay: 1.5 + index * 0.7,
                  repeat: Infinity,
                  repeatDelay: 2,
                  ease: "easeInOut"
                }}
              />
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default CollaborationSection;
