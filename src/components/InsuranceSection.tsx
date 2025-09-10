import { Button } from "@/components/ui/button";

const InsuranceSection = () => {
  const insuranceProviders = [
    { name: "Aetna", logo: "aetna" },
    { name: "Cigna", logo: "cigna" },
    { name: "United Healthcare", logo: "united" },
    { name: "Medicare", logo: "medicare" },
    { name: "BlueCross BlueShield", logo: "bluecross" }
  ];

  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Find an in-network doctor from over 1,000 insurance plans
          </h2>
          <p className="text-muted-foreground text-lg">
            Add your insurance to see in-network primary care doctors
          </p>
        </div>

        {/* Insurance Providers */}
        <div className="flex flex-wrap justify-center items-center gap-8 mb-12">
          {insuranceProviders.map((provider) => (
            <div key={provider.name} className="bg-card border border-border rounded-lg p-6 w-48 h-24 flex items-center justify-center">
              <span className="text-foreground font-medium text-center">{provider.name}</span>
            </div>
          ))}
          <div className="text-center">
            <Button variant="link" className="text-primary">
              See all (1,000+)
            </Button>
          </div>
        </div>

        <div className="text-center">
          <Button variant="outline" className="mb-8">
            Add your insurance coverage
          </Button>
        </div>
      </div>
    </section>
  );
};

export default InsuranceSection;