import { STAGES } from "@/lib/momentum";

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="font-serif text-3xl font-bold text-foreground">
        About Drift<span className="text-primary">.</span>
      </h1>
      <p className="mt-4 font-serif text-foreground leading-relaxed">
        Drift is a strategic accountability research platform. We track what major
        companies publicly commit to — and monitor how that language changes, weakens,
        or disappears over time.
      </p>
      <p className="mt-3 font-serif text-muted-foreground leading-relaxed">
        Most tools measure outcomes. Drift measures the{" "}
        <em>language of commitment</em> and the silence that follows when commitment fades.
      </p>
      <h2 id="methodology" className="mt-12 font-serif text-2xl font-bold text-foreground">Methodology</h2>
      <p className="mt-4 font-sans text-foreground leading-relaxed">Every company tracked by Drift goes through the same process:</p>
      <ol className="mt-4 space-y-3 font-sans text-foreground">
        <li><strong>1. Intake</strong> — We identify the company&apos;s publicly stated strategic objectives from investor communications, earnings calls, and official disclosures.</li>
        <li><strong>2. Monitoring</strong> — Our research agent reviews new disclosures bi-weekly, classifying each mention as reinforced, softened, reframed, or absent.</li>
        <li><strong>3. Classification</strong> — Each objective is placed on the Momentum Scale based on the evidence trail.</li>
        <li><strong>4. Editorial review</strong> — Every signal is a draft until a human reviewer approves it. The agent reads; the human verifies.</li>
      </ol>
      <h2 className="mt-12 font-serif text-2xl font-bold text-foreground">The Momentum Scale</h2>
      <p className="mt-4 font-sans text-muted-foreground">Nine stages from Orbit (+4) to Buried (-4). The ground line at zero separates alive commitments from those entering graveyard territory.</p>
      <div className="mt-6 space-y-2">
        {STAGES.map((stage) => (
          <div key={stage.name} className="flex items-center gap-3 p-2 rounded bg-card border border-border">
            <span className="text-xl w-8 text-center">{stage.emoji}</span>
            <div className="flex-1">
              <span className="font-mono text-xs font-semibold uppercase tracking-wider" style={{ color: stage.colour }}>
                {stage.label} ({stage.score > 0 ? "+" : ""}{stage.score})
              </span>
              <p className="font-serif italic text-xs text-muted-foreground mt-0.5">{stage.caption}</p>
            </div>
          </div>
        ))}
      </div>
      <h2 className="mt-12 font-serif text-2xl font-bold text-foreground">The Buried</h2>
      <p className="mt-4 font-sans text-foreground leading-relaxed">
        The Graveyard records objectives that companies stated publicly and then quietly dropped,
        reframed, or allowed to disappear. Each entry is classified by how it ended: Silent Drop,
        Phased Out, Morphed, or Transparent Exit.
      </p>
    </div>
  );
}
