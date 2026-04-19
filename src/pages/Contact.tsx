import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { z } from 'zod';
import ModernNavbar from '@/components/home/ModernNavbar';
import ModernFooter from '@/components/home/ModernFooter';
import { Mail, MessageCircle, Send, MessageSquare, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ContactIllustration } from '@/components/Visuals/illustrations';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const WHATSAPP_URL = 'https://wa.me/qr/O5HYYPMF52NBD1';

const messageSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().max(40).optional().or(z.literal('')),
  subject: z.string().trim().min(1).max(200),
  message: z.string().trim().min(1).max(5000),
  category: z.enum(['general', 'technical', 'billing', 'partnership', 'feedback']),
});

export default function Contact() {
  const { toast } = useToast();
  const { user } = useAuth();
  const location = useLocation();
  const { t, i18n } = useTranslation(['common', 'contact']);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
    category: 'general' as const,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const parsed = messageSchema.safeParse(formData);
      if (!parsed.success) {
        toast({
          variant: 'destructive',
          title: t('contact:form.validationError', { defaultValue: 'Please check your inputs' }),
        });
        setIsSubmitting(false);
        return;
      }

      const { error } = await supabase.from('support_messages').insert({
        user_id: user?.id ?? null,
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone || null,
        category: parsed.data.category,
        subject: parsed.data.subject,
        message: parsed.data.message,
        page_path: location.pathname,
        language: i18n.language,
      });

      if (error) throw error;

      toast({
        title: t('contact:form.successTitle'),
        description: t('contact:form.successDescription'),
      });
      setFormData({ name: '', email: '', phone: '', subject: '', message: '', category: 'general' });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: t('common:error', { defaultValue: 'Error' }),
        description: err?.message ?? 'Failed to send message',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const contactMethods = [
    {
      icon: Mail,
      title: t('contact:methods.email.title'),
      value: t('contact:methods.email.value', { defaultValue: 'Reach our team by email' }),
      description: t('contact:methods.email.description'),
      color: 'from-blue-500 to-indigo-600',
      onClick: () => {
        const el = document.getElementById('contact-form');
        el?.scrollIntoView({ behavior: 'smooth' });
      },
    },
    {
      icon: MessageCircle,
      title: t('contact:methods.whatsapp.title', { defaultValue: 'Call us on WhatsApp' }),
      value: t('contact:methods.whatsapp.value', { defaultValue: 'Voice & video on WhatsApp' }),
      description: t('contact:methods.whatsapp.description', { defaultValue: 'Tap to open a chat with our team.' }),
      color: 'from-green-500 to-emerald-600',
      onClick: () => window.open(WHATSAPP_URL, '_blank', 'noopener,noreferrer'),
    },
    {
      icon: MessageSquare,
      title: t('contact:methods.sendMessage.title', { defaultValue: 'Send us a message' }),
      value: t('contact:methods.sendMessage.value', { defaultValue: 'We reply within 24 hours' }),
      description: t('contact:methods.sendMessage.description', { defaultValue: 'Use the form below — it goes straight to our admin team.' }),
      color: 'from-purple-500 to-pink-600',
      onClick: () => {
        const el = document.getElementById('contact-form');
        el?.scrollIntoView({ behavior: 'smooth' });
      },
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <ModernNavbar />

      <div className="bg-gradient-to-br from-primary/90 to-primary py-16 pt-32">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-8 items-center max-w-5xl mx-auto">
            <motion.div
              className="text-center md:text-left"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="text-5xl font-bold text-primary-foreground mb-4">{t('contact:hero.title')}</h1>
              <p className="text-xl text-primary-foreground/80">{t('contact:hero.subtitle')}</p>
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
        <div className="grid md:grid-cols-3 gap-6 mb-16 max-w-5xl mx-auto">
          {contactMethods.map((method, index) => (
            <ContactMethodCard key={index} method={method} />
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          <div id="contact-form" className="bg-card rounded-2xl p-8 shadow-xl border border-border scroll-mt-24">
            <h2 className="text-2xl font-bold text-foreground mb-6">{t('contact:form.title')}</h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">{t('contact:form.fields.name.label')}</label>
                <input
                  type="text"
                  required
                  maxLength={100}
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
                  maxLength={255}
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
                  maxLength={40}
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
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
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
                  maxLength={200}
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
                  maxLength={5000}
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
          </div>
        </div>
      </div>

      <ModernFooter />
    </div>
  );
}

function ContactMethodCard({ method }: any) {
  const Icon = method.icon;
  return (
    <button
      onClick={method.onClick}
      className="text-left bg-card rounded-xl p-6 shadow-lg border border-border hover:border-primary transition-all"
    >
      <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${method.color} flex items-center justify-center mb-4`}>
        <Icon className="w-7 h-7 text-white" />
      </div>
      <h3 className="text-lg font-bold text-foreground mb-2">{method.title}</h3>
      <p className="text-primary font-semibold mb-2">{method.value}</p>
      <p className="text-sm text-muted-foreground">{method.description}</p>
    </button>
  );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="bg-card rounded-lg p-4 border border-border">
      <button onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between text-left">
        <span className="font-semibold text-foreground">{question}</span>
        <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform ${isOpen ? 'rotate-90' : ''}`} />
      </button>
      {isOpen && <p className="mt-3 text-sm text-muted-foreground">{answer}</p>}
    </div>
  );
}
