import Link from "next/link";
import type { CompanySummary } from "@/lib/types";
import { TIER_COLOURS } from "@/lib/accountability";

interface CompanyCardProps {
  company: CompanySummary;
}

export function CompanyCard({ company }: CompanyCardProps) {
  return (
    <Link
      href={`/company/${company.ticker.toLowerCase()}`}
      className="block bg-card border border-border rounded-lg p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
    >
      <div className="flex items-start justify-between mb-2">
        <span className="font-mono text-xs font-semibold uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded">
          {company.ticker}
        </span>
      </div>

      <h3 className="font-serif font-bold text-card-foreground text-base leading-snug">
        {company.name}
      </h3>

      {company.editorial_verdict && (
        <p className="mt-1.5 text-sm font-serif italic text-muted-foreground leading-relaxed line-clamp-2">
          {company.editorial_verdict}
        </p>
      )}

      <div className="mt-3 flex items-center gap-3 text-xs font-mono text-muted-foreground">
        <span>{company.active_count} active</span>
        {company.drifting_count > 0 && (
          <span className="text-status-drifting">
            {company.drifting_count} drifting
          </span>
        )}
        {company.buried_count > 0 && (
          <span className="text-status-dropped">{company.buried_count}</span>
        )}
      </div>

      {company.accountability_tier != null && (
        <div className="mt-2 flex items-center justify-between">
          <span
            className="font-mono text-[0.72rem] font-semibold uppercase tracking-[0.06em]"
            style={{ color: TIER_COLOURS[company.accountability_tier] }}
          >
            {company.accountability_tier}
          </span>
          {company.overall_commitment_score != null && (
            <span className="font-mono text-[0.6rem] text-muted-foreground">
              {company.overall_commitment_score}
            </span>
          )}
        </div>
      )}
    </Link>
  );
}
