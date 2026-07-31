import React from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../services/api";
import { Ward, Zone } from "../types";
import Card from "../components/Card";
import Table, { Column } from "../components/Table";


export const WardsPage: React.FC = () => {
  // 1. Fetch Wards
  const { data: wards = [], isLoading } = useQuery<Ward[]>({
    queryKey: ["wards"],
    queryFn: async () => {
      const res = await api.get("/api/v1/locations/wards");
      return res.data;
    },
  });

  // 2. Fetch Zones (to resolve zone names)
  const { data: zones = [] } = useQuery<Zone[]>({
    queryKey: ["zones"],
    queryFn: async () => {
      const res = await api.get("/api/v1/locations/zones");
      return res.data;
    },
  });

  const columns: Column<Ward>[] = [
    {
      key: "number",
      header: "Ward Number",
      sortable: true,
      render: (row) => `Ward #${row.number}`,
    },
    {
      key: "name",
      header: "Ward Name",
      sortable: true,
    },
    {
      key: "zone_id",
      header: "Parent Zone",
      sortable: true,
      render: (row) => zones.find((z) => z.id === row.zone_id)?.name || `Zone: ${row.zone_id.slice(0, 8)}`,
    },
    {
      key: "boundary",
      header: "Boundary Status",
      render: (row) =>
        row.boundary && row.boundary.length > 0 ? (
          <span className="text-accent font-semibold text-xs">Boundary Configured ({row.boundary.length} vertices)</span>
        ) : (
          <span className="text-slate-400 text-xs">No Boundary Data</span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-6 border border-slate-100 rounded-2xl shadow-soft">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">GVMC Municipal Wards</h1>
          <p className="text-xs text-slate-400 mt-1">Review wards hierarchy and geographical PostGIS coordinate boundaries</p>
        </div>
      </div>

      {/* Main Table */}
      <Card title="Wards Registry">
        {isLoading ? (
          <p className="text-slate-400 text-sm">Loading wards...</p>
        ) : (
          <Table
            columns={columns}
            data={wards}
            searchField="name"
            searchPlaceholder="Search wards by name..."
            exportFileName="gvmc-wards"
          />
        )}
      </Card>
    </div>
  );
};
export default WardsPage;
