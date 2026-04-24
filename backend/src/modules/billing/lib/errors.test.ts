import { describe, expect, it } from "vitest";
import {
  PaymentRequiredError,
  cancelledError,
  customerCpfRequiredError,
  hardLockedError,
  noCondominiumsToBillError,
  noMatchingPlanError,
  noSubscriptionError,
  softLockedError,
  trialCondoLimitError,
  trialExpiredError,
} from "./errors";

/**
 * Exhaustive coverage of the billing error factory functions. Each helper
 * must produce a PaymentRequiredError with HTTP 402 and a stable `code`
 * that the frontend uses to decide which UI to render.
 */

describe("PaymentRequiredError", () => {
  it("is a 402 AppError with the supplied code", () => {
    const err = new PaymentRequiredError("x", "NO_SUBSCRIPTION");
    expect(err).toBeInstanceOf(PaymentRequiredError);
    expect(err.statusCode).toBe(402);
    expect(err.code).toBe("NO_SUBSCRIPTION");
    expect(err.isOperational).toBe(true);
  });
});

describe("billing error factories", () => {
  it.each([
    [noSubscriptionError, "NO_SUBSCRIPTION"],
    [trialExpiredError, "TRIAL_EXPIRED"],
    [softLockedError, "SOFT_LOCKED"],
    [hardLockedError, "HARD_LOCKED"],
    [cancelledError, "CANCELLED"],
    [customerCpfRequiredError, "CUSTOMER_CPF_REQUIRED"],
    [noCondominiumsToBillError, "NO_CONDOMINIUMS_TO_BILL"],
  ])("%s produces code %s", (factory, expectedCode) => {
    const err = (factory as () => PaymentRequiredError)();
    expect(err).toBeInstanceOf(PaymentRequiredError);
    expect(err.code).toBe(expectedCode);
    expect(err.statusCode).toBe(402);
    expect(err.message).toBeTruthy();
  });

  it("trialCondoLimitError embeds the counts in the message", () => {
    const err = trialCondoLimitError(4, 3);
    expect(err.code).toBe("TRIAL_CONDO_LIMIT");
    expect(err.message).toContain("3");
    expect(err.message).toContain("4");
  });

  it("noMatchingPlanError embeds the condo count", () => {
    const err = noMatchingPlanError(50);
    expect(err.code).toBe("NO_MATCHING_PLAN");
    expect(err.message).toContain("50");
  });
});
