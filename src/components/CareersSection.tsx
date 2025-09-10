import { Button } from "@/components/ui/button";

const CareersSection = () => {
  return (
    <section className="py-20 bg-gradient-to-b from-yellow-100 to-yellow-200">
      <div className="container mx-auto px-4">
        <div className="bg-card rounded-2xl p-12 max-w-4xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Zocdoc jobs</h2>
              <h3 className="text-3xl font-bold text-foreground mb-6">
                Join us, and help transform healthcare for everyone.
              </h3>
              <Button className="bg-yellow-400 text-foreground hover:bg-yellow-500 font-medium">
                View job openings
              </Button>
            </div>
            
            <div className="flex justify-center">
              <div className="w-64 h-48 bg-yellow-400 rounded-lg flex items-center justify-center">
                <div className="text-6xl">👫</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CareersSection;