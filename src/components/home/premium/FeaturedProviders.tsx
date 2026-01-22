import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Star, MapPin, Clock, ChevronRight, Building2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

type DoctorRow = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  specialty: string | null;
  rating: number | null;
  num_reviews: number | null;
  accepts_new_patients: boolean | null;
  practice_city: string | null;
  practice_country: string | null;
};

type PracticeRow = {
  id: string;
  name: string;
  logo_url: string | null;
  practice_type: string | null;
  rating: number | null;
  num_reviews: number | null;
  city: string | null;
  country: string | null;
};

function formatLocation(city?: string | null, country?: string | null) {
  const c = (city || '').trim();
  const k = (country || '').trim();
  if (c && k) return `${c}, ${k}`;
  return c || k || '—';
}

function safeNum(n: unknown, fallback = 0) {
  const x = Number(n);
  return Number.isFinite(x) ? x : fallback;
}

function safeRating(n: unknown) {
  const x = Number(n);
  return Number.isFinite(x) ? x : null;
}

function EmptyCard({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="bg-card rounded-3xl border border-border/50 p-6 flex flex-col items-center justify-center text-center min-h-[260px]">
      <div className="text-base font-semibold text-foreground">{title}</div>
      <div className="text-sm text-muted-foreground mt-1">{subtitle}</div>
    </div>
  );
}

