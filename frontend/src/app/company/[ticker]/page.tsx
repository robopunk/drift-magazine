import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Company, Objective, Signal } from "@/lib/types";
import { CompanyHeader } from "@/components/company/CompanyHeader";
import { CompanyPageClient } from "./client";

interface Props {
  params: Promise<{ ticker: string }>;
}

async function getCompanyByTicker(ticker: string): Promise<Company | null> {
  const { data } = await supabase
    .from("companies")
    .select("*")
    .ilike("ticker", ticker)
    .single();
  return data;
}

async function getObjectives(companyId: string): Promise<Objective[]> {
  const { data } = await supabase
    .from("objectives")
    .select("*")
    .eq("company_id", companyId)
    .order("momentum_score", { ascending: false });
  return data ?? [];
}

async function getSignals(companyId: string): Promise<Signal[]> {
  const { data } = await supabase
    .from("signals")
    .select("*")
    .eq("company_id", companyId)
    .eq("is_draft", false)
    .order("signal_date", { ascending: false });
  return data ?? [];
}

export default async function CompanyPage({ params }: Props) {
  const { ticker } = await params;
  const company = await getCompanyByTicker(ticker);

  if (!company) notFound();

  const [objectives, signals] = await Promise.all([
    getObjectives(company.id),
    getSignals(company.id),
  ]);

  const proved = objectives.filter((o) => o.terminal_state === "proved");
  const buried = objectives.filter((o) => o.terminal_state === "buried");
  const active = objectives.filter((o) => o.terminal_state === null);

  return (
    <>
      <CompanyHeader company={company} editorialAssessment={null} />
      <CompanyPageClient
        company={company}
        objectives={objectives}
        activeObjectives={active}
        provedObjectives={proved}
        buriedObjectives={buried}
        signals={signals}
      />
    </>
  );
}
