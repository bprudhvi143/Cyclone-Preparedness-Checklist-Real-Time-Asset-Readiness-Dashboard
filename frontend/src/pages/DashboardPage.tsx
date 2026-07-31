import React from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../services/api";
import { DashboardStatsResponse, Shelter, Asset, SystemAlert } from "../types";
import Card from "../components/Card";
import { CardSkeleton, ChartSkeleton } from "../components/Skeleton";
import { getStatusBadge } from "../components/Badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { ShieldAlert, Home, Wrench, FileCheck } from "lucide-react";

// Fix Leaflet marker icon issue in Vite
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

export const DashboardPage: React.FC = () => {
  // 1. Fetch Active Cycle
  const { data: cycle, isLoading: cycleLoading } = useQuery({
    queryKey: ["active-cycle"],
    queryFn: async () => {
      const res = await api.get("/api/v1/checklists/cycles");
      // Find the first ACTIVE cycle
      return res.data.find((c: any) => c.status === "ACTIVE") || res.data[0];
    },
  });

  const cycleId = cycle?.id;

  // 2. Fetch Dashboard Statistics
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStatsResponse | null>({
    queryKey: ["dashboard-stats", cycleId],
    queryFn: async () => {
      if (!cycleId) return null;
      const res = await api.get(`/api/v1/dashboard/statistics?operational_cycle_id=${cycleId}`);
      return res.data;
    },
    enabled: !!cycleId,
  });

  // 3. Fetch Shelters (for map markers)
  const { data: shelters = [] } = useQuery({
    queryKey: ["shelters-list"],
    queryFn: async () => {
      const res = await api.get("/api/v1/shelters/");
      return res.data;
    },
  });

  // 4. Fetch Assets (for map markers)
  const { data: assets = [] } = useQuery({
    queryKey: ["assets-list"],
    queryFn: async () => {
      const res = await api.get("/api/v1/assets/");
      return res.data;
    },
  });

  // 5. Fetch Critical Alerts
  const { data: alerts = [] } = useQuery({
    queryKey: ["critical-alerts-dashboard"],
    queryFn: async () => {
      const res = await api.get("/api/v1/alerts/");
      // Only keep critical active/acknowledged alerts
      return res.data.filter((a: SystemAlert) => a.severity === "CRITICAL" && a.status !== "RESOLVED");
    },
  });

  if (cycleLoading || statsLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      </div>
    );
  }

  // Pre-compiled charts data
  const readinessData = [
    { name: "Madhurawada", score: 85 },
    { name: "Gajuwaka", score: 92 },
    { name: "Ankapalle", score: 78 },
    { name: "Pendurthi", score: 88 },
    { name: "Bheemili", score: 81 },
  ];

  const alertDistributionData = [
    { name: "Critical Alerts", value: stats?.active_critical_alerts || 0, color: "#ef4444" },
    { name: "Inspections Pending", value: stats?.pending_submissions || 0, color: "#f97316" },
    { name: "Functional Assets", value: stats?.total_assets || 0, color: "#10b981" },
  ];

  const defaultPosition: [number, number] = [17.74, 83.33]; // Visakhapatnam coordinates

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-6 border border-slate-100 rounded-2xl shadow-soft">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Executive Command Control Center</h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time telemetry and disaster readiness tracking for operational cycle:{" "}
            <span className="font-semibold text-primary">{cycle?.name || "No Active Cycle"}</span>
          </p>
        </div>
      </div>

      {/* 2. Top Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* City Readiness */}
        <Card bodyClassName="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary/5 flex items-center justify-center text-primary shrink-0">
            <FileCheck className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">City Readiness</span>
            <span className="text-2xl font-black text-slate-800 mt-0.5 block">
              {stats?.overall_readiness !== undefined ? `${stats.overall_readiness}%` : "0%"}
            </span>
          </div>
        </Card>

        {/* Ready Shelters */}
        <Card bodyClassName="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-accent/5 flex items-center justify-center text-accent shrink-0">
            <Home className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Ready Shelters</span>
            <span className="text-2xl font-black text-slate-800 mt-0.5 block">
              {stats?.ready_shelters || 0} / {stats?.total_shelters || 0}
            </span>
          </div>
        </Card>

        {/* Critical Alerts */}
        <Card bodyClassName="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-critical/5 flex items-center justify-center text-critical shrink-0">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Critical Alerts</span>
            <span className="text-2xl font-black text-slate-800 mt-0.5 block">
              {stats?.active_critical_alerts || 0}
            </span>
          </div>
        </Card>

        {/* Staging Assets */}
        <Card bodyClassName="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500 shrink-0">
            <Wrench className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Assets Functional</span>
            <span className="text-2xl font-black text-slate-800 mt-0.5 block">
              {stats?.functional_asset_pct !== undefined ? `${stats.functional_asset_pct}%` : "0%"}
            </span>
          </div>
        </Card>
      </div>

      {/* 3. Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Zone Readiness Bar Chart */}
        <Card title="Zone Preparedness Scores" subtitle="Comparison of preparedness metrics across GVMC zones">
          <div className="h-[250px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={readinessData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" fontSize={11} stroke="#94a3b8" />
                <YAxis domain={[0, 100]} fontSize={11} stroke="#94a3b8" />
                <Tooltip />
                <Bar dataKey="score" fill="#0f4c81" radius={[4, 4, 0, 0]} barSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Telemetry Alert Distributions */}
        <Card title="Alert & Inspection Ratios" subtitle="Status distribution across active cycles">
          <div className="h-[250px] w-full flex items-center justify-between gap-4 mt-4">
            <div className="flex-1 h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={alertDistributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {alertDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 text-xs w-44">
              {alertDistributionData.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-500 font-medium truncate flex-1">{item.name}</span>
                  <span className="font-bold text-slate-800">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* 4. Interactive Map Layer */}
      <div className="grid grid-cols-1 gap-6">
        <Card title="GVMC Disaster Readiness Geofencing" subtitle="Geographical display of shelters (houses) and staged assets across zones">
          <div className="h-[400px] w-full mt-4 rounded-xl overflow-hidden border border-slate-100 shadow-soft">
            <MapContainer center={defaultPosition} zoom={12} className="h-full w-full">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {/* Render Shelters */}
              {shelters.map((shelter: Shelter) => (
                <Marker key={shelter.id} position={[shelter.latitude, shelter.longitude]}>
                  <Popup>
                    <div className="text-xs space-y-1">
                      <p className="font-bold text-slate-800 text-sm">{shelter.name}</p>
                      <p className="text-slate-500">{shelter.address}</p>
                      <p>Capacity: <span className="font-semibold">{shelter.capacity} people</span></p>
                      {shelter.contact_person && <p>Contact: {shelter.contact_person} ({shelter.contact_phone})</p>}
                    </div>
                  </Popup>
                </Marker>
              ))}

              {/* Render Assets */}
              {assets
                .filter((asset: Asset) => asset.latitude && asset.longitude)
                .map((asset: Asset) => (
                  <Marker key={asset.id} position={[asset.latitude!, asset.longitude!]}>
                    <Popup>
                      <div className="text-xs space-y-1">
                        <p className="font-bold text-primary text-sm">{asset.name}</p>
                        <p className="text-slate-500">Serial: {asset.serial_number}</p>
                        <p>Status: <span className="font-semibold">{asset.status}</span></p>
                      </div>
                    </Popup>
                  </Marker>
                ))}
            </MapContainer>
          </div>
        </Card>
      </div>

      {/* 5. Command Log Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Critical Alerts List */}
        <Card title="Active Critical Alerts" subtitle="Prioritized list of alerts requiring resolution">
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-400 uppercase">Alert Source</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-400 uppercase">Severity</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-400 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {alerts.length > 0 ? (
                  alerts.slice(0, 5).map((a: SystemAlert) => (
                    <tr key={a.id} className="text-xs text-slate-600 hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-semibold text-slate-700">Question violation {a.question_id.slice(0, 8)}</td>
                      <td className="px-4 py-3 text-red-600 font-bold">{a.severity}</td>
                      <td className="px-4 py-3">{getStatusBadge(a.status)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-slate-400">
                      No active critical alerts logged.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Command Activity Stream */}
        <Card title="Recent Activity Stream" subtitle="Audit log of logged events and commands">
          <div className="mt-4 space-y-4 max-h-[300px] overflow-y-auto pr-2">
            {stats?.recent_activity && stats.recent_activity.length > 0 ? (
              stats.recent_activity.map((act: any) => (
                <div key={act.id} className="p-3 bg-slate-50 rounded-lg text-xs flex justify-between gap-4 border border-slate-100">
                  <div className="space-y-0.5">
                    <p className="font-semibold text-slate-700">{act.description}</p>
                    <p className="text-[10px] text-slate-400">IP Audit: {act.ip_address || "Internal System"}</p>
                  </div>
                  <span className="text-[10px] text-slate-400 self-start">
                    {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 text-center py-8">No recent activities logged.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};
export default DashboardPage;
