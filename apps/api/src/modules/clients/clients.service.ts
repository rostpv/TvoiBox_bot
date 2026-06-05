import { BadRequestException, Injectable } from "@nestjs/common";
import { randomBytes } from "node:crypto";

import { AppConfigService } from "../../config/app-config.service";
import { PrismaService } from "../../prisma/prisma.service";

export interface RegisterClientInput {
  telegramId: string;
  username?: string | null;
  fullName: string;
  phone?: string | null;
  consentAccepted: boolean;
}

export interface UpsertClientProfileInput {
  telegramId: string;
  username?: string | null;
  fullName: string;
  phone?: string | null;
  email?: string | null;
  note?: string | null;
  consentAccepted?: boolean;
}

export interface UpsertWebClientProfileInput {
  fullName: string;
  phone: string;
  email?: string | null;
  consentAccepted?: boolean;
}

export interface ClientDto {
  id: string;
  telegramId: string;
  username: string | null;
  fullName: string;
  phone: string | null;
  phoneNormalized: string | null;
  email: string | null;
  note: string | null;
  consentAcceptedAt: string | null;
  isBlacklisted: boolean;
  blacklistReason?: string | null;
  blacklistedAt?: string | null;
}

export interface RegisterClientResult {
  status: "created" | "already_registered";
  client: ClientDto;
}

export interface RemoveFromBlacklistInput {
  trainerTelegramId: string;
  clientId: string;
}

export interface AddToBlacklistInput {
  trainerTelegramId: string;
  clientId: string;
  reason: string;
}

export interface RemoveFromBlacklistResult {
  status: "removed" | "already_removed";
  client: ClientDto;
}

export interface AddToBlacklistResult {
  status: "added" | "already_blacklisted";
  client: ClientDto;
}

export interface SearchClientsInput {
  trainerTelegramId: string;
  query: string;
  limit?: number;
}

