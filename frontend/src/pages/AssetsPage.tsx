import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import { Asset, AssetCategory, Ward, Shelter } from "../types";
import Card from "../components/Card";
import Table, { Column } from "../components/Table";
import Button from "../components/Button";
import { getStatusBadge } from "../components/Badge";
import { Wrench, Plus, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as zod from "zod";

const assetSchema = zod.object({
  name: zod.string().min(2, "Asset name must be at least 2 characters."),
  serial_number: zod.string().min(2, "Serial number is required."),
  category_id: zod.string().uuid("Please select a valid Category."),
  ward_id: zod.string().uuid("Please select a valid Ward."),
  shelter_id: zod.string().uuid().or(zod.literal("")).optional(),
  status: zod.enum(["FUNCTIONAL", "NON_FUNCTIONAL", "STAGED", "DISPATCHED"]),
  latitude: zod.number().optional().or(zod.nan()),
  longitude: zod.number().optional().or(zod.nan()),
});

type AssetFormValues = zod.infer<typeof assetSchema>;

export const AssetsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  // 1. Fetch Assets
  const { data: assets = [], isLoading } = useQuery<Asset[]>({
    queryKey: ["assets"],
    queryFn: async () => {
      const res = await api.get("/api/v1/assets/");
      return res.data;
    },
  });

  // 2. Fetch Categories
  const { data: categories = [] } = useQuery<AssetCategory[]>({
    queryKey: ["asset-categories"],
    queryFn: async () => {
      const res = await api.get("/api/v1/assets/categories");
      return res.data;
    },
  });

  // 3. Fetch Wards
  const { data: wards = [] } = useQuery<Ward[]>({
    queryKey: ["wards"],
    queryFn: async () => {
      const res = await api.get("/api/v1/locations/wards");
      return res.data;
    },
  });

  // 4. Fetch Shelters
  const { data: shelters = [] } = useQuery<Shelter[]>({
    queryKey: ["shelters"],
    queryFn: async () => {
      const res = await api.get("/api/v1/shelters/");
      return res.data;
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<AssetFormValues>({
    resolver: zodResolver(assetSchema),
    defaultValues: {
      status: "FUNCTIONAL",
    },
  });

  const selectedWard = watch("ward_id");
  const filteredShelters = shelters.filter((s) => s.ward_id === selectedWard);

  // Create Asset Mutation
  const createMutation = useMutation({
    mutationFn: async (values: AssetFormValues) => {
      const payload: any = { ...values };
      // Map empty string to null for optional relationships
      if (!payload.shelter_id) {
        payload.shelter_id = null;
      }
      if (isNaN(payload.latitude)) delete payload.latitude;
      if (isNaN(payload.longitude)) delete payload.longitude;

      const res = await api.post("/api/v1/assets/", payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      alert("Asset registered successfully!");
      setIsOpen(false);
      reset();
    },
    onError: (err: any) => {
      alert(err.response?.data?.detail || "Failed to register asset.");
    },
  });

  const onSubmit = (data: AssetFormValues) => {
    createMutation.mutate(data);
  };

  const columns: Column<Asset>[] = [
    {
      key: "name",
      header: "Asset Description",
      sortable: true,
    },
    {
      key: "serial_number",
      header: "Serial Number",
      sortable: true,
    },
    {
      key: "category_id",
      header: "Category",
      render: (row) => categories.find((c) => c.id === row.category_id)?.name || "Emergency Equipment",
    },
    {
      key: "shelter_id",
      header: "Staged Location",
      render: (row) => shelters.find((s) => s.id === row.shelter_id)?.name || "Staged at Ward",
    },
    {
      key: "status",
      header: "Operational State",
      sortable: true,
      render: (row) => getStatusBadge(row.status),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-6 border border-slate-100 rounded-2xl shadow-soft">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">GVMC Emergency Assets Register</h1>
          <p className="text-xs text-slate-400 mt-1">Staging and functional tracking of storm-water pumps, generators, and equipment</p>
        </div>
        <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setIsOpen(true)}>
          Register Staged Asset
        </Button>
      </div>

      {/* Main Table */}
      <Card title="Emergency Response Equipment inventory">
        {isLoading ? (
          <p className="text-slate-400 text-sm">Loading assets...</p>
        ) : (
          <Table
            columns={columns}
            data={assets}
            searchField="name"
            searchPlaceholder="Search assets by name..."
            exportFileName="gvmc-assets-log"
          />
        )}
      </Card>

      {/* Creation Modal Dialog */}
      {isOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-medium border border-slate-100 max-w-lg w-full overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-slate-50">
              <div className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-primary" />
                <h2 className="text-base font-bold text-slate-800">Register Staged Asset</h2>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
              <div className="grid grid-cols-2 gap-4">
                {/* Name */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Asset Name</label>
                  <input
                    type="text"
                    placeholder="De-watering Pump 5HP"
                    {...register("name")}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 outline-none focus:border-primary"
                  />
                  {errors.name && <p className="text-[10px] text-critical font-semibold">{errors.name.message}</p>}
                </div>

                {/* Serial Number */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Serial Number</label>
                  <input
                    type="text"
                    placeholder="GVMC-PUMP-9801"
                    {...register("serial_number")}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 outline-none focus:border-primary"
                  />
                  {errors.serial_number && <p className="text-[10px] text-critical font-semibold">{errors.serial_number.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Category selector */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Asset Category</label>
                  <select
                    {...register("category_id")}
                    className="w-full text-xs border border-slate-200 bg-white rounded-lg p-2.5 outline-none focus:border-primary"
                  >
                    <option value="">-- Choose Category --</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  {errors.category_id && <p className="text-[10px] text-critical font-semibold">{errors.category_id.message}</p>}
                </div>

                {/* Status Selection */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Initial Status</label>
                  <select
                    {...register("status")}
                    className="w-full text-xs border border-slate-200 bg-white rounded-lg p-2.5 outline-none focus:border-primary"
                  >
                    <option value="FUNCTIONAL">FUNCTIONAL</option>
                    <option value="NON_FUNCTIONAL">NON_FUNCTIONAL</option>
                    <option value="STAGED">STAGED</option>
                    <option value="DISPATCHED">DISPATCHED</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Ward selector */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Assign Ward</label>
                  <select
                    {...register("ward_id")}
                    className="w-full text-xs border border-slate-200 bg-white rounded-lg p-2.5 outline-none focus:border-primary"
                  >
                    <option value="">-- Choose Ward --</option>
                    {wards.map((w) => (
                      <option key={w.id} value={w.id}>
                        Ward #{w.number} - {w.name}
                      </option>
                    ))}
                  </select>
                  {errors.ward_id && <p className="text-[10px] text-critical font-semibold">{errors.ward_id.message}</p>}
                </div>

                {/* Shelter Allocation (optional) */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Allocate Shelter (Optional)</label>
                  <select
                    {...register("shelter_id")}
                    disabled={!selectedWard}
                    className="w-full text-xs border border-slate-200 bg-white rounded-lg p-2.5 outline-none focus:border-primary disabled:opacity-50"
                  >
                    <option value="">-- No Shelter Allocation --</option>
                    {filteredShelters.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Latitude */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Latitude (Optional)</label>
                  <input
                    type="number"
                    step="0.000001"
                    placeholder="17.740"
                    {...register("latitude", { valueAsNumber: true })}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 outline-none focus:border-primary"
                  />
                </div>

                {/* Longitude */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Longitude (Optional)</label>
                  <input
                    type="number"
                    step="0.000001"
                    placeholder="83.330"
                    {...register("longitude", { valueAsNumber: true })}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-50">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" loading={isSubmitting} size="sm">
                  Register Asset
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default AssetsPage;
