// src/components/practice/public/PracticeAboutSection.tsx
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { FileText, Stethoscope, Layers } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { PracticePublicData } from '@/hooks/usePracticePublicProfile';

interface Props { practice: PracticePublicData }

export default function PracticeAboutSection({ practice }: Props) {
  const { t, i18n } = useTranslation('practicePage');
  const isRTL = i18n.language === 'ar';

  const lang = i18n.language as 'en' | 'ru' | 'uz' | 'ar';
  const localDescription =
    (practice as any)[`description_${lang}`] || practice.description;

  const hasSpecialties = (practice.specialties?.length ?? 0) > 0;
  const hasServices    = (practice.services_offered?.length ?? 0) > 0;

  if (!localDescription && !hasSpecialties && !hasServices) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className={cn(
        'grid grid-cols-1 gap-5',
        (hasSpecialties || hasServices) && localDescription
          ? 'lg:grid-cols-3'
          : '',
        isRTL && 'rtl',
      )}
    >
      {/* Description */}
      {localDescription && (
        <Card
          className={cn(
            'border-border/60',
            hasSpecialties || hasServices ? 'lg:col-span-2' : '',
          )}
        >
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              {t('practicePage.about.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {localDescription}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Specialties + services stacked */}
      {(hasSpecialties || hasServices) && (
        <div className="space-y-4">
          {hasSpecialties && (
            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Stethoscope className="h-4 w-4 text-primary" />
                  {t('practicePage.services.title')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {practice.specialties!.map((s) => (
                    <Badge key={s} variant="secondary" className="text-xs">
                      {s}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {hasServices && (
            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" />
                  {t('practicePage.services.subtitle')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {practice.services_offered!.map((s) => (
                    <li key={s} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary/60 flex-shrink-0" />
                      {s}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </motion.div>
  );
}
