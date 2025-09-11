import SearchBar from "@/components/patient/SearchBar";

interface SearchResultsHeaderProps {
  searchQuery: string;
  onSearch: (results: any[]) => void;
}

const SearchResultsHeader = ({ searchQuery, onSearch }: SearchResultsHeaderProps) => {
  return (
    <div className="bg-primary/5 border-b border-border">
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-2xl font-semibold text-foreground mb-4">
          Find the right care for you
        </h1>
        <SearchBar 
          onSearch={onSearch}
          className="max-w-4xl"
          showResultsInline={true}
        />
      </div>
    </div>
  );
};

export default SearchResultsHeader;