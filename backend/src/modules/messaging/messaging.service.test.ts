import { describe, expect, it, vi, beforeEach } from "vitest";
import { mockEvolutionService } from "../../../test/mocks/evolution-client";
import { messagingService } from "./messaging.service";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("messagingService.sendText (evolution provider)", () => {
  it("sends a text message and returns success+messageId", async () => {
    mockEvolutionService.sendText.mockResolvedValueOnce({
      key: { id: "evo-123", remoteJid: "x@s.whatsapp.net", fromMe: true },
      status: "PENDING",
      message: { conversation: "mock" },
    });

    const r = await messagingService.sendText("11987654321", "hello");
    expect(r.success).toBe(true);
    expect(r.messageId).toBe("evo-123");
    expect(mockEvolutionService.sendText).toHaveBeenCalledTimes(1);

    const call = mockEvolutionService.sendText.mock.calls[0][0];
    expect(call.text).toBe("hello");
    expect(call.number).toMatch(/^55\d{10,11}$/); // normalized
  });

  it("returns success:false when provider throws", async () => {
    mockEvolutionService.sendText.mockRejectedValueOnce(new Error("conn refused"));
    const r = await messagingService.sendText("11987654321", "hi");
    expect(r.success).toBe(false);
    expect(r.error).toBe("conn refused");
  });

  it("normalizes short phone with DDD to 55-prefixed digits", async () => {
    mockEvolutionService.sendText.mockResolvedValueOnce({
      key: { id: "x" },
    });
    await messagingService.sendText("(11) 98765-4321", "x");
    const call = mockEvolutionService.sendText.mock.calls[0][0];
    expect(call.number).toMatch(/^55\d{10,11}$/);
  });
});

describe("messagingService.sendImage", () => {
  it("sends image via evolution.sendImage", async () => {
    mockEvolutionService.sendImage.mockResolvedValueOnce({
      key: { id: "img-1" },
    });

    const r = await messagingService.sendImage(
      "11987654321",
      "https://example.com/x.png",
      "caption"
    );
    expect(r.success).toBe(true);
    expect(r.messageId).toBe("img-1");
    expect(mockEvolutionService.sendImage).toHaveBeenCalled();
  });
});

describe("messagingService.sendBulk", () => {
  it("delegates to evolutionService.sendBatch and maps fields", async () => {
    mockEvolutionService.sendBatch.mockResolvedValueOnce({
      total: 2,
      sent: 2,
      failed: 0,
      results: [
        { number: "5511987654321", success: true, messageId: "m1" },
        { number: "5511987654322", success: true, messageId: "m2" },
      ],
    });

    const r = await messagingService.sendBulk({
      recipients: [
        { phone: "11987654321", name: "A" },
        { phone: "11987654322", name: "B" },
      ],
      message: "hi",
    });

    expect(r.total).toBe(2);
    expect(r.sent).toBe(2);
    expect(r.failed).toBe(0);
    expect(r.results[0].phone).toBe("5511987654321");
    expect(r.results[0].messageId).toBe("m1");
  });

  it("forwards mediaUrl when type is image", async () => {
    mockEvolutionService.sendBatch.mockResolvedValueOnce({
      total: 1,
      sent: 1,
      failed: 0,
      results: [{ number: "5511987654321", success: true, messageId: "m" }],
    });

    await messagingService.sendBulk({
      recipients: [{ phone: "11987654321", name: "A" }],
      message: "",
      type: "image",
      mediaUrl: "https://example.com/a.png",
      caption: "hey",
    });

    const call = mockEvolutionService.sendBatch.mock.calls[0][0];
    expect(call.mediaUrl).toBe("https://example.com/a.png");
    expect(call.mediaType).toBe("image");
    expect(call.caption).toBe("hey");
  });
});

describe("messagingService.send (router)", () => {
  it("throws when image type missing mediaUrl", async () => {
    await expect(
      messagingService.send({
        phone: "11987654321",
        message: "",
        type: "image",
      })
    ).rejects.toThrow(/mediaUrl/);
  });

  it("throws when document type missing mediaUrl+fileName", async () => {
    await expect(
      messagingService.send({
        phone: "11987654321",
        message: "",
        type: "document",
      })
    ).rejects.toThrow(/mediaUrl/);
  });

  it("defaults to text and returns success", async () => {
    mockEvolutionService.sendText.mockResolvedValueOnce({
      key: { id: "t-1" },
    });
    const r = await messagingService.send({
      phone: "11987654321",
      message: "hello",
    });
    expect(r.success).toBe(true);
  });
});

describe("messagingService.isOnWhatsApp", () => {
  it("returns mapping with onWhatsApp boolean", async () => {
    mockEvolutionService.checkNumbers.mockResolvedValueOnce([
      { number: "5511987654321", onWhatsapp: true },
    ]);

    const r = await messagingService.isOnWhatsApp("5511987654321");
    expect(r).toEqual([{ phone: "5511987654321", onWhatsApp: true }]);
  });
});

describe("messagingService.getProvider + isConnected", () => {
  it("exposes the configured provider", () => {
    const p = messagingService.getProvider();
    expect(["evolution", "official"]).toContain(p);
  });

  it("isConnected delegates to evolution for the evolution provider", async () => {
    mockEvolutionService.isConnected.mockResolvedValueOnce(true);
    const ok = await messagingService.isConnected();
    expect(typeof ok).toBe("boolean");
  });
});
