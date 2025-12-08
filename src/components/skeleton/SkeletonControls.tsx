import { Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { BoneCategory, BONE_CATEGORIES, CATEGORY_COLORS } from './types';

interface SkeletonControlsProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activeCategory: BoneCategory | 'All';
  onCategoryChange: (category: BoneCategory | 'All') => void;
  boneSuggestions?: { english_name: string; latin_name: string }[];
}

export function SkeletonControls({
  searchQuery,
  onSearchChange,
  activeCategory,
  onCategoryChange,
  boneSuggestions = [],
}: SkeletonControlsProps) {
  const filteredSuggestions = boneSuggestions
    .filter(
      (bone) =>
        searchQuery.length > 1 &&
        (bone.english_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          bone.latin_name.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    .slice(0, 5);

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search bones by name..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
        
        {/* Autocomplete Suggestions */}
        {filteredSuggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-20 overflow-hidden"
          >
            {filteredSuggestions.map((bone, index) => (
              <button
                key={index}
                onClick={() => onSearchChange(bone.english_name)}
                className="w-full px-4 py-2 text-left hover:bg-muted/50 transition-colors flex items-center justify-between"
              >
                <span className="font-medium text-sm">{bone.english_name}</span>
                <span className="text-xs text-muted-foreground italic">{bone.latin_name}</span>
              </button>
            ))}
          </motion.div>
        )}
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={activeCategory === 'All' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onCategoryChange('All')}
          className="transition-all"
        >
          <Filter className="h-3 w-3 mr-1" />
          All
        </Button>
        
        {BONE_CATEGORIES.map((category) => (
          <Button
            key={category}
            variant={activeCategory === category ? 'default' : 'outline'}
            size="sm"
            onClick={() => onCategoryChange(category)}
            className="transition-all"
            style={
              activeCategory === category
                ? { backgroundColor: CATEGORY_COLORS[category], borderColor: CATEGORY_COLORS[category] }
                : {}
            }
          >
            {category}
          </Button>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 pt-2 border-t border-border">
        {BONE_CATEGORIES.map((category) => (
          <div key={category} className="flex items-center gap-1.5">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: CATEGORY_COLORS[category] }}
            />
            <span className="text-xs text-muted-foreground">{category}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
