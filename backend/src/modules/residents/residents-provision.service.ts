import { randomBytes } from "crypto";
import type { PrismaClient, ResidentType } from "@prisma/client";
import bcrypt from "bcryptjs";
import { config } from "../../config/env";
import { BadRequestError, ConflictError } from "../../shared/errors";
import { hashInviteToken, generateRawInviteToken } from "../../shared/utils/invite-token";
import { toWhatsAppDigits } from "../../shared/utils/phone";
import { WhatsAppService } from "../whatsapp/whatsapp.service";
import * as repo from "../user-approval/user-approval.repository";
import type { ProvisionResidentBody } from "./residents.schema";

const whatsapp = new WhatsAppService();

function buildFrontendRegisterUrl(condoSlug: string, inviteRaw: string): string {
  const base = config.FRONTEND_URL.replace(/\/$/, "");
  return `${base}/auth/register/${encodeURIComponent(condoSlug)}?invite=${encodeURIComponent(inviteRaw)}`;
}

export async function provisionResident(
  prisma: PrismaClient,
  data: ProvisionResidentBody,
  createdByUserId: string
) {
  const condo = await prisma.condominium.findUnique({
    where: { id: data.condominiumId },
    select: { id: true, slug: true, name: true },
  });
  if (!condo) {
    throw new BadRequestError("Condomínio não encontrado");
  }

  const phoneNorm = toWhatsAppDigits(data.phone);

  if (data.mode === "invite_link") {
    const activeForPhone = await prisma.residentInvite.findFirst({
      where: {
        condominiumId: data.condominiumId,
        phone: phoneNorm,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    if (activeForPhone) {
      throw new ConflictError(
        "Já existe um convite ativo para este telefone neste condomínio. Aguarde o uso ou até expirar o convite anterior."
      );
    }

    const raw = generateRawInviteToken();
    const tokenHash = hashInviteToken(raw);
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    await prisma.residentInvite.create({
      data: {
        condominiumId: data.condominiumId,
        createdByUserId,
        name: data.name.trim(),
        phone: phoneNorm,
        tower: data.tower?.trim() || null,
        floor: data.floor?.trim() || null,
        unit: data.unit?.trim() || null,
        tokenHash,
        expiresAt,
      },
    });

    const registerUrl = buildFrontendRegisterUrl(condo.slug, raw);
    const message = `Olá, ${data.name.trim()}! Você foi convidado a criar sua conta no TalkZap (${condo.name}). Acesse: ${registerUrl}`;

    let whatsappSent = false;
    let whatsappError: string | undefined;
    try {
      await whatsapp.sendTextMessage(toWhatsAppDigits(data.phone), message);
      whatsappSent = true;
    } catch (e: unknown) {
      whatsappError =
        e instanceof Error ? e.message : "Falha ao enviar WhatsApp";
    }

    return {
      mode: "invite_link" as const,
      registerUrl,
      whatsappSent,
      ...(whatsappError && { whatsappError }),
    };
  }

  if (!data.email?.trim()) {
    throw new BadRequestError("E-mail é obrigatório para cadastro com senha provisória.");
  }
  if (!data.tower?.trim() || !data.floor?.trim() || !data.unit?.trim()) {
    throw new BadRequestError(
      "Torre, andar e unidade são obrigatórios para cadastro com senha provisória."
    );
  }

  const tower = data.tower.trim();
  const floor = data.floor.trim();
  const unit = data.unit.trim();

  const email = data.email.trim().toLowerCase();
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new ConflictError("Este e-mail já está cadastrado.");
  }

  const residentEmailTaken = await prisma.resident.findFirst({
    where: {
      condominiumId: data.condominiumId,
      email: { equals: email, mode: "insensitive" },
    },
  });
  if (residentEmailTaken) {
    throw new ConflictError("Este e-mail já está cadastrado para um morador neste condomínio.");
  }

  const unitTaken = await prisma.resident.findFirst({
    where: {
      condominiumId: data.condominiumId,
      tower,
      floor,
      unit,
    },
  });
  if (unitTaken) {
    throw new ConflictError("Esta unidade já está ocupada neste condomínio.");
  }

  const plainPassword =
    data.provisionalPassword?.trim() ||
    randomBytes(9).toString("base64url").slice(0, 12) + "Aa1!";
  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  const user = await prisma.$transaction(async (tx) => {
    const u = await tx.user.create({
      data: {
        email,
        password: hashedPassword,
        name: data.name.trim(),
        role: "RESIDENT",
        status: "APPROVED",
        approvedAt: new Date(),
        forcePasswordReset: true,
        requestedCondominiumId: data.condominiumId,
        requestedTower: tower,
        requestedFloor: floor,
        requestedUnit: unit,
        requestedPhone: phoneNorm,
        consentWhatsapp: data.consentWhatsapp ?? true,
        consentDataProcessing: data.consentDataProcessing ?? true,
      },
    });

    await repo.txCreateUserCondominiumLink(tx, u.id, data.condominiumId);

    await repo.txCreateResident(tx, {
      condominiumId: data.condominiumId,
      userId: u.id,
      name: u.name,
      email: u.email,
      phone: phoneNorm,
      tower,
      floor,
      unit,
      type: (data.type ?? "OWNER") as ResidentType,
      consentWhatsapp: u.consentWhatsapp,
      consentDataProcessing: u.consentDataProcessing,
    });

    return u;
  });

  const message = `Olá, ${data.name.trim()}! Sua conta no TalkZap (${condo.name}) foi criada.\nE-mail: ${email}\nSenha provisória: ${plainPassword}\nNo primeiro acesso você deverá definir uma nova senha. Acesse: ${config.FRONTEND_URL.replace(/\/$/, "")}/auth/login`;

  let whatsappSent = false;
  let whatsappError: string | undefined;
  try {
    await whatsapp.sendTextMessage(phoneNorm, message);
    whatsappSent = true;
  } catch (e: unknown) {
    whatsappError = e instanceof Error ? e.message : "Falha ao enviar WhatsApp";
  }

  return {
    mode: "temp_password" as const,
    userId: user.id,
    email,
    provisionalPassword: plainPassword,
    whatsappSent,
    ...(whatsappError && { whatsappError }),
  };
}
