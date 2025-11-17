import { useTranslation } from "react-i18next";

export const PricingHeader = () => {
  const { t } = useTranslation('pricing');
  
  return (
    <div className="text-center space-y-4 max-w-3xl mx-auto">
      <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
        {t('header.title')}
      </h1>
      <p className="text-lg md:text-xl text-muted-foreground">
        {t('header.subtitle')}
      </p>
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        {t('header.savingsBadge')}
      </div>
    </div>
  );
};
