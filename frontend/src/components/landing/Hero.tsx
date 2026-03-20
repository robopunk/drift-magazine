import { SearchBar } from "./SearchBar";

interface HeroProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function Hero({ searchQuery, onSearchChange }: HeroProps) {
  return (
    <section className="py-16 sm:py-20 px-4 text-center">
      <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground leading-tight">
        What companies commit to.{" "}
        <span className="italic text-primary">What the record shows.</span>
      </h1>
      <p className="mt-4 text-muted-foreground font-sans text-base sm:text-lg max-w-2xl mx-auto">
        Drift tracks the language of corporate commitment — and the silence that
        follows when it fades.
      </p>
      <div className="mt-8 flex justify-center">
        <SearchBar value={searchQuery} onChange={onSearchChange} />
      </div>
    </section>
  );
}
