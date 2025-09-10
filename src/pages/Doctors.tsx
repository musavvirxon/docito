import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Calendar, 
  Video, 
  DollarSign, 
  CreditCard, 
  Shield, 
  BarChart3,
  Star,
  CheckCircle,
  Stethoscope,
  Building2,
  UserCheck,
  Wifi
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const Doctors = () => {
  const benefits = [
    {
      icon: Calendar,
      title: "Appointment Management",
      description: "Easily handle online and in-person bookings with our smart scheduling system"
    },
    {
      icon: Video,
      title: "Video Consultations", 
      description: "Offer secure, high-quality video visits from anywhere with built-in telemedicine"
    },
    {
      icon: DollarSign,
      title: "Flexible Pricing",
      description: "Create your own services, set your own prices, and maintain full control"
    },
    {
      icon: CreditCard,
      title: "Built-In Payments",
      description: "Accept payments securely with no third-party integrations required"
    },
    {
      icon: Shield,
      title: "Private Medical Records",
      description: "All patient data encrypted and privacy-focused with HIPAA compliance"
    },
    {
      icon: BarChart3,
      title: "Real-Time Stats",
      description: "Monitor earnings, booking trends, and performance data in one dashboard"
    }
  ];

  const practiceTypes = [
    {
      icon: Stethoscope,
      title: "Private Practice Owners",
      description: "Perfect for independent practitioners looking to grow their patient base"
    },
    {
      icon: Building2,
      title: "Hospitals & Clinics",
      description: "Scale your operations with enterprise-level appointment management"
    },
    {
      icon: UserCheck,
      title: "Solo Practitioners",
      description: "Simple, streamlined tools designed for individual healthcare providers"
    },
    {
      icon: Wifi,
      title: "Telehealth Providers",
      description: "Built-in video consultation platform for remote care delivery"
    }
  ];

  const testimonials = [
    {
      name: "Dr. Sarah Mitchell",
      specialty: "Family Medicine",
      location: "Austin, TX",
      quote: "I moved my entire workflow here — it's simplified my schedule, payments, and patient communication.",
      image: "👩‍⚕️"
    },
    {
      name: "Dr. James Rodriguez",
      specialty: "Cardiology",
      location: "Miami, FL", 
      quote: "The video consultation feature has allowed me to see 40% more patients while maintaining quality care.",
      image: "👨‍⚕️"
    },
    {
      name: "Dr. Emily Chen",
      specialty: "Dermatology",
      location: "San Francisco, CA",
      quote: "Setting up custom pricing for my specialized treatments was incredibly easy. My revenue increased by 25%.",
      image: "👩‍⚕️"
    }
  ];

  const faqs = [
    {
      question: "Is it secure?",
      answer: "Yes, our platform is fully HIPAA-compliant with end-to-end encryption. All patient data is protected with bank-level security."
    },
    {
      question: "How does video consultation work?",
      answer: "Our built-in video platform requires no additional software. Patients join calls directly through their browser, and you can manage everything from your dashboard."
    },
    {
      question: "Can I add my own services and fees?",
      answer: "Absolutely. You have complete control over your services, pricing, and treatment offerings. Create custom packages and set your own rates."
    },
    {
      question: "What happens after I sign up?",
      answer: "After registration, you'll get access to our onboarding team who will help set up your profile, import your services, and train you on the platform."
    },
    {
      question: "Is this platform right for small practices?",
      answer: "Yes! Our platform scales from solo practitioners to large hospital systems. Small practices especially benefit from our streamlined workflow and patient acquisition tools."
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="pt-24 pb-20 bg-gradient-to-br from-blue-50 to-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="mb-6">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Trusted by 10,000+ providers
                </span>
              </div>
              
              <h1 className="text-4xl lg:text-6xl font-bold text-foreground mb-6">
                Grow Your Practice with 
                <span className="text-blue-600"> Confidence</span>
              </h1>
              
              <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
                Join thousands of healthcare professionals delivering better care, booking more appointments, and managing patients seamlessly.
              </p>
              
              <Button 
                size="lg" 
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg font-semibold"
                onClick={() => window.location.href = '/doctor-signup'}
              >
                Get Started
              </Button>
              
              <p className="text-sm text-muted-foreground mt-4">
                🔒 HIPAA-compliant platform • Free to get started
              </p>
            </div>
            
            <div className="relative">
              <div className="w-full h-96 bg-gradient-to-br from-blue-100 to-blue-50 rounded-2xl flex items-center justify-center">
                <div className="text-8xl">👨‍⚕️👩‍⚕️🦷</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What Doctors Get Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              What Doctors Get
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Everything you need to run a modern healthcare practice
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => (
              <Card key={index} className="border-border hover:shadow-lg transition-shadow duration-300">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                    <benefit.icon className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-3">
                    {benefit.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {benefit.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Who It's For Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Who It's For
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Whether you're running a large hospital or a solo practice, our platform adapts to your workflow.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {practiceTypes.map((type, index) => (
              <Card key={index} className="border-border hover:shadow-lg transition-shadow duration-300 text-center">
                <CardContent className="p-6">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <type.icon className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-3">
                    {type.title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {type.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-gradient-to-br from-blue-50 to-green-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Trusted by Healthcare Professionals
            </h2>
            <p className="text-xl text-muted-foreground">
              See how doctors are transforming their practices
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="border-border bg-background">
                <CardContent className="p-6">
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-2xl mr-4">
                      {testimonial.image}
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">{testimonial.name}</h4>
                      <p className="text-sm text-muted-foreground">{testimonial.specialty}</p>
                      <p className="text-xs text-muted-foreground">{testimonial.location}</p>
                    </div>
                  </div>
                  <p className="text-muted-foreground italic leading-relaxed">
                    "{testimonial.quote}"
                  </p>
                  <div className="flex mt-3">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Dashboard Preview Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              A Smarter Way to Manage Your Practice
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              See how our intuitive dashboard simplifies your daily workflow
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="w-full h-64 bg-gradient-to-br from-blue-100 to-blue-50 rounded-lg flex items-center justify-center mb-4 border-2 border-dashed border-blue-200">
                <div className="text-center">
                  <BarChart3 className="w-16 h-16 text-blue-600 mx-auto mb-2" />
                  <p className="text-blue-600 font-medium">Dashboard Analytics</p>
                </div>
              </div>
              <p className="text-muted-foreground">
                Track your earnings and patient stats in real time.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-full h-64 bg-gradient-to-br from-green-100 to-green-50 rounded-lg flex items-center justify-center mb-4 border-2 border-dashed border-green-200">
                <div className="text-center">
                  <Calendar className="w-16 h-16 text-green-600 mx-auto mb-2" />
                  <p className="text-green-600 font-medium">Smart Calendar</p>
                </div>
              </div>
              <p className="text-muted-foreground">
                Easily set up your services and pricing with one-click video appointments.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-xl text-muted-foreground">
              Get answers to common questions about our platform
            </p>
          </div>
          
          <div className="max-w-3xl mx-auto">
            <Accordion type="single" collapsible className="space-y-4">
              {faqs.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`} className="border border-border rounded-lg px-6 bg-background">
                  <AccordionTrigger className="text-left font-semibold text-foreground hover:no-underline">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed pt-2">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* Security & Trust Section */}
      <section className="py-16 bg-slate-900 text-white">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl lg:text-3xl font-bold mb-4">
              Your Data. Fully Protected.
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-2xl mx-auto text-center">
              <div>
                <CheckCircle className="w-6 h-6 mx-auto mb-2 text-green-400" />
                <p className="text-sm">End-to-End Encryption</p>
              </div>
              <div>
                <CheckCircle className="w-6 h-6 mx-auto mb-2 text-green-400" />
                <p className="text-sm">HIPAA Compliant</p>
              </div>
              <div>
                <CheckCircle className="w-6 h-6 mx-auto mb-2 text-green-400" />
                <p className="text-sm">Patient Data Privacy</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 bg-gradient-to-br from-blue-600 to-blue-700 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold mb-6">
            Ready to See More Patients and Simplify Your Workflow?
          </h2>
          <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
            Start for free. Set up your profile in minutes.
          </p>
          
          <Button 
            size="lg" 
            className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-4 text-lg font-semibold mr-4"
            onClick={() => window.location.href = '/doctor-signup'}
          >
            Get Started
          </Button>
          
          <p className="text-sm opacity-75 mt-6">
            Join thousands of healthcare professionals already on our platform
          </p>
        </div>
      </section>

      {/* Sticky CTA Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-blue-600 text-white p-4 shadow-lg z-50 md:hidden">
        <div className="container mx-auto flex items-center justify-between">
          <div>
            <p className="font-semibold text-sm">Ready to get started?</p>
            <p className="text-xs opacity-90">Join 10,000+ doctors</p>
          </div>
          <Button 
            className="bg-white text-blue-600 hover:bg-gray-100 font-semibold"
            onClick={() => window.location.href = '/doctor-signup'}
          >
            Get Started
          </Button>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Doctors;