import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export const CallToAction = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('pricing');

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary via-primary/90 to-primary/80 p-12 md:p-16 text-center">
      <div className="absolute inset-0 bg-grid-white/10 [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]" />
      
      <div className="relative z-10 space-y-6 max-w-3xl mx-auto">
        <h2 className="text-3xl md:text-5xl font-bold text-white">
          {t('cta.title')}
        </h2>
        <p className="text-lg md:text-xl text-white/90">
          {t('cta.subtitle')}
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <Button 
            size="lg" 
            variant="secondary"
            className="gap-2 bg-white text-primary hover:bg-white/90 shadow-xl"
            onClick={() => navigate('/signup')}
          >
            {t('cta.startButton')}
            <ArrowRight className="w-5 h-5" />
          </Button>
          <Button 
            size="lg" 
            variant="outline"
            className="gap-2 border-white text-white hover:bg-white/10"
            onClick={() => navigate('/contact')}
          >
            {t('cta.contactButton')}
          </Button>
        </div>

        <p className="text-sm text-white/80 pt-2">
          {t('cta.footer')}
        </p>
      </div>
    </div>
  );
};
