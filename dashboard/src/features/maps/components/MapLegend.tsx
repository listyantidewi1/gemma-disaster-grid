const legendItems = [
  { label: "Critical hotspot", className: "bg-red-500" },
  { label: "High risk area", className: "bg-orange-400" },
  { label: "Medium watch area", className: "bg-amber-300" },
  { label: "Low watch area", className: "bg-emerald-300" },
];

export function MapLegend() {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/40 p-4 text-sm text-slate-300 backdrop-blur">
      <h3 className="mb-3 font-semibold text-white">Hotspot Legend</h3>
      <div className="space-y-2">
        {legendItems.map((item) => (
          <div key={item.label} className="flex items-center gap-3">
            <span
              className={`h-3 w-3 rounded-full shadow-[0_0_18px_currentColor] ${item.className}`}
            />
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
