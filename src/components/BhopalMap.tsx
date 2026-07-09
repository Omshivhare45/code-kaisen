import { BHOPAL_AREAS, aqiColor, projectToMap } from "@/lib/bhopal-data";
import type { Area } from "@/lib/bhopal-data";

type Marker = {
  lat: number | null;
  lng: number | null;
  color: string;
  label?: string;
  kind: "report" | "work";
};

export function BhopalMap({ markers = [] }: { markers?: Marker[] }) {
  return (
    <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl border border-border bg-[image:var(--gradient-hero)] shadow-[var(--shadow-elegant)]">
      {/* subtle grid */}
      <svg className="absolute inset-0 h-full w-full opacity-15" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      {/* Upper & Lower lake abstract shapes */}
      <svg viewBox="0 0 100 62" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        <path d="M 18,30 Q 28,22 42,26 Q 55,30 48,38 Q 38,44 26,40 Q 14,36 18,30 Z" fill="oklch(0.35 0.09 258 / 0.55)" />
        <path d="M 52,36 Q 62,32 72,36 Q 78,40 70,44 Q 60,46 54,42 Q 48,40 52,36 Z" fill="oklch(0.35 0.09 258 / 0.55)" />
      </svg>

      {/* AQI heat blobs per area */}
      {BHOPAL_AREAS.map((a) => {
        const { x, y } = projectToMap(a.lat, a.lng);
        return (
          <div
            key={a.name}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${x}%`, top: `${y}%` }}
          >
            <div
              className="h-24 w-24 rounded-full blur-2xl opacity-70"
              style={{ background: aqiColor(a.aqi) }}
            />
          </div>
        );
      })}

      {/* Area labels */}
      {BHOPAL_AREAS.map((a: Area) => {
        const { x, y } = projectToMap(a.lat, a.lng);
        return (
          <div
            key={"lbl-" + a.name}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${x}%`, top: `${y}%` }}
          >
            <div className="flex flex-col items-center gap-1">
              <div
                className="h-2.5 w-2.5 rounded-full ring-2 ring-white/60"
                style={{ background: aqiColor(a.aqi) }}
              />
              <div className="rounded bg-black/45 px-1.5 py-0.5 text-[10px] font-medium leading-none text-white backdrop-blur">
                {a.name} · AQI {a.aqi}
              </div>
            </div>
          </div>
        );
      })}

      {/* Dynamic markers */}
      {markers.map((m, i) => {
        if (m.lat == null || m.lng == null) return null;
        const { x, y } = projectToMap(m.lat, m.lng);
        return (
          <div
            key={i}
            className="absolute -translate-x-1/2 -translate-y-full"
            style={{ left: `${x}%`, top: `${y}%` }}
          >
            <div className="flex flex-col items-center">
              <div
                className="grid h-6 w-6 place-items-center rounded-full text-[10px] font-bold text-white shadow-lg ring-2 ring-white"
                style={{ background: m.color }}
                title={m.label}
              >
                {m.kind === "work" ? "W" : "!"}
              </div>
            </div>
          </div>
        );
      })}

      {/* Legend */}
      <div className="absolute bottom-3 left-3 flex flex-wrap gap-2 rounded-md bg-black/45 p-2 text-[10px] text-white backdrop-blur">
        <LegendDot color={aqiColor(40)} label="Good" />
        <LegendDot color={aqiColor(90)} label="Moderate" />
        <LegendDot color={aqiColor(170)} label="Poor" />
        <LegendDot color={aqiColor(250)} label="Very Poor" />
        <LegendDot color={aqiColor(350)} label="Severe" />
      </div>
      <div className="absolute right-3 top-3 rounded-md bg-black/45 px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-white backdrop-blur">
        Bhopal · Live
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}