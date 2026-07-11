import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SiteNav } from "@/components/SiteNav";
import { StatusPill } from "./index";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { BrainCircuit, X, RefreshCw, Link as LinkIcon, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";

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
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [activeIssue, setActiveIssue] = useState<any>(null);
  const [linkedIssueIds, setLinkedIssueIds] = useState<string[]>([]);

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

  const generateAiPlan = useMutation({
    mutationFn: async (id: string) => await api.issues.generateAiPlan(id),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["reports"] });
      setActiveIssue(data.issue);
      toast.success("AI Plan generated successfully!");
    },
    onError: (e: any) => toast.error(e.message || "Failed to generate AI plan"),
  });

  const generateAiOrder = useMutation({
    mutationFn: async (id: string) => await api.issues.generateAiOrder(id),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["reports"] });
      setActiveIssue(data.issue);
      toast.success("Professional order drafted successfully!");
    },
    onError: (e: any) => toast.error(e.message || "Failed to draft order"),
  });

  const addDependency = useMutation({
    mutationFn: async ({ id, dependentDept, prereqDept, estimatedTime }: { id: string, dependentDept: string, prereqDept: string, estimatedTime?: string }) => {
      await api.issues.addDependency(id, dependentDept, prereqDept, "AI Suggested Dependency", estimatedTime);
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["reports"] });
      setLinkedIssueIds((prev) => [...prev, variables.id]);
      toast.success("Department linked successfully!");
    },
    onError: (e: any) => toast.error(e.message || "Failed to link department"),
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
                <th className="px-4 py-3 text-left">AI Plan</th>
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
                    {isPrivileged && (
                      <button
                        onClick={() => {
                          setActiveIssue(r);
                          setAiModalOpen(true);
                          if (!r.aiResolutionPlan) {
                            generateAiPlan.mutate(r._id);
                          }
                        }}
                        className={`inline-flex items-center gap-1.5 rounded border px-2 py-1 text-xs font-semibold transition-colors ${
                          r.aiResolutionPlan
                            ? "border-secondary/30 bg-secondary/10 text-secondary hover:bg-secondary/20"
                            : "border-border bg-card text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        <BrainCircuit className="h-3.5 w-3.5" />
                        {r.aiResolutionPlan ? "View Plan" : "Generate"}
                      </button>
                    )}
                  </td>
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

      {/* AI Plan Modal */}
      {aiModalOpen && activeIssue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border bg-muted/40 px-5 py-4">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-md bg-secondary/10 text-secondary">
                  <BrainCircuit className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">AI Resolution Plan</h3>
                  <p className="text-xs text-muted-foreground">For: {activeIssue.title}</p>
                </div>
              </div>
              <button
                onClick={() => setAiModalOpen(false)}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {generateAiPlan.isPending ? (
                <div className="flex h-40 flex-col items-center justify-center gap-3 text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin text-secondary" />
                  <p className="text-sm">Gemini is analyzing the issue and generating a plan...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Summary Section */}
                  <div>
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Issue Summary</h4>
                    <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm leading-relaxed text-foreground">
                      {activeIssue.aiSummary || "No summary available."}
                    </div>
                  </div>

                  {/* Plan Section */}
                  <div>
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Step-by-Step Resolution</h4>
                    <div className="prose prose-sm prose-p:leading-relaxed prose-pre:bg-muted max-w-none rounded-lg border border-border p-4 text-foreground dark:prose-invert">
                      <ReactMarkdown>{activeIssue.aiResolutionPlan || "No plan available."}</ReactMarkdown>
                    </div>
                  </div>

                  {/* Cross-Department Link Suggestion */}
                  {activeIssue.aiSuggestedDepartment && (
                    <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 p-4">
                      <div>
                        <h4 className="flex items-center gap-1.5 text-sm font-semibold text-primary">
                          <LinkIcon className="h-4 w-4" /> Cross-Department Coordination
                        </h4>
                        <p className="mt-1 text-xs text-muted-foreground">
                          AI suggests involving <strong>{activeIssue.aiSuggestedDepartment}</strong> to resolve this fully.
                        </p>
                        {activeIssue.aiEstimatedTime && (
                          <p className="mt-1 flex items-center gap-1 text-xs font-medium text-accent">
                            <Clock className="h-3 w-3" /> Estimated time: {activeIssue.aiEstimatedTime}
                          </p>
                        )}
                      </div>
                      
                      {linkedIssueIds.includes(activeIssue._id) ? (
                        <div className="flex items-center gap-2 rounded bg-green-500/10 px-3 py-1.5 text-xs font-semibold text-green-600 dark:text-green-400">
                          <CheckCircle2 className="h-4 w-4" /> 
                          <span>Linked {activeIssue.aiSuggestedDepartment} - Est: {activeIssue.aiEstimatedTime || "N/A"}</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            const dept = departments.find((d: any) => d.name === activeIssue.aiSuggestedDepartment);
                            if (dept && activeIssue.primaryDepartment) {
                              addDependency.mutate({
                                id: activeIssue._id,
                                dependentDept: activeIssue.primaryDepartment._id,
                                prereqDept: dept._id,
                                estimatedTime: activeIssue.aiEstimatedTime
                              });
                            } else {
                              toast.error("Could not find suggested department in the system.");
                            }
                          }}
                          disabled={addDependency.isPending}
                          className="rounded bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-secondary disabled:opacity-50"
                        >
                          {addDependency.isPending ? "Linking..." : "Link Department"}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Professional Order Section for Admins */}
                  {(user?.role === "dept_admin" || user?.role === "admin" || user?.role === "super_admin") && (
                    <div className="mt-6 rounded-lg border border-border p-4 bg-muted/20">
                      <h4 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center justify-between">
                        Official Directive
                        {!activeIssue.aiProfessionalOrder && (
                          <button
                            onClick={() => generateAiOrder.mutate(activeIssue._id)}
                            disabled={generateAiOrder.isPending}
                            className="flex items-center gap-1 rounded bg-secondary px-2 py-1 text-xs font-semibold text-secondary-foreground hover:bg-secondary/90 disabled:opacity-50"
                          >
                            <RefreshCw className={`h-3 w-3 ${generateAiOrder.isPending ? "animate-spin" : ""}`} />
                            {generateAiOrder.isPending ? "Drafting..." : "Draft Directive"}
                          </button>
                        )}
                      </h4>
                      {activeIssue.aiProfessionalOrder ? (
                        <div className="space-y-4">
                          <div className="prose prose-sm prose-p:leading-relaxed max-w-none rounded border border-border bg-background p-4 text-foreground dark:prose-invert">
                            <ReactMarkdown>{activeIssue.aiProfessionalOrder}</ReactMarkdown>
                          </div>
                          <button
                            onClick={() => toast.success("Directive sent to field officers successfully!")}
                            className="w-full rounded bg-primary py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90"
                          >
                            Send Notification to Officers
                          </button>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground italic text-center py-4">
                          No official directive drafted yet. Click "Draft Directive" to generate a professional order.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-border bg-muted/40 px-5 py-3">
              <button
                onClick={() => generateAiPlan.mutate(activeIssue._id)}
                disabled={generateAiPlan.isPending}
                className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${generateAiPlan.isPending ? "animate-spin" : ""}`} />
                Regenerate Plan
              </button>
              <button
                onClick={() => setAiModalOpen(false)}
                className="rounded-md bg-secondary px-4 py-2 text-xs font-bold text-secondary-foreground hover:bg-secondary/90"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}