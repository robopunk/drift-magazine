"use client";

import { useState } from "react";
import type { CompanySummary, SectorType } from "@/lib/types";
import { CompanyCard } from "./CompanyCard";

const SECTOR_LABELS: Record<SectorType, string> = {
  pharma: "Pharma",
  tech: "Technology",
  energy: "Energy",
  consumer: "Consumer",
  finance: "Finance",
  industrials: "Industrials",
  healthcare: "Healthcare",
  real_estate: "Real Estate",
  telecom: "Telecom",
  other: "Other",
};

interface SectorGroupProps {
  sector: SectorType;
  companies: CompanySummary[];
}

export function SectorGroup({ sector, companies }: SectorGroupProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <section id={`sector-${sector}`} className="mb-8">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 mb-4 group"
      >
        <h2 className="font-mono text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {SECTOR_LABELS[sector]}
        </h2>
        <span className="font-mono text-xs text-muted-foreground">
          ({companies.length})
        </span>
        <svg
          className={`w-4 h-4 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {expanded && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {companies.map((company) => (
            <CompanyCard key={company.id} company={company} />
          ))}
        </div>
      )}
    </section>
  );
}
