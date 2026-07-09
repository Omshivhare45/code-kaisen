import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SiteNav } from "@/components/SiteNav";
import { MapPin } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in · SahayogBhopal" },
      { name: "description", content: "Sign in or create a SahayogBhopal citizen or officer account." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        toast.success("Account created — you're signed in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back.");
      }
      navigate({ to: "/" });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    try {
      const mod: any = await import(/* @vite-ignore */ "@/integrations/lovable/index");
      const res = await mod.lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (res?.error) toast.error(res.error.message ?? "Google sign-in failed");
    } catch {
      toast.error("Google sign-in isn't set up yet. Use email/password.");
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 md:grid-cols-2 md:items-center">
        <div className="hidden md:block">
          <div className="inline-flex items-center gap-2 rounded-full bg-accent/20 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary">
            <MapPin className="h-3.5 w-3.5" /> Bhopal civic access
          </div>
          <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight text-primary">
            Join the city's coordination layer.
          </h1>
          <p className="mt-4 max-w-md text-muted-foreground">
            Citizens report what they see. Officers plan what they do. Everyone
            sees the same map — that's how we stop overlapping digs and choking
            traffic.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-8 shadow-[var(--shadow-elegant)]">
          <div className="flex gap-1 rounded-lg bg-muted p-1 text-sm">
            {(["signin", "signup"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 rounded-md py-1.5 font-semibold transition-colors ${
                  mode === m ? "bg-background text-primary shadow" : "text-muted-foreground"
                }`}
              >
                {m === "signin" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>
          <form onSubmit={submit} className="mt-6 space-y-3">
            {mode === "signup" && (
              <Field label="Full name">
                <input required value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputCls} />
              </Field>
            )}
            <Field label="Email">
              <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Password">
              <input required minLength={6} type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} />
            </Field>
            <button
              disabled={busy}
              className="mt-2 w-full rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-secondary disabled:opacity-60"
            >
              {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>
          <div className="relative my-5 text-center">
            <span className="bg-card px-2 text-xs uppercase tracking-widest text-muted-foreground relative z-10">or</span>
            <div className="absolute left-0 right-0 top-1/2 -z-0 h-px bg-border" />
          </div>
          <button
            onClick={google}
            className="w-full rounded-md border border-border bg-background py-2.5 text-sm font-semibold text-foreground hover:bg-muted"
          >
            Continue with Google
          </button>
        </div>
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