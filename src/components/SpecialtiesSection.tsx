import { useNavigate, useParams } from "react-router-dom";

const SpecialtiesSection = () => {
  const navigate = useNavigate();
  const { lang } = useParams();
  
  const specialties = [
    { name: "Primary Care", key: "generalPractice", icon: "💝", color: "bg-yellow-100" },
    { name: "Dentist", key: "dentistry", icon: "🦷", color: "bg-yellow-100" },
    { name: "OB-GYN", key: "obgyn", icon: "👥", color: "bg-yellow-100" },
    { name: "Dermatologist", key: "dermatology", icon: "🧴", color: "bg-yellow-100" },
    { name: "Psychiatrist", key: "psychiatry", icon: "🧠", color: "bg-yellow-100" },
    { name: "Eye Doctor", key: "ophthalmology", icon: "👁️", color: "bg-yellow-100" }
  ];
  
  const handleSpecialtyClick = (specialtyKey: string) => {
    const basePath = lang ? `/${lang}` : '';
    navigate(`${basePath}/search-doctors?specialty=${specialtyKey}`);
  };

  return (
    <section className="py-16 bg-muted">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-foreground mb-12">Top-searched specialties</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
          {specialties.map((specialty) => (
            <div 
              key={specialty.key} 
              className={`${specialty.color} rounded-lg p-6 text-center cursor-pointer hover:shadow-md transition-shadow`}
              onClick={() => handleSpecialtyClick(specialty.key)}
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