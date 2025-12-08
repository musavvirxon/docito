import { Logo } from '@/components/Logo';
import Footer from '@/components/Footer';
import { 
  HelpCircle, MessageSquare, Book, Phone, Mail, 
  Video, FileText, Clock, ArrowRight 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SupportIllustration } from '@/components/Visuals/illustrations';

export default function Support() {
  const navigate = useNavigate();
  const { t } = useTranslation(['common', 'support']);

  const supportOptions = [
    {
      icon: MessageSquare,
      title: t('support:options.liveChat.title'),
      description: t('support:options.liveChat.description'),
      availability: t('support:options.liveChat.availability'),
      action: t('support:options.liveChat.action'),
      color: 'from-blue-500 to-indigo-600',
      onClick: () => alert('Live chat would open here')
    },
    {
      icon: Phone,
      title: t('support:options.callUs.title'),
      description: t('support:options.callUs.description'),
      availability: t('support:options.callUs.availability'),
      action: t('support:options.callUs.action'),
      color: 'from-green-500 to-teal-600',
      onClick: () => window.open('tel:+15551234567')
    },
    {
      icon: Mail,
      title: t('support:options.emailSupport.title'),
      description: t('support:options.emailSupport.description'),
      availability: t('support:options.emailSupport.availability'),
      action: t('support:options.emailSupport.action'),
      color: 'from-purple-500 to-pink-600',
      onClick: () => navigate('/contact')
    },
    {
      icon: Video,
      title: t('support:options.videoCall.title'),
      description: t('support:options.videoCall.description'),
      availability: t('support:options.videoCall.availability'),
      action: t('support:options.videoCall.action'),
      color: 'from-orange-500 to-red-600',
      onClick: () => navigate('/contact')
    }
  ];

  const resources = [
    {
      icon: Book,
      title: t('support:resources.helpCenter.title'),
      description: t('support:resources.helpCenter.description'),
      link: '/help-center'
    },
    {
      icon: HelpCircle,
      title: t('support:resources.faqs.title'),
      description: t('support:resources.faqs.description'),
      link: '/faqs'
    },
    {
      icon: FileText,
      title: t('support:resources.documentation.title'),
      description: t('support:resources.documentation.description'),
      link: '/legal'
    },
    {
      icon: Video,
      title: t('support:resources.videoTutorials.title'),
      description: t('support:resources.videoTutorials.description'),
      link: '/help-center'
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <nav className="bg-card border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Logo variant="horizontal" size="sm" onClick={() => navigate('/')} className="cursor-pointer" />
            <button onClick={() => navigate('/auth')} className="px-6 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90">
              {t('common:signIn')}
            </button>
          </div>
        </div>
      </nav>

      <div className="bg-gradient-to-br from-primary/90 to-primary py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="text-center md:text-left">
              <h1 className="text-4xl md:text-5xl font-bold text-primary-foreground mb-6">{t('support:hero.title')}</h1>
              <p className="text-xl text-primary-foreground/80 max-w-xl">
                {t('support:hero.subtitle')}
              </p>
            </div>
            <div className="hidden md:flex justify-center">
              <SupportIllustration className="w-full max-w-sm" />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-foreground text-center mb-12">{t('support:contactSupport')}</h2>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {supportOptions.map((option, index) => (
            <SupportOptionCard key={index} option={option} />
          ))}
        </div>
      </div>

      <div className="bg-card py-16 border-y border-border">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-foreground text-center mb-12">{t('support:selfServiceResources')}</h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {resources.map((resource, index) => (
              <ResourceCard key={index} resource={resource} navigate={navigate} />
            ))}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16">
        <div className="bg-green-500/10 rounded-2xl p-8 border border-green-500/20">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground">{t('support:systemStatus.title')}</h3>
                <p className="text-green-700 dark:text-green-400">{t('support:systemStatus.message')}</p>
              </div>
            </div>
            <button className="px-6 py-3 rounded-lg bg-green-600 text-white hover:bg-green-700 font-semibold">
              {t('support:systemStatus.viewStatus')}
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16">
        <div className="bg-red-500/10 rounded-2xl p-12 text-center border border-red-500/20">
          <h2 className="text-3xl font-bold text-foreground mb-4">{t('support:emergency.title')}</h2>
          <p className="text-xl text-muted-foreground mb-6">
            {t('support:emergency.message')}
          </p>
          <p className="text-red-600 dark:text-red-400 font-semibold text-lg">
            {t('support:emergency.warning')}
          </p>
        </div>
      </div>

      <Footer />
    </div>
  );
}

function SupportOptionCard({ option }: any) {
  const Icon = option.icon;

  return (
    <div className="bg-card rounded-xl p-6 shadow-lg hover:shadow-xl transition-all border border-border hover:border-primary">
      <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${option.color} flex items-center justify-center mb-4`}>
        <Icon className="w-7 h-7 text-white" />
      </div>

      <h3 className="text-xl font-bold text-foreground mb-2">{option.title}</h3>
      <p className="text-sm text-muted-foreground mb-3">{option.description}</p>
      <p className="text-xs text-muted-foreground mb-4">{option.availability}</p>

      <button
        onClick={option.onClick}
        className="w-full px-4 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-semibold flex items-center justify-center gap-2"
      >
        {option.action}
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}

function ResourceCard({ resource, navigate }: any) {
  const Icon = resource.icon;
  const { t } = useTranslation('common');

  return (
    <div
      onClick={() => navigate(resource.link)}
      className="bg-accent rounded-xl p-6 hover:bg-accent/80 cursor-pointer transition-all border border-border hover:border-primary group"
    >
      <Icon className="w-8 h-8 text-primary mb-3 group-hover:scale-110 transition-transform" />
      <h3 className="text-lg font-bold text-foreground mb-2">{resource.title}</h3>
      <p className="text-sm text-muted-foreground mb-3">{resource.description}</p>
      <span className="text-sm text-primary font-semibold group-hover:underline">{t('learnMore')} →</span>
    </div>
  );
}
