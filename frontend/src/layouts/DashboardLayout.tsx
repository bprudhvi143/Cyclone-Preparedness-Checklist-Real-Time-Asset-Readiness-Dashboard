import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { getStatusBadge } from "../components/Badge";
import {
  LayoutDashboard,
  Map,
  Shield,
  Home,
  Wrench,
  CheckSquare,
  AlertTriangle,
  FileText,
  Users,
  Settings,
  LogOut,
  Menu,
  ChevronLeft,
  Bell,
  User as UserIcon,
} from "lucide-react";
import gvmcLogo from "../assets/gvmc_logo.jpg";

interface SidebarItem {
  name: string;
  path: string;
  icon: React.ReactNode;
  roles?: string[];
}

export const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const sidebarItems: SidebarItem[] = [
    {
      name: "Dashboard",
      path: "/dashboard",
      icon: <LayoutDashboard className="h-5 w-5" />,
    },
    {
      name: "Zones",
      path: "/zones",
      icon: <Map className="h-5 w-5" />,
      roles: ["ADMIN", "COMMISSIONER"],
    },
    {
      name: "Wards",
      path: "/wards",
      icon: <Shield className="h-5 w-5" />,
      roles: ["ADMIN", "COMMISSIONER"],
    },
    {
      name: "Shelters",
      path: "/shelters",
      icon: <Home className="h-5 w-5" />,
    },
    {
      name: "Assets",
      path: "/assets",
      icon: <Wrench className="h-5 w-5" />,
    },
    {
      name: "Checklist Submission",
      path: "/checklists/submit",
      icon: <CheckSquare className="h-5 w-5" />,
      roles: ["FIELD_OFFICER", "ADMIN"],
    },
    {
      name: "Checklist History",
      path: "/checklists/history",
      icon: <FileText className="h-5 w-5" />,
    },
    {
      name: "Alerts",
      path: "/alerts",
      icon: <AlertTriangle className="h-5 w-5" />,
    },
    {
      name: "Reports",
      path: "/reports",
      icon: <FileText className="h-5 w-5" />,
      roles: ["ADMIN", "COMMISSIONER", "ZONE_OFFICER"],
    },
    {
      name: "Users",
      path: "/users",
      icon: <Users className="h-5 w-5" />,
      roles: ["ADMIN"],
    },
    {
      name: "Settings",
      path: "/settings",
      icon: <Settings className="h-5 w-5" />,
    },
  ];

  const filteredItems = sidebarItems.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role))
  );

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const getBreadcrumbs = () => {
    const pathnames = location.pathname.split("/").filter((x) => x);
    return (
      <div className="flex items-center gap-1.5 text-xs text-slate-400 capitalize">
        <Link to="/dashboard" className="hover:text-primary transition-colors">
          Home
        </Link>
        {pathnames.map((value, index) => {
          const to = `/${pathnames.slice(0, index + 1).join("/")}`;
          const isLast = index === pathnames.length - 1;
          return (
            <React.Fragment key={to}>
              <span>/</span>
              {isLast ? (
                <span className="font-semibold text-slate-600">{value.replace(/-/g, " ")}</span>
              ) : (
                <Link to={to} className="hover:text-primary transition-colors">
                  {value.replace(/-/g, " ")}
                </Link>
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen flex bg-bg-gray">
      {/* 1. Sidebar */}
      <aside
        className={`bg-white border-r border-slate-100 flex flex-col justify-between transition-all duration-300 ${
          isCollapsed ? "w-16" : "w-64"
        }`}
      >
        <div className="flex flex-col">
          {/* Sidebar Branding Header */}
          <div className="p-4 flex items-center gap-3 border-b border-slate-50 justify-between">
            {!isCollapsed ? (
              <div className="flex items-center gap-2">
                <img src={gvmcLogo} alt="GVMC Logo" className="h-10 w-10 object-contain rounded-md" />
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    GVMC India
                  </span>
                  <span className="text-xs font-black text-slate-800 tracking-tight leading-none mt-0.5">
                    Cyclone Preparedness
                  </span>
                </div>
              </div>
            ) : (
              <img src={gvmcLogo} alt="GVMC Logo" className="h-8 w-8 object-contain mx-auto" />
            )}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="text-slate-400 hover:text-slate-700 p-1 hover:bg-slate-50 rounded-lg hidden md:block"
            >
              {isCollapsed ? <Menu className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>

          {/* Sidebar Menu Options */}
          <nav className="p-3 space-y-1">
            {filteredItems.map((item) => {
              const isActive = location.pathname.startsWith(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                    isActive
                      ? "bg-primary/5 text-primary"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <span className={isActive ? "text-primary" : "text-slate-400"}>{item.icon}</span>
                  {!isCollapsed && <span>{item.name}</span>}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Logged User Footer Profile */}
        <div className="p-4 border-t border-slate-50 space-y-2">
          {!isCollapsed && user && (
            <div className="flex items-center gap-3 p-1">
              <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center text-primary font-bold">
                {user.full_name[0].toUpperCase()}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-semibold text-slate-700 truncate">
                  {user.full_name}
                </span>
                <span className="text-[10px] text-slate-400 leading-none mt-0.5">
                  {user.email}
                </span>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2 text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-700 rounded-lg transition-colors"
          >
            <LogOut className="h-5 w-5 text-slate-400 hover:text-red-600" />
            {!isCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* 2. Content Frame */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Navbar */}
        <header className="bg-white border-b border-slate-100 h-16 px-6 flex items-center justify-between sticky top-0 z-40">
          <div className="flex flex-col">
            {getBreadcrumbs()}
            <span className="text-xs text-slate-400 font-medium mt-1">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Role Badge */}
            {user && getStatusBadge(user.role)}

            {/* Notifications Toggle */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 hover:bg-slate-50 rounded-lg text-slate-500 hover:text-slate-800 relative transition-colors"
              >
                <Bell className="h-5 w-5" />
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-critical" />
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-100 rounded-xl shadow-medium z-50 p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                    <span className="text-sm font-bold text-slate-700">Notifications</span>
                    <button className="text-[10px] text-primary hover:underline">Mark all read</button>
                  </div>
                  <div className="space-y-2 text-xs text-slate-600">
                    <div className="p-2 bg-slate-50 rounded-lg">
                      <p className="font-semibold text-slate-700">Critical Alert Triggered</p>
                      <p className="text-slate-400 text-[10px] mt-0.5">Shelter #12 - 5 min ago</p>
                    </div>
                    <div className="p-2 hover:bg-slate-50 rounded-lg transition-colors">
                      <p className="font-semibold text-slate-700">Checklist Submitted</p>
                      <p className="text-slate-400 text-[10px] mt-0.5">Field Officer Rao - 20 min ago</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Profile Avatar Icon Link */}
            <Link
              to="/settings"
              className="h-8 w-8 rounded-full border border-slate-100 bg-slate-50 flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
            >
              <UserIcon className="h-4 w-4" />
            </Link>
          </div>
        </header>

        {/* Content View */}
        <main className="flex-1 p-6 overflow-y-auto max-w-7xl w-full mx-auto space-y-6">
          {children}
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-slate-100 py-4 px-6 text-center text-xs text-slate-400">
          <p>© {new Date().getFullYear()} Greater Visakhapatnam Municipal Corporation (GVMC). All Rights Reserved.</p>
          <p className="mt-0.5">Cyclone Disaster Management & Asset Readiness Digitization Platform</p>
        </footer>
      </div>
    </div>
  );
};
export default DashboardLayout;
