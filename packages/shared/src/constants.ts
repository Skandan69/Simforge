export const APP_NAME = "SimForge";
export const API_SERVICE_NAME = "simforge-api";

export const USER_ROLES = ["Owner", "Admin", "Trainer", "Manager", "Learner"] as const;
export const KNOWLEDGE_EDITOR_ROLES = ["Owner", "Admin", "Trainer"] as const;
export const KNOWLEDGE_BASE_STATUSES = ["Active", "Archived"] as const;
export const DOCUMENT_STATUSES = ["Ready", "Archived", "Failed"] as const;
export const DOCUMENT_FILE_TYPES = ["PDF", "DOCX", "PPTX", "XLSX"] as const;
export const KNOWLEDGE_DOCUMENT_BUCKET = "knowledge-documents";
export const MAX_DOCUMENT_SIZE_BYTES = 50 * 1024 * 1024;
export const DOCUMENT_MIME_TYPES = {
  PDF: "application/pdf",
  DOCX: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  PPTX: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  XLSX: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
} as const;

export const NAVIGATION_ITEMS = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Knowledge Studio", href: "/knowledge-studio" },
  { label: "Simulation Studio", href: "/simulation-studio" },
  { label: "Assessments", href: "/assessments" },
  { label: "Learners", href: "/learners" },
  { label: "Reports", href: "/reports" },
  { label: "Settings", href: "/settings" },
] as const;
