import type { PrismaClient } from "@prisma/client";
import { BadRequestError, ConflictError } from "../../shared/errors";
import { hashInviteToken } from "../../shared/utils/invite-token";
import { normalizePhoneDigits } from "../../shared/utils/phone";
import * as repo from "../user-approval/user-approval.repository";
import type { RegisterBody } from "./auth.schemas";

export async function registerResidentWithInvite(params: {
  prisma: PrismaClient;
  body: RegisterBody;
  hashedPassword: string;
  condominiumIdFromSlug: string;
}) {
  const { prisma, body, hashedPassword, condominiumIdFromSlug } = params;
  const rawToken = body.inviteToken!.trim();
  const tokenHash = hashInviteToken(rawToken);

  const invite = await prisma.residentInvite.findUnique({
    where: { tokenHash },
    include: { condominium: { select: { id: true, slug: true } } },
  });

  if (!invite) {
    throw new BadRequestError("Convite inválido ou expirado.");
  }
  if (invite.consumedAt) {
    throw new BadRequestError("Este convite já foi utilizado.");
  }
  if (invite.expiresAt.getTime() < Date.now()) {
    throw new BadRequestError("Este convite expirou. Peça um novo ao síndico.");
  }
  if (invite.condominiumId !== condominiumIdFromSlug) {
    throw new BadRequestError(
      "O link do condomínio não corresponde a este convite."
    );
  }

  const phoneNorm = normalizePhoneDigits(body.requestedPhone || "");
  const invitePhoneNorm = normalizePhoneDigits(invite.phone);
  if (!phoneNorm || phoneNorm !== invitePhoneNorm) {
    throw new BadRequestError(
      "O telefone informado deve ser o mesmo do convite enviado pelo síndico."
    );
  }

  const tower =
    body.requestedTower?.trim() || invite.tower?.trim() || "";
  const floor =
    body.requestedFloor?.trim() || invite.floor?.trim() || "";
  const unit =
    body.requestedUnit?.trim() || invite.unit?.trim() || "";

  if (!tower || !floor || !unit) {
    throw new BadRequestError(
      "Informe torre, andar e unidade (ou peça ao síndico que preencha o convite)."
    );
  }

  const existingEmail = await prisma.user.findUnique({
    where: { email: body.email },
  });
  if (existingEmail) {
    throw new ConflictError("Este e-mail já está cadastrado.");
  }

  const unitTaken = await prisma.resident.findFirst({
    where: {
      condominiumId: invite.condominiumId,
      tower,
      floor,
      unit,
    },
  });
  if (unitTaken) {
    throw new ConflictError("Esta unidade já está ocupada neste condomínio.");
  }

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: body.email,
        password: hashedPassword,
        name: body.name.trim(),
        role: "RESIDENT",
        status: "APPROVED",
        approvedAt: new Date(),
        requestedCondominiumId: invite.condominiumId,
        requestedTower: tower,
        requestedFloor: floor,
        requestedUnit: unit,
        requestedPhone: body.requestedPhone,
        consentWhatsapp: body.consentWhatsapp,
        consentDataProcessing: body.consentDataProcessing ?? true,
      },
    });

    await repo.txCreateUserCondominiumLink(
      tx,
      user.id,
      invite.condominiumId
    );

    await repo.txCreateResident(tx, {
      condominiumId: invite.condominiumId,
      userId: user.id,
      name: user.name,
      email: user.email,
      phone: body.requestedPhone!,
      tower,
      floor,
      unit,
      type: "OWNER",
      consentWhatsapp: user.consentWhatsapp,
      consentDataProcessing: user.consentDataProcessing,
    });

    await tx.residentInvite.update({
      where: { id: invite.id },
      data: {
        consumedAt: new Date(),
        consumedByUserId: user.id,
      },
    });

    return tx.user.findUnique({
      where: { id: user.id },
      include: { resident: true },
    });
  });

  if (!result) {
    throw new BadRequestError("Falha ao criar conta.");
  }

  return result;
}
