
-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PaymentBillType" AS ENUM ('FIRST_CYCLE', 'SUBSCRIPTION_CYCLE', 'MANUAL');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('PIX', 'CARD');

-- CreateEnum
CREATE TYPE "PaymentBillStatus" AS ENUM ('PENDING', 'PAID', 'EXPIRED', 'CANCELLED', 'FAILED');

-- AlterTable
ALTER TABLE "condominiums" ADD COLUMN     "primary_syndic_id" TEXT;

-- CreateTable
CREATE TABLE "plans" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "min_condominiums" INTEGER NOT NULL,
    "max_condominiums" INTEGER NOT NULL,
    "price_per_condo_cents" INTEGER NOT NULL,
    "setup_fee_cents" INTEGER NOT NULL DEFAULT 200000,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "syndic_id" TEXT NOT NULL,
    "current_plan_id" TEXT,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
    "trial_ends_at" TIMESTAMP(3),
    "current_period_start" TIMESTAMP(3),
    "current_period_end" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "setup_paid" BOOLEAN NOT NULL DEFAULT false,
    "provider_id" TEXT NOT NULL DEFAULT 'abacatepay',
    "external_customer_id" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_bills" (
    "id" TEXT NOT NULL,
    "subscription_id" TEXT NOT NULL,
    "plan_id" TEXT,
    "type" "PaymentBillType" NOT NULL,
    "method" "PaymentMethod",
    "status" "PaymentBillStatus" NOT NULL DEFAULT 'PENDING',
    "amount_cents" INTEGER NOT NULL,
    "breakdown" JSONB NOT NULL,
    "period_start" TIMESTAMP(3),
    "period_end" TIMESTAMP(3),
    "provider_id" TEXT NOT NULL DEFAULT 'abacatepay',
    "external_id" TEXT,
    "checkout_url" TEXT,
    "pix_brcode" TEXT,
    "pix_brcode_base64" TEXT,
    "expires_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "provider_payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_bills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_events" (
    "id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL DEFAULT 'abacatepay',
    "event_type" TEXT NOT NULL,
    "external_id" TEXT,
    "payload" JSONB NOT NULL,
    "processed_at" TIMESTAMP(3),
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "plans_slug_key" ON "plans"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_syndic_id_key" ON "subscriptions"("syndic_id");

-- CreateIndex
CREATE INDEX "subscriptions_status_idx" ON "subscriptions"("status");

-- CreateIndex
CREATE INDEX "subscriptions_current_period_end_idx" ON "subscriptions"("current_period_end");

-- CreateIndex
CREATE INDEX "subscriptions_trial_ends_at_idx" ON "subscriptions"("trial_ends_at");

-- CreateIndex
CREATE INDEX "payment_bills_subscription_id_status_idx" ON "payment_bills"("subscription_id", "status");

-- CreateIndex
CREATE INDEX "payment_bills_external_id_idx" ON "payment_bills"("external_id");

-- CreateIndex
CREATE INDEX "webhook_events_provider_id_event_type_idx" ON "webhook_events"("provider_id", "event_type");

-- CreateIndex
CREATE INDEX "webhook_events_external_id_idx" ON "webhook_events"("external_id");

-- CreateIndex
CREATE INDEX "condominiums_primary_syndic_id_idx" ON "condominiums"("primary_syndic_id");

-- AddForeignKey
ALTER TABLE "condominiums" ADD CONSTRAINT "condominiums_primary_syndic_id_fkey" FOREIGN KEY ("primary_syndic_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_syndic_id_fkey" FOREIGN KEY ("syndic_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_current_plan_id_fkey" FOREIGN KEY ("current_plan_id") REFERENCES "plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_bills" ADD CONSTRAINT "payment_bills_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_bills" ADD CONSTRAINT "payment_bills_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

