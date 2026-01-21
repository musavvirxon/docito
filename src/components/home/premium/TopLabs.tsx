import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, FlaskConical, BadgeCheck, Timer, ShieldCheck, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

type LabRow = {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  accepts_insurance: boolean | null;
  average_turnaround_hours: number | null;
  type: string | null;
};

function formatLocation(city?: string | null, country?: string | null) {
  const c = (city || '').trim();
  const k = (country || '').trim();
  if (c && k) return `${c}, ${k}`;
  return c || k || '—';
}

function safeNum(n: unknown, fallback: number | null = null) {
  const x = Number(n);
  return Number.isFinite(x) ? x : fallback;
}

function EmptyCard() {
  return (
    <div className="h-full p-6 rounded-3xl bg-card border border-border/50 flex flex-col items-center justify-center text-center min-h-[240px]">
      <div className="text-base font-semibold text-foreground">This spot could be yours</div>
      <div className="text-sm text-muted-foreground mt-1">
        Verify your lab and deliver great turnaround times — you could be featured here.
      </div>
    </div>
  );
}

export default function TopLabs() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [labs, setLabs] = useState<LabRow[]>([]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const { data, error } = await (supabase as any)
          .from('lab_center_public_search_view')
          .select('id, name, city, country, accepts_insurance, average_turnaround_hours, type')
          .order('average_turnaround_hours', { ascending: true, nullsFirst: false })
          .limit(4);

        if (error) throw error;
        if (cancelled) return;

        const normalized: LabRow[] = (data || []).map((r: any) => ({
          id: String(r.id),
          name: String(r.name || ''),
          city: r.city ?? null,
          country: r.country ?? null,
          accepts_insurance: typeof r.accepts_insurance === 'boolean' ? r.accepts_insurance : null,
          average_turnaround_hours: safeNum(r.average_turnaround_hours, null),
          type: r.type ?? null,
        }));

        setLabs(normalized);
      } catch (e) {
        console.error(e);
        if (!cancelled) setLabs([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const cards = useMemo(() => {
    if (loading) {
      return Array.from({ length: 4 }).map((_, i) => ({ id: `skeleton-${i}`, _skeleton: true as const }));
    }
    return labs.map((p) => ({ ...p, _skeleton: false as const })) as any[];
  }, [loading, labs]);

  return (
    <section className="py-24 bg-gradient-to-b from-violet-500/5 to-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10"
        >
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 text-sm font-medium mb-4">
              <MapPin className="w-4 h-4" />
              Verified
            </div>
            <h2 className="text-4xl md:text-5xl font-extralight tracking-tight text-foreground mb-2">Top Labs</h2>
            <p className="text-muted-foreground font-light">Verified labs with fast turnaround</p>
          </div>

          <Button variant="outline" className="rounded-full gap-2 self-start md:self-auto" onClick={() => navigate('/lab')}>
            Browse Labs <ChevronRight className="w-4 h-4" />
          </Button>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {!loading && cards.length === 0 ? (
            <>
              <EmptyCard />
              <EmptyCard />
              <EmptyCard />
              <EmptyCard />
            </>
          ) : (
            cards.map((lab: any, index: number) => {
              const isSkeleton = lab._skeleton === true;
              const name = lab.name || '—';
              const loc = formatLocation(lab.city, lab.country);
              const type = lab.type || 'Laboratory';
              const insurance = !!lab.accepts_insurance;
              const tat = lab.average_turnaround_hours != null ? `${lab.average_turnaround_hours}h avg` : 'Turnaround —';

              return (
                <motion.div
                  key={lab.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  whileHover={{ y: -6 }}
                  className="group"
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (!isSkeleton) navigate('/lab');
                    }}
                    className="w-full text-left"
                    disabled={isSkeleton}
                  >
                    <div className="bg-card rounded-3xl border border-border/50 p-6 hover:border-violet-500/30 hover:shadow-2xl hover:shadow-violet-500/5 transition-all duration-300">
                      <div className="flex items-start justify-between mb-4">
                        <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-violet-500/10 text-violet-600 dark:text-violet-400">
                          <BadgeCheck className="w-3 h-3" />
                          Verified
                        </div>

                        <div className="w-10 h-10 rounded-2xl bg-violet-500/10 flex items-center justify-center">
                          <FlaskConical className="w-5 h-5 text-violet-500" />
                        </div>
                      </div>

                      <h3
                        className={`font-semibold text-foreground mb-1 ${
                          isSkeleton ? 'bg-muted animate-pulse rounded h-5 w-3/4' : ''
                        }`}
                      >
                        {isSkeleton ? '\u00A0' : name}
                      </h3>

                      <p
                        className={`text-sm text-primary mb-3 ${
                          isSkeleton ? 'bg-muted animate-pulse rounded h-4 w-1/2' : ''
                        }`}
                      >
                        {isSkeleton ? '\u00A0' : type}
                      </p>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                        <MapPin className="w-3 h-3" />
                        <span className={isSkeleton ? 'bg-muted animate-pulse rounded h-4 w-28 inline-block' : ''}>
                          {isSkeleton ? '\u00A0' : loc}
                        </span>
                      </div>

                      <div className="pt-4 border-t border-border/50 flex flex-wrap gap-2 text-xs">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-foreground">
                          <ShieldCheck className="w-3 h-3" />
                          {insurance ? 'Insurance' : 'No insurance'}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-foreground">
                          <Timer className="w-3 h-3" />
                          {tat}
                        </span>
                      </div>
                    </div>
                  </button>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}
