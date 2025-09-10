import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const PracticeSection = () => {
  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="relative">
            <div className="w-full h-80 bg-muted rounded-lg flex items-center justify-center">
              <div className="text-6xl">👩‍⚕️💻</div>
            </div>
          </div>
          
          <div>
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Zocdoc for private practices
            </h2>
            <h3 className="text-2xl font-semibold text-foreground mb-6">
              Are you a practice interested in filling your calendar?
            </h3>
            
            <ul className="space-y-4 mb-8">
              <li className="flex items-start">
                <span className="text-primary mr-3">•</span>
                <span className="text-foreground">Reach millions of new patients on zocdoc.com</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-3">•</span>
                <span className="text-foreground">Make it easy for patients to book with you in all the places they look for care</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-3">•</span>
                <div className="flex items-center">
                  <span className="text-foreground mr-2">Eliminate hold times for patients with</span>
                  <span className="underline text-foreground mr-2">Zo, your AI phone assistant</span>
                  <Badge className="bg-yellow-400 text-foreground">New</Badge>
                </div>
              </li>
            </ul>
            
            <Button 
              className="bg-yellow-400 text-foreground hover:bg-yellow-500 font-medium px-8"
              onClick={() => window.location.href = '/register-practice'}
            >
              Get Started
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PracticeSection;