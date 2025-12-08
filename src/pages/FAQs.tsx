import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ModernNavbar from '@/components/home/ModernNavbar';
import ModernFooter from '@/components/home/ModernFooter';
import { Search, ChevronDown, HelpCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { FAQsIllustration } from '@/components/Visuals/illustrations';

export default function FAQs() {
  const navigate = useNavigate();
  const { t } = useTranslation(['common', 'faqs']);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  const categories = [
    { key: 'all', label: t('faqs:categories.all') },
    { key: 'getting-started', label: t('faqs:categories.gettingStarted') },
    { key: 'appointments', label: t('faqs:categories.appointments') },
    { key: 'billing', label: t('faqs:categories.billing') },
    { key: 'technical', label: t('faqs:categories.technical') },
    { key: 'privacy', label: t('faqs:categories.privacy') }
  ];

  const faqs = [
    {
      category: 'getting-started',
      question: t('faqs:items.createAccount.question'),
      answer: t('faqs:items.createAccount.answer')
    },
    {
      category: 'getting-started',
      question: t('faqs:items.isFree.question'),
      answer: t('faqs:items.isFree.answer')
    },
    {
      category: 'getting-started',
      question: t('faqs:items.devices.question'),
      answer: t('faqs:items.devices.answer')
    },
    {
      category: 'appointments',
      question: t('faqs:items.bookAppointment.question'),
      answer: t('faqs:items.bookAppointment.answer')
    },
    {
      category: 'appointments',
      question: t('faqs:items.cancelReschedule.question'),
      answer: t('faqs:items.cancelReschedule.answer')
    },
    {
      category: 'appointments',
      question: t('faqs:items.late.question'),
      answer: t('faqs:items.late.answer')
    },
    {
      category: 'appointments',
      question: t('faqs:items.videoConsultation.question'),
      answer: t('faqs:items.videoConsultation.answer')
    },
    {
      category: 'billing',
      question: t('faqs:items.paymentMethods.question'),
      answer: t('faqs:items.paymentMethods.answer')
    },
    {
      category: 'billing',
      question: t('faqs:items.insurance.question'),
      answer: t('faqs:items.insurance.answer')
    },
    {
      category: 'billing',
      question: t('faqs:items.whenCharged.question'),
      answer: t('faqs:items.whenCharged.answer')
    },
    {
      category: 'billing',
      question: t('faqs:items.refund.question'),
      answer: t('faqs:items.refund.answer')
    },
    {
      category: 'technical',
      question: t('faqs:items.videoCalls.question'),
      answer: t('faqs:items.videoCalls.answer')
    },
    {
      category: 'technical',
      question: t('faqs:items.uploadDocuments.question'),
      answer: t('faqs:items.uploadDocuments.answer')
    },
    {
      category: 'technical',
      question: t('faqs:items.multipleDevices.question'),
      answer: t('faqs:items.multipleDevices.answer')
    },
    {
      category: 'privacy',
      question: t('faqs:items.dataSecure.question'),
      answer: t('faqs:items.dataSecure.answer')
    },
    {
      category: 'privacy',
      question: t('faqs:items.whoCanSee.question'),
      answer: t('faqs:items.whoCanSee.answer')
    },
    {
      category: 'privacy',
      question: t('faqs:items.deleteAccount.question'),
      answer: t('faqs:items.deleteAccount.answer')
    },
    {
      category: 'privacy',
      question: t('faqs:items.sellData.question'),
      answer: t('faqs:items.sellData.answer')
    }
  ];

  const filteredFAQs = faqs.filter(faq => {
    const matchesCategory = activeCategory === 'all' || faq.category === activeCategory;
    const matchesSearch = searchQuery === '' || 
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-background">
      <ModernNavbar />

      <div className="bg-gradient-to-br from-primary/90 to-primary py-16 pt-32">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row items-center gap-8">
            <div className="flex-1 text-center lg:text-left">
              <HelpCircle className="w-16 h-16 text-primary-foreground mb-6 mx-auto lg:mx-0" />
              <h1 className="text-5xl font-bold text-primary-foreground mb-4">{t('faqs:hero.title')}</h1>
              <p className="text-xl text-primary-foreground/80 mb-8">{t('faqs:hero.subtitle')}</p>

              <div className="max-w-2xl">
                <div className="relative">
                  <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder={t('faqs:search.placeholder')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-16 pr-6 py-5 rounded-2xl text-lg border-2 border-input bg-background text-foreground shadow-2xl"
                  />
                </div>
              </div>
            </div>
            <div className="w-full max-w-xs lg:max-w-sm hidden lg:block">
              <FAQsIllustration className="w-full h-auto" />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-wrap gap-3 justify-center">
          {categories.map(category => (
            <button
              key={category.key}
              onClick={() => setActiveCategory(category.key)}
              className={`px-6 py-3 rounded-full font-semibold transition-all ${
                activeCategory === category.key
                  ? 'bg-primary text-primary-foreground shadow-lg'
                  : 'bg-card text-foreground border border-border hover:bg-accent'
              }`}
            >
              {category.label}
            </button>
          ))}
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <p className="text-center text-muted-foreground mb-8">
          {t('faqs:results.showing', { count: filteredFAQs.length })}
        </p>

        <div className="max-w-4xl mx-auto space-y-4">
          {filteredFAQs.map((faq, index) => (
            <FAQAccordion key={index} faq={faq} categoryLabel={categories.find(c => c.key === faq.category)?.label || faq.category} />
          ))}
        </div>

        {filteredFAQs.length === 0 && (
          <div className="text-center py-12">
            <p className="text-xl text-muted-foreground mb-4">{t('faqs:results.noResults')}</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setActiveCategory('all');
              }}
              className="px-6 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {t('faqs:results.clearSearch')}
            </button>
          </div>
        )}
      </div>

      <div className="container mx-auto px-4 py-16">
        <div className="bg-gradient-to-r from-primary/90 to-primary rounded-3xl p-12 text-center">
          <h2 className="text-3xl font-bold text-primary-foreground mb-4">{t('faqs:cta.title')}</h2>
          <p className="text-xl text-primary-foreground/80 mb-8">{t('faqs:cta.subtitle')}</p>
          <button
            onClick={() => navigate('/contact')}
            className="px-8 py-4 rounded-lg bg-background text-foreground hover:bg-accent font-semibold text-lg"
          >
            {t('faqs:cta.button')}
          </button>
        </div>
      </div>

      <ModernFooter />
    </div>
  );
}

function FAQAccordion({ faq, categoryLabel }: { faq: { category: string; question: string; answer: string }; categoryLabel: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-card rounded-xl shadow-lg border border-border overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-5 flex items-center justify-between hover:bg-accent transition-colors"
      >
        <div className="flex items-start gap-4 text-left flex-1">
          <span className="text-xs font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full whitespace-nowrap">
            {categoryLabel}
          </span>
          <span className="font-semibold text-foreground text-lg">{faq.question}</span>
        </div>
        <ChevronDown className={`w-6 h-6 text-muted-foreground transition-transform flex-shrink-0 ml-4 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="px-6 py-5 bg-accent/50 border-t border-border">
          <p className="text-muted-foreground leading-relaxed">{faq.answer}</p>
        </div>
      )}
    </div>
  );
}
