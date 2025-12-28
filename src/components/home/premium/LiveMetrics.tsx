import { useRef, useEffect, useState } from 'react';
import { motion, useInView, useMotionValue, useSpring, animate } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Users, Calendar, Star, Activity, TrendingUp, Clock } from 'lucide-react';
const metrics = [{
  id: 'patients',
  value: 1247,
  suffix: '',
  icon: Users,
  color: 'text-blue-500'
}, {
  id: 'today',
  value: 24,
  suffix: '',
  icon: Calendar,
  color: 'text-emerald-500'
}, {
  id: 'rating',
  value: 4.9,
  suffix: '★',
  icon: Star,
  color: 'text-amber-500',
  decimals: 1
}, {
  id: 'uptime',
  value: 99.9,
  suffix: '%',
  icon: Activity,
  color: 'text-purple-500',
  decimals: 1
}];
function AnimatedCounter({
  value,
  suffix = '',
  decimals = 0
}: {
  value: number;
  suffix?: string;
  decimals?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, {
    once: true
  });
  const [displayValue, setDisplayValue] = useState(0);
  useEffect(() => {
    if (isInView) {
      const controls = animate(0, value, {
        duration: 2,
        ease: [0.25, 0.1, 0.25, 1],
        onUpdate: latest => {
          setDisplayValue(latest);
        }
      });
      return () => controls.stop();
    }
  }, [isInView, value]);
  return <span ref={ref}>
      {decimals > 0 ? displayValue.toFixed(decimals) : Math.round(displayValue).toLocaleString()}
      {suffix}
    </span>;
}
function MiniChart() {
  const bars = [40, 65, 45, 80, 55, 90, 70];
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, {
    once: true
  });
  return <div ref={ref} className="flex items-end gap-1 h-12">
      {bars.map((height, i) => <motion.div key={i} initial={{
      height: 0
    }} animate={isInView ? {
      height: `${height}%`
    } : {}} transition={{
      duration: 0.5,
      delay: i * 0.1,
      ease: 'easeOut'
    }} className="w-2 bg-gradient-to-t from-primary/50 to-primary rounded-full" />)}
    </div>;
}
function MetricCard({
  metric,
  index
}: {
  metric: typeof metrics[0];
  index: number;
}) {
  const {
    t
  } = useTranslation(['home']);
  const Icon = metric.icon;
  const cardRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(cardRef, {
    once: true
  });
  return <motion.div ref={cardRef} initial={{
    opacity: 0,
    y: 30
  }} animate={isInView ? {
    opacity: 1,
    y: 0
  } : {}} transition={{
    duration: 0.6,
    delay: index * 0.1
  }} className="relative group">
      <div className="p-6 bg-background/50 backdrop-blur-xl border border-border/50 rounded-2xl hover:border-primary/30 transition-all duration-300">
        <div className="flex items-start justify-between mb-4">
          <div className={`w-10 h-10 rounded-xl bg-muted flex items-center justify-center ${metric.color}`}>
            <Icon className="w-5 h-5" />
          </div>
          {metric.id === 'rating' && <motion.div animate={{
          scale: [1, 1.2, 1]
        }} transition={{
          duration: 2,
          repeat: Infinity
        }} className="text-amber-500">
              <Star className="w-5 h-5 fill-current" />
            </motion.div>}
        </div>

        <div className="text-3xl font-semibold text-foreground mb-1">
          <AnimatedCounter value={metric.value} suffix={metric.suffix} decimals={metric.decimals} />
        </div>

        <div className="text-sm text-muted-foreground">
          {t(`home:metrics.${metric.id}`, metric.id)}
        </div>

        {/* Pulse animation for "today" metric */}
        {metric.id === 'today' && <motion.div animate={{
        opacity: [0.5, 1, 0.5]
      }} transition={{
        duration: 2,
        repeat: Infinity
      }} className="absolute top-4 right-4 w-2 h-2 bg-emerald-500 rounded-full" />}
      </div>
    </motion.div>;
}
export default function LiveMetrics() {
  const { t } = useTranslation(['home']);
  
  return (
    <section className="py-20 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            {t('home:metrics.title', 'Platform Statistics')}
          </h2>
          <p className="text-muted-foreground">
            {t('home:metrics.subtitle', 'Real-time metrics from our healthcare network')}
          </p>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {metrics.map((metric, index) => (
            <MetricCard key={metric.id} metric={metric} index={index} />
          ))}
        </div>
        
        <div className="mt-12 flex justify-center">
          <div className="flex items-center gap-4 px-6 py-4 bg-background rounded-2xl border border-border/50">
            <TrendingUp className="w-5 h-5 text-primary" />
            <span className="text-sm text-muted-foreground">
              {t('home:metrics.growth', 'Weekly growth trend')}
            </span>
            <MiniChart />
          </div>
        </div>
      </div>
    </section>
  );
}