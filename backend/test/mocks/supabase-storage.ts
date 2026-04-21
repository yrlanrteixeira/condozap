import { vi } from "vitest";

/**
 * Global mocks for external storage backends (Supabase Storage and S3).
 *
 * Real modules:
 *   - backend/src/shared/db/supabase.ts — Supabase Storage helpers.
 *   - backend/src/shared/db/s3.ts       — S3-compatible storage helpers.
 *
 * Both expose the same high-level function names (`uploadFileToStorage`,
 * `getFileFromStorage` / `getObjectFromStorage`, `deleteFileFromStorage`).
 * The runtime picks one based on `STORAGE_PROVIDER` config. In tests we mock
 * both so either code path is covered regardless of env.
 */

const defaultUploadResult = {
  publicUrl: "https://mock-storage.local/bucket/file.bin",
};

const defaultGetResult = {
  data: Buffer.from("mock-file-contents"),
  contentType: "application/octet-stream",
};

export const mockSupabaseStorage = {
  getSupabaseClient: vi.fn(() => ({
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ data: { path: "mock" }, error: null }),
        download: vi.fn().mockResolvedValue({ data: new Blob([""]), error: null }),
        remove: vi.fn().mockResolvedValue({ data: [], error: null }),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: defaultUploadResult.publicUrl } })),
      })),
    },
  })),
  getSupabaseClientWithToken: vi.fn(),
  getStorageBucket: vi.fn(),
  uploadFileToStorage: vi.fn().mockResolvedValue(defaultUploadResult),
  deleteFileFromStorage: vi.fn().mockResolvedValue(undefined),
  getFileFromStorage: vi.fn().mockResolvedValue(defaultGetResult),
};

export const mockS3Storage = {
  uploadFileToStorage: vi.fn().mockResolvedValue(defaultUploadResult),
  getObjectFromStorage: vi.fn().mockResolvedValue(defaultGetResult),
  deleteFileFromStorage: vi.fn().mockResolvedValue(undefined),
};

vi.mock("../../src/shared/db/supabase", () => mockSupabaseStorage);
vi.mock("../../src/shared/db/s3", () => mockS3Storage);
