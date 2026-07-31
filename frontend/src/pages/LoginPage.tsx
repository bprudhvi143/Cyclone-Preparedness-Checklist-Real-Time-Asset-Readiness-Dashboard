import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../services/api";
import { Lock, Mail, AlertCircle, Eye, EyeOff } from "lucide-react";
import Button from "../components/Button";
import gvmcLogo from "../assets/gvmc_logo.jpg";

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg("Please fill in all fields.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      // In FastAPI, login expects OAuth2 Password request (form-data: username, password)
      const formData = new URLSearchParams();
      formData.append("username", email);
      formData.append("password", password);

      const response = await api.post("/api/v1/auth/login", formData, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      // Store tokens and authenticate context
      login(response.data);

      // Redirect depending on user role
      const role = response.data.role;
      if (role === "FIELD_OFFICER") {
        navigate("/checklists/submit");
      } else {
        navigate("/dashboard");
      }
    } catch (err: any) {
      console.error(err);
      if (err.response && err.response.data && err.response.data.detail) {
        setErrorMsg(err.response.data.detail);
      } else {
        setErrorMsg("Invalid credentials or server connection failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* 1. Left Side: Disaster Management Information Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary to-primary-hover p-12 text-white flex-col justify-between relative overflow-hidden">
        {/* Decorative Grid Patterns */}
        <div className="absolute inset-0 opacity-5 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
        
        <div className="flex items-center gap-3">
          <img src={gvmcLogo} alt="GVMC Logo" className="h-12 w-12 bg-white p-1 rounded-lg" />
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-wider uppercase opacity-80">
              GVMC Visakhapatnam
            </span>
            <span className="text-lg font-black tracking-tight leading-none">
              Disaster Preparedness Portals
            </span>
          </div>
        </div>

        <div className="space-y-6 max-w-lg z-10">
          <h1 className="text-4xl font-extrabold tracking-tight leading-tight">
            Real-Time Cyclone Preparedness & Readiness Metrics
          </h1>
          <p className="text-sm leading-relaxed opacity-90">
            Greater Visakhapatnam Municipal Corporation digitization portal for pre-cyclone checklist audits. Field officers submit readiness checklists to evaluate shelter capacities, utility functional statuses, and critical emergency asset staging.
          </p>

          {/* Quick Stats Panel */}
          <div className="grid grid-cols-2 gap-4 pt-4">
            <div className="bg-white/10 p-4 rounded-xl border border-white/10">
              <span className="text-2xl font-black block">100%</span>
              <span className="text-xs text-white/70 uppercase font-semibold">Digitized Checklists</span>
            </div>
            <div className="bg-white/10 p-4 rounded-xl border border-white/10">
              <span className="text-2xl font-black block">&lt; 4 Hours</span>
              <span className="text-xs text-white/70 uppercase font-semibold">Alert Escalation checks</span>
            </div>
          </div>
        </div>

        <div className="text-xs text-white/60">
          © {new Date().getFullYear()} Greater Visakhapatnam Municipal Corporation (GVMC). All Rights Reserved.
        </div>
      </div>

      {/* 2. Right Side: Login Card */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md bg-white border border-slate-100 shadow-medium rounded-2xl p-8 space-y-6">
          <div className="text-center space-y-2">
            <img src={gvmcLogo} alt="GVMC Logo" className="h-16 w-16 mx-auto object-contain rounded-md" />
            <h2 className="text-xl font-bold text-slate-800">Welcome Back</h2>
            <p className="text-xs text-slate-400">Sign in to your GVMC officer account credentials</p>
          </div>

          {errorMsg && (
            <div className="bg-red-50 border border-red-100 rounded-lg p-3 flex items-start gap-2.5 text-xs text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  placeholder="name@gvmc.gov.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9 pr-4 py-2.5 w-full text-sm bg-slate-50/50 border border-slate-200 rounded-lg outline-none focus:border-primary focus:bg-white focus:ring-1 focus:ring-primary/20 transition-all"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-slate-600">Password</label>
                <a href="#forgot" className="text-xs text-primary hover:underline font-semibold">
                  Forgot Password?
                </a>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 pr-10 py-2.5 w-full text-sm bg-slate-50/50 border border-slate-200 rounded-lg outline-none focus:border-primary focus:bg-white focus:ring-1 focus:ring-primary/20 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me Option */}
            <div className="flex items-center">
              <input
                id="remember_me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 text-primary focus:ring-primary border-slate-300 rounded cursor-pointer"
              />
              <label htmlFor="remember_me" className="ml-2 text-xs text-slate-500 select-none cursor-pointer">
                Remember this device for 30 days
              </label>
            </div>

            {/* Submit Button */}
            <Button type="submit" loading={loading} className="w-full py-2.5 mt-2">
              Sign In
            </Button>
          </form>

          {/* Verification / Government Disclaimer footer */}
          <div className="text-center pt-2">
            <span className="text-[10px] text-slate-400 uppercase tracking-widest block font-medium">
              Greater Visakhapatnam Municipal Corporation
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
export default LoginPage;
