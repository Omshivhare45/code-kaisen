import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteNav } from "@/components/SiteNav";
import { StatusPill } from "./index";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "All reports · SahayogBhopal" },
      { name: "description", content: "Every citizen-submitted civic report in Bhopal with status and assigned department." },
    ],
  }),
  component: ReportsPage,
});

const STATUS = ["open", "assigned", "in_progress", "resolved"] as const;

function ReportsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>("all");

  const { data = [] } = useQuery({
    queryKey: ["reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("issue_reports")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("issue_reports").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["reports"] }); toast.success("Status updated"); },
    onError: (e) => toast.error((e as Error).message),
  });

  const filtered = filter === "all" ? data : data.filter((r) => r.status === filter);

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary">Citizen reports</h1>
            <p className="mt-1 text-sm text-muted-foreground">Every incident submitted to SahayogBhopal.</p>
          </div>
          <div className="flex flex-wrap gap-1 rounded-md bg-muted p-1 text-xs">
            {(["all", ...STATUS] as const).map((s) => (
              <button key={s} onClick={() => setFilter(s)}
                className={`rounded px-3 py-1.5 font-semibold uppercase tracking-wider ${filter === s ? "bg-background text-primary shadow" : "text-muted-foreground"}`}>
                {s.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
          <table className="w-full text-sm">
            <thead className="bg-muted text-xs uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Issue</th>
                <th className="px-4 py-3 text-left">Area</th>
                <th className="px-4 py-3 text-left">Dept</th>
                <th className="px-4 py-3 text-left">Severity</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Update</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-foreground">{r.title}</div>
                    <div className="text-xs text-muted-foreground">{r.category}</div>
                  </td>
                  <td className="px-4 py-3">{r.area}</td>
                  <td className="px-4 py-3 font-semibold text-secondary">{r.assigned_department}</td>
                  <td className="px-4 py-3 capitalize">{r.severity}</td>
                  <td className="px-4 py-3"><StatusPill status={r.status} /></td>
                  <td className="px-4 py-3">
                    {user ? (
                      <select
                        defaultValue={r.status}
                        onChange={(e) => update.mutate({ id: r.id, status: e.target.value })}
                        className="rounded border border-input bg-background px-2 py-1 text-xs"
                      >
                        {STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    ) : <span className="text-xs text-muted-foreground">Sign in to update</span>}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">No reports match this filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}