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
  blueprint: { status: OrganizationBlueprintStatus; updatedAt: string } | null;
}

export type OrganizationBlueprintStatus = "DRAFT" | "APPROVED";
export type CapabilityPriority = "High" | "Medium" | "Low";

export interface OrganizationBlueprintInput {
  industry: string;
  teamSizeRange: string;
  primaryTrainingGoals: string[];
  priorityCapabilities: Array<{
    capability: WorkforceCapability;
    priority: CapabilityPriority;
  }>;
  criticalDocumentsNotes: string;
  successDefinition: string;
  costlyMistakes: string;
  nonNegotiables: string;
}

export interface OrganizationBlueprintResponse extends OrganizationBlueprintInput {
  id: string;
  organizationId: string;
  status: OrganizationBlueprintStatus;
  createdAt: string;
  updatedAt: string;
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
export type SophiaMode = (typeof import("./constants.js").SOPHIA_MODES)[number];
export type DocumentVersionRetrievalStatus = "PROCESSING" | "ACTIVE" | "SUPERSEDED" | "FAILED" | "ARCHIVED";
export type KnowledgeChunkStatus = "PROCESSING" | "ACTIVE" | "SUPERSEDED" | "FAILED" | "ARCHIVED";

export type KnowledgeSectionType =
  | "Policy"
  | "Procedure"
  | "ProductInformation"
  | "FAQ"
  | "BestPractice"
  | "Compliance"
  | "GeneralReference"
  | "Unknown";
export type KnowledgeImportance = "Critical" | "Important" | "Reference" | "Optional";

export interface KnowledgeIntelligenceSection {
  id: string;
  sectionNumber: number;
  title: string;
  summary: string;
  sectionType: KnowledgeSectionType;
  confidence: number;
  keywords: string[];
  importance: KnowledgeImportance;
  capabilities: Array<WorkforceCapability | "Unknown">;
  isAiSuggestion: true;
  analysisVersion: string;
}

export interface DocumentKnowledgeIntelligenceResponse {
  documentId: string;
  sourceId: string;
  status: ProcessingStatus;
  generatedAt: string | null;
  sections: KnowledgeIntelligenceSection[];
}

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

export type RetrievalConfidence = "LOW" | "MEDIUM" | "HIGH";

export interface AskSophiaSource {
  evidenceId: `E${number}`;
  document: string;
  knowledgeBase: string;
  version: number;
  section: string | null;
  headingPath: string[];
  page: number | null;
  slide: number | null;
  sheet: string | null;
  rowStart: number | null;
  rowEnd: number | null;
  excerpt: string;
  citationLabel: string;
}

export interface AskSophiaRequest {
  question: string;
  knowledgeBaseIds?: string[];
}

export interface AskSophiaResponse {
  mode: "ASK";
  answer: string;
  sources: AskSophiaSource[];
  insufficientEvidence: boolean;
  confidence?: RetrievalConfidence;
  debugTimings?: {
    requestTotalMs: number;
    stages: Array<{ name: string; durationMs: number }>;
    retrieval?: {
      totalMs: number;
      dbRoundTrips: number;
      externalCalls: number;
      cacheHit: boolean;
      exactLookup: boolean;
      stages: Array<{ name: string; durationMs: number }>;
    };
    answerGeneration?: {
      invoked: boolean;
      durationMs: number;
    };
  };
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
export type PracticeAssignmentStatus = "ASSIGNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
export type AssessmentStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";
export type AssessmentAssignmentStatus = "ASSIGNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
export type AssessmentAttemptStatus = "IN_PROGRESS" | "COMPLETED" | "FAILED";
export type DevelopmentPathStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";
export type DevelopmentPathStepType = "PRACTICE" | "ASSESSMENT";
export type DevelopmentPathAssignmentStatus = "ASSIGNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
export type DevelopmentPathStepProgressStatus = "LOCKED" | "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "FAILED" | "NEEDS_REASSESSMENT" | "UNAVAILABLE";
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
  simulation: SimulationRunConfiguration;
  messages: SimulationMessageResponse[];
  evaluation: SimulationEvaluationResponse | null;
  capabilityScores: CapabilityScoreResponse[];
}

export interface SimulationRunConfiguration {
  id: string;
  title: string;
  description: string;
  scenarioSetup: string;
  estimatedMinutes: number;
  status: SimulationStatus;
  persona: { id: string; name: string; role: string; tone: string } | null;
}

export type CapabilityTrend = "NEW" | "IMPROVING" | "STABLE" | "DECLINING";
export type CapabilityConfidence = "LOW" | "MEDIUM" | "HIGH";

export interface LearnerCapabilityProfileResponse {
  profile: {
    overallScore: number;
    previousOverallScore: number | null;
    trend: CapabilityTrend;
    confidence: CapabilityConfidence;
    simulationCount: number;
    lastAssessedAt: string | null;
    updatedAt: string;
  };
  capabilities: Array<{
    capabilityName: WorkforceCapability;
    currentScore: number;
    previousScore: number | null;
    change: number;
    lastAssessedAt: string;
    assessmentCount: number;
  }>;
  history: Array<{
    sessionId: string;
    capabilityName: WorkforceCapability;
    currentScore: number;
    previousScore: number | null;
    change: number;
    assessedAt: string;
  }>;
  recentSimulations: Array<{
    id: string;
    simulationId: string;
    simulationTitle: string;
    overallScore: number;
    completedAt: string;
  }>;
  recommendedFocusAreas: WorkforceCapability[];
}

export type LearningFactoryAssetType = "SIMULATION" | "QUESTION_BANK" | "LEARNING_OBJECTIVE" | "COACHING_FOCUS";
export type LearningFactoryDraftStatus = "DRAFT" | "APPROVED" | "REJECTED" | "PUBLISHED";

export interface LearningFactoryDraftResponse {
  id: string;
  sourceDocumentId: string | null;
  publishedSimulationId: string | null;
  publishedAt: string | null;
  title: string;
  description: string;
  assetType: LearningFactoryAssetType;
  status: LearningFactoryDraftStatus;
  generatedFrom: string;
  capabilityMappings: WorkforceCapability[];
  importance: KnowledgeImportance;
  confidence: number;
  businessValue: string;
  payload: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface LearningFactoryDraftListResponse {
  canManage: boolean;
  canPublishSimulation: boolean;
  drafts: LearningFactoryDraftResponse[];
}

export interface LearningFactoryGenerateResponse {
  generated: number;
  skippedDuplicates: number;
  drafts: LearningFactoryDraftResponse[];
}

export interface LearningFactoryPublishSimulationInput {
  title?: string;
  description?: string;
  industry?: string;
  department?: string;
  jobRole?: string;
  category?: string;
  difficulty?: SimulationDifficulty;
  estimatedMinutes?: number;
  scenarioSetup?: string;
  successCriteria?: string;
  objectives?: string[];
  personaId?: string | null;
  criterionIds?: string[];
}

export interface LearningFactoryPublishSimulationResponse {
  draft: LearningFactoryDraftResponse;
  simulation: SimulationDetail;
  alreadyPublished: boolean;
}

export type CoachingGeneratedBy = "DETERMINISTIC" | "AI";

export interface SimulationCoachingInsightResponse {
  id: string;
  sessionId: string;
  learnerId: string;
  summary: string;
  strengths: Array<{ title: string; evidence: string; capability: WorkforceCapability | null }>;
  improvementAreas: Array<{ title: string; evidence: string; recommendation: string; capability: WorkforceCapability }>;
  capabilityChanges: Array<{ capability: WorkforceCapability; currentScore: number; previousScore: number | null; change: number }>;
  knowledgeGaps: Array<{ topic: string; evidence: string; sourceTitle: string | null }>;
  nextBestAction: { title: string; description: string; capability: WorkforceCapability };
  estimatedImprovement: { minimumPoints: number; maximumPoints: number; basis: string; disclaimer: string };
  generatedBy: CoachingGeneratedBy;
  createdAt: string;
  updatedAt: string;
}

export type ManagerFollowUpStatus = "Needs Practice" | "Needs Review" | "Improving" | "Strong Performer" | "Not Enough Data";

export interface ManagerCapabilitySummary {
  capabilityName: WorkforceCapability;
  averageScore: number | null;
  previousAverageScore: number | null;
  change: number | null;
  assessmentCount: number;
  learnerCount: number;
}

export interface ManagerLearnerCapability {
  capabilityName: WorkforceCapability;
  currentScore: number | null;
  previousScore: number | null;
  change: number | null;
  assessmentCount: number;
  lastAssessedAt: string | null;
}

export interface ManagerLearnerSummary {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  overallScore: number | null;
  previousOverallScore: number | null;
  trend: CapabilityTrend | "NOT_ENOUGH_DATA";
  confidence: CapabilityConfidence | "NONE";
  simulationCount: number;
  completedSimulationCount: number;
  lastAssessedAt: string | null;
  strongestCapabilities: WorkforceCapability[];
  weakestCapabilities: WorkforceCapability[];
  followUpStatus: ManagerFollowUpStatus;
  followUpReason: string;
  recommendedFocusCapability: WorkforceCapability | null;
  openAssignmentCount: number;
}

export interface ManagerRecentSimulation {
  id: string;
  learnerId: string;
  learnerName: string;
  simulationId: string;
  simulationTitle: string;
  status: SimulationSessionStatus;
  overallScore: number | null;
  startedAt: string;
  completedAt: string | null;
}

export interface PracticeRecommendation {
  learnerId: string;
  learnerName: string;
  capability: WorkforceCapability | null;
  simulationId: string | null;
  simulationTitle: string | null;
  reason: string;
  evidence: string;
}

export interface PracticeAssignmentResponse {
  id: string;
  learner: { id: string; name: string; email: string };
  simulation: { id: string; title: string; status: SimulationStatus };
  assignedBy: { id: string; name: string; email: string };
  sessionId: string | null;
  status: PracticeAssignmentStatus;
  reason: string;
  focusCapability: WorkforceCapability | null;
  assignedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePracticeAssignmentInput {
  learnerId: string;
  simulationId: string;
  reason?: string;
  focusCapability?: WorkforceCapability | null;
}

export interface UpdatePracticeAssignmentInput {
  status: Extract<PracticeAssignmentStatus, "CANCELLED">;
}

export interface ManagerIntelligenceOverviewResponse {
  canManageAssignments: boolean;
  organization: OrganizationSummary;
  totals: {
    learners: number;
    completedSimulations: number;
    inProgressSimulations: number;
    openAssignments: number;
    completedAssignments: number;
    openAssessments: number;
    completedAssessments: number;
    passedAssessments: number;
    openDevelopmentPaths: number;
    completedDevelopmentPaths: number;
    stalledDevelopmentPaths: number;
    averageCapabilityScore: number | null;
  };
  capabilityOverview: ManagerCapabilitySummary[];
  learnersNeedingAttention: ManagerLearnerSummary[];
  recentSimulations: ManagerRecentSimulation[];
  recentCoachingInsights: Array<{
    id: string;
    sessionId: string;
    learnerId: string;
    learnerName: string;
    summary: string;
    nextBestAction: { title: string; description: string; capability: WorkforceCapability };
    createdAt: string;
  }>;
  recommendations: PracticeRecommendation[];
  developmentPaths: Array<{
    assignmentId: string;
    learnerId: string;
    learnerName: string;
    pathId: string;
    pathTitle: string;
    status: DevelopmentPathAssignmentStatus;
    percentComplete: number;
    currentStepTitle: string | null;
    currentStepStatus: DevelopmentPathStepProgressStatus | null;
  }>;
}

export interface ManagerLearnerListResponse {
  learners: ManagerLearnerSummary[];
}

export interface ManagerLearnerDetailResponse {
  learner: ManagerLearnerSummary & { capabilities: ManagerLearnerCapability[] };
  recentSimulations: ManagerRecentSimulation[];
  capabilityHistory: Array<{
    sessionId: string;
    capabilityName: WorkforceCapability;
    currentScore: number;
    previousScore: number | null;
    change: number;
    assessedAt: string;
    simulationTitle: string;
  }>;
  coachingInsights: Array<{
    id: string;
    sessionId: string;
    summary: string;
    strengths: SimulationCoachingInsightResponse["strengths"];
    improvementAreas: SimulationCoachingInsightResponse["improvementAreas"];
    nextBestAction: SimulationCoachingInsightResponse["nextBestAction"];
    createdAt: string;
  }>;
  assignments: PracticeAssignmentResponse[];
  recommendations: PracticeRecommendation[];
}

export interface PracticeAssignmentListResponse {
  canManageAssignments: boolean;
  assignments: PracticeAssignmentResponse[];
}

export interface AssessmentResponse {
  id: string;
  title: string;
  description: string;
  status: AssessmentStatus;
  passingScore: number;
  capabilities: WorkforceCapability[];
  createdAt: string;
  updatedAt: string;
  simulation: {
    id: string;
    title: string;
    description: string;
    status: SimulationStatus;
    estimatedMinutes: number;
  };
  createdBy: { id: string; name: string; email: string };
  assignmentCount: number;
  completedAttemptCount: number;
  passCount: number;
}

export interface SaveAssessmentInput {
  title: string;
  description?: string;
  simulationId: string;
  capabilities: WorkforceCapability[];
  passingScore: number;
  status?: AssessmentStatus;
}

export interface AssessmentAssignmentResponse {
  id: string;
  assessment: {
    id: string;
    title: string;
    description: string;
    status: AssessmentStatus;
    passingScore: number;
    capabilities: WorkforceCapability[];
    simulation: {
      id: string;
      title: string;
      description: string;
      status: SimulationStatus;
      estimatedMinutes: number;
    };
  };
  learner: { id: string; name: string; email: string };
  assignedBy: { id: string; name: string; email: string };
  attemptId: string | null;
  sessionId: string | null;
  status: AssessmentAssignmentStatus;
  reason: string;
  assignedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  result: {
    overallScore: number | null;
    passed: boolean | null;
    reportAvailable: boolean;
    coachAvailable: boolean;
  };
  canStart: boolean;
  canContinue: boolean;
  reportAvailable: boolean;
}

export interface CreateAssessmentAssignmentInput {
  learnerId: string;
  assessmentId: string;
  reason?: string;
}

export interface AssessmentDashboardResponse {
  canManageAssessments: boolean;
  canAssignAssessments: boolean;
  assessments: AssessmentResponse[];
  assignments: AssessmentAssignmentResponse[];
}

export interface MyAssessmentsResponse {
  summary: {
    assigned: number;
    inProgress: number;
    completed: number;
    passed: number;
    total: number;
  };
  assignments: {
    assigned: AssessmentAssignmentResponse[];
    inProgress: AssessmentAssignmentResponse[];
    completed: AssessmentAssignmentResponse[];
  };
}

export interface DevelopmentPathStepResponse {
  id: string;
  type: DevelopmentPathStepType;
  sortOrder: number;
  title: string;
  required: boolean;
  simulation: { id: string; title: string; status: SimulationStatus; estimatedMinutes: number } | null;
  assessment: { id: string; title: string; status: AssessmentStatus; passingScore: number } | null;
}

export interface DevelopmentPathResponse {
  id: string;
  title: string;
  description: string;
  targetRole: string;
  department: string;
  capabilities: WorkforceCapability[];
  status: DevelopmentPathStatus;
  createdAt: string;
  updatedAt: string;
  createdBy: { id: string; name: string; email: string };
  steps: DevelopmentPathStepResponse[];
  assignmentCount: number;
}

export interface SaveDevelopmentPathInput {
  title: string;
  description?: string;
  targetRole?: string;
  department?: string;
  capabilities: WorkforceCapability[];
  status?: DevelopmentPathStatus;
  steps: Array<{
    id?: string;
    type: DevelopmentPathStepType;
    title?: string;
    sortOrder: number;
    required?: boolean;
    simulationId?: string | null;
    assessmentId?: string | null;
  }>;
}

export interface CreateDevelopmentPathAssignmentInput {
  learnerId: string;
  developmentPathId: string;
  reason?: string;
}

export interface DevelopmentPathStepProgressResponse {
  step: DevelopmentPathStepResponse;
  status: DevelopmentPathStepProgressStatus;
  locked: boolean;
  required: boolean;
  actionLabel: string;
  actionHref: string | null;
  practiceAssignment: MyPracticeAssignmentResponse | null;
  assessmentAssignment: AssessmentAssignmentResponse | null;
}

export interface DevelopmentPathAssignmentResponse {
  id: string;
  developmentPath: DevelopmentPathResponse;
  learner: { id: string; name: string; email: string };
  assignedBy: { id: string; name: string; email: string };
  status: DevelopmentPathAssignmentStatus;
  reason: string;
  assignedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  progress: {
    completedRequiredSteps: number;
    totalRequiredSteps: number;
    percentComplete: number;
    currentStepTitle: string | null;
    currentStepStatus: DevelopmentPathStepProgressStatus | null;
  };
  steps: DevelopmentPathStepProgressResponse[];
}

export interface DevelopmentPathDashboardResponse {
  canManagePaths: boolean;
  canAssignPaths: boolean;
  paths: DevelopmentPathResponse[];
  assignments: DevelopmentPathAssignmentResponse[];
}

export interface MyDevelopmentResponse {
  summary: {
    assigned: number;
    inProgress: number;
    completed: number;
    total: number;
  };
  assignments: {
    assigned: DevelopmentPathAssignmentResponse[];
    inProgress: DevelopmentPathAssignmentResponse[];
    completed: DevelopmentPathAssignmentResponse[];
  };
}

export type MyPracticeProgressStatus =
  | "Improved"
  | "Stable"
  | "Needs more practice"
  | "Not enough data";

export interface MyPracticeAssignmentResponse {
  assignmentId: string;
  simulation: {
    id: string;
    title: string;
    description: string;
    status: SimulationStatus;
    estimatedMinutes: number;
  };
  status: PracticeAssignmentStatus;
  reason: string;
  focusCapability: WorkforceCapability | null;
  assignedBy: { id: string; name: string; email: string };
  assignedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  session: {
    id: string;
    status: SimulationSessionStatus;
    reportAvailable: boolean;
    coachAvailable: boolean;
    overallScore: number | null;
    completedAt: string | null;
  } | null;
  canStart: boolean;
  canContinue: boolean;
  reportAvailable: boolean;
  coachAvailable: boolean;
}

export interface MyPracticeProgressSummary {
  status: MyPracticeProgressStatus;
  overallScore: number | null;
  previousOverallScore: number | null;
  change: number | null;
  trend: CapabilityTrend | "NOT_ENOUGH_DATA";
  confidence: CapabilityConfidence | "NONE";
  simulationCount: number;
  lastAssessedAt: string | null;
  recommendedFocusAreas: WorkforceCapability[];
}

export interface MyPracticeResponse {
  summary: {
    needsAttention: number;
    inProgress: number;
    completed: number;
    total: number;
  };
  progress: MyPracticeProgressSummary;
  assignments: {
    needsAttention: MyPracticeAssignmentResponse[];
    inProgress: MyPracticeAssignmentResponse[];
    completed: MyPracticeAssignmentResponse[];
  };
}
