import type { Company } from "@/lib/types";

interface CompanyHeaderProps {
  company: Company;
  editorialAssessment: string | null;
}

export function CompanyHeader({ company, editorialAssessment }: CompanyHeaderProps) {
  return (
    <div className="bg-background border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs font-semibold uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded">
                {company.ticker}
              </span>
              {company.exchange && (
                <span className="font-mono text-xs text-muted-foreground">
                  {company.exchange}
                </span>
              )}
            </div>
            <h1 className="mt-1 font-serif text-2xl sm:text-3xl font-bold text-foreground">
              {company.name}
            </h1>
            {company.initiative_name && (
              <p className="font-serif italic text-muted-foreground text-sm mt-0.5">
                {company.initiative_name}
                {company.initiative_subtitle && ` — ${company.initiative_subtitle}`}
              </p>
            )}
          </div>

          {company.overall_commitment_score != null && (
            <div className="text-right shrink-0">
              <div className="text-4xl font-serif font-bold text-foreground">
                {company.overall_commitment_score}
              </div>
              <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                / 100
              </div>
            </div>
          )}
        </div>

        {editorialAssessment && (
          <div className="mt-4 p-3 border border-primary/20 rounded-lg bg-primary/5">
            <span className="font-mono text-xs font-semibold uppercase tracking-wider text-primary">
              Editorial Assessment
            </span>
            <p className="mt-1 font-serif text-sm text-foreground leading-relaxed">
              {editorialAssessment}
            </p>
          </div>
        )}

        {company.last_research_run && (
          <p className="mt-2 text-xs font-mono text-muted-foreground">
            Last updated:{" "}
            {new Date(company.last_research_run).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
        )}
      </div>
    </div>
  );
}
