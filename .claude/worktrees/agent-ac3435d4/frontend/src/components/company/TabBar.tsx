"use client";

export type TabId = "timeline" | "objectives" | "proved" | "buried" | "evidence";

interface TabBarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  counts: {
    objectives: number;
    proved: number;
    buried: number;
    evidence: number;
  };
}

const TABS: { id: TabId; label: string; countKey?: keyof TabBarProps["counts"] }[] = [
  { id: "timeline", label: "Timeline" },
  { id: "objectives", label: "Objectives", countKey: "objectives" },
  { id: "proved", label: "Proved", countKey: "proved" },
  { id: "buried", label: "Buried", countKey: "buried" },
  { id: "evidence", label: "Evidence", countKey: "evidence" },
];

export function TabBar({ activeTab, onTabChange, counts }: TabBarProps) {
  return (
    <div className="border-b border-border sticky top-16 z-40 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-0">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const count = tab.countKey ? counts[tab.countKey] : undefined;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`px-4 py-3 text-sm font-sans font-medium border-b-2 transition-colors ${
                isActive
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
              {count != null && (
                <span
                  className={`ml-1.5 text-xs font-mono px-1.5 py-0.5 rounded-full ${
                    tab.id === "proved" && count > 0
                      ? "bg-primary/10 text-primary"
                      : tab.id === "buried" && count > 0
                      ? "bg-destructive/10 text-destructive"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
