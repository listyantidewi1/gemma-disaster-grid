export type Report = {
  area: string;
  risk: "Extreme" | "High" | "Medium";
  aqi: number;
  co2: string;
  status: string;
};

export const reports: Report[] = [
  {
    area: "Riau",
    risk: "Extreme",
    aqi: 188,
    co2: "12.4 kt",
    status: "Hotspot cluster detected",
  },
  {
    area: "Kalimantan Barat",
    risk: "High",
    aqi: 142,
    co2: "8.1 kt",
    status: "Smoke spread increasing",
  },
  {
    area: "Sumatera Selatan",
    risk: "Medium",
    aqi: 96,
    co2: "3.7 kt",
    status: "Watch area",
  },
];
