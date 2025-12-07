import { Button } from "@/components/ui/button";
import { useInsuranceProviders } from "@/hooks/useInsurance";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

const InsuranceSection = () => {
  const { data: providers = [], isLoading } = useInsuranceProviders();

  // Show up to 5 providers
  const displayProviders = providers.slice(0, 5);
  const remainingCount = Math.max(0, providers.length - 5);

  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Find an in-network doctor from over {providers.length > 0 ? `${providers.length}+` : '1,000'} insurance plans
          </h2>
          <p className="text-muted-foreground text-lg">
            Add your insurance to see in-network primary care doctors
          </p>
        </div>

        {/* Insurance Providers */}
        <div className="flex flex-wrap justify-center items-center gap-8 mb-12">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="w-48 h-24 rounded-lg" />
            ))
          ) : displayProviders.length > 0 ? (
            displayProviders.map((provider) => (
              <div key={provider.id} className="bg-card border border-border rounded-lg p-6 w-48 h-24 flex items-center justify-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={provider.logo_url || ''} alt={provider.provider_name} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                    {provider.provider_name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-foreground font-medium text-center text-sm">{provider.provider_name}</span>
              </div>
            ))
          ) : (
            <p className="text-muted-foreground">No insurance providers available</p>
          )}
          {remainingCount > 0 && (
            <div className="text-center">
              <Button variant="link" className="text-primary">
                See all ({remainingCount}+)
              </Button>
            </div>
          )}
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