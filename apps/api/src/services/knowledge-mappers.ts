import type { DocumentDetail, DocumentSummary, DocumentVersionSummary, KnowledgeBaseSummary } from "@simforge/shared";

interface PersonRecord {
  id: string;
  fullName: string | null;
  email: string;
}

interface KnowledgeBaseRecord {
  id: string;
  name: string;
  description: string;
  department: string;
  status: "Active" | "Archived";
  createdAt: Date;
  updatedAt: Date;
  creator: PersonRecord;
  _count: { documents: number };
}

interface VersionRecord {
  id: string;
  version: number;
  fileName: string;
  fileType: "PDF" | "DOCX" | "PPTX" | "XLSX";
  mimeType: string;
  sizeBytes: bigint;
  storagePath: string;
  uploadedAt: Date;
  notes: string;
  uploader: PersonRecord;
}

interface DocumentRecord {
  id: string;
  fileName: string;
  fileType: "PDF" | "DOCX" | "PPTX" | "XLSX";
  mimeType: string;
  sizeBytes: bigint;
  storagePath: string;
  uploadedAt: Date;
  currentVersion: number;
  status: "Ready" | "Archived" | "Failed";
  notes: string;
  updatedAt: Date;
  uploader: PersonRecord;
  knowledgeBase: { id: string; name: string; department: string };
  knowledgeSource?: { id: string; status: "Uploaded" | "Queued" | "Processing" | "Completed" | "Failed" | "Cancelled"; progress: number; failureReason: string | null; processedAt: Date | null } | null;
}

function person(record: PersonRecord) {
  return { id: record.id, name: record.fullName ?? record.email, email: record.email };
}

export function knowledgeBaseSummary(record: KnowledgeBaseRecord): KnowledgeBaseSummary {
  return {
    id: record.id,
    name: record.name,
    description: record.description,
    department: record.department,
    status: record.status,
    createdBy: person(record.creator),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    documentCount: record._count.documents,
  };
}

export function documentSummary(record: DocumentRecord): DocumentSummary {
  return {
    id: record.id,
    knowledgeBase: record.knowledgeBase,
    fileName: record.fileName,
    fileType: record.fileType,
    mimeType: record.mimeType,
    sizeBytes: Number(record.sizeBytes),
    uploadedBy: person(record.uploader),
    uploadedAt: record.uploadedAt.toISOString(),
    currentVersion: record.currentVersion,
    status: record.status,
    notes: record.notes,
    updatedAt: record.updatedAt.toISOString(),
    processing: record.knowledgeSource ? { sourceId: record.knowledgeSource.id, status: record.knowledgeSource.status, progress: record.knowledgeSource.progress, failureReason: record.knowledgeSource.failureReason, processedAt: record.knowledgeSource.processedAt?.toISOString() ?? null } : { sourceId: null, status: "Uploaded", progress: 0, failureReason: null, processedAt: null },
  };
}

export function versionSummary(record: VersionRecord): DocumentVersionSummary {
  return {
    id: record.id,
    version: record.version,
    fileName: record.fileName,
    fileType: record.fileType,
    mimeType: record.mimeType,
    sizeBytes: Number(record.sizeBytes),
    storagePath: record.storagePath,
    uploadedBy: person(record.uploader),
    uploadedAt: record.uploadedAt.toISOString(),
    notes: record.notes,
  };
}

export function documentDetail(record: DocumentRecord & { versions: VersionRecord[] }, canEdit: boolean): DocumentDetail {
  return {
    ...documentSummary(record),
    storagePath: record.storagePath,
    versions: record.versions.map(versionSummary),
    canEdit,
  };
}
