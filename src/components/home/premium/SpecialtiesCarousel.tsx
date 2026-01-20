// File: src/components/home/premium/SpecialtiesCarousel.tsx
import { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Heart, Brain, Eye, Bone, Baby, Smile,
  Stethoscope, Activity, Pill, Syringe,
  Microscope, Wind, Ear, Hand, Scissors,
  Shield, Users, Sparkles
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

const specialties = [
  { icon: Heart, name: 'Cardiology', color: 'from-rose-500 to-pink-500' },
  { icon: Brain, name: 'Neurology', color: 'from-purple-500 to-violet-500' },
  { icon: Eye, name: 'Ophthalmology', color: 'from-cyan-500 to-blue-500' },
  { icon: Bone, name: 'Orthopedics', color: 'from-amber-500 to-orange-500' },
  { icon: Baby, name: 'Pediatrics', color: 'from-pink-500 to-rose-500' },
  { icon: Smile, name: 'Dentistry', color: 'from-emerald-500 to-green-500' },
  { icon: Stethoscope, name: 'General Medicine', color: 'from-blue-500 to-indigo-500' },
  { icon: Activity, name: 'Gastroenterology', color: 'from-yellow-500 to-amber-500' },
  { icon: Pill, name: 'Dermatology', color: 'from-teal-500 to-cyan-500' },
  { icon: Syringe, name: 'Endocrinology', color: 'from-indigo-500 to-purple-500' },
  { icon: Microscope, name: 'Pathology', color: 'from-slate-500 to-gray-500' },
  { icon: Wind, name: 'Pulmonology', color: 'from-sky-500 to-blue-500' },
  { icon: Ear, name: 'ENT', color: 'from-violet-500 to-purple-500' },
  { icon: Hand, name: 'Rheumatology', color: 'from-orange-500 to-red-500' },
  { icon: Scissors, name: 'Surgery', color: 'from-red-500 to-rose-500' },
  { icon: Shield, name: 'Urology', color: 'from-blue-600 to-indigo-600' },
  { icon: Users, name: 'Psychiatry', color: 'from-green-500 to-emerald-500' },
  { icon: Sparkles, name: 'Oncology', color: 'from-fuchsia-500 to-pink-500' },
];

export default function SpecialtiesCarousel() {
  const { t } = useTranslation(['home']);
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const isPausedRef = useRef(false);

  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;

    let animationId: number;
    let scrollPos = scrollContainer.scrollLeft;
    const speed = 0.15;

    const smoothAutoScroll = () => {
      if (scrollContainer && !isPausedRef.current) {
        scrollPos += speed;
        if (scrollPos >= scrollContainer.scrollWidth / 2) {
          scrollPos = 0;
        }
        scrollContainer.scrollLeft = scrollPos;
      }
      animationId = requestAnimationFrame(smoothAutoScroll);
    };

    const handleMouseEnter = () => {
      isPausedRef.current = true;
    };

    const handleMouseLeave = () => {
      scrollPos = scrollContainer.scrollLeft;
      isPausedRef.current = false;
    };

    const handleWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        scrollContainer.scrollLeft += e.deltaY;
        scrollPos = scrollContainer.scrollLeft;
      }
    };

    scrollContainer.addEventListener('mouseenter', handleMouseEnter);
    scrollContainer.addEventListener('mouseleave', handleMouseLeave);
    scrollContainer.addEventListener('wheel', handleWheel, { passive: false });
    animationId = requestAnimationFrame(smoothAutoScroll);

    return () => {
      cancelAnimationFrame(animationId);
      scrollContainer.removeEventListener('mouseenter', handleMouseEnter);
      scrollContainer.removeEventListener('mouseleave', handleMouseLeave);
      scrollContainer.removeEventListener('wheel', handleWheel);
    };
  }, []);

  const allSpecialties = [...specialties, ...specialties];

  return (
    <section className="py-24 bg-gradient-to-b from-background to-muted/30 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <h2 className="text-4xl md:text-5xl font-extralight tracking-tight text-foreground mb-4">
            Medical Specialties
          </h2>
          <p className="text-lg text-muted-foreground font-light max-w-2xl mx-auto">
            Find specialists across all medical disciplines
          </p>
        </motion.div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-6 overflow-x-auto scrollbar-hide px-8 pb-4 snap-x snap-mandatory"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {allSpecialties.map((specialty, index) => (
          <motion.div
            key={`${specialty.name}-${index}`}
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: (index % 18) * 0.02 }}
            whileHover={{ scale: 1.05, y: -5 }}
            className="flex-shrink-0 snap-center"
          >
            <button
              type="button"
              onClick={() => navigate('/specialties')}
              className="w-44 h-52 bg-card/80 backdrop-blur-sm rounded-3xl border border-border/50 p-6 flex flex-col items-center justify-center gap-4 cursor-pointer group transition-all duration-300 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 focus:outline-none focus:ring-2 focus:ring-primary/30"
              aria-label={`${specialty.name} - ${t('home:specialties.browse', 'Browse specialties')}`}
            >
              {/* Bigger container, keep icon size as before */}
              <div
                className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${specialty.color} p-6 flex items-center justify-center transition-transform duration-300 group-hover:scale-110`}
              >
                {/* Icon kept at original size (was previously smaller than the last change) */}
                <specialty.icon className="w-6 h-6 text-white" />
              </div>

              <span className="text-sm font-medium text-foreground text-center leading-tight">
                {specialty.name}
              </span>
            </button>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
