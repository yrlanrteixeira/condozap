import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("axios", () => ({
  default: {
    post: vi.fn(),
  },
}));

import axios from "axios";
import { sendEmail } from "./email";

const mockedPost = axios.post as unknown as ReturnType<typeof vi.fn>;

const stubLogger = () => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  fatal: vi.fn(),
  trace: vi.fn(),
  child: () => stubLogger(),
  level: "info",
  silent: vi.fn(),
}) as any;

describe("sendEmail", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    mockedPost.mockReset();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("does not call axios when BREVO_API_KEY is missing (warns via logger)", async () => {
    delete process.env.BREVO_API_KEY;
    const logger = stubLogger();

    await sendEmail(
      { to: [{ email: "a@b.c" }], subject: "s", htmlContent: "<p>h</p>" },
      logger
    );

    expect(mockedPost).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalled();
  });

  it("sends via Brevo API with default sender when sender is omitted", async () => {
    process.env.BREVO_API_KEY = "key-123";
    process.env.BREVO_SENDER_NAME = "CondoZap Test";
    process.env.BREVO_SENDER_EMAIL = "test@condozap.com";
    mockedPost.mockResolvedValueOnce({ data: { messageId: "mid-1" } });
    const logger = stubLogger();

    await sendEmail(
      {
        to: [{ email: "dest@x.com", name: "Dest" }],
        subject: "Hi",
        htmlContent: "<p>hi</p>",
      },
      logger
    );

    expect(mockedPost).toHaveBeenCalledOnce();
    const [url, payload, options] = mockedPost.mock.calls[0];
    expect(url).toBe("https://api.brevo.com/v3/smtp/email");
    expect(payload.sender).toEqual({
      name: "CondoZap Test",
      email: "test@condozap.com",
    });
    expect(payload.to).toEqual([{ email: "dest@x.com", name: "Dest" }]);
    expect(options.headers["api-key"]).toBe("key-123");
    expect(logger.info).toHaveBeenCalled();
  });

  it("maps to[].name = email when name missing", async () => {
    process.env.BREVO_API_KEY = "k";
    mockedPost.mockResolvedValueOnce({ data: { messageId: "mid" } });

    await sendEmail({
      to: [{ email: "noname@x.com" }],
      subject: "s",
      htmlContent: "<p/>",
    });

    const payload = mockedPost.mock.calls[0][1];
    expect(payload.to).toEqual([{ email: "noname@x.com", name: "noname@x.com" }]);
  });

  it("uses explicit sender when provided", async () => {
    process.env.BREVO_API_KEY = "k";
    mockedPost.mockResolvedValueOnce({ data: { messageId: "mid" } });

    await sendEmail({
      to: [{ email: "a@b.com" }],
      subject: "s",
      htmlContent: "x",
      sender: { name: "Custom", email: "from@me.com" },
    });

    const payload = mockedPost.mock.calls[0][1];
    expect(payload.sender).toEqual({ name: "Custom", email: "from@me.com" });
  });

  it("swallows axios errors (logs but does not throw)", async () => {
    process.env.BREVO_API_KEY = "k";
    mockedPost.mockRejectedValueOnce(
      Object.assign(new Error("nope"), {
        response: { data: { message: "bad credentials" } },
      })
    );
    const logger = stubLogger();

    await expect(
      sendEmail(
        { to: [{ email: "a@b.c" }], subject: "s", htmlContent: "h" },
        logger
      )
    ).resolves.toBeUndefined();

    expect(logger.error).toHaveBeenCalled();
  });
});
