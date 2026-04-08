/**
 * Envia um POST de teste para o endpoint público do webhook AbacatePay.
 *
 * Uso local (API rodando em 3001):
 *   npx tsx --env-file=.env scripts/test-abacatepay-webhook.ts
 *
 * Contra produção (defina a base pública, sem barra no final):
 *   WEBHOOK_TEST_BASE_URL=https://api.talkzap.yrttech.com npx tsx --env-file=.env scripts/test-abacatepay-webhook.ts
 *
 * URL completa (ignora WEBHOOK_TEST_BASE_URL e monta o path com BILLING_WEBHOOK_SECRET):
 *   ABACATEPAY_WEBHOOK_TEST_URL="https://api.talkzap.yrttech.com/api/billing/webhooks/abacatepay/SEU_SECRET" npx tsx --env-file=.env scripts/test-abacatepay-webhook.ts
 *
 * Opções:
 *   --wrong-secret   usa um secret errado no path (o handler ainda responde 200; audit marca invalid_secret)
 *   --event=name     billing.paid | pix.paid | billing.expired | ... (default: billing.paid)
 *   --bill-id=id     data.id no JSON (default: webhook-smoke-test)
 */

import { config as loadEnv } from "dotenv";

loadEnv();

function argValue(name: string): string | undefined {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : undefined;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function buildWebhookUrl(): string {
  const full = process.env.ABACATEPAY_WEBHOOK_TEST_URL?.trim();
  if (full) {
    if (hasFlag("wrong-secret")) {
      console.warn(
        "Aviso: --wrong-secret é ignorado quando ABACATEPAY_WEBHOOK_TEST_URL está definida.\n",
      );
    }
    return full.replace(/\/$/, "");
  }

  const secret = process.env.BILLING_WEBHOOK_SECRET?.trim();
  if (!secret) {
    console.error(
      "Defina BILLING_WEBHOOK_SECRET no .env (ou use ABACATEPAY_WEBHOOK_TEST_URL com a URL completa).",
    );
    process.exit(1);
  }

  const base = (
    process.env.WEBHOOK_TEST_BASE_URL?.trim() || "http://127.0.0.1:3001"
  ).replace(/\/$/, "");

  const pathSecret = hasFlag("wrong-secret")
    ? "definitely-wrong-secret-for-test"
    : encodeURIComponent(secret);

  return `${base}/api/billing/webhooks/abacatepay/${pathSecret}`;
}

async function main(): Promise<void> {
  const url = buildWebhookUrl();
  const event = argValue("event") ?? "billing.paid";
  const billId = argValue("bill-id") ?? "webhook-smoke-test";

  const body = {
    event,
    data: { id: billId },
  };

  console.log(`POST ${url}`);
  console.log(`Body: ${JSON.stringify(body)}\n`);

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    parsed = text;
  }

  console.log(`Status: ${res.status}`);
  console.log("Response:", parsed);

  if (!res.ok) {
    process.exit(1);
  }

  console.log(
    "\nNota: com bill-id inexistente o fluxo termina em bill_not_found (ainda HTTP 200). " +
      "Use um externalId real de payment_bills para exercitar bill.paid de ponta a ponta.",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
