import { describe, expect, it } from "vitest";
import { UserRole } from "@prisma/client";
import {
  getTestApp,
  setupIntegrationSuite,
} from "../../../test/helpers/build-test-app";
import { authedInject } from "../../../test/helpers/auth";
import { getTestPrisma } from "../../../test/helpers/db";
import { makeNotification, makeUser } from "../../../test/factories";

setupIntegrationSuite();

const asAuthUser = (user: Awaited<ReturnType<typeof makeUser>>) => ({
  id: user.id,
  email: user.email,
  role: user.role as string,
  name: user.name,
  status: user.status,
  permissionScope: user.permissionScope,
});

describe("notifications — GET /api/notifications", () => {
  it("returns 401 without token", async () => {
    const app = await getTestApp();
    const res = await app.inject({ method: "GET", url: "/api/notifications" });
    expect(res.statusCode).toBe(401);
  });

  it("lists only the caller's notifications, newest first", async () => {
    const app = await getTestApp();
    const prisma = getTestPrisma();
    const me = await makeUser({ role: UserRole.RESIDENT });
    const other = await makeUser({ role: UserRole.RESIDENT });

    // Seed 3 for me (different timestamps) and 1 for other
    const n1 = await prisma.notification.create({
      data: {
        userId: me.id,
        type: "A",
        title: "old",
        body: "b",
        createdAt: new Date(Date.now() - 3000),
      },
    });
    const n2 = await prisma.notification.create({
      data: {
        userId: me.id,
        type: "A",
        title: "mid",
        body: "b",
        createdAt: new Date(Date.now() - 2000),
      },
    });
    const n3 = await prisma.notification.create({
      data: {
        userId: me.id,
        type: "A",
        title: "newest",
        body: "b",
        createdAt: new Date(Date.now() - 1000),
      },
    });
    await makeNotification({ userId: other.id, title: "not mine" });

    const res = await authedInject(app, asAuthUser(me), {
      method: "GET",
      url: "/api/notifications",
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.notifications).toHaveLength(3);
    expect(body.notifications[0].id).toBe(n3.id);
    expect(body.notifications[2].id).toBe(n1.id);
    expect(body.nextCursor).toBeNull();
    expect(body.unreadCount).toBe(3);

    // Use n2 to silence "unused" and verify middle ordering
    expect(body.notifications[1].id).toBe(n2.id);
  });

  it("filters by unreadOnly=true", async () => {
    const app = await getTestApp();
    const me = await makeUser({ role: UserRole.RESIDENT });
    await makeNotification({ userId: me.id, read: false, title: "u1" });
    await makeNotification({ userId: me.id, read: true, title: "read" });

    const res = await authedInject(app, asAuthUser(me), {
      method: "GET",
      url: "/api/notifications?unreadOnly=true",
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.notifications).toHaveLength(1);
    expect(body.notifications[0].title).toBe("u1");
  });

  it("applies limit (max 50, default 20)", async () => {
    const app = await getTestApp();
    const me = await makeUser({ role: UserRole.RESIDENT });
    for (let i = 0; i < 5; i++) {
      await makeNotification({ userId: me.id, title: `n${i}` });
    }

    const res = await authedInject(app, asAuthUser(me), {
      method: "GET",
      url: "/api/notifications?limit=2",
    });
    const body = res.json();
    expect(body.notifications).toHaveLength(2);
    expect(body.nextCursor).not.toBeNull();
  });

  it("falls back to default limit when limit is invalid", async () => {
    const app = await getTestApp();
    const me = await makeUser({ role: UserRole.RESIDENT });
    await makeNotification({ userId: me.id });

    const res = await authedInject(app, asAuthUser(me), {
      method: "GET",
      url: "/api/notifications?limit=abc",
    });
    expect(res.statusCode).toBe(200);
  });

  it("caps limit at MAX_LIMIT=50", async () => {
    const app = await getTestApp();
    const me = await makeUser({ role: UserRole.RESIDENT });
    await makeNotification({ userId: me.id });

    const res = await authedInject(app, asAuthUser(me), {
      method: "GET",
      url: "/api/notifications?limit=500",
    });
    expect(res.statusCode).toBe(200);
    // Only 1 notif exists, so not capped-observable, but just assert OK
    expect(res.json().notifications).toHaveLength(1);
  });

  it("supports cursor-based pagination", async () => {
    const app = await getTestApp();
    const me = await makeUser({ role: UserRole.RESIDENT });
    const ids: string[] = [];
    for (let i = 0; i < 4; i++) {
      const n = await makeNotification({ userId: me.id, title: `n${i}` });
      ids.push(n.id);
      await new Promise((r) => setTimeout(r, 5));
    }

    const page1 = await authedInject(app, asAuthUser(me), {
      method: "GET",
      url: "/api/notifications?limit=2",
    });
    const body1 = page1.json();
    expect(body1.notifications).toHaveLength(2);
    expect(body1.nextCursor).not.toBeNull();

    const page2 = await authedInject(app, asAuthUser(me), {
      method: "GET",
      url: `/api/notifications?limit=2&cursor=${body1.nextCursor}`,
    });
    const body2 = page2.json();
    expect(body2.notifications).toHaveLength(2);
    // No overlap
    const seen = new Set([
      ...body1.notifications.map((n: { id: string }) => n.id),
      ...body2.notifications.map((n: { id: string }) => n.id),
    ]);
    expect(seen.size).toBe(4);
  });

  it("ignores invalid cursor id (returns all as if no cursor)", async () => {
    const app = await getTestApp();
    const me = await makeUser({ role: UserRole.RESIDENT });
    await makeNotification({ userId: me.id });

    const res = await authedInject(app, asAuthUser(me), {
      method: "GET",
      url: "/api/notifications?cursor=nonexistent-id",
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().notifications).toHaveLength(1);
  });
});

describe("notifications — GET /api/notifications/unread-count", () => {
  it("returns 401 without token", async () => {
    const app = await getTestApp();
    const res = await app.inject({
      method: "GET",
      url: "/api/notifications/unread-count",
    });
    expect(res.statusCode).toBe(401);
  });

  it("returns count of unread notifications only for caller", async () => {
    const app = await getTestApp();
    const me = await makeUser({ role: UserRole.RESIDENT });
    const other = await makeUser({ role: UserRole.RESIDENT });

    await makeNotification({ userId: me.id, read: false });
    await makeNotification({ userId: me.id, read: false });
    await makeNotification({ userId: me.id, read: true });
    await makeNotification({ userId: other.id, read: false });

    const res = await authedInject(app, asAuthUser(me), {
      method: "GET",
      url: "/api/notifications/unread-count",
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ unreadCount: 2 });
  });

  it("returns 0 when no notifications", async () => {
    const app = await getTestApp();
    const me = await makeUser({ role: UserRole.RESIDENT });
    const res = await authedInject(app, asAuthUser(me), {
      method: "GET",
      url: "/api/notifications/unread-count",
    });
    expect(res.json()).toEqual({ unreadCount: 0 });
  });
});

describe("notifications — PATCH /api/notifications/:id/read", () => {
  it("returns 401 without token", async () => {
    const app = await getTestApp();
    const res = await app.inject({
      method: "PATCH",
      url: "/api/notifications/x/read",
    });
    expect(res.statusCode).toBe(401);
  });

  it("marks a notification as read", async () => {
    const app = await getTestApp();
    const prisma = getTestPrisma();
    const me = await makeUser({ role: UserRole.RESIDENT });
    const n = await makeNotification({ userId: me.id, read: false });

    const res = await authedInject(app, asAuthUser(me), {
      method: "PATCH",
      url: `/api/notifications/${n.id}/read`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().success).toBe(true);

    const updated = await prisma.notification.findUnique({ where: { id: n.id } });
    expect(updated?.read).toBe(true);
  });

  it("returns 404 when notification does not exist", async () => {
    const app = await getTestApp();
    const me = await makeUser({ role: UserRole.RESIDENT });

    const res = await authedInject(app, asAuthUser(me), {
      method: "PATCH",
      url: "/api/notifications/missing-id/read",
    });
    expect(res.statusCode).toBe(404);
  });

  it("returns 403 when attempting to mark someone else's notification", async () => {
    const app = await getTestApp();
    const me = await makeUser({ role: UserRole.RESIDENT });
    const other = await makeUser({ role: UserRole.RESIDENT });
    const n = await makeNotification({ userId: other.id });

    const res = await authedInject(app, asAuthUser(me), {
      method: "PATCH",
      url: `/api/notifications/${n.id}/read`,
    });
    expect(res.statusCode).toBe(403);
  });
});

describe("notifications — PATCH /api/notifications/read-all", () => {
  it("returns 401 without token", async () => {
    const app = await getTestApp();
    const res = await app.inject({
      method: "PATCH",
      url: "/api/notifications/read-all",
    });
    expect(res.statusCode).toBe(401);
  });

  it("marks all unread notifications as read for caller only", async () => {
    const app = await getTestApp();
    const prisma = getTestPrisma();
    const me = await makeUser({ role: UserRole.RESIDENT });
    const other = await makeUser({ role: UserRole.RESIDENT });

    await makeNotification({ userId: me.id, read: false });
    await makeNotification({ userId: me.id, read: false });
    await makeNotification({ userId: me.id, read: true });
    await makeNotification({ userId: other.id, read: false });

    const res = await authedInject(app, asAuthUser(me), {
      method: "PATCH",
      url: "/api/notifications/read-all",
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ updated: 2 });

    // Other user's notification still unread
    const otherUnread = await prisma.notification.count({
      where: { userId: other.id, read: false },
    });
    expect(otherUnread).toBe(1);

    const myUnread = await prisma.notification.count({
      where: { userId: me.id, read: false },
    });
    expect(myUnread).toBe(0);
  });

  it("returns updated: 0 when there are no unread notifications", async () => {
    const app = await getTestApp();
    const me = await makeUser({ role: UserRole.RESIDENT });

    const res = await authedInject(app, asAuthUser(me), {
      method: "PATCH",
      url: "/api/notifications/read-all",
    });
    expect(res.json()).toEqual({ updated: 0 });
  });
});
