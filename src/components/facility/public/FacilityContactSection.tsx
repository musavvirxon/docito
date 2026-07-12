// src/components/facility/public/FacilityContactSection.tsx
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { MapPin, Phone, Mail, Globe, Clock, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { FacilityPublicData } from '@/types/facility';

interface Props {
  facility: FacilityPublicData;
}

const DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

function fmtTime(t: string) {
  const [h, m] = t.split(':').map(Number);
  const ap = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ap}`;
}

function isOpenNow(hours: FacilityPublicData['operating_hours']): boolean {
  if (!hours) return false;
  const now = new Date();
  const dow = now.getDay();
  const dayKey = DAY_ORDER[dow === 0 ? 6 : dow - 1];
  const slot = hours[dayKey];
  if (!slot || slot.closed) return false;
  const [oh, om] = slot.open.split(':').map(Number);
  const [ch, cm] = slot.close.split(':').map(Number);
  const nowM = now.getHours() * 60 + now.getMinutes();
  return nowM >= oh * 60 + om && nowM < ch * 60 + cm;
}

function todayKey() {
  const dow = new Date().getDay();
  return DAY_ORDER[dow === 0 ? 6 : dow - 1];
}

export default function FacilityContactSection({ facility }: Props) {
  const { t, i18n } = useTranslation('practicePage');
  const isRTL = i18n.language === 'ar';

  const hasHours = facility.operating_hours && Object.keys(facility.operating_hours).length > 0;
  const openNow = isOpenNow(facility.operating_hours);
  const today = todayKey();

  const mapsUrl = facility.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        [facility.address, facility.city, facility.country].filter(Boolean).join(', '),
      )}`
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className={cn('grid grid-cols-1 lg:grid-cols-2 gap-5', isRTL && 'rtl')}
    >
      {/* Contact details */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            {t('practicePage.contact.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {facility.address && (
            <div className="flex items-start gap-3">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm">{facility.address}</p>
                {(facility.city || facility.country) && (
                  <p className="text-xs text-muted-foreground">
                    {[facility.city, facility.state, facility.country].filter(Boolean).join(', ')}
                  </p>
                )}
              </div>
            </div>
          )}

          {facility.phone && (
            <a
              href={`tel:${facility.phone}`}
              className="flex items-center gap-3 group text-sm hover:text-primary transition-colors"
            >
              <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              {facility.phone}
            </a>
          )}

          {facility.email && (
            <a
              href={`mailto:${facility.email}`}
              className="flex items-center gap-3 group text-sm hover:text-primary transition-colors"
            >
              <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              {facility.email}
            </a>
          )}

          {facility.website && (
            <a
              href={facility.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 text-sm hover:text-primary transition-colors"
            >
              <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="flex items-center gap-1">
                {t('practicePage.website')}
                <ExternalLink className="h-3 w-3" />
              </span>
            </a>
          )}

          {mapsUrl && (
            <Button variant="outline" size="sm" asChild className="w-full gap-2 mt-1">
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
                <MapPin className="h-3.5 w-3.5" />
                {t('practicePage.contact.getDirections')}
                <ExternalLink className="h-3 w-3" />
              </a>
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Opening hours */}
      {hasHours && (
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                {t('practicePage.hours.title')}
              </span>
              <span
                className={cn(
                  'text-xs font-medium px-2.5 py-0.5 rounded-full',
                  openNow
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                    : 'bg-red-500/15 text-red-700 dark:text-red-300',
                )}
              >
                {openNow ? t('practicePage.hero.openNow') : t('practicePage.hero.closedNow')}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5">
              {DAY_ORDER.map((day) => {
                const slot = facility.operating_hours![day];
                const isToday = day === today;
                return (
                  <li
                    key={day}
                    className={cn(
                      'flex items-center justify-between text-sm py-1.5 px-2.5 rounded-lg',
                      isToday && 'bg-primary/5 font-semibold',
                    )}
                  >
                    <span className="capitalize text-foreground">{t(`practicePage.hours.days.${day}`)}</span>
                    <span
                      className={cn(
                        'text-xs tabular-nums',
                        !slot || slot.closed ? 'text-muted-foreground' : 'text-foreground',
                      )}
                    >
                      {!slot || slot.closed ? t('practicePage.hours.closed') : `${fmtTime(slot.open)} – ${fmtTime(slot.close)}`}
                    </span>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}
