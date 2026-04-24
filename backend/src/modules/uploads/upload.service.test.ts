import { describe, expect, it } from "vitest";
import { extractFilePathFromUrl, BUCKETS } from "./upload.service";

describe("upload.service — extractFilePathFromUrl", () => {
  it("extracts path after bucket marker", () => {
    const url = `https://storage.test/bucket/${BUCKETS.COMPLAINTS}/condo-123/abc.png`;
    expect(extractFilePathFromUrl(url, BUCKETS.COMPLAINTS)).toBe(
      "condo-123/abc.png"
    );
  });

  it("throws when URL does not contain the bucket marker", () => {
    expect(() =>
      extractFilePathFromUrl("https://other.test/unrelated", BUCKETS.COMPLAINTS)
    ).toThrow(/Invalid public URL/);
  });

  it("works with documents bucket too", () => {
    const url = `https://s.test/root/${BUCKETS.DOCUMENTS}/c/r/doc.pdf`;
    expect(extractFilePathFromUrl(url, BUCKETS.DOCUMENTS)).toBe("c/r/doc.pdf");
  });
});
