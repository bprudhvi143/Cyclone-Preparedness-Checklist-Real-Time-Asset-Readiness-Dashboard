import React from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../services/api";
import { Zone } from "../types";
import Card from "../components/Card";
import Table, { Column } from "../components/Table";


export const ZonesPage: React.FC = () => {
  // Fetch Zones
  const { data: zones = [], isLoading } = useQuery<Zone[]>({
    queryKey: ["zones"],
    queryFn: async () => {
      const res = await api.get("/api/v1/locations/zones");
      return res.data;
    },
  });

  const columns: Column<Zone>[] = [
    {
      key: "name",
      header: "Zone Name",
      sortable: true,
    },
    {
      key: "code",
      header: "Zone Code",
      sortable: true,
      render: (row) => <code className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded text-xs">{row.code}</code>,
    },
    {
      key: "id",
      header: "Zone Identifier (UUID)",
      render: (row) => <span className="text-slate-400 text-xs">{row.id}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-6 border border-slate-100 rounded-2xl shadow-soft">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">GVMC Administrative Zones</h1>
          <p className="text-xs text-slate-400 mt-1">Review official administrative zones mapping municipal regions</p>
        </div>
      </div>

      {/* Main Table */}
      <Card title="Zones Registry">
        {isLoading ? (
          <p className="text-slate-400 text-sm">Loading zones...</p>
        ) : (
          <Table
            columns={columns}
            data={zones}
            searchField="name"
            searchPlaceholder="Search zones by name..."
            exportFileName="gvmc-zones"
          />
        )}
      </Card>
    </div>
  );
};
export default ZonesPage;
