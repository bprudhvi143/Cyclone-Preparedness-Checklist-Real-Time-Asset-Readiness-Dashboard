import React, { useState } from "react";
import Card from "../components/Card";
import Button from "../components/Button";
import { Download, FileText, Database } from "lucide-react";

export const ReportsPage: React.FC = () => {
  const [loadingType, setLoadingType] = useState<string | null>(null);

  const reportTypes = [
    {
      type: "ZONE",
      title: "Zone Preparedness Export",
      description: "Aggregated listing of all GVMC administrative zones with respective readiness identifiers.",
    },
    {
      type: "WARD",
      title: "Ward Infrastructure Boundaries",
      description: "Geographical polygon boundaries and details of municipal wards.",
    },
    {
      type: "OFFICER",
      title: "Officer & Personnel Directory",
      description: "Complete register of Field Officers, Zone Officers, and Admins with contact numbers.",
    },
    {
      type: "ASSET",
      title: "Emergency Asset Allocation log",
      description: "Equipment registry, serial numbers, allocation shelters, and functional statuses.",
    },
    {
      type: "CHECKLIST",
      title: "Checklist Submissions Archive",
      description: "Chronological log of completed preparedness inspections submitted from sites.",
    },
    {
      type: "ALERT",
      title: "Preparedness Violations & Alerts",
      description: "Audit trail of critical alerts, triggering questions, and resolution explanations.",
    },
  ];

  const handleDownload = (type: string) => {
    setLoadingType(type);
    try {
      const url = `http://localhost:8000/api/v1/reports/export?report_type=${type}`;
      window.open(url, "_blank");
    } catch (e) {
      console.error(e);
      alert("Failed to export report.");
    } finally {
      setTimeout(() => setLoadingType(null), 1000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-6 border border-slate-100 rounded-2xl shadow-soft">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Analytical Reports & Audits</h1>
          <p className="text-xs text-slate-400 mt-1">Export structured preparedness CSV data files for regional safety audits</p>
        </div>
      </div>

      {/* Grid of Report Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reportTypes.map((report) => (
          <Card
            key={report.type}
            title={
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary shrink-0" />
                <span className="text-sm font-bold text-slate-700">{report.title}</span>
              </div>
            }
            extra={
              <Button
                variant="outline"
                size="sm"
                icon={<Download className="h-3.5 w-3.5" />}
                loading={loadingType === report.type}
                onClick={() => handleDownload(report.type)}
              >
                Export CSV
              </Button>
            }
          >
            <p className="text-xs text-slate-500 leading-relaxed">{report.description}</p>
            <div className="mt-4 flex items-center gap-1.5 text-[10px] text-slate-400 font-medium bg-slate-50/50 p-2 rounded-lg border border-slate-100">
              <Database className="h-3 w-3 text-slate-300" />
              <span>Target DB Entity: {report.type === "CHECKLIST" ? "ChecklistSubmission" : report.type === "OFFICER" ? "User" : report.type}</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
export default ReportsPage;
