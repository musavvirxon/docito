import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { CheckCircle } from "lucide-react";
import { Logo } from "@/components/Logo";
import { useTranslation } from "react-i18next";

const Practices = () => {
  const { t } = useTranslation(['common', 'practices']);
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background">
        <div className="container mx-auto px-4">
          <nav className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center">
              <Logo variant="horizontal" size="sm" />
              <span className="ml-2 text-muted-foreground">{t('practices:providers.header')}</span>
            </Link>
            
            <div className="flex items-center space-x-6">
              <div className="hidden lg:flex items-center space-x-6">
                <Link to="/search-doctors" className="text-foreground hover:text-primary cursor-pointer">{t('practices:providers.nav.findDoctors')}</Link>
                <Link to="/browse-specialties" className="text-foreground hover:text-primary cursor-pointer">{t('practices:providers.nav.specialties')}</Link>
                <Link to="/features" className="text-foreground hover:text-primary cursor-pointer">{t('practices:providers.nav.features')}</Link>
                <Link to="/auth" className="text-foreground hover:text-primary cursor-pointer">{t('common:auth.signIn')}</Link>
              </div>
              <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium">
                <Link to="/register-practice">{t('common:auth.signUp')}</Link>
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
                {t('practices:providers.hero.title')}
              </h1>
              <p className="text-xl text-muted-foreground mb-8">
                {t('practices:providers.hero.description')}
              </p>
              <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 text-lg">
                <Link to="/register-practice">{t('practices:providers.hero.cta')}</Link>
              </Button>
              <p className="text-sm text-muted-foreground mt-4">
                {t('practices:providers.hero.phone')}{" "}
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
            {t('practices:providers.products.title')}
          </h2>
          
          <div className="grid lg:grid-cols-2 gap-12 mb-16">
            <Card className="bg-primary text-primary-foreground border-0">
              <CardContent className="p-8">
                <h3 className="text-2xl font-bold mb-4">
                  {t('practices:providers.products.findProviders.title')}
                </h3>
                <div className="bg-white rounded-lg p-6 mb-6">
                  <div className="text-sm text-muted-foreground mb-4">
                    {t('practices:providers.products.findProviders.subtitle')}
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
                {t('practices:providers.products.marketplace.title')}
              </h3>
              <p className="text-muted-foreground mb-6">
                {t('practices:providers.products.marketplace.description')}
              </p>
              <div className="space-x-4">
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  {t('practices:providers.products.marketplace.cta')}
                </Button>
                <Button variant="ghost" className="text-foreground underline hover:text-primary">
                  {t('practices:providers.products.marketplace.learnMore')}
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
            {t('practices:providers.solutions.title')}
          </h2>
          <p className="text-xl text-center text-muted-foreground mb-16">
            {t('practices:providers.solutions.description')}
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
                      {t('practices:providers.solutions.features.scheduling.title')}
                    </h3>
                    <Badge className="bg-green-100 text-green-800">{t('practices:providers.solutions.free')}</Badge>
                  </div>
                  <p className="text-muted-foreground mb-4">
                    {t('practices:providers.solutions.features.scheduling.description')}
                  </p>
                  <Button variant="ghost" className="text-foreground underline p-0">
                    {t('practices:providers.solutions.learnMore')}
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
                    <h3 className="text-xl font-bold text-foreground">{t('practices:providers.solutions.features.intake.title')}</h3>
                    <Badge className="bg-green-100 text-green-800">{t('practices:providers.solutions.free')}</Badge>
                  </div>
                  <p className="text-muted-foreground mb-4">
                    {t('practices:providers.solutions.features.intake.description')}
                  </p>
                  <Button variant="ghost" className="text-foreground underline p-0">
                    {t('practices:providers.solutions.learnMore')}
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
                    <h3 className="text-xl font-bold text-foreground">{t('practices:providers.solutions.features.video.title')}</h3>
                    <Badge className="bg-green-100 text-green-800">{t('practices:providers.solutions.free')}</Badge>
                  </div>
                  <p className="text-muted-foreground mb-4">
                    {t('practices:providers.solutions.features.video.description')}
                  </p>
                  <Button variant="ghost" className="text-foreground underline p-0">
                    {t('practices:providers.solutions.learnMore')}
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
                    <h3 className="text-xl font-bold text-foreground">{t('practices:providers.solutions.features.bookGoogle.title')}</h3>
                    <Badge className="bg-green-100 text-green-800">{t('practices:providers.solutions.free')}</Badge>
                  </div>
                  <p className="text-muted-foreground mb-4">
                    {t('practices:providers.solutions.features.bookGoogle.description')}
                  </p>
                  <Button variant="ghost" className="text-foreground underline p-0">
                    {t('practices:providers.solutions.learnMore')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Why you'll love Docito Section */}
          <div className="mb-16">
            <h3 className="text-3xl font-bold text-center text-foreground mb-12">
              {t('practices:providers.whyLove.title')}
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
                  {t('practices:providers.whyLove.rightPatients.title')}
                </h4>
                <p className="text-muted-foreground mb-6">
                  {t('practices:providers.whyLove.rightPatients.description')}
                </p>
                <Button variant="ghost" className="text-foreground hover:text-primary underline p-0">
                  {t('practices:providers.whyLove.rightPatients.cta')}
                </Button>
              </div>
            </div>
            
            <div className="grid lg:grid-cols-2 gap-12 items-center mt-16">
              <div>
                <h4 className="text-2xl font-bold text-foreground mb-4">
                  {t('practices:providers.whyLove.easyBooking.title')}
                </h4>
                <p className="text-muted-foreground mb-6">
                  {t('practices:providers.whyLove.easyBooking.description')}
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
                    {t('practices:providers.whyLove.saveTime.title')}
                  </h5>
                  <p className="text-muted-foreground text-sm">
                    {t('practices:providers.whyLove.saveTime.description')}
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
          <h2 className="text-4xl font-bold mb-4">{t('practices:providers.noRisk.title')}</h2>
          <p className="text-xl mb-12">{t('practices:providers.noRisk.subtitle')}</p>
          
          <Card className="max-w-4xl mx-auto bg-background text-foreground border-border">
            <CardHeader>
              <CardTitle className="text-2xl text-left">{t('practices:providers.solutions.title')}</CardTitle>
              <hr className="my-4" />
            </CardHeader>
            <CardContent className="space-y-6 text-left">
              <div>
                <h3 className="font-bold mb-2">{t('practices:providers.solutions.features.scheduling.title')}</h3>
                <p className="text-muted-foreground text-sm mb-2">
                  {t('practices:providers.solutions.features.scheduling.description')}
                </p>
                <Badge className="bg-green-100 text-green-800">{t('practices:providers.solutions.free')}</Badge>
              </div>
              
              <div>
                <h3 className="font-bold mb-2">{t('practices:providers.solutions.features.bookGoogle.title')}</h3>
                <p className="text-muted-foreground text-sm mb-2">
                  {t('practices:providers.solutions.features.bookGoogle.description')}
                </p>
                <Badge className="bg-green-100 text-green-800">{t('practices:providers.solutions.free')}</Badge>
              </div>
              
              <div>
                <h3 className="font-bold mb-2">{t('practices:providers.noRisk.features.intakeReminders')}</h3>
                <p className="text-muted-foreground text-sm mb-2">
                  {t('practices:providers.noRisk.features.intakeDescription')}
                </p>
                <Badge className="bg-green-100 text-green-800">{t('practices:providers.solutions.free')}</Badge>
              </div>
              
              <div>
                <h3 className="font-bold mb-2">{t('practices:providers.solutions.features.video.title')}</h3>
                <p className="text-muted-foreground text-sm mb-2">
                  {t('practices:providers.solutions.features.video.description')}
                </p>
                <Badge className="bg-green-100 text-green-800">Free</Badge>
              </div>
              
              <hr className="my-6" />
              
              <div>
                <h3 className="text-xl font-bold mb-4">{t('practices:providers.products.marketplace.title')}</h3>
                
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-1">{t('practices:providers.noRisk.features.existingPatients')}</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      {t('practices:providers.noRisk.features.existingDescription')}
                    </p>
                    <Badge className="bg-green-100 text-green-800">{t('practices:providers.solutions.free')}</Badge>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-1">{t('practices:providers.noRisk.features.newPatients')}</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      {t('practices:providers.noRisk.features.newPatientsDescription')}
                    </p>
                    <div>
                      <span className="font-medium">{t('practices:providers.noRisk.features.oneTimeFee')}</span>
                      <p className="text-xs text-muted-foreground">
                        {t('practices:providers.noRisk.features.feeNote')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <Button className="w-full bg-yellow-400 text-foreground hover:bg-yellow-500 h-12 text-lg font-medium">
                {t('practices:providers.noRisk.cta')}
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-lg text-muted-foreground mb-12">
            {t('practices:providers.trust.subtitle')}
          </h2>
          
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="bg-muted/30 h-64 rounded-lg flex items-center justify-center">
                <span className="text-muted-foreground">{t('practices:providers.trust.illustrationPlaceholder')}</span>
              </div>
            </div>
            
            <div className="text-left">
              <h3 className="text-4xl font-bold text-foreground mb-6">
                {t('practices:providers.trust.title')}
              </h3>
              <p className="text-muted-foreground mb-6">
                {t('practices:providers.trust.description1')}
              </p>
              <p className="text-muted-foreground mb-8">
                {t('practices:providers.trust.description2')}
              </p>
              <div className="space-y-4">
                <Button className="bg-yellow-400 text-foreground hover:bg-yellow-500">
                  {t('practices:providers.trust.cta')}
                </Button>
                <div>
                  <Link to="#" className="text-foreground underline">
                    {t('practices:providers.trust.enterprise')}
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
                {t('practices:providers.healthSystems.title')}
              </h2>
              <h3 className="text-2xl font-semibold text-foreground mb-8">
                {t('practices:providers.healthSystems.subtitle')}
              </h3>
              
              <Button className="bg-yellow-400 text-foreground hover:bg-yellow-500 font-medium">
                {t('practices:providers.healthSystems.cta')}
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
              {t('practices:providers.cities.title')}
            </h2>
            <p className="text-lg text-muted-foreground">
              {t('practices:providers.cities.subtitle')}
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
            {t('practices:providers.careers.title')}
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            {t('practices:providers.careers.description')}
          </p>
          <Button className="bg-yellow-400 text-foreground hover:bg-yellow-500 font-medium">
            {t('practices:providers.careers.cta')}
          </Button>
        </div>
      </section>

      {/* Visit Reasons Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              {t('practices:providers.visitReasons.title')}
            </h2>
            <p className="text-lg text-muted-foreground">
              {t('practices:providers.visitReasons.subtitle')}
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
              <Logo variant="horizontal" size="sm" className="mb-4" />
              <p className="text-muted-foreground text-sm">
                {t('practices:providers.footer.tagline')}
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold text-foreground mb-4">{t('practices:providers.footer.discover.title')}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="#" className="hover:text-foreground">{t('practices:providers.footer.discover.bookDoctor')}</Link></li>
                <li><Link to="#" className="hover:text-foreground">{t('practices:providers.footer.discover.readReviews')}</Link></li>
                <li><Link to="#" className="hover:text-foreground">{t('practices:providers.footer.discover.findInsurance')}</Link></li>
                <li><Link to="#" className="hover:text-foreground">{t('practices:providers.footer.discover.downloadApp')}</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-foreground mb-4">{t('practices:providers.footer.forProviders.title')}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="#" className="hover:text-foreground">{t('practices:providers.footer.forProviders.listPractice')}</Link></li>
                <li><Link to="#" className="hover:text-foreground">{t('practices:providers.footer.forProviders.resources')}</Link></li>
                <li><Link to="#" className="hover:text-foreground">{t('practices:providers.footer.forProviders.enterprise')}</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-foreground mb-4">{t('practices:providers.footer.company.title')}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="#" className="hover:text-foreground">{t('practices:providers.footer.company.about')}</Link></li>
                <li><Link to="#" className="hover:text-foreground">{t('practices:providers.footer.company.careers')}</Link></li>
                <li><Link to="#" className="hover:text-foreground">{t('practices:providers.footer.company.press')}</Link></li>
                <li><Link to="#" className="hover:text-foreground">{t('practices:providers.footer.company.blog')}</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-foreground mb-4">{t('practices:providers.footer.support.title')}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="#" className="hover:text-foreground">{t('practices:providers.footer.support.helpCenter')}</Link></li>
                <li><Link to="#" className="hover:text-foreground">{t('practices:providers.footer.support.contact')}</Link></li>
                <li><Link to="#" className="hover:text-foreground">{t('practices:providers.footer.support.privacy')}</Link></li>
                <li><Link to="#" className="hover:text-foreground">{t('practices:providers.footer.support.terms')}</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-border mt-12 pt-8 text-center text-sm text-muted-foreground">
            <p>{t('practices:providers.footer.copyright', { year: 2024 })}</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Practices;