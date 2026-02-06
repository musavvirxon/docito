// src/components/home/premium/SpecialtiesCarousel.tsx
import { useRef, useEffect } from 'react';
 import { useReducedMotion } from 'framer-motion';
import {
  Heart,
  Brain,
  Eye,
  Bone,
  Baby,
  Smile,
  Stethoscope,
  Activity,
  Pill,
  Syringe,
  Microscope,
  Wind,
  Ear,
  Hand,
  Scissors,
  Shield,
  Users,
  Sparkles,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import FadeIn from '@/components/howItWorks/FadeIn';

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
   const prefersReducedMotion = useReducedMotion();

  const scrollRef = useRef<HTMLDivElement>(null);
  const isPausedRef = useRef(false);
  const cachedScrollWidthRef = useRef(0);
  const scrollPosRef = useRef(0);

  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;
     
    // Skip auto-scroll animation if user prefers reduced motion
    if (prefersReducedMotion) return;

    let animationId: number;
    let initRafId: number;
    let isInitialized = false;
    const speed = 0.15;

    // Cache scrollWidth using requestIdleCallback to avoid forced reflow
    const cacheScrollWidth = () => {
      if ('requestIdleCallback' in window) {
        (window as Window).requestIdleCallback(() => {
          if (scrollContainer) {
            cachedScrollWidthRef.current = scrollContainer.scrollWidth;
          }
        }, { timeout: 100 });
      } else {
        // Fallback: use double-rAF to batch layout reads
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (scrollContainer) {
              cachedScrollWidthRef.current = scrollContainer.scrollWidth;
            }
          });
        });
      }
    };
     
    // Defer initial layout read using requestIdleCallback to completely avoid forced reflow
    if ('requestIdleCallback' in window) {
      (window as Window).requestIdleCallback(() => {
        if (scrollContainer) {
          cachedScrollWidthRef.current = scrollContainer.scrollWidth;
          scrollPosRef.current = scrollContainer.scrollLeft;
          isInitialized = true;
        }
      }, { timeout: 200 });
    } else {
      // Fallback: defer to next frame
      initRafId = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (scrollContainer) {
            cachedScrollWidthRef.current = scrollContainer.scrollWidth;
            scrollPosRef.current = scrollContainer.scrollLeft;
            isInitialized = true;
          }
        });
      });
    }

    const smoothAutoScroll = () => {
      if (scrollContainer && !isPausedRef.current && isInitialized) {
        scrollPosRef.current += speed;
        const halfWidth = cachedScrollWidthRef.current / 2;
        if (scrollPosRef.current >= halfWidth) scrollPosRef.current = 0;
        // Write-only operation - no reads that cause reflow
        scrollContainer.scrollLeft = scrollPosRef.current;
      }
      animationId = requestAnimationFrame(smoothAutoScroll);
    };

    const handleMouseEnter = () => {
      isPausedRef.current = true;
    };

    // Batch the scroll position read to avoid forced reflow
    const handleMouseLeave = () => {
      requestAnimationFrame(() => {
        if (scrollContainer) {
          scrollPosRef.current = scrollContainer.scrollLeft;
        }
        isPausedRef.current = false;
      });
    };

    // Batch wheel scroll updates to prevent forced reflow
    const handleWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        // Write first, then batch the read
        scrollContainer.scrollLeft += e.deltaY;
        requestAnimationFrame(() => {
          scrollPosRef.current = scrollContainer.scrollLeft;
        });
      }
    };

    // Use ResizeObserver to update cached width on resize (batched)
    const resizeObserver = new ResizeObserver(() => {
      cacheScrollWidth();
    });
    resizeObserver.observe(scrollContainer);

    scrollContainer.addEventListener('mouseenter', handleMouseEnter);
    scrollContainer.addEventListener('mouseleave', handleMouseLeave);
    scrollContainer.addEventListener('wheel', handleWheel, { passive: false });
    
    // Start animation after a short delay to let initial layout settle
    setTimeout(() => {
      isInitialized = true;
      animationId = requestAnimationFrame(smoothAutoScroll);
    }, 100);

    return () => {
      cancelAnimationFrame(animationId);
      cancelAnimationFrame(initRafId);
      resizeObserver.disconnect();
      scrollContainer.removeEventListener('mouseenter', handleMouseEnter);
      scrollContainer.removeEventListener('mouseleave', handleMouseLeave);
      scrollContainer.removeEventListener('wheel', handleWheel);
    };
  }, [prefersReducedMotion]);

  const allSpecialties = [...specialties, ...specialties];

  return (
    <section className="py-24 bg-gradient-to-b from-background to-muted/30 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
        <FadeIn className="text-center">
          <h2 className="text-4xl md:text-5xl font-extralight tracking-tight text-foreground mb-4">Medical Specialties</h2>
          <p className="text-lg text-muted-foreground font-light max-w-2xl mx-auto">
            {t('home:specialtiesSubtitle', 'Find specialists across all medical disciplines')}
          </p>
        </FadeIn>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-6 overflow-x-auto scrollbar-hide px-8 pb-4 snap-x snap-mandatory"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {allSpecialties.map((specialty, index) => (
          <div
            key={`${specialty.name}-${index}`}
            className="flex-shrink-0 snap-center transition-transform duration-300 hover:scale-105 hover:-translate-y-1"
          >
            <button
              type="button"
              onClick={() => navigate('/specialties')}
              className="text-left"
              aria-label={`Browse ${specialty.name} specialists`}
            >
              <div className="w-44 h-52 bg-card/80 backdrop-blur-sm rounded-3xl border border-border/50 p-6 flex flex-col items-center justify-center gap-4 cursor-pointer group transition-all duration-300 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5">
                <div
                  className={`w-18 h-18 rounded-2xl bg-gradient-to-br ${specialty.color} p-4 flex items-center justify-center transition-transform duration-300 group-hover:scale-110`}
                >
                  <specialty.icon className="w-9 h-9 text-white" />
                </div>
                <span className="text-sm font-medium text-foreground text-center leading-tight">{specialty.name}</span>
              </div>
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
