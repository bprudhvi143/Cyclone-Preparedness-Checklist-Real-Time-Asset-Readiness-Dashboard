import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import { SystemAlert } from "../types";
import Card from "../components/Card";
import Table, { Column } from "../components/Table";
import Button from "../components/Button";
import { getStatusBadge } from "../components/Badge";
import { X, ShieldAlert } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export const AlertsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [activeAlertId, setActiveAlertId] = useState<string | null>(null);
  const [resolutionStatus, setResolutionStatus] = useState<"ACTIVE" | "ACKNOWLEDGED" | "RESOLVED">("RESOLVED");
  const [remarks, setRemarks] = useState("");
  const [assignedTo, setAssignedTo] = useState("");

  const canReview = user && ["ADMIN", "ZONE_OFFICER", "COMMISSIONER"].includes(user.role);

  // 1. Fetch System Alerts
  const { data: alerts = [], isLoading } = useQuery<SystemAlert[]>({
    queryKey: ["alerts"],
    queryFn: async () => {
      const res = await api.get("/api/v1/alerts/");
      return res.data;
    },
  });

  // Update/Resolve Alert Mutation
  const reviewMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const res = await api.post(`/api/v1/alerts/${id}/review`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      alert("Alert status updated successfully!");
      setActiveAlertId(null);
      setRemarks("");
      setAssignedTo("");
    },
    onError: (err: any) => {
      alert(err.response?.data?.detail || "Failed to update alert state.");
    },
  });

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAlertId) return;

    if (resolutionStatus === "RESOLVED" && !remarks) {
      alert("Resolution remarks are required to resolve an alert.");
      return;
    }

    const payload: any = {
      status: resolutionStatus,
    };
    if (remarks) payload.resolution_remarks = remarks;
    if (assignedTo) payload.assigned_to = assignedTo;

    reviewMutation.mutate({ id: activeAlertId, payload });
  };

  const columns: Column<SystemAlert>[] = [
    {
      key: "triggered_at",
      header: "Triggered Time",
      sortable: true,
      render: (row) => new Date(row.triggered_at).toLocaleString(),
    },
    {
      key: "severity",
      header: "Severity",
      sortable: true,
      render: (row) => (
        <span className={`font-bold ${row.severity === "CRITICAL" ? "text-critical" : "text-alert"}`}>
          {row.severity}
        </span>
      ),
    },
    {
      key: "question_id",
      header: "Incident Details",
      render: (row) => `Preparedness standard violation: Param #${row.question_id.slice(0, 8)}`,
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (row) => getStatusBadge(row.status),
    },
    {
      key: "actions",
      header: "Action",
      render: (row) =>
        canReview && row.status !== "RESOLVED" ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setActiveAlertId(row.id);
              setResolutionStatus("RESOLVED");
            }}
          >
            Review/Resolve
          </Button>
        ) : (
          <span className="text-xs text-slate-400">Locked</span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-6 border border-slate-100 rounded-2xl shadow-soft">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Active Emergency Alerts & Escalations</h1>
          <p className="text-xs text-slate-400 mt-1">Review critical readiness parameters that failed checklist audits</p>
        </div>
      </div>

      {/* Main Table */}
      <Card title="Readiness Warnings log">
        {isLoading ? (
          <p className="text-slate-400 text-sm">Loading alerts...</p>
        ) : (
          <Table
            columns={columns}
            data={alerts}
            searchField="id"
            searchPlaceholder="Search by Alert ID..."
            exportFileName="gvmc-disaster-alerts"
          />
        )}
      </Card>

      {/* Review/Resolve Dialogue Modal */}
      {activeAlertId && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-medium border border-slate-100 max-w-md w-full overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-slate-50">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-critical" />
                <h2 className="text-base font-bold text-slate-800">Alert Review Action</h2>
              </div>
              <button onClick={() => setActiveAlertId(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleReviewSubmit} className="p-6 space-y-4">
              {/* Status Update */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Set Alert Status</label>
                <select
                  value={resolutionStatus}
                  onChange={(e: any) => setResolutionStatus(e.target.value)}
                  className="w-full text-xs border border-slate-200 bg-white rounded-lg p-2.5 outline-none focus:border-primary"
                >
                  <option value="ACKNOWLEDGED">ACKNOWLEDGED (Investigating)</option>
                  <option value="RESOLVED">RESOLVED (Closed)</option>
                  <option value="ACTIVE">ACTIVE (Open)</option>
                </select>
              </div>

              {/* Assignment (Optional) */}
              {user?.role === "ADMIN" && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Assign investigator (Optional)</label>
                  <input
                    type="text"
                    placeholder="Enter User UUID..."
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 outline-none focus:border-primary"
                  />
                </div>
              )}

              {/* Resolution Remarks */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">
                  Resolution / Investigation Remarks {resolutionStatus === "RESOLVED" && <span className="text-critical">*</span>}
                </label>
                <textarea
                  rows={4}
                  placeholder="Explain resolution measures (e.g. Pump repaired, sandbags staged)"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 outline-none focus:border-primary"
                  required={resolutionStatus === "RESOLVED"}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-50">
                <Button type="button" variant="outline" size="sm" onClick={() => setActiveAlertId(null)}>
                  Cancel
                </Button>
                <Button type="submit" loading={reviewMutation.isPending} size="sm">
                  Apply Review
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default AlertsPage;
