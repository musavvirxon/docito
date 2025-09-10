import { Button } from "@/components/ui/button";

const HealthSystemsSection = () => {
  const healthSystems = [
    "MedStar Health",
    "Mount Sinai",
    "Tufts Medical Center",
    "Montefiore",
    "Intermountain Health", 
    "Houston Methodist"
  ];

  return (
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
            {healthSystems.map((system) => (
              <div key={system} className="bg-card border border-border rounded-lg p-6 text-center">
                <span className="text-foreground font-medium">{system}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HealthSystemsSection;