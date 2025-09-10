import { Button } from "@/components/ui/button";

const AppSection = () => {
  return (
    <section className="py-20 bg-gradient-to-r from-yellow-200 to-yellow-300">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-4xl font-bold text-foreground mb-4">
              Thousands of providers.<br />
              One app.
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              The Zocdoc app is the quickest, easiest way to book and keep track of your appointments.
            </p>
            <p className="text-foreground mb-8">
              Scan the QR code to get the app now
            </p>
            
            {/* QR Code */}
            <div className="bg-white p-4 rounded-lg w-32 h-32 mb-8">
              <div className="w-full h-full bg-foreground rounded opacity-20"></div>
            </div>
            
            {/* App Store Buttons */}
            <div className="flex space-x-4">
              <Button variant="outline" className="bg-foreground text-background hover:bg-foreground/90">
                📱 App Store
              </Button>
              <Button variant="outline" className="bg-foreground text-background hover:bg-foreground/90">
                📱 Google Play
              </Button>
            </div>
          </div>
          
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-64 h-96 bg-foreground rounded-3xl p-2">
                <div className="w-full h-full bg-yellow-400 rounded-2xl flex items-center justify-center">
                  <span className="text-foreground text-lg font-semibold">Zocdoc App</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AppSection;