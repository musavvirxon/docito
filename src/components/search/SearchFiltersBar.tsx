import { memo } from 'react';
import { motion } from 'framer-motion';
import { 
  Stethoscope, 
  Building2, 
  Pill, 
  FlaskConical, 
  ScanLine 
} from 'lucide-react';
import { Toggle } from '@/components/ui/toggle';
import { cn } from '@/lib/utils';
import type { SearchFilters } from '@/hooks/useUnifiedSearch';

interface SearchFiltersBarProps {
  filters: SearchFilters;
  onFilterChange: (key: keyof SearchFilters) => void;
  resultCounts?: {
    doctors: number;
    clinics: number;
    pharmacies: number;
    labs: number;
    imaging: number;
  };
  className?: string;
}

const filterConfig = [
  { key: 'doctors' as const, label: 'Doctors', icon: Stethoscope },
  { key: 'clinics' as const, label: 'Clinics', icon: Building2 },
  { key: 'pharmacies' as const, label: 'Pharmacies', icon: Pill },
  { key: 'labs' as const, label: 'Labs', icon: FlaskConical },
  { key: 'imaging' as const, label: 'Imaging', icon: ScanLine },
];

const SearchFiltersBar = memo(({ 
  filters, 
  onFilterChange, 
  resultCounts,
  className 
}: SearchFiltersBarProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex flex-wrap items-center gap-2 p-3 bg-card/80 backdrop-blur-sm border border-border rounded-xl sticky top-20 z-30",
        className
      )}
    >
      <span className="text-sm font-medium text-muted-foreground mr-2">
        Filter by:
      </span>
      
      {filterConfig.map(({ key, label, icon: Icon }) => {
        const isActive = filters[key];
        const count = resultCounts?.[key] ?? 0;
        
        return (
          <Toggle
            key={key}
            pressed={isActive}
            onPressedChange={() => onFilterChange(key)}
            className={cn(
              "flex items-center gap-2 px-3 py-2 h-auto rounded-lg transition-all duration-200",
              "data-[state=on]:bg-primary data-[state=on]:text-primary-foreground",
              "data-[state=off]:bg-muted/50 data-[state=off]:text-muted-foreground data-[state=off]:hover:bg-muted"
            )}
          >
            <Icon className="w-4 h-4" />
            <span className="text-sm font-medium">{label}</span>
            {resultCounts && (
              <span className={cn(
                "text-xs px-1.5 py-0.5 rounded-full",
                isActive 
                  ? "bg-primary-foreground/20 text-primary-foreground" 
                  : "bg-muted-foreground/20"
              )}>
                {count}
              </span>
            )}
          </Toggle>
        );
      })}
    </motion.div>
  );
});

SearchFiltersBar.displayName = 'SearchFiltersBar';

export default SearchFiltersBar;
