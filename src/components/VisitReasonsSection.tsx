import { ChevronDown } from "lucide-react";

const VisitReasonsSection = () => {
  const categories = [
    "Medical",
    "Dental", 
    "Mental Health",
    "Vision"
  ];

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-foreground mb-12">
          Common visit reasons
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {categories.map((category) => (
            <div key={category} className="cursor-pointer group">
              <div className="flex items-center justify-between p-4 border-b border-border group-hover:border-primary transition-colors">
                <span className="text-foreground font-medium">{category}</span>
                <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default VisitReasonsSection;