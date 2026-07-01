export const APP_NAME = "SimForge";
export const API_SERVICE_NAME = "simforge-api";

export const USER_ROLES = [
  "Owner",
  "Admin",
  "Trainer",
  "Manager",
  "Learner",
] as const;
export const KNOWLEDGE_EDITOR_ROLES = ["Owner", "Admin", "Trainer"] as const;
export const KNOWLEDGE_BASE_STATUSES = ["Active", "Archived"] as const;
export const DOCUMENT_STATUSES = ["Ready", "Archived", "Failed"] as const;
export const DOCUMENT_FILE_TYPES = ["PDF", "DOCX", "PPTX", "XLSX"] as const;
export const PROCESSING_STATUSES = [
  "Uploaded",
  "Queued",
  "Processing",
  "Completed",
  "Failed",
  "Cancelled",
] as const;
export const SIMULATION_DIFFICULTIES = [
  "Beginner",
  "Intermediate",
  "Advanced",
  "Expert",
] as const;
export const SIMULATION_STATUSES = ["Draft", "Active", "Archived"] as const;
export const DEFAULT_EVALUATION_CRITERIA = [
  "Knowledge accuracy",
  "Communication",
  "Empathy",
  "Process adherence",
  "Compliance",
  "Problem solving",
  "Confidence",
  "Professionalism",
] as const;
export const WORKFORCE_CAPABILITIES = [
  "Communication",
  "Product Knowledge",
  "Policy Compliance",
  "Empathy",
  "Problem Solving",
  "Decision Making",
] as const;
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