@Injectable()
export class ClientsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly appConfigService: AppConfigService,
  ) {}

  async findByTelegramId(telegramId: string): Promise<ClientDto | null> {
    const client = await this.prismaService.client.findUnique({
      where: { telegramId },
    });

    if (!client) {
      return null;
    }

    return this.toClientDto(client);
  }

  async registerClient(input: RegisterClientInput): Promise<RegisterClientResult> {
    const telegramId = input.telegramId.trim();
    const fullName = input.fullName.trim();
    const username = input.username?.trim() || null;
    const phone = input.phone?.trim() || null;
    const phoneNormalized = this.normalizePhoneForIdentity(phone);

    if (!telegramId) {
      throw new BadRequestException("telegramId is required");
    }

    if (!fullName) {
      throw new BadRequestException("fullName is required");
    }

    if (!input.consentAccepted) {
      throw new BadRequestException("consentAccepted must be true");
    }

    const existingClient = await this.prismaService.client.findUnique({
      where: { telegramId },
    });

    if (existingClient) {
      const nextUsername = username || existingClient.username;
      const nextFullName = fullName || existingClient.fullName;
      const nextPhone = phone || existingClient.phone;
      const requiresUpdate = nextUsername !== existingClient.username
        || nextFullName !== existingClient.fullName
        || nextPhone !== existingClient.phone;

      if (!requiresUpdate) {
        return {
          status: "already_registered",
          client: this.toClientDto(existingClient),
        };
      }

      const updatedClient = await this.prismaService.client.update({
        where: { id: existingClient.id },
        data: {
          username: nextUsername,
          fullName: nextFullName,
          phone: nextPhone,
          phoneNormalized: this.normalizePhoneForIdentity(nextPhone),
        },
      });

      return {
        status: "already_registered",
        client: this.toClientDto(updatedClient),
      };
    }

    const existingWebClient = phoneNormalized
      ? await this.prismaService.client.findUnique({
          where: { phoneNormalized },
        })
      : null;

    if (existingWebClient?.telegramId.startsWith("web:")) {
      const updatedClient = await this.prismaService.client.update({
        where: { id: existingWebClient.id },
        data: {
          telegramId,
          username,
          fullName,
          phone,
          phoneNormalized,
          consentAcceptedAt: existingWebClient.consentAcceptedAt ?? new Date(),
        },
      });

      return {
        status: "already_registered",
        client: this.toClientDto(updatedClient),
      };
    }

    const createdClient = await this.prismaService.client.create({
      data: {
        telegramId,
        username,
        fullName,
        phone,
        phoneNormalized: existingWebClient ? null : phoneNormalized,
        note: null,
        consentAcceptedAt: new Date(),
      },
    });

    return {
      status: "created",
      client: this.toClientDto(createdClient),
    };
  }

  async listBlacklistedClients(trainerTelegramId: string): Promise<ClientDto[]> {
    this.ensureTrainerAccess(trainerTelegramId);

    const clients = await this.prismaService.client.findMany({
      where: {
        isBlacklisted: true,
      },
      orderBy: {
        blacklistedAt: "desc",
      },
    });

    return clients.map((client) => this.toClientDto(client));
  }

  async searchClients(input: SearchClientsInput): Promise<ClientDto[]> {
    this.ensureTrainerAccess(input.trainerTelegramId);

    const rawQuery = input.query.trim();
    if (rawQuery.length < 2) {
      throw new BadRequestException("Search query must contain at least 2 characters");
    }

    const limit = Number.isFinite(input.limit) ? Math.trunc(input.limit ?? 10) : 10;
    const safeLimit = Math.min(20, Math.max(1, limit));
    const usernameQuery = rawQuery.replace(/^@/u, "");
    const phoneDigitsQuery = rawQuery.replace(/\D+/gu, "");

    const clients = await this.prismaService.client.findMany({
      where: {
        OR: [
          {
            fullName: {
              contains: rawQuery,
              mode: "insensitive",
            },
          },
          {
            username: {
              contains: usernameQuery,
              mode: "insensitive",
            },
          },
          {
            phone: {
              contains: rawQuery,
            },
          },
          ...(phoneDigitsQuery.length >= 3
            ? [
                {
                  phone: {
                    contains: phoneDigitsQuery,
                  },
                },
              ]
            : []),
        ],
      },
      orderBy: [{ isBlacklisted: "desc" }, { updatedAt: "desc" }],
      take: safeLimit,
    });

    return clients.map((client) => this.toClientDto(client));
  }

  async removeFromBlacklist(input: RemoveFromBlacklistInput): Promise<RemoveFromBlacklistResult> {
    this.ensureTrainerAccess(input.trainerTelegramId);
    const clientId = input.clientId.trim();
    if (!clientId) {
      throw new BadRequestException("clientId is required");
    }

    const existingClient = await this.prismaService.client.findUnique({
      where: { id: clientId },
    });

    if (!existingClient) {
      throw new BadRequestException("Client not found");
    }

    if (!existingClient.isBlacklisted) {
      return {
        status: "already_removed",
        client: this.toClientDto(existingClient),
      };
    }

    const updatedClient = await this.prismaService.$transaction(async (transaction) => {
      const updated = await transaction.client.update({
        where: { id: clientId },
        data: {
          isBlacklisted: false,
          blacklistReason: null,
          blacklistedAt: null,
        },
      });

      const latestEntry = await transaction.blacklistEntry.findFirst({
        where: {
          clientId,
          removedAt: null,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      if (latestEntry) {
        await transaction.blacklistEntry.update({
          where: { id: latestEntry.id },
          data: {
            removedAt: new Date(),
            removedBy: input.trainerTelegramId,
          },
        });
      }

      return updated;
    });

    return {
      status: "removed",
      client: this.toClientDto(updatedClient),
    };
  }

  async addToBlacklist(input: AddToBlacklistInput): Promise<AddToBlacklistResult> {
    this.ensureTrainerAccess(input.trainerTelegramId);

    const clientId = input.clientId.trim();
    const reason = input.reason.trim();
    if (!clientId) {
      throw new BadRequestException("clientId is required");
    }
    if (!reason) {
      throw new BadRequestException("reason is required");
    }

    const existingClient = await this.prismaService.client.findUnique({
      where: { id: clientId },
    });

    if (!existingClient) {
      throw new BadRequestException("Client not found");
    }

    if (existingClient.isBlacklisted) {
      const updatedClient =
        existingClient.blacklistReason === reason
          ? existingClient
          : await this.prismaService.client.update({
              where: { id: clientId },
              data: {
                blacklistReason: reason,
                blacklistedAt: existingClient.blacklistedAt ?? new Date(),
              },
            });

      return {
        status: "already_blacklisted",
        client: this.toClientDto(updatedClient),
      };
    }

    const now = new Date();
    const updatedClient = await this.prismaService.$transaction(async (transaction) => {
      const updated = await transaction.client.update({
        where: { id: clientId },
        data: {
          isBlacklisted: true,
          blacklistReason: reason,
          blacklistedAt: now,
        },
      });

      await transaction.blacklistEntry.create({
        data: {
          clientId,
          reason,
        },
      });

      return updated;
    });

    return {
      status: "added",
      client: this.toClientDto(updatedClient),
    };
  }

  async upsertClientProfile(input: UpsertClientProfileInput): Promise<ClientDto> {
    const telegramId = input.telegramId.trim();
    const fullName = input.fullName.trim();
    const username = input.username?.trim() || null;
    const phone = input.phone?.trim() || null;
    const phoneNormalized = this.normalizePhoneForIdentity(phone);
    const email = input.email?.trim() || null;
    const note = input.note?.trim() || null;

    if (!telegramId) {
      throw new BadRequestException("telegramId is required");
    }

    if (!fullName) {
      throw new BadRequestException("fullName is required");
    }

    const existingClient = await this.prismaService.client.findUnique({
      where: { telegramId },
    });

    if (!existingClient) {
      const existingWebClient = phoneNormalized
        ? await this.prismaService.client.findUnique({
            where: { phoneNormalized },
          })
        : null;

      if (existingWebClient?.telegramId.startsWith("web:")) {
        const updatedClient = await this.prismaService.client.update({
          where: { id: existingWebClient.id },
          data: {
            telegramId,
            username,
            fullName,
            phone,
            phoneNormalized,
            email: email ?? existingWebClient.email,
            note,
            consentAcceptedAt:
              typeof input.consentAccepted === "boolean"
                ? input.consentAccepted
                  ? existingWebClient.consentAcceptedAt ?? new Date()
                  : null
                : existingWebClient.consentAcceptedAt,
          },
        });

        return this.toClientDto(updatedClient);
      }

      const createdClient = await this.prismaService.client.create({
        data: {
          telegramId,
          username,
          fullName,
          phone,
          phoneNormalized: existingWebClient ? null : phoneNormalized,
          email,
          note,
          consentAcceptedAt: input.consentAccepted ? new Date() : null,
        },
      });

      return this.toClientDto(createdClient);
    }

    const updatedClient = await this.prismaService.client.update({
      where: { id: existingClient.id },
      data: {
        username,
        fullName,
        phone,
        phoneNormalized,
        email: email ?? existingClient.email,
        note,
        consentAcceptedAt:
          typeof input.consentAccepted === "boolean"
            ? input.consentAccepted
              ? existingClient.consentAcceptedAt ?? new Date()
              : null
            : undefined,
      },
    });

    return this.toClientDto(updatedClient);
  }

  async upsertWebClientProfile(input: UpsertWebClientProfileInput): Promise<ClientDto> {
    const fullName = input.fullName.trim();
    const phone = input.phone.trim();
    const phoneNormalized = this.normalizePhoneForIdentity(phone);
    const email = input.email?.trim() || null;

    if (!phone) {
      throw new BadRequestException("phone is required");
    }

    if (!phoneNormalized || phoneNormalized.length < 10) {
      throw new BadRequestException("phone must contain at least 10 digits");
    }

    const existingClient = await this.prismaService.client.findUnique({
      where: { phoneNormalized },
    });

    if (!existingClient && !fullName) {
      throw new BadRequestException("fullName is required");
    }

    if (!existingClient && !input.consentAccepted) {
      throw new BadRequestException("consentAccepted must be true");
    }

    if (existingClient) {
      const updatedClient = await this.prismaService.client.update({
        where: { id: existingClient.id },
        data: {
          fullName: fullName || existingClient.fullName,
          phone,
          phoneNormalized,
          email: email ?? existingClient.email,
          consentAcceptedAt: input.consentAccepted ? existingClient.consentAcceptedAt ?? new Date() : existingClient.consentAcceptedAt,
        },
      });

      return this.toClientDto(updatedClient);
    }

    const createdClient = await this.prismaService.client.create({
      data: {
        telegramId: this.buildSyntheticWebTelegramId(phoneNormalized),
        username: null,
        fullName,
        phone,
        phoneNormalized,
        email,
        note: null,
        consentAcceptedAt: new Date(),
      },
    });

    return this.toClientDto(createdClient);
  }

  private ensureTrainerAccess(trainerTelegramId: string): void {
    const actorId = trainerTelegramId.trim();
    const allowed = new Set([
      this.appConfigService.values.trainerTelegramId,
      this.appConfigService.values.adminTelegramId,
    ]);

    if (!allowed.has(actorId)) {
      throw new BadRequestException("Only trainer/admin can manage clients");
    }
  }

  normalizePhoneForIdentity(phone: string | null | undefined): string | null {
    const digits = phone?.replace(/\D+/gu, "") ?? "";
    if (!digits) {
      return null;
    }

    if (digits.length === 11 && digits.startsWith("8")) {
      return `7${digits.slice(1)}`;
    }

    if (digits.length === 10) {
      return `7${digits}`;
    }

    return digits;
  }

  private buildSyntheticWebTelegramId(phoneNormalized: string): string {
    const suffix = randomBytes(6).toString("hex");
    return `web:${phoneNormalized}:${suffix}`;
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
      note: client.note ?? null,
      consentAcceptedAt: client.consentAcceptedAt ? client.consentAcceptedAt.toISOString() : null,
      isBlacklisted: client.isBlacklisted,
      blacklistReason: client.blacklistReason ?? null,
      blacklistedAt: client.blacklistedAt ? client.blacklistedAt.toISOString() : null,
    };
  }
}
