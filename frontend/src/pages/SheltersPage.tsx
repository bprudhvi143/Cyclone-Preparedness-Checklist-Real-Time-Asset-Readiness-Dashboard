import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import { Shelter, Ward } from "../types";
import Card from "../components/Card";
import Table, { Column } from "../components/Table";
import Button from "../components/Button";
import { Home, Plus, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as zod from "zod";

const shelterSchema = zod.object({
  name: zod.string().min(2, "Name must be at least 2 characters."),
  address: zod.string().min(5, "Address must be at least 5 characters."),
  ward_id: zod.string().uuid("Please select a valid Ward."),
  capacity: zod.number().gt(0, "Capacity must be greater than 0."),
  latitude: zod.number().min(-90).max(90),
  longitude: zod.number().min(-180).max(180),
  contact_person: zod.string().optional(),
  contact_phone: zod.string().optional(),
});

type ShelterFormValues = zod.infer<typeof shelterSchema>;

export const SheltersPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  // 1. Fetch Shelters
  const { data: shelters = [], isLoading } = useQuery<Shelter[]>({
    queryKey: ["shelters"],
    queryFn: async () => {
      const res = await api.get("/api/v1/shelters/");
      return res.data;
    },
  });

  // 2. Fetch Wards
  const { data: wards = [] } = useQuery<Ward[]>({
    queryKey: ["wards"],
    queryFn: async () => {
      const res = await api.get("/api/v1/locations/wards");
      return res.data;
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ShelterFormValues>({
    resolver: zodResolver(shelterSchema),
    defaultValues: {
      capacity: 100,
      latitude: 17.74,
      longitude: 83.33,
    },
  });

  // Create Shelter Mutation
  const createMutation = useMutation({
    mutationFn: async (values: ShelterFormValues) => {
      const res = await api.post("/api/v1/shelters/", values);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shelters"] });
      alert("Shelter created successfully!");
      setIsOpen(false);
      reset();
    },
    onError: (err: any) => {
      alert(err.response?.data?.detail || "Failed to create shelter.");
    },
  });

  const onSubmit = (data: ShelterFormValues) => {
    createMutation.mutate(data);
  };

  const columns: Column<Shelter>[] = [
    {
      key: "name",
      header: "Shelter Name",
      sortable: true,
    },
    {
      key: "address",
      header: "Address",
      sortable: true,
    },
    {
      key: "capacity",
      header: "Capacity (Pax)",
      sortable: true,
      render: (row) => `${row.capacity} people`,
    },
    {
      key: "contact_person",
      header: "Contact Person",
      sortable: true,
      render: (row) => row.contact_person || "N/A",
    },
    {
      key: "contact_phone",
      header: "Contact Phone",
      render: (row) => row.contact_phone || "N/A",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-6 border border-slate-100 rounded-2xl shadow-soft">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">GVMC Cyclone Shelters Register</h1>
          <p className="text-xs text-slate-400 mt-1">Manage and audit safety shelters across municipal wards</p>
        </div>
        <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setIsOpen(true)}>
          Register New Shelter
        </Button>
      </div>

      {/* Main Table */}
      <Card title="Operational Shelters list">
        {isLoading ? (
          <p className="text-slate-400 text-sm">Loading shelters...</p>
        ) : (
          <Table
            columns={columns}
            data={shelters}
            searchField="name"
            searchPlaceholder="Search shelters by name..."
            exportFileName="gvmc-shelters"
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
                <Home className="h-5 w-5 text-primary" />
                <h2 className="text-base font-bold text-slate-800">New Shelter Registration</h2>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
              {/* Name field */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Shelter Name</label>
                <input
                  type="text"
                  placeholder="Madhurawada High School Shelter"
                  {...register("name")}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 outline-none focus:border-primary"
                />
                {errors.name && <p className="text-[10px] text-critical font-semibold">{errors.name.message}</p>}
              </div>

              {/* Address field */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Address Details</label>
                <input
                  type="text"
                  placeholder="Sector-3, Near Highway, Madhurawada"
                  {...register("address")}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 outline-none focus:border-primary"
                />
                {errors.address && <p className="text-[10px] text-critical font-semibold">{errors.address.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Ward selector */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Ward Location</label>
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

                {/* Capacity field */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Capacity (Persons)</label>
                  <input
                    type="number"
                    placeholder="500"
                    {...register("capacity", { valueAsNumber: true })}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 outline-none focus:border-primary"
                  />
                  {errors.capacity && <p className="text-[10px] text-critical font-semibold">{errors.capacity.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Latitude */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Latitude Coordinate</label>
                  <input
                    type="number"
                    step="0.000001"
                    placeholder="17.740"
                    {...register("latitude", { valueAsNumber: true })}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 outline-none focus:border-primary"
                  />
                  {errors.latitude && <p className="text-[10px] text-critical font-semibold">{errors.latitude.message}</p>}
                </div>

                {/* Longitude */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Longitude Coordinate</label>
                  <input
                    type="number"
                    step="0.000001"
                    placeholder="83.330"
                    {...register("longitude", { valueAsNumber: true })}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 outline-none focus:border-primary"
                  />
                  {errors.longitude && <p className="text-[10px] text-critical font-semibold">{errors.longitude.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Contact Person */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Incharge Officer</label>
                  <input
                    type="text"
                    placeholder="Officer Rao"
                    {...register("contact_person")}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 outline-none focus:border-primary"
                  />
                </div>

                {/* Contact Phone */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Contact Number</label>
                  <input
                    type="text"
                    placeholder="9876543210"
                    {...register("contact_phone")}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Form Action buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-50">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" loading={isSubmitting} size="sm">
                  Register Shelter
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default SheltersPage;
