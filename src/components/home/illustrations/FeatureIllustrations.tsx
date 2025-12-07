import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";

// Calendar Animation - Dates flipping
export const CalendarIllustration = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  return (
    <div ref={ref} className="relative w-24 h-24 mx-auto">
      <motion.div
        initial={{ rotateX: 0 }}
        animate={isInView ? { rotateX: [0, -90, 0] } : {}}
        transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 3 }}
        className="w-full h-full bg-card rounded-xl border-2 border-border shadow-lg overflow-hidden"
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* Calendar Header */}
        <div className="bg-primary h-6 flex items-center justify-center">
          <span className="text-primary-foreground text-xs font-bold">DEC</span>
        </div>
        {/* Calendar Body */}
        <div className="p-2">
          <motion.div
            animate={isInView ? { opacity: [1, 0, 1] } : {}}
            transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 3 }}
            className="text-3xl font-bold text-foreground text-center"
          >
            07
          </motion.div>
          {/* Mini calendar grid */}
          <div className="grid grid-cols-7 gap-0.5 mt-1">
            {Array.from({ length: 7 }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                animate={isInView ? { opacity: 1 } : {}}
                transition={{ delay: 0.5 + i * 0.1 }}
                className={`w-2 h-2 rounded-full ${i === 3 ? 'bg-primary' : 'bg-muted'}`}
              />
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// Prescription Animation - Being filled
export const PrescriptionIllustration = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  return (
    <div ref={ref} className="relative w-24 h-24 mx-auto">
      <div className="w-full h-full bg-card rounded-xl border-2 border-border shadow-lg p-3 relative overflow-hidden">
        {/* Prescription lines being drawn */}
        {[0, 1, 2, 3].map((line, i) => (
          <motion.div
            key={line}
            initial={{ width: 0 }}
            animate={isInView ? { width: "100%" } : {}}
            transition={{ duration: 0.5, delay: i * 0.2 }}
            className={`h-1.5 ${i === 0 ? 'bg-primary' : 'bg-muted'} rounded-full mb-2`}
            style={{ originX: 0 }}
          />
        ))}
        {/* Animated pen */}
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={isInView ? { x: [0, 60, 60], opacity: [1, 1, 0] } : {}}
          transition={{ duration: 1.5, delay: 0.2 }}
          className="absolute bottom-2 right-2"
        >
          <svg className="w-4 h-4 text-primary rotate-45" fill="currentColor" viewBox="0 0 24 24">
            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
          </svg>
        </motion.div>
        {/* Rx Symbol */}
        <div className="absolute top-2 right-2 text-primary/30 text-2xl font-serif font-bold">
          ℞
        </div>
      </div>
    </div>
  );
};

// Files Animation - Sliding into cabinet
export const FilesIllustration = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  return (
    <div ref={ref} className="relative w-24 h-24 mx-auto">
      {/* Cabinet */}
      <div className="w-full h-full bg-card rounded-xl border-2 border-border shadow-lg overflow-hidden">
        {/* Folder slots */}
        <div className="h-full flex flex-col justify-center p-2 gap-1">
          {[0, 1, 2].map((folder, i) => (
            <motion.div
              key={folder}
              initial={{ x: 40, opacity: 0 }}
              animate={isInView ? { x: 0, opacity: 1 } : {}}
              transition={{ 
                duration: 0.5, 
                delay: i * 0.3,
                type: "spring",
                stiffness: 100
              }}
              className="relative"
            >
              <div 
                className={`h-5 rounded-sm ${
                  i === 0 ? 'bg-primary' : i === 1 ? 'bg-accent' : 'bg-secondary'
                }`}
              >
                {/* Folder tab */}
                <div 
                  className={`absolute -top-1 left-2 w-4 h-2 rounded-t-sm ${
                    i === 0 ? 'bg-primary' : i === 1 ? 'bg-accent' : 'bg-secondary'
                  }`}
                />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Notes Animation - Being written
export const NotesIllustration = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  return (
    <div ref={ref} className="relative w-24 h-24 mx-auto">
      <div className="w-full h-full bg-card rounded-xl border-2 border-border shadow-lg p-3 relative">
        {/* Note lines appearing */}
        <div className="space-y-2">
          {[0, 1, 2, 3].map((line, i) => (
            <motion.div
              key={line}
              initial={{ scaleX: 0 }}
              animate={isInView ? { scaleX: 1 } : {}}
              transition={{ duration: 0.4, delay: i * 0.15 }}
              className={`h-1 rounded-full origin-left ${
                i === 0 ? 'bg-primary w-full' : 
                i === 1 ? 'bg-muted w-4/5' :
                i === 2 ? 'bg-muted w-full' :
                'bg-muted w-3/5'
              }`}
            />
          ))}
        </div>
        {/* Animated cursor/pen */}
        <motion.div
          animate={isInView ? { 
            x: [0, 50, 50, 0, 40, 40, 0, 30],
            y: [0, 0, 8, 8, 8, 16, 16, 16]
          } : {}}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
          className="absolute top-3 left-3 w-0.5 h-3 bg-primary"
        />
        {/* Checkbox */}
        <motion.div
          initial={{ scale: 0 }}
          animate={isInView ? { scale: 1 } : {}}
          transition={{ delay: 1, type: "spring" }}
          className="absolute bottom-2 right-2 w-5 h-5 border-2 border-primary rounded flex items-center justify-center"
        >
          <motion.svg
            initial={{ pathLength: 0 }}
            animate={isInView ? { pathLength: 1 } : {}}
            transition={{ delay: 1.2, duration: 0.3 }}
            className="w-3 h-3 text-primary"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={3}
          >
            <motion.path
              d="M5 12l5 5L20 7"
              initial={{ pathLength: 0 }}
              animate={isInView ? { pathLength: 1 } : {}}
              transition={{ delay: 1.2, duration: 0.3 }}
            />
          </motion.svg>
        </motion.div>
      </div>
    </div>
  );
};
