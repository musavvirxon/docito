import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Logo } from '@/components/Logo';
import Footer from '@/components/Footer';
import { Mail, Phone, MapPin, Send, MessageSquare, Clock, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { ContactIllustration } from '@/components/Visuals/illustrations';
import { motion } from 'framer-motion';

export default function Contact() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation(['common', 'contact']);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
    category: 'general'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    setTimeout(() => {
      toast({
        title: t('contact:form.successTitle'),
        description: t('contact:form.successDescription'),
      });
      setFormData({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: '',
        category: 'general'
      });
      setIsSubmitting(false);
    }, 1500);
  };

  const contactMethods = [
    {
      icon: Mail,
      title: t('contact:methods.email.title'),
      value: 'support@docito.app',
      description: t('contact:methods.email.description'),
      color: 'from-blue-500 to-indigo-600'
    },
    {
      icon: Phone,
      title: t('contact:methods.phone.title'),
      value: '+1 (555) 123-4567',
      description: t('contact:methods.phone.description'),
      color: 'from-green-500 to-teal-600'
    },
    {
      icon: MapPin,
      title: t('contact:methods.location.title'),
      value: '123 Healthcare Ave, Medical District',
      description: t('contact:methods.location.description'),
      color: 'from-purple-500 to-pink-600'
    },
    {
      icon: MessageSquare,
      title: t('contact:methods.chat.title'),
      value: t('contact:methods.chat.value'),
      description: t('contact:methods.chat.description'),
      color: 'from-orange-500 to-red-600'
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <nav className="bg-card border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Logo variant="horizontal" size="sm" onClick={() => navigate('/')} className="cursor-pointer" />
            <button
              onClick={() => navigate('/auth')}
              className="px-6 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {t('common:nav.signIn')}
            </button>
          </div>
        </div>
      </nav>

      <div className="bg-gradient-to-br from-primary/90 to-primary py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-8 items-center max-w-5xl mx-auto">
            <motion.div 
              className="text-center md:text-left"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="text-5xl font-bold text-primary-foreground mb-4">{t('contact:hero.title')}</h1>
              <p className="text-xl text-primary-foreground/80">
                {t('contact:hero.subtitle')}
              </p>
            </motion.div>
            <motion.div 
              className="hidden md:block"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <ContactIllustration className="w-full max-w-sm mx-auto" />
            </motion.div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {contactMethods.map((method, index) => (
            <ContactMethodCard key={index} method={method} />
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          <div className="bg-card rounded-2xl p-8 shadow-xl border border-border">
            <h2 className="text-2xl font-bold text-foreground mb-6">{t('contact:form.title')}</h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">{t('contact:form.fields.name.label')}</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border-2 border-input bg-background text-foreground"
                  placeholder={t('contact:form.fields.name.placeholder')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">{t('contact:form.fields.email.label')}</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border-2 border-input bg-background text-foreground"
                  placeholder={t('contact:form.fields.email.placeholder')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">{t('contact:form.fields.phone.label')}</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border-2 border-input bg-background text-foreground"
                  placeholder={t('contact:form.fields.phone.placeholder')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">{t('contact:form.fields.category.label')}</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border-2 border-input bg-background text-foreground"
                >
                  <option value="general">{t('contact:form.fields.category.options.general')}</option>
                  <option value="technical">{t('contact:form.fields.category.options.technical')}</option>
                  <option value="billing">{t('contact:form.fields.category.options.billing')}</option>
                  <option value="partnership">{t('contact:form.fields.category.options.partnership')}</option>
                  <option value="feedback">{t('contact:form.fields.category.options.feedback')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">{t('contact:form.fields.subject.label')}</label>
                <input
                  type="text"
                  required
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border-2 border-input bg-background text-foreground"
                  placeholder={t('contact:form.fields.subject.placeholder')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">{t('contact:form.fields.message.label')}</label>
                <textarea
                  required
                  rows={6}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border-2 border-input bg-background text-foreground"
                  placeholder={t('contact:form.fields.message.placeholder')}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full px-6 py-4 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-lg flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? t('contact:form.sending') : (
                  <>
                    <Send className="w-5 h-5" />
                    {t('contact:form.submit')}
                  </>
                )}
              </button>
            </form>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-foreground mb-6">{t('contact:faq.title')}</h2>
            
            <div className="space-y-4 mb-8">
              <FAQItem
                question={t('contact:faq.questions.hours.question')}
                answer={t('contact:faq.questions.hours.answer')}
              />
              <FAQItem
                question={t('contact:faq.questions.response.question')}
                answer={t('contact:faq.questions.response.answer')}
              />
              <FAQItem
                question={t('contact:faq.questions.emergency.question')}
                answer={t('contact:faq.questions.emergency.answer')}
              />
              <FAQItem
                question={t('contact:faq.questions.demo.question')}
                answer={t('contact:faq.questions.demo.answer')}
              />
            </div>

            <div className="bg-primary/10 rounded-xl p-6 border border-primary/20">
              <Clock className="w-8 h-8 text-primary mb-4" />
              <h3 className="text-lg font-bold text-foreground mb-2">{t('contact:businessHours.title')}</h3>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>{t('contact:businessHours.weekdays')}</p>
                <p>{t('contact:businessHours.saturday')}</p>
                <p>{t('contact:businessHours.sunday')}</p>
                <p className="text-primary font-semibold mt-2">{t('contact:businessHours.liveChat')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

function ContactMethodCard({ method }: any) {
  const Icon = method.icon;

  return (
    <div className="bg-card rounded-xl p-6 shadow-lg border border-border hover:border-primary transition-all text-center">
      <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${method.color} flex items-center justify-center mx-auto mb-4`}>
        <Icon className="w-7 h-7 text-white" />
      </div>
      <h3 className="text-lg font-bold text-foreground mb-2">{method.title}</h3>
      <p className="text-primary font-semibold mb-2">{method.value}</p>
      <p className="text-sm text-muted-foreground">{method.description}</p>
    </div>
  );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-card rounded-lg p-4 border border-border">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between text-left"
      >
        <span className="font-semibold text-foreground">{question}</span>
        <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform ${isOpen ? 'rotate-90' : ''}`} />
      </button>
      {isOpen && (
        <p className="mt-3 text-sm text-muted-foreground">{answer}</p>
      )}
    </div>
  );
}
