import { supabase } from "@/lib/supabase";
import { CompanyGrid } from "@/components/landing/CompanyGrid";
import { SignalFeed } from "@/components/landing/SignalFeed";
import { AdSlot } from "@/components/landing/AdSlot";
import type { CompanySummary, Signal } from "@/lib/types";

async function getCompanies(): Promise<CompanySummary[]> {
  const { data, error } = await supabase
    .from("v_company_summary")
    .select("*")
    .eq("tracking_active", true)
    .order("name");

  if (error) {
    console.error("Failed to fetch companies:", error);
    return [];
  }
  return data ?? [];
}

async function getLatestSignals(): Promise<Signal[]> {
  const { data, error } = await supabase
    .from("v_latest_signals")
    .select("*")
    .eq("is_draft", false)
    .order("signal_date", { ascending: false })
    .limit(8);

  if (error) {
    console.error("Failed to fetch signals:", error);
    return [];
  }
  return data ?? [];
}

export default async function LandingPage() {
  const [companies, signals] = await Promise.all([
    getCompanies(),
    getLatestSignals(),
  ]);

  return (
    <div className="flex flex-col lg:flex-row max-w-7xl mx-auto">
      <div className="flex-1 min-w-0">
        {companies.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-muted-foreground font-sans">
              No companies tracked yet. Add one in the admin dashboard.
            </p>
          </div>
        ) : (
          <CompanyGrid companies={companies} />
        )}
      </div>

      <aside className="w-full lg:w-80 lg:ml-8 px-4 lg:px-0 py-8 lg:py-16 space-y-6 shrink-0">
        <AdSlot slot={1} />
        <SignalFeed signals={signals} />
        <AdSlot slot={2} />
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="font-mono text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
            How It Works
          </h3>
          <ol className="space-y-2 text-sm font-sans text-muted-foreground">
            <li>
              <strong className="text-foreground">1.</strong> We read what
              companies publicly commit to.
            </li>
            <li>
              <strong className="text-foreground">2.</strong> Our research agent
              monitors how the language changes.
            </li>
            <li>
              <strong className="text-foreground">3.</strong> Drift tracks when
              commitments weaken, vanish, or are buried.
            </li>
          </ol>
        </div>
      </aside>
    </div>
  );
}
