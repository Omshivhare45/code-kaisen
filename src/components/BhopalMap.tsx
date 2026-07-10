import { useEffect, useState } from "react";
import { BHOPAL_AREAS, aqiColor } from "@/lib/bhopal-data";

type MarkerData = {
  lat: number | null;
  lng: number | null;
  color: string;
  label?: string;
  kind: "report" | "work";
};

const BHOPAL_CENTER: [number, number] = [23.2599, 77.4126];

export function BhopalMap({ markers = [] }: { markers?: MarkerData[] }) {
  const [mounted, setMounted] = useState(false);
  const [mod, setMod] = useState<{
    MapContainer: any; TileLayer: any; CircleMarker: any; Circle: any; Popup: any; Tooltip: any;
  } | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([import("react-leaflet"), import("leaflet")]).then(([rl]) => {
      if (!alive) return;
      setMod({
        MapContainer: rl.MapContainer,
        TileLayer: rl.TileLayer,
        CircleMarker: rl.CircleMarker,
        Circle: rl.Circle,
        Popup: rl.Popup,
        Tooltip: rl.Tooltip,
      });
      setMounted(true);
    });
    return () => { alive = false; };
  }, []);

  if (!mounted || !mod) {
    return (
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl border border-border bg-[image:var(--gradient-hero)] shadow-[var(--shadow-elegant)]">
        <div className="absolute inset-0 grid place-items-center text-xs font-semibold uppercase tracking-widest text-white/80">
          Loading Bhopal map…
        </div>
      </div>
    );
  }

  const { MapContainer, TileLayer, CircleMarker, Circle, Popup, Tooltip } = mod;

  return (
    <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl border border-border shadow-[var(--shadow-elegant)]">
      <MapContainer
        center={BHOPAL_CENTER}
        zoom={12}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* AQI heat halos per area */}
        {BHOPAL_AREAS.map((a) => (
          <Circle
            key={"halo-" + a.name}
            center={[a.lat, a.lng]}
            radius={900}
            pathOptions={{
              color: aqiColor(a.aqi),
              fillColor: aqiColor(a.aqi),
              fillOpacity: 0.28,
              weight: 0,
            }}
          />
        ))}

        {/* Area markers */}
        {BHOPAL_AREAS.map((a) => (
          <CircleMarker
            key={a.name}
            center={[a.lat, a.lng]}
            radius={7}
            pathOptions={{
              color: "#fff",
              weight: 2,
              fillColor: aqiColor(a.aqi),
              fillOpacity: 1,
            }}
          >
            <Tooltip direction="top" offset={[0, -6]} opacity={0.95}>
              <div className="text-xs">
                <div className="font-semibold">{a.name}</div>
                <div>AQI {a.aqi} · {a.aqiCategory}</div>
                <div>Road: {a.roadCondition}</div>
              </div>
            </Tooltip>
          </CircleMarker>
        ))}

        {/* Dynamic markers (reports / works) */}
        {markers.map((m, i) => {
          if (m.lat == null || m.lng == null) return null;
          return (
            <CircleMarker
              key={i}
              center={[m.lat, m.lng]}
              radius={m.kind === "work" ? 6 : 8}
              pathOptions={{
                color: "#fff",
                weight: 2,
                fillColor: m.color,
                fillOpacity: 1,
                dashArray: m.kind === "work" ? "2,3" : undefined,
              }}
            >
              {m.label && (
                <Popup>
                  <div className="text-xs font-semibold">
                    {m.kind === "work" ? "Scheduled work" : "Report"}
                  </div>
                  <div className="text-xs">{m.label}</div>
                </Popup>
              )}
            </CircleMarker>
          );
        })}
      </MapContainer>

      <div className="pointer-events-none absolute right-3 top-3 z-[500] rounded-md bg-black/60 px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-white backdrop-blur">
        Bhopal · Live
      </div>
      <div className="pointer-events-none absolute bottom-3 left-3 z-[500] flex flex-wrap gap-2 rounded-md bg-black/60 p-2 text-[10px] text-white backdrop-blur">
        <LegendDot color={aqiColor(40)}  label="Good" />
        <LegendDot color={aqiColor(90)}  label="Moderate" />
        <LegendDot color={aqiColor(170)} label="Poor" />
        <LegendDot color={aqiColor(250)} label="Very Poor" />
        <LegendDot color={aqiColor(350)} label="Severe" />
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