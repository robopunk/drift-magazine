"use client";

import { useState, useMemo } from "react";
import type { CompanySummary, SectorType } from "@/lib/types";
import { filterCompanies } from "@/lib/search";
import { SectorGroup } from "./SectorGroup";
import { Hero } from "./Hero";

interface CompanyGridProps {
  companies: CompanySummary[];
}

const SECTOR_ORDER: SectorType[] = [
  "pharma",
  "energy",
  "tech",
  "consumer",
  "finance",
  "industrials",
  "healthcare",
  "real_estate",
  "telecom",
  "other",
];

export function CompanyGrid({ companies }: CompanyGridProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(
    () => filterCompanies(companies, query),
    [companies, query]
  );

  const grouped = useMemo(() => {
    const map = new Map<SectorType, CompanySummary[]>();
    for (const c of filtered) {
      const list = map.get(c.sector) || [];
      list.push(c);
      map.set(c.sector, list);
    }
    return SECTOR_ORDER.filter((s) => map.has(s)).map((s) => ({
      sector: s,
      companies: map.get(s)!,
    }));
  }, [filtered]);

  return (
    <>
      <Hero searchQuery={query} onSearchChange={setQuery} />
      <div
        id="sectors"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16"
      >
        {grouped.length === 0 ? (
          <p className="text-center text-muted-foreground font-sans py-12">
            No companies match your search.
          </p>
        ) : (
          grouped.map(({ sector, companies: sectorCompanies }) => (
            <SectorGroup
              key={sector}
              sector={sector}
              companies={sectorCompanies}
            />
          ))
        )}
      </div>
    </>
  );
}
