import { Logo } from '@/components/Logo';
import Footer from '@/components/Footer';
import { 
  HelpCircle, MessageSquare, Book, Phone, Mail, 
  Video, FileText, Clock, ArrowRight 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Support() {
  const navigate = useNavigate();

  const supportOptions = [
    {
      icon: MessageSquare,
      title: 'Live Chat',
      description: 'Chat with our support team in real-time',
      availability: 'Available 24/7',
      action: 'Start Chat',
      color: 'from-blue-500 to-indigo-600',
      onClick: () => alert('Live chat would open here')
    },
    {
      icon: Phone,
      title: 'Call Us',
      description: 'Speak directly with a support representative',
      availability: 'Mon-Fri 8AM-6PM EST',
      action: 'Call Now',
      color: 'from-green-500 to-teal-600',
      onClick: () => window.open('tel:+15551234567')
    },
    {
      icon: Mail,
      title: 'Email Support',
      description: 'Send us a detailed message',
      availability: 'Response within 24 hours',
      action: 'Send Email',
      color: 'from-purple-500 to-pink-600',
      onClick: () => navigate('/contact')
    },
    {
      icon: Video,
      title: 'Video Call',
      description: 'Schedule a video call with our team',
      availability: 'By appointment',
      action: 'Schedule Call',
      color: 'from-orange-500 to-red-600',
      onClick: () => navigate('/contact')
    }
  ];

  const resources = [
    {
      icon: Book,
      title: 'Help Center',
      description: 'Browse our comprehensive knowledge base',
      link: '/help-center'
    },
    {
      icon: HelpCircle,
      title: 'FAQs',
      description: 'Find answers to common questions',
      link: '/faqs'
    },
    {
      icon: FileText,
      title: 'Documentation',
      description: 'Technical guides and documentation',
      link: '/legal'
    },
    {
      icon: Video,
      title: 'Video Tutorials',
      description: 'Watch step-by-step tutorials',
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
              Sign In
            </button>
          </div>
        </div>
      </nav>

      <div className="bg-gradient-to-br from-primary/90 to-primary py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-primary-foreground mb-6">We're Here to Help</h1>
          <p className="text-xl text-primary-foreground/80 max-w-3xl mx-auto">
            Get the support you need, when you need it. Our team is available 24/7 to assist you.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-foreground text-center mb-12">Contact Support</h2>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {supportOptions.map((option, index) => (
            <SupportOptionCard key={index} option={option} />
          ))}
        </div>
      </div>

      <div className="bg-card py-16 border-y border-border">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-foreground text-center mb-12">Self-Service Resources</h2>

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
                <h3 className="text-xl font-bold text-foreground">All Systems Operational</h3>
                <p className="text-green-700 dark:text-green-400">99.9% uptime • Last updated: 2 minutes ago</p>
              </div>
            </div>
            <button className="px-6 py-3 rounded-lg bg-green-600 text-white hover:bg-green-700 font-semibold">
              View Status Page
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16">
        <div className="bg-red-500/10 rounded-2xl p-12 text-center border border-red-500/20">
          <h2 className="text-3xl font-bold text-foreground mb-4">Medical Emergency?</h2>
          <p className="text-xl text-muted-foreground mb-6">
            If you're experiencing a medical emergency, please call 911 or visit your nearest emergency room immediately.
          </p>
          <p className="text-red-600 dark:text-red-400 font-semibold text-lg">
            Docito is not for emergency medical situations.
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

  return (
    <div
      onClick={() => navigate(resource.link)}
      className="bg-accent rounded-xl p-6 hover:bg-accent/80 cursor-pointer transition-all border border-border hover:border-primary group"
    >
      <Icon className="w-8 h-8 text-primary mb-3 group-hover:scale-110 transition-transform" />
      <h3 className="text-lg font-bold text-foreground mb-2">{resource.title}</h3>
      <p className="text-sm text-muted-foreground mb-3">{resource.description}</p>
      <span className="text-sm text-primary font-semibold group-hover:underline">Learn more →</span>
    </div>
  );
}
