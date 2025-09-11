import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ChevronUp } from "lucide-react";
import ResultCard from "./ResultCard";
import { useState, useEffect, useRef } from "react";

interface SearchResult {
  id: string;
  type: 'doctor' | 'practice';
  name: string;
  specialty?: string;
  location: string;
  rating: number;
  reviewCount?: number;
  availability?: string;
  acceptsInsurance?: boolean;
  acceptsNewPatients?: boolean;
  distance?: string;
  image?: string;
  bio?: string;
  experience?: string;
  languages?: string[];
  practiceName?: string;
}

interface ResultsListProps {
  results: SearchResult[];
  searchQuery: string;
  sortBy: string;
  onSortChange: (value: string) => void;
  isMobile?: boolean;
}

const ResultsList = ({ results, searchQuery, sortBy, onSortChange, isMobile = false }: ResultsListProps) => {
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      setShowScrollToTop(container.scrollTop > 200);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="flex-1 relative">
      {/* Results Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-1">
            Search Results for "{searchQuery}"
          </h2>
          <p className="text-muted-foreground">
            {results.length} {results.length === 1 ? 'result' : 'results'} found
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Label className="text-sm">Sort by:</Label>
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            className="px-3 py-2 border rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="relevance">Relevance</option>
            <option value="rating">Rating</option>
            <option value="distance">Distance</option>
            <option value="experience">Experience</option>
          </select>
        </div>
      </div>

      {/* Results Container */}
      <div 
        ref={containerRef}
        className="h-[calc(100vh-300px)] overflow-y-auto pr-2"
        style={{ scrollbarGutter: 'stable' }}
      >
        {results.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No results found. Try adjusting your filters.</p>
          </div>
        ) : (
          <div className="space-y-0">
            {results.map((result) => (
              <ResultCard 
                key={result.id} 
                result={result} 
                isMobile={isMobile}
              />
            ))}
          </div>
        )}
      </div>

      {/* Scroll to Top Button */}
      {showScrollToTop && (
        <Button
          onClick={scrollToTop}
          size="icon"
          className="fixed bottom-6 right-6 z-50 rounded-full shadow-lg"
        >
          <ChevronUp className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
};

export default ResultsList;