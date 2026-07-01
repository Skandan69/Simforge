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
export type ProcessingStatus =
  "Uploaded" | "Queued" | "Processing" | "Completed" | "Failed" | "Cancelled";

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
  latestJob: {
    id: string;
    retryCount: number;
    maxAttempts: number;
    queuedAt: string;
    startedAt: string | null;
  } | null;
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

export type SimulationDifficulty =
  "Beginner" | "Intermediate" | "Advanced" | "Expert";
export type SimulationStatus = "Draft" | "Active" | "Archived";

export interface SimulationPersonaSummary {
  id: string;
  name: string;
  role: string;
  personality: string;
  tone: string;
  difficultyBehavior: string;
  backgroundContext: string;
  updatedAt: string;
}

export interface SimulationCriterionSummary {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
  updatedAt: string;
}

export interface SimulationSummary {
  id: string;
  title: string;
  description: string;
  industry: string;
  department: string;
  jobRole: string;
  category: string;
  difficulty: SimulationDifficulty;
  status: SimulationStatus;
  estimatedMinutes: number;
  persona: { id: string; name: string; role: string } | null;
  objectiveCount: number;
  knowledgeBaseCount: number;
  criterionCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SimulationDetail extends SimulationSummary {
  scenarioSetup: string;
  successCriteria: string;
  objectives: Array<{ id: string; title: string; sortOrder: number }>;
  knowledgeBases: Array<{ id: string; name: string; department: string }>;
  evaluationCriteria: SimulationCriterionSummary[];
  canEdit: boolean;
}

export interface SaveSimulationInput {
  title: string;
  description: string;
  industry: string;
  department: string;
  jobRole: string;
  category: string;
  difficulty: SimulationDifficulty;
  status: SimulationStatus;
  estimatedMinutes: number;
  personaId?: string | null;
  scenarioSetup: string;
  successCriteria: string;
  objectives: string[];
  knowledgeBaseIds: string[];
  criterionIds: string[];
}

export interface SimulationDashboardResponse {
  canEdit: boolean;
  totals: { total: number; draft: number; active: number; archived: number };
  simulations: SimulationSummary[];
}

export type SimulationSessionStatus = "IN_PROGRESS" | "COMPLETED" | "FAILED";
export type SimulationMessageRole = "learner" | "ai" | "system";
export type WorkforceCapability =
  (typeof import("./constants.js").WORKFORCE_CAPABILITIES)[number];

export interface SimulationMessageResponse {
  id: string;
  sessionId: string;
  role: SimulationMessageRole;
  content: string;
  createdAt: string;
}

export interface CapabilityScoreResponse {
  id: string;
  capabilityName: WorkforceCapability;
  score: number;
  evidence: string;
  recommendation: string;
  createdAt: string;
}

export interface SimulationEvaluationResponse {
  id: string;
  overallScore: number;
  strengths: string[];
  improvementAreas: string[];
  evidence: Array<{ capability: string; observation: string }>;
  recommendedNextPractice: string;
  createdAt: string;
}

export interface SimulationSessionResponse {
  id: string;
  organizationId: string;
  simulationId: string;
  learnerId: string;
  status: SimulationSessionStatus;
  startedAt: string;
  completedAt: string | null;
  overallScore: number | null;
  createdAt: string;
  updatedAt: string;
  messages: SimulationMessageResponse[];
  evaluation: SimulationEvaluationResponse | null;
  capabilityScores: CapabilityScoreResponse[];
}
