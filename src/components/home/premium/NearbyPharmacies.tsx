// src/components/home/premium/NearbyPharmacies.tsx
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Navigation, Star, ShieldCheck, Truck, BadgeCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

type PharmacyRow = {
  id: string;
  name: string;
  logo_url: string | null;
  city: string | null;
  country: string | null;
  delivery_available: boolean | null;
  accepts_insurance: boolean | null;
  rating: number | null;
  num_reviews: number | null;
};

function safeNum(n: unknown, fallback = 0) {
  const x = Number(n);
  return Number.isFinite(x) ? x : fallback;
}

function safeRating(n: unknown) {
  const x = Number(n);
  return Number.isFinite(x) ? x : null;
}

function formatLocation(city?: string | null, country?: string | null) {
  const c = (city || '').trim();
  const k = (country || '').trim();
  if (c && k) return `${c}, ${k}`;
  return c || k || '—';
}

function EmptyCard() {
  return (
    <div className="h-full p-5 rounded-2xl bg-card border border-border/50 flex flex-col items-center justify-center text-center min-h-[220px]">
      <div className="text-base font-semibold text-foreground">No verified pharmacies yet</div>
      <div className="text-sm text-muted-foreground mt-1">Verify pharmacies to show them here.</div>
    </div>
  );
}

export default function NearbyPharmacies() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [pharmacies, setPharmacies] = useState<PharmacyRow[]>([]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const { data, error } = await (supabase as any)
          .from('pharmacy_public_search_view')
          .select('id, name, logo_url, city, country, delivery_available, accepts_insurance, rating, num_reviews')
          .order('num_reviews', { ascending: false })
          .order('rating', { ascending: false })
          .limit(4);

        if (error) throw error;
        if (cancelled) return;

        const normalized: PharmacyRow[] = (data || []).map((p: any) => ({
          id: String(p.id),
          name: String(p.name || ''),
          logo_url: p.logo_url ?? null,
          city: p.city ?? null,
          country: p.country ?? null,
          delivery_available: typeof p.delivery_available === 'boolean' ? p.delivery_available : null,
          accepts_insurance: typeof p.accepts_insurance === 'boolean' ? p.accepts_insurance : null,
          rating: safeRating(p.rating),
          num_reviews: safeNum(p.num_reviews, 0),
        }));

        setPharmacies(normalized);
      } catch (e) {
        console.error(e);
        if (!cancelled) setPharmacies([]);
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
    return pharmacies.map((p) => ({ ...p, _skeleton: false as const })) as any[];
  }, [loading, pharmacies]);

  return (
    <section className="py-24 bg-gradient-to-b from-emerald-500/5 to-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10"
        >
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-sm font-medium mb-4">
              <MapPin className="w-4 h-4" />
              Verified
            </div>
            <h2 className="text-4xl md:text-5xl font-extralight tracking-tight text-foreground mb-2">Top Pharmacies</h2>
            <p className="text-muted-foreground font-light">Best by reviews (verified only)</p>
          </div>
          <Button
            variant="outline"
            className="rounded-full gap-2 self-start md:self-auto"
            onClick={() => navigate('/pharmacy')}
          >
            <Navigation className="w-4 h-4" />
            Browse Pharmacies
          </Button>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {!loading && cards.length === 0 ? (
            <>
              <EmptyCard />
              <EmptyCard />
              <EmptyCard />
              <EmptyCard />
            </>
          ) : (
            cards.map((pharmacy: any, index: number) => {
              const isSkeleton = pharmacy._skeleton === true;
              const name = pharmacy.name || '—';
              const rating = pharmacy.rating ?? 0;
              const reviews = pharmacy.num_reviews ?? 0;
              const loc = formatLocation(pharmacy.city, pharmacy.country);
              const delivery = !!pharmacy.delivery_available;
              const insurance = !!pharmacy.accepts_insurance;
              const logo = pharmacy.logo_url || '/placeholder.svg';

              return (
                <motion.div
                  key={pharmacy.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  whileHover={{ y: -5 }}
                  className="group"
                >
                  <div className="h-full p-5 rounded-2xl bg-card border border-border/50 hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300">
                    <div className="flex items-start justify-between mb-3">
                      <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        <BadgeCheck className="w-3 h-3" />
                        Verified
                      </div>

                      <div className="flex items-center gap-1 text-sm">
                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                        <span className="text-foreground">{isSkeleton ? '—' : rating.toFixed(1)}</span>
                        <span className="text-muted-foreground">({isSkeleton ? '—' : reviews})</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
                        {isSkeleton ? (
                          <div className="h-full w-full bg-muted animate-pulse" />
                        ) : (
                          <img src={logo} alt={name} className="h-full w-full object-cover" loading="lazy" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <h3 className={`font-semibold text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors truncate ${isSkeleton ? 'bg-muted animate-pulse rounded h-5 w-36' : ''}`}>
                          {isSkeleton ? '\u00A0' : name}
                        </h3>
                        <p className={`text-sm text-muted-foreground truncate ${isSkeleton ? 'bg-muted animate-pulse rounded h-4 w-28 mt-2' : ''}`}>
                          {isSkeleton ? '\u00A0' : loc}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-border/50 flex flex-wrap gap-2 text-xs">
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-foreground">
                        <ShieldCheck className="w-3 h-3" />
                        {insurance ? 'Insurance' : 'No insurance'}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-foreground">
                        <Truck className="w-3 h-3" />
                        {delivery ? 'Delivery' : 'Pickup'}
                      </span>
                    </div>

                    <div className="mt-4 flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1 rounded-full text-xs h-8 bg-emerald-500 hover:bg-emerald-600 text-white"
                        onClick={() => navigate('/pharmacy')}
                        disabled={isSkeleton}
                      >
                        <Navigation className="w-3 h-3 mr-1" />
                        View
                      </Button>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}
