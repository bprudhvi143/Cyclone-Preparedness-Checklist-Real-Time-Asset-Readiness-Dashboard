import React from "react";
import { Link } from "react-router-dom";
import { ShieldAlert, AlertOctagon, Home } from "lucide-react";
import Button from "../components/Button";

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 space-y-4">
      <AlertOctagon className="h-16 w-16 text-slate-300 animate-bounce" />
      <h1 className="text-3xl font-black text-slate-800">404 - Page Not Found</h1>
      <p className="text-sm text-slate-400 max-w-md">
        The page you are looking for does not exist or has been moved to a different URL path.
      </p>
      <Link to="/dashboard">
        <Button variant="outline" icon={<Home className="h-4 w-4" />}>
          Back to Dashboard
        </Button>
      </Link>
    </div>
  );
};

export const UnauthorizedPage: React.FC = () => {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 space-y-4">
      <ShieldAlert className="h-16 w-16 text-critical" />
      <h1 className="text-3xl font-black text-slate-850">Access Denied</h1>
      <p className="text-sm text-slate-400 max-w-md">
        You do not possess the required security clearance or administrative role to access this section of the GVMC cyclone preparedness portal.
      </p>
      <Link to="/dashboard">
        <Button variant="outline" icon={<Home className="h-4 w-4" />}>
          Back to Dashboard
        </Button>
      </Link>
    </div>
  );
};

export default NotFoundPage;
