import SearchBar from "@/components/patient/SearchBar";

interface SearchResultsHeaderProps {
  searchQuery: string;
  onSearch: (results: any[]) => void;
}

const SearchResultsHeader = ({ searchQuery, onSearch }: SearchResultsHeaderProps) => {
  return (
    <header className="sticky top-20 z-40 bg-primary/5 border-b border-border">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold text-foreground">
            Find the right care for you
          </h1>
        </div>
        <SearchBar 
          onSearch={onSearch}
          className="max-w-4xl"
          showResultsInline={true}
        />
      </div>
    </header>
  );
};

export default SearchResultsHeader;