export default function FeaturedProviders() {
  const navigate = useNavigate();

  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [loadingPractices, setLoadingPractices] = useState(true);

  const [doctors, setDoctors] = useState<DoctorRow[]>([]);
  const [practices, setPractices] = useState<PracticeRow[]>([]);
  const [practiceDoctorCounts, setPracticeDoctorCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    let cancelled = false;

    const loadDoctors = async () => {
      setLoadingDoctors(true);
      try {
        const { data, error } = await supabase
          .from('doctors')
          .select(`
            id,
            specialty,
            average_rating,
            num_reviews,
            accepts_new_patients,
            appointment_count,
            practice_id,
            profiles:user_id (
              full_name,
              avatar_url
            ),
            practices:practice_id (
              city,
              country
            )
          `)
          .eq('verified', true)
          .order('num_reviews', { ascending: false })
          .order('average_rating', { ascending: false })
          .order('appointment_count', { ascending: false })
          .limit(4);

        if (error) throw error;
        if (cancelled) return;

        const normalized: DoctorRow[] = (data || []).map((d: any) => ({
          id: String(d.id),
          full_name: d.profiles?.full_name ?? null,
          avatar_url: d.profiles?.avatar_url ?? null,
          specialty: d.specialty ?? null,
          rating: safeRating(d.average_rating),
          num_reviews: safeNum(d.num_reviews, 0),
          accepts_new_patients: typeof d.accepts_new_patients === 'boolean' ? d.accepts_new_patients : null,
          practice_city: d.practices?.city ?? null,
          practice_country: d.practices?.country ?? null,
        }));

        setDoctors(normalized);
      } catch (e) {
        console.error(e);
        if (!cancelled) setDoctors([]);
      } finally {
        if (!cancelled) setLoadingDoctors(false);
      }
    };

    const loadPractices = async () => {
      setLoadingPractices(true);
      try {
        const { data, error } = await (supabase as any)
          .from('practices')
          .select('id, name, logo_url, practice_type, average_rating, num_reviews, city, country, appointment_count')
          .eq('is_verified', true)
          .order('num_reviews', { ascending: false })
          .order('average_rating', { ascending: false })
          .order('appointment_count', { ascending: false })
          .limit(3);

        if (error) throw error;
        if (cancelled) return;

        const normalized: PracticeRow[] = (data || []).map((p: any) => ({
          id: String(p.id),
          name: String(p.name || ''),
          logo_url: p.logo_url ?? null,
          practice_type: p.practice_type ?? null,
          rating: safeRating(p.average_rating),
          num_reviews: safeNum(p.num_reviews, 0),
          city: p.city ?? null,
          country: p.country ?? null,
        }));

        setPractices(normalized);

        const ids = normalized.map((p) => p.id).filter(Boolean);
        if (!ids.length) {
          setPracticeDoctorCounts({});
          return;
        }

        const { data: docRows } = await (supabase as any)
          .from('doctors')
          .select('practice_id')
          .in('practice_id', ids)
          .eq('verified', true)
          .limit(5000);

        if (cancelled) return;

        const counts: Record<string, number> = {};
        for (const id of ids) counts[id] = 0;

        (docRows || []).forEach((r: any) => {
          const pid = r?.practice_id ? String(r.practice_id) : '';
          if (pid && pid in counts) counts[pid] += 1;
        });

        setPracticeDoctorCounts(counts);
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setPractices([]);
          setPracticeDoctorCounts({});
        }
      } finally {
        if (!cancelled) setLoadingPractices(false);
      }
    };

    loadDoctors();
    loadPractices();

    return () => {
      cancelled = true;
    };
  }, []);

  const doctorsToRender = useMemo(() => {
    if (loadingDoctors) {
      return Array.from({ length: 4 }).map((_, i) => ({
        id: `skeleton-doctor-${i}`,
        full_name: null,
        avatar_url: null,
        specialty: null,
        rating: null,
        num_reviews: 0,
        accepts_new_patients: null,
        practice_city: null,
        practice_country: null,
        _skeleton: true as const,
      }));
    }
    return doctors.map((d) => ({ ...d, _skeleton: false as const }));
  }, [loadingDoctors, doctors]);

  const practicesToRender = useMemo(() => {
    if (loadingPractices) {
      return Array.from({ length: 3 }).map((_, i) => ({
        id: `skeleton-practice-${i}`,
        name: '',
        logo_url: null,
        practice_type: null,
        rating: null,
        num_reviews: 0,
        city: null,
        country: null,
        _skeleton: true as const,
      }));
    }
    return practices.map((p) => ({ ...p, _skeleton: false as const }));
  }, [loadingPractices, practices]);

  const doctorEmptyTitle = 'This spot could be yours';
  const doctorEmptySubtitle = 'Get verified, earn patient reviews, and you could be featured here next.';

  const clinicEmptyTitle = 'This spot could be yours';
  const clinicEmptySubtitle = 'Verify your clinic and grow your reputation — we feature the best by reviews.';

  return (
    <section className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Featured Specialists */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-20"
        >
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-4xl md:text-5xl font-extralight tracking-tight text-foreground mb-2">Top Specialists</h2>
              <p className="text-muted-foreground font-light">Best by reviews (verified only)</p>
            </div>
            <Button variant="ghost" className="hidden md:flex items-center gap-2 text-primary" onClick={() => navigate('/doctor')}>
              View All <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {!loadingDoctors && doctorsToRender.length === 0 ? (
              <>
                <EmptyCard title={doctorEmptyTitle} subtitle={doctorEmptySubtitle} />
                <EmptyCard title={doctorEmptyTitle} subtitle={doctorEmptySubtitle} />
                <EmptyCard title={doctorEmptyTitle} subtitle={doctorEmptySubtitle} />
                <EmptyCard title={doctorEmptyTitle} subtitle={doctorEmptySubtitle} />
              </>
            ) : (
              doctorsToRender.map((doctor, index) => {
                const isSkeleton = (doctor as any)._skeleton === true;
                const rating = doctor.rating ?? 0;
                const reviews = doctor.num_reviews ?? 0;
                const name = doctor.full_name || '—';
                const specialty = doctor.specialty || 'Specialist';
                const location = formatLocation(doctor.practice_city, doctor.practice_country);
                const availableLabel =
                  doctor.accepts_new_patients === null ? '—' : doctor.accepts_new_patients ? 'Accepting' : 'Not accepting';
                const image = doctor.avatar_url || '/placeholder.svg';

                return (
                  <motion.div
                    key={doctor.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    whileHover={{ y: -8 }}
                    className="group"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        if (!isSkeleton) navigate(`/doctor/${doctor.id}`);
                      }}
                      className="w-full text-left"
                      disabled={isSkeleton}
                    >
                      <div className="bg-card rounded-3xl border border-border/50 overflow-hidden transition-all duration-300 hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/5">
                        <div className="relative h-48 overflow-hidden">
                          {isSkeleton ? (
                            <div className="w-full h-full bg-muted animate-pulse" />
                          ) : (
                            <img
                              src={image}
                              alt={name}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                              loading="lazy"
                            />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                          <div className="absolute bottom-4 left-4 right-4">
                            <div className="flex items-center gap-1 text-white mb-1">
                              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                              <span className="font-medium">{isSkeleton ? '—' : rating.toFixed(1)}</span>
                              <span className="text-white/70 text-sm">({isSkeleton ? '—' : reviews})</span>
                            </div>
                          </div>
                        </div>

                        <div className="p-5">
                          <h3 className={`font-semibold text-foreground mb-1 ${isSkeleton ? 'bg-muted animate-pulse rounded h-5 w-3/4' : ''}`}>
                            {isSkeleton ? '\u00A0' : name}
                          </h3>
                          <p className={`text-sm text-primary mb-3 ${isSkeleton ? 'bg-muted animate-pulse rounded h-4 w-1/2' : ''}`}>
                            {isSkeleton ? '\u00A0' : specialty}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {isSkeleton ? '—' : location}
                            </span>
                            <span className={`flex items-center gap-1 ${doctor.accepts_new_patients ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                              <Clock className="w-3 h-3" />
                              {isSkeleton ? '—' : availableLabel}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  </motion.div>
                );
              })
            )}
          </div>
        </motion.div>

        {/* Featured Clinics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-4xl md:text-5xl font-extralight tracking-tight text-foreground mb-2">Leading Clinics</h2>
              <p className="text-muted-foreground font-light">Best by reviews (verified only)</p>
            </div>
            <Button variant="ghost" className="hidden md:flex items-center gap-2 text-primary" onClick={() => navigate('/practice')}>
              View All <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {!loadingPractices && practicesToRender.length === 0 ? (
              <>
                <EmptyCard title={clinicEmptyTitle} subtitle={clinicEmptySubtitle} />
                <EmptyCard title={clinicEmptyTitle} subtitle={clinicEmptySubtitle} />
                <EmptyCard title={clinicEmptyTitle} subtitle={clinicEmptySubtitle} />
              </>
            ) : (
              practicesToRender.map((clinic, index) => {
                const isSkeleton = (clinic as any)._skeleton === true;
                const rating = clinic.rating ?? 0;
                const reviews = clinic.num_reviews ?? 0;
                const location = formatLocation(clinic.city, clinic.country);
                const doctorsCount = practiceDoctorCounts[clinic.id] ?? 0;
                const image = clinic.logo_url || '/placeholder.svg';

                return (
                  <motion.div
                    key={clinic.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    whileHover={{ y: -8 }}
                    className="group"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        if (!isSkeleton) navigate('/practice');
                      }}
                      className="w-full text-left"
                      disabled={isSkeleton}
                    >
                      <div className="bg-card rounded-3xl border border-border/50 overflow-hidden transition-all duration-300 hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/5">
                        <div className="relative h-52 overflow-hidden">
                          {isSkeleton ? (
                            <div className="w-full h-full bg-muted animate-pulse" />
                          ) : (
                            <img
                              src={image}
                              alt={clinic.name}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                              loading="lazy"
                            />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                          <div className="absolute bottom-4 left-4 right-4">
                            <div className="flex items-center justify-between text-white">
                              <div className="flex items-center gap-1">
                                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                <span className="font-medium">{isSkeleton ? '—' : rating.toFixed(1)}</span>
                                <span className="text-white/70 text-sm">({isSkeleton ? '—' : reviews})</span>
                              </div>
                              <div className="flex items-center gap-1 text-sm">
                                <Users className="w-4 h-4" />
                                {isSkeleton ? '—' : `${doctorsCount} doctors`}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="p-5">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <Building2 className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <h3 className={`font-semibold text-foreground mb-1 ${isSkeleton ? 'bg-muted animate-pulse rounded h-5 w-3/4' : ''}`}>
                                {isSkeleton ? '\u00A0' : clinic.name}
                              </h3>
                              <p className={`text-sm text-primary mb-2 ${isSkeleton ? 'bg-muted animate-pulse rounded h-4 w-1/2' : ''}`}>
                                {isSkeleton ? '\u00A0' : clinic.practice_type || 'Clinic'}
                              </p>
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <MapPin className="w-3 h-3" />
                                {isSkeleton ? '—' : location}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </button>
                  </motion.div>
                );
              })
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
