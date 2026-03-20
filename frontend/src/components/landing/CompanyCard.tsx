import Link from "next/link";
import type { CompanySummary } from "@/lib/types";
import { scoreToStage, getStageEmoji } from "@/lib/momentum";

interface CompanyCardProps {
  company: CompanySummary;
}

export function CompanyCard({ company }: CompanyCardProps) {
  const topStage =
    company.overall_commitment_score != null
      ? scoreToStage(
          Math.round((company.overall_commitment_score / 100) * 8 - 4)
        )
      : "watch";

  return (
    <Link
      href={`/company/${company.ticker.toLowerCase()}`}
      className="block bg-card border border-border rounded-lg p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
    >
      <div className="flex items-start justify-between mb-2">
        <span className="font-mono text-xs font-semibold uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded">
          {company.ticker}
        </span>
        <span className="text-lg" title={topStage}>
          {getStageEmoji(topStage)}
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

      {company.overall_commitment_score != null && (
        <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${company.overall_commitment_score}%` }}
          />
        </div>
      )}
    </Link>
  );
}
