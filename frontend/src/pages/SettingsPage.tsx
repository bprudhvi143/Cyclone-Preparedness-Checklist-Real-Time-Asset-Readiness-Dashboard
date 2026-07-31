import React from "react";
import { useAuth } from "../contexts/AuthContext";
import Card from "../components/Card";
import { getStatusBadge } from "../components/Badge";
import { User as UserIcon, Shield, Smartphone, Mail, Settings } from "lucide-react";

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const themeMode = "LIGHT";

  if (!user) return null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-6 border border-slate-100 rounded-2xl shadow-soft">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Account Settings & Profile</h1>
          <p className="text-xs text-slate-400 mt-1">Review credentials, operational roles, and interface settings</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* User Card */}
        <div className="md:col-span-1 space-y-6">
          <Card bodyClassName="flex flex-col items-center text-center p-6 space-y-4">
            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl font-black border-2 border-primary/20">
              {user.full_name[0].toUpperCase()}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">{user.full_name}</h2>
              <span className="text-xs text-slate-450 mt-1 block">{user.email}</span>
            </div>
            <div className="w-full pt-4 border-t border-slate-50 flex flex-col gap-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">System Role:</span>
                {getStatusBadge(user.role)}
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Account status:</span>
                {getStatusBadge(user.status)}
              </div>
            </div>
          </Card>
        </div>

        {/* Form details / configuration */}
        <div className="md:col-span-2 space-y-6">
          {/* Profile Card */}
          <Card title="Official Personnel Details" subtitle="Centralized profile metrics loaded from GVMC records">
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg flex items-center gap-3">
                  <UserIcon className="h-4 w-4 text-slate-400" />
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-400 font-medium block">FULL NAME</span>
                    <span className="font-semibold text-slate-700">{user.full_name}</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg flex items-center gap-3">
                  <Smartphone className="h-4 w-4 text-slate-400" />
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-400 font-medium block">CONTACT NUMBER</span>
                    <span className="font-semibold text-slate-700">{user.phone}</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg flex items-center gap-3">
                  <Mail className="h-4 w-4 text-slate-400" />
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-400 font-medium block">EMAIL ADDRESS</span>
                    <span className="font-semibold text-slate-700">{user.email}</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg flex items-center gap-3">
                  <Shield className="h-4 w-4 text-slate-400" />
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-400 font-medium block">JURISDICTION ZONE</span>
                    <span className="font-semibold text-slate-700">{user.zone_id ? `Zone: ${user.zone_id.slice(0, 8)}` : "All GVMC Areas"}</span>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg text-slate-600 flex items-start gap-2">
                <Settings className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span>
                  <strong>Note:</strong> Profile settings are managed centrally. To request updates to your official contact details, role clearances, or assignments, please contact the GVMC IT helpdesk.
                </span>
              </div>
            </div>
          </Card>

          {/* Interface options */}
          <Card title="Interface Preferences" subtitle="Customize dashboard theme configurations">
            <div className="space-y-4 text-xs">
              <div className="flex justify-between items-center">
                <div>
                  <span className="font-semibold text-slate-700 block">Theme Select</span>
                  <span className="text-slate-400 text-[10px] mt-0.5 block">Light theme is forced for compliance with GVMC guidelines</span>
                </div>
                <select
                  disabled
                  value={themeMode}
                  className="border border-slate-200 bg-slate-50 rounded-lg p-2 outline-none"
                >
                  <option value="LIGHT">Light Theme</option>
                  <option value="DARK">Dark Theme (Disabled)</option>
                </select>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
export default SettingsPage;
