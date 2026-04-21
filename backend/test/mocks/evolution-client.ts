import { vi } from "vitest";

/**
 * Global mock for the Evolution WhatsApp service singleton.
 *
 * Real module: backend/src/modules/evolution/evolution.service.ts
 * Real export: `evolutionService` (singleton instance of class `EvolutionService`).
 *
 * Tests can override individual method returns per-case via:
 *   mockEvolutionService.sendText.mockResolvedValueOnce({ ... })
 * and assert calls via:
 *   expect(mockEvolutionService.sendText).toHaveBeenCalledWith(...)
 */
const sendOk = {
  key: { id: "msg_mock_1", remoteJid: "5511999999999@s.whatsapp.net", fromMe: true },
  status: "PENDING",
  message: { conversation: "mock" },
};

export const mockEvolutionService = {
  getInstanceState: vi
    .fn()
    .mockResolvedValue({ instance: { instanceName: "test", state: "open" } }),
  getQRCode: vi.fn().mockResolvedValue({ base64: "mock-qr", code: "mock-code" }),
  disconnect: vi.fn().mockResolvedValue({ status: "disconnected" }),
  restart: vi.fn().mockResolvedValue({ status: "restarted" }),
  sendText: vi.fn().mockResolvedValue(sendOk),
  sendMedia: vi.fn().mockResolvedValue(sendOk),
  sendImage: vi.fn().mockResolvedValue(sendOk),
  sendDocument: vi.fn().mockResolvedValue(sendOk),
  sendAudio: vi.fn().mockResolvedValue(sendOk),
  checkNumbers: vi.fn().mockResolvedValue([]),
  isOnWhatsApp: vi.fn().mockResolvedValue(true),
  sendBatch: vi
    .fn()
    .mockResolvedValue({ total: 0, sent: 0, failed: 0, results: [] }),
  isConnected: vi.fn().mockResolvedValue(true),
};

vi.mock("../../src/modules/evolution/evolution.service", () => ({
  evolutionService: mockEvolutionService,
}));
