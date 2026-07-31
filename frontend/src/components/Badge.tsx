import React from "react";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "success" | "warning" | "danger" | "info" | "neutral";
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "neutral",
  className = "",
}) => {
  const baseStyles =
    "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider";

  const variants = {
    primary: "bg-primary/10 text-primary border border-primary/20",
    secondary: "bg-purple-100 text-purple-800 border border-purple-200",
    success: "bg-accent/10 text-accent border border-accent/20",
    warning: "bg-alert/10 text-alert border border-alert/20",
    danger: "bg-critical/10 text-critical border border-critical/20",
    info: "bg-blue-100 text-blue-800 border border-blue-200",
    neutral: "bg-slate-100 text-slate-600 border border-slate-200",
  };

  return (
    <span className={`${baseStyles} ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};

export const getStatusBadge = (status: string) => {
  const normalized = status.toUpperCase();
  switch (normalized) {
    case "ACTIVE":
    case "APPROVED":
    case "FUNCTIONAL":
    case "SUCCESS":
      return <Badge variant="success">{status}</Badge>;
    case "PENDING":
    case "DRAFT":
    case "STAGED":
    case "ACKNOWLEDGED":
      return <Badge variant="warning">{status}</Badge>;
    case "REJECTED":
    case "CRITICAL":
    case "NON_FUNCTIONAL":
    case "FAILED":
      return <Badge variant="danger">{status}</Badge>;
    case "RESOLVED":
    case "COMPLETED":
    case "INACTIVE":
      return <Badge variant="neutral">{status}</Badge>;
    case "DISPATCHED":
    case "ADMIN":
    case "COMMISSIONER":
      return <Badge variant="info">{status}</Badge>;
    case "ZONE_OFFICER":
    case "FIELD_OFFICER":
      return <Badge variant="primary">{status}</Badge>;
    default:
      return <Badge variant="neutral">{status}</Badge>;
  }
};

export default Badge;
