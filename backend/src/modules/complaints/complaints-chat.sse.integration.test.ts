import { describe, expect, it, beforeEach, vi } from "vitest";
import { SubscriptionStatus, UserRole } from "@prisma/client";
import {
  getTestApp,
  setupIntegrationSuite,
} from "../../../test/helpers/build-test-app";
import { authedInject } from "../../../test/helpers/auth";
import { getTestPrisma } from "../../../test/helpers/db";
import {
  makeCondominium,
  makeResident,
  makeUser,
  makeComplaint,
} from "../../../test/factories";
import {
  subscribeToChannel,
  getChannelSubscriberCount,
} from "../../plugins/sse";

setupIntegrationSuite();

beforeEach(() => {
  vi.clearAllMocks();
});

const addDays = (d: Date, days: number) =>
  new Date(d.getTime() + days * 86400_000);

async function makeSyndicWithSub() {
  const syndic = await makeUser({ role: UserRole.SYNDIC });
  await getTestPrisma().subscription.create({
    data: {
      syndicId: syndic.id,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodEnd: addDays(new Date(), 30),
    },
  });
  return syndic;
}

const asAuthUser = (u: { id: string; email: string; role: string; name: string; status: string }) => ({
  id: u.id,
  email: u.email,
  role: u.role,
  status: u.status,
  name: u.name,
  permissionScope: "LOCAL",
});

/**
 * Minimal stand-in for a Node http response that records writes.
 * Mirrors the surface used by sse.ts (`write(string)`).
 */
function makeFakeRawWriter() {
  const writes: string[] = [];
  return {
    writes,
    write: (chunk: string) => {
      writes.push(chunk);
      return true;
    },
  };
}

describe("complaints chat — SSE push (no polling)", () => {
  it("delivers a 'new_message' event on the complaint channel when a message is posted", async () => {
    const app = await getTestApp();
    const syndic = await makeSyndicWithSub();
    const condo = await makeCondominium({ primarySyndicId: syndic.id });
    await getTestPrisma().userCondominium.create({
      data: {
        userId: syndic.id,
        condominiumId: condo.id,
        role: UserRole.SYNDIC,
      },
    });
    const resident = await makeResident({ condominiumId: condo.id });
    const complaint = await makeComplaint({
      condominiumId: condo.id,
      residentId: resident.id,
    });

    // Subscribe a fake SSE writer to the per-complaint channel — same path
    // a real EventSource client uses (via the /stream handler).
    const fake = makeFakeRawWriter();
    const channel = `complaint:${complaint.id}`;
    const unsubscribe = subscribeToChannel(channel, fake);
    expect(getChannelSubscriberCount(channel)).toBe(1);

    try {
      const res = await authedInject(app, asAuthUser(syndic), {
        method: "POST",
        url: `/api/complaint-messages/${complaint.id}`,
        payload: { content: "hello over SSE", notifyWhatsapp: false },
      });
      expect(res.statusCode).toBe(201);
      const body = res.json();

      // The fake writer must have received a 'new_message' event
      // with the same payload structure the controller returns.
      const messageEvent = fake.writes.find((w) =>
        w.startsWith("event: new_message")
      );
      expect(messageEvent).toBeDefined();
      const dataLine = messageEvent!
        .split("\n")
        .find((l) => l.startsWith("data: "))!;
      const payload = JSON.parse(dataLine.slice("data: ".length));
      expect(payload.id).toBe(body.id);
      expect(payload.content).toBe("hello over SSE");
      expect(payload.senderId).toBe(syndic.id);
      expect(payload.senderRole).toBe("SYNDIC");
      expect(payload.createdAt).toBe(body.createdAt);
    } finally {
      unsubscribe();
    }

    expect(getChannelSubscriberCount(channel)).toBe(0);
  });

  it("does not push to a different complaint's channel", async () => {
    const app = await getTestApp();
    const syndic = await makeSyndicWithSub();
    const condo = await makeCondominium({ primarySyndicId: syndic.id });
    await getTestPrisma().userCondominium.create({
      data: {
        userId: syndic.id,
        condominiumId: condo.id,
        role: UserRole.SYNDIC,
      },
    });
    const resident = await makeResident({ condominiumId: condo.id });
    const c1 = await makeComplaint({
      condominiumId: condo.id,
      residentId: resident.id,
    });
    const c2 = await makeComplaint({
      condominiumId: condo.id,
      residentId: resident.id,
    });

    const eavesdropper = makeFakeRawWriter();
    const unsubscribe = subscribeToChannel(`complaint:${c2.id}`, eavesdropper);

    try {
      const res = await authedInject(app, asAuthUser(syndic), {
        method: "POST",
        url: `/api/complaint-messages/${c1.id}`,
        payload: { content: "private", notifyWhatsapp: false },
      });
      expect(res.statusCode).toBe(201);

      const leaked = eavesdropper.writes.find((w) =>
        w.startsWith("event: new_message")
      );
      expect(leaked).toBeUndefined();
    } finally {
      unsubscribe();
    }
  });
});
