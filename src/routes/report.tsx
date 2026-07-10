import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { Camera, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { SiteNav } from "@/components/SiteNav";
import { BHOPAL_AREAS, CATEGORIES } from "@/lib/bhopal-data";
import { toast } from "sonner";
import { api } from "@/lib/api";

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
  const [photo, setPhoto] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 8 * 1024 * 1024) {
      toast.error("Photo must be under 8 MB.");
      return;
    }
    setPhoto(f);
    setPhotoPreview(URL.createObjectURL(f));
  }

  function clearPhoto() {
    setPhoto(null);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) { nav({ to: "/auth" }); return; }
    setBusy(true);
    
    try {
      const area = BHOPAL_AREAS.find((a) => a.name === form.area)!;
      
      const formData = new FormData();
      formData.append("title", form.title);
      formData.append("description", form.description);
      formData.append("category", form.category);
      formData.append("severity", form.severity);
      formData.append("area", form.area);
      formData.append("lat", String(area.lat));
      formData.append("lng", String(area.lng));
      if (photo) {
        formData.append("photo", photo);
      }

      await api.issues.create(formData);
      
      toast.success("Report submitted — thank you!");
      nav({ to: "/reports" });
    } catch (err: any) {
      toast.error(err.message || "Failed to submit report");
    } finally {
      setBusy(false);
    }
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
          </div>
          <Field label="Photo (optional)">
            {photoPreview ? (
              <div className="relative overflow-hidden rounded-lg border border-border">
                <img src={photoPreview} alt="Selected" className="max-h-64 w-full object-cover" />
                <button
                  type="button"
                  onClick={clearPhoto}
                  className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white hover:bg-black/80"
                  aria-label="Remove photo"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-input bg-background px-4 py-8 text-sm text-muted-foreground transition-colors hover:border-secondary hover:bg-muted/40">
                <Camera className="h-6 w-6 text-secondary" />
                <span className="font-semibold text-primary">Add a photo</span>
                <span className="text-xs">Snap from your phone or upload from gallery · up to 8 MB</span>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={onPickPhoto}
                  className="hidden"
                />
              </label>
            )}
          </Field>
          <Field label="Description">
            <textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Add any details that help the responder find and fix this."
              className={inputCls} />
          </Field>
          <button
            disabled={busy || !user}
            className="w-full rounded-md bg-accent py-3 text-sm font-bold text-accent-foreground shadow-[var(--shadow-elegant)] transition-transform hover:scale-[1.01] disabled:opacity-60"
          >
            {busy ? "Submitting (AI Classifying)…" : "Submit report"}
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