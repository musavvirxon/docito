// src/components/facility/public/LabTestsSection.tsx
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { FlaskConical, Clock, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { LabPublicData } from '@/hooks/useLabPublicProfile';

interface Props {
  lab: LabPublicData;
}

export default function LabTestsSection({ lab }: Props) {
  const { t, i18n } = useTranslation('practicePage');
  const isRTL = i18n.language === 'ar';

  const hasTests = (lab.services_offered?.length ?? 0) > 0;
  const hasAccreditations = (lab.accreditations?.length ?? 0) > 0;

  if (!hasTests && !hasAccreditations && lab.average_turnaround_hours == null) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className={cn('grid grid-cols-1 lg:grid-cols-3 gap-5', isRTL && 'rtl')}
    >
      {hasTests && (
        <Card className="border-border/60 lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-primary" />
              {t('practicePage.lab.testsTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {lab.services_offered!.map((s) => (
                <Badge key={s} variant="secondary" className="text-xs">
                  {s}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {lab.average_turnaround_hours != null && (
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                {t('practicePage.lab.turnaroundTitle')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {t('practicePage.lab.turnaround', { hours: lab.average_turnaround_hours })}
              </p>
            </CardContent>
          </Card>
        )}

        {hasAccreditations && (
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                {t('practicePage.lab.accreditationsTitle')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {lab.accreditations!.map((a) => (
                  <li key={a} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/60 flex-shrink-0" />
                    {a}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </motion.div>
  );
}
