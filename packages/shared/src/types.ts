export type HealthStatus = "ok" | "degraded";

export interface HealthResponse {
  status: HealthStatus;
  service: string;
}

export type UserRole = "Owner" | "Admin" | "Trainer" | "Manager" | "Learner";

export interface OrganizationSummary {
  id: string;
  name: string;
  slug: string;
  industry: string;
  companySize: string;
  country: string;
  timezone: string;
  logoUrl: string | null;
}

export interface CurrentUserResponse {
  user: {
    id: string;
    email: string;
    fullName: string | null;
  };
  organization: OrganizationSummary | null;
  role: UserRole | null;
}

export interface DashboardActivity {
  id: string;
  action: string;
  description: string;
  createdAt: string;
  actorName: string;
}

export interface DashboardResponse {
  organization: OrganizationSummary;
  role: UserRole;
  kpis: {
    users: number;
    knowledgeBases: number;
    simulations: number;
    assessments: number;
  };
  recentActivity: DashboardActivity[];
}

export interface CreateOrganizationInput {
  name: string;
  industry: string;
  companySize: string;
  country: string;
  timezone: string;
  logoUrl?: string;
}

export type KnowledgeBaseStatus = "Active" | "Archived";
export type DocumentFileType = "PDF" | "DOCX" | "PPTX" | "XLSX";
export type DocumentStatus = "Ready" | "Archived" | "Failed";
export type ProcessingStatus = "Uploaded" | "Queued" | "Processing" | "Completed" | "Failed" | "Cancelled";

export interface ProcessingSummary {
  sourceId: string | null;
  status: ProcessingStatus;
  progress: number;
  failureReason: string | null;
  processedAt: string | null;
}

export interface KnowledgeBaseSummary {
  id: string;
  name: string;
  description: string;
  department: string;
  status: KnowledgeBaseStatus;
  createdBy: { id: string; name: string; email: string };
  createdAt: string;
  updatedAt: string;
  documentCount: number;
}

export interface KnowledgeBaseDetail extends KnowledgeBaseSummary {
  organizationId: string;
}

export interface KnowledgeDashboardResponse {
  canEdit: boolean;
  role: UserRole;
  totals: {
    knowledgeBases: number;
    activeKnowledgeBases: number;
    documents: number;
    storageBytes: number;
  };
  knowledgeBases: KnowledgeBaseSummary[];
}

export interface CreateKnowledgeBaseInput {
  name: string;
  description: string;
  department: string;
}

export interface UpdateKnowledgeBaseInput extends Partial<CreateKnowledgeBaseInput> {
  status?: KnowledgeBaseStatus;
}

export interface DocumentSummary {
  id: string;
  knowledgeBase: { id: string; name: string; department: string };
  fileName: string;
  fileType: DocumentFileType;
  mimeType: string;
  sizeBytes: number;
  uploadedBy: { id: string; name: string; email: string };
  uploadedAt: string;
  currentVersion: number;
  status: DocumentStatus;
  notes: string;
  updatedAt: string;
  processing: ProcessingSummary;
}

export interface DocumentVersionSummary {
  id: string;
  version: number;
  fileName: string;
  fileType: DocumentFileType;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  uploadedBy: { id: string; name: string; email: string };
  uploadedAt: string;
  notes: string;
}

export interface DocumentDetail extends DocumentSummary {
  storagePath: string;
  versions: DocumentVersionSummary[];
  canEdit: boolean;
}

export interface ProcessingSourceDetail extends ProcessingSummary {
  documentId: string;
  title: string;
  fileType: DocumentFileType;
  sizeBytes: number;
  pageCount: number | null;
  wordCount: number | null;
  characterCount: number | null;
  estimatedTokens: number | null;
  language: string | null;
  processingDurationMs: number | null;
  chunkCount: number;
  latestJob: { id: string; retryCount: number; maxAttempts: number; queuedAt: string; startedAt: string | null } | null;
}

export interface ProcessingDashboardResponse {
  totals: Record<ProcessingStatus, number>;
  averageProcessingTimeMs: number;
  recent: ProcessingSourceDetail[];
}

export interface CreateDocumentInput {
  fileName: string;
  fileType: DocumentFileType;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  notes?: string;
}

export interface UpdateDocumentInput {
  fileName?: string;
  notes?: string;
  status?: DocumentStatus;
}

export interface CreateDocumentVersionInput extends CreateDocumentInput {}

export interface KnowledgeSearchResponse {
  query: string;
  documents: DocumentSummary[];
  knowledgeBases: KnowledgeBaseSummary[];
}
