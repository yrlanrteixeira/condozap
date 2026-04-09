import crypto from "crypto";
import { config } from "../../config/env";

export function generateRawInviteToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function hashInviteToken(raw: string): string {
  return crypto
    .createHmac("sha256", config.JWT_SECRET)
    .update(raw)
    .digest("hex");
}
