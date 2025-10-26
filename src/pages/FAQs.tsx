import { useState } from 'react';
import { Logo } from '@/components/Logo';
import Footer from '@/components/Footer';
import { Search, ChevronDown, HelpCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function FAQs() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  const categories = ['All', 'Getting Started', 'Appointments', 'Billing', 'Technical', 'Privacy & Security'];

  const faqs = [
    {
      category: 'Getting Started',
      question: 'How do I create an account?',
      answer: 'To create an account, click the "Sign Up" button on the homepage. Choose whether you\'re a patient or doctor, fill in your details, verify your email, and you\'re all set! The process takes less than 2 minutes.'
    },
    {
      category: 'Getting Started',
      question: 'Is Docito free to use?',
      answer: 'Docito offers both free and premium plans. Patients can browse doctors and book appointments for free. Doctors get a 30-day free trial, after which subscription plans start at $99/month.'
    },
    {
      category: 'Getting Started',
      question: 'What devices can I use Docito on?',
      answer: 'Docito works on all modern web browsers (Chrome, Firefox, Safari, Edge) on desktop, tablet, and mobile devices. We also have dedicated iOS and Android mobile apps available in the App Store and Google Play.'
    },
    {
      category: 'Appointments',
      question: 'How do I book an appointment?',
      answer: 'Search for a doctor by specialty or name, view their available time slots, select a convenient time, and confirm your booking. You\'ll receive instant confirmation via email and SMS.'
    },
    {
      category: 'Appointments',
      question: 'Can I cancel or reschedule an appointment?',
      answer: 'Yes! You can cancel or reschedule appointments up to 24 hours before the scheduled time through your dashboard. Some doctors may have different cancellation policies, which will be shown when booking.'
    },
    {
      category: 'Appointments',
      question: 'What if I\'m late to my appointment?',
      answer: 'Please try to arrive on time. If you\'re running late, contact the doctor\'s office directly. For virtual appointments, you can join up to 10 minutes after the scheduled time, though the session may be shortened.'
    },
    {
      category: 'Appointments',
      question: 'How do video consultations work?',
      answer: 'Video consultations are conducted through our secure platform. No downloads needed! Just click "Join Video Call" at your appointment time, and you\'ll be connected with your doctor via HD video.'
    },
    {
      category: 'Billing',
      question: 'What payment methods do you accept?',
      answer: 'We accept all major credit cards (Visa, Mastercard, Amex, Discover), debit cards, and HSA/FSA cards. We also work with insurance providers and offer payment plans for larger bills.'
    },
    {
      category: 'Billing',
      question: 'Does my insurance cover Docito appointments?',
      answer: 'Many insurance plans cover telemedicine and in-person appointments booked through Docito. Check with your insurance provider or look for doctors who accept your insurance in their profile.'
    },
    {
      category: 'Billing',
      question: 'When will I be charged?',
      answer: 'For most appointments, payment is processed at the time of booking. Some doctors offer pay-after-visit options. You\'ll always see the payment terms before confirming your appointment.'
    },
    {
      category: 'Billing',
      question: 'Can I get a refund?',
      answer: 'Refund policies vary by provider. If you cancel within the allowed timeframe (usually 24 hours), you\'ll receive a full refund. For cancellations outside this window, refunds are at the doctor\'s discretion.'
    },
    {
      category: 'Technical',
      question: 'I\'m having trouble with video calls',
      answer: 'First, check your internet connection and ensure your camera/microphone permissions are enabled. Try using Chrome or Safari for best results. If issues persist, contact our 24/7 technical support.'
    },
    {
      category: 'Technical',
      question: 'How do I upload medical documents?',
      answer: 'Go to your profile, click "Medical Records," then "Upload Document." You can upload PDFs, images, or scanned documents. All files are encrypted and HIPAA-compliant.'
    },
    {
      category: 'Technical',
      question: 'Can I access my account from multiple devices?',
      answer: 'Yes! You can log in from any device. Your data is securely synced across all platforms in real-time.'
    },
    {
      category: 'Privacy & Security',
      question: 'Is my health information secure?',
      answer: 'Absolutely. Docito is HIPAA-compliant and uses military-grade encryption. Your data is stored on secure servers with multiple backups, and we never share your information without your explicit consent.'
    },
    {
      category: 'Privacy & Security',
      question: 'Who can see my medical records?',
      answer: 'Only you and healthcare providers you\'ve granted access to can view your records. You have complete control over who sees your information and can revoke access at any time.'
    },
    {
      category: 'Privacy & Security',
      question: 'How do I delete my account?',
      answer: 'Go to Settings > Account > Delete Account. Note that this permanently deletes all your data. For medical record retention, we keep encrypted backups for 7 years as required by law, but they\'re inaccessible to anyone.'
    },
    {
      category: 'Privacy & Security',
      question: 'Do you sell my data?',
      answer: 'Never. We do not sell, rent, or share your personal health information with third parties for marketing purposes. Your privacy is our top priority.'
    }
  ];

  const filteredFAQs = faqs.filter(faq => {
    const matchesCategory = activeCategory === 'All' || faq.category === activeCategory;
    const matchesSearch = searchQuery === '' || 
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-background">
      <nav className="bg-card border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Logo variant="horizontal" size="sm" onClick={() => navigate('/')} className="cursor-pointer" />
            <button onClick={() => navigate('/auth')} className="px-6 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90">
              Sign In
            </button>
          </div>
        </div>
      </nav>

      <div className="bg-gradient-to-br from-primary/90 to-primary py-16">
        <div className="container mx-auto px-4 text-center">
          <HelpCircle className="w-16 h-16 text-primary-foreground mx-auto mb-6" />
          <h1 className="text-5xl font-bold text-primary-foreground mb-4">Frequently Asked Questions</h1>
          <p className="text-xl text-primary-foreground/80 mb-8">Find answers to common questions about Docito</p>

          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search FAQs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-16 pr-6 py-5 rounded-2xl text-lg border-2 border-input bg-background text-foreground shadow-2xl"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-wrap gap-3 justify-center">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-6 py-3 rounded-full font-semibold transition-all ${
                activeCategory === category
                  ? 'bg-primary text-primary-foreground shadow-lg'
                  : 'bg-card text-foreground border border-border hover:bg-accent'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <p className="text-center text-muted-foreground mb-8">
          Showing {filteredFAQs.length} {filteredFAQs.length === 1 ? 'question' : 'questions'}
        </p>

        <div className="max-w-4xl mx-auto space-y-4">
          {filteredFAQs.map((faq, index) => (
            <FAQAccordion key={index} faq={faq} />
          ))}
        </div>

        {filteredFAQs.length === 0 && (
          <div className="text-center py-12">
            <p className="text-xl text-muted-foreground mb-4">No FAQs found matching your search</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setActiveCategory('All');
              }}
              className="px-6 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Clear Search
            </button>
          </div>
        )}
      </div>

      <div className="container mx-auto px-4 py-16">
        <div className="bg-gradient-to-r from-primary/90 to-primary rounded-3xl p-12 text-center">
          <h2 className="text-3xl font-bold text-primary-foreground mb-4">Still have questions?</h2>
          <p className="text-xl text-primary-foreground/80 mb-8">Our support team is ready to help you</p>
          <button
            onClick={() => navigate('/contact')}
            className="px-8 py-4 rounded-lg bg-background text-foreground hover:bg-accent font-semibold text-lg"
          >
            Contact Support
          </button>
        </div>
      </div>

      <Footer />
    </div>
  );
}

function FAQAccordion({ faq }: { faq: { category: string; question: string; answer: string } }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-card rounded-xl shadow-lg border border-border overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-5 flex items-center justify-between hover:bg-accent transition-colors"
      >
        <div className="flex items-start gap-4 text-left flex-1">
          <span className="text-xs font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full whitespace-nowrap">
            {faq.category}
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
