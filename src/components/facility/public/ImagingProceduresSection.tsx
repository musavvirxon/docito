// src/components/facility/public/ImagingProceduresSection.tsx
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { ScanLine, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { ImagingPublicData } from '@/hooks/useImagingPublicProfile';

interface Props {
  center: ImagingPublicData;
}

export default function ImagingProceduresSection({ center }: Props) {
  const { t, i18n } = useTranslation('practicePage');
  const isRTL = i18n.language === 'ar';

  const hasModalities = (center.modalities?.length ?? 0) > 0;
  const hasAccreditations = (center.accreditations?.length ?? 0) > 0;

  if (!hasModalities && !hasAccreditations) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className={cn('grid grid-cols-1 gap-5', hasModalities && hasAccreditations ? 'lg:grid-cols-2' : '', isRTL && 'rtl')}
    >
      {hasModalities && (
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ScanLine className="h-4 w-4 text-primary" />
              {t('practicePage.imaging.proceduresTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {center.modalities!.map((m) => (
                <Badge key={m} variant="secondary" className="text-xs">
                  {m}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {hasAccreditations && (
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              {t('practicePage.imaging.accreditationsTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {center.accreditations!.map((a) => (
                <li key={a} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/60 flex-shrink-0" />
                  {a}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}
