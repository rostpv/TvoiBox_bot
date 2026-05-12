import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class DatabaseSeedService {
  constructor(private readonly prismaService: PrismaService) {}

  async ensureTrainerSettings() {
    const existingSettings = await this.prismaService.trainerSettings.findFirst();

    if (existingSettings) {
      return existingSettings;
    }

    return this.prismaService.trainerSettings.create({
      data: {
        bookingHorizonDays: 14,
        sameDayBookingCutoff: 0,
      },
    });
  }

  async createDemoClient() {
    return this.prismaService.client.upsert({
      where: {
        telegramId: "demo-client-stage-3",
      },
      update: {
        fullName: "Тестовый клиент",
        consentAcceptedAt: new Date(),
      },
      create: {
        telegramId: "demo-client-stage-3",
        fullName: "Тестовый клиент",
        consentAcceptedAt: new Date(),
      },
    });
  }

  async createDemoSlot() {
    const startAt = new Date("2026-05-20T09:00:00.000Z");
    const endAt = new Date("2026-05-20T10:00:00.000Z");

    return this.prismaService.slot.upsert({
      where: {
        startAt_endAt: {
          startAt,
          endAt,
        },
      },
      update: {},
      create: {
        startAt,
        endAt,
      },
    });
  }

  async createDemoBooking() {
    const client = await this.createDemoClient();
    const slot = await this.createDemoSlot();

    return this.prismaService.booking.upsert({
      where: {
        id: "stage-3-demo-booking",
      },
      update: {
        clientId: client.id,
        slotId: slot.id,
        expiresAt: new Date("2026-05-20T20:59:59.000Z"),
      },
      create: {
        id: "stage-3-demo-booking",
        clientId: client.id,
        slotId: slot.id,
        expiresAt: new Date("2026-05-20T20:59:59.000Z"),
      },
    });
  }

  async readDemoGraph() {
    return this.prismaService.booking.findUnique({
      where: {
        id: "stage-3-demo-booking",
      },
      include: {
        client: true,
        slot: true,
      },
    });
  }
}
