import { motion } from "framer-motion";

const HeroIllustration = () => {
  return (
    <div className="relative w-full max-w-lg mx-auto">
      {/* Main Dashboard */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="relative bg-card rounded-2xl shadow-2xl border-2 border-border p-6 dark:shadow-glow-blue"
      >
        {/* Dashboard Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <div className="h-3 w-24 bg-foreground/20 rounded-full" />
              <div className="h-2 w-16 bg-muted-foreground/30 rounded-full mt-1" />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-primary" />
            </div>
          </div>
        </div>

        {/* Animated Chart */}
        <div className="mb-6">
          <div className="flex items-end justify-between h-32 gap-2">
            {[60, 80, 45, 90, 65, 75, 85].map((height, index) => (
              <motion.div
                key={index}
                initial={{ height: 0 }}
                animate={{ height: `${height}%` }}
                transition={{ duration: 0.8, delay: 0.5 + index * 0.1, ease: "easeOut" }}
                className="flex-1 bg-gradient-to-t from-primary to-primary/50 rounded-t-lg"
              />
            ))}
          </div>
          <div className="flex justify-between mt-2">
            {["M", "T", "W", "T", "F", "S", "S"].map((day, i) => (
              <span key={i} className="text-xs text-muted-foreground flex-1 text-center">{day}</span>
            ))}
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Patients", value: "1,247", color: "bg-primary" },
            { label: "Today", value: "24", color: "bg-accent" },
            { label: "Rating", value: "4.9★", color: "bg-green-500" },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 1.2 + index * 0.1 }}
              className="bg-muted/50 rounded-xl p-3 text-center"
            >
              <div className="text-lg font-bold text-foreground">{stat.value}</div>
              <div className="text-xs text-muted-foreground">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Floating Patient Avatars */}
      {[
        { x: -80, y: 20, delay: 0.8, size: 48 },
        { x: -60, y: 120, delay: 1.0, size: 40 },
        { x: 320, y: 40, delay: 0.9, size: 44 },
        { x: 340, y: 150, delay: 1.1, size: 36 },
        { x: 280, y: -20, delay: 1.2, size: 32 },
      ].map((avatar, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ 
            opacity: 1, 
            scale: 1,
            y: [0, -10, 0],
          }}
          transition={{
            opacity: { duration: 0.4, delay: avatar.delay },
            scale: { duration: 0.4, delay: avatar.delay },
            y: { duration: 3 + index * 0.5, repeat: Infinity, ease: "easeInOut" },
          }}
          className="absolute hidden lg:block"
          style={{ left: avatar.x, top: avatar.y }}
        >
          <div 
            className="rounded-full bg-gradient-to-br from-primary/30 to-accent/30 border-2 border-primary/40 flex items-center justify-center shadow-lg"
            style={{ width: avatar.size, height: avatar.size }}
          >
            <svg 
              className="text-primary" 
              style={{ width: avatar.size * 0.5, height: avatar.size * 0.5 }}
              fill="currentColor" 
              viewBox="0 0 24 24"
            >
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
          </div>
        </motion.div>
      ))}

      {/* Notification Pulse */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute -right-4 top-8 hidden lg:block"
      >
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-6 h-6 rounded-full bg-destructive flex items-center justify-center text-destructive-foreground text-xs font-bold shadow-lg"
        >
          3
        </motion.div>
      </motion.div>
    </div>
  );
};

export default HeroIllustration;
