import { Logo } from '@/components/Logo';
import Footer from '@/components/Footer';
import { 
  Calendar, Users, FileText, Bell, Shield, BarChart3, 
  Clock, CreditCard, MessageSquare, Video, Pill, 
  Check, Zap, Heart, Lock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Features() {
  const navigate = useNavigate();

  const mainFeatures = [
    {
      icon: Calendar,
      title: 'Smart Appointment Scheduling',
      description: 'AI-powered scheduling that optimizes your time and reduces no-shows with automated reminders',
      color: 'from-blue-500 to-indigo-600',
      benefits: ['Real-time availability', 'Automated reminders', 'Easy rescheduling', 'Calendar sync']
    },
    {
      icon: Users,
      title: 'Patient Management',
      description: 'Comprehensive patient profiles with medical history, treatment plans, and communication tools',
      color: 'from-purple-500 to-pink-600',
      benefits: ['Digital health records', 'Treatment tracking', 'Patient portal access', 'Family account linking']
    },
    {
      icon: FileText,
      title: 'Digital Health Records',
      description: 'Secure, HIPAA-compliant electronic health records accessible anytime, anywhere',
      color: 'from-green-500 to-teal-600',
      benefits: ['Cloud storage', 'Easy sharing', 'Document scanning', 'Version history']
    },
    {
      icon: Video,
      title: 'Telemedicine',
      description: 'Built-in video consultations with HD quality and secure encrypted connections',
      color: 'from-red-500 to-orange-600',
      benefits: ['HD video calls', 'Screen sharing', 'Chat messaging', 'Recording options']
    },
    {
      icon: Pill,
      title: 'Medication Management',
      description: 'Track prescriptions, set reminders, and monitor medication adherence',
      color: 'from-cyan-500 to-blue-600',
      benefits: ['Refill reminders', 'Drug interactions', 'Dosage tracking', 'Pharmacy integration']
    },
    {
      icon: BarChart3,
      title: 'Analytics & Reports',
      description: 'Powerful insights into practice performance, patient outcomes, and financial metrics',
      color: 'from-indigo-500 to-purple-600',
      benefits: ['Revenue tracking', 'Patient analytics', 'Custom reports', 'Export options']
    },
    {
      icon: CreditCard,
      title: 'Billing & Payments',
      description: 'Integrated payment processing with insurance claim management',
      color: 'from-emerald-500 to-green-600',
      benefits: ['Online payments', 'Insurance claims', 'Invoice generation', 'Payment plans']
    },
    {
      icon: MessageSquare,
      title: 'Secure Messaging',
      description: 'HIPAA-compliant messaging between doctors, patients, and staff',
      color: 'from-pink-500 to-rose-600',
      benefits: ['Encrypted messages', 'File attachments', 'Group chats', 'Read receipts']
    },
    {
      icon: Bell,
      title: 'Smart Notifications',
      description: 'Customizable alerts for appointments, lab results, and important updates',
      color: 'from-yellow-500 to-amber-600',
      benefits: ['SMS alerts', 'Email notifications', 'Push notifications', 'Custom schedules']
    }
  ];

  const securityFeatures = [
    { icon: Shield, title: 'HIPAA Compliant', description: 'Full compliance with healthcare privacy regulations' },
    { icon: Lock, title: 'End-to-End Encryption', description: 'Military-grade encryption for all data' },
    { icon: Zap, title: 'Real-Time Backups', description: 'Automatic backups every hour' },
    { icon: Heart, title: '99.9% Uptime', description: 'Reliable service you can count on' }
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

      <div className="bg-gradient-to-br from-primary/90 to-primary py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-primary-foreground mb-6">
            Powerful Features for Modern Healthcare
          </h1>
          <p className="text-xl text-primary-foreground/80 max-w-3xl mx-auto mb-8">
            Everything you need to manage your practice efficiently and provide exceptional patient care
          </p>
          <button
            onClick={() => navigate('/signup')}
            className="px-8 py-4 rounded-lg bg-background text-foreground hover:bg-background/90 font-semibold text-lg"
          >
            Start Free Trial
          </button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-foreground mb-4">
            Complete Healthcare Management Suite
          </h2>
          <p className="text-xl text-muted-foreground">All the tools you need in one integrated platform</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {mainFeatures.map((feature, index) => (
            <FeatureCard key={index} feature={feature} />
          ))}
        </div>
      </div>

      <div className="bg-slate-900 dark:bg-slate-950 py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Enterprise-Grade Security</h2>
            <p className="text-xl text-slate-300">Your data is protected with the highest security standards</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {securityFeatures.map((feature, index) => (
              <SecurityFeatureCard key={index} feature={feature} />
            ))}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-20">
        <div className="bg-gradient-to-r from-primary to-primary/80 rounded-3xl p-12 text-center">
          <h2 className="text-4xl font-bold text-primary-foreground mb-4">
            Ready to Transform Your Practice?
          </h2>
          <p className="text-xl text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
            Join thousands of healthcare professionals using Docito to deliver better patient care
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/signup')}
              className="px-8 py-4 rounded-lg bg-background text-foreground hover:bg-background/90 font-semibold text-lg"
            >
              Start Free Trial
            </button>
            <button
              onClick={() => navigate('/contact')}
              className="px-8 py-4 rounded-lg border-2 border-primary-foreground text-primary-foreground hover:bg-primary-foreground/10 font-semibold text-lg"
            >
              Schedule Demo
            </button>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

function FeatureCard({ feature }: any) {
  const Icon = feature.icon;

  return (
    <div className="bg-card rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all border-2 border-border hover:border-primary">
      <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-6`}>
        <Icon className="w-8 h-8 text-white" />
      </div>

      <h3 className="text-xl font-bold text-foreground mb-3">{feature.title}</h3>
      <p className="text-muted-foreground mb-6">{feature.description}</p>

      <ul className="space-y-2">
        {feature.benefits.map((benefit: string, index: number) => (
          <li key={index} className="flex items-center gap-2 text-sm text-foreground">
            <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
            {benefit}
          </li>
        ))}
      </ul>
    </div>
  );
}

function SecurityFeatureCard({ feature }: any) {
  const Icon = feature.icon;

  return (
    <div className="text-center">
      <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-4">
        <Icon className="w-8 h-8 text-blue-400" />
      </div>
      <h3 className="text-lg font-bold text-white mb-2">{feature.title}</h3>
      <p className="text-slate-300 text-sm">{feature.description}</p>
    </div>
  );
}
