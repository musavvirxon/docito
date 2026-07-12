// src/components/facility/public/PharmacyServicesSection.tsx
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Truck, ShieldCheck, Pill } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { PharmacyPublicData } from '@/hooks/usePharmacyPublicProfile';

interface Props {
  pharmacy: PharmacyPublicData;
}

export default function PharmacyServicesSection({ pharmacy }: Props) {
  const { t, i18n } = useTranslation('practicePage');
  const isRTL = i18n.language === 'ar';

  const items = [
    {
      key: 'delivery',
      icon: Truck,
      active: !!pharmacy.delivery_available,
      title: t('practicePage.pharmacy.delivery'),
    },
    {
      key: 'insurance',
      icon: ShieldCheck,
      active: !!pharmacy.accepts_insurance,
      title: t('practicePage.pharmacy.insurance'),
    },
  ];

  const activeItems = items.filter((i) => i.active);
  if (activeItems.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className={cn(isRTL && 'rtl')}
    >
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Pill className="h-4 w-4 text-primary" />
            {t('practicePage.pharmacy.servicesTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {activeItems.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.key}
                  className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/30 px-4 py-3"
                >
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4.5 h-4.5 text-primary" />
                  </div>
                  <span className="text-sm font-medium text-foreground">{item.title}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
