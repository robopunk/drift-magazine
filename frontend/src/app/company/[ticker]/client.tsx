"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import type { Company, Objective, Signal } from "@/lib/types";
import { TabBar, type TabId } from "@/components/company/TabBar";
import { AdSlot } from "@/components/landing/AdSlot";
import { TimelineCanvas } from "@/components/company/TimelineCanvas";
import { MobileObjectiveList } from "@/components/mobile/MobileObjectiveList";

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
          <div className="text-center py-20 text-muted-foreground font-sans">
            Objectives tab — implemented in Task 11.
          </div>
        )}
        {activeTab === "buried" && (
          <div className="text-center py-20 text-muted-foreground font-sans">
            Buried tab — implemented in Task 12.
          </div>
        )}
        {activeTab === "evidence" && (
          <div className="text-center py-20 text-muted-foreground font-sans">
            Evidence tab — implemented in Task 13.
          </div>
        )}
      </div>
      <AdSlot slot={3} className="max-w-7xl mx-auto px-4 mb-8" />
    </>
  );
}
