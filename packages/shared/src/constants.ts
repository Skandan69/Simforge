export const APP_NAME = "SimForge";
export const API_SERVICE_NAME = "simforge-api";

export const USER_ROLES = ["Owner", "Admin", "Trainer", "Manager", "Learner"] as const;

export const NAVIGATION_ITEMS = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Knowledge Studio", href: "/knowledge-studio" },
  { label: "Simulation Studio", href: "/simulation-studio" },
  { label: "Assessments", href: "/assessments" },
  { label: "Learners", href: "/learners" },
  { label: "Reports", href: "/reports" },
  { label: "Settings", href: "/settings" },
] as const;
