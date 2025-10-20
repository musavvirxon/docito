import { useNavigate } from "react-router-dom";

const SpecialtiesSection = () => {
  const navigate = useNavigate();
  
  const specialties = [
    { name: "Primary Care", icon: "💝", color: "bg-yellow-100" },
    { name: "Dentist", icon: "🦷", color: "bg-yellow-100" },
    { name: "OB-GYN", icon: "👥", color: "bg-yellow-100" },
    { name: "Dermatologist", icon: "🧴", color: "bg-yellow-100" },
    { name: "Psychiatrist", icon: "🧠", color: "bg-yellow-100" },
    { name: "Eye Doctor", icon: "👁️", color: "bg-yellow-100" }
  ];
  
  const handleSpecialtyClick = (specialtyName: string) => {
    // Scroll to search results section on homepage
    const resultsSection = document.getElementById('search-results');
    if (resultsSection) {
      resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    
    // Trigger search with specialty pre-filled
    window.dispatchEvent(new CustomEvent('homepage-search', { 
      detail: {
        specialty: specialtyName,
        location: '',
        insurance: ''
      }
    }));
  };

  return (
    <section className="py-16 bg-muted">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-foreground mb-12">Top-searched specialties</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
          {specialties.map((specialty) => (
            <div 
              key={specialty.name} 
              className={`${specialty.color} rounded-lg p-6 text-center cursor-pointer hover:shadow-md transition-shadow`}
              onClick={() => handleSpecialtyClick(specialty.name)}
            >
              <div className="bg-white rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">{specialty.icon}</span>
              </div>
              <h3 className="font-medium text-foreground">{specialty.name}</h3>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SpecialtiesSection;