"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import type { Company, Objective, Signal } from "@/lib/types";
import { TabBar, type TabId } from "@/components/company/TabBar";
import { AdSlot } from "@/components/landing/AdSlot";
import { TimelineCanvas } from "@/components/company/TimelineCanvas";
import { MobileObjectiveList } from "@/components/mobile/MobileObjectiveList";
import { ObjectiveCard } from "@/components/company/ObjectiveCard";
import { BuriedCard } from "@/components/company/BuriedCard";
import { EvidenceTable } from "@/components/company/EvidenceTable";

interface CompanyPageClientProps {
  company: Company;
  objectives: Objective[];
  activeObjectives: Objective[];
  buriedObjectives: Objective[];
  signals: Signal[];
}

export function CompanyPageClient({
  company,
  objectives,
  activeObjectives,
  buriedObjectives,
  signals,
}: CompanyPageClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialTab = (searchParams.get("tab") as TabId) || "timeline";
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);

  function handleTabChange(tab: TabId) {
    setActiveTab(tab);
    const url =
      tab === "timeline"
        ? `/company/${company.ticker.toLowerCase()}`
        : `/company/${company.ticker.toLowerCase()}?tab=${tab}`;
    router.replace(url, { scroll: false });
  }

  return (
    <>
      <TabBar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        counts={{
          objectives: activeObjectives.length,
          buried: buriedObjectives.length,
          evidence: signals.length,
        }}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === "timeline" && (
          <>
            <div className="hidden md:block">
              <TimelineCanvas
                objectives={objectives}
                signals={signals}
                onNavigateToEvidence={(signalId) => handleTabChange("evidence")}
              />
            </div>
            <div className="block md:hidden">
              <MobileObjectiveList objectives={objectives} />
            </div>
          </>
        )}
        {activeTab === "objectives" && (
          activeObjectives.length === 0 ? (
            <p className="text-center py-20 text-muted-foreground font-sans">No objectives tracked yet for {company.name}.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeObjectives.map((obj) => (
                <ObjectiveCard key={obj.id} objective={obj} signals={signals.filter((s) => s.objective_id === obj.id)} />
              ))}
            </div>
          )
        )}
        {activeTab === "buried" && (
          buriedObjectives.length === 0 ? (
            <div className="text-center py-20">
              <p className="font-serif text-lg text-foreground">No buried objectives.</p>
              <p className="font-sans text-sm text-muted-foreground mt-1">All commitments remain on record.</p>
            </div>
          ) : (
            <>
              <div className="mb-6 p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{"\u26B0\uFE0F"}</span>
                  <h2 className="font-serif font-bold text-lg text-foreground">The Buried</h2>
                </div>
                <p className="font-serif italic text-sm text-muted-foreground">Objectives that companies stated publicly and then quietly dropped, reframed, or allowed to disappear without announcement.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {buriedObjectives.map((obj) => (<BuriedCard key={obj.id} objective={obj} />))}
              </div>
            </>
          )
        )}
        {activeTab === "evidence" && (<EvidenceTable signals={signals} objectives={objectives} />)}
      </div>
      <AdSlot slot={3} className="max-w-7xl mx-auto px-4 mb-8" />
    </>
  );
}
