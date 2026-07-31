import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import { User, Zone, Ward } from "../types";
import Card from "../components/Card";
import Table, { Column } from "../components/Table";
import Button from "../components/Button";
import { getStatusBadge } from "../components/Badge";
import { Users, Plus, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as zod from "zod";

const userSchema = zod.object({
  full_name: zod.string().min(2, "Full name must be at least 2 characters."),
  email: zod.string().email("Invalid email address."),
  phone: zod.string().min(10, "Phone number must be at least 10 digits."),
  role: zod.enum(["ADMIN", "COMMISSIONER", "ZONE_OFFICER", "FIELD_OFFICER"]),
  status: zod.enum(["ACTIVE", "INACTIVE"]),
  password: zod.string().min(8, "Password must be at least 8 characters."),
  zone_id: zod.string().uuid().or(zod.literal("")).optional(),
  ward_id: zod.string().uuid().or(zod.literal("")).optional(),
});

type UserFormValues = zod.infer<typeof userSchema>;

export const UsersPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  // 1. Fetch Zones
  const { data: zones = [] } = useQuery<Zone[]>({
    queryKey: ["zones"],
    queryFn: async () => {
      const res = await api.get("/api/v1/locations/zones");
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
    watch,
    formState: { errors, isSubmitting },
  } = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      role: "FIELD_OFFICER",
      status: "ACTIVE",
    },
  });

  const selectedZone = watch("zone_id");
  const filteredWards = wards.filter((w) => w.zone_id === selectedZone);

  // Register User Mutation
  const registerMutation = useMutation({
    mutationFn: async (values: UserFormValues) => {
      const payload: any = { ...values };
      if (!payload.zone_id) payload.zone_id = null;
      if (!payload.ward_id) payload.ward_id = null;
      const res = await api.post("/api/v1/auth/register", payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      alert("User registered successfully!");
      setIsOpen(false);
      reset();
    },
    onError: (err: any) => {
      alert(err.response?.data?.detail || "Failed to register user.");
    },
  });

  const onSubmit = (data: UserFormValues) => {
    registerMutation.mutate(data);
  };

  const columns: Column<User>[] = [
    {
      key: "full_name",
      header: "Full Name",
      sortable: true,
    },
    {
      key: "email",
      header: "Email Address",
      sortable: true,
    },
    {
      key: "phone",
      header: "Phone Number",
    },
    {
      key: "role",
      header: "Role Permission",
      sortable: true,
      render: (row) => getStatusBadge(row.role),
    },
    {
      key: "status",
      header: "State",
      sortable: true,
      render: (row) => getStatusBadge(row.status),
    },
  ];

  // Mock list of active officers to pre-populate table
  const mockUsers: User[] = [
    {
      id: "u-1",
      email: "commissioner@gvmc.gov.in",
      full_name: "Dr. P. Srinivasa Rao, IAS",
      phone: "9876543201",
      role: "COMMISSIONER",
      status: "ACTIVE",
      created_at: "",
      updated_at: "",
    },
    {
      id: "u-2",
      email: "zone_officer_m@gvmc.gov.in",
      full_name: "K. Appala Naidu",
      phone: "9876543202",
      role: "ZONE_OFFICER",
      status: "ACTIVE",
      created_at: "",
      updated_at: "",
    },
    {
      id: "u-3",
      email: "field_officer_12@gvmc.gov.in",
      full_name: "T. Venkat Rao",
      phone: "9876543203",
      role: "FIELD_OFFICER",
      status: "ACTIVE",
      created_at: "",
      updated_at: "",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-6 border border-slate-100 rounded-2xl shadow-soft">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">GVMC Personnel Directory</h1>
          <p className="text-xs text-slate-400 mt-1">Admin panel to configure disaster management user accounts</p>
        </div>
        <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setIsOpen(true)}>
          Register New Personnel
        </Button>
      </div>

      {/* Main Table */}
      <Card title="Registered Officers list">
        <Table
          columns={columns}
          data={mockUsers}
          searchField="full_name"
          searchPlaceholder="Search officers by name..."
          exportFileName="gvmc-personnel-log"
        />
      </Card>

      {/* Registration Dialog */}
      {isOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-medium border border-slate-100 max-w-lg w-full overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-slate-50">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <h2 className="text-base font-bold text-slate-800">Register New Officer Account</h2>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
              <div className="grid grid-cols-2 gap-4">
                {/* Full Name */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Full Name</label>
                  <input
                    type="text"
                    placeholder="Srinivasa Rao"
                    {...register("full_name")}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 outline-none focus:border-primary"
                  />
                  {errors.full_name && <p className="text-[10px] text-critical font-semibold">{errors.full_name.message}</p>}
                </div>

                {/* Email */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Email Address</label>
                  <input
                    type="email"
                    placeholder="officer@gvmc.gov.in"
                    {...register("email")}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 outline-none focus:border-primary"
                  />
                  {errors.email && <p className="text-[10px] text-critical font-semibold">{errors.email.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Phone */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Contact Number</label>
                  <input
                    type="text"
                    placeholder="9876543210"
                    {...register("phone")}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 outline-none focus:border-primary"
                  />
                  {errors.phone && <p className="text-[10px] text-critical font-semibold">{errors.phone.message}</p>}
                </div>

                {/* Password */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Initial Password</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    {...register("password")}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2.5 outline-none focus:border-primary"
                  />
                  {errors.password && <p className="text-[10px] text-critical font-semibold">{errors.password.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Role */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Security / Role Level</label>
                  <select
                    {...register("role")}
                    className="w-full text-xs border border-slate-200 bg-white rounded-lg p-2.5 outline-none focus:border-primary"
                  >
                    <option value="FIELD_OFFICER">FIELD OFFICER</option>
                    <option value="ZONE_OFFICER">ZONE OFFICER</option>
                    <option value="COMMISSIONER">COMMISSIONER</option>
                    <option value="ADMIN">ADMINISTRATOR</option>
                  </select>
                </div>

                {/* Status */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Initial Status</label>
                  <select
                    {...register("status")}
                    className="w-full text-xs border border-slate-200 bg-white rounded-lg p-2.5 outline-none focus:border-primary"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Zone jurisdiction */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Zone Jurisdiction (Optional)</label>
                  <select
                    {...register("zone_id")}
                    className="w-full text-xs border border-slate-200 bg-white rounded-lg p-2.5 outline-none focus:border-primary"
                  >
                    <option value="">-- All Zones / City-wide --</option>
                    {zones.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Ward jurisdiction */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Ward Jurisdiction (Optional)</label>
                  <select
                    {...register("ward_id")}
                    disabled={!selectedZone}
                    className="w-full text-xs border border-slate-200 bg-white rounded-lg p-2.5 outline-none focus:border-primary disabled:opacity-50"
                  >
                    <option value="">-- All Wards in Zone --</option>
                    {filteredWards.map((w) => (
                      <option key={w.id} value={w.id}>
                        Ward #{w.number} - {w.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-50">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" loading={isSubmitting} size="sm">
                  Register User Account
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default UsersPage;
