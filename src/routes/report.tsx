import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SiteNav } from "@/components/SiteNav";
import { BHOPAL_AREAS, CATEGORIES } from "@/lib/bhopal-data";
import { toast } from "sonner";

export const Route = createFileRoute("/report")({
  head: () => ({
    meta: [
      { title: "Report an issue · SahayogBhopal" },
      { name: "description", content: "Report potholes, pollution, waterlogging or blockages anywhere in Bhopal." },
    ],
  }),
  component: ReportPage,
});

function ReportPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: CATEGORIES[0].value as string,
    severity: "medium",
    area: BHOPAL_AREAS[0].name,
  });
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) { nav({ to: "/auth" }); return; }
    setBusy(true);
    const area = BHOPAL_AREAS.find((a) => a.name === form.area)!;
    const category = CATEGORIES.find((c) => c.value === form.category)!;
    const { error } = await supabase.from("issue_reports").insert({
      reporter_id: user.id,
      title: form.title,
      description: form.description,
      category: form.category,
      severity: form.severity,
      area: form.area,
      lat: area.lat,
      lng: area.lng,
      assigned_department: category.dept,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Report submitted — thank you!");
    nav({ to: "/reports" });
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <div className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-bold tracking-tight text-primary">Report an issue</h1>
        <p className="mt-2 text-muted-foreground">
          Tell us what's happening on the street. We'll route it to the right department automatically.
        </p>

        {!loading && !user && (
          <div className="mt-6 rounded-md border border-accent/60 bg-accent/10 p-4 text-sm">
            You need an account to submit. <Link to="/auth" className="font-semibold text-secondary hover:underline">Sign in</Link>.
          </div>
        )}

        <form onSubmit={submit} className="mt-8 space-y-4 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
          <Field label="Short title">
            <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Deep pothole near Habibganj station"
              className={inputCls} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Category">
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputCls}>
                {CATEGORIES.map((c) => (<option key={c.value} value={c.value}>{c.label}</option>))}
              </select>
            </Field>
            <Field label="Area">
              <select value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} className={inputCls}>
                {BHOPAL_AREAS.map((a) => (<option key={a.name} value={a.name}>{a.name}</option>))}
              </select>
            </Field>
            <Field label="Severity">
              <select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })} className={inputCls}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </Field>
            <Field label="Auto-routed to">
              <div className="rounded-md border border-input bg-muted px-3 py-2 text-sm font-semibold text-primary">
                {CATEGORIES.find((c) => c.value === form.category)?.dept}
              </div>
            </Field>
          </div>
          <Field label="Description">
            <textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Add any details that help the responder find and fix this."
              className={inputCls} />
          </Field>
          <button
            disabled={busy || !user}
            className="w-full rounded-md bg-accent py-3 text-sm font-bold text-accent-foreground shadow-[var(--shadow-elegant)] transition-transform hover:scale-[1.01] disabled:opacity-60"
          >
            {busy ? "Submitting…" : "Submit report"}
          </button>
        </form>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/30";
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}