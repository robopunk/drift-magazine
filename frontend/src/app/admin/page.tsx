"use client";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { Signal, AgentRun } from "@/lib/types";

export default function AdminPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginError, setLoginError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [draftSignals, setDraftSignals] = useState<Signal[]>([]);
  const [recentRuns, setRecentRuns] = useState<AgentRun[]>([]);

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setLoading(false);
      if (data.session) {
        loadData();
      }
    }
    init();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s) {
        loadData();
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadData() {
    const [signalRes, runRes] = await Promise.all([
      supabase.from("signals").select("*").eq("is_draft", true).order("signal_date", { ascending: false }),
      supabase.from("agent_runs").select("*").order("created_at", { ascending: false }).limit(10),
    ]);
    setDraftSignals(signalRes.data ?? []);
    setRecentRuns(runRes.data ?? []);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoginError(error.message);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    setSession(null);
    setDraftSignals([]);
    setRecentRuns([]);
  }

  async function approveSignal(id: string) {
    await supabase.from("signals").update({
      is_draft: false,
      reviewed_at: new Date().toISOString(),
      reviewed_by: session?.user?.email ?? "admin-ui",
    }).eq("id", id);
    setDraftSignals((prev) => prev.filter((s) => s.id !== id));
  }

  async function rejectSignal(id: string) {
    await supabase.from("signals").delete().eq("id", id);
    setDraftSignals((prev) => prev.filter((s) => s.id !== id));
  }

  if (loading) {
    return (
      <div className="max-w-md mx-auto mt-20 p-8 text-center">
        <p className="font-sans text-muted-foreground text-sm">Loading...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="max-w-md mx-auto mt-20 p-8 bg-card border border-border rounded-lg">
        <h1 className="font-serif text-2xl font-bold text-foreground mb-6">Admin Login</h1>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 bg-background border border-border rounded font-sans text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 bg-background border border-border rounded font-sans text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          {loginError && (
            <p className="text-sm text-destructive font-sans mt-2">{loginError}</p>
          )}
          <button
            type="submit"
            className="w-full px-4 py-2 bg-primary text-primary-foreground rounded font-sans font-medium hover:opacity-90 transition-opacity"
          >
            Sign In
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-serif text-2xl font-bold text-foreground">Admin Dashboard</h1>
        <button
          onClick={handleSignOut}
          className="px-3 py-1 border border-border rounded text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
        >
          Sign Out
        </button>
      </div>
      <section className="mb-12">
        <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-4">Pending Review ({draftSignals.length})</h2>
        {draftSignals.length === 0 ? (
          <p className="text-muted-foreground font-sans">No signals pending review.</p>
        ) : (
          <div className="space-y-3">
            {draftSignals.map((signal) => (
              <div key={signal.id} className="bg-card border border-border rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-xs text-muted-foreground">{signal.signal_date} &middot; {signal.classification}</span>
                    {signal.excerpt && <p className="font-serif italic text-sm text-card-foreground mt-1">&ldquo;{signal.excerpt}&rdquo;</p>}
                    {signal.agent_reasoning && <p className="font-sans text-xs text-muted-foreground mt-1">{signal.agent_reasoning}</p>}
                  </div>
                  <div className="flex gap-2 shrink-0 ml-4">
                    <button onClick={() => approveSignal(signal.id)} className="px-3 py-1 bg-primary text-primary-foreground rounded text-xs font-sans">Approve</button>
                    <button onClick={() => rejectSignal(signal.id)} className="px-3 py-1 bg-destructive text-destructive-foreground rounded text-xs font-sans">Reject</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      <section>
        <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-4">Recent Agent Runs</h2>
        {recentRuns.length === 0 ? (
          <p className="text-muted-foreground font-sans">No agent runs recorded.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="font-mono text-xs uppercase tracking-wider text-muted-foreground py-2">Date</th>
                <th className="font-mono text-xs uppercase tracking-wider text-muted-foreground py-2">Status</th>
                <th className="font-mono text-xs uppercase tracking-wider text-muted-foreground py-2">Proposed</th>
                <th className="font-mono text-xs uppercase tracking-wider text-muted-foreground py-2">Approved</th>
                <th className="font-mono text-xs uppercase tracking-wider text-muted-foreground py-2">Cost</th>
              </tr>
            </thead>
            <tbody>
              {recentRuns.map((run) => (
                <tr key={run.id} className="border-b border-border">
                  <td className="font-mono text-xs py-2">{run.created_at}</td>
                  <td className="font-mono text-xs py-2">{run.status}</td>
                  <td className="font-mono text-xs py-2">{run.signals_proposed}</td>
                  <td className="font-mono text-xs py-2">{run.signals_approved}</td>
                  <td className="font-mono text-xs py-2">{run.estimated_cost_usd ? `$${run.estimated_cost_usd.toFixed(2)}` : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
