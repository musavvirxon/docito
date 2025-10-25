import { useState } from 'react';
import { Logo } from '@/components/Logo';
import Footer from '@/components/Footer';
import { 
  Search, Book, Video, FileText, CreditCard, 
  Users, Calendar, HelpCircle, ChevronRight 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function HelpCenter() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const categories = [
    {
      icon: Book,
      title: 'Getting Started',
      description: 'Learn the basics of using Docito',
      articleCount: 12,
      color: 'from-blue-500 to-indigo-600',
      articles: ['Creating your account', 'Setting up your profile', 'First-time user guide', 'Platform overview']
    },
    {
      icon: Calendar,
      title: 'Appointments',
      description: 'Booking and managing appointments',
      articleCount: 15,
      color: 'from-green-500 to-teal-600',
      articles: ['How to book an appointment', 'Rescheduling appointments', 'Cancellation policy', 'Appointment reminders']
    },
    {
      icon: Video,
      title: 'Telemedicine',
      description: 'Video consultations and virtual care',
      articleCount: 8,
      color: 'from-purple-500 to-pink-600',
      articles: ['Starting a video call', 'Technical requirements', 'Troubleshooting video issues', 'Recording consultations']
    },
    {
      icon: FileText,
      title: 'Medical Records',
      description: 'Managing your health records',
      articleCount: 10,
      color: 'from-orange-500 to-red-600',
      articles: ['Uploading documents', 'Sharing records with doctors', 'Downloading your records', 'Privacy and security']
    },
    {
      icon: CreditCard,
      title: 'Billing & Payments',
      description: 'Payment methods and insurance',
      articleCount: 9,
      color: 'from-cyan-500 to-blue-600',
      articles: ['Adding payment methods', 'Understanding your bill', 'Insurance claims', 'Payment plans']
    },
    {
      icon: Users,
      title: 'Account Management',
      description: 'Managing your account settings',
      articleCount: 11,
      color: 'from-pink-500 to-rose-600',
      articles: ['Updating profile information', 'Changing password', 'Privacy settings', 'Notification preferences']
    }
  ];

  const popularArticles = [
    { title: 'How do I book my first appointment?', views: '15.2K' },
    { title: 'What payment methods are accepted?', views: '12.8K' },
    { title: 'How to join a video consultation', views: '11.4K' },
    { title: 'Canceling or rescheduling appointments', views: '9.7K' },
    { title: 'Uploading medical documents', views: '8.3K' }
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
          <HelpCircle className="w-16 h-16 text-primary-foreground mx-auto mb-6" />
          <h1 className="text-5xl font-bold text-primary-foreground mb-6">How can we help you?</h1>
          <p className="text-xl text-primary-foreground/80 mb-8">Search our knowledge base for answers</p>

          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search for help articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-16 pr-6 py-5 rounded-2xl text-lg border-none shadow-2xl bg-card text-foreground"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-foreground mb-8">Browse by Category</h2>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category, index) => (
            <CategoryCard key={index} category={category} />
          ))}
        </div>
      </div>

      <div className="bg-card py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-foreground mb-8">Popular Articles</h2>

          <div className="space-y-4">
            {popularArticles.map((article, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-6 bg-background rounded-xl hover:bg-accent cursor-pointer transition-all border-2 border-transparent hover:border-primary"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    {index + 1}
                  </div>
                  <span className="text-lg font-medium text-foreground">{article.title}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">{article.views} views</span>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16">
        <div className="bg-gradient-to-r from-primary to-primary/80 rounded-3xl p-12 text-center">
          <h2 className="text-3xl font-bold text-primary-foreground mb-4">Still need help?</h2>
          <p className="text-xl text-primary-foreground/80 mb-8">
            Our support team is here to assist you 24/7
          </p>
          <button
            onClick={() => navigate('/contact')}
            className="px-8 py-4 rounded-lg bg-background text-foreground hover:bg-background/90 font-semibold text-lg"
          >
            Contact Support
          </button>
        </div>
      </div>

      <Footer />
    </div>
  );
}

function CategoryCard({ category }: any) {
  const Icon = category.icon;

  return (
    <div className="bg-card rounded-xl p-6 shadow-lg hover:shadow-xl transition-all cursor-pointer border-2 border-border hover:border-primary group">
      <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${category.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
        <Icon className="w-7 h-7 text-white" />
      </div>

      <h3 className="text-xl font-bold text-foreground mb-2">{category.title}</h3>
      <p className="text-sm text-muted-foreground mb-4">{category.description}</p>
      <p className="text-sm text-primary font-semibold mb-4">{category.articleCount} articles</p>

      <ul className="space-y-2">
        {category.articles.map((article: string, index: number) => (
          <li key={index} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary cursor-pointer">
            <ChevronRight className="w-4 h-4" />
            {article}
          </li>
        ))}
      </ul>
    </div>
  );
}
