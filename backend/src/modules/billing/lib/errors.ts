import { AppError } from "../../../shared/errors";

/**
 * HTTP 402 Payment Required — raised by guards when the syndic's subscription
 * does not allow the requested write operation. The `code` field carries the
 * specific reason so the frontend can render an appropriate UI.
 */
export class PaymentRequiredError extends AppError {
  constructor(message: string, code: BillingErrorCode) {
    super(message, 402, true, code);
    Object.setPrototypeOf(this, PaymentRequiredError.prototype);
  }
}

export type BillingErrorCode =
  | "NO_SUBSCRIPTION"
  | "TRIAL_EXPIRED"
  | "GRACE_PERIOD"
  | "SOFT_LOCKED"
  | "HARD_LOCKED"
  | "CANCELLED"
  | "TRIAL_CONDO_LIMIT"
  | "CUSTOMER_CPF_REQUIRED"
  | "NO_MATCHING_PLAN"
  | "BILL_ALREADY_PAID";

export function noSubscriptionError(): PaymentRequiredError {
  return new PaymentRequiredError(
    "Assinatura necessária. Assine um plano para continuar.",
    "NO_SUBSCRIPTION",
  );
}

export function trialExpiredError(): PaymentRequiredError {
  return new PaymentRequiredError(
    "Seu período de testes terminou. Assine para continuar usando a plataforma.",
    "TRIAL_EXPIRED",
  );
}

export function softLockedError(): PaymentRequiredError {
  return new PaymentRequiredError(
    "Conta em modo leitura por inadimplência. Regularize o pagamento para voltar a usar.",
    "SOFT_LOCKED",
  );
}

export function hardLockedError(): PaymentRequiredError {
  return new PaymentRequiredError(
    "Conta suspensa por inadimplência. Regularize o pagamento para liberar o acesso.",
    "HARD_LOCKED",
  );
}

export function cancelledError(): PaymentRequiredError {
  return new PaymentRequiredError(
    "Assinatura cancelada. Entre em contato para reativar.",
    "CANCELLED",
  );
}

export function trialCondoLimitError(current: number, max: number): PaymentRequiredError {
  return new PaymentRequiredError(
    `Durante o período de testes você pode gerenciar até ${max} condomínios. Você já tem ${current}. Assine para adicionar mais.`,
    "TRIAL_CONDO_LIMIT",
  );
}

export function customerCpfRequiredError(): PaymentRequiredError {
  return new PaymentRequiredError(
    "Para gerar cobrança é necessário cadastrar o CPF do síndico no perfil.",
    "CUSTOMER_CPF_REQUIRED",
  );
}

export function noMatchingPlanError(condoCount: number): PaymentRequiredError {
  return new PaymentRequiredError(
    `Nenhum plano ativo comporta ${condoCount} condomínio(s). Verifique com o administrador da plataforma.`,
    "NO_MATCHING_PLAN",
  );
}
