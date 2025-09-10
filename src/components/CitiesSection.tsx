const CitiesSection = () => {
  const cities = [
    ["New York City", "Baltimore", "Philadelphia", "Boston"],
    ["Brooklyn", "Washington, DC", "Houston", "San Francisco"], 
    ["Queens", "Seattle", "Dallas", "Miami"],
    ["Bronx", "Atlanta", "Austin", "Los Angeles"],
    ["Long Island", "Denver", "Chicago", "San Diego"]
  ];

  return (
    <section className="py-20 bg-gradient-to-b from-yellow-50 to-yellow-100">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-foreground mb-12">
          Find doctors and dentists by city
        </h2>
        
        <div className="space-y-6">
          {cities.map((row, rowIndex) => (
            <div key={rowIndex} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {row.map((city) => (
                <div key={city} className="cursor-pointer">
                  <span className="text-foreground hover:text-primary transition-colors">
                    {city}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CitiesSection;