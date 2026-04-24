import { describe, expect, it, vi } from "vitest";
import {
  DEFAULT_LIMIT,
  DEFAULT_PAGE,
  MAX_LIMIT,
  createPaginatedResponse,
  getPrismaPageParams,
  normalizePagination,
  paginatedQuery,
} from "./pagination";

describe("pagination.normalizePagination", () => {
  it("applies defaults when no params provided", () => {
    expect(normalizePagination({})).toEqual({
      page: DEFAULT_PAGE,
      limit: DEFAULT_LIMIT,
      skip: 0,
    });
  });

  it("computes skip from page and limit", () => {
    expect(normalizePagination({ page: 3, limit: 10 })).toEqual({
      page: 3,
      limit: 10,
      skip: 20,
    });
  });

  it("floors page to 1 when zero or negative", () => {
    expect(normalizePagination({ page: 0 }).page).toBe(1);
    expect(normalizePagination({ page: -5 }).page).toBe(1);
  });

  it("caps limit at MAX_LIMIT", () => {
    expect(normalizePagination({ limit: 10_000 }).limit).toBe(MAX_LIMIT);
  });

  it("floors limit to 1 when zero or negative", () => {
    expect(normalizePagination({ limit: 0 }).limit).toBe(DEFAULT_LIMIT); // falsy -> default
    expect(normalizePagination({ limit: -3 }).limit).toBe(1);
  });
});

describe("pagination.createPaginatedResponse", () => {
  it("computes totalPages and hasNext/hasPrev correctly on first page", () => {
    const r = createPaginatedResponse([1, 2, 3], 30, 1, 10);
    expect(r.pagination.totalPages).toBe(3);
    expect(r.pagination.hasPrev).toBe(false);
    expect(r.pagination.hasNext).toBe(true);
  });

  it("handles last page", () => {
    const r = createPaginatedResponse([1], 3, 3, 1);
    expect(r.pagination.hasNext).toBe(false);
    expect(r.pagination.hasPrev).toBe(true);
  });

  it("treats empty total as single page", () => {
    const r = createPaginatedResponse([], 0, 1, 10);
    expect(r.pagination.totalPages).toBe(1);
    expect(r.pagination.hasNext).toBe(false);
    expect(r.pagination.hasPrev).toBe(false);
  });

  it("preserves data in payload", () => {
    const r = createPaginatedResponse([{ a: 1 }], 1, 1, 10);
    expect(r.data).toEqual([{ a: 1 }]);
  });
});

describe("pagination.getPrismaPageParams", () => {
  it("returns { skip, take } compatible with Prisma", () => {
    expect(getPrismaPageParams({ page: 2, limit: 5 })).toEqual({
      skip: 5,
      take: 5,
    });
  });
});

describe("pagination.paginatedQuery", () => {
  it("runs findMany + count in parallel and wraps result", async () => {
    const findMany = vi.fn().mockResolvedValue([{ id: 1 }, { id: 2 }]);
    const count = vi.fn().mockResolvedValue(42);
    const model = { findMany, count };

    const result = await paginatedQuery(
      model,
      { where: { active: true } },
      { page: 2, limit: 10 }
    );

    expect(findMany).toHaveBeenCalledWith({
      where: { active: true },
      skip: 10,
      take: 10,
    });
    expect(count).toHaveBeenCalledWith({ where: { active: true } });
    expect(result.data).toHaveLength(2);
    expect(result.pagination.total).toBe(42);
    expect(result.pagination.page).toBe(2);
  });
});
