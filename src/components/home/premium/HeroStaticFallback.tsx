import { memo } from 'react';
import { 
  Building2, 
  Stethoscope, 
  FlaskConical, 
  Pill, 
  Users,
  Heart,
} from 'lucide-react';

const nodes = [
  { id: 'hospital', name: 'Hospital', Icon: Building2, color: '#3b82f6', x: 50, y: 20 },
  { id: 'clinic', name: 'Clinic', Icon: Heart, color: '#ec4899', x: 85, y: 35 },
  { id: 'lab', name: 'Laboratory', Icon: FlaskConical, color: '#8b5cf6', x: 80, y: 70 },
  { id: 'pharmacy', name: 'Pharmacy', Icon: Pill, color: '#10b981', x: 50, y: 85 },
  { id: 'doctor', name: 'Doctors', Icon: Stethoscope, color: '#06b6d4', x: 20, y: 70 },
  { id: 'patient', name: 'Patients', Icon: Users, color: '#f59e0b', x: 15, y: 35 },
];

function HeroStaticFallback({ onClick }: { onClick?: () => void }) {
  return (
    <div 
      className="relative w-full h-full flex items-center justify-center cursor-pointer group"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
      aria-label="Click to load interactive 3D globe"
    >
      {/* Static globe representation */}
      <div className="relative w-80 h-80 md:w-96 md:h-96">
        {/* Globe base */}
        <div 
          className="absolute inset-8 rounded-full animate-pulse"
          style={{
            background: 'radial-gradient(circle at 30% 30%, #1e88e5, #0d47a1 70%, #1565c0)',
            boxShadow: '0 0 60px rgba(59, 130, 246, 0.3), inset -20px -20px 60px rgba(0,0,0,0.3)',
          }}
        />
        
        {/* Atmosphere glow */}
        <div 
          className="absolute inset-4 rounded-full opacity-30"
          style={{
            background: 'radial-gradient(circle, transparent 60%, #4fc3f7 100%)',
          }}
        />
        
        {/* Orbiting nodes */}
        {nodes.map((node, index) => {
          const IconComponent = node.Icon;
          return (
            <div
              key={node.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-transform group-hover:scale-110"
              style={{
                left: `${node.x}%`,
                top: `${node.y}%`,
                animation: `float-${index} 3s ease-in-out infinite`,
                animationDelay: `${index * 0.2}s`,
              }}
            >
              <div 
                className="flex items-center justify-center rounded-full"
                style={{
                  width: 44,
                  height: 44,
                  backgroundColor: `${node.color}40`,
                  border: `2px solid ${node.color}80`,
                  boxShadow: `0 0 20px ${node.color}60`,
                }}
              >
                <IconComponent size={20} style={{ color: node.color }} />
              </div>
            </div>
          );
        })}
        
        {/* Connection lines (static) */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
          {nodes.map((node) => (
            <line
              key={`line-${node.id}`}
              x1="50%"
              y1="50%"
              x2={`${node.x}%`}
              y2={`${node.y}%`}
              stroke={node.color}
              strokeWidth="1"
              strokeDasharray="4 4"
            />
          ))}
        </svg>
        
        {/* Hover overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="bg-background/80 backdrop-blur-sm px-4 py-2 rounded-full border border-border">
            <span className="text-sm text-muted-foreground">Click to explore</span>
          </div>
        </div>
      </div>
      
      <style>{`
        @keyframes float-0 { 0%, 100% { transform: translate(-50%, -50%) translateY(0); } 50% { transform: translate(-50%, -50%) translateY(-8px); } }
        @keyframes float-1 { 0%, 100% { transform: translate(-50%, -50%) translateY(0); } 50% { transform: translate(-50%, -50%) translateY(-6px); } }
        @keyframes float-2 { 0%, 100% { transform: translate(-50%, -50%) translateY(0); } 50% { transform: translate(-50%, -50%) translateY(-10px); } }
        @keyframes float-3 { 0%, 100% { transform: translate(-50%, -50%) translateY(0); } 50% { transform: translate(-50%, -50%) translateY(-7px); } }
        @keyframes float-4 { 0%, 100% { transform: translate(-50%, -50%) translateY(0); } 50% { transform: translate(-50%, -50%) translateY(-9px); } }
        @keyframes float-5 { 0%, 100% { transform: translate(-50%, -50%) translateY(0); } 50% { transform: translate(-50%, -50%) translateY(-5px); } }
      `}</style>
    </div>
  );
}

export default memo(HeroStaticFallback);
