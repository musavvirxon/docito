import { useState } from 'react';
import { Logo } from '@/components/Logo';
import Footer from '@/components/Footer';
import { Mail, Phone, MapPin, Send, MessageSquare, Clock, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

export default function Contact() {
  const navigate = useNavigate();
  const { toast } = useToast();
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
        title: "Message sent successfully!",
        description: "We'll get back to you soon.",
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
      title: 'Email Us',
      value: 'support@docito.app',
      description: 'Send us an email anytime',
      color: 'from-blue-500 to-indigo-600'
    },
    {
      icon: Phone,
      title: 'Call Us',
      value: '+1 (555) 123-4567',
      description: 'Mon-Fri from 8am to 6pm',
      color: 'from-green-500 to-teal-600'
    },
    {
      icon: MapPin,
      title: 'Visit Us',
      value: '123 Healthcare Ave, Medical District',
      description: 'Come visit our office',
      color: 'from-purple-500 to-pink-600'
    },
    {
      icon: MessageSquare,
      title: 'Live Chat',
      value: 'Available 24/7',
      description: 'Chat with our support team',
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
              Sign In
            </button>
          </div>
        </div>
      </nav>

      <div className="bg-gradient-to-br from-primary/90 to-primary py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold text-primary-foreground mb-4">Get in Touch</h1>
          <p className="text-xl text-primary-foreground/80 max-w-2xl mx-auto">
            Have questions? We're here to help. Reach out to us through any of the methods below.
          </p>
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
            <h2 className="text-2xl font-bold text-foreground mb-6">Send us a Message</h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border-2 border-input bg-background text-foreground"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Email</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border-2 border-input bg-background text-foreground"
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Phone (Optional)</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border-2 border-input bg-background text-foreground"
                  placeholder="+1 (555) 123-4567"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border-2 border-input bg-background text-foreground"
                >
                  <option value="general">General Inquiry</option>
                  <option value="technical">Technical Support</option>
                  <option value="billing">Billing Question</option>
                  <option value="partnership">Partnership Opportunity</option>
                  <option value="feedback">Feedback</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Subject</label>
                <input
                  type="text"
                  required
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border-2 border-input bg-background text-foreground"
                  placeholder="How can we help?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Message</label>
                <textarea
                  required
                  rows={6}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border-2 border-input bg-background text-foreground"
                  placeholder="Tell us more about your inquiry..."
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full px-6 py-4 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-lg flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? 'Sending...' : (
                  <>
                    <Send className="w-5 h-5" />
                    Send Message
                  </>
                )}
              </button>
            </form>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-foreground mb-6">Frequently Asked Questions</h2>
            
            <div className="space-y-4 mb-8">
              <FAQItem
                question="What are your support hours?"
                answer="Our support team is available 24/7 via live chat and email. Phone support is available Monday-Friday, 8am-6pm EST."
              />
              <FAQItem
                question="How quickly will I get a response?"
                answer="We typically respond to all inquiries within 2-4 hours during business hours, and within 24 hours for messages received outside business hours."
              />
              <FAQItem
                question="Do you offer emergency support?"
                answer="Yes! For urgent technical issues or emergencies, please call our hotline at +1 (555) 123-4567 and press 1 for immediate assistance."
              />
              <FAQItem
                question="Can I schedule a demo?"
                answer="Absolutely! Click the 'Schedule Demo' button on our homepage or mention it in your message, and we'll set up a personalized demonstration."
              />
            </div>

            <div className="bg-primary/10 rounded-xl p-6 border border-primary/20">
              <Clock className="w-8 h-8 text-primary mb-4" />
              <h3 className="text-lg font-bold text-foreground mb-2">Business Hours</h3>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>Monday - Friday: 8:00 AM - 6:00 PM EST</p>
                <p>Saturday: 9:00 AM - 3:00 PM EST</p>
                <p>Sunday: Closed</p>
                <p className="text-primary font-semibold mt-2">Live chat available 24/7</p>
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
