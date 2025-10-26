import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { CheckCircle } from "lucide-react";
import { Logo } from "@/components/Logo";

const Practices = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background">
        <div className="container mx-auto px-4">
          <nav className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center">
              <Logo variant="horizontal" size="sm" />
              <span className="ml-2 text-muted-foreground">for Providers</span>
            </Link>
            
            <div className="flex items-center space-x-6">
              <div className="hidden lg:flex items-center space-x-6">
                <Link to="/search-doctors" className="text-foreground hover:text-primary cursor-pointer">Find Doctors</Link>
                <Link to="/browse-specialties" className="text-foreground hover:text-primary cursor-pointer">Specialties</Link>
                <Link to="/features" className="text-foreground hover:text-primary cursor-pointer">Features</Link>
                <Link to="/auth" className="text-foreground hover:text-primary cursor-pointer">Log in</Link>
              </div>
              <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium">
                <Link to="/register-practice">Sign up</Link>
              </Button>
            </div>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-5xl font-bold text-foreground mb-6">
                The easiest way to grow your practice
              </h1>
              <p className="text-xl text-muted-foreground mb-8">
                Docito helps you bring in more new patients and keep them coming
                back – while saving your practice valuable time.
              </p>
              <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 text-lg">
                <Link to="/register-practice">Get started</Link>
              </Button>
              <p className="text-sm text-muted-foreground mt-4">
                Want to speak to us? Call us at{" "}
                <Link to="tel:(212) 204-7108" className="text-blue-600 hover:text-blue-800 underline">
                  (212) 204-7108
                </Link>
              </p>
            </div>
            <div className="bg-muted/30 h-96 rounded-lg flex items-center justify-center">
              <span className="text-muted-foreground">Illustration Placeholder</span>
            </div>
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section className="py-20 bg-muted/20">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center text-foreground mb-16">
            Products you can start using today
          </h2>
          
          <div className="grid lg:grid-cols-2 gap-12 mb-16">
            <Card className="bg-primary text-primary-foreground border-0">
              <CardContent className="p-8">
                <h3 className="text-2xl font-bold mb-4">
                  Docito is where patients find providers
                </h3>
                <div className="bg-white rounded-lg p-6 mb-6">
                  <div className="text-sm text-muted-foreground mb-4">
                    Book local doctors who take your insurance
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 bg-muted rounded"></div>
                    <div className="h-3 bg-muted rounded w-3/4"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <div>
              <h3 className="text-2xl font-bold text-foreground mb-4">
                Docito Marketplace
              </h3>
              <p className="text-muted-foreground mb-6">
                List your practice on Docito to reach millions of
                people searching for care each month. Pay only for
                first-time new patient bookings.
              </p>
              <div className="space-x-4">
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  Get started
                </Button>
                <Button variant="ghost" className="text-foreground underline hover:text-primary">
                  See how it works
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Practice Solutions Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center text-foreground mb-4">
            Docito Practice Solutions
          </h2>
          <p className="text-xl text-center text-muted-foreground mb-16">
            Fully manage your private practice. Reach, manage, and keep patients with free and easy-to-use tools. Take payments, view stats, add your own custom services or treatments, store patient history, view stats of your providers and staff.
          </p>
          
          <div className="grid md:grid-cols-2 gap-8 mb-16">
            <Card>
              <CardContent className="p-0">
                <div className="bg-green-400 h-48 rounded-t-lg flex items-center justify-center">
                  <span className="text-white">Demo Image Placeholder</span>
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-xl font-bold text-foreground">
                      Online scheduling from your website
                    </h3>
                    <Badge className="bg-green-100 text-green-800">Free</Badge>
                  </div>
                  <p className="text-muted-foreground mb-4">
                    Give patients a convenient way to book directly from
                    your practice's website 24/7.
                  </p>
                  <Button variant="ghost" className="text-foreground underline p-0">
                    Learn more
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-0">
                <div className="bg-green-400 h-48 rounded-t-lg flex items-center justify-center">
                  <span className="text-white">Demo Image Placeholder</span>
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-xl font-bold text-foreground">Intake</h3>
                    <Badge className="bg-green-100 text-green-800">Free</Badge>
                  </div>
                  <p className="text-muted-foreground mb-4">
                    Send text reminders and collect insurance cards, IDs,
                    and your office forms online ahead of appointments.
                  </p>
                  <Button variant="ghost" className="text-foreground underline p-0">
                    Learn more
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-0">
                <div className="bg-green-400 h-48 rounded-t-lg flex items-center justify-center">
                  <span className="text-white">Demo Image Placeholder</span>
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-xl font-bold text-foreground">Video Service</h3>
                    <Badge className="bg-green-100 text-green-800">Free</Badge>
                  </div>
                  <p className="text-muted-foreground mb-4">
                    See patients virtually with an integrated, HIPAA
                    compliant video experience.
                  </p>
                  <Button variant="ghost" className="text-foreground underline p-0">
                    Learn more
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-0">
                <div className="bg-green-400 h-48 rounded-t-lg flex items-center justify-center">
                  <span className="text-white">Demo Image Placeholder</span>
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-xl font-bold text-foreground">Book from Google & other search engines</h3>
                    <Badge className="bg-green-100 text-green-800">Free</Badge>
                  </div>
                  <p className="text-muted-foreground mb-4">
                    Let patients book with you directly from the top places 
                    they are searching for care, like Google, Apple, Bing and others.
                  </p>
                  <Button variant="ghost" className="text-foreground underline p-0">
                    Learn more
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Why you'll love Zocdoc Section */}
          <div className="mb-16">
            <h3 className="text-3xl font-bold text-center text-foreground mb-12">
              Why you'll love Docito
            </h3>
            
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="bg-yellow-50 rounded-lg p-8 mb-8">
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4 text-sm text-muted-foreground font-medium">
                      <span>PATIENT</span>
                      <span>VISIT REASON</span>
                      <span>STATUS</span>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-4 items-center">
                        <div>
                          <div className="font-medium">Harriet M.</div>
                          <div className="text-sm text-green-600">In-network</div>
                        </div>
                        <div>Anxiety</div>
                        <Badge className="bg-green-100 text-green-800 w-fit">BOOKED</Badge>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 items-center">
                        <div>
                          <div className="font-medium">Carol A.</div>
                          <div className="text-sm text-green-600">In-network</div>
                        </div>
                        <div>Physical</div>
                        <Badge className="bg-green-100 text-green-800 w-fit">BOOKED</Badge>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 items-center">
                        <div>
                          <div className="font-medium">Marco R.</div>
                          <div className="text-sm text-green-600">In-network</div>
                        </div>
                        <div>Joint Pain</div>
                        <Badge className="bg-green-100 text-green-800 w-fit">BOOKED</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="text-2xl font-bold text-foreground mb-4">
                  Get the right new patients for your practice
                </h4>
                <p className="text-muted-foreground mb-6">
                  Showcase your practice to the largest group of patients searching for care online. Only accept patients for the insurances and visit reasons you list.
                </p>
                <Button variant="ghost" className="text-foreground hover:text-primary underline p-0">
                  How Marketplace works
                </Button>
              </div>
            </div>
            
            <div className="grid lg:grid-cols-2 gap-12 items-center mt-16">
              <div>
                <h4 className="text-2xl font-bold text-foreground mb-4">
                  Make it easy for patients to book with you online
                </h4>
                <p className="text-muted-foreground mb-6">
                  Turn patient interest into bookings anywhere patients find you online – whether that's through search engines (such as Google), your website, or the Docito Marketplace.
                </p>
              </div>
              
              <div className="space-y-6">
                <div className="bg-muted/30 rounded-lg p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold">
                      SJ
                    </div>
                    <div>
                      <div className="font-medium">Sally Jones</div>
                      <div className="text-sm text-blue-600">New Patient</div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span>Insurance</span>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-muted-foreground text-sm">UPLOADED</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span>ID Card</span>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-muted-foreground text-sm">UPLOADED</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span>Forms</span>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-muted-foreground text-sm">UPLOADED</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h5 className="font-bold text-foreground mb-2">
                    Save time collecting essential information from patients
                  </h5>
                  <p className="text-muted-foreground text-sm">
                    Receive insurance cards, IDs, and forms from all your patients, before they arrive for their appointment.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* No Risk Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-4">No risk to get started</h2>
          <p className="text-xl mb-12">No upfront fees or subscription costs.</p>
          
          <Card className="max-w-4xl mx-auto bg-background text-foreground border-border">
            <CardHeader>
              <CardTitle className="text-2xl text-left">Docito Practice Solutions</CardTitle>
              <hr className="my-4" />
            </CardHeader>
            <CardContent className="space-y-6 text-left">
              <div>
                <h3 className="font-bold mb-2">Online scheduling from your website</h3>
                <p className="text-muted-foreground text-sm mb-2">
                  Give patients a convenient way to book directly from your practice's
                  website 24/7.
                </p>
                <Badge className="bg-green-100 text-green-800">Free</Badge>
              </div>
              
              <div>
                <h3 className="font-bold mb-2">Book from Google</h3>
                <p className="text-muted-foreground text-sm mb-2">
                  Let patients book with you directly from the top places they are
                  searching for care, like Google, Apple, Bing and others.
                </p>
                <Badge className="bg-green-100 text-green-800">Free</Badge>
              </div>
              
              <div>
                <h3 className="font-bold mb-2">Intake and reminders</h3>
                <p className="text-muted-foreground text-sm mb-2">
                  Collect insurance cards, IDs, and your office forms from all patients,
                  even those who call to book.
                </p>
                <Badge className="bg-green-100 text-green-800">Free</Badge>
              </div>
              
              <div>
                <h3 className="font-bold mb-2">Video Service</h3>
                <p className="text-muted-foreground text-sm mb-2">
                  See patients virtually with an integrated, HIPAA compliant video
                  experience.
                </p>
                <Badge className="bg-green-100 text-green-800">Free</Badge>
              </div>
              
              <hr className="my-6" />
              
              <div>
                <h3 className="text-xl font-bold mb-4">Zocdoc Marketplace</h3>
                
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-1">Your existing patients</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Bookings made by your existing patients through the Marketplace
                      are free.
                    </p>
                    <Badge className="bg-green-100 text-green-800">Free</Badge>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-1">New patients from Zocdoc.com</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Receive bookings from new patients through Zocdoc.com or the
                      Zocdoc mobile app.
                    </p>
                    <div>
                      <span className="font-medium">One-time fee for first booking</span>
                      <p className="text-xs text-muted-foreground">
                        Varies by specialty and location
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <Button className="w-full bg-yellow-400 text-foreground hover:bg-yellow-500 h-12 text-lg font-medium">
                Get started
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-lg text-muted-foreground mb-12">
            From solo practitioners to large health systems
          </h2>
          
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="bg-muted/30 h-64 rounded-lg flex items-center justify-center">
                <span className="text-muted-foreground">Building Illustration</span>
              </div>
            </div>
            
            <div className="text-left">
              <h3 className="text-4xl font-bold text-foreground mb-6">
                Zocdoc is trusted by 100,000+ providers
              </h3>
              <p className="text-muted-foreground mb-6">
                Zocdoc is built for practices who care about delivering a great patient
                experience – from solo practitioners to the largest health systems in
                the country.
              </p>
              <p className="text-muted-foreground mb-8">
                Primary care doctors, dentists, OB-GYNs, and more than 250 other
                specialties have turned to Zocdoc for over 15 years to reach the
                patients they can best treat.
              </p>
              <div className="space-y-4">
                <Button className="bg-yellow-400 text-foreground hover:bg-yellow-500">
                  Get started
                </Button>
                <div>
                  <Link to="#" className="text-foreground underline">
                    Zocdoc for Enterprise
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Health Systems Section */}
      <section className="py-20 bg-muted">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-foreground mb-4">
                Zocdoc for health systems
              </h2>
              <h3 className="text-2xl font-semibold text-foreground mb-8">
                We're trusted by top health systems
              </h3>
              
              <Button className="bg-yellow-400 text-foreground hover:bg-yellow-500 font-medium">
                Partner with Zocdoc
              </Button>
            </div>
            
            <div className="grid grid-cols-2 gap-6">
              {['MedStar Health', 'Mount Sinai', 'Tufts Medical Center', 'Montefiore', 'Intermountain Health', 'Houston Methodist'].map((system) => (
                <div key={system} className="bg-card border border-border rounded-lg p-6 text-center">
                  <span className="text-foreground font-medium">{system}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Cities Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Find care in your city
            </h2>
            <p className="text-lg text-muted-foreground">
              Book appointments with top-rated doctors in your area
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[
              'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia',
              'San Antonio', 'San Diego', 'Dallas', 'Austin', 'San Jose', 'Fort Worth',
              'Jacksonville', 'Columbus', 'Charlotte', 'Indianapolis', 'San Francisco', 'Seattle'
            ].map((city) => (
              <Button key={city} variant="ghost" className="text-left justify-start h-auto p-3">
                {city}
              </Button>
            ))}
          </div>
        </div>
      </section>

      {/* Careers Section */}
      <section className="py-20 bg-muted">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Work at Zocdoc
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join our mission to give power to the patient. We're looking for passionate people to help us transform healthcare.
          </p>
          <Button className="bg-yellow-400 text-foreground hover:bg-yellow-500 font-medium">
            View open positions
          </Button>
        </div>
      </section>

      {/* Visit Reasons Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Book by visit reason
            </h2>
            <p className="text-lg text-muted-foreground">
              Find the right care for your specific needs
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[
              'Annual Physical', 'Teeth Cleaning', 'Eye Exam', 'Skin Check',
              'Therapy', 'Vaccine', 'Blood Test', 'X-Ray',
              'Consultation', 'Follow-up', 'Urgent Care', 'Specialist Visit'
            ].map((reason) => (
              <Button key={reason} variant="outline" className="h-auto p-4 text-center">
                {reason}
              </Button>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-muted py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
            <div className="lg:col-span-1">
              <div className="flex items-center mb-4">
                <div className="bg-yellow-400 rounded-full w-8 h-8 flex items-center justify-center mr-2">
                  <span className="text-foreground font-bold text-lg">Z</span>
                </div>
                <span className="text-xl font-semibold text-foreground">Zocdoc</span>
              </div>
              <p className="text-muted-foreground text-sm">
                Making healthcare more human
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold text-foreground mb-4">Discover</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="#" className="hover:text-foreground">Book a doctor</Link></li>
                <li><Link to="#" className="hover:text-foreground">Read reviews</Link></li>
                <li><Link to="#" className="hover:text-foreground">Find insurance</Link></li>
                <li><Link to="#" className="hover:text-foreground">Download our app</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-foreground mb-4">For providers</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="#" className="hover:text-foreground">List your practice</Link></li>
                <li><Link to="#" className="hover:text-foreground">Provider resources</Link></li>
                <li><Link to="#" className="hover:text-foreground">Enterprise solutions</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-foreground mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="#" className="hover:text-foreground">About us</Link></li>
                <li><Link to="#" className="hover:text-foreground">Careers</Link></li>
                <li><Link to="#" className="hover:text-foreground">Press</Link></li>
                <li><Link to="#" className="hover:text-foreground">Blog</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-foreground mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="#" className="hover:text-foreground">Help center</Link></li>
                <li><Link to="#" className="hover:text-foreground">Contact us</Link></li>
                <li><Link to="#" className="hover:text-foreground">Privacy policy</Link></li>
                <li><Link to="#" className="hover:text-foreground">Terms of service</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-border mt-12 pt-8 text-center text-sm text-muted-foreground">
            <p>© 2024 Zocdoc, Inc. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Practices;