import assert from "node:assert/strict";
import test from "node:test";
import { createStoragePath, getDocumentFileType, uploadFileRequest, validateDocumentFile } from "./knowledge-files";

test("approved document extensions are recognized independent of browser MIME reporting", () => {
  const docx = new File(["content"], "Support Playbook.DOCX", { type: "application/octet-stream" });
  assert.equal(getDocumentFileType(docx), "DOCX");
  assert.equal(validateDocumentFile(docx), "DOCX");
});

test("unsupported document extensions are rejected before upload", () => {
  const text = new File(["content"], "notes.txt", { type: "text/plain" });
  assert.throws(() => validateDocumentFile(text), /only PDF, DOCX, PPTX, and XLSX/);
});

test("storage paths are organization and knowledge-base scoped", () => {
  const path = createStoragePath("org-id", "kb-id", "Regional Policy (Final).pdf");
  assert.match(path, /^org-id\/kb-id\/[0-9a-f-]+-Regional-Policy-Final-\.pdf$/);
  assert.equal(path.includes(" "), false);
});

test("Storage upload reports progress and sends canonical MIME and authorization headers", async () => {
  const original = globalThis.XMLHttpRequest;
  const headers = new Map<string, string>();
  let openedUrl = "";
  let progressListener: ((event: ProgressEvent) => void) | undefined;
  let loadListener: (() => void) | undefined;

  class FakeRequest {
    status = 201;
    upload = { addEventListener: (_name: string, listener: (event: ProgressEvent) => void) => { progressListener = listener; } };
    open(_method: string, url: string) { openedUrl = url; }
    setRequestHeader(name: string, value: string) { headers.set(name, value); }
    addEventListener(name: string, listener: () => void) { if (name === "load") loadListener = listener; }
    send() {
      progressListener?.({ lengthComputable: true, loaded: 5, total: 10 } as ProgressEvent);
      loadListener?.();
    }
  }

  globalThis.XMLHttpRequest = FakeRequest as unknown as typeof XMLHttpRequest;
  try {
    const progress: number[] = [];
    const file = new File(["pdf"], "policy.pdf", { type: "" });
    await uploadFileRequest(file, "org/kb/policy.pdf", "PDF", { baseUrl: "https://project.supabase.co", publishableKey: "publishable", accessToken: "token" }, (value) => progress.push(value));
    assert.equal(openedUrl, "https://project.supabase.co/storage/v1/object/knowledge-documents/org/kb/policy.pdf");
    assert.equal(headers.get("Content-Type"), "application/pdf");
    assert.equal(headers.get("Authorization"), "Bearer token");
    assert.equal(headers.get("x-upsert"), "false");
    assert.deepEqual(progress, [50]);
  } finally {
    globalThis.XMLHttpRequest = original;
  }
});
