"use client";
import type { DashboardHotspot } from "@/lib/dashboard-hotspots";
import { DivIcon, type LatLngExpression } from "leaflet";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";

type DisasterMapClientProps = {
  hotspots: DashboardHotspot[];
};

const severityColor: Record<DashboardHotspot["severity"], string> = {
  CRITICAL: "#ef4444",
  HIGH:     "#f97316",
  MEDIUM:   "#eab308",
  LOW:      "#22c55e",
};

function createHotspotIcon(severity: DashboardHotspot["severity"]) {
  const color = severityColor[severity];
  return new DivIcon({
    className: "",
    html: `
      <div style="
        width: 18px;
        height: 18px;
        border-radius: 9999px;
        background: ${color};
        border: 2px solid rgba(255,255,255,0.92);
        box-shadow: 0 0 0 8px ${color}33, 0 0 28px ${color};
      "></div>
    `,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -12],
  });
}

export function DisasterMapClient({ hotspots }: DisasterMapClientProps) {
  return (
    <MapContainer
      center={[-1.9, 109.4]}
      zoom={5}
      scrollWheelZoom={false}
      className="h-[420px] w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      {hotspots.map((hotspot) => (
        <Marker
          key={hotspot.id}
          position={[hotspot.lat, hotspot.lon] as LatLngExpression}
          icon={createHotspotIcon(hotspot.severity)}
        >
          <Popup>
            <div className="space-y-1 text-sm">
              <strong>{hotspot.province ?? hotspot.id}</strong>
              {hotspot.regency && (
                <div className="text-slate-400">{hotspot.regency}</div>
              )}
              <div>Severity: <span style={{ color: severityColor[hotspot.severity] }}>{hotspot.severity}</span></div>
              <div>Risk Score: {hotspot.risk_score}/100</div>
              {hotspot.frp !== undefined && (
                <div>FRP: {hotspot.frp} MW</div>
              )}
              {hotspot.brightness !== undefined && (
                <div>Brightness: {hotspot.brightness} K</div>
              )}
              {hotspot.confidence !== undefined && (
                <div>Confidence: {hotspot.confidence}%</div>
              )}
              {hotspot.satellite && (
                <div>Satellite: {hotspot.satellite}</div>
              )}
              {hotspot.environmental_label && (
                <div className="mt-1 text-xs text-slate-300 italic">
                  {hotspot.environmental_label}
                </div>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
