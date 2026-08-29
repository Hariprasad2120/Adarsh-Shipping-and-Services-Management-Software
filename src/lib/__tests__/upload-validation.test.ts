import { describe, expect, it } from "vitest";
import {
  assertSafeFileContent,
  sniffType,
  UploadValidationError,
  validateUpload,
} from "@/lib/upload-validation";

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const PDF = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]);
const HTML = new TextEncoder().encode("<!DOCTYPE html><script>alert(1)</script>");

function file(bytes: Uint8Array, name: string, type: string): File {
  return new File([bytes], name, { type });
}

describe("sniffType", () => {
  it("recognises common signatures", () => {
    expect(sniffType(PNG)).toBe("image/png");
    expect(sniffType(PDF)).toBe("application/pdf");
    expect(sniffType(HTML)).toBeNull();
  });
});

describe("assertSafeFileContent", () => {
  it("passes a real PDF named .pdf", () => {
    expect(() => assertSafeFileContent(PDF, "pdf")).not.toThrow();
  });
  it("rejects HTML/script content", () => {
    expect(() => assertSafeFileContent(HTML, "pdf")).toThrow(UploadValidationError);
  });
  it("rejects a content/extension mismatch", () => {
    expect(() => assertSafeFileContent(PNG, "pdf")).toThrow(UploadValidationError);
  });
});

describe("validateUpload", () => {
  it("accepts a valid png image", async () => {
    const res = await validateUpload(file(PNG, "logo.png", "image/png"), { kind: "image" });
    expect(res.extension).toBe("png");
    expect(res.sniffedType).toBe("image/png");
  });

  it("rejects an HTML payload disguised as a .pdf", async () => {
    await expect(
      validateUpload(file(HTML, "invoice.pdf", "application/pdf"), { kind: "document" }),
    ).rejects.toBeInstanceOf(UploadValidationError);
  });

  it("rejects a disallowed extension", async () => {
    await expect(
      validateUpload(file(PNG, "x.svg", "image/svg+xml"), { kind: "image" }),
    ).rejects.toBeInstanceOf(UploadValidationError);
  });

  it("rejects oversize files", async () => {
    const big = new Uint8Array(1024);
    big.set(PNG);
    await expect(
      validateUpload(file(big, "x.png", "image/png"), { kind: "image", maxBytes: 100 }),
    ).rejects.toMatchObject({ code: "TOO_LARGE" });
  });

  it("rejects an empty file", async () => {
    await expect(
      validateUpload(file(new Uint8Array(0), "x.png", "image/png"), { kind: "image" }),
    ).rejects.toMatchObject({ code: "EMPTY" });
  });
});
