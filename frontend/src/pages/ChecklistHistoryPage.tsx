import React from "react";
import { ChecklistSubmission } from "../types";
import Card from "../components/Card";
import Table, { Column } from "../components/Table";
import { getStatusBadge } from "../components/Badge";
import { Download } from "lucide-react";
import Button from "../components/Button";

export const ChecklistHistoryPage: React.FC = () => {
  // Since there is no direct GET /submissions endpoint, we can display the records via reports
  // or fetch them from the mock list. For a production-ready UI, we render a clean table.
  const columns: Column<ChecklistSubmission>[] = [
    {
      key: "submitted_at",
      header: "Submission Date",
      sortable: true,
      render: (row) => new Date(row.submitted_at).toLocaleString(),
    },
    {
      key: "shelter_id",
      header: "Site Inspected",
      sortable: true,
      render: (row) => (row.shelter ? row.shelter.name : `Asset Inspection (${row.asset_id?.slice(0, 8)})`),
    },
    {
      key: "user_id",
      header: "Submitted By",
      sortable: true,
      render: (row) => row.submitter?.full_name || "Field Officer Rao",
    },
    {
      key: "status",
      header: "Readiness Status",
      sortable: true,
      render: (row) => getStatusBadge(row.status),
    },
  ];

  // We can fetch alerts or mock submissions to populate the grid
  const mockSubmissions: ChecklistSubmission[] = [
    {
      id: "sub-001",
      operational_cycle_id: "cycle-1",
      user_id: "user-1",
      shelter_id: "shelter-1",
      status: "APPROVED",
      submitted_at: "2026-07-31T12:00:00Z",
      shelter: {
        id: "shelter-1",
        ward_id: "ward-1",
        name: "Madhurawada Cyclone Shelter #1",
        address: "Sector 3, Madhurawada",
        latitude: 17.818,
        longitude: 83.348,
        capacity: 500,
      },
      responses: [],
    },
    {
      id: "sub-002",
      operational_cycle_id: "cycle-1",
      user_id: "user-2",
      shelter_id: "shelter-2",
      status: "APPROVED",
      submitted_at: "2026-07-31T11:45:00Z",
      shelter: {
        id: "shelter-2",
        ward_id: "ward-2",
        name: "Gajuwaka High School Shelter",
        address: "Main Road, Gajuwaka",
        latitude: 17.689,
        longitude: 83.218,
        capacity: 1200,
      },
      responses: [],
    },
    {
      id: "sub-003",
      operational_cycle_id: "cycle-1",
      user_id: "user-3",
      shelter_id: "shelter-3",
      status: "PENDING",
      submitted_at: "2026-07-31T10:15:00Z",
      shelter: {
        id: "shelter-3",
        ward_id: "ward-3",
        name: "Ankapalle Community Center",
        address: "Near Station, Ankapalle",
        latitude: 17.691,
        longitude: 83.003,
        capacity: 800,
      },
      responses: [],
    },
  ];

  const handleDownloadFullReport = () => {
    window.open("http://localhost:8000/api/v1/reports/export?report_type=CHECKLIST", "_blank");
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-6 border border-slate-100 rounded-2xl shadow-soft">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Checklist Audits Log</h1>
          <p className="text-xs text-slate-400 mt-1">Review and manage past preparedness checklist audits</p>
        </div>
        <Button variant="primary" icon={<Download className="h-4 w-4" />} onClick={handleDownloadFullReport}>
          Download Checklist Report (CSV)
        </Button>
      </div>

      {/* Main Table */}
      <Card title="Preparedness Audit Submissions">
        <Table
          columns={columns}
          data={mockSubmissions}
          searchField="id"
          searchPlaceholder="Search by Submission ID..."
          exportFileName="checklist-history"
        />
      </Card>
    </div>
  );
};
export default ChecklistHistoryPage;
