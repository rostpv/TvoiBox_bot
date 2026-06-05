import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { BookingSource } from "@prisma/client";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import { AppConfigService } from "../../config/app-config.service";
import { PrismaService } from "../../prisma/prisma.service";
import { BookingsService } from "../bookings/bookings.service";
import { ClientsService, ClientDto } from "../clients/clients.service";
import { MiniAppAuthService } from "../mini-app/mini-app-auth.service";
import { SlotsService } from "../slots/slots.service";

const WEB_SESSION_TTL_DAYS = 180;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface WebClientSessionPayload {
  token: string;
  client: ClientDto;
}

@Injectable()
export class WebBookingService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly appConfigService: AppConfigService,
    private readonly clientsService: ClientsService,
    private readonly miniAppAuthService: MiniAppAuthService,
    private readonly slotsService: SlotsService,
    private readonly bookingsService: BookingsService,
  ) {}

  async createClientSession(input: {
    fullName: string;
    phone: string;
    email?: string | null;
    consentAccepted?: boolean;
  }): Promise<WebClientSessionPayload> {
    const client = await this.clientsService.upsertWebClientProfile(input);
    const token = randomBytes(32).toString("base64url");
    const now = new Date();

    await this.prismaService.webClientSession.create({
      data: {
        clientId: client.id,
        tokenHash: this.hashToken(token),
        createdAt: now,
        lastSeenAt: now,
        expiresAt: new Date(now.getTime() + WEB_SESSION_TTL_DAYS * DAY_MS),
      },
    });

    return {
      token,
      client,
    };
  }

  async getClientByToken(token: string): Promise<ClientDto> {
    const session = await this.getSessionByToken(token);
    return this.toClientDto(session.client);
  }

  async updateClientProfile(token: string, input: {
    fullName: string;
    phone: string;
    email?: string | null;
    consentAccepted?: boolean;
  }): Promise<ClientDto> {
    const session = await this.getSessionByToken(token);
    const nextPhoneNormalized = this.clientsService.normalizePhoneForIdentity(input.phone);
    const currentPhoneNormalized = session.client.phoneNormalized ?? null;

    if (nextPhoneNormalized && currentPhoneNormalized && nextPhoneNormalized !== currentPhoneNormalized) {
      throw new BadRequestException("phone cannot be changed for current web session");
    }

    return this.clientsService.upsertWebClientProfile(input);
  }

  async getAvailableSlots(token: string) {
    const session = await this.getSessionByToken(token);
    return this.slotsService.getAvailableSlotsForClient({
      clientId: session.clientId,
    });
  }

  async requestBooking(token: string, input: {
    slotId: string;
    clientComment?: string | null;
  }) {
    const session = await this.getSessionByToken(token);
    return this.bookingsService.createBookingRequestForClient({
      clientId: session.clientId,
      slotId: input.slotId,
      clientComment: input.clientComment,
      source: BookingSource.WEB,
    });
  }

  async getClientTrainings(token: string, input?: { includeArchived?: boolean }) {
    const session = await this.getSessionByToken(token);
    return this.bookingsService.getClientTrainings({
      telegramId: session.client.telegramId,
      includeArchived: input?.includeArchived,
    });
  }

  async getClientTrainingCalendarFile(token: string, bookingId: string) {
    const session = await this.getSessionByToken(token);
    return this.bookingsService.getClientTrainingCalendarFile(session.client.telegramId, bookingId);
  }

  async cancelClientTraining(token: string, input: {
    bookingId: string;
    clientComment?: string;
  }) {
    const session = await this.getSessionByToken(token);
    return this.bookingsService.cancelTrainingByClient({
      telegramId: session.client.telegramId,
      bookingId: input.bookingId,
      clientComment: input.clientComment,
    });
  }

  async rescheduleClientTraining(token: string, input: {
    bookingId: string;
    targetSlotId: string;
    clientComment?: string;
  }) {
    const session = await this.getSessionByToken(token);
    return this.bookingsService.rescheduleTrainingByClient({
      telegramId: session.client.telegramId,
      bookingId: input.bookingId,
      targetSlotId: input.targetSlotId,
      clientComment: input.clientComment,
    });
  }

  async archiveClientTraining(token: string, input: {
    bookingId: string;
  }) {
    const session = await this.getSessionByToken(token);
    return this.bookingsService.archiveTrainingByClient({
      telegramId: session.client.telegramId,
      bookingId: input.bookingId,
    });
  }

  async acceptProposedBookingTime(token: string, input: {
    bookingId: string;
    decisionNote?: string;
  }) {
    const session = await this.getSessionByToken(token);
    return this.bookingsService.acceptProposedBookingTime({
      telegramId: session.client.telegramId,
      bookingId: input.bookingId,
      decisionNote: input.decisionNote,
    });
  }

  async declineProposedBookingTime(token: string, input: {
    bookingId: string;
    decisionNote?: string;
  }) {
    const session = await this.getSessionByToken(token);
    return this.bookingsService.declineProposedBookingTime({
      telegramId: session.client.telegramId,
      bookingId: input.bookingId,
      decisionNote: input.decisionNote,
    });
  }

  createTrainerSession(input: { secret: string }) {
    const configuredSecret = this.appConfigService.values.webTrainerLoginSecret.trim();
    const providedSecret = input.secret.trim();

    if (!configuredSecret) {
      throw new UnauthorizedException("Web trainer login is not configured");
    }

    if (!this.isEqualSecret(providedSecret, configuredSecret)) {
      throw new UnauthorizedException("Invalid trainer secret");
    }

    return this.miniAppAuthService.createTrainerWebSession();
  }

  private async getSessionByToken(token: string) {
    const rawToken = token.trim();
    if (!rawToken) {
      throw new UnauthorizedException("Missing web session token");
    }

    const session = await this.prismaService.webClientSession.findUnique({
      where: {
        tokenHash: this.hashToken(rawToken),
      },
      include: {
        client: true,
      },
    });

    if (!session) {
      throw new UnauthorizedException("Invalid web session token");
    }

    if (session.expiresAt && session.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException("Web session token has expired");
    }

    await this.prismaService.webClientSession.update({
      where: { id: session.id },
      data: { lastSeenAt: new Date() },
    });

    return session;
  }

  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  private isEqualSecret(providedSecret: string, configuredSecret: string): boolean {
    const providedHash = createHash("sha256").update(providedSecret).digest();
    const configuredHash = createHash("sha256").update(configuredSecret).digest();
    return timingSafeEqual(providedHash, configuredHash);
  }

  private toClientDto(client: {
    id: string;
    telegramId: string;
    username: string | null;
    fullName: string;
    phone: string | null;
    phoneNormalized?: string | null;
    email?: string | null;
    note: string | null;
    consentAcceptedAt: Date | null;
    isBlacklisted: boolean;
    blacklistReason?: string | null;
    blacklistedAt?: Date | null;
  }): ClientDto {
    return {
      id: client.id,
      telegramId: client.telegramId,
      username: client.username,
      fullName: client.fullName,
      phone: client.phone,
      phoneNormalized: client.phoneNormalized ?? null,
      email: client.email ?? null,
      note: client.note,
      consentAcceptedAt: client.consentAcceptedAt ? client.consentAcceptedAt.toISOString() : null,
      isBlacklisted: client.isBlacklisted,
      blacklistReason: client.blacklistReason ?? null,
      blacklistedAt: client.blacklistedAt ? client.blacklistedAt.toISOString() : null,
    };
  }
}
