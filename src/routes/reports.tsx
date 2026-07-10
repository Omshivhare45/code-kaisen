import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SiteNav } from "@/components/SiteNav";
import { StatusPill } from "./index";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";

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
  const { user, isPrivileged } = useAuth();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>("all");

  const { data = [], refetch } = useQuery({
    queryKey: ["reports"],
    queryFn: async () => {
      const data = await api.issues.getAll();
      return data;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await api.issues.updateStatus(id, status);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["reports"] }); toast.success("Status updated"); },
    onError: (e: any) => toast.error(e.message || "Failed to update status"),
  });

  const reassign = useMutation({
    mutationFn: async ({ id, primaryDeptId }: { id: string; primaryDeptId: string }) => {
      await api.issues.reassign(id, primaryDeptId, []);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["reports"] }); toast.success("Reassigned successfully"); },
    onError: (e: any) => toast.error(e.message || "Failed to reassign"),
  });

  const { data: departments = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      if (isPrivileged) {
        return await api.departments.getAll();
      }
      return [];
    },
    enabled: isPrivileged,
  });

  const filtered = filter === "all" ? data : data.filter((r: any) => r.status === filter);

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
                <th className="px-4 py-3 text-left">Primary Dept</th>
                <th className="px-4 py-3 text-left">Severity</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Update</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r: any) => (
                <tr key={r._id} className="border-t border-border">
                  <td className="px-4 py-3">
                    <div className="flex items-start gap-3">
                      {r.photoUrl ? (
                        <a href={r.photoUrl} target="_blank" rel="noreferrer" className="shrink-0">
                          <img src={r.photoUrl} alt="" className="h-14 w-14 rounded-md border border-border object-cover" />
                        </a>
                      ) : null}
                      <div>
                        <div className="font-semibold text-foreground">{r.title}</div>
                        <div className="text-xs text-muted-foreground">{r.category}</div>
                        {r.clusterId && r.clusterId !== r._id && (
                          <span className="mt-1 inline-block rounded bg-secondary/20 px-1.5 py-0.5 text-[10px] font-semibold text-secondary">Duplicate/Cluster</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">{r.area}</td>
                  <td className="px-4 py-3 font-semibold text-secondary">
                    {r.primaryDepartment?.name || "Unassigned"}
                    {isPrivileged && (
                      <select
                        onChange={(e) => reassign.mutate({ id: r._id, primaryDeptId: e.target.value })}
                        className="ml-2 rounded border border-input bg-background px-1 py-0.5 text-[10px]"
                        value={r.primaryDepartment?._id || ""}
                      >
                        <option value="" disabled>Reassign...</option>
                        {departments.map((d: any) => (
                          <option key={d._id} value={d._id}>{d.name}</option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td className="px-4 py-3 capitalize">{r.urgencyScore}/10</td>
                  <td className="px-4 py-3"><StatusPill status={r.status} /></td>
                  <td className="px-4 py-3">
                    {isPrivileged ? (
                      <select
                        defaultValue={r.status}
                        onChange={(e) => updateStatus.mutate({ id: r._id, status: e.target.value })}
                        className="rounded border border-input bg-background px-2 py-1 text-xs"
                      >
                        {STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    ) : <span className="text-xs text-muted-foreground">Officers only</span>}
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