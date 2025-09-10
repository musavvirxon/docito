import { Button } from "@/components/ui/button";

const FeaturesSection = () => {
  return (
    <section className="py-20 bg-gradient-to-b from-yellow-50 to-yellow-100">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-foreground mb-4">
            Let's get you a doc who gets you
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Feature 1 */}
          <div className="text-center">
            <div className="mb-8">
              <div className="w-64 h-48 mx-auto bg-white rounded-lg flex items-center justify-center mb-6">
                <div className="text-6xl">👩‍⚕️👤</div>
              </div>
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-4">
              Browse providers who take your insurance
            </h3>
            <Button variant="outline" className="mt-4">
              See specialties
            </Button>
          </div>

          {/* Feature 2 */}
          <div className="text-center">
            <div className="mb-8">
              <div className="w-64 h-48 mx-auto bg-white rounded-lg flex items-center justify-center mb-6">
                <div className="text-6xl">⭐📄</div>
              </div>
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-4">
              Read reviews from users
            </h3>
            <Button variant="outline" className="mt-4">
              See providers
            </Button>
          </div>

          {/* Feature 3 */}
          <div className="text-center">
            <div className="mb-8">
              <div className="w-64 h-48 mx-auto bg-white rounded-lg flex items-center justify-center mb-6">
                <div className="text-6xl">👨‍⚕️📅</div>
              </div>
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-4">
              Book an appointment today, online
            </h3>
            <Button variant="outline" className="mt-4">
              See availability
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;