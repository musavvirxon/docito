// src/components/practice/public/PracticeDoctorsSection.tsx
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Star, BadgeCheck, Calendar, UserCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { AffiliatedDoctor } from '@/hooks/usePracticePublicProfile';

interface Props {
  doctors: AffiliatedDoctor[];
  onBookWithDoctor: (doctorId: string) => void;
}

function doctorSlug(doc: AffiliatedDoctor) {
  return doc.custom_profile_link || doc.username || doc.id;
}

export default function PracticeDoctorsSection({ doctors, onBookWithDoctor }: Props) {
  const { t, i18n } = useTranslation('practicePage');
  const navigate = useNavigate();
  const isRTL = i18n.language === 'ar';

  if (doctors.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className={cn(isRTL && 'rtl')}
    >
      {/* Section header */}
      <div className="mb-5">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <UserCircle2 className="h-5 w-5 text-primary" />
          {t('practicePage.doctors.title')}
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          {t('practicePage.doctors.subtitle')}
        </p>
      </div>

      {/* Doctor grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {doctors.map((doc, idx) => {
          const initials = (doc.full_name ?? '?')
            .split(' ')
            .map((n) => n[0])
            .join('')
            .slice(0, 2)
            .toUpperCase();
          const rating  = doc.average_rating ?? 0;
          const reviews = doc.num_reviews ?? 0;

          return (
            <motion.div
              key={doc.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.05, duration: 0.35 }}
              whileHover={{ y: -4, transition: { duration: 0.15 } }}
            >
              <Card className="border-border/60 h-full hover:shadow-md hover:border-primary/20 transition-all duration-200">
                <CardContent className="p-5 flex flex-col h-full gap-3">

                  {/* Avatar + name */}
                  <div className="flex items-center gap-3">
                    <div className="relative flex-shrink-0">
                      <Avatar className="w-12 h-12 ring-2 ring-primary/10">
                        <AvatarImage
                          src={doc.avatar_url ?? undefined}
                          alt={doc.full_name ?? ''}
                        />
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      {doc.verified && (
                        <BadgeCheck className="absolute -bottom-1 -right-1 w-4 h-4 text-blue-500 bg-background rounded-full" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-foreground leading-tight truncate">
                        {doc.full_name}
                      </p>
                      {doc.specialty && (
                        <p className="text-xs text-primary/80 truncate mt-0.5">
                          {doc.specialty}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Rating */}
                  {reviews > 0 && (
                    <div className="flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 flex-shrink-0" />
                      <span className="text-xs font-semibold tabular-nums">
                        {rating.toFixed(1)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({reviews})
                      </span>
                    </div>
                  )}

                  {/* Badges */}
                  <div className="flex flex-wrap gap-1">
                    {doc.years_experience != null && (
                      <Badge variant="outline" className="text-[10px]">
                        {t('practicePage.doctors.experience', {
                          years: doc.years_experience,
                        })}
                      </Badge>
                    )}
                    {doc.accepts_new_patients && (
                      <Badge className="text-[10px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200">
                        {t('practicePage.doctors.acceptingPatients')}
                      </Badge>
                    )}
                    {doc.consultation_fee != null && (
                      <Badge variant="secondary" className="text-[10px]">
                        ${doc.consultation_fee}
                      </Badge>
                    )}
                  </div>

                  {/* Actions — pinned to bottom */}
                  <div className="mt-auto flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-xs gap-1.5 h-8"
                      onClick={() => navigate(`/doctor/${doctorSlug(doc)}`)}
                    >
                      <UserCircle2 className="h-3.5 w-3.5" />
                      {t('practicePage.doctors.viewProfile')}
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 text-xs gap-1.5 h-8"
                      onClick={() => onBookWithDoctor(doc.id)}
                    >
                      <Calendar className="h-3.5 w-3.5" />
                      {t('practicePage.doctors.book')}
                    </Button>
                  </div>

                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </motion.section>
  );
}
