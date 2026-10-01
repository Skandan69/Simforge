import assert from "node:assert/strict";
import test from "node:test";
import JSZip from "jszip";
import { inspectZipArchive } from "./extractors.js";

test("zip inspection accepts a normal Office-sized archive", async () => {
  const zip = new JSZip();
  zip.file("ppt/slides/slide1.xml", "<a:t>Hello</a:t>");
  const buffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  const result = inspectZipArchive(buffer);
  assert.equal(result.uncompressedBytes, 16); // folder entries add 0 bytes
  assert.ok(result.entries >= 1);
});

test("zip inspection rejects archives that expand beyond the limit (zip bomb)", async () => {
  const zip = new JSZip();
  zip.file("word/document.xml", "a".repeat(2_000_000));
  const buffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  assert.ok(buffer.length < 50_000, "fixture should compress heavily");
  assert.throws(() => inspectZipArchive(buffer, { maxEntries: 100, maxUncompressedBytes: 1_000_000 }), /expands to more content/);
});

test("zip inspection rejects too many entries and non-zip data", async () => {
  const zip = new JSZip();
  for (let index = 0; index < 5; index++) zip.file(`f${index}.xml`, "x");
  const buffer = await zip.generateAsync({ type: "nodebuffer" });
  assert.throws(() => inspectZipArchive(buffer, { maxEntries: 3, maxUncompressedBytes: 1_000 }), /too many embedded files/);
  assert.throws(() => inspectZipArchive(Buffer.from("PK not really a zip file at all")), /Invalid Open XML/);
});
